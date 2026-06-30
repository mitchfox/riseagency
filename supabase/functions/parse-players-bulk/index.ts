import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageInput { base64: string; mimeType?: string }

const SYSTEM_PROMPT = `You are a football scouting assistant. Extract a list of football players from the supplied text and/or screenshots. For each player infer the most likely values for: name, position (use short codes like GK, CB, LB, RB, CDM, CM, CAM, RW, LW, CF), nationality (country name in English), date_of_birth (YYYY-MM-DD if visible, otherwise null), age (integer if visible, otherwise null), club, league, instagram_handle (without @), notes (short free-form text with anything else useful).

Rules:
- Use UK English.
- Never invent a date of birth or club if not present in source; leave null.
- Position must be a recognised football abbreviation.
- If a row clearly isn't a player (e.g. header, total), skip it.
- Return STRICT JSON only, matching the schema. No prose, no code fences.

Schema: { "players": [ { "name": string, "position": string|null, "nationality": string|null, "date_of_birth": string|null, "age": number|null, "club": string|null, "league": string|null, "instagram_handle": string|null, "notes": string|null } ] }`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { text, images, instruction } = await req.json() as { text?: string; images?: ImageInput[]; instruction?: string };
    if (!text && (!images || images.length === 0)) {
      return new Response(JSON.stringify({ error: 'Provide text or images' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const content: any[] = [];
    const userText = [
      instruction ? `Extra instruction: ${instruction}` : '',
      text ? `Source text:\n${text}` : '',
      'Extract every distinct player you can identify and return ONLY the JSON object.',
    ].filter(Boolean).join('\n\n');
    content.push({ type: 'text', text: userText });
    for (const img of (images || [])) {
      content.push({ type: 'image_url', image_url: { url: `data:${img.mimeType || 'image/png'};base64,${img.base64}` } });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gateway error', response.status, errText);
      if (response.status === 429) return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again shortly.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402) return new Response(JSON.stringify({ error: 'AI credits depleted. Top up to continue.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ error: 'AI parse failed', detail: errText.slice(0, 500) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { players: [] }; }
    const players = Array.isArray(parsed.players) ? parsed.players : [];
    return new Response(JSON.stringify({ players }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('parse-players-bulk error', e);
    return new Response(JSON.stringify({ error: (e as Error).message || 'Failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});