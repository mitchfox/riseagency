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

    // --- Player milestones ---
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
      .in('event_type', ['player_birthday', 'player_turning_18', 'player_contactable_age', 'fixture_countdown', 'program_expiring']);

    const alreadyNotified = new Set(
      (existingToday || []).map((event) => `${event.event_type}-${(event.event_data as any)?.player_key ?? (event.event_data as any)?.player_id ?? (event.event_data as any)?.fixture_id ?? (event.event_data as any)?.program_id}`)
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

    // --- Fixture countdown notifications (48h window) ---
    const in48h = new Date(today.getTime() + 48 * 60 * 60 * 1000);
    const { data: upcomingFixtures } = await supabase
      .from('fixtures')
      .select('id, home_team, away_team, match_date, match_time, competition, venue')
      .gte('match_date', todayStr)
      .lte('match_date', in48h.toISOString().split('T')[0])
      .order('match_date');

    for (const fixture of (upcomingFixtures || [])) {
      const matchDateTime = new Date(`${fixture.match_date}T${fixture.match_time || '15:00'}:00`);
      const hoursUntil = (matchDateTime.getTime() - today.getTime()) / (1000 * 60 * 60);

      if (hoursUntil > 0 && hoursUntil <= 48) {
        const key = `fixture_countdown-${fixture.id}`;
        if (!alreadyNotified.has(key)) {
          const hoursText = hoursUntil < 1 
            ? `${Math.round(hoursUntil * 60)} minutes`
            : `${Math.round(hoursUntil)} hours`;

          notifications.push({
            event_type: 'fixture_countdown',
            title: '⚽ Match Approaching',
            body: `${fixture.home_team} vs ${fixture.away_team} in ${hoursText}`,
            event_data: {
              fixture_id: fixture.id,
              home_team: fixture.home_team,
              away_team: fixture.away_team,
              match_date: fixture.match_date,
              match_time: fixture.match_time,
              competition: fixture.competition,
              venue: fixture.venue,
              hours_until: Math.round(hoursUntil),
            },
          });
        }
      }
    }

    // --- Program expiry notifications (1 week or less remaining) ---
    const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneWeekStr = oneWeekFromNow.toISOString().split('T')[0];

    const { data: expiringPrograms } = await supabase
      .from('player_programs')
      .select('id, player_id, program_name, end_date, is_current, players!player_programs_player_id_fkey(name)')
      .eq('is_current', true)
      .lte('end_date', oneWeekStr)
      .gte('end_date', todayStr);

    for (const program of (expiringPrograms || [])) {
      const key = `program_expiring-${program.id}`;
      if (!alreadyNotified.has(key)) {
        const endDate = new Date(program.end_date);
        const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const playerName = (program as any).players?.name || 'Unknown';

        notifications.push({
          event_type: 'program_expiring',
          title: '📋 Program Expiring Soon',
          body: `${playerName}'s "${program.program_name}" ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
          event_data: {
            program_id: program.id,
            player_id: program.player_id,
            player_name: playerName,
            program_name: program.program_name,
            end_date: program.end_date,
            days_remaining: daysLeft,
          },
        });
      }
    }

    // --- Auto-switch future programs that start today ---
    const { data: futurePrograms } = await supabase
      .from('player_programs')
      .select('id, player_id, program_name, start_date')
      .eq('is_current', false)
      .lte('start_date', todayStr)
      .gte('start_date', todayStr);

    for (const program of (futurePrograms || [])) {
      // Deactivate current programs for this player
      await supabase
        .from('player_programs')
        .update({ is_current: false })
        .eq('player_id', program.player_id)
        .eq('is_current', true);

      // Activate this program
      await supabase
        .from('player_programs')
        .update({ is_current: true })
        .eq('id', program.id);

      console.log(`[Player Milestones] Auto-activated program "${program.program_name}" for player ${program.player_id}`);
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
        fixtures_checked: (upcomingFixtures || []).length,
        programs_auto_switched: (futurePrograms || []).length,
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
