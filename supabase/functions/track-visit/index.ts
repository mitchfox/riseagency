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
    
    const clientIP = cfConnectingIP || (forwardedFor ? forwardedFor.split(",")[0].trim() : realIP) || "";
    
    if (!clientIP || clientIP === "127.0.0.1" || clientIP.startsWith("192.168.") || clientIP.startsWith("10.")) {
      return { ip: clientIP };
    }

    // Use ip-api.com free tier (no API key needed, 45 requests per minute)
    const response = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,city,regionName,country`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.status === "success") {
        return {
          city: data.city || undefined,
          region: data.regionName || undefined,
          country: data.country || undefined,
          ip: clientIP,
        };
      }
    }
    
    return { ip: clientIP };
  } catch (error) {
    console.error("Error getting location from IP:", error);
    return {};
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { visitorId, pagePath, duration, referrer, isInitial, visitId } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const userAgent = req.headers.get("user-agent") || "unknown";

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
