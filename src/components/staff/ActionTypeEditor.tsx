import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Save, Search, Play, Pause, SkipBack, SkipForward, Loader2, Maximize, Minimize } from "lucide-react";
import { canonicalActionType } from "@/lib/playerActionFrequency";
import { ScoreDropdown } from "./ScoreDropdown";
import { InlinePitchGrid } from "./InlinePitchGrid";
import type { ZonePoint } from "@/components/report/ZonePitchSelector";
import { supabase } from "@/integrations/supabase/client";
import type { RecordedStat } from "./ActionStatRecorder";
import { XGPitchMap } from "./XGPitchMap";
import { BoxZoneMap } from "./BoxZoneMap";
import { Separator } from "@/components/ui/separator";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

interface MappedR90Rating {
  id: string;
  title: string;
  score: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
}

// Zone classification helpers for filtering
const OWN_THIRD_ZONES = [1,2,3,4,5,6];
const MID_THIRD_ZONES = [7,8,9,10,11,12];
const FINAL_THIRD_ZONES = [13,14,15,16,17,18];
const WIDE_ZONES = [1,3,4,6,7,9,10,12,13,15,16,18];
const CENTRAL_ZONES = [2,5,8,11,14,17];

function getZoneThird(zones: number[]): string | null {
  if (zones.length === 0) return null;
  const inOwn = zones.some(z => OWN_THIRD_ZONES.includes(z));
  const inMid = zones.some(z => MID_THIRD_ZONES.includes(z));
  const inFinal = zones.some(z => FINAL_THIRD_ZONES.includes(z));
  if (inFinal && !inOwn && !inMid) return "final";
  if (inMid && !inOwn && !inFinal) return "mid";
  if (inOwn && !inMid && !inFinal) return "own";
  return null;
}

function getZoneWidth(zones: number[]): string | null {
  if (zones.length === 0) return null;
  const allWide = zones.every(z => WIDE_ZONES.includes(z));
  const allCentral = zones.every(z => CENTRAL_ZONES.includes(z));
  if (allCentral) return "central";
  if (allWide) return "wide";
  return null;
}

function isRatingRelevantToZone(rating: MappedR90Rating, zoneThird: string | null, zoneWidth: string | null): boolean {
  if (!zoneThird && !zoneWidth) return true;
  const title = (rating.title || "").toLowerCase();
  const desc = (rating.description || "").toLowerCase();
  const combined = title + " " + desc;

  // Filter by third
  if (zoneThird === "own") {
    if (combined.includes("final third") || combined.includes("attacking third")) return false;
  } else if (zoneThird === "final") {
    if (combined.includes("own third") || combined.includes("defensive third") || combined.includes("own half")) return false;
  }

  // Filter by width
  if (zoneWidth === "central") {
    if (combined.includes("wide") && !combined.includes("half-space")) return false;
  } else if (zoneWidth === "wide") {
    if (combined.includes("central") && !combined.includes("half-space")) return false;
  }

  return true;
}

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

const BOX_ZONE_TYPES = [
  "attacking cross", "front post movement", "central movement",
  "back post movement", "cross", "attacking corner"
];

const XG_MAP_TYPES = [
  "shot", "shot blocked", "blocked shot", "headed shot", "shot assist"
];

const isBoxZoneType = (type: string) =>
  BOX_ZONE_TYPES.some(t => canonicalActionType(type).toLowerCase().includes(t));

const isXGType = (type: string) =>
  XG_MAP_TYPES.some(t => canonicalActionType(type).toLowerCase().includes(t));

const OFFENSIVE_PATTERNS = ['shot', 'cross', 'dribble', 'pass', 'carry', 'through ball', 'progressive', 'touch', 'ball retention', 'chance', 'attacking', 'offensive', 'forward', 'movement', 'assist', 'goal'];
const DEFENSIVE_PATTERNS = ['tackle', 'interception', 'clearance', 'block', 'header', 'recovery', 'regain', 'defensive', 'press', 'duel'];
const KEY_PATTERNS = ['goal', 'assist', 'key pass', 'penalty', 'big chance', 'chance created'];

function getActionGroup(type: string): 'Key Actions' | 'Offensive' | 'Defensive' | 'Other' {
  const lower = type.toLowerCase();
  if (KEY_PATTERNS.some(p => lower.includes(p))) return 'Key Actions';
  if (DEFENSIVE_PATTERNS.some(p => lower.includes(p))) return 'Defensive';
  if (OFFENSIVE_PATTERNS.some(p => lower.includes(p))) return 'Offensive';
  return 'Other';
}

const GROUP_ORDER: ('Key Actions' | 'Offensive' | 'Defensive' | 'Other')[] = ['Key Actions', 'Offensive', 'Defensive', 'Other'];

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

async function fetchMappedR90Ratings(actionType: string): Promise<MappedR90Rating[]> {
  try {
    const { data: mappings } = await supabase
      .from("action_r90_category_mappings")
      .select("r90_category, r90_subcategory, selected_rating_ids")
      .eq("action_type", actionType.trim());

    if (!mappings || mappings.length === 0) return [];

    const allRatingIds = mappings.flatMap((m: any) => m.selected_rating_ids || []);
    
    if (allRatingIds.length > 0) {
      const { data: ratings } = await supabase
        .from("r90_ratings")
        .select("id, title, score, description, category, subcategory")
        .in("id", allRatingIds)
        .not("score", "is", null);
      return (ratings || []) as MappedR90Rating[];
    }

    // Fallback: fetch by category/subcategory
    const results: MappedR90Rating[] = [];
    for (const m of mappings) {
      let query = supabase.from("r90_ratings").select("id, title, score, description, category, subcategory").eq("category", m.r90_category).not("score", "is", null);
      if (m.r90_subcategory) query = query.eq("subcategory", m.r90_subcategory);
      const { data } = await query;
      if (data) results.push(...(data as MappedR90Rating[]));
    }
    // Deduplicate
    const seen = new Set<string>();
    return results.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
  } catch { return []; }
}

const R90InlineSearch = ({ allR90Ratings, onSelect }: { allR90Ratings: R90Rating[]; onSelect: (score: string) => void }) => {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allR90Ratings.filter(r =>
      r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query, allR90Ratings]);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div ref={ref} className="relative">
      <Input
        value={query}
        onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
        onFocus={() => setShowDropdown(true)}
        placeholder="R90 search..."
        className="h-7 text-xs w-28"
      />
      {showDropdown && filtered.length > 0 && (
        <div className="absolute top-full left-0 mt-1 z-50 w-64 max-h-48 overflow-y-auto bg-popover border rounded-md shadow-lg">
          {filtered.map((r, i) => (
            <button
              key={i}
              className="w-full px-2 py-1.5 text-left hover:bg-accent text-xs flex items-center gap-2"
              onClick={() => { onSelect(String(r.score)); setQuery(""); setShowDropdown(false); }}
            >
              <span className="font-mono font-bold text-primary shrink-0">{String(r.score)}</span>
              <span className="truncate text-muted-foreground">{r.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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
  const [selectedActionIndex, setSelectedActionIndex] = useState<number | null>(null);
  const [topScores, setTopScores] = useState<{ value: string; count: number }[]>([]);
  const [mappedRatings, setMappedRatings] = useState<MappedR90Rating[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoZoom, setVideoZoom] = useState(1);
  // Track the video URL we've loaded to avoid re-triggering
  const loadedUrlRef = useRef<string | null>(null);

  const groupedActions = useMemo(() => {
    const groups: Record<string, { action: PerformanceAction; index: number }[]> = {};
    actions.forEach((action, index) => {
      const type = action.action_type ? canonicalActionType(action.action_type) : "Uncategorised";
      if (!groups[type]) groups[type] = [];
      groups[type].push({ action, index });
    });
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === "Uncategorised") return 1;
      if (b === "Uncategorised") return -1;
      return a.localeCompare(b);
    });
  }, [actions]);

  const sidebarGroups = useMemo(() => {
    const result: Record<string, { category: string; items: { action: PerformanceAction; index: number }[] }[]> = {
      'Key Actions': [], 'Offensive': [], 'Defensive': [], 'Other': [],
    };
    groupedActions.forEach(([category, items]) => {
      result[getActionGroup(category)].push({ category, items });
    });
    return result;
  }, [groupedActions]);

  const categoriesToShow = selectedCategory
    ? groupedActions.filter(([cat]) => cat === selectedCategory)
    : groupedActions;

  // Flat list of clips for the selected category
  const categoryClips = useMemo(() => {
    const items: { action: PerformanceAction; index: number }[] = [];
    categoriesToShow.forEach(([, actionItems]) => {
      actionItems.forEach(item => {
        if (item.action.video_url) items.push(item);
      });
    });
    return items;
  }, [categoriesToShow]);

  useEffect(() => {
    if (!selectedCategory) { setTopScores([]); setMappedRatings([]); return; }
    fetchTopScoresForType(selectedCategory).then(setTopScores);
    fetchMappedR90Ratings(selectedCategory).then(setMappedRatings);
  }, [selectedCategory]);

  // Load video only when selectedActionIndex changes and the action has a video
  useEffect(() => {
    if (selectedActionIndex === null) {
      setVideoReady(false);
      setVideoPlaying(false);
      return;
    }
    const action = actions[selectedActionIndex];
    if (!action?.video_url) {
      setVideoReady(false);
      setVideoPlaying(false);
      return;
    }
    const vid = videoRef.current;
    if (!vid) return;

    // Only reload if URL actually changed
    if (loadedUrlRef.current === action.video_url && vid.readyState >= 2) {
      // Same video already loaded, just play
      setVideoReady(true);
      vid.play().then(() => setVideoPlaying(true)).catch(() => {});
      return;
    }

    setVideoReady(false);
    setVideoPlaying(false);
    setVideoZoom(1);
    loadedUrlRef.current = action.video_url;
    vid.src = action.video_url;
    vid.load();
  }, [selectedActionIndex]); // Only depend on the index, NOT on actions/categoryClips

  const handleCanPlay = useCallback(() => {
    setVideoReady(true);
    const vid = videoRef.current;
    if (vid) vid.play().then(() => setVideoPlaying(true)).catch(() => {});
  }, []);

  const togglePlayPause = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) vid.play().then(() => setVideoPlaying(true)).catch(() => {});
    else { vid.pause(); setVideoPlaying(false); }
  }, []);

  const goToClip = (direction: number) => {
    if (categoryClips.length === 0) return;
    const currentClipIdx = categoryClips.findIndex(c => c.index === selectedActionIndex);
    let next = (currentClipIdx === -1 ? 0 : currentClipIdx + direction);
    if (next < 0) next = categoryClips.length - 1;
    if (next >= categoryClips.length) next = 0;
    setSelectedActionIndex(categoryClips[next].index);
  };

  const selectAction = (actionIndex: number) => {
    setSelectedActionIndex(actionIndex);
  };

  const activeAction = selectedActionIndex !== null ? actions[selectedActionIndex] : null;
  const hasActiveVideo = activeAction?.video_url;

  const applyQuickScore = (actionIndex: number, score: string) => {
    updateAction(actionIndex, "action_score", score);
  };

  const applyScoreModifier = (actionIndex: number, modifier: "minus25" | "times4") => {
    const current = parseFloat(actions[actionIndex]?.action_score);
    if (isNaN(current)) return;
    const newVal = modifier === "minus25" ? current * 0.75 : current * 4;
    updateAction(actionIndex, "action_score", String(parseFloat(newVal.toFixed(5))));
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setVideoZoom(prev => Math.max(1, Math.min(4, prev + (e.deltaY < 0 ? 0.15 : -0.15))));
  }, []);

  const toggleFullscreen = () => setIsFullscreen(prev => !prev);
  const videoHeight = isFullscreen ? "70vh" : "35vh";

  const getScoreCounts = (items: { action: PerformanceAction; index: number }[]) => {
    const scored = items.filter(i => i.action.action_score && i.action.action_score.trim() !== "").length;
    return { scored, total: items.length };
  };

  const showBoxZone = selectedCategory ? isBoxZoneType(selectedCategory) : false;
  const showXGMap = selectedCategory ? isXGType(selectedCategory) : false;

  // Filter R90 ratings by zone selection
  const activeZones = useMemo(() => {
    if (!activeAction?.zone_details || activeAction.zone_details.length === 0) return [];
    return (activeAction.zone_details as ZonePoint[]).map(z => z.zone);
  }, [activeAction?.zone_details]);

  const filteredMappedRatings = useMemo(() => {
    if (mappedRatings.length === 0) return [];
    const zoneThird = getZoneThird(activeZones);
    const zoneWidth = getZoneWidth(activeZones);
    return mappedRatings.filter(r => isRatingRelevantToZone(r, zoneThird, zoneWidth));
  }, [mappedRatings, activeZones]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 !left-0 !top-0 !translate-x-0 !translate-y-0 w-screen h-screen max-w-none max-h-none p-0 bg-background border-0 rounded-none flex flex-col overflow-hidden z-[200] data-[state=open]:!animate-none data-[state=closed]:!animate-none [&>button.absolute]:hidden">
        <DialogTitle className="sr-only">Action Type Editor</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-primary font-bold text-sm">ACTION EDIT</span>
            <span className="text-xs text-muted-foreground">
              {actions.length} actions · {groupedActions.length} types
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

        <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
          {/* Category sidebar - resizable */}
          <ResizablePanel defaultSize={18} minSize={12} maxSize={30} className="flex flex-col">
            <div className="p-2 border-b">
              <Button
                variant={selectedCategory === null ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => { setSelectedCategory(null); setSelectedActionIndex(null); }}
              >
                All Action Types
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-1">
                {GROUP_ORDER.map(group => {
                  const entries = sidebarGroups[group];
                  if (!entries || entries.length === 0) return null;
                  return (
                    <div key={group}>
                      <div className="flex items-center gap-2 px-2 py-2">
                        <Separator className="flex-1 bg-[hsl(43,49%,61%)]" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(43,49%,61%)]">{group}</span>
                        <Separator className="flex-1 bg-[hsl(43,49%,61%)]" />
                      </div>
                      <div className="space-y-0.5">
                        {entries.map(({ category, items }) => {
                          const { scored, total } = getScoreCounts(items);
                          return (
                            <Button
                              key={category}
                              variant={selectedCategory === category ? "default" : "ghost"}
                              size="sm"
                              className="w-full justify-start text-xs h-8 px-2 gap-1.5"
                              onClick={() => { setSelectedCategory(category); setSelectedActionIndex(null); }}
                            >
                              <span className={`font-mono text-[10px] shrink-0 ${scored === total && total > 0 ? "text-green-500" : "opacity-70"}`}>
                                {scored}/{total}
                              </span>
                              <span className="truncate">{category}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Main content */}
          <ResizablePanel defaultSize={82} className="flex flex-col min-h-0">
            {/* Video player area + pitch map side by side */}
            {selectedCategory && categoryClips.length > 0 && (
              <div className="border-b shrink-0">
                {/* Navigation controls above player */}
                <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => goToClip(-1)} disabled={categoryClips.length <= 1}>
                      <SkipBack className="h-3 w-3" /> Prev
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={togglePlayPause} disabled={!hasActiveVideo}>
                      {videoPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => goToClip(1)} disabled={categoryClips.length <= 1}>
                      Next <SkipForward className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={toggleFullscreen}>
                      {isFullscreen ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
                    </Button>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {selectedActionIndex !== null
                      ? `Clip ${categoryClips.findIndex(c => c.index === selectedActionIndex) + 1} of ${categoryClips.length}`
                      : `${categoryClips.length} clips available`}
                    {videoZoom > 1 && <span className="ml-2 text-primary">{videoZoom.toFixed(1)}×</span>}
                  </span>
                </div>

                {/* Video + Pitch map + R90 Scores row */}
                <div className="flex" style={{ height: videoHeight }}>
                  {/* Video - flexible width */}
                  <div
                    className="relative bg-black overflow-hidden flex-1 min-w-0"
                    onWheel={handleWheel}
                  >
                    {!hasActiveVideo && (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        Click an action below to start reviewing
                      </div>
                    )}
                    {hasActiveVideo && (
                      <>
                        <video
                          ref={videoRef}
                          className="w-full h-full object-contain cursor-pointer transition-transform"
                          style={{ transform: `scale(${videoZoom})` }}
                          preload="auto"
                          crossOrigin="anonymous"
                          muted
                          playsInline
                          onClick={togglePlayPause}
                          onCanPlay={handleCanPlay}
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

                  {/* Pitch map - fixed width, tighter boxes */}
                  <div className="w-[140px] border-l bg-muted/10 flex flex-col overflow-auto shrink-0">
                    {selectedActionIndex !== null ? (
                      <InlinePitchGrid
                        value={activeAction?.zone_details || (activeAction?.zone ? [{ zone: activeAction.zone }] : [])}
                        onChange={(zd) => {
                          updateAction(selectedActionIndex, "zone_details", zd as any);
                          updateAction(selectedActionIndex, "zone", (zd.length ? zd[0].zone : null) as any);
                        }}
                        actionType={activeAction?.action_type || ""}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-[10px] text-muted-foreground">Select an action</span>
                      </div>
                    )}
                  </div>

                  {/* Right panel: R90 action scores + visual maps */}
                  <div className="flex-1 border-l bg-muted/5 flex flex-col overflow-hidden min-w-0">
                    {showBoxZone ? (
                      <div className="p-2 h-full">
                        <BoxZoneMap actions={categoriesToShow.flatMap(([, items]) => items.map(i => i.action))} />
                      </div>
                    ) : showXGMap ? (
                      <div className="p-2 h-full">
                        <XGPitchMap />
                      </div>
                    ) : (
                      <div className="flex flex-col h-full">
                        <div className="px-2 py-1 border-b flex items-center justify-between">
                          <p className="text-[10px] font-semibold">
                            R90 Action Scores
                            {activeZones.length > 0 && <span className="ml-1 text-muted-foreground font-normal">(filtered by zone)</span>}
                          </p>
                          <span className="text-[9px] text-muted-foreground">{filteredMappedRatings.length} rating{filteredMappedRatings.length !== 1 ? "s" : ""}</span>
                        </div>
                        <ScrollArea className="flex-1">
                          <div className="p-1.5 space-y-0.5">
                            {filteredMappedRatings.length > 0 ? filteredMappedRatings.map(r => (
                              <button
                                key={r.id}
                                className="w-full text-left px-2 py-1 rounded hover:bg-accent text-xs flex items-center gap-2 group"
                                onClick={() => selectedActionIndex !== null && applyQuickScore(selectedActionIndex, String(r.score))}
                              >
                                <span className="font-mono font-bold text-primary shrink-0 min-w-[50px]">{r.score}</span>
                                <span className="truncate flex-1">{r.title}</span>
                                {r.description && (
                                  <span className="text-[9px] text-muted-foreground truncate max-w-[120px] hidden group-hover:inline">{r.description}</span>
                                )}
                              </button>
                            )) : mappedRatings.length === 0 ? (
                              <div className="text-center py-4">
                                <p className="text-[10px] text-muted-foreground">No action scores configured</p>
                                <p className="text-[9px] text-muted-foreground mt-1">Set up mappings in Coaching Database → Action Scores</p>
                              </div>
                            ) : (
                              <p className="text-[10px] text-muted-foreground text-center py-4">No scores match the selected zones</p>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                </div>

                {/* Active action editing panel below video */}
                {selectedActionIndex !== null && activeAction && (
                  <div className="px-4 py-3 bg-muted/20 border-t space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono font-bold text-primary">#{activeAction.action_number}</span>
                      <span>{activeAction.minute ? `${activeAction.minute}'` : ""}</span>
                      <span className="font-semibold text-foreground">{activeAction.action_type}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-16">
                        <Input
                          value={activeAction.minute}
                          onChange={(e) => updateAction(selectedActionIndex, "minute", e.target.value)}
                          placeholder="Min"
                          className="h-7 text-xs"
                        />
                      </div>
                      <ScoreDropdown
                        value={activeAction.action_score}
                        onChange={(val) => updateAction(selectedActionIndex, "action_score", val)}
                        className="w-24"
                        inputClassName="h-7 text-xs border-[hsl(43,49%,61%)]/50"
                      />
                      <R90InlineSearch
                        allR90Ratings={allR90Ratings}
                        onSelect={(score) => updateAction(selectedActionIndex, "action_score", score)}
                      />
                      {topScores.length > 0 && (
                        <div className="flex items-center gap-1">
                          {topScores.map(s => (
                            <Button
                              key={s.value}
                              variant="outline"
                              size="sm"
                              className={`h-7 px-2 text-xs font-mono ${activeAction.action_score === s.value ? "bg-primary/20 border-primary" : ""}`}
                              onClick={() => applyQuickScore(selectedActionIndex, s.value)}
                              title={`Used ${s.count} times`}
                            >
                              {s.value}
                            </Button>
                          ))}
                        </div>
                      )}
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs"
                        onClick={() => applyScoreModifier(selectedActionIndex, "minus25")}
                        disabled={!activeAction.action_score || isNaN(parseFloat(activeAction.action_score))}
                      >−25%</Button>
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs"
                        onClick={() => applyScoreModifier(selectedActionIndex, "times4")}
                        disabled={!activeAction.action_score || isNaN(parseFloat(activeAction.action_score))}
                      >×4</Button>
                      <Button onClick={() => openR90Viewer(selectedActionIndex)} size="sm" variant="ghost" className="h-7 px-2">
                        <Search className="h-3 w-3 text-primary" />
                      </Button>
                    </div>
                    <Input
                      value={activeAction.action_description}
                      onChange={(e) => updateAction(selectedActionIndex, "action_description", e.target.value)}
                      placeholder="Description"
                      className="h-7 text-xs"
                    />
                    <Input
                      value={activeAction.notes}
                      onChange={(e) => updateAction(selectedActionIndex, "notes", e.target.value)}
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
                    <div className="space-y-1">
                      {items.map(({ action, index }) => {
                        const isActive = selectedActionIndex === index;
                        return (
                          <div
                            key={index}
                            className={`border rounded-md bg-card px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-accent/50 transition-colors ${
                              isActive ? "ring-2 ring-[hsl(43,49%,61%)] border-[hsl(43,49%,61%)]" : ""
                            }`}
                            onClick={() => selectAction(index)}
                          >
                            <span className="font-mono text-xs font-bold text-primary">#{action.action_number}</span>
                            <span className="text-xs text-muted-foreground">{action.minute ? `${action.minute}'` : ""}</span>
                            <span className="text-xs truncate flex-1">{action.action_description || "No description"}</span>
                            <span className="text-xs font-mono font-semibold text-amber-600 shrink-0">
                              {action.action_score || "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

              </div>
            </ScrollArea>
          </ResizablePanel>
        </ResizablePanelGroup>
      </DialogContent>
    </Dialog>
  );
};
