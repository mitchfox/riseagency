import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlayerData {
  dateOfBirth?: string;
  age?: number;
  club?: string;
  clubLogo?: string;
}

async function scrapeTransfermarktPlayerData(playerName: string): Promise<PlayerData | null> {
  try {
    console.log('Searching Transfermarkt for player:', playerName);
    
    // Format name for URL search
    const searchName = playerName.toLowerCase().replace(/\s+/g, '-');
    const searchUrl = `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(playerName)}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch search page:', response.status);
      return null;
    }

    const html = await response.text();
    
    // Extract player profile URL from search results
    const profileMatch = html.match(/href="(\/[^"]+\/profil\/spieler\/\d+)"/);
    if (!profileMatch) {
      console.log('No profile found for player:', playerName);
      return null;
    }

    const profileUrl = `https://www.transfermarkt.com${profileMatch[1]}`;
    console.log('Found profile URL:', profileUrl);

    // Fetch player profile page
    const profileResponse = await fetch(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!profileResponse.ok) {
      console.error('Failed to fetch profile page:', profileResponse.status);
      return null;
    }

    const profileHtml = await profileResponse.text();
    const data: PlayerData = {};

    // Extract date of birth
    const dobMatch = profileHtml.match(/Date of birth\/Age:<\/span>\s*<span[^>]*>.*?(\d{1,2}\/\d{1,2}\/\d{4})\s*\((\d+)\)/);
    if (dobMatch) {
      const [_, dateStr, ageStr] = dobMatch;
      data.dateOfBirth = dateStr;
      data.age = parseInt(ageStr);
      console.log('Extracted DOB:', data.dateOfBirth, 'Age:', data.age);
    }

    // Extract current club
    const clubMatch = profileHtml.match(/<span[^>]*class="[^"]*hauptpunkt[^"]*"[^>]*>\s*<a[^>]*href="\/[^"]+\/startseite\/verein\/\d+"[^>]*>([^<]+)<\/a>/);
    if (clubMatch) {
      data.club = clubMatch[1].trim();
      console.log('Extracted club:', data.club);
    }

    // Extract club logo
    const clubLogoMatch = profileHtml.match(/<img[^>]*class="[^"]*wappen[^"]*"[^>]*src="([^"]+)"/);
    if (clubLogoMatch) {
      data.clubLogo = clubLogoMatch[1];
      console.log('Extracted club logo:', data.clubLogo);
    }

    return data;
  } catch (error) {
    console.error('Error scraping Transfermarkt:', error);
    return null;
  }
}

function calculateAge(dateOfBirth: string): number {
  // Expects format MM/DD/YYYY
  const [month, day, year] = dateOfBirth.split('/').map(Number);
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { playerId, playerName } = await req.json();

    if (!playerId || !playerName) {
      return new Response(
        JSON.stringify({ error: 'Player ID and name are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Updating data for player:', playerName, 'ID:', playerId);

    // Scrape the data
    const data = await scrapeTransfermarktPlayerData(playerName);

    if (!data || Object.keys(data).length === 0) {
      console.error('No data scraped for player');
      return new Response(
        JSON.stringify({ error: 'Failed to scrape data from Transfermarkt' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Prepare update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (data.age) {
      updateData.age = data.age;
    }

    if (data.club) {
      updateData.club = data.club;
    }

    if (data.clubLogo) {
      updateData.club_logo = data.clubLogo;
    }

    // Update the players table
    const { data: updateResult, error } = await supabase
      .from('players')
      .update(updateData)
      .eq('id', playerId)
      .select();

    if (error) {
      console.error('Error updating player data:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to update player data in database', details: error }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Player data updated successfully:', updateResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Player data updated successfully',
        data: data,
        updated_at: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
