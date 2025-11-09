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

    // Fetch all ratings with bundled content (null scores indicate bundled data)
    const { data: bundledRatings, error: fetchError } = await supabase
      .from('r90_ratings')
      .select('*')
      .is('score', null)
      .not('content', 'is', null);

    if (fetchError) throw fetchError;
    
    console.log(`Found ${bundledRatings.length} bundled ratings to split`);

    const newRatings: any[] = [];
    const idsToDelete: string[] = [];

    for (const rating of bundledRatings) {
      const lines = rating.content.split('\n').filter((line: string) => line.trim());
      let foundMatch = false;
      
      for (const line of lines) {
        // Pattern 1: "In Space: +0.0065" or "Light Pressure: +0.0052" or "Under Pressure: +0.0046"
        const pressureMatch = line.match(/^(In Space|Light Pressure|Under Pressure):\s*([+\-]?[\d.]+)/i);
        
        // Pattern 2: "Front Post Contested: +0.0705 (xG 0.3)"
        const crossingMatch = line.match(/^(Front Post|Central|Back Post)\s+(Contested|Uncontested):\s*([+\-]?[\d.]+)\s*\(xG\s+([\d.]+)\)/i);
        
        // Pattern 3: "Penalty: -0.023 to -0.043" (range)
        const penaltyRangeMatch = line.match(/^Penalty:\s*([+\-]?[\d.]+)\s+to\s+([+\-]?[\d.]+)/i);
        
        // Pattern 4: "Base: +0.01926 (1 in 50)" or "Final third: +0.0672"
        const contextMatch = line.match(/^(Base|Final third|Middle third|Final to middle third|Middle to own third|Final to own third):\s*([+\-]?[\d.]+)/i);
        
        // Pattern 5: "6-yard box: +0.048 (6% second ball chance, 80% scoring if lands)"
        const zoneMatch = line.match(/^(6-yard box|Golden zone):\s*([+\-]?[\d.]+)/i);
        
        // Pattern 6: "Successful (Own Third): +0.008"
        const successWithThirdMatch = line.match(/^Successful\s*\(([^)]+)\):\s*([+\-]?[\d.]+|xG value|xA value)/i);
        
        // Pattern 7: "Unsuccessful (Own Third): -0.01"
        const unsuccessWithThirdMatch = line.match(/^Unsuccessful\s*\(([^)]+)\):\s*([+\-]?[\d.]+|xG value|xA value)/i);
        
        // Pattern 8: "Successful: -0.002 (all thirds)"
        const successAllMatch = line.match(/^Successful:\s*([+\-]?[\d.]+|xG value|xA value)\s*\(all thirds\)/i);
        
        // Pattern 9: "Unsuccessful: -0.005405 (all thirds)"
        const unsuccessAllMatch = line.match(/^Unsuccessful:\s*([+\-]?[\d.]+|xG value|xA value)\s*\(all thirds\)/i);
        
        // Pattern 10: "Unsuccessful Affected: -0.0045"
        const affectedMatch = line.match(/^Unsuccessful\s+(Affected|Unaffected):\s*([+\-]?[\d.]+)/i);
        
        if (pressureMatch) {
          const [, pressureType, scoreStr] = pressureMatch;
          const score = parseScore(scoreStr);
          foundMatch = true;
          
          newRatings.push({
            title: `${rating.title} - ${pressureType}`,
            description: rating.description,
            category: rating.category,
            subcategory: rating.subcategory,
            score: score,
            content: null
          });
        } else if (crossingMatch) {
          const [, position, contested, scoreStr, xgValue] = crossingMatch;
          const score = parseScore(scoreStr);
          foundMatch = true;
          
          newRatings.push({
            title: `${rating.title} - ${position} ${contested}`,
            description: rating.description,
            category: rating.category,
            subcategory: rating.subcategory,
            score: score,
            content: `xG: ${xgValue}`
          });
        } else if (penaltyRangeMatch) {
          const [, minScore, maxScore] = penaltyRangeMatch;
          const minNum = parseScore(minScore);
          const maxNum = parseScore(maxScore);
          foundMatch = true;
          
          // Use the average of the range
          const avgScore = minNum !== null && maxNum !== null ? (minNum + maxNum) / 2 : null;
          
          newRatings.push({
            title: rating.title,
            description: rating.description,
            category: rating.category,
            subcategory: rating.subcategory,
            score: avgScore,
            content: `Penalty range: ${minScore} to ${maxScore}`
          });
        } else if (contextMatch) {
          const [, context, scoreStr] = contextMatch;
          const score = parseScore(scoreStr);
          foundMatch = true;
          
          newRatings.push({
            title: `${rating.title} - ${context}`,
            description: rating.description,
            category: rating.category,
            subcategory: rating.subcategory,
            score: score,
            content: null
          });
        } else if (zoneMatch) {
          const [, zone, scoreStr] = zoneMatch;
          const score = parseScore(scoreStr);
          foundMatch = true;
          
          newRatings.push({
            title: `${rating.title} - ${zone}`,
            description: rating.description,
            category: rating.category,
            subcategory: rating.subcategory,
            score: score,
            content: null
          });
        } else if (successWithThirdMatch) {
          const [, third, scoreStr] = successWithThirdMatch;
          const score = parseScore(scoreStr);
          foundMatch = true;
          const baseTitle = rating.title.replace(/^(In Space|Under Pressure)\s*-\s*/, '');
          
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
          foundMatch = true;
          const baseTitle = rating.title.replace(/^(In Space|Under Pressure)\s*-\s*/, '');
          
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
          foundMatch = true;
          const baseTitle = rating.title.replace(/^(In Space|Under Pressure)\s*-\s*/, '');
          
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
          foundMatch = true;
          const baseTitle = rating.title.replace(/^(In Space|Under Pressure)\s*-\s*/, '');
          
          newRatings.push({
            title: `${baseTitle} - Unsuccessful (All Thirds)`,
            description: rating.description,
            category: rating.category,
            subcategory: rating.subcategory,
            score: score,
            content: null
          });
        } else if (affectedMatch) {
          const [, affectedType, scoreStr] = affectedMatch;
          const score = parseScore(scoreStr);
          foundMatch = true;
          
          newRatings.push({
            title: `${rating.title} - Unsuccessful ${affectedType}`,
            description: rating.description,
            category: rating.category,
            subcategory: rating.subcategory,
            score: score,
            content: null
          });
        }
      }
      
      // Only delete if we found matches to split
      if (foundMatch) {
        idsToDelete.push(rating.id);
      }
    }

    console.log(`Created ${newRatings.length} new ratings from ${idsToDelete.length} bundled ratings`);

    if (newRatings.length > 0) {
      // Insert new ratings
      const { error: insertError } = await supabase
        .from('r90_ratings')
        .insert(newRatings);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      console.log('Successfully inserted new ratings');
    }

    if (idsToDelete.length > 0) {
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
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        bundledRatingsFound: bundledRatings.length,
        bundledRatingsProcessed: idsToDelete.length,
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
  const cleanStr = scoreStr.trim().replace(/^[+]/, '');
  const num = parseFloat(cleanStr);
  
  if (isNaN(num)) return null;
  
  return num;
}
