import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action_types, auto_apply } = await req.json();

    console.log('Auto-mapping action categories for:', action_types?.length || 'all', 'action types');

    // Fetch all unique action types from performance_report_actions if not provided
    let actionTypesToMap = action_types;
    if (!actionTypesToMap || actionTypesToMap.length === 0) {
      const { data: actionsData, error: actionsError } = await supabase
        .from('performance_report_actions')
        .select('action_type')
        .not('action_type', 'is', null);

      if (actionsError) throw actionsError;

      // Get unique action types
      const uniqueTypes = [...new Set(actionsData.map(a => a.action_type?.trim()).filter(Boolean))];
      actionTypesToMap = uniqueTypes;
      console.log('Found', actionTypesToMap.length, 'unique action types');
    }

    // Fetch all R90 ratings to understand available categories
    const { data: r90Data, error: r90Error } = await supabase
      .from('r90_ratings')
      .select('category, subcategory, tags, title, description')
      .not('score', 'is', null);

    if (r90Error) throw r90Error;

    // Group R90 ratings by category structure
    const categoryStructure: Record<string, any> = {};
    r90Data.forEach(rating => {
      if (!categoryStructure[rating.category]) {
        categoryStructure[rating.category] = {
          subcategories: new Set(),
          subSubcategories: new Set(),
          examples: []
        };
      }
      if (rating.subcategory) {
        categoryStructure[rating.category].subcategories.add(rating.subcategory);
      }
      if (rating.tags && Array.isArray(rating.tags)) {
        rating.tags.forEach(tag => categoryStructure[rating.category].subSubcategories.add(tag));
      }
      categoryStructure[rating.category].examples.push({
        title: rating.title,
        description: rating.description,
        subcategory: rating.subcategory,
        tags: rating.tags
      });
    });

    // Convert Sets to Arrays for JSON serialization
    const categoryInfo = Object.entries(categoryStructure).map(([category, info]: [string, any]) => ({
      category,
      subcategories: Array.from(info.subcategories),
      subSubcategories: Array.from(info.subSubcategories),
      examples: info.examples.slice(0, 10) // Limit examples to reduce token usage
    }));

    console.log('Available R90 categories:', categoryInfo.map(c => c.category).join(', '));

    // Use Lovable AI to map action types to categories
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `You are an expert football analyst mapping action types to R90 rating categories.

Available R90 Categories and their structure:
${JSON.stringify(categoryInfo, null, 2)}

Action types to map:
${actionTypesToMap.map((type: string, i: number) => `${i + 1}. ${type}`).join('\n')}

For each action type, determine:
1. The most appropriate R90 category
2. The most specific subcategory (if applicable, otherwise null)
3. The most specific sub-subcategory from tags (if applicable, otherwise null)

Rules:
- Match action types to the most specific level possible
- For "Safe pass" types, map to appropriate passing subcategories
- For "Back post movement", map to Attacking Crosses with appropriate delivery type sub-subcategory
- Use exact category/subcategory/sub-subcategory names from the structure provided
- If no perfect match exists, choose the closest semantic match
- Set subcategory or sub_subcategory to null if not applicable

Return ONLY a valid JSON array with this exact structure:
[
  {
    "action_type": "exact action type name",
    "r90_category": "category name",
    "r90_subcategory": "subcategory name or null",
    "r90_sub_subcategory": "sub-subcategory name or null",
    "confidence": "high|medium|low"
  }
]`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 16000
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const aiContent = aiResult.choices[0]?.message?.content || '';
    
    console.log('Full AI Response length:', aiContent.length);
    console.log('Response start:', aiContent.substring(0, 100));
    console.log('Response end:', aiContent.substring(aiContent.length - 100));

    // Parse the JSON response with multiple strategies
    let mappings;
    try {
      let jsonStr = aiContent.trim();
      let parseStrategy = 'direct';
      
      // Strategy 1: Try lenient regex to remove markdown code blocks
      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
        parseStrategy = 'regex-extraction';
        console.log('✓ Extracted JSON using regex');
      }
      
      // Strategy 2: Try finding JSON array bounds (handles incomplete markdown)
      const firstBracket = jsonStr.indexOf('[');
      const lastBracket = jsonStr.lastIndexOf(']');
      
      if (firstBracket !== -1 && lastBracket > firstBracket) {
        jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
        parseStrategy = parseStrategy === 'regex-extraction' ? 'regex-extraction' : 'bracket-extraction';
        console.log('✓ Extracted JSON array using bracket bounds');
      } else if (firstBracket !== -1) {
        // Response might be truncated - try to salvage it
        console.warn('⚠️ Response appears truncated, attempting to fix...');
        jsonStr = jsonStr.substring(firstBracket);
        // Try to close incomplete JSON structures
        const openBraces = (jsonStr.match(/{/g) || []).length;
        const closeBraces = (jsonStr.match(/}/g) || []).length;
        const missingBraces = openBraces - closeBraces;
        
        if (missingBraces > 0) {
          // Add missing closing braces and bracket
          jsonStr += '\n' + '  }'.repeat(missingBraces) + '\n]';
          parseStrategy = 'truncation-recovery';
          console.log('✓ Attempted to recover truncated response');
        }
      }
      
      console.log('Parse strategy:', parseStrategy);
      console.log('JSON to parse (first 200 chars):', jsonStr.substring(0, 200));
      
      mappings = JSON.parse(jsonStr);
      
      if (!Array.isArray(mappings)) {
        throw new Error('AI response is not an array');
      }
      
      console.log('✓ Successfully parsed', mappings.length, 'mappings');
    } catch (parseError: any) {
      console.error('❌ Failed to parse AI response:', parseError.message);
      console.error('Response length:', aiContent.length);
      console.error('First 500 chars:', aiContent.substring(0, 500));
      console.error('Last 500 chars:', aiContent.substring(Math.max(0, aiContent.length - 500)));
      throw new Error(`Failed to parse AI mapping response: ${parseError.message}`);
    }

    console.log('Parsed mappings:', mappings.length, 'items');

    // If auto_apply is true, insert the mappings into the database
    if (auto_apply) {
      // First, check existing mappings
      const { data: existingMappings } = await supabase
        .from('action_r90_category_mappings')
        .select('action_type');

      const existingTypes = new Set(existingMappings?.map(m => m.action_type) || []);

      // Filter out already mapped action types
      const newMappings = mappings.filter(m => !existingTypes.has(m.action_type));

      if (newMappings.length > 0) {
        const { error: insertError } = await supabase
          .from('action_r90_category_mappings')
          .insert(
            newMappings.map(m => ({
              action_type: m.action_type,
              r90_category: m.r90_category,
              r90_subcategory: m.r90_subcategory === 'null' ? null : m.r90_subcategory,
              r90_sub_subcategory: m.r90_sub_subcategory === 'null' ? null : m.r90_sub_subcategory,
            }))
          );

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }

        console.log('Successfully inserted', newMappings.length, 'new mappings');
      } else {
        console.log('All action types already mapped');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        mappings,
        applied: auto_apply,
        message: auto_apply ? 'Mappings created successfully' : 'Mappings suggested successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error in auto-map-action-categories:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
