import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, Check, X, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";

interface SyncResult {
  player_id: string;
  player_name: string;
  status: string;
  error?: string;
  old_stats?: { goals: number; assists: number; matches: number; minutes: number };
  new_stats?: { goals: number; assists: number; matches: number; minutes: number };
}

export const SyncPlayerStatsButton = ({ onSynced }: { onSynced?: () => void }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [results, setResults] = useState<SyncResult[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(true);
  const [totalPlayersWithoutId, setTotalPlayersWithoutId] = useState(0);

  const handleFetchPreview = async () => {
    setDialogOpen(true);
    setLoading(true);
    setFetchError(null);
    setResults([]);
    setIsPreview(true);

    try {
      // Check how many players have external IDs vs don't
      const { data: allStats } = await supabase
        .from('player_stats')
        .select('external_player_id');

      const withIds = (allStats || []).filter((ps: any) => ps.external_player_id);
      const withoutIds = (allStats || []).length - withIds.length;
      setTotalPlayersWithoutId(withoutIds);

      if (withIds.length === 0) {
        setFetchError("No players have an external ID configured. Set a Transfermarkt ID in each player's Stats tab to enable syncing.");
        setLoading(false);
        return;
      }

      // Call sync in preview mode
      const { data, error } = await invokeEdgeFunction('sync-player-stats', {
        body: { preview: true },
      });

      if (error) throw error;
      if (!data?.results) throw new Error('No results returned');

      setResults(data.results);

      const changed = data.results.filter((r: SyncResult) => r.status === 'changed');
      const failed = data.results.filter((r: SyncResult) => r.status === 'fetch_failed');
      
      if (changed.length === 0 && failed.length === 0) {
        toast.info("All stats are already up to date");
      } else if (changed.length === 0 && failed.length > 0) {
        toast.error(`Failed to fetch stats for ${failed.length} player(s)`);
      }
    } catch (err: any) {
      console.error('Sync preview error:', err);
      setFetchError(err.message || 'Failed to fetch updated stats');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setApplying(true);
    try {
      // Call sync again without preview to actually apply
      const { data, error } = await invokeEdgeFunction('sync-player-stats', {
        body: { preview: false },
      });

      if (error) throw error;
      
      const applied = data?.updated || 0;
      toast.success(`${applied} player(s) stats synced successfully`);
      setDialogOpen(false);
      onSynced?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply updates');
    } finally {
      setApplying(false);
    }
  };

  const changed = results.filter(r => r.status === 'changed');
  const noChange = results.filter(r => r.status === 'no_change');
  const failed = results.filter(r => r.status === 'fetch_failed' || r.status === 'db_error');

  const statDiff = (oldVal: number, newVal: number) => {
    const diff = newVal - oldVal;
    if (diff === 0) return null;
    return (
      <span className={diff > 0 ? 'text-emerald-500' : 'text-red-500'}>
        {diff > 0 ? '+' : ''}{diff}
      </span>
    );
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={handleFetchPreview}
        title="Sync player stats"
      >
        <RefreshCw className="h-4 w-4" />
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sync Player Stats</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Fetching latest stats from Transfermarkt...</p>
            </div>
          ) : fetchError ? (
            <div className="py-8 text-center">
              <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{fetchError}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex flex-wrap gap-2 text-xs">
                {changed.length > 0 && (
                  <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 font-medium">
                    {changed.length} update{changed.length !== 1 ? 's' : ''} available
                  </span>
                )}
                {noChange.length > 0 && (
                  <span className="px-2 py-1 rounded bg-muted text-muted-foreground font-medium">
                    {noChange.length} already up to date
                  </span>
                )}
                {failed.length > 0 && (
                  <span className="px-2 py-1 rounded bg-destructive/10 text-destructive font-medium">
                    {failed.length} failed to fetch
                  </span>
                )}
                {totalPlayersWithoutId > 0 && (
                  <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-600 font-medium">
                    {totalPlayersWithoutId} missing external ID
                  </span>
                )}
              </div>

              {/* Changes to apply */}
              {changed.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Changes to apply:</p>
                  {changed.map((result) => (
                    <div key={result.player_id} className="p-3 rounded-lg border bg-card">
                      <div className="font-semibold text-sm mb-2">{result.player_name}</div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        {(['matches', 'goals', 'assists', 'minutes'] as const).map((stat) => (
                          <div key={stat} className="text-center">
                            <div className="text-muted-foreground capitalize mb-0.5">{stat}</div>
                            <div className="font-mono">
                              {result.old_stats?.[stat] || 0} → {result.new_stats?.[stat] || 0}
                              {statDiff(result.old_stats?.[stat] || 0, result.new_stats?.[stat] || 0) && (
                                <div className="text-[10px] font-semibold">
                                  {statDiff(result.old_stats?.[stat] || 0, result.new_stats?.[stat] || 0)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Failed fetches */}
              {failed.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">Failed to fetch:</p>
                  {failed.map((result) => (
                    <div key={result.player_id} className="p-2 rounded border border-destructive/20 bg-destructive/5 text-xs flex items-center gap-2">
                      <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                      <span className="font-medium">{result.player_name}</span>
                      <span className="text-muted-foreground ml-auto">{result.error || 'Unknown error'}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* No changes case */}
              {changed.length === 0 && failed.length === 0 && (
                <div className="py-6 text-center">
                  <Check className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">All player stats are already up to date.</p>
                </div>
              )}

              {/* Action buttons */}
              {changed.length > 0 && (
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleApprove} disabled={applying} className="flex-1">
                    {applying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                    Approve All ({changed.length})
                  </Button>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                </div>
              )}

              {changed.length === 0 && (
                <div className="flex justify-end pt-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
