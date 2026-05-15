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

function pathFromPublicUrl(url: string): string | null {
  const marker = "/storage/v1/object/public/signature-contracts/";
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return url.slice(i + marker.length);
}

export async function lockContract(contractId: string) {
  const { data: contract, error } = await supabase
    .from("signature_contracts")
    .select("*")
    .eq("id", contractId)
    .single();
  if (error) throw error;
  if (!contract) throw new Error("Contract not found");
  if (contract.locked_at) {
    return { already: true, contract };
  }

  // Fetch original PDF bytes
  const sourcePath = pathFromPublicUrl(contract.file_url);
  let bytes: Uint8Array;
  if (sourcePath) {
    const { data: dl, error: dlErr } = await supabase.storage
      .from("signature-contracts")
      .download(sourcePath);
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

  // Snapshot fields + owner values
  const { data: fields } = await supabase
    .from("signature_fields")
    .select("*")
    .eq("contract_id", contractId)
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

  return { already: false, hash, lockedPath };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { contract_id } = await req.json();
    if (!contract_id) throw new Error("contract_id required");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await lockContract(contract_id);
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[lock-signature-contract]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});