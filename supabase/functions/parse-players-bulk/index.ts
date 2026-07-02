import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageInput { base64: string; mimeType?: string }

const SYSTEM_PROMPT = `You are a football scouting assistant. Extract a list of football players from the supplied text and/or screenshots. For each player infer the most likely values for: name, position (use short codes GK, CB, LB, RB, CDM, CM, CAM, RW, LW, CF only), nationality (country name in English), date_of_birth (YYYY-MM-DD if visible, otherwise null), age (integer if visible, otherwise null), club, league, instagram_handle (without @), shirt_number (integer if visible, otherwise null), team_side ("left" or "right" if the image shows two teams, otherwise null), name_is_stub (true if the label is only an initial + surname like "B. Szywała", otherwise false), national_team (true only if the source explicitly mentions this player has represented a national team at any age group, otherwise null — never guess), agency (only set if an agency name is written verbatim in the source text, otherwise null), notes (short free-form text with anything else useful).

Rules:
- Use UK English.
- Never invent a date of birth, club or league if not present in the source or supplied context; leave null.
- NATIONALITY: only set nationality if the country name is written in TEXT in the source (e.g. "Croatia", "CRO"). NEVER guess nationality from a flag icon, jersey colour or club badge — flags are frequently misread. If no country text is present, leave nationality null.
- Position must be one of GK, CB, LB, RB, CDM, CM, CAM, LW, RW, CF. Map variants: ST/SS → CF, LM → LW, RM → RW, AM → CAM, DM → CDM, LCB/RCB/Defender → CB, LWB → LB, RWB → RB.
- NATIONAL TEAM: only set national_team true if the source explicitly mentions national-team appearances (e.g. "Croatia U17"). Never infer from club or nationality alone.
- AGENCY: only set agency when an agency name is written verbatim. Never guess.
- If the screenshot is a formation graphic, ALWAYS infer positions from each player's spatial role even when no position label is printed. Read the pitch like a football line-up: keeper closest to goal, centre backs central in the defensive line, full backs wide, holding midfielders behind central/attacking midfielders, wingers wide high, striker/centre forward highest central. Position must never be null when a formation is visible.
- Formation graphics often show TWO teams split by a vertical halfway line. Treat each half as its own team: names on the left half are team_side "left", names on the right half are team_side "right". Each team has its own goalkeeper, defence, midfield and attack — do not merge them.
- If a club, team, age group, competition or league header is visible, apply that context to every player it clearly belongs to.
- Extract dates of birth from any visible DOB/birth/date column or player card and normalise formats like DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY or Month-name dates to YYYY-MM-DD.
- Capture shirt numbers when shown next to the name (e.g. "10 B. Szywała" → shirt_number 10).
- When a label is just an initial + surname (e.g. "B. Szywała", "(c) K. Cecuła", "Š. Žužić"), set name_is_stub = true and keep the surname intact with diacritics. Strip captain markers like "(c)" from the name itself but keep them in notes.
- If a row clearly isn't a player (e.g. header, total), skip it.
- Return STRICT JSON only, matching the schema. No prose, no code fences.

Schema: { "players": [ { "name": string, "position": string|null, "nationality": string|null, "date_of_birth": string|null, "age": number|null, "club": string|null, "league": string|null, "instagram_handle": string|null, "shirt_number": number|null, "team_side": string|null, "name_is_stub": boolean, "national_team": boolean|null, "agency": string|null, "notes": string|null } ] }`;

// Transfermarkt's public API exposes numeric nationality IDs, but they do not
// match the country-id list we previously used. That caused Croatian players
// to be displayed as Costa Rican. Treat profile-page text as the source of
// truth and use this tiny fallback only for IDs we have verified against the
// API response and public profile metadata.
const VERIFIED_TM_NATIONALITY_FALLBACK: Record<number, string> = {
  36: 'Costa Rica',
  37: 'Croatia',
  83: 'Colombia',
  157: 'Spain',
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
  'Left Midfield': 'LW', 'Right Midfield': 'RW',
  'Left Winger': 'LW', 'Right Winger': 'RW',
  'Centre-Forward': 'CF', 'Second Striker': 'CF', 'Striker': 'CF',
};

// Canonical 10 codes used across the player DB. Any parsed/TM position that
// isn't in this set is coerced to null so the record won't slip through with
// a legacy value that the position filter can't match.
const CANONICAL_POSITIONS = new Set(['GK','CB','LB','RB','CDM','CM','CAM','LW','RW','CF']);
const POSITION_ALIAS: Record<string, string> = {
  ST: 'CF', SS: 'CF', LM: 'LW', RM: 'RW', AM: 'CAM', DM: 'CDM',
  LCB: 'CB', RCB: 'CB', LCM: 'CM', RCM: 'CM', LWB: 'LB', RWB: 'RB',
  W: 'RW', WINGER: 'RW', DEFENDER: 'CB',
};
const canonicalPosition = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (CANONICAL_POSITIONS.has(upper)) return upper;
  if (POSITION_ALIAS[upper]) return POSITION_ALIAS[upper];
  const mapped = TM_POSITION_TO_SHORT[raw] || TM_POSITION_TO_SHORT[raw.replace(/\s+/g, ' ')];
  if (mapped && CANONICAL_POSITIONS.has(mapped)) return mapped;
  return null;
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

const transfermarktProfileUrl = (id: unknown) => {
  const clean = String(id || '').trim();
  return clean ? `https://www.transfermarkt.com/-/profil/spieler/${clean}` : null;
};

const extractTransfermarktLink = (links: unknown): string | null => {
  if (!links) return null;
  if (typeof links === 'string') {
    const trimmed = links.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try { return extractTransfermarktLink(JSON.parse(trimmed)); } catch {}
    }
    return /transfermarkt/i.test(trimmed) ? trimmed : null;
  }
  if (Array.isArray(links)) {
    for (const link of links) {
      const found = extractTransfermarktLink(link);
      if (found) return found;
    }
    return null;
  }
  if (typeof links === 'object') {
    const record = links as Record<string, unknown>;
    const candidates = [record.url, record.href, record.link, record.value, record.transfermarkt_url, record.transfermarkt, record.Transfermarkt];
    const label = String(record.label || record.title || record.name || record.type || record.platform || '').trim();
    for (const value of candidates) {
      const url = String(value || '').trim();
      if (!url) continue;
      if (/transfermarkt/i.test(url) || /transfermarkt/i.test(label)) return url;
    }
  }
  return null;
};

const isMissingNationality = (value: unknown) => !hasValue(value) || /^unknown$/i.test(String(value).trim());

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
const tmNationalityCache = new Map<string, string | null>();
const tmProfileCache = new Map<string, { nationality: string | null; agent: string | null; nationalTeam: boolean | null }>();

const getTmName = (data: any): string => {
  return cleanName(
    data?.name
    || data?.displayName
    || data?.shortName
    || data?.baseDetails?.name
    || `${data?.baseDetails?.firstName || ''} ${data?.baseDetails?.lastName || ''}`
  );
};

const getTmPositionValue = (data: any): string => {
  return cleanName(
    data?.attributes?.position?.longName
    || data?.attributes?.position?.name
    || data?.attributes?.position?.shortName
    || data?.attributes?.positionGroupName
  );
};

const getTmAgency = (data: any): string | null => {
  const agency = cleanName(
    data?.attributes?.consultantAgency?.name
    || data?.attributes?.consultantAgency?.shortName
  );
  if (!agency || /^unknown$/i.test(agency) || /relatives/i.test(agency)) return null;
  return agency;
};

const hasTmNationalTeam = (data: any): boolean => {
  return Array.isArray(data?.clubAssignments)
    && data.clubAssignments.some((assignment: any) => assignment?.type === 'nationalTeam');
};

const decodeHtmlEntities = (value: string) => value
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&nbsp;/g, ' ')
  .trim();

const cleanCountry = (value: unknown): string | null => {
  const country = String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/[.;:|]+$/g, '')
    .trim();
  if (!country || country.length < 3 || /^(unknown|n\/a|null|undefined)$/i.test(country)) return null;
  return country;
};

const extractMetaContent = (html: string, name: string): string | null => {
  const re = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i');
  const match = html.match(re);
  return match?.[1] ? decodeHtmlEntities(match[1]) : null;
};

const stripTags = (value: string) => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const extractProfileField = (html: string, labels: string[]): string | null => {
  for (const label of labels) {
    const re = new RegExp(`${label}\\s*:?\\s*<\\/span>\\s*<span[^>]*>([\\s\\S]*?)<\\/span>`, 'i');
    const m = html.match(re);
    if (m?.[1]) {
      const value = decodeHtmlEntities(stripTags(m[1]));
      if (value) return value;
    }
  }
  return null;
};

const fetchTmProfile = async (id: string) => {
  if (tmProfileCache.has(id)) return tmProfileCache.get(id)!;

  let nationality: string | null = null;
  let agent: string | null = null;
  let nationalTeam: boolean | null = null;

  try {
    const res = await fetch(`https://www.transfermarkt.com/-/profil/spieler/${id}`, {
      headers: { 'User-Agent': TM_UA, 'Accept-Language': 'en' },
      redirect: 'follow',
    });
    if (res.ok) {
      const html = await res.text();

      // Nationality: meta description first, then keywords fallback.
      const description = extractMetaContent(html, 'description');
      const fromMatch = description?.match(/(?:from|aus)\s+([^➤,]+?)(?:\s+➤|,|$)/i);
      nationality = cleanCountry(fromMatch?.[1]);
      if (!nationality) {
        const keywords = extractMetaContent(html, 'keywords');
        const lastKeyword = keywords?.split(',').map((part) => part.trim()).filter(Boolean).pop();
        nationality = cleanCountry(lastKeyword);
      }

      // Player agent: labelled "Player agent" on the info table.
      const agentRaw = extractProfileField(html, ['Player&#039;s agent', "Player's agent", 'Player agent', 'Players&#039; agent']);
      if (agentRaw && !/^-+$/.test(agentRaw) && !/^unknown$/i.test(agentRaw) && !/relatives/i.test(agentRaw)) {
        agent = agentRaw;
      }

      // National team: TM shows a "Current international" row + a "National team" section.
      if (/Current international[\s\S]{0,400}?(?:<img|<a[^>]*nationalteam)/i.test(html)
          || /class="dataZusatzInfos"[\s\S]{0,4000}?(?:Junior international|Youth international|U-?\d{1,2})/i.test(html)
          || /caps for\s+(?:the\s+)?[A-Za-z ]+ national team/i.test(description || '')) {
        nationalTeam = true;
      }
    }
  } catch { /* keep nulls */ }

  const profile = { nationality, agent, nationalTeam };
  tmProfileCache.set(id, profile);
  tmNationalityCache.set(id, nationality);
  return profile;
};

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

const searchTransfermarktCandidates = async (rawName: string, stub: boolean, max = 12): Promise<string[]> => {
  const queries = new Set<string>();
  const name = cleanName(rawName);
  if (name) queries.add(name);

  const surname = surnameOf(name);
  if (stub && surname) queries.add(surname);
  if (!stub && surname && surname !== normName(name) && surname.length >= 4) queries.add(surname);

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const query of queries) {
    const found = await searchTransfermarktIds(query, max);
    for (const id of found) {
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
        if (ids.length >= max) return ids;
      }
    }
  }
  return ids;
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

  const ids = await searchTransfermarktCandidates(rawName, stub);
  if (!ids.length) return { ...player, nationality: null, _needs_review: true };

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
    const tmName: string = getTmName(d);
    const tmDob: string | null = d?.lifeDates?.dateOfBirth ?? null;
    const tmAge: number | null = d?.lifeDates?.age ?? null;
    const tmPosLong: string = getTmPositionValue(d);
    const tmFamily = posFamily(tmPosLong);

    let score = 0;
    let exactDob = false;
    if (parsedDob && tmDob && tmDob.slice(0, 10) === parsedDob) { score += 3; exactDob = true; }
    else if (parsedYear && tmDob && tmDob.slice(0, 4) === parsedYear) score += 2;

    // Nationality is intentionally NOT used as a scoring signal — vision reads
    // of flags/badges are too unreliable and were causing wrong matches (e.g.
    // Croatian players tagged as Costa Rican from a misread flag). TM is the
    // sole source of truth for nationality.

    if (parsedFamily && tmFamily && parsedFamily === tmFamily) score += 1;
    if (parsedAge && tmAge && Math.abs(parsedAge - tmAge) <= 1) score += 1;

    if (tmName) {
      const sim = stub
        ? (surnameOf(tmName) === parsedSurname ? 1 : nameSimilarity(surnameOf(tmName), parsedSurname))
        : nameSimilarity(tmName, rawName);
      if (sim >= 0.95) score += 3;      // near-exact full name: strong signal on its own
      else if (sim >= 0.85) score += 2;
      else if (sim >= 0.7) score += 1;
      else if (sim < 0.55 && !exactDob) score -= 2; // strong penalty for weak name match
    }

    if (!best || score > best.score || (score === best.score && exactDob && !best.exactDob)) {
      best = { id: c.id, data: d, score, exactDob };
    }
  }

  // Accept threshold: exact DOB match, OR score ≥ 2 across other signals.
  // Threshold lowered so a strong name match alone (score 3) or name+position
  // (score ≥ 3) is enough — otherwise TM never enriches from formation-only
  // screenshots where DOB/nationality aren't visible.
  if (!best || (!best.exactDob && best.score < 2)) {
    return { ...player, nationality: null, _needs_review: true };
  }

  const d = best.data;
  const next: any = { ...player };
  const tmFullName = getTmName(d);
  if (tmFullName) next.name = tmFullName;

  const tmDob = d?.lifeDates?.dateOfBirth ?? null;
  if (tmDob) next.date_of_birth = String(tmDob).slice(0, 10);
  if (d?.lifeDates?.age) next.age = d.lifeDates.age;

  const tmNatId: number = d?.nationalityDetails?.nationalities?.nationalityId || 0;
  const profile = await fetchTmProfile(best.id);
  const fallbackNationality = VERIFIED_TM_NATIONALITY_FALLBACK[tmNatId] || null;
  next.nationality = profile.nationality || fallbackNationality || null;
  const tmAgency = getTmAgency(d);
  if (tmAgency || profile.agent) next.agency = tmAgency || profile.agent;
  if (hasTmNationalTeam(d) || profile.nationalTeam === true) next.national_team = true;

  const posLong = getTmPositionValue(d);
  const shortPos = canonicalPosition(TM_POSITION_TO_SHORT[posLong] || d?.attributes?.position?.shortName || posLong);
  if (shortPos) next.position = shortPos;

  const current = (d?.clubAssignments || []).find((a: any) => a?.type === 'current');
  if (!hasValue(next.shirt_number) && current?.shirtNumber) next.shirt_number = current.shirtNumber;
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
    const body = await req.json() as { text?: string; images?: ImageInput[]; instruction?: string; mode?: string; limit?: number; skipIds?: string[] };
    const { text, images, instruction, mode } = body;

    // Enrichment mode: scan existing players for missing DOB/nationality and
    // backfill from Transfermarkt without touching already-set fields.
    if (mode === 'enrich') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (!supabaseUrl || !serviceKey) {
        return new Response(JSON.stringify({ error: 'Backend not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const limit = Math.min(Math.max(Number(body.limit) || 15, 1), 50);
      const supabase = createClient(supabaseUrl, serviceKey);

      const skipIds = new Set((Array.isArray(body.skipIds) ? body.skipIds : []).map((id) => String(id)));

      // Fetch existing players and filter in JS so we can also detect missing
      // Transfermarkt profile links inside the links JSONB array/object. PostgREST
      // cannot reliably express "links array does not contain a Transfermarkt URL".
      // This now targets players missing DOB, nationality OR the Transfermarkt URL.
      const { data: allRows, error: fetchErr } = await supabase
        .from('players')
        .select('id, name, date_of_birth, nationality, position, club, league, age, national_team, category, representation_status, agency, links')
        .order('created_at', { ascending: false })
        .range(0, 9999);

      if (fetchErr) {
        return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const excludedStatuses = new Set(['scouted', 'fuel for football', 'fff']);
      const candidateRows = (allRows || []).filter((row: any) => {
        if (skipIds.has(String(row.id))) return false;
        const category = String(row.category || '').trim().toLowerCase();
        const representation = String(row.representation_status || '').trim().toLowerCase();
        if (excludedStatuses.has(category) || excludedStatuses.has(representation)) return false;
        const missingDob = !hasValue(row.date_of_birth);
        const missingNationality = isMissingNationality(row.nationality);
        const missingTransfermarktUrl = !extractTransfermarktLink(row.links);
        const missingRepresentation = !hasValue(row.representation_status) || /^unknown$/i.test(String(row.representation_status).trim());
        const missingAgency = !hasValue(row.agency);
        const missingNationalTeam = row.national_team !== true;
        return missingDob || missingNationality || missingTransfermarktUrl || missingRepresentation || missingAgency || missingNationalTeam;
      });
      const candidates = candidateRows.slice(0, limit);

      const results: Array<{ id: string; name: string; updated: boolean; fields: string[]; reason?: string }> = [];

      const workers = await runWithConcurrency(candidates || [], 3, async (row: any) => {
        try {
          const matched = await matchOnTransfermarkt({
            name: row.name,
            position: row.position,
            nationality: !isMissingNationality(row.nationality) ? row.nationality : null,
            date_of_birth: row.date_of_birth,
            age: row.age,
          });
          if (matched?._needs_review) {
            return { id: row.id, name: row.name, updated: false, fields: [], reason: 'no_match' };
          }

          const patch: Record<string, unknown> = {};
          const fields: string[] = [];
          // Only fill missing fields — never overwrite existing values.
          if (!row.date_of_birth && matched.date_of_birth) { patch.date_of_birth = matched.date_of_birth; fields.push('date_of_birth'); }
          if (isMissingNationality(row.nationality) && matched.nationality) { patch.nationality = matched.nationality; fields.push('nationality'); }
          if ((!row.position || !CANONICAL_POSITIONS.has(String(row.position).toUpperCase())) && matched.position) { patch.position = matched.position; fields.push('position'); }
          if (!row.club && matched.club) { patch.club = matched.club; fields.push('club'); }
          if (!row.league && matched.league) { patch.league = matched.league; fields.push('league'); }
          if (!row.age && matched.age) { patch.age = matched.age; fields.push('age'); }
          if (row.national_team !== true && matched.national_team === true) { patch.national_team = true; fields.push('national_team'); }

          // Agency + representation status: only fill when empty/unknown.
          const existingAgency = hasValue(row.agency) ? String(row.agency).trim() : '';
          if (!existingAgency && matched.agency) {
            patch.agency = matched.agency;
            fields.push('agency');
          }
          const existingRep = hasValue(row.representation_status) ? String(row.representation_status).trim() : '';
          const repIsUnknown = !existingRep || /^unknown$/i.test(existingRep);
          if (repIsUnknown && (matched.agency || existingAgency)) {
            patch.representation_status = 'Represented';
            fields.push('representation_status');
          }

          // Add Transfermarkt profile link if we matched an id and one isn't already stored.
          if (matched.transfermarkt_id) {
            const existingTm = extractTransfermarktLink(row.links);
            if (!existingTm) {
              const existingLinks: Array<{ label?: string; url?: string }> = Array.isArray(row.links)
                ? row.links.filter((l: any) => l && typeof l === 'object')
                : (row.links && typeof row.links === 'object' ? [row.links as any] : []);
              const tmUrl = transfermarktProfileUrl(matched.transfermarkt_id);
              if (tmUrl) {
                patch.links = [...existingLinks, { label: 'Transfermarkt', url: tmUrl }];
                fields.push('transfermarkt_url');
              }
            }
          }

          if (!Object.keys(patch).length) {
            return { id: row.id, name: row.name, updated: false, fields: [], reason: 'nothing_to_fill' };
          }

          const { error: updErr } = await supabase.from('players').update(patch).eq('id', row.id);
          if (updErr) {
            return { id: row.id, name: row.name, updated: false, fields, reason: updErr.message };
          }
          return { id: row.id, name: row.name, updated: true, fields };
        } catch (err) {
          return { id: row.id, name: row.name, updated: false, fields: [], reason: (err as Error).message };
        }
      });
      results.push(...workers);

      const remainingAfter = Math.max(0, candidateRows.length - workers.length);

      return new Response(JSON.stringify({
        processed: results.length,
        updated: results.filter((r) => r.updated).length,
        remaining_before: candidateRows.length,
        remaining: remainingAfter,
        results,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

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

    // Final pass: coerce every position to one of the 10 canonical codes so
    // the player DB filter and edit dropdown stay in sync.
    players = players.map((p: any) => ({ ...p, position: canonicalPosition(p?.position) }));

    return new Response(JSON.stringify({ players }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('parse-players-bulk error', e);
    return new Response(JSON.stringify({ error: (e as Error).message || 'Failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});