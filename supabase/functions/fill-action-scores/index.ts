import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActionToScore {
  action_type: string;
  action_description: string;
}

// Normalize text for fuzzy matching
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Calculate simple word overlap similarity
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(normalizeText(text1).split(' '));
  const words2 = new Set(normalizeText(text2).split(' '));
  
  let matches = 0;
  for (const word of words1) {
    if (words2.has(word)) matches++;
  }
  
  const maxWords = Math.max(words1.size, words2.size);
  return maxWords > 0 ? matches / maxWords : 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { actions } = await req.json() as { actions: ActionToScore[] };
    
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No actions provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all R90 ratings from database
    const { data: ratings, error: ratingsError } = await supabase
      .from('r90_ratings')
      .select('id, title, description, content, category, subcategory, score');

    if (ratingsError) {
      console.error('Error fetching R90 ratings:', ratingsError);
      throw new Error('Failed to fetch R90 ratings');
    }

    console.log(`Fetched ${ratings?.length || 0} R90 ratings for direct lookup`);

    // Process each action with direct lookup
    const scoredActions = [];
    
    for (const action of actions) {
      try {
        const actionText = `${action.action_type} ${action.action_description}`.toLowerCase();
        
        let bestMatch = null;
        let bestScore = 0;
        
        // Find best matching rating using direct text comparison
        for (const rating of ratings || []) {
          // Build search text from rating fields
          const ratingText = [
            rating.title || '',
            rating.category || '',
            rating.subcategory || '',
            rating.description || '',
          ].join(' ').toLowerCase();
          
          // Check for exact action type match in title/category first
          const actionTypeNormalized = normalizeText(action.action_type);
          const titleNormalized = normalizeText(rating.title || '');
          const categoryNormalized = normalizeText(rating.category || '');
          
          // Prioritize exact matches
          if (titleNormalized.includes(actionTypeNormalized) || 
              actionTypeNormalized.includes(titleNormalized)) {
            const similarity = calculateSimilarity(actionText, ratingText);
            if (similarity > bestScore || (rating.score !== null && bestMatch?.score === null)) {
              bestScore = similarity;
              bestMatch = rating;
            }
          } else if (categoryNormalized.includes(actionTypeNormalized)) {
            // Category match is secondary
            const similarity = calculateSimilarity(actionText, ratingText) * 0.8;
            if (similarity > bestScore) {
              bestScore = similarity;
              bestMatch = rating;
            }
          } else {
            // General similarity match
            const similarity = calculateSimilarity(actionText, ratingText) * 0.6;
            if (similarity > bestScore) {
              bestScore = similarity;
              bestMatch = rating;
            }
          }
        }
        
        if (bestMatch && bestMatch.score !== null && bestMatch.score !== undefined) {
          console.log(`Action: "${action.action_type}" -> Matched: "${bestMatch.title}" -> Score: ${bestMatch.score}`);
          scoredActions.push({ score: bestMatch.score, matchedTitle: bestMatch.title });
        } else {
          console.log(`Action: "${action.action_type}" -> No match found, score: 0`);
          scoredActions.push({ score: 0, matchedTitle: null });
        }
        
      } catch (actionError) {
        console.error('Error processing action:', actionError);
        scoredActions.push({ score: 0, error: 'Processing failed' });
      }
    }

    return new Response(
      JSON.stringify({ scores: scoredActions }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in fill-action-scores function:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to score actions', scores: [] }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
