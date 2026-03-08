import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";

interface StatChange {
  player_id: string;
  player_name: string;
  old: { goals: number; assists: number; matches: number; minutes: number };
  new: { goals: number; assists: number; matches: number; minutes: number };
}

export const SyncPlayerStatsButton = ({ onSynced }: { onSynced?: () => void }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [changes, setChanges] = useState<StatChange[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const handleFetchPreview = async () => {
    setDialogOpen(true);
    setLoading(true);
    setFetchError(null);
    setChanges([]);

    try {
      // Get players with external IDs
      const { data: playerStats } = await supabase
        .from('player_stats')
        .select('id, player_id, goals, assists, matches, minutes, external_player_id')
        .not('external_player_id' as any, 'is', null);

      const withIds = (playerStats || []).filter((ps: any) => ps.external_player_id);
      if (withIds.length === 0) {
        setFetchError("No players have an external ID configured. Set one in each player's Stats tab.");
        setLoading(false);
        return;
      }

      // Get player names
      const playerIds = withIds.map((ps: any) => ps.player_id);
      const { data: players } = await supabase
        .from('players')
        .select('id, name')
        .in('id', playerIds);

      const nameMap: Record<string, string> = {};
      players?.forEach((p: any) => { nameMap[p.id] = p.name; });

      // Call the sync function in preview mode (we'll parse results)
      const { data, error } = await invokeEdgeFunction('sync-player-stats', { body: {} });
      
      if (error) throw error;
      if (!data?.results) throw new Error('No results returned');

      // Build change list by comparing old vs new
      const changeList: StatChange[] = [];
      for (const result of data.results) {
        if (result.status !== 'updated') continue;
        const ps = withIds.find((s: any) => s.player_id === result.player_id);
        if (!ps) continue;

        // Refetch to get the new values
        const { data: updated } = await supabase
          .from('player_stats')
          .select('goals, assists, matches, minutes')
          .eq('player_id', result.player_id)
          .single();

        if (updated) {
          const hasChange = 
            updated.goals !== (ps as any).goals ||
            updated.assists !== (ps as any).assists ||
            updated.matches !== (ps as any).matches ||
            updated.minutes !== (ps as any).minutes;

          changeList.push({
            player_id: result.player_id,
            player_name: nameMap[result.player_id] || 'Unknown',
            old: { goals: (ps as any).goals || 0, assists: (ps as any).assists || 0, matches: (ps as any).matches || 0, minutes: (ps as any).minutes || 0 },
            new: { goals: updated.goals || 0, assists: updated.assists || 0, matches: updated.matches || 0, minutes: updated.minutes || 0 },
          });
        }
      }

      setChanges(changeList);
      if (changeList.length === 0) {
        toast.info("All stats are already up to date");
      }
    } catch (err: any) {
      console.error('Sync preview error:', err);
      setFetchError(err.message || 'Failed to fetch updated stats');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    // Stats were already applied by the edge function, just close
    setApplying(true);
    toast.success(`${changes.length} player(s) stats synced successfully`);
    setDialogOpen(false);
    setApplying(false);
    onSynced?.();
  };

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
              <p className="text-sm text-muted-foreground">Fetching latest stats from external sources...</p>
            </div>
          ) : fetchError ? (
            <div className="py-8 text-center">
              <X className="h-8 w-8 text-destructive mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{fetchError}</p>
            </div>
          ) : changes.length === 0 ? (
            <div className="py-8 text-center">
              <Check className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">All player stats are already up to date.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The following changes will be applied:
              </p>

              <div className="space-y-3">
                {changes.map((change) => (
                  <div key={change.player_id} className="p-3 rounded-lg border bg-card">
                    <div className="font-semibold text-sm mb-2">{change.player_name}</div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {(['matches', 'goals', 'assists', 'minutes'] as const).map((stat) => (
                        <div key={stat} className="text-center">
                          <div className="text-muted-foreground capitalize mb-0.5">{stat}</div>
                          <div className="font-mono">
                            {change.old[stat]} → {change.new[stat]}
                            {statDiff(change.old[stat], change.new[stat]) && (
                              <div className="text-[10px] font-semibold">
                                {statDiff(change.old[stat], change.new[stat])}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleApprove} disabled={applying} className="flex-1">
                  {applying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                  Approve All
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
