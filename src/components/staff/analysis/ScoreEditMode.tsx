import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { X, Search, Maximize, ChevronLeft, ChevronRight, Crosshair, Move } from "lucide-react";
import { toast } from "sonner";
import { XGPitchMap } from "@/components/staff/XGPitchMap";
import { BoxZoneMap } from "@/components/staff/BoxZoneMap";
import { useVideoPreloader } from "@/hooks/useVideoPreloader";
import { parseMinuteToSeconds } from "@/lib/actionSorting";
import { getPlaybackInstruction } from "@/lib/clipVideoUtils";

interface ScoreEditModeProps {
  analysisId: string;
  playerName: string;
  onClose: () => void;
  onSave?: () => void;
}

interface Action {
  id: string;
  action_type: string;
  action_score: string;
  minute: string;
  video_url: string;
  action_number: number;
  clip_start: number | null;
  clip_end: number | null;
}

interface R90Score {
  id: string;
  category: string;
  title: string;
  score: string;
}

const OFFENSIVE_TYPES = new Set([
  "shot", "shots", "goal", "goals", "assist", "assists",
  "dribble", "dribbles", "take on", "take ons", "take-on",
  "cross", "crosses", "crossing", "through ball", "through balls",
  "key pass", "key passes", "chance created", "chances created",
  "pass into final third", "progressive pass", "progressive passes",
  "attacking cross", "attacking crosses",
]);

const DEFENSIVE_TYPES = new Set([
  "tackle", "tackles", "interception", "interceptions",
  "clearance", "clearances", "block", "blocks", "blocked",
  "recovery", "recoveries", "ball recovery",
  "applied pressure", "applied pressures", "pressure",
  "aerial duel", "aerial duels", "ground duel", "ground duels",
  "defensive action", "defensive actions",
]);

function classifyAction(type: string): "offensive" | "defensive" | "other" {
  const lower = type.toLowerCase().trim();
  if (OFFENSIVE_TYPES.has(lower)) return "offensive";
  if (DEFENSIVE_TYPES.has(lower)) return "defensive";
  return "other";
}

function smartSortActions(actions: Action[]): Action[] {
  if (actions.length === 0) return actions;

  // Check if all actions have action_type
  const allHaveType = actions.every(a => a.action_type && a.action_type.trim() !== "");
  if (!allHaveType) return actions;

  // First, group actions that are within 10 seconds of each other
  const withTime = actions.map(a => ({
    ...a,
    seconds: parseMinuteToSeconds(a.minute),
  }));

  // Sort by time first to find clusters
  const byTime = [...withTime].sort((a, b) => a.seconds - b.seconds);

  // Build clusters of actions within 10s of each other
  type ActionWithTime = Action & { seconds: number };
  const clusters: ActionWithTime[][] = [];
  let currentCluster: typeof byTime = [];

  for (const action of byTime) {
    if (currentCluster.length === 0) {
      currentCluster.push(action);
    } else {
      const lastTime = currentCluster[currentCluster.length - 1].seconds;
      if (action.seconds !== Infinity && lastTime !== Infinity && Math.abs(action.seconds - lastTime) <= 10) {
        currentCluster.push(action);
      } else {
        clusters.push(currentCluster);
        currentCluster = [action];
      }
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster);

  // Now sort clusters: first by classification priority (offensive, defensive, other),
  // then by action type within the same classification, but keep cluster order for time-close actions
  const classifyCluster = (cluster: ActionWithTime[]): "offensive" | "defensive" | "other" => {
    const classes = cluster.map(a => classifyAction(a.action_type));
    if (classes.includes("offensive")) return "offensive";
    if (classes.includes("defensive")) return "defensive";
    return "other";
  };

  const classPriority = { offensive: 0, defensive: 1, other: 2 };

  const singleClusters: ActionWithTime[] = clusters.filter(c => c.length === 1).map(c => c[0]);
  const multiClusters: ActionWithTime[][] = clusters.filter(c => c.length > 1);

  singleClusters.sort((a, b) => {
    const ca = classifyAction(a.action_type);
    const cb = classifyAction(b.action_type);
    if (classPriority[ca] !== classPriority[cb]) return classPriority[ca] - classPriority[cb];
    const typeCompare = a.action_type.localeCompare(b.action_type);
    if (typeCompare !== 0) return typeCompare;
    return a.seconds - b.seconds;
  });

  multiClusters.sort((a, b) => {
    const ca = classifyCluster(a);
    const cb = classifyCluster(b);
    if (classPriority[ca] !== classPriority[cb]) return classPriority[ca] - classPriority[cb];
    return a[0].seconds - b[0].seconds;
  });

  const result: Action[] = [];

  // Group singles by action type, maintaining sort order
  const typeGroups: Map<string, (typeof withTime)[number][]> = new Map();
  for (const a of singleClusters) {
    const key = a.action_type;
    if (!typeGroups.has(key)) typeGroups.set(key, []);
    typeGroups.get(key)!.push(a);
  }

  // Build ordered list: type groups sorted by classification
  const orderedTypes = [...typeGroups.entries()].sort((a, b) => {
    const ca = classifyAction(a[0]);
    const cb = classifyAction(b[0]);
    if (classPriority[ca] !== classPriority[cb]) return classPriority[ca] - classPriority[cb];
    return a[0].localeCompare(b[0]);
  });

  for (const [, group] of orderedTypes) {
    result.push(...group);
  }

  // Append multi-clusters (time-close groups)
  for (const cluster of multiClusters) {
    result.push(...cluster);
  }

  return result;
}

export const ScoreEditMode = ({ analysisId, playerName, onClose, onSave }: ScoreEditModeProps) => {
  const [actions, setActions] = useState<Action[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pendingWriteCount, setPendingWriteCount] = useState(0);
  const [r90Scores, setR90Scores] = useState<R90Score[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<R90Score[]>([]);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [pendingScore, setPendingScore] = useState<string | null>(null);
  const [sidePanel, setSidePanel] = useState<"shot" | "movement" | null>(null);
  const [panelSide, setPanelSide] = useState<"left" | "right">("left");
  const searchRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const clipIntervalsRef = useRef<(number | null)[]>([null, null, null, null]);

  useEffect(() => {
    const fetchData = async () => {
      const [actionsRes, scoresRes] = await Promise.all([
        supabase
          .from("performance_report_actions")
          .select("id, action_type, action_score, minute, video_url, action_number, clip_start, clip_end")
          .eq("analysis_id", analysisId)
          .not("video_url", "is", null)
          .order("action_number", { ascending: true }),
        supabase
          .from("r90_ratings")
          .select("id, category, title, score")
          .order("category"),
      ]);
      const rawActions = (actionsRes.data || []) as unknown as Action[];
      setActions(smartSortActions(rawActions));
      setR90Scores((scoresRes.data || []) as unknown as R90Score[]);
      setLoading(false);
    };
    fetchData();
  }, [analysisId]);

  const pageActions = actions.slice(pageIndex * 4, pageIndex * 4 + 4);
  const totalPages = Math.ceil(actions.length / 4);
  const scoredCount = actions.filter(a => a.action_score && a.action_score !== "").length;
  const completionPct = actions.length > 0 ? Math.round((scoredCount / actions.length) * 100) : 0;

  // Preload next page videos
  const allVideoUrls = useMemo(() => {
    return actions.map(a => {
      const instr = getPlaybackInstruction(a);
      return instr.mode !== 'blocked' ? instr.src : null;
    }).filter(Boolean) as string[];
  }, [actions]);
  const { preloadNextVideos } = useVideoPreloader({
    videos: allVideoUrls,
    preloadCount: 4,
    enabled: true,
  });

  // Trigger preload when page changes
  useEffect(() => {
    const currentLastIndex = (pageIndex + 1) * 4 - 1;
    preloadNextVideos(currentLastIndex);
  }, [pageIndex, preloadNextVideos]);

  // Clip boundary enforcement for each of the 4 tiles
  useEffect(() => {
    clipIntervalsRef.current.forEach(id => { if (id) clearInterval(id); });
    clipIntervalsRef.current = [null, null, null, null];

    pageActions.forEach((action, i) => {
      const instruction = getPlaybackInstruction(action);
      if (instruction.mode !== 'clipped') return;

      const { clipStart, clipEnd } = instruction;
      const vid = videoRefs.current[i];
      if (vid) {
        const onLoaded = () => {
          vid.currentTime = clipStart;
          vid.play().catch(() => {});
        };
        if (vid.readyState >= 2) {
          vid.currentTime = clipStart;
        } else {
          vid.addEventListener('loadeddata', onLoaded, { once: true });
        }
      }

      clipIntervalsRef.current[i] = window.setInterval(() => {
        const v = videoRefs.current[i];
        if (!v) return;
        if (v.currentTime >= clipEnd) {
          v.currentTime = clipStart;
        }
        if (v.currentTime < clipStart - 0.5) {
          v.currentTime = clipStart;
        }
      }, 100);
    });

    return () => {
      clipIntervalsRef.current.forEach(id => { if (id) clearInterval(id); });
    };
  }, [pageActions]);

  const lastAutoAdvanceSignatureRef = useRef("");

  const handleUpdateReport = useCallback(async () => {
    // Save all current scores silently without leaving score edit
    const updates = actions.filter(a => a.action_score).map(a =>
      supabase.from("performance_report_actions").update({ action_score: a.action_score } as any).eq("id", a.id)
    );
    await Promise.all(updates);
    onSave?.();
    toast.success("Report updated", { style: { zIndex: 100000 } });
  }, [onSave, actions]);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    if (activeActionId && !pageActions.some((action) => action.id === activeActionId)) {
      setActiveActionId(null);
    }
  }, [activeActionId, pageActions]);

  useEffect(() => {
    lastAutoAdvanceSignatureRef.current = "";
  }, [pageIndex]);

  // Auto-advance when all 4 on screen are scored — no parent refresh, just local advance
  useEffect(() => {
    if (activeActionId || pendingWriteCount > 0 || pageActions.length === 0) return;
    if (!pageActions.every(a => a.action_score && a.action_score !== "")) return;

    const signature = pageActions.map(action => `${action.id}:${action.action_score}`).join('|');
    if (lastAutoAdvanceSignatureRef.current === signature) return;

    lastAutoAdvanceSignatureRef.current = signature;
    const timer = setTimeout(() => {
      if (pageIndex < totalPages - 1) {
        toast.success("Autosaved, moving to next 4 clips");
        setPageIndex(p => p + 1);
      } else {
        toast.success("All clips scored — autosaved");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [activeActionId, pageActions, pageIndex, pendingWriteCount, totalPages]);

  const prefixNegativeScore = useCallback((value: string) => {
    const stripped = String(value || "").replace(/-/g, "");
    return stripped ? `-${stripped}` : "-";
  }, []);

  const handleScoreChange = useCallback(async (actionId: string, score: string) => {
    setActions(prev => prev.map(a => a.id === actionId ? { ...a, action_score: score } : a));
    setPendingWriteCount(count => count + 1);
    const { error } = await supabase
      .from("performance_report_actions")
      .update({ action_score: score } as any)
      .eq("id", actionId);
    if (error) {
      toast.error("Failed to save action score");
    }
    setPendingWriteCount(count => Math.max(0, count - 1));
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const q = query.toLowerCase();
    setSearchResults(
      r90Scores.filter(s =>
        s.title?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        s.score?.toString().includes(q)
      ).slice(0, 16)
    );
  }, [r90Scores]);

  const queueSelectedScore = useCallback((score: string) => {
    setPendingScore(score);
    setSearchQuery("");
    setSearchResults([]);
    setSidePanel(null);
  }, []);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  const handleFullscreen = (index: number) => {
    const video = videoRefs.current[index];
    if (video) video.requestFullscreen?.();
  };

  const getScoreColor = (score: string) => {
    const n = parseFloat(score);
    if (isNaN(n)) return "bg-muted";
    if (n < 0) return "bg-red-950";
    if (n < 0.4) return "bg-red-600";
    if (n < 0.8) return "bg-orange-500";
    if (n < 1.0) return "bg-yellow-400";
    if (n < 1.4) return "bg-lime-400";
    if (n < 1.8) return "bg-green-500";
    return "bg-green-700";
  };

  const getCornerStackPosition = (i: number) => {
    switch (i) {
      case 0: return "top-1 left-1";
      case 1: return "top-1 right-1";
      case 2: return "bottom-1 left-1";
      case 3: return "bottom-1 right-1";
      default: return "top-1 left-1";
    }
  };

  const getCornerStackAlignment = (i: number) => {
    switch (i) {
      case 0:
      case 2:
        return "items-start";
      case 1:
      case 3:
        return "items-end";
      default:
        return "items-start";
    }
  };

  const getCornerStackDirection = (i: number) => (i < 2 ? "flex-col" : "flex-col-reverse");

  // Score input: inner corners (near centre)
  const getScorePosition = (i: number) => {
    switch (i) {
      case 0: return "bottom-[28px] right-2";
      case 1: return "bottom-[28px] left-2";
      case 2: return "top-[28px] right-2";
      case 3: return "top-[28px] left-2";
      default: return "bottom-[28px] right-2";
    }
  };

  const currentFocusedAction = pageActions.find((action) => action.id === activeActionId) || pageActions[0];

  const overlayContent = (
    <div className="fixed inset-0 z-[1000] bg-background text-foreground">
      {/* Top centre: progress bar + update button */}
      <div className="absolute top-2 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2">
        <div className="flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 shadow-lg backdrop-blur-sm">
          <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${completionPct < 30 ? "bg-destructive" : completionPct < 70 ? "bg-accent" : "bg-primary"}`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <span className="text-xs font-medium">{completionPct}%</span>
          <span className="text-[10px] text-muted-foreground">Page {pageIndex + 1}/{totalPages}</span>
        </div>
        <button
          onClick={handleUpdateReport}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground shadow-lg transition-opacity hover:opacity-90"
          title="Update report"
        >
          U
        </button>
      </div>

      {/* Side panel for Shot Map / Movement - z-50 to be above search */}
      {sidePanel && (
        <div
          className={`absolute ${panelSide === "left" ? "left-2" : "right-2"} top-12 bottom-12 z-50 w-[min(46vw,760px)] min-w-[380px] max-w-[760px]`}
        >
          <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background/95 shadow-2xl backdrop-blur-md">
            <button
              onClick={() => setPanelSide((current) => current === "left" ? "right" : "left")}
              className={`absolute ${panelSide === "left" ? "-right-3" : "-left-3"} top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-lg transition-colors hover:bg-muted`}
              title="Move panel"
            >
              {panelSide === "left" ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold">{sidePanel === "shot" ? "Shot Map" : "Box Movement & Crossing Scores"}</p>
                <p className="text-[11px] text-muted-foreground">Select a grid score, then tap the action score box to fill.</p>
              </div>
              <button
                onClick={() => setSidePanel(null)}
                className="rounded-md border border-border px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-muted"
              >
                Close
              </button>
            </div>
            <div className="flex-1 min-h-0 p-3">
              {sidePanel === "shot" ? (
                <div className="h-full">
                  <XGPitchMap compact onScoreSelect={queueSelectedScore} />
                </div>
              ) : (
                <div className="h-full min-h-0 rounded-lg border border-border bg-card/40">
                  <BoxZoneMap
                    actions={pageActions}
                    actionType={currentFocusedAction?.action_type}
                    onScoreSelect={queueSelectedScore}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Video grid */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px bg-border/40">
        {pageActions.map((action, i) => (
          <div key={action.id} className="relative overflow-hidden bg-black">
            {(() => {
              const instruction = getPlaybackInstruction(action);
              const videoSrc = instruction.mode !== 'blocked' ? instruction.src : '';
              const shouldLoop = instruction.mode === 'standalone';
              return (
                <video
                  ref={el => { videoRefs.current[i] = el; }}
                  src={videoSrc}
                  autoPlay
                  loop={shouldLoop}
                  muted
                  playsInline
                  className="absolute inset-0 h-full w-full object-contain"
                />
              );
            })()}

            <div className={`absolute ${getCornerStackPosition(i)} z-20`}>
              <div className={`flex ${getCornerStackDirection(i)} ${getCornerStackAlignment(i)} gap-1`}>
                <span className="rounded bg-background/80 px-2 py-1 text-[10px] font-bold text-foreground shadow-md backdrop-blur-sm">
                  #{pageIndex * 4 + i + 1}{action.action_type ? ` ${action.action_type}` : ""}
                </span>
                <button
                  onClick={() => handleFullscreen(i)}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/80 text-foreground shadow-lg backdrop-blur-sm transition-colors hover:bg-muted"
                  title="Fullscreen"
                >
                  <Maximize className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Score input: inner corner */}
            <div className={`absolute ${getScorePosition(i)} z-20`}>
              <Input
                value={action.action_score || ""}
                onChange={(e) => void handleScoreChange(action.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'Subtract') {
                    e.preventDefault();
                    void handleScoreChange(action.id, prefixNegativeScore(action.action_score || ""));
                  }
                }}
                onFocus={(e) => {
                  setActiveActionId(action.id);
                  if (!pendingScore && !action.action_score) {
                    void handleScoreChange(action.id, "0.");
                  }
                  const inp = e.target as HTMLInputElement;
                  requestAnimationFrame(() => {
                    const len = inp.value.length;
                    inp.setSelectionRange(len, len);
                  });
                }}
                onBlur={() => {
                  setActiveActionId((current) => current === action.id ? null : current);
                }}
                onClick={() => {
                  if (pendingScore) {
                    void handleScoreChange(action.id, pendingScore);
                    setPendingScore(null);
                    setActiveActionId(action.id);
                  }
                }}
                placeholder="Score"
                className={`h-9 w-28 rounded-md bg-background/90 px-2 text-center text-sm font-semibold text-foreground shadow-lg backdrop-blur-sm ${
                  pendingScore
                    ? "border-2 border-primary ring-2 ring-primary/40"
                    : "border border-border"
                }`}
              />
            </div>
          </div>
        ))}

        {/* Search R90 scores - z-40 so it sits above score inputs */}
        {!pendingScore && (
          <div
            ref={searchRef}
            className="absolute left-1/2 top-1/2 z-40 w-[min(48rem,94vw)] -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
          >
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="Search R90 scores..."
                  className="h-11 border-border bg-background/95 pl-9 text-sm shadow-xl backdrop-blur-md"
                />
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-2 max-h-72 overflow-y-auto rounded-md border border-border bg-background/95 shadow-2xl backdrop-blur-md">
                {searchResults.map((s) => (
                  <button
                    key={s.id}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => queueSelectedScore(s.score)}
                    className="grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 border-b border-border/60 px-3 py-2 text-left text-xs transition-colors hover:bg-muted/60 last:border-b-0"
                  >
                    <span className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${getScoreColor(s.score)}`}>
                      {s.score}
                    </span>
                    <span className="whitespace-normal break-words leading-snug">{s.title}</span>
                    <span className="pt-0.5 text-[10px] text-muted-foreground">{s.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom centre: tool buttons */}
      <div className="absolute bottom-2 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2">
        <button
          onClick={() => {
            onSave?.();
            onClose();
          }}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/90 text-foreground shadow-lg backdrop-blur-sm transition-colors hover:bg-muted"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <button
          onClick={() => setSidePanel((current) => current === "shot" ? null : "shot")}
          className={`flex h-9 w-9 items-center justify-center rounded-md border shadow-lg backdrop-blur-sm transition-colors ${
            sidePanel === "shot"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background/90 text-foreground hover:bg-muted"
          }`}
          title="Shot Map"
        >
          <Crosshair className="h-4 w-4" />
        </button>
        <button
          onClick={() => setSidePanel((current) => current === "movement" ? null : "movement")}
          className={`flex h-9 w-9 items-center justify-center rounded-md border shadow-lg backdrop-blur-sm transition-colors ${
            sidePanel === "movement"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background/90 text-foreground hover:bg-muted"
          }`}
          title="Box movement & crossing scores"
        >
          <Move className="h-4 w-4" />
        </button>
      </div>

      {/* Prev/Next page buttons */}
      {pageIndex > 0 && (
        <button
          onClick={() => setPageIndex(p => p - 1)}
          className="absolute left-3 top-1/2 z-40 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-xl backdrop-blur-sm transition-colors hover:bg-muted"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {pageIndex < totalPages - 1 && (
        <button
          onClick={() => setPageIndex(p => p + 1)}
          className="absolute right-3 top-1/2 z-40 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-xl backdrop-blur-sm transition-colors hover:bg-muted"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-background text-foreground">
        <div className="text-sm font-medium">Loading actions...</div>
      </div>,
      document.body,
    );
  }

  return createPortal(overlayContent, document.body);
};
