import { useState } from 'react';
import { PlayerDatabase } from './PlayerDatabase';
import { PlayerAddMode } from './PlayerAddMode';
import { SquadView } from './SquadView';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Table as TableIcon, Sparkles, UserPlus, RefreshCw, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Mode = 'classic' | 'squad';
type AddMode = 'ai' | 'manual';

export const PlayerDatabaseActions = () => {
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('ai');
  const [enriching, setEnriching] = useState(false);
  const [progress, setProgress] = useState<{ updated: number; processed: number; remaining: number | null } | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState<{ updated: number; processed: number; remaining: number | null } | null>(null);

  const openAdd = (nextMode: AddMode) => {
    setAddMode(nextMode);
    setAddOpen(true);
  };

  const refreshAllTransfermarkt = async () => {
    if (refreshingAll) return;
    if (!confirm('Refresh every player that has a Transfermarkt URL? This pulls the latest profile, headshot and current-season stats.')) return;
    setRefreshingAll(true);
    setRefreshProgress({ updated: 0, processed: 0, remaining: null });
    const toastId = toast.loading('Refreshing players from Transfermarkt…');
    let totalUpdated = 0;
    let totalProcessed = 0;
    const processedIds = new Set<string>();
    try {
      while (true) {
        const { data, error } = await supabase.functions.invoke('parse-players-bulk', {
          body: { mode: 'refresh_all', limit: 10, skipIds: Array.from(processedIds) },
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
        setRefreshProgress({ updated: totalUpdated, processed: totalProcessed, remaining });
        toast.loading(`Refreshing — ${totalUpdated} updated, ${remaining ?? '?'} remaining`, { id: toastId });
        if (processed === 0 || (remaining !== null && remaining === 0)) break;
      }
      toast.success(`Refresh complete — updated ${totalUpdated} of ${totalProcessed} scanned`, { id: toastId });
      if (totalUpdated > 0) window.dispatchEvent(new CustomEvent('player-database-refresh'));
    } catch (err) {
      console.error('refresh_all failed', err);
      toast.error(`Refresh failed: ${(err as Error).message || 'unknown error'}`, { id: toastId });
    } finally {
      setRefreshingAll(false);
    }
  };

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
        <div className="mr-auto min-w-0 text-[10px] font-black uppercase tracking-[0.18em] text-[hsl(var(--rise-gold))]">
          Player database actions
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
            ? `Refreshing… ${refreshProgress?.updated ?? 0} updated${refreshProgress?.remaining != null ? ` · ${refreshProgress.remaining} left` : ''}`
            : 'Refresh all Transfermarkt data'}
        </Button>
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
