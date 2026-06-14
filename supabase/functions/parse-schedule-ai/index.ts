import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface ParsedItem {
  date: string;
  start_time: string;
  end_time: string;
  title: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) {
      return new Response(JSON.stringify({ error: 'Missing LOVABLE_API_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const mode: 'text' | 'image' = body.mode === 'image' ? 'image' : 'text';
    const referenceDate: string = body.referenceDate || new Date().toISOString().slice(0, 10);
    const text: string = body.text || '';
    const imageBase64: string = body.imageBase64 || '';
    const imageMime: string = body.imageMime || 'image/jpeg';

    if (mode === 'text' && !text.trim()) {
      return new Response(JSON.stringify({ error: 'No text provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (mode === 'image' && !imageBase64) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You extract schedule entries from text or images of schedules, planners, calendars or itineraries.

Rules:
- Output strictly valid JSON matching the requested schema. No prose, no markdown fences.
- Use UK English in titles.
- Reference date is ${referenceDate} (YYYY-MM-DD). When a row mentions only a weekday (e.g. "Monday"), choose the next occurrence on or after the reference date. When only a date like "12 Jun" appears, infer the year from the reference date (use the nearest future occurrence).
- date must be YYYY-MM-DD. start_time and end_time must be HH:MM in 24-hour format.
- If only a start time is given, set end_time to one hour later.
- If only a duration is given alongside a start, compute end_time.
- Omit rows that have no usable time.
- Keep title concise (max ~60 chars), describing the event.
- Do not invent items not present in the source.`;

    const userContent: any[] = [];
    if (mode === 'text') {
      userContent.push({ type: 'text', text: `Extract schedule items from this text:\n\n${text}` });
    } else {
      userContent.push({ type: 'text', text: 'Extract schedule items from this image.' });
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${imageMime};base64,${imageBase64}` },
      });
    }

    const tools = [{
      type: 'function',
      function: {
        name: 'submit_schedule_items',
        description: 'Return parsed schedule items',
        parameters: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string', description: 'YYYY-MM-DD' },
                  start_time: { type: 'string', description: 'HH:MM' },
                  end_time: { type: 'string', description: 'HH:MM' },
                  title: { type: 'string' },
                },
                required: ['date', 'start_time', 'end_time', 'title'],
                additionalProperties: false,
              },
            },
          },
          required: ['items'],
          additionalProperties: false,
        },
      },
    }];

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': key,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        tools,
        tool_choice: { type: 'function', function: { name: 'submit_schedule_items' } },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('AI gateway error:', aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit reached. Please try again shortly.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Add credits in workspace settings.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'AI request failed', detail: errText }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ai = await aiRes.json();
    const toolCall = ai?.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: { items: ParsedItem[] } = { items: [] };
    if (toolCall?.function?.arguments) {
      try {
        parsed = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error('Failed to parse tool args', e);
      }
    }

    const items = (parsed.items || []).filter((it) =>
      it && typeof it.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(it.date) &&
      /^\d{2}:\d{2}$/.test(it.start_time) && /^\d{2}:\d{2}$/.test(it.end_time) &&
      typeof it.title === 'string' && it.title.trim().length > 0,
    );

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('parse-schedule-ai error', e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});