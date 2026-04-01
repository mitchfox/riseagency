import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Save, Search, Play, Pause, SkipBack, SkipForward, Loader2, Maximize, Minimize, PanelLeftClose, PanelLeftOpen, Settings, ChevronsDown, ChevronsUp, Music, Filter } from "lucide-react";
import { BlurInput } from "./BlurInput";
import { canonicalActionType } from "@/lib/playerActionFrequency";
import { ScoreDropdown } from "./ScoreDropdown";
import { InlinePitchGrid } from "./InlinePitchGrid";
import type { ZonePoint } from "@/components/report/ZonePitchSelector";
import { supabase } from "@/integrations/supabase/client";
import type { RecordedStat } from "./ActionStatRecorder";
import { XGPitchMap } from "./XGPitchMap";
import { BoxZoneMap } from "./BoxZoneMap";
import { Separator } from "@/components/ui/separator";
import { ActionScoresManagement } from "./ActionScoresManagement";

interface MappedR90Rating {
  id: string;
  title: string;
  score: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  tags?: string[] | null;
}

// Zone classification helpers
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

  if (zoneThird === "own") {
    if (combined.includes("final third") || combined.includes("attacking third")) return false;
  } else if (zoneThird === "final") {
    if (combined.includes("own third") || combined.includes("defensive third") || combined.includes("own half")) return false;
  }

  if (zoneWidth === "central") {
    if (combined.includes("wide") && !combined.includes("half-space")) return false;
  } else if (zoneWidth === "wide") {
    if (combined.includes("central") && !combined.includes("half-space")) return false;
  }

  return true;
}

function categoriseRatings(ratings: MappedR90Rating[]): { label: string; items: MappedR90Rating[] }[] {
  const groups: Record<string, MappedR90Rating[]> = {};
  
  ratings.forEach(r => {
    const cat = r.subcategory || r.category || "General";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(r);
  });

  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, items]) => ({ label, items }));
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
  minutesPlayed?: string;
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
        .select("id, title, score, description, category, subcategory, tags")
        .in("id", allRatingIds)
        .not("score", "is", null);
      return (ratings || []) as MappedR90Rating[];
    }

    const results: MappedR90Rating[] = [];
    for (const m of mappings) {
      let query = supabase.from("r90_ratings").select("id, title, score, description, category, subcategory, tags").eq("category", m.r90_category).not("score", "is", null);
      if (m.r90_subcategory) query = query.eq("subcategory", m.r90_subcategory);
      const { data } = await query;
      if (data) results.push(...(data as MappedR90Rating[]));
    }
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
  minutesPlayed,
}: ActionTypeEditorProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedActionIndex, setSelectedActionIndex] = useState<number | null>(null);
  const [topScores, setTopScores] = useState<{ value: string; count: number }[]>([]);
  const [mappedRatings, setMappedRatings] = useState<MappedR90Rating[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bottomCollapsed, setBottomCollapsed] = useState(false);
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoZoom, setVideoZoom] = useState(1);
  const [videoPan, setVideoPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const loadedUrlRef = useRef<string | null>(null);

  // Live R90 calculation
  const liveR90 = useMemo(() => {
    const scored = actions.filter(a => a.action_score && a.action_score.trim() !== "");
    if (scored.length === 0) return null;
    const rawScore = scored.reduce((sum, a) => sum + (parseFloat(a.action_score) || 0), 0);
    const mins = parseFloat(minutesPlayed || "0");
    if (mins > 0) return ((rawScore / mins) * 90).toFixed(2);
    return rawScore.toFixed(3);
  }, [actions, minutesPlayed]);

  // Completion stats
  const completionStats = useMemo(() => {
    const scored = actions.filter(a => a.action_score && a.action_score.trim() !== "").length;
    const total = actions.length;
    const pct = total > 0 ? Math.round((scored / total) * 100) : 0;
    return { scored, total, pct };
  }, [actions]);

  const completionColor = completionStats.pct >= 80 ? "text-green-500" : completionStats.pct >= 50 ? "text-lime-500" : completionStats.pct >= 25 ? "text-amber-500" : "text-red-400";

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

    if (loadedUrlRef.current === action.video_url && vid.readyState >= 2) {
      setVideoReady(true);
      vid.play().then(() => setVideoPlaying(true)).catch(() => {});
      return;
    }

    setVideoReady(false);
    setVideoPlaying(false);
    setVideoZoom(1);
    setVideoPan({ x: 0, y: 0 });
    loadedUrlRef.current = action.video_url;
    vid.src = action.video_url;
    vid.load();
  }, [selectedActionIndex]);

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
    setVideoZoom(prev => {
      const newZoom = Math.max(1, Math.min(4, prev + (e.deltaY < 0 ? 0.15 : -0.15)));
      if (newZoom <= 1) setVideoPan({ x: 0, y: 0 });
      return newZoom;
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (videoZoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: videoPan.x, panY: videoPan.y };
  }, [videoZoom, videoPan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const maxPan = (videoZoom - 1) * 50;
    setVideoPan({
      x: Math.max(-maxPan, Math.min(maxPan, dragStart.current.panX + dx)),
      y: Math.max(-maxPan, Math.min(maxPan, dragStart.current.panY + dy)),
    });
  }, [isDragging, videoZoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = videoContainerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const getScoreCounts = (items: { action: PerformanceAction; index: number }[]) => {
    const scored = items.filter(i => i.action.action_score && i.action.action_score.trim() !== "").length;
    return { scored, total: items.length };
  };

  const showBoxZone = selectedCategory ? isBoxZoneType(selectedCategory) : false;
  const showXGMap = selectedCategory ? isXGType(selectedCategory) : false;

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

  const categorisedRatings = useMemo(() => categoriseRatings(filteredMappedRatings), [filteredMappedRatings]);

  const currentClipIdx = categoryClips.findIndex(c => c.index === selectedActionIndex);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 !left-0 !top-0 !translate-x-0 !translate-y-0 w-screen h-screen max-w-none max-h-none p-0 bg-background border-0 rounded-none flex flex-col overflow-hidden z-[200] data-[state=open]:!animate-none data-[state=closed]:!animate-none [&>button.absolute]:hidden">
        <DialogTitle className="sr-only">Action Type Editor</DialogTitle>

        {/* Header - compact */}
        <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-primary font-bold text-sm">ACTION EDIT</span>
            <span className="text-xs text-muted-foreground">
              {actions.length} actions · {groupedActions.length} types
            </span>
          </div>
          {/* Live R90 Score - top centre */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">R90:</span>
            <span className={`font-mono font-bold text-sm ${liveR90 ? "text-primary" : "text-muted-foreground"}`}>
              {liveR90 || "—"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                document.dispatchEvent(new CustomEvent("staff-music-toggle"));
              }}
              title="Music player"
            >
              <Music className="h-4 w-4" />
            </Button>
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
          <div className={`flex flex-col border-r shrink-0 transition-all duration-200 ${sidebarCollapsed ? "w-[60px]" : "w-[200px]"}`}>
            {/* Collapse toggle + pending filter + completion */}
            <div className="flex items-center gap-1 px-1 py-1 border-b flex-wrap">
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setSidebarCollapsed(prev => !prev)}>
                {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>
              {!sidebarCollapsed && (
                <>
                  <Button
                    variant={showPendingOnly ? "default" : "outline"}
                    size="sm"
                    className="h-6 px-2 text-[10px] gap-1"
                    onClick={() => setShowPendingOnly(prev => !prev)}
                    title={showPendingOnly ? "Showing pending only" : "Showing all"}
                  >
                    <Filter className="h-3 w-3" />
                    {showPendingOnly ? "Pending" : "All"}
                  </Button>
                  <span className={`text-[11px] font-bold font-mono ml-auto ${completionColor}`}>
                    {completionStats.pct}%
                  </span>
                </>
              )}
              {sidebarCollapsed && (
                <span className={`text-[10px] font-bold font-mono ${completionColor}`}>
                  {completionStats.pct}%
                </span>
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="px-2 py-1 border-b">
                <Button
                  variant={selectedCategory === null ? "default" : "ghost"}
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => { setSelectedCategory(null); setSelectedActionIndex(null); }}
                >
                  All Action Types
                </Button>
              </div>
            )}
            <ScrollArea className="flex-1">
              <div className="p-1">
                {GROUP_ORDER.map(group => {
                  const entries = sidebarGroups[group];
                  if (!entries || entries.length === 0) return null;
                  return (
                    <div key={group}>
                      {!sidebarCollapsed && (
                        <div className="flex items-center gap-2 px-2 py-2">
                          <Separator className="flex-1 bg-[hsl(43,49%,61%)]" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(43,49%,61%)]">{group}</span>
                          <Separator className="flex-1 bg-[hsl(43,49%,61%)]" />
                        </div>
                      )}
                      <div className="space-y-0.5">
                        {entries.map(({ category, items }) => {
                          const { scored, total } = getScoreCounts(items);
                          return (
                            <Button
                              key={category}
                              variant={selectedCategory === category ? "default" : "ghost"}
                              size="sm"
                              className={`w-full text-xs h-8 px-2 gap-1.5 ${sidebarCollapsed ? "justify-center" : "justify-start"}`}
                              onClick={() => { setSelectedCategory(category); setSelectedActionIndex(null); }}
                              title={sidebarCollapsed ? `${category} (${scored}/${total})` : undefined}
                            >
                              <span className={`font-mono text-[10px] shrink-0 ${scored === total && total > 0 ? "text-green-500" : "opacity-70"}`}>
                                {scored}/{total}
                              </span>
                              {!sidebarCollapsed && <span className="truncate">{category}</span>}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Main content */}
          <div className="flex flex-col flex-1 min-h-0 min-w-0">
            {/* Video player area + pitch map side by side - NO separate header bar */}
            {selectedCategory && categoryClips.length > 0 && (
              <div className={`border-b shrink-0 ${bottomCollapsed ? "" : ""}`}>
                {/* Video + Pitch map + R90 Scores row */}
                <div className="flex" style={{ height: bottomCollapsed ? "55vh" : "40vh" }}>
                  {/* Video */}
                  <div
                    ref={videoContainerRef}
                    className="relative bg-black overflow-hidden min-w-0"
                    style={{ flex: '3 1 0%', cursor: videoZoom > 1 ? (isDragging ? "grabbing" : "grab") : "pointer" }}
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
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
                          className="w-full h-full object-contain transition-transform"
                          style={{ transform: `scale(${videoZoom}) translate(${videoPan.x / videoZoom}px, ${videoPan.y / videoZoom}px)` }}
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

                    {/* Controls overlay on the video */}
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 px-3 py-1.5 z-20">
                      <div className="flex items-center gap-1.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20" onClick={() => goToClip(-1)} disabled={categoryClips.length <= 1}>
                          <SkipBack className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20" onClick={togglePlayPause} disabled={!hasActiveVideo}>
                          {videoPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20" onClick={() => goToClip(1)} disabled={categoryClips.length <= 1}>
                          <SkipForward className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <span className="text-[11px] text-white/80">
                        {currentClipIdx >= 0 ? `Clip ${currentClipIdx + 1} / ${categoryClips.length}` : `${categoryClips.length} clips`}
                        {videoZoom > 1 && <span className="ml-2 text-primary">{videoZoom.toFixed(1)}×</span>}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20" onClick={() => setBottomCollapsed(prev => !prev)}>
                          {bottomCollapsed ? <ChevronsDown className="h-3.5 w-3.5" /> : <ChevronsUp className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20" onClick={toggleFullscreen}>
                          {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Pitch map - 50:50 with R90 panel (except box/xG) */}
                  <div className={`border-l bg-muted/10 flex flex-col overflow-auto shrink-0 ${showBoxZone || showXGMap ? 'w-[140px]' : 'w-[calc((100%-var(--video-w,50%)-60px)/2)]'}`} style={{ flex: showBoxZone || showXGMap ? undefined : '1 1 0%', minWidth: showBoxZone || showXGMap ? undefined : '140px' }}>
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

                  {/* Right panel: R90 scores / visual maps */}
                  <div className={`border-l bg-muted/5 flex flex-col overflow-hidden ${showBoxZone || showXGMap ? 'flex-1 min-w-[280px]' : ''}`} style={{ flex: showBoxZone || showXGMap ? undefined : '0.8 1 0%', minWidth: showBoxZone || showXGMap ? undefined : '120px' }}>
                    {showBoxZone ? (
                      <div className="p-2 h-full overflow-auto">
                        <BoxZoneMap
                          actions={categoriesToShow.flatMap(([, items]) => items.map(i => i.action))}
                          actionType={selectedCategory || undefined}
                          onScoreSelect={(score) => {
                            if (selectedActionIndex !== null) {
                              applyQuickScore(selectedActionIndex, score);
                            }
                          }}
                        />
                      </div>
                    ) : showXGMap ? (
                      <div className="p-2 h-full overflow-auto flex items-start justify-center">
                        <XGPitchMap compact />
                      </div>
                    ) : (
                      <div className="flex flex-col h-full">
                        <div className="px-2 py-1 border-b flex items-center justify-between">
                          <p className="text-[10px] font-semibold">
                            R90 Action Scores
                            {activeZones.length > 0 && <span className="ml-1 text-muted-foreground font-normal">(filtered)</span>}
                          </p>
                          <span className="text-[9px] text-muted-foreground">{filteredMappedRatings.length}</span>
                        </div>
                        <ScrollArea className="flex-1">
                          <div className="p-1.5 space-y-0">
                            {categorisedRatings.length > 0 ? categorisedRatings.map((group, gi) => (
                              <div key={gi}>
                                {categorisedRatings.length > 1 && (
                                  <div className="flex items-center gap-1.5 px-1 py-1.5">
                                    <Separator className="flex-1 bg-[hsl(43,49%,61%)]/50" />
                                    <span className="text-[8px] font-semibold uppercase tracking-wider text-[hsl(43,49%,61%)]">{group.label}</span>
                                    <Separator className="flex-1 bg-[hsl(43,49%,61%)]/50" />
                                  </div>
                                )}
                                {group.items.map(r => (
                                  <button
                                    key={r.id}
                                    className="w-full text-left px-2 py-1 rounded hover:bg-accent text-xs flex items-center gap-2 group"
                                    onClick={() => selectedActionIndex !== null && applyQuickScore(selectedActionIndex, String(r.score))}
                                  >
                                    <span className="font-mono font-bold text-primary shrink-0 min-w-[50px]">{r.score}</span>
                                    <span className="truncate flex-1">{r.title}</span>
                                  </button>
                                ))}
                              </div>
                            )) : mappedRatings.length === 0 ? (
                              <div className="text-center py-4">
                                <p className="text-[10px] text-muted-foreground">No action scores configured</p>
                                <p className="text-[9px] text-muted-foreground mt-1">Set up in Coaching Database → Action Scores</p>
                              </div>
                            ) : (
                              <p className="text-[10px] text-muted-foreground text-center py-4">No scores match the selected zones</p>
                            )}
                          </div>
                        </ScrollArea>
                        <div className="border-t px-2 py-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                            onClick={() => setSettingsOpen(true)}
                          >
                            <Settings className="h-3 w-3" /> Configure Scores
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Active action editing panel */}
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
                    <BlurInput
                      value={activeAction.action_description}
                      onCommit={(val) => updateAction(selectedActionIndex, "action_description", val)}
                      placeholder="Description"
                      className="h-7 text-xs"
                    />
                    <BlurInput
                      value={activeAction.notes}
                      onCommit={(val) => updateAction(selectedActionIndex, "notes", val)}
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
          </div>
        </div>

        {/* Settings popup for action scores - rendered via portal to escape parent dialog z-index */}
        {settingsOpen && ReactDOM.createPortal(
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogContent className="fixed left-1/2 top-1/2 z-[10000] w-[min(96vw,1100px)] max-h-[85vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2">
              <DialogTitle className="text-sm font-semibold">
                Action Score Configuration
                {selectedCategory && <span className="text-primary ml-2">— {selectedCategory}</span>}
              </DialogTitle>
              <ActionScoresManagement initialFilter={selectedCategory || undefined} />
            </DialogContent>
          </Dialog>,
          document.body
        )}
      </DialogContent>
    </Dialog>
  );
};
