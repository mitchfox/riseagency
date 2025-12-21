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
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const userAgent = req.headers.get("user-agent") || "unknown";

    if (isInitial) {
      // Create new visit record
      const { data, error } = await supabase
        .from("site_visits")
        .insert({
          visitor_id: visitorId,
          page_path: pagePath,
          duration: 0,
          location: {},
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
