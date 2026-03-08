import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Check for player milestones daily:
 * 1. Players reaching contactable age (based on recruitment_age_rules)
 * 2. Players turning 18
 * 3. Player birthdays (today)
 * 
 * Sources: player_outreach_youth, player_outreach_pro (have date_of_birth column),
 *          and main players table (date_of_birth column OR bio JSON dateOfBirth field)
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    // Fetch all players from outreach tables AND the main players table
    const [youthResult, proResult, mainPlayersResult] = await Promise.all([
      supabase.from('player_outreach_youth').select('id, player_name, date_of_birth, current_club, nationality'),
      supabase.from('player_outreach_pro').select('id, player_name, date_of_birth, current_club, nationality'),
      supabase.from('players').select('id, name, date_of_birth, club, nationality, bio'),
    ]);

    const youthPlayers = (youthResult.data || []).map(p => ({ ...p, name: p.player_name, current_club: p.current_club, player_type: 'youth' }));
    const proPlayers = (proResult.data || []).map(p => ({ ...p, name: p.player_name, current_club: p.current_club, player_type: 'pro' }));
    
    // For main players, try date_of_birth column first, then fall back to bio JSON
    const mainPlayers = (mainPlayersResult.data || []).map(p => {
      let dob = p.date_of_birth;
      if (!dob && p.bio) {
        try {
          const bioData = typeof p.bio === 'string' ? JSON.parse(p.bio) : p.bio;
          if (bioData?.dateOfBirth) {
            dob = bioData.dateOfBirth;
          }
        } catch {
          // ignore parse errors
        }
      }
      return { ...p, date_of_birth: dob, current_club: p.club, player_type: 'main' };
    });
    
    const players = [...youthPlayers, ...proPlayers, ...mainPlayers].filter(p => p.date_of_birth);

    if (players.length === 0) {
      return new Response(JSON.stringify({ message: 'No players with date_of_birth found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch age rules for contactable age checks
    const { data: ageRules } = await supabase
      .from('recruitment_age_rules')
      .select('country, min_contact_age');

    // Fetch club countries for mapping
    const { data: clubCountries } = await supabase
      .from('club_map_positions')
      .select('club_name, country');

    // Check what we already notified about today to avoid duplicates
    const { data: existingToday } = await supabase
      .from('staff_notification_events')
      .select('event_type, event_data')
      .gte('created_at', `${todayStr}T00:00:00Z`)
      .in('event_type', ['player_birthday', 'player_turning_18', 'player_contactable_age']);

    const alreadyNotified = new Set(
      (existingToday || []).map(e => `${e.event_type}-${(e.event_data as any)?.player_id}`)
    );

    const notifications: Array<{
      event_type: string;
      title: string;
      body: string;
      event_data: Record<string, unknown>;
    }> = [];

    for (const player of players) {
      if (!player.date_of_birth) continue;

      const dob = new Date(player.date_of_birth);
      if (isNaN(dob.getTime())) continue; // Skip invalid dates
      
      const dobMonth = dob.getMonth() + 1;
      const dobDay = dob.getDate();

      // Calculate age
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }

      // 1. Birthday check (same month and day)
      if (dobMonth === todayMonth && dobDay === todayDay) {
        const key = `player_birthday-${player.id}`;
        if (!alreadyNotified.has(key)) {
          notifications.push({
            event_type: 'player_birthday',
            title: '🎂 Player Birthday',
            body: `${player.name} turns ${age} today!`,
            event_data: {
              player_id: player.id,
              player_name: player.name,
              age,
              club: player.current_club,
            },
          });
        }
      }

      // 2. Turning 18 check (birthday today and age is exactly 18)
      if (dobMonth === todayMonth && dobDay === todayDay && age === 18) {
        const key = `player_turning_18-${player.id}`;
        if (!alreadyNotified.has(key)) {
          notifications.push({
            event_type: 'player_turning_18',
            title: '⭐ Player Turning 18',
            body: `${player.name} turns 18 today — now eligible as a Pro!`,
            event_data: {
              player_id: player.id,
              player_name: player.name,
              club: player.current_club,
            },
          });
        }
      }

      // 3. Contactable age check
      if (player.current_club && clubCountries && ageRules) {
        const clubEntry = clubCountries.find(
          (c: any) => c.club_name?.toLowerCase() === player.current_club?.toLowerCase()
        );
        if (clubEntry?.country) {
          const rule = ageRules.find(
            (r: any) => r.country?.toLowerCase() === clubEntry.country?.toLowerCase()
          );
          if (rule?.min_contact_age != null) {
            const diffMs = today.getTime() - dob.getTime();
            const preciseAge = diffMs / (365.25 * 24 * 60 * 60 * 1000);

            const yesterdayMs = today.getTime() - 86400000;
            const preciseAgeYesterday = (yesterdayMs - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

            if (preciseAge >= rule.min_contact_age && preciseAgeYesterday < rule.min_contact_age) {
              const key = `player_contactable_age-${player.id}`;
              if (!alreadyNotified.has(key)) {
                notifications.push({
                  event_type: 'player_contactable_age',
                  title: '✅ Player Now Contactable',
                  body: `${player.name} has reached contactable age (${rule.min_contact_age}) in ${clubEntry.country}`,
                  event_data: {
                    player_id: player.id,
                    player_name: player.name,
                    club: player.current_club,
                    country: clubEntry.country,
                    min_contact_age: rule.min_contact_age,
                  },
                });
              }
            }
          }
        }
      }
    }

    // Insert all notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from('staff_notification_events')
        .insert(notifications);

      if (insertError) throw insertError;
    }

    console.log(`[Player Milestones] Created ${notifications.length} notifications from ${players.length} players checked`);

    return new Response(
      JSON.stringify({
        success: true,
        players_checked: players.length,
        notifications_created: notifications.length,
        details: notifications.map(n => n.body),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Player Milestones] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to check player milestones' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
