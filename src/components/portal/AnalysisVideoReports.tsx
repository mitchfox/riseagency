import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Play, Pause, SkipBack, SkipForward, X, Maximize, Trash2, Download, CheckSquare, Film, ListVideo, Star, Loader2 } from "lucide-react";
import { downloadVideo } from "@/lib/videoDownload";
import { computeVisibleElements } from "@/lib/annotationRenderUtils";
import { ReadOnlyAnnotationOverlay } from "@/components/portal/ReadOnlyAnnotationOverlay";
import { toTitleCase } from "@/lib/titleCase";

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
  clip_annotations: any[] | null;
  // Joined
  opponent?: string;
  match_date?: string;
}

interface Props {
  analyses: Analysis[];
  playerId: string;
  embedded?: boolean;
}

/** Parse #t=start,end fragment from a video URL for legacy boundary enforcement */
const parseTimeFragment = (url: string | null | undefined) => {
  if (!url) return null;
  const match = url.match(/#t=([\d.]+),([\d.]+)/);
  return match ? { start: parseFloat(match[1]), end: parseFloat(match[2]) } : null;
};

export const AnalysisVideoReports = ({ analyses, playerId, embedded }: Props) => {
  const [allActions, setAllActions] = useState<ActionClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [selectedActionTypes, setSelectedActionTypes] = useState<string[]>([]);
  const [compilationClips, setCompilationClips] = useState<ActionClip[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedClipIds, setSelectedClipIds] = useState<Set<string>>(new Set());
  const [savingToBestClips, setSavingToBestClips] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchActions = async () => {
      if (analyses.length === 0) { setLoading(false); return; }
      const ids = analyses.map(a => a.id);
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
          clip_annotations: Array.isArray(a.clip_annotations) ? a.clip_annotations : null,
          opponent: match?.opponent || 'Unknown',
          match_date: match?.analysis_date,
        };
      });
      setAllActions(enriched);
      setLoading(false);
    };
    fetchActions();
  }, [analyses]);

  // Split comma-separated action types into individual categories and sort by frequency
  const actionTypes = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    allActions.forEach(a => {
      if (!a.action_type) return;
      const parts = a.action_type.includes(',')
        ? a.action_type.split(',').map(t => t.trim()).filter(Boolean)
        : [a.action_type];
      parts.forEach(t => { typeCounts[t] = (typeCounts[t] || 0) + 1; });
    });
    return Object.keys(typeCounts).sort((a, b) => {
      const diff = typeCounts[b] - typeCounts[a];
      return diff !== 0 ? diff : a.localeCompare(b);
    });
  }, [allActions]);

  // Categorise types
  const categoriseType = (type: string): string => {
    const t = type.toLowerCase();
    if (['goal', 'assist', 'key pass', 'chance created', 'shot on target'].some(k => t.includes(k))) return 'Key Actions';
    if (['dribble', 'carry', 'pass', 'cross', 'through ball', 'attacking', 'build-up', 'shot', 'set-piece', 'corner', 'free-kick', 'penalty', 'throw-in', 'goal-kick'].some(k => t.includes(k))) return 'Offensive';
    if (['tackle', 'interception', 'block', 'clearance', 'defensive', 'pressing', 'recovery', 'aerial', 'header', 'regain'].some(k => t.includes(k))) return 'Defensive';
    return 'Other';
  };

  // Best actions: score >= 0.05
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

  const toggleActionType = (type: string) => {
    setSelectedActionTypes(prev => prev.includes(type) ? prev.filter(x => x !== type) : [...prev, type]);
  };

  // Check if an action matches selected types (handles comma-separated)
  const actionMatchesTypes = (action: ActionClip, types: string[]) => {
    if (types.length === 0) return true;
    const actionTypes = action.action_type.includes(',')
      ? action.action_type.split(',').map(t => t.trim()).filter(Boolean)
      : [action.action_type];
    return actionTypes.some(t => types.includes(t));
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
    setSelectedClipIds(new Set(clips.map(c => c.id)));
    setCurrentClipIndex(0);
    setIsPlaying(true);
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
    setSelectedClipIds(new Set(clips.map(c => c.id)));
    setCurrentClipIndex(0);
    setIsPlaying(true);
    setModalOpen(true);
  };

  const currentClip = compilationClips[currentClipIndex];

  const handleVideoEnded = () => {
    if (currentClipIndex < compilationClips.length - 1) {
      setCurrentClipIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    if (videoRef.current && isPlaying && modalOpen) {
      videoRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [currentClipIndex, modalOpen]);

  const toggleClipSelection = (id: string) => {
    setSelectedClipIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const removeClip = (index: number) => {
    const clip = compilationClips[index];
    setCompilationClips(prev => prev.filter((_, i) => i !== index));
    setSelectedClipIds(prev => { const n = new Set(prev); n.delete(clip.id); return n; });
    if (currentClipIndex >= compilationClips.length - 1) setCurrentClipIndex(Math.max(0, compilationClips.length - 2));
  };

  const handleExport = (mode: 'all' | 'selected' | 'single') => {
    if (mode === 'single' && currentClip?.video_url) {
      downloadVideo(currentClip.video_url, `clip-${currentClip.action_number}`);
    } else if (mode === 'selected') {
      compilationClips.filter(c => selectedClipIds.has(c.id) && c.video_url).forEach((c, i) => {
        setTimeout(() => downloadVideo(c.video_url!, `clip-${i + 1}-${c.action_type}`), i * 500);
      });
    } else {
      compilationClips.filter(c => c.video_url).forEach((c, i) => {
        setTimeout(() => downloadVideo(c.video_url!, `clip-${i + 1}-${c.action_type}`), i * 500);
      });
    }
  };

  const handleSaveToBestClips = async (clip: ActionClip) => {
    if (!clip.video_url) return;
    setSavingToBestClips(clip.id);
    try {
      // Fetch current player highlights
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

      // Check if already saved
      if (bestClips.some((c: any) => c.videoUrl === clip.video_url)) {
        toast.info('This clip is already in Best Clips');
        setSavingToBestClips(null);
        return;
      }

      bestClips.push({
        name: `${toTitleCase(clip.action_type)} vs ${clip.opponent}${clip.minute != null ? ` (${clip.minute}')` : ''}`,
        videoUrl: clip.video_url,
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
                {/* Best Actions button - always first */}
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
                            // Clear best actions filter when selecting specific types
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

        {/* Widescreen compilation modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-[95vw] w-full p-0 overflow-hidden bg-black border-none">
            {currentClip && (
              <div className="flex flex-col h-[90vh]">
                {/* Video area */}
                <div className="relative flex-1 min-h-0 bg-black flex items-center justify-center">
                  {/* Info overlay */}
                  <div className="absolute top-3 left-3 z-10 bg-black/70 text-white text-sm px-3 py-2 rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-primary text-primary-foreground text-xs">{currentClipIndex + 1}/{compilationClips.length}</Badge>
                      <span className="font-semibold">{toTitleCase(currentClip.action_type)}</span>
                    </div>
                    <p className="text-xs text-white/70">
                      vs {currentClip.opponent} {currentClip.minute != null && `· ${currentClip.minute}'`}
                    </p>
                    {currentClip.action_description && (
                      <p className="text-xs text-white/60 mt-0.5">{currentClip.action_description}</p>
                    )}
                  </div>

                  {/* Close + fullscreen */}
                  <div className="absolute top-3 right-3 z-10 flex gap-2">
                    <Button variant="ghost" size="icon" className="bg-black/50 hover:bg-black/70 text-white"
                      onClick={() => {
                        // Use the inner container ref that wraps both video + annotation overlay
                        const container = document.getElementById('analysis-video-fullscreen-container');
                        (container || videoRef.current)?.requestFullscreen?.();
                      }}>
                      <Maximize className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="bg-black/50 hover:bg-black/70 text-white"
                      onClick={() => setModalOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div id="analysis-video-fullscreen-container" className="relative max-h-full max-w-full">
                    <video
                      ref={videoRef}
                      src={currentClip.video_url || ''}
                      className="max-h-full max-w-full aspect-video object-fill"
                      autoPlay muted playsInline loop
                      onEnded={handleVideoEnded}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onLoadedMetadata={() => {
                        const boundaries = parseTimeFragment(currentClip.video_url);
                        if (boundaries && videoRef.current) {
                          videoRef.current.currentTime = boundaries.start;
                        }
                      }}
                      onTimeUpdate={() => {
                        const boundaries = parseTimeFragment(currentClip.video_url);
                        if (boundaries && videoRef.current && videoRef.current.currentTime >= boundaries.end) {
                          videoRef.current.currentTime = boundaries.start;
                        }
                      }}
                    />
                    {currentClip.clip_annotations && currentClip.clip_annotations.length > 0 && (
                      <ReadOnlyAnnotationOverlay
                        elements={currentClip.clip_annotations}
                        videoRef={videoRef}
                        clipStart={(() => {
                          const boundaries = parseTimeFragment(currentClip.video_url);
                          return boundaries?.start || 0;
                        })()}
                      />
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="bg-black/95 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20"
                      disabled={currentClipIndex === 0}
                      onClick={() => setCurrentClipIndex(i => i - 1)}>
                      <SkipBack className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-10 w-10"
                      onClick={() => {
                        if (videoRef.current) { isPlaying ? videoRef.current.pause() : videoRef.current.play(); }
                      }}>
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20"
                      disabled={currentClipIndex >= compilationClips.length - 1}
                      onClick={() => setCurrentClipIndex(i => i + 1)}>
                      <SkipForward className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Export dropdown */}
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => handleExport('single')}>
                      <Download className="h-4 w-4 mr-1" /> Clip
                    </Button>
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => handleExport('selected')}>
                      <CheckSquare className="h-4 w-4 mr-1" /> Selected ({selectedClipIds.size})
                    </Button>
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => handleExport('all')}>
                      <Download className="h-4 w-4 mr-1" /> All
                    </Button>
                  </div>
                </div>

                {/* Clip list */}
                <div className="bg-black/95 px-4 pb-3 max-h-[150px] overflow-y-auto">
                  <div className="space-y-1">
                    {compilationClips.map((clip, index) => (
                      <div
                        key={clip.id}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer transition-colors ${
                          index === currentClipIndex ? 'bg-primary text-primary-foreground' : 'text-white/80 hover:bg-white/10'
                        }`}
                      >
                        <Checkbox
                          checked={selectedClipIds.has(clip.id)}
                          onCheckedChange={() => toggleClipSelection(clip.id)}
                          className="border-white/50"
                        />
                        <button className="flex-1 text-left" onClick={() => setCurrentClipIndex(index)}>
                          <span className="font-mono text-xs opacity-60">#{clip.action_number}</span>{' '}
                          {toTitleCase(clip.action_type)} · vs {clip.opponent}
                          {clip.minute != null && <span className="opacity-60"> · {clip.minute}'</span>}
                        </button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-white/50 hover:text-yellow-400"
                          title="Save to Best Clips"
                          disabled={savingToBestClips === clip.id}
                          onClick={(e) => { e.stopPropagation(); handleSaveToBestClips(clip); }}>
                          {savingToBestClips === clip.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Star className="h-3 w-3" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-white/50 hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); removeClip(index); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
