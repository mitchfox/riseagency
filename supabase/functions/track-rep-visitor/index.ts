import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      rowId,
      visitorId,
      position,
      dob,
      ageGroup,
      countryCode,
      language,
      userAgent,
      referrer,
    } = body ?? {};

    // Derive country from Cloudflare header on the request if not supplied
    const cfCountry = req.headers.get("cf-ipcountry");
    const finalCountry = countryCode || (cfCountry && cfCountry !== "XX" ? cfCountry : null);

    const payload: Record<string, unknown> = {
      visitor_id: visitorId ?? null,
      position: position ?? null,
      dob: dob ?? null,
      age_group: ageGroup ?? null,
      country_code: finalCountry,
      language: language ?? null,
      user_agent: userAgent ?? null,
      referrer: referrer ?? null,
    };

    let resultId = rowId ?? null;

    // Find the latest existing row for this visitor (if any), so reloads
    // / lost session state still merge into the same row instead of
    // creating duplicates.
    if (!resultId && visitorId) {
      const { data: existing } = await supabase
        .from("representation_visitors")
        .select("id")
        .eq("visitor_id", visitorId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing?.id) resultId = existing.id;
    }

    // When updating, only overwrite fields that have new non-null values
    // so a page-mount ping doesn't blank out an earlier-entered position.
    const mergePayload: Record<string, unknown> = { ...payload };
    Object.keys(mergePayload).forEach((k) => {
      if (mergePayload[k] === null || mergePayload[k] === undefined) {
        delete mergePayload[k];
      }
    });
    // Always bump visitor_id so it stays linked even if previously null.
    mergePayload.visitor_id = visitorId ?? null;

    if (resultId) {
      const { error } = await supabase
        .from("representation_visitors")
        .update(mergePayload)
        .eq("id", resultId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("representation_visitors")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      resultId = data?.id ?? null;
    }

    return new Response(JSON.stringify({ ok: true, id: resultId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[track-rep-visitor] error", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err?.message || err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
