import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BBox { x: number; y: number; width: number; height: number; label?: string }

interface UploadFrame {
  id: string;
  imageUrl: string;
  actionType: string;
  annotations?: BBox[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ROBOFLOW_API_KEY');
    const workspace = Deno.env.get('ROBOFLOW_WORKSPACE');
    const project = Deno.env.get('ROBOFLOW_PROJECT');

    if (!apiKey || !workspace || !project) {
      return new Response(
        JSON.stringify({
          error: 'Roboflow credentials missing. Configure ROBOFLOW_API_KEY, ROBOFLOW_WORKSPACE and ROBOFLOW_PROJECT in backend secrets.',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { frames } = (await req.json()) as { frames: UploadFrame[] };
    if (!Array.isArray(frames) || frames.length === 0) {
      return new Response(JSON.stringify({ error: 'No frames provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: { id: string; ok: boolean; error?: string; rfId?: string }[] = [];

    for (const frame of frames) {
      try {
        // 1. Fetch the image from storage as a blob
        const imgResp = await fetch(frame.imageUrl);
        if (!imgResp.ok) {
          results.push({ id: frame.id, ok: false, error: `Image fetch failed (${imgResp.status})` });
          continue;
        }
        const imgBuf = new Uint8Array(await imgResp.arrayBuffer());

        // 2. Upload image to Roboflow with base64 encoding (most permissive)
        let bin = '';
        for (let i = 0; i < imgBuf.length; i++) bin += String.fromCharCode(imgBuf[i]);
        const base64 = btoa(bin);

        const safeName = `${frame.actionType}_${frame.id}.jpg`.replace(/[^a-z0-9_.-]/gi, '_');
        const splitParam = `&split=train&tag=${encodeURIComponent(frame.actionType)}`;
        const uploadUrl = `https://api.roboflow.com/dataset/${workspace}/${project}/upload?api_key=${apiKey}&name=${safeName}${splitParam}`;

        const upResp = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: base64,
        });
        const upJson = await upResp.json().catch(() => ({}));
        if (!upResp.ok || upJson?.error) {
          results.push({ id: frame.id, ok: false, error: upJson?.error?.message || `HTTP ${upResp.status}` });
          continue;
        }
        const rfImageId = upJson?.id;

        // 3. If annotations are present, upload them as YOLO txt
        if (rfImageId && frame.annotations && frame.annotations.length > 0) {
          const yoloLines = frame.annotations.map((a) => {
            const xc = a.x + a.width / 2;
            const yc = a.y + a.height / 2;
            return `0 ${xc.toFixed(6)} ${yc.toFixed(6)} ${a.width.toFixed(6)} ${a.height.toFixed(6)}`;
          });
          const annotUrl = `https://api.roboflow.com/dataset/${workspace}/${project}/annotate/${rfImageId}?api_key=${apiKey}&name=${safeName.replace(/\.jpg$/, '.txt')}`;
          await fetch(annotUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: yoloLines.join('\n'),
          }).catch(() => {});
        }

        results.push({ id: frame.id, ok: true, rfId: rfImageId });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ id: frame.id, ok: false, error: msg });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});