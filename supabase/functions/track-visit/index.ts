import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map of common club countries for phone number formatting
const clubCountryCodes: Record<string, string> = {
  // UK
  "arsenal": "+44", "chelsea": "+44", "manchester united": "+44", "manchester city": "+44",
  "liverpool": "+44", "tottenham": "+44", "west ham": "+44", "newcastle": "+44",
  "brighton": "+44", "aston villa": "+44", "everton": "+44", "fulham": "+44",
  "crystal palace": "+44", "wolves": "+44", "leicester": "+44", "leeds": "+44",
  "nottingham forest": "+44", "bournemouth": "+44", "brentford": "+44",
  // Spain
  "barcelona": "+34", "real madrid": "+34", "atletico madrid": "+34", "sevilla": "+34",
  "valencia": "+34", "villarreal": "+34", "real sociedad": "+34", "athletic bilbao": "+34",
  // Germany
  "bayern munich": "+49", "borussia dortmund": "+49", "rb leipzig": "+49", "bayer leverkusen": "+49",
  // Italy
  "juventus": "+39", "ac milan": "+39", "inter milan": "+39", "roma": "+39", "napoli": "+39", "lazio": "+39",
  // France
  "psg": "+33", "paris saint-germain": "+33", "marseille": "+33", "lyon": "+33", "monaco": "+33",
  // Portugal
  "benfica": "+351", "porto": "+351", "sporting": "+351",
  // Netherlands
  "ajax": "+31", "psv": "+31", "feyenoord": "+31",
  // Belgium
  "club brugge": "+32", "anderlecht": "+32",
  // Turkey
  "galatasaray": "+90", "fenerbahce": "+90", "besiktas": "+90",
  // Russia
  "spartak moscow": "+7", "cska moscow": "+7", "zenit": "+7",
  // USA
  "la galaxy": "+1", "inter miami": "+1",
  // Brazil
  "flamengo": "+55", "palmeiras": "+55", "santos": "+55", "sao paulo": "+55",
  // Argentina
  "boca juniors": "+54", "river plate": "+54",
};

async function getLocationFromIP(request: Request): Promise<{ city?: string; region?: string; country?: string; ip?: string }> {
  try {
    // Get client IP from headers
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIP = request.headers.get("x-real-ip");
    const cfConnectingIP = request.headers.get("cf-connecting-ip");
    // Cloudflare also injects a 2-letter country code on every request that
    // hits the edge — use it as an instant, zero-network-call source of geo.
    const cfCountry = (request.headers.get("cf-ipcountry") || "").toUpperCase();
    const cfCountryName = countryNameFromIso(cfCountry);

    const clientIP = cfConnectingIP || (forwardedFor ? forwardedFor.split(",")[0].trim() : realIP) || "";

    if (!clientIP || clientIP === "127.0.0.1" || clientIP.startsWith("192.168.") || clientIP.startsWith("10.")) {
      return { ip: clientIP, country: cfCountryName || undefined };
    }

    // Race two free geo services with a hard 1.5s timeout so a slow
    // lookup never blocks the visit insert. Whichever resolves first wins,
    // and if both fail we still persist the IP + Cloudflare country fallback.
    const lookups: Promise<{ city?: string; region?: string; country?: string } | null>[] = [
      withTimeout(
        fetch(`http://ip-api.com/json/${clientIP}?fields=status,city,regionName,country`)
          .then(async (r) => {
            if (!r.ok) return null;
            const d = await r.json();
            if (d?.status !== "success") return null;
            return { city: d.city || undefined, region: d.regionName || undefined, country: d.country || undefined };
          })
          .catch(() => null),
        1500,
      ),
      withTimeout(
        fetch(`https://ipapi.co/${clientIP}/json/`)
          .then(async (r) => {
            if (!r.ok) return null;
            const d = await r.json();
            if (!d || d.error) return null;
            return { city: d.city || undefined, region: d.region || undefined, country: d.country_name || undefined };
          })
          .catch(() => null),
        1500,
      ),
    ];

    const results = await Promise.all(lookups);
    const first = results.find((r) => r && r.country) || results.find((r) => !!r) || null;
    if (first) {
      return { ...first, country: first.country || cfCountryName || undefined, ip: clientIP };
    }
    return { ip: clientIP, country: cfCountryName || undefined };
  } catch (error) {
    console.error("Error getting location from IP:", error);
    return {} as any;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null as any), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }).catch(() => { clearTimeout(t); resolve(null as any); });
  });
}

// Minimal ISO-2 → country-name map covering the countries we actually care
// about for outreach. Anything we don't know about falls through as the raw
// 2-letter code so we still record SOMETHING geo-shaped instead of null.
const ISO_TO_NAME: Record<string, string> = {
  GB: "United Kingdom", US: "United States", IE: "Ireland", FR: "France", DE: "Germany",
  ES: "Spain", PT: "Portugal", IT: "Italy", NL: "Netherlands", BE: "Belgium", LU: "Luxembourg",
  CH: "Switzerland", AT: "Austria", DK: "Denmark", SE: "Sweden", NO: "Norway", FI: "Finland",
  PL: "Poland", CZ: "Czechia", SK: "Slovakia", HU: "Hungary", RO: "Romania", BG: "Bulgaria",
  HR: "Croatia", SI: "Slovenia", RS: "Serbia", BA: "Bosnia and Herzegovina", MK: "North Macedonia",
  AL: "Albania", ME: "Montenegro", GR: "Greece", TR: "Turkey", UA: "Ukraine", RU: "Russia",
  BY: "Belarus", MD: "Moldova", LV: "Latvia", LT: "Lithuania", EE: "Estonia", IS: "Iceland",
  MT: "Malta", CY: "Cyprus", CA: "Canada", MX: "Mexico", BR: "Brazil", AR: "Argentina",
  CL: "Chile", CO: "Colombia", UY: "Uruguay", PE: "Peru", AU: "Australia", NZ: "New Zealand",
  JP: "Japan", KR: "South Korea", CN: "China", HK: "Hong Kong", TW: "Taiwan", SG: "Singapore",
  TH: "Thailand", ID: "Indonesia", PH: "Philippines", VN: "Vietnam", IN: "India", PK: "Pakistan",
  ZA: "South Africa", NG: "Nigeria", EG: "Egypt", MA: "Morocco", AE: "United Arab Emirates",
  SA: "Saudi Arabia", QA: "Qatar", KW: "Kuwait", IL: "Israel", JO: "Jordan", GE: "Georgia",
  AM: "Armenia", AZ: "Azerbaijan", KZ: "Kazakhstan",
};
function countryNameFromIso(code: string | null | undefined): string {
  if (!code) return "";
  const c = code.toUpperCase();
  return ISO_TO_NAME[c] || c;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Accept both JSON (normal invoke) and text/plain (navigator.sendBeacon
    // payloads use Blob "text/plain"). Falling back keeps duration writes
    // alive even when the tab is closing.
    const raw = await req.text();
    let body: any = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
    const { visitorId, pagePath, duration, referrer, isInitial, visitId, kind, partial } = body;
    // v2 — behaviour kind handler. Log on entry so we can confirm deploy.
    if (kind) console.log("track-visit kind=", kind, "visitId?", !!visitId, "partial?", !!partial);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const userAgent = req.headers.get("user-agent") || "unknown";

    // Behavioural flush: merge scroll/clicks/sections/etc into the existing row.
    if (kind === "behaviour" && visitId && partial) {
      try {
        const { data: existing } = await supabase
          .from("site_visits")
          .select("events, sections, scroll_max_pct, engaged_seconds, viewport, utm, video_stats, duration")
          .eq("id", visitId)
          .maybeSingle();

        const prevEvents: any[] = Array.isArray((existing as any)?.events) ? (existing as any).events : [];
        const newEvents: any[] = Array.isArray(partial.events) ? partial.events : [];
        const mergedEvents = [...prevEvents, ...newEvents];
        // Cap at 400 — keep first 80 + last 320 so we always see opening + ending.
        const cappedEvents = mergedEvents.length > 400
          ? [...mergedEvents.slice(0, 80), ...mergedEvents.slice(-320)]
          : mergedEvents;

        const prevSections: Record<string, number> = (existing as any)?.sections && typeof (existing as any).sections === "object" ? (existing as any).sections : {};
        const incSections: Record<string, number> = partial.sections && typeof partial.sections === "object" ? partial.sections : {};
        const mergedSections: Record<string, number> = { ...prevSections };
        for (const k of Object.keys(incSections)) {
          mergedSections[k] = Math.round((mergedSections[k] ?? 0) + (Number(incSections[k]) || 0));
        }

        const prevVideo: Record<string, any> = (existing as any)?.video_stats && typeof (existing as any).video_stats === "object" ? (existing as any).video_stats : {};
        const incVideo: Record<string, any> = partial.videoStats && typeof partial.videoStats === "object" ? partial.videoStats : {};
        const mergedVideo: Record<string, any> = { ...prevVideo };
        for (const k of Object.keys(incVideo)) {
          const a = mergedVideo[k] ?? {};
          const b = incVideo[k] ?? {};
          mergedVideo[k] = {
            label: b.label ?? a.label ?? k,
            plays: (Number(a.plays) || 0) + (Number(b.plays) || 0),
            watched: Math.round((Number(a.watched) || 0) + (Number(b.watched) || 0)),
            maxPct: Math.max(Number(a.maxPct) || 0, Number(b.maxPct) || 0),
            duration: Number(b.duration) || Number(a.duration) || 0,
            fullscreen: Boolean(a.fullscreen || b.fullscreen),
          };
        }

        const update: any = {
          events: cappedEvents,
          sections: mergedSections,
          video_stats: mergedVideo,
        };
        if (typeof partial.scrollMax === "number") {
          update.scroll_max_pct = Math.max(Number((existing as any)?.scroll_max_pct) || 0, Math.min(100, Math.round(partial.scrollMax)));
        }
        if (typeof partial.engagedSeconds === "number") {
          update.engaged_seconds = Math.max(Number((existing as any)?.engaged_seconds) || 0, Math.round(partial.engagedSeconds));
          // Mirror engaged time into duration so legacy readers show meaningful time.
          update.duration = Math.max(Number((existing as any)?.duration) || 0, Math.round(partial.engagedSeconds));
        }
        if (partial.viewport && !(existing as any)?.viewport) update.viewport = partial.viewport;
        if (partial.utm && !(existing as any)?.utm) update.utm = partial.utm;

        await supabase.from("site_visits").update(update).eq("id", visitId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        console.error("behaviour merge error", e);
        return new Response(JSON.stringify({ success: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (isInitial) {
      // Get location from IP
      const location = await getLocationFromIP(req);
      
      // Create new visit record
      const { data, error } = await supabase
        .from("site_visits")
        .insert({
          visitor_id: visitorId,
          page_path: pagePath,
          duration: 0,
          location: location,
          user_agent: userAgent,
          referrer: referrer || null,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Insert error:", error);
        throw error;
      }

      return new Response(JSON.stringify({ success: true, visitId: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (visitId && duration !== undefined) {
      // Update visit duration
      const { error } = await supabase
        .from("site_visits")
        .update({ duration })
        .eq("id", visitId);

      if (error) {
        console.error("Update error:", error);
        throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
