import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Player OG image mappings
const playerOgImages: Record<string, string> = {
  'tyrese-omotoye': 'https://risefootballagency.com/og-tyrese-omotoye.png',
  'michael-vit-mulligan': 'https://risefootballagency.com/og-michael-vit-mulligan.png',
};

const defaultOgImage = 'https://storage.googleapis.com/gpt-engineer-file-uploads/blxFQX1QtlSc3qNcPxWdCZ730Tf1/social-images/social-1761325756417-RISE Mini Logos (1500 x 600 px) (16).png';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const playerSlug = url.searchParams.get('player');
    
    if (!playerSlug) {
      return new Response(JSON.stringify({ error: 'Player slug required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ogImage = playerOgImages[playerSlug.toLowerCase()] || defaultOgImage;
    const playerName = playerSlug.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    return new Response(JSON.stringify({ 
      ogImage,
      playerName,
      title: `${playerName} | RISE Football Agency`,
      description: `${playerName} - Professional football player represented by RISE Football Agency.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});