import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Country -> language code (DNS uses 'cz' for Czech)
const countryToLanguage: Record<string, string> = {
  // Spanish (Spain + Latin America)
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es",
  EC: "es", GT: "es", CU: "es", BO: "es", DO: "es", HN: "es", PY: "es",
  SV: "es", NI: "es", CR: "es", PA: "es", UY: "es", PR: "es", GQ: "es",
  // Portuguese
  PT: "pt", BR: "pt", AO: "pt", MZ: "pt", CV: "pt", GW: "pt", ST: "pt", TL: "pt",
  // French (France + Francophone Africa + Belgium/Luxembourg/Monaco)
  FR: "fr", BE: "fr", LU: "fr", MC: "fr",
  SN: "fr", CI: "fr", CM: "fr", MG: "fr", ML: "fr", BF: "fr", NE: "fr",
  TG: "fr", BJ: "fr", GA: "fr", CG: "fr", CD: "fr", CF: "fr", TD: "fr",
  DJ: "fr", KM: "fr", GN: "fr", RW: "fr", BI: "fr",
  // German
  DE: "de", AT: "de", LI: "de",
  // Italian
  IT: "it", SM: "it", VA: "it",
  // Polish
  PL: "pl",
  // Czech
  CZ: "cs",
  // Russian
  RU: "ru", BY: "ru", KZ: "ru", KG: "ru",
  // Turkish
  TR: "tr",
  // Croatian
  HR: "hr",
  // Norwegian
  NO: "no",
  // Explicit English (so we don't redirect)
  GB: "en", US: "en", AU: "en", NZ: "en", IE: "en", ZA: "en", CA: "en",
};

const langSubdomain: Record<string, string> = {
  en: "",
  es: "es",
  pt: "pt",
  fr: "fr",
  de: "de",
  it: "it",
  pl: "pl",
  cs: "cz",
  ru: "ru",
  tr: "tr",
  hr: "hr",
  no: "no",
};

const representationSlug: Record<string, string> = {
  en: "/representation",
  es: "/representacion",
  pt: "/representacao",
  fr: "/representation",
  de: "/vertretung",
  it: "/rappresentanza",
  pl: "/reprezentacja",
  cs: "/zastoupeni",
  ru: "/predstavitelstvo",
  tr: "/temsil",
  hr: "/zastupanje",
  no: "/representasjon",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const baseDomain = url.searchParams.get("base") || "risefootballagency.com";
    const protocol = url.searchParams.get("protocol") || "https:";

    // 1) Try Cloudflare header first
    let country = (req.headers.get("cf-ipcountry") || "").toUpperCase();

    // 2) Fallback to ip-api lookup
    if (!country || country === "XX" || country === "T1") {
      const fwd = req.headers.get("x-forwarded-for") || "";
      const ip = fwd.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
      if (ip && !ip.startsWith("192.168.") && !ip.startsWith("10.") && !ip.startsWith("127.") && ip !== "::1") {
        try {
          const r = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode,status`);
          if (r.ok) {
            const j = await r.json();
            if (j?.status === "success" && j?.countryCode) {
              country = String(j.countryCode).toUpperCase();
            }
          }
        } catch {
          // ignore
        }
      }
    }

    const language = countryToLanguage[country] || "en";
    const sub = langSubdomain[language] ?? "";
    const slug = representationSlug[language] ?? "/representation";
    const host = sub ? `${sub}.${baseDomain}` : baseDomain;
    const target = `${protocol}//${host}${slug}`;

    return new Response(
      JSON.stringify({ language, country: country || null, url: target }),
      { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ language: "en", country: null, url: null, error: String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});