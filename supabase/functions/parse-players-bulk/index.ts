import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageInput { base64: string; mimeType?: string }

const SYSTEM_PROMPT = `You are a football scouting assistant. Extract a list of football players from the supplied text and/or screenshots. For each player infer the most likely values for: name, position (use short codes like GK, CB, LB, RB, CDM, CM, CAM, RW, LW, CF, ST), nationality (country name in English), date_of_birth (YYYY-MM-DD if visible, otherwise null), age (integer if visible, otherwise null), club, league, instagram_handle (without @), shirt_number (integer if visible, otherwise null), team_side ("left" or "right" if the image shows two teams, otherwise null), name_is_stub (true if the label is only an initial + surname like "B. Szywała", otherwise false), notes (short free-form text with anything else useful).

Rules:
- Use UK English.
- Never invent a date of birth, club or league if not present in the source or supplied context; leave null.
- Position must be a recognised football abbreviation.
- If the screenshot is a formation graphic, ALWAYS infer positions from each player's spatial role even when no position label is printed. Read the pitch like a football line-up: keeper closest to goal, centre backs central in the defensive line, full backs wide, holding midfielders behind central/attacking midfielders, wingers wide high, striker/centre forward highest central. Position must never be null when a formation is visible.
- Formation graphics often show TWO teams split by a vertical halfway line. Treat each half as its own team: names on the left half are team_side "left", names on the right half are team_side "right". Each team has its own goalkeeper, defence, midfield and attack — do not merge them.
- If a club, team, age group, competition or league header is visible, apply that context to every player it clearly belongs to.
- Extract dates of birth from any visible DOB/birth/date column or player card and normalise formats like DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY or Month-name dates to YYYY-MM-DD.
- Capture shirt numbers when shown next to the name (e.g. "10 B. Szywała" → shirt_number 10).
- When a label is just an initial + surname (e.g. "B. Szywała", "(c) K. Cecuła", "Š. Žužić"), set name_is_stub = true and keep the surname intact with diacritics. Strip captain markers like "(c)" from the name itself but keep them in notes.
- If a row clearly isn't a player (e.g. header, total), skip it.
- Return STRICT JSON only, matching the schema. No prose, no code fences.

Schema: { "players": [ { "name": string, "position": string|null, "nationality": string|null, "date_of_birth": string|null, "age": number|null, "club": string|null, "league": string|null, "instagram_handle": string|null, "shirt_number": number|null, "team_side": string|null, "name_is_stub": boolean, "notes": string|null } ] }`;

const NATIONALITY_NAMES: Record<number, string> = {
  189: 'England', 190: 'Scotland', 191: 'Wales', 192: 'Northern Ireland',
  193: 'Republic of Ireland', 50: 'France', 157: 'Spain', 40: 'Germany',
  75: 'Italy', 122: 'Netherlands', 136: 'Portugal', 24: 'Brazil',
  9: 'Argentina', 125: 'Nigeria', 152: 'Senegal', 54: 'Ghana',
  31: 'Cameroon', 68: 'Jamaica', 185: 'USA', 32: 'Canada',
  14: 'Australia', 39: 'Belgium', 10: 'Armenia', 15: 'Austria',
  22: 'Bosnia-Herzegovina', 25: 'Bulgaria', 34: 'Chile', 36: 'Colombia',
  37: 'Costa Rica', 38: 'Croatia', 41: 'Czech Republic', 42: 'Denmark',
  43: 'Ecuador', 44: 'Egypt', 46: 'Estonia', 48: 'Finland',
  51: 'Gabon', 55: 'Greece', 57: 'Guinea', 59: 'Honduras',
  60: 'Hungary', 62: 'Iceland', 63: 'Iran', 64: 'Iraq',
  66: 'Ivory Coast', 67: 'Japan', 69: 'South Korea', 70: 'Kosovo',
  72: 'Latvia', 76: 'Lithuania', 78: 'Luxembourg', 80: 'Mali',
  84: 'Mexico', 86: 'Montenegro', 87: 'Morocco', 95: 'New Zealand',
  100: 'Norway', 107: 'Paraguay', 108: 'Peru', 110: 'Poland',
  113: 'DR Congo', 114: 'Romania', 115: 'Russia', 120: 'Serbia',
  126: 'Slovakia', 127: 'Slovenia', 128: 'South Africa', 140: 'Sweden',
  141: 'Switzerland', 160: 'Tunisia', 161: 'Turkey', 163: 'Ukraine',
  170: 'Uruguay', 171: 'Uzbekistan', 172: 'Venezuela', 176: 'Zimbabwe',
  52: 'Georgia', 11: 'Azerbaijan', 4: 'Albania', 79: 'Malta',
  1: 'Afghanistan', 82: 'Moldova', 83: 'North Macedonia',
};

const POSITION_FAMILY: Record<string, 'GK' | 'DEF' | 'MID' | 'FWD'> = {
  GK: 'GK',
  CB: 'DEF', LB: 'DEF', RB: 'DEF', LWB: 'DEF', RWB: 'DEF',
  CDM: 'MID', CM: 'MID', CAM: 'MID', DM: 'MID', AM: 'MID',
  LM: 'MID', RM: 'MID',
  LW: 'FWD', RW: 'FWD', CF: 'FWD', ST: 'FWD', SS: 'FWD',
};
const TM_POSITION_TO_SHORT: Record<string, string> = {
  'Goalkeeper': 'GK',
  'Centre-Back': 'CB', 'Left-Back': 'LB', 'Right-Back': 'RB',
  'Defensive Midfield': 'CDM', 'Central Midfield': 'CM', 'Attacking Midfield': 'CAM',
  'Left Midfield': 'LM', 'Right Midfield': 'RM',
  'Left Winger': 'LW', 'Right Winger': 'RW',
  'Centre-Forward': 'CF', 'Second Striker': 'SS', 'Striker': 'ST',
};
const posFamily = (p?: string | null): 'GK' | 'DEF' | 'MID' | 'FWD' | null => {
  if (!p) return null;
  const s = String(p).trim();
  const short = TM_POSITION_TO_SHORT[s] || s.toUpperCase();
  return POSITION_FAMILY[short] || null;
};

const cleanName = (value: unknown) => String(value || '').trim().replace(/\s+/g, ' ');
const normName = (value: unknown) => cleanName(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const hasValue = (value: unknown) => value !== null && value !== undefined && String(value).trim() !== '';

const isInitialStub = (name: string) => /^\(?[A-Za-zÀ-ž]\)?\.?\s*[A-Za-zÀ-ž'’\-]+/.test(name.trim()) && name.trim().split(/\s+/).filter((part) => part.replace(/[().]/g, '').length > 1).length <= 1;

// Diacritic/case-insensitive similarity 0..1 (Levenshtein-based)
const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const v0 = new Array(b.length + 1);
  const v1 = new Array(b.length + 1);
  for (let i = 0; i <= b.length; i++) v0[i] = i;
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
  }
  return v1[b.length];
};
const nameSimilarity = (a: string, b: string): number => {
  const na = normName(a);
  const nb = normName(b);
  if (!na || !nb) return 0;
  const maxLen = Math.max(na.length, nb.length);
  return 1 - levenshtein(na, nb) / maxLen;
};
const surnameOf = (name: string) => normName(name).split(/\s+/).pop() || '';

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
const tmPlayerCache = new Map<string, any>();

const searchTransfermarktIds = async (name: string, max = 8): Promise<string[]> => {
  try {
    const q = encodeURIComponent(name);
    const res = await fetch(`https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${q}`, {
      headers: { 'User-Agent': TM_UA, 'Accept-Language': 'en' },
      redirect: 'follow',
    });
    if (!res.ok) return [];
    const html = await res.text();
    const ids: string[] = [];
    const seen = new Set<string>();
    const re = /\/[a-z0-9-]+\/profil\/spieler\/(\d+)/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && ids.length < max) {
      if (!seen.has(m[1])) { seen.add(m[1]); ids.push(m[1]); }
    }
    return ids;
  } catch { return []; }
};

const fetchTmPlayer = async (id: string): Promise<any | null> => {
  if (tmPlayerCache.has(id)) return tmPlayerCache.get(id);
  try {
    const r = await fetch(`${TM_API}/player/${id}`);
    if (!r.ok) { tmPlayerCache.set(id, null); return null; }
    const j = await r.json();
    const data = j?.data || null;
    tmPlayerCache.set(id, data);
    return data;
  } catch { tmPlayerCache.set(id, null); return null; }
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

// Match a parsed player against Transfermarkt using name + DOB/nationality/position
// scoring. TM is the source of truth: when a confident match is found, TM fields
// overwrite the vision fields (which are often wrong).
const matchOnTransfermarkt = async (player: any): Promise<any> => {
  const rawName = cleanName(player?.name);
  if (!rawName) return { ...player, _needs_review: true };

  // Build search query — for stubs use just the surname to widen the net
  const stub = player?.name_is_stub === true || isInitialStub(rawName);
  const query = stub ? surnameOf(rawName) : rawName;
  if (!query || query.length < 2) return { ...player, _needs_review: true };

  const ids = await searchTransfermarktIds(query);
  if (!ids.length) return { ...player, _needs_review: true };

  const parsedDob = hasValue(player.date_of_birth) ? String(player.date_of_birth).slice(0, 10) : null;
  const parsedYear = parsedDob ? parsedDob.slice(0, 4) : null;
  const parsedNat = hasValue(player.nationality) ? normName(player.nationality) : null;
  const parsedFamily = posFamily(player.position);
  const parsedAge = typeof player.age === 'number' ? player.age : (hasValue(player.age) ? parseInt(String(player.age), 10) : null);
  const parsedSurname = surnameOf(rawName);

  const candidates = await Promise.all(ids.map(async (id) => {
    const data = await fetchTmPlayer(id);
    return data ? { id, data } : null;
  }));

  let best: { id: string; data: any; score: number; exactDob: boolean } | null = null;
  for (const c of candidates) {
    if (!c) continue;
    const d = c.data;
    const tmName: string = d?.baseDetails?.name || `${d?.baseDetails?.firstName || ''} ${d?.baseDetails?.lastName || ''}`.trim();
    const tmDob: string | null = d?.lifeDates?.dateOfBirth ?? null;
    const tmAge: number | null = d?.lifeDates?.age ?? null;
    const tmNatId: number = d?.nationalityDetails?.nationalities?.nationalityId || 0;
    const tmNatId2: number = d?.nationalityDetails?.nationalities?.secondNationalityId || 0;
    const tmPosLong: string = d?.attributes?.position?.longName || d?.attributes?.position?.shortName || '';
    const tmFamily = posFamily(tmPosLong);

    let score = 0;
    let exactDob = false;
    if (parsedDob && tmDob && tmDob.slice(0, 10) === parsedDob) { score += 3; exactDob = true; }
    else if (parsedYear && tmDob && tmDob.slice(0, 4) === parsedYear) score += 2;

    if (parsedNat) {
      const nat1 = NATIONALITY_NAMES[tmNatId] ? normName(NATIONALITY_NAMES[tmNatId]) : '';
      const nat2 = NATIONALITY_NAMES[tmNatId2] ? normName(NATIONALITY_NAMES[tmNatId2]) : '';
      if (nat1 && (nat1 === parsedNat || nat1.includes(parsedNat) || parsedNat.includes(nat1))) score += 2;
      else if (nat2 && (nat2 === parsedNat || nat2.includes(parsedNat) || parsedNat.includes(nat2))) score += 2;
    }

    if (parsedFamily && tmFamily && parsedFamily === tmFamily) score += 1;
    if (parsedAge && tmAge && Math.abs(parsedAge - tmAge) <= 1) score += 1;

    if (tmName) {
      const sim = stub
        ? (surnameOf(tmName) === parsedSurname ? 1 : nameSimilarity(surnameOf(tmName), parsedSurname))
        : nameSimilarity(tmName, rawName);
      if (sim >= 0.85) score += 1;
      else if (sim < 0.6 && !exactDob) score -= 1; // strong penalty for weak name match
    }

    if (!best || score > best.score || (score === best.score && exactDob && !best.exactDob)) {
      best = { id: c.id, data: d, score, exactDob };
    }
  }

  // Accept threshold: exact DOB match, OR score ≥ 4 across other signals
  if (!best || (!best.exactDob && best.score < 4)) {
    return { ...player, _needs_review: true };
  }

  const d = best.data;
  const next: any = { ...player };
  const tmFullName = d?.baseDetails?.name || `${d?.baseDetails?.firstName || ''} ${d?.baseDetails?.lastName || ''}`.trim();
  if (tmFullName) next.name = tmFullName;

  const tmDob = d?.lifeDates?.dateOfBirth ?? null;
  if (tmDob) next.date_of_birth = String(tmDob).slice(0, 10);
  if (d?.lifeDates?.age) next.age = d.lifeDates.age;

  const tmNatId: number = d?.nationalityDetails?.nationalities?.nationalityId || 0;
  const natName = NATIONALITY_NAMES[tmNatId];
  if (natName) next.nationality = natName;

  const posLong = d?.attributes?.position?.longName || d?.attributes?.position?.shortName || '';
  const shortPos = TM_POSITION_TO_SHORT[posLong] || d?.attributes?.position?.shortName || null;
  if (shortPos) next.position = shortPos;

  const current = (d?.clubAssignments || []).find((a: any) => a?.type === 'current');
  if (current?.clubId) {
    const club = await fetchTmClubInfo(String(current.clubId));
    if (club.club) next.club = club.club;
    if (club.competitionId) {
      const compName = await fetchTmCompetitionName(club.competitionId);
      if (compName) next.league = compName;
    }
  }

  next._matched_source = 'transfermarkt';
  next.transfermarkt_id = best.id;
  next._needs_review = false;
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

    // Web lookup: expand "Initial. Surname" stubs and backfill missing fields
    // by asking the model to identify the player from its football knowledge.
    if (players.length) {
      try {
        players = await runWithConcurrency(players, 3, matchOnTransfermarkt);
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