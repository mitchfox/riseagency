import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_SOURCE_BYTES = 200 * 1024 * 1024; // 200 MB

let cachedCore: any = null;

async function getFFmpegCore() {
  if (cachedCore) return cachedCore;
  let createFFmpegCore: any;
  try {
    const mod = await import("npm:@ffmpeg/core@0.12.6");
    createFFmpegCore = mod.default;
  } catch {
    const mod = await import(
      "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js"
    );
    createFFmpegCore = mod.default;
  }
  cachedCore = await createFFmpegCore({
    locateFile: (path: string) => {
      if (path.endsWith(".wasm")) {
        return "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm";
      }
      return path;
    },
    print: () => {},
    printErr: () => {},
  });
  return cachedCore;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Re-encode an existing video clip (typically a high-bitrate VP9/WebM
 * file produced by the client-side fallback recorder) into a web-friendly
 * H.264 MP4 with `+faststart`, then upload it back as `clips/<clipId>.mp4`
 * and return the new public URL.
 *
 * Body: { sourceUrl: string, clipId: string }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorised" }, 401);
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !user) return jsonResponse({ error: "Unauthorised" }, 401);

    const { sourceUrl, clipId } = await req.json();
    if (!sourceUrl || !clipId) {
      return jsonResponse(
        { error: "Missing required fields: sourceUrl, clipId" },
        400,
      );
    }

    const cleanUrl = sourceUrl.split("#")[0];

    try {
      const head = await fetch(cleanUrl, { method: "HEAD" });
      const size = parseInt(head.headers.get("content-length") || "0", 10);
      if (size > MAX_SOURCE_BYTES) {
        return jsonResponse(
          {
            error: "Source too large for server-side re-encoding",
            maxMB: Math.round(MAX_SOURCE_BYTES / 1048576),
          },
          413,
        );
      }
    } catch {
      // ignore – fetch below will fail if URL is bad
    }

    const vidResp = await fetch(cleanUrl);
    if (!vidResp.ok) {
      return jsonResponse({ error: "Failed to download source clip" }, 502);
    }
    const srcBytes = new Uint8Array(await vidResp.arrayBuffer());

    const core = await getFFmpegCore();
    const ext = cleanUrl.toLowerCase().endsWith(".webm") ? "webm" : "mp4";
    const inputName = `in_${Date.now()}.${ext}`;
    const outputName = `out_${Date.now()}.mp4`;
    core.FS.writeFile(inputName, srcBytes);

    try {
      core.callMain([
        "-y",
        "-i",
        inputName,
        // Re-encode video into H.264 with short GOP so seeking + decode
        // are fast on every device.
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "23",
        "-g",
        "25",
        "-keyint_min",
        "25",
        "-force_key_frames",
        "expr:eq(n,0)",
        // Cap bitrate to keep clips tiny and smooth.
        "-maxrate",
        "6000k",
        "-bufsize",
        "9000k",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        outputName,
      ]);
    } catch (ffErr: any) {
      console.warn("FFmpeg callMain threw (may be normal exit):", ffErr?.message);
    }

    let outputBytes: Uint8Array;
    try {
      outputBytes = core.FS.readFile(outputName);
    } catch {
      return jsonResponse({ error: "FFmpeg produced no output" }, 500);
    } finally {
      try { core.FS.unlink(inputName); } catch { /* ignore */ }
      try { core.FS.unlink(outputName); } catch { /* ignore */ }
    }

    if (!outputBytes || outputBytes.length === 0) {
      return jsonResponse({ error: "FFmpeg produced empty output" }, 500);
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const clipPath = `clips/${clipId}.mp4`;
    const { error: uploadErr } = await serviceClient.storage
      .from("analysis-videos")
      .upload(clipPath, outputBytes, {
        contentType: "video/mp4",
        cacheControl: "31536000",
        upsert: true,
      });

    if (uploadErr) {
      return jsonResponse({ error: uploadErr.message }, 500);
    }

    const { data: urlData } = serviceClient.storage
      .from("analysis-videos")
      .getPublicUrl(clipPath);

    return jsonResponse({ url: urlData.publicUrl });
  } catch (err: any) {
    console.error("reencode-clip error:", err);
    return jsonResponse({ error: err?.message || "Internal error" }, 500);
  }
});