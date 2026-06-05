import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(JSON.stringify({ error: 'imageBase64 required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dataUrl = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content:
            'You are extracting expense data from a receipt, invoice or screenshot. A single image can contain MULTIPLE separate purchases or line items (for example two different receipts photographed together, or a bank statement listing several transactions). Return ONLY a JSON object of the form { "items": [ { ... }, ... ] } where each item has keys: date (YYYY-MM-DD), time (HH:MM 24h), amount (number, in GBP — convert if another currency is shown), vendor (short merchant or counterparty name), item (short description of what was bought, e.g. "Coffee and pastry"), location (city or address if visible), category (one of: tools, travel, staff, misc). Use null for any value you cannot read. If the image only shows one purchase, return a single-element items array. No prose, no markdown.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Parse this receipt.' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text().catch(() => '');
      return new Response(
        JSON.stringify({ error: 'AI gateway error', status: aiResp.status, body: errText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const aiData = await aiResp.json();
    const raw = aiData?.choices?.[0]?.message?.content ?? '';
    const cleaned = String(raw).replace(/```json|```/g, '').trim();

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch { parsed = {}; }
      }
    }

    return new Response(JSON.stringify({ parsed }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});