import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Pitch zone mapping: maps pixel coordinates (normalised 0-1) from
 * a bird's-eye or broadcast view onto the 18-zone / 162-sub-zone grid.
 *
 * The pitch is divided into 6 columns (left-right) x 3 rows (defensive, middle, attacking).
 * Each major zone has 9 sub-zones (3x3 internal grid).
 */
function mapToZone(normX: number, normY: number): { zone: number; subZone: number } {
  const col = Math.min(Math.floor(normX * 6), 5); // 0-5
  const row = Math.min(Math.floor(normY * 3), 2);  // 0-2
  const zone = row * 6 + col + 1; // 1-18

  const subCol = Math.min(Math.floor((normX * 6 - col) * 3), 2);
  const subRow = Math.min(Math.floor((normY * 3 - row) * 3), 2);
  const subZone = subRow * 3 + subCol + 1; // 1-9

  return { zone, subZone };
}

interface Detection {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FrameResult {
  frameIndex: number;
  timestamp: number;
  detections: {
    class: string;
    confidence: number;
    zone: number;
    subZone: number;
    bbox: { x: number; y: number; w: number; h: number };
  }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const roboflowApiKey = Deno.env.get('ROBOFLOW_API_KEY');
    if (!roboflowApiKey) {
      return new Response(
        JSON.stringify({
          error: 'Roboflow API key not configured. Please add ROBOFLOW_API_KEY in your backend secrets.',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const roboflowModelUrl = Deno.env.get('ROBOFLOW_MODEL_URL');
    if (!roboflowModelUrl) {
      return new Response(
        JSON.stringify({
          error: 'Roboflow model URL not configured. Please add ROBOFLOW_MODEL_URL (e.g. https://detect.roboflow.com/your-model/1) in your backend secrets.',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { frames, imageWidth, imageHeight } = body as {
      frames: { index: number; timestamp: number; base64: string }[];
      imageWidth: number;
      imageHeight: number;
    };

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No frames provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: FrameResult[] = [];

    // Process frames sequentially to avoid rate limits
    for (const frame of frames) {
      try {
        const inferenceUrl = `${roboflowModelUrl}?api_key=${roboflowApiKey}&confidence=40&overlap=30`;

        const response = await fetch(inferenceUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/base64' },
          body: frame.base64,
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`Roboflow inference failed for frame ${frame.index}: ${response.status} ${errText}`);
          continue;
        }

        const data = await response.json();
        const predictions = (data.predictions || []) as Detection[];

        const mappedDetections = predictions.map((det) => {
          const normX = det.x / (imageWidth || 1);
          const normY = det.y / (imageHeight || 1);
          const { zone, subZone } = mapToZone(normX, normY);

          return {
            class: det.class,
            confidence: det.confidence,
            zone,
            subZone,
            bbox: { x: det.x, y: det.y, w: det.width, h: det.height },
          };
        });

        results.push({
          frameIndex: frame.index,
          timestamp: frame.timestamp,
          detections: mappedDetections,
        });
      } catch (frameErr) {
        console.error(`Error processing frame ${frame.index}:`, frameErr);
      }
    }

    return new Response(
      JSON.stringify({ results, totalFrames: frames.length, processedFrames: results.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
