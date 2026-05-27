import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Film, ListVideo } from "lucide-react";
import { downloadVideo } from "@/lib/videoDownload";
import { toTitleCase } from "@/lib/titleCase";
import { ClippedActionsPlayer } from "@/components/ClippedActionsPlayer";
import { canonicalSplit, canonicalActionType } from "@/lib/actionTypeNormaliser";

interface Analysis {
  id: string;
  analysis_date: string;
  opponent: string | null;
  result: string | null;
  minutes_played: number | null;
}

interface ActionClip {
  id: string;
  analysis_id: string;
  action_number: number;
  action_type: string;
  action_description: string | null;
  action_score: number | null;
  minute: number | null;
  video_url: string | null;
  is_successful: boolean | null;
  clip_start: number | null;
  clip_end: number | null;
  notes: string | null;
  // Joined
  opponent?: string;
  match_date?: string;
}

interface Props {
  analyses: Analysis[];
  playerId: string;
  embedded?: boolean;
}

export const AnalysisVideoReports = ({ analyses, playerId, embedded }: Props) => {
  const [allActions, setAllActions] = useState<ActionClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [selectedActionTypes, setSelectedActionTypes] = useState<string[]>([]);
  const [compilationClips, setCompilationClips] = useState<ActionClip[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [savingToBestClips, setSavingToBestClips] = useState<string | null>(null);

  useEffect(() => {
    const fetchActions = async () => {
      if (analyses.length === 0) { setLoading(false); return; }
      // Filter out synthetic fixture-* placeholder rows from Dashboard;
      // only real player_analysis UUIDs are valid for the IN() filter.
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const ids = analyses.map(a => a.id).filter(id => UUID_RE.test(id));
      if (ids.length === 0) { setAllActions([]); setLoading(false); return; }
      const { data, error } = await supabase
        .from('performance_report_actions')
        .select('*')
        .in('analysis_id', ids)
        .not('video_url', 'is', null)
        .order('action_number');
      if (error) { console.error(error); setLoading(false); return; }

      const enriched = (data || []).map(a => {
        const match = analyses.find(an => an.id === a.analysis_id);
        return {
          ...a,
          opponent: match?.opponent || 'Unknown',
          match_date: match?.analysis_date,
        };
      });
      setAllActions(enriched as ActionClip[]);
      setLoading(false);
    };
    fetchActions();
  }, [analyses]);

  // Split comma-separated action types into individual categories and sort by frequency
  const actionTypes = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    allActions.forEach(a => {
      const parts = canonicalSplit(a.action_type);
      parts.forEach(t => { typeCounts[t] = (typeCounts[t] || 0) + 1; });
    });
    return Object.keys(typeCounts).sort((a, b) => {
      const diff = typeCounts[b] - typeCounts[a];
      return diff !== 0 ? diff : a.localeCompare(b);
    });
  }, [allActions]);

  const categoriseType = (type: string): string => {
    const t = type.toLowerCase();
    if (['goal', 'assist', 'key pass', 'chance created', 'shot on target'].some(k => t.includes(k))) return 'Key Actions';
    if (['dribble', 'carry', 'pass', 'cross', 'through ball', 'attacking', 'build-up', 'shot', 'set-piece', 'corner', 'free-kick', 'penalty', 'throw-in', 'goal-kick'].some(k => t.includes(k))) return 'Offensive';
    if (['tackle', 'interception', 'block', 'clearance', 'defensive', 'pressing', 'recovery', 'aerial', 'header', 'regain'].some(k => t.includes(k))) return 'Defensive';
    return 'Other';
  };

  const bestActions = useMemo(() => {
    return allActions.filter(a => a.action_score != null && a.action_score >= 0.05);
  }, [allActions]);

  const categoryOrder = ['Best Actions', 'Key Actions', 'Offensive', 'Defensive', 'Other'];
  const sortedActionTypes = useMemo(() => {
    return [...actionTypes].sort((a, b) => {
      const catA = categoryOrder.indexOf(categoriseType(a));
      const catB = categoryOrder.indexOf(categoriseType(b));
      if (catA !== catB) return catA - catB;
      return a.localeCompare(b);
    });
  }, [actionTypes]);

  const toggleMatch = (id: string) => {
    setSelectedMatches(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAllMatches = () => {
    setSelectedMatches(analyses.map(a => a.id));
  };

  const actionMatchesTypes = (action: ActionClip, types: string[]) => {
    if (types.length === 0) return true;
    const canonical = canonicalSplit(action.action_type);
    return canonical.some(t => types.includes(t));
  };

  const generateCompilation = () => {
    const isBestMode = selectedActionTypes.includes('__best__');
    const clips = allActions.filter(a => {
      if (!selectedMatches.includes(a.analysis_id)) return false;
      if (isBestMode) return a.action_score != null && a.action_score >= 0.05;
      return actionMatchesTypes(a, selectedActionTypes.filter(t => t !== '__best__'));
    }).sort((a, b) => {
      const dateA = a.match_date || '';
      const dateB = b.match_date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return a.action_number - b.action_number;
    });

    if (clips.length === 0) {
      toast.error('No clips match your selection');
      return;
    }
    setCompilationClips(clips);
    setModalOpen(true);
  };

  const generateFullReport = () => {
    setSelectedMatches(analyses.map(a => a.id));
    setSelectedActionTypes([]);
    const clips = allActions.sort((a, b) => {
      const matchA = analyses.find(an => an.id === a.analysis_id);
      const matchB = analyses.find(an => an.id === b.analysis_id);
      const dateA = matchA?.analysis_date || '';
      const dateB = matchB?.analysis_date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return a.action_number - b.action_number;
    });
    if (clips.length === 0) { toast.error('No clips available'); return; }
    setCompilationClips(clips);
    setModalOpen(true);
  };

  const handleDownloadCurrent = (clip: any) => {
    const found = compilationClips.find(c => c.id === clip.id);
    if (!found?.video_url) return;
    if (found.clip_start != null && found.clip_end != null) {
      toast.error("This clip is part of a full match file and can't be downloaded directly. Re-export the report to generate standalone clips.");
      return;
    }
    downloadVideo(found.video_url, `clip-${found.action_number}-${found.action_type}`);
    toast.success('Download started');
  };

  const handleDownloadAll = (clips: any[]) => {
    const valid = clips.filter(c => c.video_url && (c.clip_start == null || c.clip_end == null));
    const skipped = clips.length - valid.length;
    if (valid.length === 0) { toast.error('No standalone clips available to download'); return; }
    valid.forEach((c, i) => {
      setTimeout(() => downloadVideo(c.video_url, `clip-${i + 1}-${c.action_type}`), i * 500);
    });
    toast.success(skipped > 0 ? `Downloading ${valid.length} clips (${skipped} skipped — full match)` : `Downloading ${valid.length} clips…`);
  };

  const handleSaveToBestClips = async (clip: any) => {
    const full = compilationClips.find(c => c.id === clip.id);
    if (!full?.video_url) return;
    setSavingToBestClips(clip.id);
    try {
      const { data: playerData, error: fetchErr } = await supabase
        .from('players')
        .select('highlights')
        .eq('id', playerId)
        .single();
      if (fetchErr) throw fetchErr;

      const highlights = typeof playerData?.highlights === 'string'
        ? JSON.parse(playerData.highlights)
        : playerData?.highlights || {};

      const bestClips = Array.isArray(highlights.bestClips) ? highlights.bestClips : [];

      if (bestClips.some((c: any) => c.videoUrl === full.video_url)) {
        toast.info('This clip is already in Best Clips');
        setSavingToBestClips(null);
        return;
      }

      bestClips.push({
        name: `${toTitleCase(full.action_type)} vs ${full.opponent}${full.minute != null ? ` (${full.minute}')` : ''}`,
        videoUrl: full.video_url,
        addedAt: new Date().toISOString(),
      });

      const { error: updateErr } = await supabase
        .from('players')
        .update({ highlights: { ...highlights, bestClips } })
        .eq('id', playerId);
      if (updateErr) throw updateErr;

      toast.success('Saved to Best Clips');
    } catch (err: any) {
      toast.error('Failed to save: ' + (err.message || 'Unknown error'));
    }
    setSavingToBestClips(null);
  };

  // Map clips to the shape ClippedActionsPlayer expects
  const playerClips = useMemo(() => compilationClips.map(c => ({
    id: c.id,
    action_number: c.action_number,
    action_type: c.action_type,
    action_description: c.action_description || '',
    video_url: c.video_url || '',
    minute: c.minute ?? 0,
    notes: c.notes,
    clip_start: c.clip_start,
    clip_end: c.clip_end,
    action_score: c.action_score,
  })), [compilationClips]);

  return (
    <Card className={embedded ? "rounded-none border-0 shadow-none" : "w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0"}>
      {!embedded && (
        <CardHeader marble>
          <div className="container mx-auto px-4">
            <CardTitle className="font-heading tracking-tight">Video Reports</CardTitle>
          </div>
        </CardHeader>
      )}
      <CardContent className={embedded ? "p-0 space-y-6" : "container mx-auto px-4 space-y-6 py-6"}>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading clips...</div>
        ) : allActions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No action clips available from your reports.</div>
        ) : (
          <>
            {/* Step 1: Select action types */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-2">Step 1: Select Action Types</h3>
              <div className="space-y-2">
                {bestActions.length > 0 && (
                  <>
                    <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mt-2 mb-1">Best Actions</span>
                    <button
                      onClick={() => {
                        if (selectedActionTypes.includes('__best__')) {
                          setSelectedActionTypes(prev => prev.filter(x => x !== '__best__'));
                        } else {
                          setSelectedActionTypes(['__best__']);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-sm transition-colors mr-2 mb-1 ${
                        selectedActionTypes.includes('__best__') ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
                      }`}
                    >
                      Best Actions ({bestActions.length})
                    </button>
                  </>
                )}
                {(() => {
                  let lastCategory = '';
                  return sortedActionTypes.map(type => {
                    const category = categoriseType(type);
                    const showHeader = category !== lastCategory;
                    lastCategory = category;
                    return (
                      <span key={type}>
                        {showHeader && (
                          <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mt-2 mb-1">{category}</span>
                        )}
                        <button
                          onClick={() => {
                            setSelectedActionTypes(prev => {
                              const withoutBest = prev.filter(x => x !== '__best__');
                              return withoutBest.includes(type) ? withoutBest.filter(x => x !== type) : [...withoutBest, type];
                            });
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-sm transition-colors mr-2 mb-1 ${
                            selectedActionTypes.includes(type) ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
                          }`}
                        >
                          {toTitleCase(type)}
                        </button>
                      </span>
                    );
                  });
                })()}
                {selectedActionTypes.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedActionTypes([])}>Clear</Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Leave empty to include all action types</p>
            </div>

            {/* Step 2: Select matches */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider">Step 2: Select Matches</h3>
                <Button variant="ghost" size="sm" onClick={selectAllMatches}>Select All</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {analyses.filter(a => allActions.some(ac => ac.analysis_id === a.id)).map(a => (
                  <button
                    key={a.id}
                    onClick={() => toggleMatch(a.id)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                      selectedMatches.includes(a.id) ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
                    }`}
                  >
                    {a.opponent ? `vs ${a.opponent}` : new Date(a.analysis_date).toLocaleDateString('en-GB')}
                    {a.result && <span className="ml-1 opacity-70">({a.result})</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate buttons */}
            {selectedMatches.length > 0 && (
              <div className="flex gap-3 flex-wrap">
                <Button onClick={generateCompilation}>
                  <Film className="w-4 h-4 mr-2" /> Watch
                </Button>
                <Button variant="outline" onClick={generateFullReport}>
                  <ListVideo className="w-4 h-4 mr-2" /> Full Action Report Video
                </Button>
              </div>
            )}
          </>
        )}

        {/* Shared player — match-report parity */}
        <ClippedActionsPlayer
          open={modalOpen}
          onOpenChange={setModalOpen}
          clips={playerClips}
          title="Video Report"
          showDownloads
          onDownloadCurrent={handleDownloadCurrent}
          onDownloadAll={handleDownloadAll}
          onSaveToBest={handleSaveToBestClips}
          savingClipId={savingToBestClips}
          playerId={playerId}
        />
      </CardContent>
    </Card>
  );
};
