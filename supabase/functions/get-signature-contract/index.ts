import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const slugify = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ contract: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const decoded = decodeURIComponent(token).toLowerCase().replace(/-+/g, "-").trim();

    const { data, error } = await supabase
      .from("signature_contracts")
      .select("*")
      .eq("status", "active");

    if (error) throw error;

    const contract = (data || []).find((c: any) => slugify(c.title || "") === decoded) || null;

    // If contract is locked, expose the locked file via a short-lived signed URL
    // and the locked snapshot of fields/owner values, so signers see the exact
    // version that was sent.
    let fields: any[] | null = null;
    if (contract && contract.locked_at && contract.locked_file_url) {
      const { data: signed } = await supabase.storage
        .from("signature-contracts")
        .createSignedUrl(contract.locked_file_url, 60 * 60 * 24);
      if (signed?.signedUrl) {
        contract.file_url = signed.signedUrl;
      }
      const snap: any = contract.locked_fields_snapshot;
      if (snap?.owner_field_values) {
        contract.owner_field_values = snap.owner_field_values;
      }
      if (Array.isArray(snap?.fields)) {
        fields = snap.fields;
      }
    }

    return new Response(JSON.stringify({ contract, fields }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("[get-signature-contract]", err);
    return new Response(JSON.stringify({ contract: null, error: String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
