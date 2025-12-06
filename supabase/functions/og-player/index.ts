import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Player OG image mappings
const playerData: Record<string, { name: string; image: string }> = {
  'tyrese-omotoye': {
    name: 'Tyrese Omotoye',
    image: 'https://riseagency.lovable.app/og-tyrese-omotoye.png',
  },
  'michael-vit-mulligan': {
    name: 'Michael Vit Mulligan', 
    image: 'https://riseagency.lovable.app/og-michael-vit-mulligan.png',
  },
};

const defaultImage = 'https://storage.googleapis.com/gpt-engineer-file-uploads/blxFQX1QtlSc3qNcPxWdCZ730Tf1/social-images/social-1761325756417-RISE Mini Logos (1500 x 600 px) (16).png';

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

    const player = playerData[playerSlug.toLowerCase()];
    const playerName = player?.name || playerSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const ogImage = player?.image || defaultImage;
    const playerUrl = `https://riseagency.lovable.app/stars/${playerSlug}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${playerName} | RISE Football Agency</title>
  <meta name="description" content="${playerName} - Professional football player represented by RISE Football Agency.">
  
  <meta property="og:type" content="profile">
  <meta property="og:url" content="${playerUrl}">
  <meta property="og:title" content="${playerName} | RISE Football Agency">
  <meta property="og:description" content="${playerName} - Professional football player represented by RISE Football Agency.">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="RISE Football Agency">
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@risefootball">
  <meta name="twitter:title" content="${playerName} | RISE Football Agency">
  <meta name="twitter:description" content="${playerName} - Professional football player represented by RISE Football Agency.">
  <meta name="twitter:image" content="${ogImage}">
  
  <meta http-equiv="refresh" content="0;url=${playerUrl}">
</head>
<body>
  <h1>${playerName}</h1>
  <p>Professional football player represented by RISE Football Agency.</p>
  <a href="${playerUrl}">View Profile</a>
</body>
</html>`;

    return new Response(html, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});