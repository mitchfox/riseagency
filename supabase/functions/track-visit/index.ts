import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { visitorId, pagePath, duration, referrer } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get location info from IP
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0] : "unknown";
    
    // Get user agent
    const userAgent = req.headers.get("user-agent") || "unknown";
    
    // Try to get location data (you might want to use a geolocation service)
    let location = {};
    try {
      if (ip !== "unknown" && !ip.startsWith("::")) {
        const geoResponse = await fetch(`http://ip-api.com/json/${ip}`);
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          location = {
            country: geoData.country,
            city: geoData.city,
            region: geoData.regionName,
            timezone: geoData.timezone,
          };
        }
      }
    } catch (error) {
      console.error("Failed to get location:", error);
    }

    // Insert visit record
    const { data, error } = await supabase
      .from("site_visits")
      .insert({
        visitor_id: visitorId,
        page_path: pagePath,
        duration: duration || 0,
        location,
        user_agent: userAgent,
        referrer: referrer || null,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
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
