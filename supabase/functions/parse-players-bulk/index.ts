import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageInput { base64: string; mimeType?: string }

const SYSTEM_PROMPT = `You are a football scouting assistant. Extract a list of football players from the supplied text and/or screenshots. For each player infer the most likely values for: name, position (use short codes like GK, CB, LB, RB, CDM, CM, CAM, RW, LW, CF, ST), nationality (country name in English), date_of_birth (YYYY-MM-DD if visible, otherwise null), age (integer if visible, otherwise null), club, league, instagram_handle (without @), notes (short free-form text with anything else useful).

Rules:
- Use UK English.
- Never invent a date of birth, club or league if not present in the source or supplied context; leave null.
- Position must be a recognised football abbreviation.
- If the screenshot is a formation graphic, infer positions from the player's spatial role even when no position label is printed. Read the pitch like a football line-up: keeper closest to goal, centre backs central in the defensive line, full backs wide, holding midfielders behind central/attacking midfielders, wingers wide high, striker/centre forward highest central.
- If a formation is shown, map each name to the nearest football role from that formation instead of returning null positions.
- If a club, team, age group, competition or league header is visible, apply that context to every player it clearly belongs to.
- Extract dates of birth from any visible DOB/birth/date column or player card and normalise formats like DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY or Month-name dates to YYYY-MM-DD.
- If a row clearly isn't a player (e.g. header, total), skip it.
- Return STRICT JSON only, matching the schema. No prose, no code fences.

Schema: { "players": [ { "name": string, "position": string|null, "nationality": string|null, "date_of_birth": string|null, "age": number|null, "club": string|null, "league": string|null, "instagram_handle": string|null, "notes": string|null } ] }`;

const cleanName = (value: unknown) => String(value || '').trim().replace(/\s+/g, ' ');
const normName = (value: unknown) => cleanName(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const hasValue = (value: unknown) => value !== null && value !== undefined && String(value).trim() !== '';

const mergePlayer = (player: any, match: any) => {
  if (!match) return player;
  const next = { ...player };
  if (!hasValue(next.position) && hasValue(match.position)) next.position = match.position;
  if (!hasValue(next.nationality) && hasValue(match.nationality)) next.nationality = match.nationality;
  if (!hasValue(next.date_of_birth) && hasValue(match.date_of_birth)) next.date_of_birth = match.date_of_birth;
  if (!hasValue(next.age) && hasValue(match.age)) next.age = match.age;
  if (!hasValue(next.club) && hasValue(match.club)) next.club = match.club;
  if (!hasValue(next.league) && hasValue(match.league)) next.league = match.league;
  if (!hasValue(next.instagram_handle) && hasValue(match.instagram_handle)) next.instagram_handle = match.instagram_handle;
  if (!hasValue(next.notes) && hasValue(match.notes)) next.notes = match.notes;
  return next;
};

const findExistingPlayer = async (supabase: any, rawName: string) => {
  const name = cleanName(rawName);
  if (!name) return null;

  const queries = await Promise.allSettled([
    supabase.from('players').select('*').ilike('name', name).limit(3),
    supabase.from('scouting_reports').select('*').ilike('player_name', name).order('created_at', { ascending: false }).limit(3),
    supabase.from('player_outreach_youth').select('*').ilike('player_name', name).order('created_at', { ascending: false }).limit(3),
    supabase.from('player_outreach_pro').select('*').ilike('player_name', name).order('created_at', { ascending: false }).limit(3),
  ]);

  const rows = queries.flatMap((result) => {
    if (result.status !== 'fulfilled' || result.value.error) return [];
    return result.value.data || [];
  });

  const target = normName(name);
  const exact = rows.find((row: any) => normName(row.name || row.player_name) === target) || rows[0];
  if (!exact) return null;

  return {
    position: exact.position ?? null,
    nationality: exact.nationality ?? null,
    date_of_birth: exact.date_of_birth ?? null,
    age: exact.age ?? null,
    club: exact.club ?? exact.current_club ?? null,
    league: exact.league ?? exact.current_league ?? exact.competition ?? null,
    instagram_handle: exact.instagram_handle ?? exact.ig_handle ?? null,
    notes: exact.notes ?? exact.bio ?? null,
  };
};

const TM_API = 'https://tmapi-alpha.transfermarkt.technology';
const TM_UA = 'Mozilla/5.0 (compatible; RiseBot/1.0)';
const compNameCache = new Map<string, string>();
const clubInfoCache = new Map<string, { club: string | null; competitionId: string | null }>();

const searchTransfermarktId = async (name: string): Promise<string | null> => {
  try {
    const q = encodeURIComponent(name);
    const res = await fetch(`https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${q}`, {
      headers: { 'User-Agent': TM_UA, 'Accept-Language': 'en' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/\/[a-z0-9-]+\/profil\/spieler\/(\d+)/i);
    return m ? m[1] : null;
  } catch { return null; }
};

const fetchTmPlayer = async (id: string): Promise<any | null> => {
  try {
    const r = await fetch(`${TM_API}/player/${id}`);
    if (!r.ok) return null;
    const j = await r.json();
    return j?.data || null;
  } catch { return null; }
};

const fetchTmClubInfo = async (clubId: string) => {
  if (clubInfoCache.has(clubId)) return clubInfoCache.get(clubId)!;
  let info = { club: null as string | null, competitionId: null as string | null };
  try {
    const r = await fetch(`${TM_API}/club/${clubId}`);
    if (r.ok) {
      const j = await r.json();
      info = {
        club: j?.data?.name ?? null,
        competitionId: j?.data?.baseDetails?.primaryCompetitionId ?? null,
      };
    }
  } catch { /* ignore */ }
  clubInfoCache.set(clubId, info);
  return info;
};

const fetchTmCompetitionName = async (compId: string): Promise<string | null> => {
  if (compNameCache.has(compId)) return compNameCache.get(compId)!;
  let name: string | null = null;
  try {
    const r = await fetch(`${TM_API}/competition/${compId}`);
    if (r.ok) {
      const j = await r.json();
      name = j?.data?.name ?? null;
    }
  } catch { /* ignore */ }
  compNameCache.set(compId, name as any);
  return name;
};

const enrichFromTransfermarkt = async (player: any): Promise<any> => {
  // Only do work when something material is missing
  const needsClub = !hasValue(player.club);
  const needsLeague = !hasValue(player.league);
  const needsDob = !hasValue(player.date_of_birth);
  const needsNat = !hasValue(player.nationality);
  const needsPos = !hasValue(player.position);
  if (!needsClub && !needsLeague && !needsDob && !needsNat && !needsPos) return player;

  const name = cleanName(player?.name);
  if (!name) return player;
  const tmId = await searchTransfermarktId(name);
  if (!tmId) return player;
  const data = await fetchTmPlayer(tmId);
  if (!data) return player;

  const next = { ...player };
  const dob = data?.lifeDates?.dateOfBirth ?? null;
  if (needsDob && dob) next.date_of_birth = dob;
  if (!hasValue(next.age) && data?.lifeDates?.age) next.age = data.lifeDates.age;

  const posShort = data?.attributes?.position?.shortName ?? null;
  if (needsPos && posShort) next.position = posShort;

  // Nationality: use NATIONALITY_NAMES if we can — but parse-players-bulk doesn't have the map.
  // Skip to avoid wrong country names.

  const current = (data?.clubAssignments || []).find((a: any) => a?.type === 'current');
  if (current?.clubId) {
    const club = await fetchTmClubInfo(String(current.clubId));
    if (needsClub && club.club) next.club = club.club;
    if (needsLeague && club.competitionId) {
      const compName = await fetchTmCompetitionName(club.competitionId);
      if (compName) next.league = compName;
    }
  }

  return next;
};

const runWithConcurrency = async <T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      results[idx] = await worker(items[idx]);
    }
  });
  await Promise.all(runners);
  return results;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { text, images, instruction } = await req.json() as { text?: string; images?: ImageInput[]; instruction?: string };
    if (!text && (!images || images.length === 0)) {
      return new Response(JSON.stringify({ error: 'Provide text or images' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const content: any[] = [];
    const userText = [
      instruction ? `Extra instruction: ${instruction}` : '',
      text ? `Source text:\n${text}` : '',
      'Image checklist: read formation layout, player cards, table headings, club badges/text, competition labels, league names, age-group labels and DOB/date columns before returning.',
      'Extract every distinct player you can identify and return ONLY the JSON object.',
    ].filter(Boolean).join('\n\n');
    content.push({ type: 'text', text: userText });
    for (const img of (images || [])) {
      content.push({ type: 'image_url', image_url: { url: `data:${img.mimeType || 'image/png'};base64,${img.base64}` } });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gateway error', response.status, errText);
      if (response.status === 429) return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again shortly.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402) return new Response(JSON.stringify({ error: 'AI credits depleted. Top up to continue.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ error: 'AI parse failed', detail: errText.slice(0, 500) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { players: [] }; }
    const rawPlayers = Array.isArray(parsed.players) ? parsed.players : [];
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    let players = rawPlayers;

    if (supabaseUrl && serviceKey && rawPlayers.length) {
      const supabase = createClient(supabaseUrl, serviceKey);
      players = await Promise.all(rawPlayers.map(async (player: any) => {
        const existing = await findExistingPlayer(supabase, player?.name);
        return mergePlayer(player, existing);
      }));
    }

    // Web enrichment: fill missing club/league/DOB/position by looking the
    // player up on Transfermarkt. Existing values are never overwritten.
    if (players.length) {
      try {
        players = await runWithConcurrency(players, 4, enrichFromTransfermarkt);
      } catch (err) {
        console.error('TM enrichment failed', err);
      }
    }

    return new Response(JSON.stringify({ players }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('parse-players-bulk error', e);
    return new Response(JSON.stringify({ error: (e as Error).message || 'Failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});