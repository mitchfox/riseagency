import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXCLUDED = ['Scouted', 'Fuel For Football', 'FFF'];

const normalize = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`\-]/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const SYSTEM = `You are an expert on world football club stature. You will grade clubs on the R1-R5 scale.

R1 = Elite European/global (Real Madrid, Man City, Bayern, PSG, Barcelona, Liverpool, Arsenal, Inter, Man Utd - Champions League regulars, world-famous)
R2 = Strong top-5 league clubs / European regulars (Aston Villa, Brighton, Napoli, Roma, Villarreal, Leverkusen, Benfica, Ajax)
R3 = Solid top-flight in a strong league OR top club in a mid-tier league (mid-table Premier League, Serie A mid-table, top Eredivisie/Primeira/Belgian, Rangers/Celtic)
R4 = Lower top-flight / strong second tier (Championship top half, Bundesliga 2 top, Ligue 2 top, top MLS, top Turkish/Greek clubs outside the biggest)
R5 = Lower second tier / third tier / semi-pro / lower nations top flights

Academy rating: typically one tier LOWER than first team unless the club is a known academy powerhouse (e.g. Ajax, Barcelona, Benfica, Sporting, Man City, Chelsea academies stay same tier as first team).

Return ONLY valid JSON, no markdown, no commentary.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) throw new Error('LOVABLE_API_KEY not configured');

    const body = await req.json().catch(() => ({}));
    const batchSize: number = Math.min(Math.max(Number(body.batchSize) || 25, 1), 40);
    const maxClubs: number = Math.min(Math.max(Number(body.maxClubs) || 200, 1), 1000);

    // 1. Existing club_ratings missing first or academy
    const { data: existingRatings } = await supabase
      .from('club_ratings')
      .select('club_name, country, first_team_rating, academy_rating');

    const ratedMap = new Map<string, { country: string | null; first: string | null; academy: string | null }>();
    (existingRatings || []).forEach((r: any) => {
      const key = normalize(r.club_name);
      if (!key) return;
      ratedMap.set(key, {
        country: r.country || null,
        first: r.first_team_rating || null,
        academy: r.academy_rating || null,
      });
    });

    // 2. Player clubs (excluded categories filtered)
    const { data: playerRows } = await supabase
      .from('players')
      .select('current_club')
      .not('category', 'in', `(${EXCLUDED.map(v => `"${v}"`).join(',')})`)
      .not('representation_status', 'in', `(${EXCLUDED.map(v => `"${v}"`).join(',')})`);

    // 3. Country map from club_map_positions
    const { data: mapRows } = await supabase
      .from('club_map_positions')
      .select('club_name, country');
    const countryMap = new Map<string, string>();
    (mapRows || []).forEach((c: any) => {
      if (c.club_name && c.country) countryMap.set(normalize(c.club_name), c.country);
    });
    (existingRatings || []).forEach((r: any) => {
      if (r.club_name && r.country && r.country !== 'Unknown') {
        const k = normalize(r.club_name);
        if (!countryMap.has(k)) countryMap.set(k, r.country);
      }
    });

    // 4. Already-pending suggestions (dedupe)
    const { data: pending } = await supabase
      .from('club_rating_suggestions')
      .select('club_name')
      .eq('status', 'pending');
    const pendingSet = new Set((pending || []).map((p: any) => normalize(p.club_name)));

    // Build list of clubs to grade
    type Target = { club_name: string; country: string | null; current_first: string | null; current_academy: string | null };
    const targets = new Map<string, Target>();

    // Set 1: existing rows missing either rating
    (existingRatings || []).forEach((r: any) => {
      const key = normalize(r.club_name);
      if (!key || pendingSet.has(key)) return;
      const missingFirst = !r.first_team_rating || !r.first_team_rating.trim();
      const missingAcademy = !r.academy_rating || !r.academy_rating.trim();
      if (missingFirst || missingAcademy) {
        targets.set(key, {
          club_name: r.club_name,
          country: r.country || countryMap.get(key) || null,
          current_first: r.first_team_rating || null,
          current_academy: r.academy_rating || null,
        });
      }
    });

    // Set 2: player clubs not in club_ratings at all
    const seenPlayerClubs = new Set<string>();
    (playerRows || []).forEach((p: any) => {
      const raw = (p.current_club || '').trim();
      if (!raw) return;
      const key = normalize(raw);
      if (!key || seenPlayerClubs.has(key) || pendingSet.has(key)) return;
      seenPlayerClubs.add(key);
      if (!ratedMap.has(key) && !targets.has(key)) {
        targets.set(key, {
          club_name: raw,
          country: countryMap.get(key) || null,
          current_first: null,
          current_academy: null,
        });
      }
    });

    const allTargets = Array.from(targets.values()).slice(0, maxClubs);

    if (allTargets.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, inserted: 0, message: 'No clubs need suggestions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let inserted = 0;
    let processed = 0;

    for (let i = 0; i < allTargets.length; i += batchSize) {
      const batch = allTargets.slice(i, i + batchSize);
      const listText = batch
        .map((c, idx) => `${idx + 1}. ${c.club_name}${c.country ? ` (${c.country})` : ''}`)
        .join('\n');

      const userPrompt = `Grade each of these clubs on the R1-R5 scale. For each, return first-team rating, academy rating, one-sentence reasoning, and confidence (high|medium|low).

Clubs:
${listText}

Return JSON array with EXACT structure:
[{"club_name":"...","first":"R1|R2|R3|R4|R5","academy":"R1|R2|R3|R4|R5","reasoning":"...","confidence":"high|medium|low"}]`;

      const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
        }),
      });

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        console.error('AI error', aiRes.status, errText);
        if (aiRes.status === 429 || aiRes.status === 402) {
          return new Response(JSON.stringify({ error: aiRes.status === 402 ? 'AI credits exhausted' : 'Rate limited, try again' }), {
            status: aiRes.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        continue;
      }

      const aiJson = await aiRes.json();
      const content: string = aiJson.choices?.[0]?.message?.content || '';

      let parsed: any[] = [];
      try {
        let jsonStr = content.trim();
        const codeBlock = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlock) jsonStr = codeBlock[1].trim();
        const first = jsonStr.indexOf('[');
        const last = jsonStr.lastIndexOf(']');
        if (first !== -1 && last > first) jsonStr = jsonStr.substring(first, last + 1);
        parsed = JSON.parse(jsonStr);
      } catch (err) {
        console.error('Parse error', err, content.substring(0, 400));
        continue;
      }

      if (!Array.isArray(parsed)) continue;

      const rows = parsed
        .map((r) => {
          const target = batch.find((t) => normalize(t.club_name) === normalize(r.club_name)) || batch[0];
          if (!target) return null;
          const first = String(r.first || '').toUpperCase().match(/^R[1-5]$/) ? String(r.first).toUpperCase() : null;
          const academy = String(r.academy || '').toUpperCase().match(/^R[1-5]$/) ? String(r.academy).toUpperCase() : null;
          if (!first && !academy) return null;
          return {
            club_name: target.club_name,
            country: target.country,
            current_first: target.current_first,
            current_academy: target.current_academy,
            suggested_first: first,
            suggested_academy: academy,
            reasoning: String(r.reasoning || '').slice(0, 500),
            confidence: ['high', 'medium', 'low'].includes(String(r.confidence).toLowerCase())
              ? String(r.confidence).toLowerCase()
              : 'medium',
            status: 'pending',
          };
        })
        .filter(Boolean);

      if (rows.length > 0) {
        const { error: insErr, count } = await supabase
          .from('club_rating_suggestions')
          .upsert(rows as any, { onConflict: 'club_name,status', ignoreDuplicates: true, count: 'exact' });
        if (insErr) console.error('Insert error', insErr);
        else inserted += count || rows.length;
      }

      processed += batch.length;
    }

    return new Response(
      JSON.stringify({ success: true, processed, inserted, total_targets: allTargets.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('suggest-club-ratings error', err);
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});