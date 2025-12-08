import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE_URL = 'https://risefootballagency.com';
const defaultImage = 'https://risefootballagency.com/og-preview-home.png';

// Static OG image mappings for players with custom images
const playerOgImages: Record<string, string> = {
  'tyrese-omotoye': 'https://risefootballagency.com/og-tyrese-omotoye.png',
  'michael-vit-mulligan': 'https://risefootballagency.com/og-michael-vit-mulligan.png',
};

Deno.serve(async (req) => {
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

    // Convert slug to searchable name
    const searchName = playerSlug.replace(/-/g, ' ');
    
    // Fetch player from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: player, error } = await supabase
      .from('players')
      .select('name, position, nationality, club, image_url, age, bio')
      .ilike('name', searchName)
      .single();

    if (error) {
      console.error('Error fetching player:', error);
    }

    // Use database data or fallback to slug-derived name
    const playerName = player?.name || playerSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const position = player?.position || 'Professional Footballer';
    const nationality = player?.nationality || '';
    const club = player?.club || '';
    const age = player?.age || '';
    
    // Use custom OG image if available, otherwise use player image or default
    const ogImage = playerOgImages[playerSlug.toLowerCase()] || player?.image_url || defaultImage;
    const playerUrl = `${SITE_URL}/stars/${playerSlug}`;

    // Parse bio for additional info
    let currentClub = club;
    try {
      if (player?.bio) {
        const bioData = JSON.parse(player.bio);
        currentClub = bioData.currentClub || club;
      }
    } catch (e) {
      // Bio parsing failed, use club field
    }

    // Generate rich meta description
    const metaDescription = `${playerName} - ${position} from ${nationality}${currentClub ? ` currently at ${currentClub}` : ''}. Professional footballer represented by RISE Football Agency. Contact us for transfer enquiries.`;

    // Generate Schema.org structured data
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": playerName,
      "jobTitle": `Professional Football Player - ${position}`,
      "nationality": nationality ? { "@type": "Country", "name": nationality } : undefined,
      "image": ogImage,
      "url": playerUrl,
      "description": metaDescription,
      ...(currentClub && {
        "memberOf": { "@type": "SportsTeam", "name": currentClub }
      }),
      "knowsAbout": ["Football", "Soccer", position],
      "worksFor": {
        "@type": "Organization",
        "name": "RISE Football Agency",
        "url": SITE_URL
      }
    };

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${playerName} | ${position} | RISE Football Agency</title>
  <meta name="description" content="${metaDescription}">
  <link rel="canonical" href="${playerUrl}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="profile">
  <meta property="og:url" content="${playerUrl}">
  <meta property="og:title" content="${playerName} | ${position} | RISE Football Agency">
  <meta property="og:description" content="${metaDescription}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="RISE Football Agency">
  <meta property="profile:first_name" content="${playerName.split(' ')[0]}">
  <meta property="profile:last_name" content="${playerName.split(' ').slice(1).join(' ')}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@risefootball">
  <meta name="twitter:title" content="${playerName} | ${position} | RISE Football Agency">
  <meta name="twitter:description" content="${metaDescription}">
  <meta name="twitter:image" content="${ogImage}">
  
  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
${JSON.stringify(schemaData, null, 2)}
  </script>
  
  <meta http-equiv="refresh" content="0;url=${playerUrl}">
</head>
<body>
  <h1>${playerName}</h1>
  <p>${position}${nationality ? ` | ${nationality}` : ''}${currentClub ? ` | ${currentClub}` : ''}</p>
  <p>${metaDescription}</p>
  <a href="${playerUrl}">View Profile</a>
</body>
</html>`;

    console.log(`Generated OG page for player: ${playerName}`);

    return new Response(html, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: unknown) {
    console.error('OG Player error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
