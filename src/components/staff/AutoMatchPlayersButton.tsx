import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wand2, Check, X, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface MatchResult {
  player_id: string;
  player_name: string;
  status: 'matched' | 'not_found' | 'multiple' | 'already_set' | 'error';
  external_id?: string;
  tm_name?: string;
  tm_club?: string;
  tm_position?: string;
  tm_market_value?: string;
  error?: string;
}

const BATCH_SIZE = 10;

export const AutoMatchPlayersButton = ({ onComplete }: { onComplete?: () => void }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleSearch = async () => {
    setDialogOpen(true);
    setLoading(true);
    setFetchError(null);
    setResults([]);
    setSelected({});
    setProgress({ current: 0, total: 0 });

    try {
      // Fetch all players
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, name')
        .order('name');

      if (playersError) throw playersError;

      // Get existing external IDs to skip those
      const { data: existingStats } = await supabase
        .from('player_stats')
        .select('player_id, external_player_id');

      const existingMap: Record<string, string> = {};
      existingStats?.forEach(s => {
        if (s.external_player_id) existingMap[s.player_id] = s.external_player_id;
      });

      // Split into players needing matching vs already set
      const alreadySet: MatchResult[] = [];
      const toSearch: Array<{ id: string; name: string }> = [];

      (players || []).forEach(p => {
        if (existingMap[p.id]) {
          alreadySet.push({
            player_id: p.id,
            player_name: p.name,
            status: 'already_set',
            external_id: existingMap[p.id],
          });
        } else {
          toSearch.push({ id: p.id, name: p.name });
        }
      });

      setProgress({ current: 0, total: toSearch.length });
      const allResults: MatchResult[] = [...alreadySet];
      const autoSelect: Record<string, boolean> = {};

      // Process in batches
      for (let i = 0; i < toSearch.length; i += BATCH_SIZE) {
        const batch = toSearch.slice(i, i + BATCH_SIZE);

        const { data, error } = await invokeEdgeFunction('auto-match-players', {
          body: { players: batch },
        });

        if (error) {
          console.error('Batch error:', error);
          batch.forEach(p => {
            allResults.push({ player_id: p.id, player_name: p.name, status: 'error', error: 'Batch failed' });
          });
        } else if (data?.results) {
          data.results.forEach((r: MatchResult) => {
            allResults.push(r);
            if (r.status === 'matched' && r.external_id) {
              autoSelect[r.player_id] = true;
            }
          });
        }

        setProgress({ current: Math.min(i + BATCH_SIZE, toSearch.length), total: toSearch.length });
        setResults([...allResults]);
        setSelected({ ...autoSelect });
      }

      const matched = allResults.filter(r => r.status === 'matched').length;
      const notFound = allResults.filter(r => r.status === 'not_found').length;

      if (matched > 0) toast.success(`Found ${matched} match${matched !== 1 ? 'es' : ''}`);
      if (notFound > 0) toast.info(`${notFound} player${notFound !== 1 ? 's' : ''} not found`);
    } catch (err: any) {
      console.error('Auto-match error:', err);
      setFetchError(err.message || 'Failed to search players');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    const toApply: Record<string, string> = {};
    results.forEach(r => {
      if (selected[r.player_id] && r.external_id) {
        toApply[r.player_id] = r.external_id;
      }
    });

    if (Object.keys(toApply).length === 0) {
      toast.error('No players selected');
      return;
    }

    setApplying(true);
    try {
      const { data, error } = await invokeEdgeFunction('auto-match-players', {
        body: { apply: toApply },
      });

      if (error) throw error;

      toast.success(`${data?.applied || 0} player${(data?.applied || 0) !== 1 ? 's' : ''} linked`);
      setDialogOpen(false);
      onComplete?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply matches');
    } finally {
      setApplying(false);
    }
  };

  const toggleSelect = (playerId: string) => {
    setSelected(prev => ({ ...prev, [playerId]: !prev[playerId] }));
  };

  const matched = results.filter(r => r.status === 'matched');
  const notFound = results.filter(r => r.status === 'not_found');
  const alreadySet = results.filter(r => r.status === 'already_set');
  const errors = results.filter(r => r.status === 'error' || r.status === 'multiple');
  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={handleSearch}
        title="Auto-match players to Transfermarkt"
      >
        <Wand2 className="h-4 w-4" />
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Auto-Match Players</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Searching Transfermarkt... {progress.current}/{progress.total}
              </p>
              {progress.total > 0 && (
                <Progress value={(progress.current / progress.total) * 100} className="w-64" />
              )}
              {matched.length > 0 && (
                <p className="text-xs text-emerald-500">{matched.length} matched so far</p>
              )}
            </div>
          ) : fetchError ? (
            <div className="py-8 text-center">
              <X className="h-8 w-8 text-destructive mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{fetchError}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 min-h-0">
              {/* Summary */}
              <div className="flex flex-wrap gap-2 text-xs">
                {matched.length > 0 && (
                  <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 font-medium">
                    {matched.length} matched
                  </span>
                )}
                {alreadySet.length > 0 && (
                  <span className="px-2 py-1 rounded bg-muted text-muted-foreground font-medium">
                    {alreadySet.length} already linked
                  </span>
                )}
                {notFound.length > 0 && (
                  <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-600 font-medium">
                    {notFound.length} not found
                  </span>
                )}
                {errors.length > 0 && (
                  <span className="px-2 py-1 rounded bg-destructive/10 text-destructive font-medium">
                    {errors.length} errors
                  </span>
                )}
              </div>

              <ScrollArea className="flex-1 min-h-0 max-h-[55vh]">
                <div className="space-y-4 pr-4">
                  {/* Matched players */}
                  {matched.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Matched players</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => {
                            const allSelected = matched.every(r => selected[r.player_id]);
                            const updated = { ...selected };
                            matched.forEach(r => { updated[r.player_id] = !allSelected; });
                            setSelected(updated);
                          }}
                        >
                          {matched.every(r => selected[r.player_id]) ? 'Deselect all' : 'Select all'}
                        </Button>
                      </div>
                      {matched.map((result) => (
                        <div
                          key={result.player_id}
                          className="flex items-center gap-3 p-2.5 rounded-lg border bg-card cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => toggleSelect(result.player_id)}
                        >
                          <Checkbox
                            checked={!!selected[result.player_id]}
                            onCheckedChange={() => toggleSelect(result.player_id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{result.player_name}</span>
                              <span className="text-xs text-muted-foreground">→</span>
                              <span className="text-sm text-emerald-500">{result.tm_name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              {result.tm_club && <span>{result.tm_club}</span>}
                              {result.tm_position && <span>· {result.tm_position}</span>}
                              {result.tm_market_value && <span>· {result.tm_market_value}</span>}
                            </div>
                          </div>
                          <a
                            href={`https://www.transfermarkt.co.uk/x/profil/spieler/${result.external_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Not found */}
                  {notFound.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-amber-600">Not found on Transfermarkt</p>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {notFound.map((result) => (
                          <div key={result.player_id} className="py-0.5">
                            {result.player_name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Errors */}
                  {errors.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-destructive">Errors</p>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {errors.map((result) => (
                          <div key={result.player_id} className="py-0.5">
                            {result.player_name} — {result.error || 'Multiple results'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Actions */}
              {matched.length > 0 && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button onClick={handleApply} disabled={applying || selectedCount === 0} className="flex-1">
                    {applying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                    Link Selected ({selectedCount})
                  </Button>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                </div>
              )}

              {matched.length === 0 && results.length > 0 && (
                <div className="flex justify-end pt-2 border-t">
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
