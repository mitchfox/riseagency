## Why it's still slow

Two bugs are stacking:

1. **The edge geo-redirect almost never runs.** In `src/main.tsx` the redirect IIFE bails out if `localStorage.preferred_language` exists. After the recent change, `switchLanguage` writes that key for every manual change — so any returning visitor who ever picked a language can never be auto-redirected on `/representation` again. The redirect also bails on `www.` hosts because the www-stripping IIFE above it reloads the page first, and on that reload the visibility-hide trick double-flashes.

2. **When the redirect is skipped, `LanguageContext` blocks on `supabase.functions.invoke('detect-language')` before fetching translations.** That call cold-starts at 5–10s. The page renders English first, then pops to the detected language. That is exactly the delay you're seeing.

## Fix

### 1. Make the edge redirect actually fire

In `src/main.tsx`'s `/representation` IIFE:

- Remove the `localStorage.getItem('preferred_language')` short-circuit. Instead, only respect the saved preference when its language matches the **current** subdomain. The point of the redirect is precisely to honour geo when no subdomain is set; a stale preference on the apex shouldn't block it.
- Add `'/request-representation'` and all the localised slugs to the trigger set (already done) but also trigger when the path is exactly `/` and the user came from a marketing link with `?ref=rep` — not strictly needed, skip if you'd rather keep scope tight.
- Reorder the two IIFEs so the geo-redirect runs **before** the www-strip when the host starts with `www.{apex}` (no language subdomain in front), and pass the stripped host into the redirect call. This avoids the double reload.
- Drop the `sessionStorage.representation_redirected = '1'` write to a *path-scoped* key (`rep_redirected_for:<host>`) so a manual map-selector switch on a language subdomain doesn't poison the apex visit later.
- Lower the abort timeout from 1500ms to 800ms; the function is tiny (just header read + JSON) and 800ms is plenty when warm. Keeps worst-case flash short.

### 2. Make `LanguageContext` non-blocking when geo-detect is needed

In `src/contexts/LanguageContext.tsx`:

- Stop awaiting `detectLanguageFromIP()` in the initialiser. Instead:
  - Synchronously set `language = 'en'` (or last-saved preference) and call `setIsInitialized(true)` immediately, so translations begin loading right away.
  - Kick off `detectLanguageFromIP()` in the background. If it resolves to a different language, call `setLanguage(detected)` — which retriggers the translations fetch for the correct language.
  - Cache the result in `sessionStorage` (`ip_language_detected`) on **all** environments, not only preview, so the second page in a session is instant.
- This means: on first visit, the page renders in the saved/default language within ~200ms, and if IP-detect returns a different language a few seconds later it swaps in. For `/representation` specifically, the edge redirect from step 1 means the visitor is already on the right subdomain before React boots, so `detectLanguageFromSubdomain()` returns synchronously and IP detection is never invoked at all — instant correct language.

### 3. Make `detect-language` itself faster

In `supabase/functions/detect-language/index.ts`:

- Add the same expanded country mapping that `representation-redirect` already has (Spain + LatAm, Portuguese-speaking Africa, Francophone Africa, Croatia, Norway, etc.) so that when IP detection *is* used (other pages), it returns the correct language for the same set of countries the redirect handles.
- When `cf-ipcountry` is present, return immediately and **skip** the `ip-api.com` HTTP call — currently it only skips when the country is non-empty and not `XX`, which is fine, but ensure we never await network IO on the Cloudflare-warm path. Already true — no change needed beyond verification.
- Add `Cache-Control: public, max-age=300` to the response so the browser/edge can short-circuit the second call within five minutes.

### 4. Persist the manual override correctly

In `LanguageContext.switchLanguage`:

- Keep writing `preferred_language`, but **also** stamp the current host in it (`{lang: 'cs', host: 'cz.risefootballagency.com'}`). The geo-redirect's "respect saved preference" check then only honours it when the saved host matches the **base domain** the user is currently on — preventing a stale "I once chose Czech" choice from blocking a fresh apex visit from Spain.

### 5. Verification

After deploying:

- Apex visit from a Czech IP to `risefootballagency.com/representation` should `window.location.replace` to `cz.risefootballagency.com/zastoupeni` in <800ms — no English flash.
- Direct visit to `cz.risefootballagency.com/zastoupeni` should render Czech immediately because `detectLanguageFromSubdomain()` returns `'cs'` synchronously and the translations query starts on first React tick.
- Apex visit from a UK IP should render English instantly with no redirect attempt visible.
- Manual switch via the map selector to Polish from any subdomain should land on `pl.risefootballagency.com/reprezentacja` and stay there on subsequent visits.

## Files to change

- `src/main.tsx` — rework the `/representation` geo-redirect IIFE (remove blanket `preferred_language` block, scope sentinel by host, drop www double-hop, lower timeout).
- `src/contexts/LanguageContext.tsx` — make IP detection non-blocking; update `switchLanguage` to host-scope the saved preference; cache `ip_language_detected` outside preview too.
- `supabase/functions/detect-language/index.ts` — expand country map to mirror `representation-redirect`; add short cache header.

No DB or new edge-function work required.
