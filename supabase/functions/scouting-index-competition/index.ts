import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as cheerio from 'npm:cheerio@1.0.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SCRAPER_API_URL = Deno.env.get('SCRAPER_API_URL'); // e.g. https://app.scrapingbee.com/api/v1/
const SCRAPER_API_KEY = Deno.env.get('SCRAPER_API_KEY');

function ttlMs(active: boolean) {
  return active ? 12 * 60 * 60 * 1000 : 14 * 24 * 60 * 60 * 1000;
}

function looksLikeCloudflareChallenge(html: string) {
  return /Just a moment|cf_chl_opt|challenges\.cloudflare\.com|Enable JavaScript and cookies/i.test(html) && html.length < 50000;
}

async function fetchRendered(url: string): Promise<string> {
  // Direct attempt
  const direct = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8',
    },
  }).then(r => r.text()).catch(() => '');
  if (direct && !looksLikeCloudflareChallenge(direct)) return direct;

  // Fallback through a scraper service that handles Cloudflare + JS render
  if (SCRAPER_API_URL && SCRAPER_API_KEY) {
    // ScrapingBee-style: ?api_key=...&url=...&render_js=true&premium_proxy=true
    const u = new URL(SCRAPER_API_URL);
    u.searchParams.set('api_key', SCRAPER_API_KEY);
    u.searchParams.set('url', url);
    u.searchParams.set('render_js', 'true');
    u.searchParams.set('premium_proxy', 'true');
    u.searchParams.set('country_code', 'cz');
    const proxied = await fetch(u.toString()).then(r => r.text());
    if (proxied && !looksLikeCloudflareChallenge(proxied)) return proxied;
    throw new Error('Scraper service returned a Cloudflare challenge or empty body.');
  }

  throw new Error('Fotbal.cz is behind a Cloudflare bot challenge. Configure SCRAPER_API_URL + SCRAPER_API_KEY (ScrapingBee or similar with JS rendering + premium proxy) to fetch this page.');
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

    const html = await fetchRendered(comp.stats_url);
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