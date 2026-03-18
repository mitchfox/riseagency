import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type PlayerMilestoneCandidate = {
  id: string;
  name: string;
  date_of_birth: string;
  current_club: string | null;
  nationality: string | null;
  created_at?: string | null;
  player_type: 'scouting' | 'youth' | 'pro';
  player_key: string;
};

const buildPlayerKey = (name: string, dateOfBirth: string) => `${name.trim().toLowerCase()}::${dateOfBirth}`;

/**
 * Check for Player Database milestones daily:
 * 1. Players reaching contactable age (based on recruitment_age_rules)
 * 2. Players turning 18
 * 3. Player birthdays (today)
 *
 * Sources mirror the Player Database: scouting_reports,
 * player_outreach_youth and player_outreach_pro.
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

    const [scoutingResult, youthResult, proResult] = await Promise.all([
      supabase.from('scouting_reports').select('id, player_name, date_of_birth, current_club, nationality, created_at'),
      supabase.from('player_outreach_youth').select('id, player_name, date_of_birth, current_club, nationality, created_at'),
      supabase.from('player_outreach_pro').select('id, player_name, date_of_birth, current_club, nationality, created_at'),
    ]);

    if (scoutingResult.error) throw scoutingResult.error;
    if (youthResult.error) throw youthResult.error;
    if (proResult.error) throw proResult.error;

    const rawPlayers: PlayerMilestoneCandidate[] = [
      ...(scoutingResult.data || []).flatMap((player) => {
        if (!player.date_of_birth || !player.player_name) return [];
        return [{
          id: player.id,
          name: player.player_name,
          date_of_birth: player.date_of_birth,
          current_club: player.current_club,
          nationality: player.nationality,
          created_at: player.created_at,
          player_type: 'scouting' as const,
          player_key: buildPlayerKey(player.player_name, player.date_of_birth),
        }];
      }),
      ...(youthResult.data || []).flatMap((player) => {
        if (!player.date_of_birth || !player.player_name) return [];
        return [{
          id: player.id,
          name: player.player_name,
          date_of_birth: player.date_of_birth,
          current_club: player.current_club,
          nationality: player.nationality,
          created_at: player.created_at,
          player_type: 'youth' as const,
          player_key: buildPlayerKey(player.player_name, player.date_of_birth),
        }];
      }),
      ...(proResult.data || []).flatMap((player) => {
        if (!player.date_of_birth || !player.player_name) return [];
        return [{
          id: player.id,
          name: player.player_name,
          date_of_birth: player.date_of_birth,
          current_club: player.current_club,
          nationality: player.nationality,
          created_at: player.created_at,
          player_type: 'pro' as const,
          player_key: buildPlayerKey(player.player_name, player.date_of_birth),
        }];
      }),
    ];

    const uniquePlayersMap = new Map<string, PlayerMilestoneCandidate>();
    for (const player of rawPlayers) {
      const existing = uniquePlayersMap.get(player.player_key);
      if (!existing) {
        uniquePlayersMap.set(player.player_key, player);
        continue;
      }

      const existingCreatedAt = existing.created_at ? new Date(existing.created_at).getTime() : 0;
      const nextCreatedAt = player.created_at ? new Date(player.created_at).getTime() : 0;

      if (nextCreatedAt >= existingCreatedAt) {
        uniquePlayersMap.set(player.player_key, {
          ...existing,
          ...player,
          current_club: player.current_club || existing.current_club,
          nationality: player.nationality || existing.nationality,
        });
      }
    }

    const players = Array.from(uniquePlayersMap.values());

    if (players.length === 0) {
      return new Response(JSON.stringify({ message: 'No player database records with date_of_birth found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: ageRules } = await supabase
      .from('recruitment_age_rules')
      .select('country, min_contact_age');

    const { data: clubCountries } = await supabase
      .from('club_map_positions')
      .select('club_name, country');

    const { data: existingToday } = await supabase
      .from('staff_notification_events')
      .select('event_type, event_data')
      .gte('created_at', `${todayStr}T00:00:00Z`)
      .in('event_type', ['player_birthday', 'player_turning_18', 'player_contactable_age']);

    const alreadyNotified = new Set(
      (existingToday || []).map((event) => `${event.event_type}-${(event.event_data as any)?.player_key ?? (event.event_data as any)?.player_id}`)
    );

    const notifications: Array<{
      event_type: string;
      title: string;
      body: string;
      event_data: Record<string, unknown>;
    }> = [];

    for (const player of players) {
      const dob = new Date(player.date_of_birth);
      if (Number.isNaN(dob.getTime())) continue;

      const dobMonth = dob.getMonth() + 1;
      const dobDay = dob.getDate();

      let age = today.getFullYear() - dob.getFullYear();
      const monthDelta = today.getMonth() - dob.getMonth();
      if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) {
        age--;
      }

      if (dobMonth === todayMonth && dobDay === todayDay) {
        const key = `player_birthday-${player.player_key}`;
        if (!alreadyNotified.has(key)) {
          notifications.push({
            event_type: 'player_birthday',
            title: '🎂 Player Birthday',
            body: `${player.name} turns ${age} today!`,
            event_data: {
              player_id: player.id,
              player_key: player.player_key,
              player_name: player.name,
              age,
              club: player.current_club,
              source: player.player_type,
              date_of_birth: player.date_of_birth,
            },
          });
        }
      }

      if (dobMonth === todayMonth && dobDay === todayDay && age === 18) {
        const key = `player_turning_18-${player.player_key}`;
        if (!alreadyNotified.has(key)) {
          notifications.push({
            event_type: 'player_turning_18',
            title: '⭐ Player Turning 18',
            body: `${player.name} turns 18 today - now eligible as a Pro!`,
            event_data: {
              player_id: player.id,
              player_key: player.player_key,
              player_name: player.name,
              club: player.current_club,
              source: player.player_type,
              date_of_birth: player.date_of_birth,
            },
          });
        }
      }

      if (player.current_club && clubCountries && ageRules) {
        const clubEntry = clubCountries.find(
          (club: any) => club.club_name?.toLowerCase() === player.current_club?.toLowerCase()
        );

        if (clubEntry?.country) {
          const rule = ageRules.find(
            (ageRule: any) => ageRule.country?.toLowerCase() === clubEntry.country?.toLowerCase()
          );

          if (rule?.min_contact_age != null) {
            const diffMs = today.getTime() - dob.getTime();
            const preciseAge = diffMs / (365.25 * 24 * 60 * 60 * 1000);

            const yesterdayMs = today.getTime() - 86400000;
            const preciseAgeYesterday = (yesterdayMs - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

            if (preciseAge >= rule.min_contact_age && preciseAgeYesterday < rule.min_contact_age) {
              const key = `player_contactable_age-${player.player_key}`;
              if (!alreadyNotified.has(key)) {
                notifications.push({
                  event_type: 'player_contactable_age',
                  title: '✅ Player Now Contactable',
                  body: `${player.name} has reached contactable age (${rule.min_contact_age}) in ${clubEntry.country}`,
                  event_data: {
                    player_id: player.id,
                    player_key: player.player_key,
                    player_name: player.name,
                    club: player.current_club,
                    country: clubEntry.country,
                    min_contact_age: rule.min_contact_age,
                    source: player.player_type,
                    date_of_birth: player.date_of_birth,
                  },
                });
              }
            }
          }
        }
      }
    }

    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from('staff_notification_events')
        .insert(notifications);

      if (insertError) throw insertError;
    }

    console.log(`[Player Milestones] Created ${notifications.length} notifications from ${players.length} unique player database records checked`);

    return new Response(
      JSON.stringify({
        success: true,
        players_checked: players.length,
        notifications_created: notifications.length,
        details: notifications.map((notification) => notification.body),
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
