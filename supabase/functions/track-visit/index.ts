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
    const { visitorId, pagePath, duration, referrer, isInitial, visitId } = await req.json();
    
    console.log("Track visit request:", { visitorId, pagePath, duration, isInitial, visitId });
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get location info from IP
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0] : "unknown";
    
    // Get user agent
    const userAgent = req.headers.get("user-agent") || "unknown";
    
    // Try to get location data
    let location = {};
    try {
      if (ip !== "unknown" && !ip.startsWith("::") && !ip.startsWith("127.")) {
        const geoResponse = await fetch(`http://ip-api.com/json/${ip}`);
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          if (geoData.status === "success") {
            location = {
              country: geoData.country,
              city: geoData.city,
              region: geoData.regionName,
              timezone: geoData.timezone,
            };
          }
        }
      }
    } catch (error) {
      console.error("Failed to get location:", error);
    }

    let data;
    let error;

    if (isInitial) {
      // Initial visit - create new record
      const result = await supabase
        .from("site_visits")
        .insert({
          visitor_id: visitorId,
          page_path: pagePath,
          duration: 0,
          location,
          user_agent: userAgent,
          referrer: referrer || null,
        })
        .select()
        .single();
      
      data = result.data;
      error = result.error;

      if (!error && data) {
        return new Response(JSON.stringify({ success: true, visitId: data.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Update existing visit with duration
      if (visitId) {
        // Update specific visit by ID
        const result = await supabase
          .from("site_visits")
          .update({ duration })
          .eq("id", visitId)
          .select()
          .single();
        
        data = result.data;
        error = result.error;
      } else {
        // Fallback: find most recent visit for this visitor and page
        const { data: recentVisit } = await supabase
          .from("site_visits")
          .select("id")
          .eq("visitor_id", visitorId)
          .eq("page_path", pagePath)
          .order("visited_at", { ascending: false })
          .limit(1)
          .single();

        if (recentVisit) {
          const result = await supabase
            .from("site_visits")
            .update({ duration })
            .eq("id", recentVisit.id)
            .select()
            .single();
          
          data = result.data;
          error = result.error;
        }
      }
    }

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
