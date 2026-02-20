import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sourceUrl, clipId } = await req.json();

    if (!sourceUrl || !clipId) {
      return new Response(
        JSON.stringify({ error: "sourceUrl and clipId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract the storage path from the public URL
    // URL format: https://{project}.supabase.co/storage/v1/object/public/analysis-videos/{path}
    const bucketName = "analysis-videos";
    const urlParts = sourceUrl.split(`${bucketName}/`);
    if (urlParts.length < 2) {
      return new Response(
        JSON.stringify({ error: "Could not parse source URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // Remove any #t= fragment from the path
    const sourcePath = urlParts[1].split("#")[0];

    // Download the source file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(sourcePath);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      return new Response(
        JSON.stringify({ error: "Failed to download source video", details: downloadError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upload to clips/ prefix
    const ext = sourcePath.split(".").pop() || "mp4";
    const clipPath = `clips/${clipId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(clipPath, fileData, {
        contentType: fileData.type || "video/mp4",
        cacheControl: "31536000",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload clip", details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL for the clip
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(clipPath);

    return new Response(
      JSON.stringify({ clipUrl: publicUrlData.publicUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("extract-clip error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
