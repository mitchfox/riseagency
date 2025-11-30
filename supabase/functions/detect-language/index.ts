import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map countries to language codes
const countryToLanguage: Record<string, string> = {
  // Spanish
  'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es', 'CL': 'es', 'PE': 'es', 'VE': 'es', 'EC': 'es', 'GT': 'es', 'CU': 'es', 'BO': 'es', 'DO': 'es', 'HN': 'es', 'PY': 'es', 'SV': 'es', 'NI': 'es', 'CR': 'es', 'PA': 'es', 'UY': 'es',
  // Portuguese
  'PT': 'pt', 'BR': 'pt', 'AO': 'pt', 'MZ': 'pt',
  // French
  'FR': 'fr', 'BE': 'fr', 'CH': 'fr', 'CA': 'fr', 'SN': 'fr', 'CI': 'fr', 'CM': 'fr', 'MG': 'fr', 'ML': 'fr',
  // German
  'DE': 'de', 'AT': 'de', 'LI': 'de',
  // Italian
  'IT': 'it', 'SM': 'it', 'VA': 'it',
  // Polish
  'PL': 'pl',
  // Czech
  'CZ': 'cs',
  // Russian
  'RU': 'ru', 'BY': 'ru', 'KZ': 'ru', 'KG': 'ru',
  // Turkish
  'TR': 'tr', 'CY': 'tr',
  // English (default for these)
  'GB': 'en', 'US': 'en', 'AU': 'en', 'NZ': 'en', 'IE': 'en', 'ZA': 'en',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Try to get country from Cloudflare header first
    const cfCountry = req.headers.get("cf-ipcountry");
    
    if (cfCountry && cfCountry !== "XX") {
      const language = countryToLanguage[cfCountry.toUpperCase()] || "en";
      return new Response(
        JSON.stringify({ language, country: cfCountry, source: "cloudflare" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get client IP from various headers
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const clientIp = forwardedFor?.split(",")[0]?.trim() || realIp || "";

    // Skip private/local IPs
    if (!clientIp || clientIp.startsWith("192.168.") || clientIp.startsWith("10.") || clientIp.startsWith("127.") || clientIp === "::1") {
      return new Response(
        JSON.stringify({ language: "en", country: null, source: "default" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use ip-api.com (free, no API key needed, 45 requests/minute)
    const geoResponse = await fetch(`http://ip-api.com/json/${clientIp}?fields=countryCode,status`);
    
    if (!geoResponse.ok) {
      return new Response(
        JSON.stringify({ language: "en", country: null, source: "default" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geoData = await geoResponse.json();
    
    if (geoData.status === "success" && geoData.countryCode) {
      const language = countryToLanguage[geoData.countryCode.toUpperCase()] || "en";
      return new Response(
        JSON.stringify({ language, country: geoData.countryCode, source: "ip-api" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default to English
    return new Response(
      JSON.stringify({ language: "en", country: null, source: "default" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Language detection error:", error);
    return new Response(
      JSON.stringify({ language: "en", country: null, source: "error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
