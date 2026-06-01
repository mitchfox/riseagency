import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType, currentContent, instruction } = await req.json();
    if (!imageBase64) throw new Error('Image is required');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const systemPrompt = `You extract content from an uploaded image and turn it into well-structured Markdown that can be appended to a staff document. Use UK English. Preserve any tables, lists, and headings visible in the image. Do not invent content. If the image is a screenshot of text, transcribe it faithfully. If it is a photograph or diagram, write a clear, concise description plus any visible text. Return ONLY the Markdown to be inserted — no preamble, no code fences.`;

    const userText = instruction
      ? `Extra instruction from the user: ${instruction}\n\nExisting document (for context only, do not repeat it):\n${(currentContent || '').slice(-2000)}`
      : `Existing document (for context only, do not repeat it):\n${(currentContent || '').slice(-2000)}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userText },
              { type: 'image_url', image_url: { url: `data:${mimeType || 'image/png'};base64,${imageBase64}` } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits depleted. Please top up to continue.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('Failed to read image');
    }

    const data = await response.json();
    const markdown = data.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ markdown }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-doc-from-image:', error);
    return new Response(JSON.stringify({ error: (error as Error).message || 'Failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});