import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_REFRESH_BATCH_TARGET = 300;

const runInBackground = (promise: Promise<unknown>) => {
  const runtime = (globalThis as any).EdgeRuntime;
  if (runtime?.waitUntil) {
    runtime.waitUntil(promise);
  } else {
    promise.catch((err) => console.error('background task failed', err));
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, serviceKey);

    // Resume: if an existing in-flight job is passed or there is already a
    // running job we return it instead of starting a duplicate.
    const body = await req.json().catch(() => ({}));
    const requestedJobId = String(body?.jobId || '').trim();

    if (requestedJobId) {
      const { data: existing } = await supabase
        .from('transfermarkt_refresh_jobs').select('*').eq('id', requestedJobId).maybeSingle();
      if (existing && (existing.status === 'running' || existing.status === 'pending')) {
        return new Response(JSON.stringify({ jobId: existing.id, resumed: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Seed totals against the "not fresh in last 24h" window so the UI shows
    // remaining-to-refresh, not the whole table. Re-clicking after a
    // completed run therefore shows 0/0 instead of restarting from scratch.
    const FRESH_HOURS = 24;
    const freshCutoffIso = new Date(Date.now() - FRESH_HOURS * 3600 * 1000).toISOString();

    const staleFilter = (q: any) => q.or(`last_tm_refreshed_at.is.null,last_tm_refreshed_at.lt.${freshCutoffIso}`);

    const excluded = '("Scouted","Fuel For Football","FFF")';
    const eligiblePlayers = supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .or(`category.is.null,category.not.in.${excluded}`)
      .or(`representation_status.is.null,representation_status.not.in.${excluded}`);

    const { count: playersCount } = await staleFilter(
      eligiblePlayers,
    );
    const { count: youthCount } = await staleFilter(
      supabase.from('player_outreach_youth').select('*', { count: 'exact', head: true }),
    );
    const { count: proCount } = await staleFilter(
      supabase.from('player_outreach_pro').select('*', { count: 'exact', head: true }),
    );

    const staleTotal = (playersCount || 0) + (youthCount || 0) + (proCount || 0);
    const targetTotal = Math.min(DAILY_REFRESH_BATCH_TARGET, staleTotal);

    const { data: job, error: jobErr } = await supabase
      .from('transfermarkt_refresh_jobs')
      .insert({
        status: 'running',
        total_players: targetTotal,
        total_outreach: (youthCount || 0) + (proCount || 0),
      })
      .select('*')
      .single();
    if (jobErr || !job) {
      return new Response(JSON.stringify({ error: jobErr?.message || 'could not create job' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`starting Transfermarkt refresh job ${job.id}: target ${targetTotal} of ${staleTotal} stale rows`);

    // Kick off the first batch in the edge-runtime background lifecycle. A
    // plain un-awaited fetch can be cancelled as soon as this function returns,
    // which is what left jobs parked at 0 scanned.
    runInBackground(fetch(`${supabaseUrl}/functions/v1/parse-players-bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': anonKey || serviceKey,
      },
      body: JSON.stringify({ mode: 'refresh_all', jobId: job.id, batchSize: 25 }),
    }).then(async (res) => {
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        const message = `initial refresh batch failed: ${res.status} ${text}`.slice(0, 1000);
        console.error(message);
        await supabase.from('transfermarkt_refresh_jobs').update({
          status: 'failed',
          error: message,
          finished_at: new Date().toISOString(),
        }).eq('id', job.id);
      }
    }).catch(async (err) => {
      console.error('initial kick failed', err);
      await supabase.from('transfermarkt_refresh_jobs').update({
        status: 'failed',
        error: String(err?.message || err || 'initial kick failed').slice(0, 1000),
        finished_at: new Date().toISOString(),
      }).eq('id', job.id);
    }));

    return new Response(JSON.stringify({ jobId: job.id, resumed: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('refresh-transfermarkt-start error', e);
    return new Response(JSON.stringify({ error: (e as Error).message || 'failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});