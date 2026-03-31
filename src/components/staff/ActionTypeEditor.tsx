import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Save, Search, ChevronDown, ChevronRight, Play, Pause, SkipBack, SkipForward, Video, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatScoreWithFrequency } from "@/lib/utils";
import { canonicalActionType } from "@/lib/playerActionFrequency";
import { ScoreDropdown } from "./ScoreDropdown";
import { ZonePitchSelector, type ZonePoint } from "@/components/report/ZonePitchSelector";
import { supabase } from "@/integrations/supabase/client";
import type { RecordedStat } from "./ActionStatRecorder";

interface PerformanceAction {
  id?: string;
  action_number: number;
  minute: string;
  action_score: string;
  action_type: string;
  action_description: string;
  notes: string;
  video_url?: string | null;
  clip_start?: number | null;
  clip_end?: number | null;
  recorded_stat?: RecordedStat | RecordedStat[] | null;
  zone?: number | null;
  zone_details?: ZonePoint[] | null;
}

interface R90Rating {
  score: number | string;
  title: string;
  description: string;
}

interface ActionTypeEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: PerformanceAction[];
  updateAction: (index: number, field: keyof PerformanceAction, value: any) => void;
  onSave: () => void;
  saving: boolean;
  allR90Ratings: R90Rating[];
  openR90Viewer: (actionIndex: number) => void;
  actionTypes: string[];
  actionTypeFrequencyMap: Record<string, number>;
  getDescriptionsForType: (type: string) => string[];
}

// Fetch top 3 scores for a given action type
let scoresByTypeCache: Record<string, { value: string; count: number }[]> = {};

async function fetchTopScoresForType(actionType: string): Promise<{ value: string; count: number }[]> {
  const key = canonicalActionType(actionType);
  if (scoresByTypeCache[key]) return scoresByTypeCache[key];

  const freq: Record<string, number> = {};
  const PAGE = 1000;
  let from = 0;
  let keepGoing = true;

  while (keepGoing) {
    const { data, error } = await supabase
      .from("performance_report_actions")
      .select("action_score, action_type")
      .not("action_score", "is", null)
      .range(from, from + PAGE - 1);
    if (error || !data) break;
    data.forEach((row: any) => {
      if (row.action_score == null || !row.action_type) return;
      if (canonicalActionType(row.action_type) !== key) return;
      const k = String(parseFloat(Number(row.action_score).toFixed(5)));
      freq[k] = (freq[k] || 0) + 1;
    });
    if (data.length < PAGE) keepGoing = false;
    from += PAGE;
  }

  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([val, count]) => ({ value: val, count }));

  scoresByTypeCache[key] = sorted;
  return sorted;
}

export const ActionTypeEditor = ({
  open,
  onOpenChange,
  actions,
  updateAction,
  onSave,
  saving,
  allR90Ratings,
  openR90Viewer,
  actionTypes,
  actionTypeFrequencyMap,
  getDescriptionsForType,
}: ActionTypeEditorProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedActions, setExpandedActions] = useState<Set<number>>(new Set());
  const [activeClipIndex, setActiveClipIndex] = useState<number | null>(null);
  const [topScores, setTopScores] = useState<{ value: string; count: number }[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);

  // Group actions by action_type category
  const groupedActions = useMemo(() => {
    const groups: Record<string, { action: PerformanceAction; index: number }[]> = {};
    actions.forEach((action, index) => {
      const type = action.action_type ? canonicalActionType(action.action_type) : "Uncategorised";
      if (!groups[type]) groups[type] = [];
      groups[type].push({ action, index });
    });
    const sorted = Object.entries(groups).sort(([a], [b]) => {
      if (a === "Uncategorised") return 1;
      if (b === "Uncategorised") return -1;
      return a.localeCompare(b);
    });
    return sorted;
  }, [actions]);

  const categoriesToShow = selectedCategory
    ? groupedActions.filter(([cat]) => cat === selectedCategory)
    : groupedActions;

  // Flat list of clips for the selected category (actions with video_url)
  const categoryClips = useMemo(() => {
    const items: { action: PerformanceAction; index: number }[] = [];
    categoriesToShow.forEach(([, actionItems]) => {
      actionItems.forEach(item => {
        if (item.action.video_url) items.push(item);
      });
    });
    return items;
  }, [categoriesToShow]);

  // Load top scores when category changes
  useEffect(() => {
    if (!selectedCategory) {
      setTopScores([]);
      return;
    }
    fetchTopScoresForType(selectedCategory).then(setTopScores);
  }, [selectedCategory]);

  // Play the active clip
  useEffect(() => {
    if (activeClipIndex === null) {
      setVideoReady(false);
      setVideoPlaying(false);
      return;
    }
    const clip = categoryClips[activeClipIndex];
    if (!clip?.action.video_url) return;
    setVideoReady(false);
    setVideoPlaying(false);
    const vid = videoRef.current;
    if (vid) {
      vid.src = clip.action.video_url;
      vid.load();
    }
  }, [activeClipIndex, categoryClips]);

  const handleCanPlay = useCallback(() => {
    setVideoReady(true);
    const vid = videoRef.current;
    if (vid) {
      vid.play().then(() => setVideoPlaying(true)).catch(() => {});
    }
  }, []);

  const togglePlayPause = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().then(() => setVideoPlaying(true)).catch(() => {});
    } else {
      vid.pause();
      setVideoPlaying(false);
    }
  };

  const goToClip = (direction: number) => {
    if (categoryClips.length === 0) return;
    setActiveClipIndex(prev => {
      if (prev === null) return 0;
      const next = prev + direction;
      if (next < 0) return categoryClips.length - 1;
      if (next >= categoryClips.length) return 0;
      return next;
    });
  };

  const openClipForAction = (actionIndex: number) => {
    const clipIdx = categoryClips.findIndex(c => c.index === actionIndex);
    if (clipIdx >= 0) setActiveClipIndex(clipIdx);
  };

  const activeAction = activeClipIndex !== null ? categoryClips[activeClipIndex] : null;

  const toggleExpanded = (index: number) => {
    setExpandedActions(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const applyQuickScore = (actionIndex: number, score: string) => {
    updateAction(actionIndex, "action_score", score);
  };

  const applyScoreModifier = (actionIndex: number, modifier: "minus25" | "times4") => {
    const current = parseFloat(actions[actionIndex]?.action_score);
    if (isNaN(current)) return;
    const newVal = modifier === "minus25" ? current * 0.75 : current * 4;
    updateAction(actionIndex, "action_score", String(parseFloat(newVal.toFixed(5))));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 !left-0 !top-0 !translate-x-0 !translate-y-0 w-screen h-screen max-w-none max-h-none p-0 bg-background border-0 rounded-none flex flex-col overflow-hidden z-[200] data-[state=open]:!animate-none data-[state=closed]:!animate-none [&>button.absolute]:hidden">
        <DialogTitle className="sr-only">Action Type Editor</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-primary font-bold text-sm">ACTION EDIT</span>
            <span className="text-xs text-muted-foreground">
              {actions.length} actions · {groupedActions.length} categories
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onSave} disabled={saving} size="sm" className="gap-1.5">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Update Report"}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-9 w-9">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Category sidebar */}
          <div className="w-48 md:w-56 border-r shrink-0 flex flex-col">
            <div className="p-2 border-b">
              <Button
                variant={selectedCategory === null ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => { setSelectedCategory(null); setActiveClipIndex(null); }}
              >
                All Categories
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-1 space-y-0.5">
                {groupedActions.map(([category, items]) => {
                  const clipCount = items.filter(i => i.action.video_url).length;
                  return (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "ghost"}
                      size="sm"
                      className="w-full justify-between text-xs h-8"
                      onClick={() => { setSelectedCategory(category); setActiveClipIndex(null); }}
                    >
                      <span className="truncate">{category}</span>
                      <span className="flex items-center gap-1">
                        {clipCount > 0 && <Video className="h-3 w-3 opacity-50" />}
                        <span className="text-[10px] opacity-70">{items.length}</span>
                      </span>
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Video player area - shows when a category is selected and has clips */}
            {selectedCategory && categoryClips.length > 0 && (
              <div className="border-b shrink-0">
                {/* Navigation controls above player */}
                <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => goToClip(-1)} disabled={categoryClips.length <= 1}>
                      <SkipBack className="h-3 w-3" /> Prev
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={togglePlayPause} disabled={activeClipIndex === null}>
                      {videoPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => goToClip(1)} disabled={categoryClips.length <= 1}>
                      Next <SkipForward className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {activeClipIndex !== null ? `Clip ${activeClipIndex + 1} of ${categoryClips.length}` : `${categoryClips.length} clips available`}
                  </span>
                </div>

                {/* Video */}
                <div className="relative bg-black" style={{ maxHeight: "35vh" }}>
                  {activeClipIndex === null && (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                      Select a clip below or press Next to start reviewing
                    </div>
                  )}
                  {activeClipIndex !== null && (
                    <>
                      <video
                        ref={videoRef}
                        className={`w-full object-contain cursor-pointer transition-opacity ${videoReady ? "opacity-100" : "opacity-0"}`}
                        style={{ maxHeight: "35vh" }}
                        preload="auto"
                        crossOrigin="anonymous"
                        muted
                        playsInline
                        onClick={togglePlayPause}
                        onCanPlay={handleCanPlay}
                        onEnded={() => setVideoPlaying(false)}
                        loop
                      />
                      {!videoReady && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black">
                          <Loader2 className="h-5 w-5 animate-spin text-white/60" />
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Active action editing panel below video */}
                {activeAction && (
                  <div className="px-4 py-3 bg-muted/20 border-t space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono font-bold text-primary">#{activeAction.action.action_number}</span>
                      <span>{activeAction.action.minute ? `${activeAction.action.minute}'` : ""}</span>
                      <span className="font-semibold text-foreground">{activeAction.action.action_type}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-16">
                        <Input
                          value={activeAction.action.minute}
                          onChange={(e) => updateAction(activeAction.index, "minute", e.target.value)}
                          placeholder="Min"
                          className="h-7 text-xs"
                        />
                      </div>
                      <ScoreDropdown
                        value={activeAction.action.action_score}
                        onChange={(val) => updateAction(activeAction.index, "action_score", val)}
                        className="w-24"
                        inputClassName="h-7 text-xs border-[hsl(43,49%,61%)]/50"
                      />
                      {/* Quick score buttons */}
                      {topScores.length > 0 && (
                        <div className="flex items-center gap-1">
                          {topScores.map(s => (
                            <Button
                              key={s.value}
                              variant="outline"
                              size="sm"
                              className={`h-7 px-2 text-xs font-mono ${activeAction.action.action_score === s.value ? "bg-primary/20 border-primary" : ""}`}
                              onClick={() => applyQuickScore(activeAction.index, s.value)}
                              title={`Used ${s.count} times`}
                            >
                              {s.value}
                            </Button>
                          ))}
                        </div>
                      )}
                      {/* Modifier buttons */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => applyScoreModifier(activeAction.index, "minus25")}
                        disabled={!activeAction.action.action_score || isNaN(parseFloat(activeAction.action.action_score))}
                        title="Reduce score by 25% (×0.75)"
                      >
                        −25%
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => applyScoreModifier(activeAction.index, "times4")}
                        disabled={!activeAction.action.action_score || isNaN(parseFloat(activeAction.action.action_score))}
                        title="Multiply score by 4"
                      >
                        ×4
                      </Button>
                      <ZonePitchSelector
                        value={activeAction.action.zone_details || (activeAction.action.zone ? [{ zone: activeAction.action.zone }] : [])}
                        onChange={(zd) => {
                          updateAction(activeAction.index, "zone_details", zd as any);
                          updateAction(activeAction.index, "zone", (zd.length ? zd[0].zone : null) as any);
                        }}
                        actionType={activeAction.action.action_type}
                        compact
                      />
                      <Button
                        onClick={() => openR90Viewer(activeAction.index)}
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                      >
                        <Search className="h-3 w-3 text-primary" />
                      </Button>
                    </div>
                    <Input
                      value={activeAction.action.action_description}
                      onChange={(e) => updateAction(activeAction.index, "action_description", e.target.value)}
                      placeholder="Description"
                      className="h-7 text-xs"
                    />
                    <Input
                      value={activeAction.action.notes}
                      onChange={(e) => updateAction(activeAction.index, "notes", e.target.value)}
                      placeholder="Notes"
                      className="h-7 text-xs"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Actions list */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {categoriesToShow.map(([category, items]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                      {category}
                      <span className="text-xs text-muted-foreground font-normal">({items.length})</span>
                    </h3>
                    <div className="space-y-1.5">
                      {items.map(({ action, index }) => {
                        const isActive = activeAction?.index === index;
                        return (
                          <Collapsible
                            key={index}
                            open={expandedActions.has(index)}
                            onOpenChange={() => toggleExpanded(index)}
                          >
                            <div className={`border rounded-md bg-card ${isActive ? "ring-2 ring-primary" : ""}`}>
                              <CollapsibleTrigger className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-accent/50 transition-colors">
                                {expandedActions.has(index) ? (
                                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                )}
                                <span className="font-mono text-xs font-bold text-primary">#{action.action_number}</span>
                                <span className="text-xs text-muted-foreground">{action.minute ? `${action.minute}'` : ""}</span>
                                <span className="text-xs truncate flex-1">{action.action_description || "No description"}</span>
                                <span className="text-xs font-mono font-semibold text-amber-600 shrink-0">
                                  {action.action_score || "—"}
                                </span>
                                {action.video_url && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 px-1.5 text-[10px] bg-primary/10 text-primary hover:bg-primary/20 shrink-0"
                                    onClick={(e) => { e.stopPropagation(); openClipForAction(index); }}
                                  >
                                    <Play className="h-3 w-3 mr-0.5" /> clip
                                  </Button>
                                )}
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="px-3 pb-3 pt-1 space-y-2 border-t">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <div className="w-16">
                                      <Input
                                        value={action.minute}
                                        onChange={(e) => updateAction(index, "minute", e.target.value)}
                                        placeholder="Min"
                                        className="h-7 text-xs"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-[120px] max-w-[200px]">
                                      <Input
                                        value={action.action_type}
                                        onChange={(e) => updateAction(index, "action_type", e.target.value)}
                                        onBlur={() => {
                                          if (action.action_type) updateAction(index, "action_type", canonicalActionType(action.action_type));
                                        }}
                                        placeholder="Action type"
                                        className="h-7 text-xs"
                                      />
                                    </div>
                                    <ScoreDropdown
                                      value={action.action_score}
                                      onChange={(val) => updateAction(index, "action_score", val)}
                                      className="w-20"
                                      inputClassName="h-7 text-xs border-[hsl(43,49%,61%)]/50"
                                    />
                                    {/* Quick score buttons in expanded view too */}
                                    {topScores.length > 0 && selectedCategory && (
                                      <div className="flex items-center gap-1">
                                        {topScores.map(s => (
                                          <Button
                                            key={s.value}
                                            variant="outline"
                                            size="sm"
                                            className={`h-6 px-1.5 text-[10px] font-mono ${action.action_score === s.value ? "bg-primary/20 border-primary" : ""}`}
                                            onClick={() => applyQuickScore(index, s.value)}
                                            title={`Used ${s.count} times`}
                                          >
                                            {s.value}
                                          </Button>
                                        ))}
                                      </div>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-6 px-1.5 text-[10px]"
                                      onClick={() => applyScoreModifier(index, "minus25")}
                                      disabled={!action.action_score || isNaN(parseFloat(action.action_score))}
                                    >
                                      −25%
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-6 px-1.5 text-[10px]"
                                      onClick={() => applyScoreModifier(index, "times4")}
                                      disabled={!action.action_score || isNaN(parseFloat(action.action_score))}
                                    >
                                      ×4
                                    </Button>
                                    <ZonePitchSelector
                                      value={action.zone_details || (action.zone ? [{ zone: action.zone }] : [])}
                                      onChange={(zd) => {
                                        updateAction(index, 'zone_details', zd as any);
                                        updateAction(index, 'zone', (zd.length ? zd[0].zone : null) as any);
                                      }}
                                      actionType={action.action_type}
                                      compact
                                    />
                                    <Button
                                      onClick={() => openR90Viewer(index)}
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2"
                                    >
                                      <Search className="h-3 w-3 text-primary" />
                                    </Button>
                                  </div>
                                  <Input
                                    value={action.action_description}
                                    onChange={(e) => updateAction(index, "action_description", e.target.value)}
                                    placeholder="Description"
                                    className="h-7 text-xs"
                                  />
                                  <Input
                                    value={action.notes}
                                    onChange={(e) => updateAction(index, "notes", e.target.value)}
                                    placeholder="Notes"
                                    className="h-7 text-xs"
                                  />
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
