import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_SOURCE_BYTES = 200 * 1024 * 1024; // 200 MB

// Cache the FFmpeg core module across warm invocations
let cachedCore: any = null;

async function getFFmpegCore() {
  if (cachedCore) return cachedCore;

  console.log("Loading FFmpeg WASM core...");
  const t0 = Date.now();

  // Import the Emscripten-compiled FFmpeg core (single-threaded build).
  // The npm: specifier lets Deno resolve the package automatically.
  // Try npm: specifier first (best Deno compat), then CDN fallback
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
    // Ensure WASM file can be located from CDN
    locateFile: (path: string) => {
      if (path.endsWith(".wasm")) {
        return "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm";
      }
      return path;
    },
    print: () => {},
    printErr: () => {},
  });

  console.log(`FFmpeg core loaded in ${Date.now() - t0}ms`);
  return cachedCore;
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ──
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

    // ── Parse body ──
    const { sourceUrl, start, end, clipId } = await req.json();

    if (!sourceUrl || start == null || end == null || !clipId) {
      return jsonResponse(
        { error: "Missing required fields: sourceUrl, start, end, clipId" },
        400,
      );
    }
    if (typeof start !== "number" || typeof end !== "number" || end <= start) {
      return jsonResponse({ error: "Invalid time range" }, 400);
    }

    const cleanUrl = sourceUrl.split("#")[0];

    // ── Size guard ──
    try {
      const head = await fetch(cleanUrl, { method: "HEAD" });
      const size = parseInt(
        head.headers.get("content-length") || "0",
        10,
      );
      if (size > MAX_SOURCE_BYTES) {
        return jsonResponse(
          {
            error: "Source too large for server-side trimming",
            maxMB: Math.round(MAX_SOURCE_BYTES / 1048576),
          },
          413,
        );
      }
    } catch {
      // HEAD failed – proceed; fetch below will fail if URL is bad
    }

    // ── Download source video ──
    console.log(`Downloading source video (${cleanUrl.slice(0, 80)}…)`);
    const vidResp = await fetch(cleanUrl);
    if (!vidResp.ok) {
      return jsonResponse({ error: "Failed to download source video" }, 502);
    }
    const srcBytes = new Uint8Array(await vidResp.arrayBuffer());
    console.log(
      `Source downloaded: ${(srcBytes.length / 1048576).toFixed(1)} MB`,
    );

    // ── FFmpeg trim (re-encode with keyframe at start for instant playback) ──
    const core = await getFFmpegCore();

    const inputName = `in_${Date.now()}.mp4`;
    const outputName = `out_${Date.now()}.mp4`;

    core.FS.writeFile(inputName, srcBytes);

    const duration = end - start;
    console.log(
      `Running FFmpeg: -ss ${start} -t ${duration} (re-encode, keyframe@start, GOP=1s, faststart)`,
    );

    try {
      core.callMain([
        "-y",
        "-ss",
        String(start),
        "-i",
        inputName,
        "-t",
        String(duration),
        // Re-encode video: force keyframe at start, short GOP (~1s at 25fps)
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
        // Re-encode audio
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        // Web-optimised: moov atom at start
        "-movflags",
        "+faststart",
        outputName,
      ]);
    } catch (ffErr: any) {
      // FFmpeg callMain may throw on exit – check if output was created
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

    console.log(
      `Clip trimmed: ${(outputBytes.length / 1048576).toFixed(1)} MB`,
    );

    // ── Upload clip ──
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

    console.log(`Clip uploaded: ${clipPath}`);
    return jsonResponse({ url: urlData.publicUrl });
  } catch (err: any) {
    console.error("trim-video-clip error:", err);
    return jsonResponse({ error: err?.message || "Internal error" }, 500);
  }
});
