import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { section, playerId } = await req.json();

    if (!section || !playerId) {
      return new Response(
        JSON.stringify({ error: 'section and playerId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) throw new Error('LOVABLE_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch player context
    const { data: player } = await supabase
      .from('players')
      .select('name, position, club, nationality')
      .eq('id', playerId)
      .single();

    if (!player) {
      return new Response(
        JSON.stringify({ error: 'Player not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch recent reports for context
    const { data: recentReports } = await supabase
      .from('player_analysis')
      .select('opponent, r90_score, performance_overview, analysis_date, result')
      .eq('player_id', playerId)
      .order('analysis_date', { ascending: false })
      .limit(3);

    // Fetch recent analyses
    const { data: recentAnalyses } = await supabase
      .from('analysis_player_tags')
      .select('analysis_id, analyses(title, analysis_type)')
      .eq('player_id', playerId)
      .limit(3);

    // Fetch decision history to understand preferences
    const { data: decisions } = await supabase
      .from('ai_shell_decisions')
      .select('suggestion_id, decision, ai_shell_suggestions(shell_type)')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(20);

    const acceptedTypes = decisions?.filter(d => d.decision === 'accepted').map(d => (d as any).ai_shell_suggestions?.shell_type).filter(Boolean) || [];
    const rejectedTypes = decisions?.filter(d => d.decision === 'rejected').map(d => (d as any).ai_shell_suggestions?.shell_type).filter(Boolean) || [];

    // Build section-specific prompts
    const sectionPrompts: Record<string, string> = {
      athlete_centre: `Generate 2-3 structural shell suggestions for a Performance Report or Match Analysis for ${player.name} (${player.position}, ${player.club || 'unattached'}).
Recent matches: ${recentReports?.map(r => `vs ${r.opponent} (${r.result}, R90: ${r.r90_score})`).join('; ') || 'None available'}.
Shells should include: report structure with placeholder sections, key areas to cover based on position and recent form.`,

      analysis: `Generate 2-3 structural shell suggestions for a Tactical Analysis for ${player.name} (${player.position}).
Recent analyses: ${recentAnalyses?.map(a => (a as any).analyses?.title).filter(Boolean).join('; ') || 'None available'}.
Shells should include: pre-match or post-match analysis structure with tactical points to cover.`,

      data: `Generate 2-3 data summary shell suggestions for ${player.name} (${player.position}, ${player.club || 'unattached'}).
Recent R90 scores: ${recentReports?.map(r => `${r.r90_score} vs ${r.opponent}`).join(', ') || 'None available'}.
Shells should include: statistical overview structure, trend analysis format, comparison framework.`,

      player_management: `Generate 2-3 management shell suggestions for ${player.name} (${player.position}, ${player.club || 'unattached'}).
Shells should include: development plan update, contract situation summary, or scouting report template.`,
    };

    const prompt = sectionPrompts[section] || sectionPrompts.athlete_centre;

    const priorityNote = acceptedTypes.length > 0 
      ? `\nPreviously accepted shell types: ${[...new Set(acceptedTypes)].join(', ')}. Prioritise similar types.`
      : '';
    const avoidNote = rejectedTypes.length > 0
      ? `\nPreviously rejected shell types: ${[...new Set(rejectedTypes)].join(', ')}. Avoid these types.`
      : '';

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a professional football analysis assistant. Generate structural shells (templates) that staff can use as starting points for reports and analyses. Each shell should be practical, position-aware, and include placeholder sections that staff can fill in. Do not generate actual content - generate structure and prompts for what to write in each section.${priorityNote}${avoidNote}`
          },
          { role: 'user', content: prompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'return_shells',
              description: 'Return structured shell suggestions',
              parameters: {
                type: 'object',
                properties: {
                  shells: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        shell_type: { type: 'string', description: 'Short type label e.g. "Performance Report", "Pre-Match Analysis", "Development Plan"' },
                        preview_text: { type: 'string', description: 'One-line preview of what this shell covers' },
                        shell_content: {
                          type: 'object',
                          properties: {
                            sections: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  heading: { type: 'string' },
                                  prompt: { type: 'string', description: 'What to write in this section' },
                                  bullet_points: { type: 'array', items: { type: 'string' }, description: 'Optional starter bullet points' }
                                },
                                required: ['heading', 'prompt']
                              }
                            }
                          },
                          required: ['sections']
                        }
                      },
                      required: ['shell_type', 'preview_text', 'shell_content']
                    }
                  }
                },
                required: ['shells']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'return_shells' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again shortly.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please top up in workspace settings.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    let shells: any[] = [];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        shells = parsed.shells || [];
      } catch {
        console.error('Failed to parse tool call arguments');
      }
    }

    // Store suggestions in database
    const insertData = shells.map((shell: any) => ({
      section,
      player_id: playerId,
      shell_type: shell.shell_type,
      preview_text: shell.preview_text,
      shell_content: shell.shell_content,
    }));

    if (insertData.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('ai_shell_suggestions')
        .insert(insertData)
        .select();

      if (insertError) {
        console.error('Failed to store suggestions:', insertError);
      } else {
        shells = inserted || shells;
      }
    }

    return new Response(
      JSON.stringify({ shells }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
