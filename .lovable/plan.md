# Why the redirect "isn't happening"

Verified live with the browser tool on `https://risefootballagency.com/representation`:

- The `representation-redirect` edge function **is** being called and **does** return JSON.
- For my US IP it correctly returned `{language:"en", url:"https://risefootballagency.com/representation"}` — same host, so no redirect (correct).
- For a Czech visitor it would return `https://cz.risefootballagency.com/zastoupeni`, but **the call is fired from `main.tsx`**, which is a `type="module"` bundled script. Modules are deferred — they only execute **after** the entire HTML body parses and the bundle downloads + parses. On a fresh visit that's typically 1–3 s, and the round-trip to `us-west-2` adds another 200–600 ms.
- That's why you see English first and translations swap in ~10 s later: the redirect fires too late, so React mounts in English, then the translations query (1.5 s) finishes and content updates.

Bottom line: a *bundled* JS redirect can never be "instant". To match sites that redirect cleanly we need to (a) run the redirect synchronously in `<head>` before anything else, and (b) avoid a slow Supabase round-trip for the country lookup.

# The fix

## 1. Move the geo-redirect into an inline blocking script in `index.html` `<head>`

Replace the `(function(){...})()` IIFE currently at the top of `src/main.tsx` with an inline `<script>` tag placed **first** inside `<head>` of `index.html`, before all other tags. Because it's not `defer`/`module`, the browser pauses HTML parsing until it runs — we can issue the redirect before a single body byte is parsed.

The script will:
- Bail immediately on preview/local hosts, on language subdomains, and on non-representation paths.
- Honour `?lang=` URL override and host-scoped saved preference (same logic as today, kept verbatim).
- Hide `<html>` (`visibility:hidden`) only while the lookup is in flight, with a hard 600 ms cap so a slow lookup never holds the page.

## 2. Switch the country lookup from Supabase Edge Function → Cloudflare trace

The site is fronted by Cloudflare. Cloudflare exposes a free, no-auth, no-CORS endpoint that returns the visitor's country in **~30–80 ms globally**:

```
https://www.cloudflare.com/cdn-cgi/trace
```

Response body includes a line like `loc=CZ`. We parse that single line, look it up in a small JS country→language map (inlined directly into the script, mirroring the edge function), and `window.location.replace()` to the localised subdomain + slug.

Benefits over the Supabase function:
- ~10× faster (CDN edge vs us-west-2 round-trip).
- No bundle, no auth header, no CORS preflight.
- Works without ever touching a deferred module.

Cloudflare is already a preconnected origin elsewhere in the codebase, so DNS cost is negligible.

## 3. Keep `representation-redirect` edge function as a fallback only

If the `cdn-cgi/trace` request fails (e.g., the site is ever moved off Cloudflare), the inline script falls through to a `setTimeout` that simply unhides the page and lets `LanguageContext` perform its existing background IP detection. No regressions.

## 4. Translations: fetch on the cache while redirecting

The translations query (currently 1.5 s) is the secondary cause of the "10 s wait" feeling on slow connections. Add a `<link rel="preconnect">` for the Supabase REST endpoint (already there) and ensure the `LanguageProvider`'s translation fetch is fired in parallel with the redirect path, not after it. Today it already is — but the inline-script change means the redirect never blocks the bundle from starting to download, so translations begin loading immediately for non-redirected visitors.

# Files to change

```text
index.html
  └─ Add inline <script> at very top of <head> (before any other tag) implementing the
     redirect described in §1 + §2.

src/main.tsx
  └─ Remove the existing redirect IIFE (now lives in index.html).
  └─ Keep the www-strip IIFE (it's fine where it is).

supabase/functions/representation-redirect/index.ts
  └─ No code change required. Function is kept as fallback for non-Cloudflare scenarios.
```

# Manual verification plan (after the change ships)

1. Open `https://risefootballagency.com/representation` from a Czech IP (or use a VPN). Expect the URL bar to flip to `https://cz.risefootballagency.com/zastoupeni` within ~100 ms, with no English flash.
2. Repeat from a Spanish IP → `https://es.risefootballagency.com/representacion`.
3. From a US/UK IP → stays on apex, no redirect (verified during planning).
4. Open `cz.risefootballagency.com/zastoupeni` → no redirect loop, page renders in Czech immediately.
5. Manually pick a different language from the map selector → URL changes to that subdomain and stays there on refresh (host-scoped preference).
