const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TM_API = 'https://tmapi-alpha.transfermarkt.technology';

const extractId = (url: string): string | null => {
  const m = url.match(/\/spieler\/(\d+)/i);
  return m ? m[1] : null;
};

async function fetchAgent(playerId: string): Promise<{ agent_name: string | null; agent_status: string | null }> {
  try {
    const r = await fetch(`${TM_API}/player/${playerId}`);
    if (!r.ok) return { agent_name: null, agent_status: null };
    const j = await r.json();
    const attrs = j?.data?.attributes || {};
    const agency = attrs.consultantAgency;
    const agencyId = attrs.consultantAgencyId;
    if (!agencyId || agencyId === 0) return { agent_name: null, agent_status: 'unrepresented' };
    if (agency?.isSpecialConsultantAgency) return { agent_name: agency?.name || null, agent_status: 'family' };
    return { agent_name: agency?.name || null, agent_status: 'represented' };
  } catch {
    return { agent_name: null, agent_status: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { items } = await req.json();
    if (!Array.isArray(items)) return new Response(JSON.stringify({ error: 'items[] required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const results: Array<{ id: string; agent_name: string | null; agent_status: string | null }> = [];
    // Run in small batches to avoid hammering TM
    for (let i = 0; i < items.length; i += 8) {
      const batch = items.slice(i, i + 8);
      const settled = await Promise.all(batch.map(async (it: { id: string; url: string }) => {
        const pid = extractId(it.url || '');
        if (!pid) return { id: it.id, agent_name: null, agent_status: null };
        const r = await fetchAgent(pid);
        return { id: it.id, ...r };
      }));
      results.push(...settled);
    }
    return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});