import { useEffect, useRef, useState } from 'react';
import { PlayerDatabase } from './PlayerDatabase';
import { PlayerAddMode } from './PlayerAddMode';
import { SquadView } from './SquadView';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Table as TableIcon, Sparkles, UserPlus, RefreshCw, Download, Users, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Mode = 'classic' | 'squad';
type AddMode = 'ai' | 'manual';

const EXCLUDED_CATEGORIES = '("Scouted","Fuel For Football","FFF")';
const REFRESH_JOB_STORAGE_KEY = 'tm_refresh_job_id';

type RefreshJob = {
  id: string;
  status: 'pending' | 'running' | 'complete' | 'failed' | 'cancelled';
  total_players: number;
  total_outreach: number;
  processed: number;
  updated: number;
  with_stats: number;
  outreach_done: boolean;
  error: string | null;
};

export const PlayerDatabaseActions = () => {
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('ai');
  const [livePlayerCount, setLivePlayerCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [progress, setProgress] = useState<{ updated: number; processed: number; remaining: number | null } | null>(null);
  const [refreshJob, setRefreshJob] = useState<RefreshJob | null>(null);
  const refreshToastId = useRef<string | number | null>(null);

  const fetchLivePlayerCount = async () => {
    const { count, error } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .not('category', 'in', EXCLUDED_CATEGORIES)
      .not('representation_status', 'in', EXCLUDED_CATEGORIES);
    if (!error && typeof count === 'number') {
      setLivePlayerCount(count);
    }
    setCountLoading(false);
  };

  useEffect(() => {
    fetchLivePlayerCount();
    let t: ReturnType<typeof setTimeout> | null = null;
    const onRefresh = (event: Event) => {
      const detail = (event as CustomEvent<{ increment?: number }>).detail;
      if (typeof detail?.increment === 'number') {
        setLivePlayerCount((current) => current === null ? current : current + detail.increment);
      }
      if (t) clearTimeout(t);
      t = setTimeout(fetchLivePlayerCount, 250);
    };
    window.addEventListener('player-database-refresh', onRefresh);
    return () => {
      window.removeEventListener('player-database-refresh', onRefresh);
      if (t) clearTimeout(t);
    };
  }, []);

  // Attach to an in-flight refresh job (own or someone else's) via realtime.
  useEffect(() => {
    let cancelled = false;

    const attach = async (jobId: string) => {
      const { data } = await supabase
        .from('transfermarkt_refresh_jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();
      if (cancelled) return;
      if (data) applyJobSnapshot(data as RefreshJob);
    };

    // First try to resume the job saved in localStorage.
    const storedId = typeof window !== 'undefined' ? window.localStorage.getItem(REFRESH_JOB_STORAGE_KEY) : null;
    if (storedId) attach(storedId);

    // Also pick up any currently running job started by another staff member.
    (async () => {
      const { data } = await supabase
        .from('transfermarkt_refresh_jobs')
        .select('*')
        .eq('status', 'running')
        .order('started_at', { ascending: false })
        .limit(1);
      if (cancelled) return;
      const row = data?.[0];
      if (row) {
        window.localStorage.setItem(REFRESH_JOB_STORAGE_KEY, row.id);
        applyJobSnapshot(row as RefreshJob);
      }
    })();

    const channel = supabase
      .channel('transfermarkt_refresh_jobs_watch')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transfermarkt_refresh_jobs' },
        (payload) => {
          const row = (payload.new || payload.old) as RefreshJob | undefined;
          if (!row) return;
          const currentId = window.localStorage.getItem(REFRESH_JOB_STORAGE_KEY);
          if (currentId && row.id !== currentId) return;
          applyJobSnapshot(row);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatToastMessage = (job: RefreshJob) => {
    const total = job.total_players || 0;
    const parts = [
      `${job.processed.toLocaleString('en-GB')}${total ? ` / ${total.toLocaleString('en-GB')}` : ''} scanned`,
      `${job.updated.toLocaleString('en-GB')} updated`,
      `${job.with_stats.toLocaleString('en-GB')} with stats`,
      job.outreach_done ? 'outreach done' : 'outreach pending',
    ];
    return parts.join(' · ');
  };

  const applyJobSnapshot = (job: RefreshJob) => {
    setRefreshJob(job);
    const stored = window.localStorage.getItem(REFRESH_JOB_STORAGE_KEY);
    if (!stored || stored !== job.id) {
      window.localStorage.setItem(REFRESH_JOB_STORAGE_KEY, job.id);
    }
    const message = formatToastMessage(job);
    if (job.status === 'running' || job.status === 'pending') {
      if (refreshToastId.current) {
        toast.loading(`Refreshing Transfermarkt — ${message}`, { id: refreshToastId.current });
      } else {
        refreshToastId.current = toast.loading(`Refreshing Transfermarkt — ${message}`);
      }
    } else if (job.status === 'complete') {
      const id = refreshToastId.current;
      if (id) toast.success(`Transfermarkt refresh complete — ${message}`, { id });
      else toast.success(`Transfermarkt refresh complete — ${message}`);
      refreshToastId.current = null;
      window.localStorage.removeItem(REFRESH_JOB_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('player-database-refresh'));
    } else if (job.status === 'cancelled') {
      const id = refreshToastId.current;
      if (id) toast.message(`Refresh cancelled — ${message}`, { id });
      else toast.message(`Refresh cancelled — ${message}`);
      refreshToastId.current = null;
      window.localStorage.removeItem(REFRESH_JOB_STORAGE_KEY);
    } else if (job.status === 'failed') {
      const id = refreshToastId.current;
      const err = job.error || 'unknown error';
      if (id) toast.error(`Refresh failed: ${err}`, { id });
      else toast.error(`Refresh failed: ${err}`);
      refreshToastId.current = null;
      window.localStorage.removeItem(REFRESH_JOB_STORAGE_KEY);
    }
  };

  const openAdd = (nextMode: AddMode) => {
    setAddMode(nextMode);
    setAddOpen(true);
  };

  const refreshAllTransfermarkt = async () => {
    if (refreshJob && (refreshJob.status === 'running' || refreshJob.status === 'pending')) return;
    if (!confirm('Refresh every player that has a Transfermarkt URL? This keeps running in the background even if you close the tab.')) return;
    try {
      const { data, error } = await supabase.functions.invoke('refresh-transfermarkt-start', { body: {} });
      if (error) throw error;
      const jobId = String(data?.jobId || '');
      if (!jobId) throw new Error('No job id returned');
      window.localStorage.setItem(REFRESH_JOB_STORAGE_KEY, jobId);
      refreshToastId.current = toast.loading('Starting Transfermarkt refresh…');
    } catch (err) {
      console.error('refresh_all start failed', err);
      toast.error(`Could not start refresh: ${(err as Error).message || 'unknown error'}`);
    }
  };

  const cancelRefresh = async () => {
    if (!refreshJob) return;
    if (!confirm('Cancel the running Transfermarkt refresh?')) return;
    await supabase
      .from('transfermarkt_refresh_jobs')
      .update({ status: 'cancelled', finished_at: new Date().toISOString() })
      .eq('id', refreshJob.id);
  };

  const refreshingAll = !!refreshJob && (refreshJob.status === 'running' || refreshJob.status === 'pending');

  const enrichMissing = async () => {
    if (enriching) return;
    setEnriching(true);
    setProgress({ updated: 0, processed: 0, remaining: null });
    const toastId = toast.loading('Scanning players for missing details…');
    let totalUpdated = 0;
    let totalProcessed = 0;
    const processedIds = new Set<string>();
    try {
      while (true) {
        const { data, error } = await supabase.functions.invoke('parse-players-bulk', {
          body: { mode: 'enrich', limit: 15, skipIds: Array.from(processedIds) },
        });
        if (error) throw error;
        const processed = Number(data?.processed) || 0;
        const updated = Number(data?.updated) || 0;
        const remaining = data?.remaining ?? null;
        (data?.results || []).forEach((result: any) => {
          if (result?.id) processedIds.add(String(result.id));
        });
        totalProcessed += processed;
        totalUpdated += updated;
        setProgress({ updated: totalUpdated, processed: totalProcessed, remaining });
        toast.loading(
          `Enriching from Transfermarkt — ${totalUpdated} updated, ${remaining ?? '?'} remaining`,
          { id: toastId },
        );
        // Stop when nothing left or nothing processed. Processed rows are skipped
        // on the next pass, so unmatchable players do not block later candidates.
        if (processed === 0 || (remaining !== null && remaining === 0)) break;
      }
      toast.success(
        `Enrichment complete — updated ${totalUpdated} of ${totalProcessed} scanned`,
        { id: toastId },
      );
      if (totalUpdated > 0) window.dispatchEvent(new CustomEvent('player-database-refresh'));
    } catch (err) {
      console.error('enrich failed', err);
      toast.error(`Enrichment failed: ${(err as Error).message || 'unknown error'}`, { id: toastId });
    } finally {
      setEnriching(false);
    }
  };

  return (
    <section className="rounded-lg border border-[hsl(var(--rise-gold)/0.35)] bg-card/65 px-2.5 py-2 shadow-[0_0_18px_hsl(var(--rise-gold)/0.08)]">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto flex min-w-[12rem] items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[hsl(var(--rise-gold)/0.35)] bg-[hsl(var(--rise-gold)/0.12)] text-[hsl(var(--rise-gold))]">
            <Users className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[hsl(var(--rise-gold))]">
              Player database actions
            </div>
            <div className="text-[11px] font-semibold text-foreground">
              {countLoading ? 'Counting players…' : `${(livePlayerCount ?? 0).toLocaleString('en-GB')} players in database`}
            </div>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => openAdd('ai')}
          className="h-7 gap-1.5 border !border-[hsl(var(--rise-gold))] !bg-[hsl(var(--rise-gold))] px-2.5 text-[10px] font-black uppercase tracking-wider !text-background shadow-[0_0_14px_hsl(var(--rise-gold)/0.3)] hover:!bg-[hsl(var(--rise-gold)/0.88)]"
        >
          <UserPlus className="h-3.5 w-3.5" /> Add players
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => openAdd('ai')}
          className="h-7 gap-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-wider"
        >
          <Sparkles className="h-3.5 w-3.5" /> AI bulk add
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => openAdd('manual')}
          className="h-7 gap-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-wider"
        >
          Manual add
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={enrichMissing}
          disabled={enriching}
          title="Scan players missing nationality, date of birth or a Transfermarkt URL and backfill from Transfermarkt"
          className="h-7 gap-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-wider"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${enriching ? 'animate-spin' : ''}`} />
          {enriching
            ? `Enriching… ${progress?.updated ?? 0} updated${progress?.remaining != null ? ` · ${progress.remaining} left` : ''}`
            : 'Backfill from Transfermarkt'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={refreshAllTransfermarkt}
          disabled={refreshingAll}
          title="For every player with a Transfermarkt URL, pull the latest profile, headshot and current-season stats"
          className="h-7 gap-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-wider"
        >
          <Download className={`h-3.5 w-3.5 ${refreshingAll ? 'animate-pulse' : ''}`} />
          {refreshingAll
            ? `Refreshing… ${(refreshJob?.processed ?? 0).toLocaleString('en-GB')}${refreshJob?.total_players ? ` / ${refreshJob.total_players.toLocaleString('en-GB')}` : ''}`
            : 'Refresh all Transfermarkt data'}
        </Button>
        {refreshingAll && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={cancelRefresh}
            className="h-7 gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-destructive"
            title="Cancel the running Transfermarkt refresh"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </Button>
        )}
      </div>
      {addOpen && (
        <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <PlayerAddMode key={addMode} initialMode={addMode} onExit={() => setAddOpen(false)} />
        </div>
      )}
    </section>
  );
};

export const PlayerDatabaseManagement = ({ isAdmin: _isAdmin }: { isAdmin: boolean }) => {
  const [mode, setMode] = useState<Mode>('classic');
  return (
    <div className="space-y-4 rounded-xl border border-border/50 bg-background/40 p-3 md:p-4">
      <div className="flex items-center justify-end gap-1">
        <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Button
          type="button"
          size="sm"
          variant={mode === 'classic' ? 'default' : 'outline'}
          onClick={() => setMode('classic')}
          className="h-8 text-xs gap-1.5"
        >
          <LayoutGrid className="h-3.5 w-3.5" /> Classic
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'squad' ? 'default' : 'outline'}
          onClick={() => setMode('squad')}
          className="h-8 text-xs gap-1.5"
        >
          <TableIcon className="h-3.5 w-3.5" /> Squad view
        </Button>
        </div>
      </div>
      {mode === 'classic' ? <PlayerDatabase /> : <SquadView />}
    </div>
  );
};
