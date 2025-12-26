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
    const { documents } = await req.json();

    if (!documents || documents.length < 2) {
      return new Response(
        JSON.stringify({ error: 'At least 2 documents are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build document context for AI
    const documentContext = documents.map((doc: { name: string; content: string }, index: number) => 
      `=== DOCUMENT ${index + 1}: ${doc.name} ===\n${doc.content}\n`
    ).join('\n\n');

    const systemPrompt = `You are a legal contract analysis expert. Your task is to compare and cross-reference multiple contracts or legal documents.

When analyzing documents, you should:
1. Identify KEY DIFFERENCES between the documents (terms, conditions, dates, parties, obligations)
2. Highlight DISCREPANCIES in language or clauses that could have different legal implications
3. Note any MISSING CLAUSES that appear in some documents but not others
4. Point out CONFLICTING TERMS between documents
5. Identify any CONCERNING LANGUAGE that could be problematic
6. Provide a SUMMARY of important findings

Format your response clearly with sections and bullet points. Be specific about which document contains what, referencing by document name.`;

    const userPrompt = `Please analyze and cross-reference the following ${documents.length} documents, identifying differences, discrepancies, and any concerning language:\n\n${documentContext}`;

    console.log(`Analyzing ${documents.length} documents for cross-reference`);

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
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content;

    if (!analysis) {
      throw new Error('No analysis generated');
    }

    console.log('Contract cross-reference analysis complete');

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in contract-cross-reference:', error);
    return new Response(
      JSON.stringify({ error: 'Analysis failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
