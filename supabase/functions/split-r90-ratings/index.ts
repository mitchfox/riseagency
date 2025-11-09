import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting R90 ratings split operation...');

    // Fetch all ratings with bundled content
    const { data: bundledRatings, error: fetchError } = await supabase
      .from('r90_ratings')
      .select('*')
      .not('content', 'is', null)
      .like('content', '%Successful%');

    if (fetchError) throw fetchError;
    
    console.log(`Found ${bundledRatings.length} bundled ratings to split`);

    const newRatings: any[] = [];
    const idsToDelete: string[] = [];

    for (const rating of bundledRatings) {
      const lines = rating.content.split('\n').filter((line: string) => line.trim());
      
      for (const line of lines) {
        // Parse various patterns:
        // 1. "Successful (Own Third): +0.008"
        // 2. "Unsuccessful (Own Third): -0.01"
        // 3. "Unsuccessful: -0.005405 (all thirds)"
        // 4. "Successful: -0.002 (all thirds)"
        
        const successWithThirdMatch = line.match(/^Successful\s*\(([^)]+)\):\s*([+\-]?[\d.]+|xG value|xA value)/i);
        const unsuccessWithThirdMatch = line.match(/^Unsuccessful\s*\(([^)]+)\):\s*([+\-]?[\d.]+|xG value|xA value)/i);
        const successAllMatch = line.match(/^Successful:\s*([+\-]?[\d.]+|xG value|xA value)\s*\(all thirds\)/i);
        const unsuccessAllMatch = line.match(/^Unsuccessful:\s*([+\-]?[\d.]+|xG value|xA value)\s*\(all thirds\)/i);
        
        const baseTitle = rating.title.replace(/^(In Space|Under Pressure)\s*-\s*/, '');
        
        if (successWithThirdMatch) {
          const [, third, scoreStr] = successWithThirdMatch;
          const score = parseScore(scoreStr);
          
          newRatings.push({
            title: `${baseTitle} - Successful (${third})`,
            description: rating.description,
            category: rating.category,
            subcategory: rating.subcategory,
            score: score,
            content: null
          });
        } else if (unsuccessWithThirdMatch) {
          const [, third, scoreStr] = unsuccessWithThirdMatch;
          const score = parseScore(scoreStr);
          
          newRatings.push({
            title: `${baseTitle} - Unsuccessful (${third})`,
            description: rating.description,
            category: rating.category,
            subcategory: rating.subcategory,
            score: score,
            content: null
          });
        } else if (successAllMatch) {
          const [, scoreStr] = successAllMatch;
          const score = parseScore(scoreStr);
          
          newRatings.push({
            title: `${baseTitle} - Successful (All Thirds)`,
            description: rating.description,
            category: rating.category,
            subcategory: rating.subcategory,
            score: score,
            content: null
          });
        } else if (unsuccessAllMatch) {
          const [, scoreStr] = unsuccessAllMatch;
          const score = parseScore(scoreStr);
          
          newRatings.push({
            title: `${baseTitle} - Unsuccessful (All Thirds)`,
            description: rating.description,
            category: rating.category,
            subcategory: rating.subcategory,
            score: score,
            content: null
          });
        }
      }
      
      idsToDelete.push(rating.id);
    }

    console.log(`Created ${newRatings.length} new ratings from ${bundledRatings.length} bundled ratings`);

    // Insert new ratings
    const { error: insertError } = await supabase
      .from('r90_ratings')
      .insert(newRatings);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log('Successfully inserted new ratings');

    // Delete old bundled ratings
    const { error: deleteError } = await supabase
      .from('r90_ratings')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw deleteError;
    }

    console.log(`Successfully deleted ${idsToDelete.length} old bundled ratings`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        bundledRatingsProcessed: bundledRatings.length,
        newRatingsCreated: newRatings.length,
        oldRatingsDeleted: idsToDelete.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in split-r90-ratings:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseScore(scoreStr: string): number | null {
  // Handle special cases
  if (scoreStr.toLowerCase().includes('xg value') || scoreStr.toLowerCase().includes('xa value')) {
    return null; // These need to be calculated dynamically
  }
  
  // Parse numeric value
  const cleanStr = scoreStr.trim().replace(/^[+\-]/, '');
  const num = parseFloat(cleanStr);
  
  if (isNaN(num)) return null;
  
  // Preserve sign
  return scoreStr.trim().startsWith('-') ? -num : num;
}
