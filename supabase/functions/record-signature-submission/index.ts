import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { lockContract } from "../lock-signature-contract/index.ts";

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
      field_values,
      intent_consent,
      signed_pdf_base64,
      user_agent,
    } = body || {};

    if (!contract_id || !signer_name || !signer_email || !field_values) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!intent_consent) {
      return new Response(JSON.stringify({ error: "Intent to sign electronically must be confirmed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-lock if not yet locked
    await lockContract(contract_id);

    const { data: contract, error: cErr } = await supabase
      .from("signature_contracts")
      .select("id, document_hash, status")
      .eq("id", contract_id)
      .single();
    if (cErr || !contract) throw cErr ?? new Error("Contract missing");
    if (contract.status !== "active") {
      return new Response(JSON.stringify({ error: "Contract is not active" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Capture client IP
    const xff = req.headers.get("x-forwarded-for") || "";
    const ip = xff.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || null;

    const submissionId = crypto.randomUUID();
    let signedPdfPath: string | null = null;
    let signedPdfHash: string | null = null;

    if (signed_pdf_base64 && typeof signed_pdf_base64 === "string") {
      const bytes = base64ToBytes(signed_pdf_base64);
      signedPdfHash = await sha256Hex(bytes);
      signedPdfPath = `signed/${submissionId}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("signature-contracts")
        .upload(signedPdfPath, bytes, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;
    }

    const nowIso = new Date().toISOString();
    const { error: insErr } = await supabase
      .from("signature_submissions")
      .insert({
        id: submissionId,
        contract_id,
        signer_name,
        signer_email,
        field_values,
        ip_address: ip,
        user_agent: user_agent ?? req.headers.get("user-agent"),
        intent_consent_at: nowIso,
        document_hash: contract.document_hash,
        signed_pdf_url: signedPdfPath,
        signed_pdf_hash: signedPdfHash,
      });
    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({
        ok: true,
        submission_id: submissionId,
        signed_pdf_url: signedPdfPath,
        document_hash: contract.document_hash,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[record-signature-submission]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});