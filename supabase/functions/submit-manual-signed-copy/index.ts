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

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/^data:.*;base64,/, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function extFromMime(mime: string, fallbackName?: string): string {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/heic") return "heic";
  if (mime === "image/webp") return "webp";
  if (fallbackName && fallbackName.includes(".")) {
    return fallbackName.split(".").pop()!.toLowerCase();
  }
  return "bin";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const body = await req.json();
    const {
      contract_id,
      signer_name,
      signer_email,
      file_base64,
      file_name,
      file_mime,
      user_agent,
    } = body || {};

    if (!contract_id || !signer_name || !signer_email || !file_base64 || !file_mime) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: contract, error: cErr } = await supabase
      .from("signature_contracts")
      .select("id, status")
      .eq("id", contract_id)
      .single();
    if (cErr || !contract) {
      return new Response(JSON.stringify({ error: "Contract not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (contract.status !== "active") {
      return new Response(JSON.stringify({ error: "Contract is not active" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bytes = base64ToBytes(file_base64);
    if (bytes.length > 25 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File too large (max 25MB)" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const hash = await sha256Hex(bytes);

    const submissionId = crypto.randomUUID();
    const ext = extFromMime(file_mime, file_name);
    const path = `manual-uploads/${contract_id}/${submissionId}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("signature-contracts")
      .upload(path, bytes, { contentType: file_mime, upsert: false });
    if (upErr) throw upErr;

    const xff = req.headers.get("x-forwarded-for") || "";
    const ip = xff.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || null;

    const nowIso = new Date().toISOString();
    const { error: insErr } = await supabase
      .from("signature_submissions")
      .insert({
        id: submissionId,
        contract_id,
        signer_name,
        signer_email,
        field_values: {},
        ip_address: ip,
        user_agent: user_agent ?? req.headers.get("user-agent"),
        intent_consent_at: nowIso,
        signed_pdf_url: path,
        signed_pdf_hash: hash,
        submission_type: "manual_upload",
      });
    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({ ok: true, submission_id: submissionId, signed_pdf_url: path }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[submit-manual-signed-copy]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});