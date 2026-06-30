import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as cheerio from 'npm:cheerio@1.0.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function ttlMs(active: boolean) {
  return active ? 6 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { player_id, force } = await req.json();
    if (!player_id) {
      return new Response(JSON.stringify({ error: 'player_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: player, error } = await admin.from('scouting_players').select('*').eq('id', player_id).maybeSingle();
    if (error || !player) throw new Error(error?.message || 'player not found');
    if (!player.player_url) throw new Error('player has no profile url');

    const fresh = player.last_checked_at && (Date.now() - new Date(player.last_checked_at).getTime()) < ttlMs(true);
    if (fresh && !force) {
      return new Response(JSON.stringify({ ok: true, skipped: 'cache fresh' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const html = await fetch(player.player_url, { headers: { 'User-Agent': 'Mozilla/5.0 RiseScout/1.0' } }).then(r => r.text());
    const $ = cheerio.load(html);

    // Try to extract position from common Fotbal.cz profile markers
    let position: string | null = player.position;
    $('th,dt,strong').each((_i, el) => {
      const label = $(el).text().trim().toLowerCase();
      if (/post|pozice|position/.test(label)) {
        const val = $(el).next().text().trim() || $(el).parent().find('td,dd').first().text().trim();
        if (val && val.length < 40) position = val;
      }
    });

    // Find season/team/competition stats rows
    type Row = { season: string | null; team: string | null; competition: string | null; apps: number | null; minutes: number | null; goals: number | null };
    const rows: Row[] = [];
    $('table tr').each((_i, tr) => {
      const tds = $(tr).find('td').map((_j, td) => $(td).text().trim()).get();
      if (tds.length < 3) return;
      const seasonMatch = tds.find(t => /\d{4}\/\d{2,4}/.test(t));
      if (!seasonMatch) return;
      const nums = tds.map(t => {
        const m = t.replace(/\s/g, '').match(/-?\d+/);
        return m ? Number(m[0]) : null;
      });
      rows.push({
        season: seasonMatch,
        team: tds[1] || null,
        competition: tds[2] || null,
        apps: nums[3] ?? null,
        minutes: nums[4] ?? null,
        goals: nums[5] ?? null,
      });
    });

    let written = 0;
    for (const r of rows) {
      // Try to map to a known competition row by name + season
      let competition_id: string | null = null;
      if (r.competition) {
        const { data: comp } = await admin.from('scouting_competitions').select('id,age_group').ilike('name', `%${r.competition.slice(0, 30)}%`).limit(1).maybeSingle();
        if (comp) competition_id = comp.id;
      }
      await admin.from('scouting_player_stats').upsert({
        player_id: player.id,
        competition_id,
        season: r.season,
        team_name: r.team,
        appearances: r.apps,
        minutes: r.minutes,
        goals: r.goals,
        confidence: 'A',
        source_url: player.player_url,
        last_checked_at: new Date().toISOString(),
      }, { onConflict: 'player_id,competition_id,season' });
      written++;
    }

    await admin.from('scouting_players').update({
      position,
      last_checked_at: new Date().toISOString(),
    }).eq('id', player.id);

    return new Response(JSON.stringify({ ok: true, rows: written, position }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});