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

function pathFromPublicUrl(url: string): string | null {
  const marker = "/storage/v1/object/public/signature-contracts/";
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return url.slice(i + marker.length);
}

async function lockContract(contractId: string) {
  const { data: contract, error } = await supabase
    .from("signature_contracts")
    .select("*")
    .eq("id", contractId)
    .single();
  if (error || !contract) throw error ?? new Error("Contract not found");
  if (contract.locked_at) return { already: true };
  const sourcePath = pathFromPublicUrl(contract.file_url);
  let bytes: Uint8Array;
  if (sourcePath) {
    const { data: dl, error: dlErr } = await supabase.storage
      .from("signature-contracts").download(sourcePath);
    if (dlErr || !dl) throw dlErr ?? new Error("Failed to download source PDF");
    bytes = new Uint8Array(await dl.arrayBuffer());
  } else {
    const res = await fetch(contract.file_url);
    if (!res.ok) throw new Error("Failed to fetch source PDF");
    bytes = new Uint8Array(await res.arrayBuffer());
  }
  const hash = await sha256Hex(bytes);
  const lockedPath = `locked/${contractId}.pdf`;
  const { error: upErr } = await supabase.storage
    .from("signature-contracts")
    .upload(lockedPath, bytes, { contentType: "application/pdf", upsert: true });
  if (upErr) throw upErr;
  const { data: fields } = await supabase
    .from("signature_fields").select("*").eq("contract_id", contractId)
    .order("display_order", { ascending: true });
  const snapshot = {
    fields: fields ?? [],
    owner_field_values: contract.owner_field_values ?? {},
    file_name: contract.file_name,
  };
  const { error: updErr } = await supabase
    .from("signature_contracts")
    .update({
      locked_at: new Date().toISOString(),
      document_hash: hash,
      locked_file_url: lockedPath,
      locked_fields_snapshot: snapshot,
    })
    .eq("id", contractId);
  if (updErr) throw updErr;
  return { already: false, hash };
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