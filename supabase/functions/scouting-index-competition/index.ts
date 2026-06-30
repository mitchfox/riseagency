import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as cheerio from 'npm:cheerio@1.0.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function ttlMs(active: boolean) {
  return active ? 12 * 60 * 60 * 1000 : 14 * 24 * 60 * 60 * 1000;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { competition_id, force } = await req.json();
    if (!competition_id) {
      return new Response(JSON.stringify({ error: 'competition_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: comp, error: compErr } = await admin.from('scouting_competitions').select('*').eq('id', competition_id).maybeSingle();
    if (compErr || !comp) throw new Error(compErr?.message || 'competition not found');

    const fresh = comp.last_indexed_at && (Date.now() - new Date(comp.last_indexed_at).getTime()) < ttlMs(comp.season_active);
    if (fresh && !force) {
      return new Response(JSON.stringify({ ok: true, skipped: 'cache fresh', last_indexed_at: comp.last_indexed_at }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const html = await fetch(comp.stats_url, { headers: { 'User-Agent': 'Mozilla/5.0 RiseScout/1.0' } }).then(r => r.text());
    const $ = cheerio.load(html);

    const players: Array<{ source_player_id: string; player_name: string; player_url: string; team: string | null; goals: number | null; minutes: number | null }> = [];
    const base = new URL(comp.stats_url);
    $('a[href*="/hraci/"], a[href*="/subjekt/"]').each((_i, el) => {
      const href = $(el).attr('href') || '';
      const name = $(el).text().trim();
      if (!name) return;
      const m = href.match(/(?:hraci|subjekt)\/([a-z0-9-]+)/i);
      if (!m) return;
      const url = new URL(href, base).toString();
      const row = $(el).closest('tr');
      const tds = row.find('td').map((_i, td) => $(td).text().trim()).get();
      const nums = tds.map((t) => Number((t.match(/-?\d+(\.\d+)?/) || [''])[0]));
      players.push({
        source_player_id: m[1],
        player_name: name,
        player_url: url,
        team: tds[1] || null,
        goals: Number.isFinite(nums[3]) ? nums[3] : null,
        minutes: Number.isFinite(nums[5]) ? nums[5] : null,
      });
    });

    // Dedupe by source_player_id
    const dedup = new Map(players.map(p => [p.source_player_id, p]));

    let inserted = 0;
    for (const p of dedup.values()) {
      const { data: existing } = await admin.from('scouting_players').select('id').eq('source', comp.source).eq('source_player_id', p.source_player_id).maybeSingle();
      let playerId = existing?.id;
      if (!playerId) {
        const { data: ins, error: insErr } = await admin.from('scouting_players').insert({
          source: comp.source,
          source_player_id: p.source_player_id,
          player_name: p.player_name,
          player_url: p.player_url,
        }).select('id').single();
        if (insErr) continue;
        playerId = ins.id;
      }
      await admin.from('scouting_player_stats').upsert({
        player_id: playerId,
        competition_id: comp.id,
        season: comp.season,
        team_name: p.team,
        age_group: comp.age_group,
        goals: p.goals,
        minutes: p.minutes,
        confidence: 'A',
        source_url: comp.stats_url,
        last_checked_at: new Date().toISOString(),
      }, { onConflict: 'player_id,competition_id,season' });
      inserted++;
    }

    await admin.from('scouting_competitions').update({ last_indexed_at: new Date().toISOString() }).eq('id', comp.id);

    return new Response(JSON.stringify({ ok: true, players: inserted }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});