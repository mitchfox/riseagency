import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { X, Search, Maximize, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { XGPitchMap } from "@/components/staff/XGPitchMap";
import { BoxZoneMap } from "@/components/staff/BoxZoneMap";

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
}

interface R90Score {
  id: string;
  category: string;
  title: string;
  score: string;
}

export const ScoreEditMode = ({ analysisId, playerName, onClose, onSave }: ScoreEditModeProps) => {
  const [actions, setActions] = useState<Action[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [r90Scores, setR90Scores] = useState<R90Score[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<R90Score[]>([]);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [pendingScore, setPendingScore] = useState<string | null>(null);
  const [sidePanel, setSidePanel] = useState<"shot" | "movement" | null>(null);
  const [panelSide, setPanelSide] = useState<"left" | "right">("left");
  const searchRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [actionsRes, scoresRes] = await Promise.all([
        supabase
          .from("performance_report_actions")
          .select("id, action_type, action_score, minute, video_url, action_number")
          .eq("analysis_id", analysisId)
          .not("video_url", "is", null)
          .order("action_number", { ascending: true }),
        supabase
          .from("r90_ratings")
          .select("id, category, title, score")
          .order("category"),
      ]);
      setActions((actionsRes.data || []) as unknown as Action[]);
      setR90Scores((scoresRes.data || []) as unknown as R90Score[]);
      setLoading(false);
    };
    fetchData();
  }, [analysisId]);

  const pageActions = actions.slice(pageIndex * 4, pageIndex * 4 + 4);
  const totalPages = Math.ceil(actions.length / 4);
  const scoredCount = actions.filter(a => a.action_score && a.action_score !== "").length;
  const completionPct = actions.length > 0 ? Math.round((scoredCount / actions.length) * 100) : 0;

  const handleUpdateReport = useCallback(() => {
    onSave?.();
    toast.success("Report updated");
  }, [onSave]);

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

  // Auto-advance when all 4 on screen are scored
  useEffect(() => {
    if (!activeActionId && pageActions.length > 0 && pageActions.every(a => a.action_score && a.action_score !== "")) {
      const timer = setTimeout(() => {
        if (pageIndex < totalPages - 1) {
          setPageIndex(p => p + 1);
          handleUpdateReport();
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activeActionId, pageActions, pageIndex, totalPages, handleUpdateReport]);

  const handleScoreChange = useCallback(async (actionId: string, score: string) => {
    setActions(prev => prev.map(a => a.id === actionId ? { ...a, action_score: score } : a));
    await supabase
      .from("performance_report_actions")
      .update({ action_score: score } as any)
      .eq("id", actionId);
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

  const getActionLabelPosition = (i: number) => {
    switch (i) {
      case 0: return "top-2 left-2";
      case 1: return "top-2 right-2";
      case 2: return "bottom-2 left-2";
      case 3: return "bottom-2 right-2";
      default: return "top-2 left-2";
    }
  };

  const getControlGroupPosition = (i: number) => {
    switch (i) {
      case 0: return "bottom-14 right-8";
      case 1: return "bottom-14 left-8";
      case 2: return "top-14 right-8";
      case 3: return "top-14 left-8";
      default: return "bottom-14 right-8";
    }
  };

  const getControlGroupLayout = (i: number) => {
    return i === 0 || i === 2 ? "flex-row" : "flex-row-reverse";
  };

  const currentFocusedAction = pageActions.find((action) => action.id === activeActionId) || pageActions[0];

  const overlayContent = (
    <div className="fixed inset-0 z-[1000] bg-background text-foreground">
      <div className="absolute top-3 left-4 z-40 flex items-center gap-2">
        <button
          onClick={() => {
            onSave?.();
            onClose();
          }}
          className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-background/90 px-3 text-xs font-medium shadow-lg backdrop-blur-sm transition-colors hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" /> Close
        </button>
        <button
          onClick={() => setSidePanel((current) => current === "shot" ? null : "shot")}
          className={`h-9 rounded-md border px-3 text-xs font-medium shadow-lg backdrop-blur-sm transition-colors ${sidePanel === "shot" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/90 hover:bg-muted"}`}
        >
          Shot Map
        </button>
        <button
          onClick={() => setSidePanel((current) => current === "movement" ? null : "movement")}
          className={`h-9 rounded-md border px-3 text-xs font-medium shadow-lg backdrop-blur-sm transition-colors ${sidePanel === "movement" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/90 hover:bg-muted"}`}
        >
          Movement
        </button>
      </div>

      <div className="absolute top-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 px-4">
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
      </div>

      {sidePanel && (
        <div
          className={`absolute ${panelSide === "left" ? "left-4" : "right-4"} top-16 bottom-4 z-30 w-[min(46vw,760px)] min-w-[420px] max-w-[760px]`}
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
                <p className="text-sm font-semibold">{sidePanel === "shot" ? "Shot Map" : "Movement Scores"}</p>
                <p className="text-[11px] text-muted-foreground">Select a grid score, then tap the action score box you want to fill.</p>
              </div>
              <button
                onClick={() => setSidePanel(null)}
                className="rounded-md border border-border px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-muted"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-3">
              {sidePanel === "shot" ? (
                <div className="h-full overflow-auto">
                  <XGPitchMap compact onScoreSelect={queueSelectedScore} />
                </div>
              ) : (
                <div className="h-full overflow-auto rounded-lg border border-border bg-card/40">
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

      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px bg-border/40">
        {pageActions.map((action, i) => (
          <div key={action.id} className="relative overflow-hidden bg-black">
            <video
              ref={el => { videoRefs.current[i] = el; }}
              src={action.video_url}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 h-full w-full object-contain"
            />

            <div className={`absolute ${getActionLabelPosition(i)} z-10`}>
              <span className="rounded bg-background/80 px-2 py-1 text-[10px] font-bold text-foreground shadow-md backdrop-blur-sm">
                #{pageIndex * 4 + i + 1} {action.action_type}
              </span>
            </div>

            <div className={`absolute ${getControlGroupPosition(i)} z-20 flex items-center gap-2 ${getControlGroupLayout(i)}`}>
              <button
                onClick={() => handleFullscreen(i)}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background/80 text-foreground shadow-lg backdrop-blur-sm transition-colors hover:bg-muted"
                title="Fullscreen"
              >
                <Maximize className="h-4 w-4" />
              </button>
              <Input
                value={action.action_score || ""}
                onChange={(e) => void handleScoreChange(action.id, e.target.value)}
                onFocus={() => {
                  setActiveActionId(action.id);
                  if (!pendingScore && !action.action_score) {
                    void handleScoreChange(action.id, "0");
                  }
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
                className={`h-10 w-24 rounded-md bg-background/88 px-2 text-center text-sm font-semibold text-foreground shadow-lg backdrop-blur-sm ${pendingScore ? "border-2 border-primary ring-2 ring-primary/40" : "border-border"}`}
              />
            </div>
          </div>
        ))}

        <div
          ref={searchRef}
          className="absolute left-1/2 top-1/2 z-30 w-[min(44rem,92vw)] -translate-x-1/2 -translate-y-1/2"
        >
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search R90 scores..."
                className="h-11 border-border bg-background/95 pl-9 text-sm shadow-xl backdrop-blur-md"
              />
            </div>
            <button
              onClick={handleUpdateReport}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground shadow-lg transition-opacity hover:opacity-90"
              title="Update report"
            >
              U
            </button>
          </div>

          {pendingScore && (
            <div className="mt-2 rounded-md border border-primary/40 bg-background/92 px-3 py-2 text-xs text-foreground shadow-lg backdrop-blur-sm">
              Selected score <span className="font-bold text-primary">{pendingScore}</span> — click any score box to apply it.
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="mt-2 max-h-72 overflow-y-auto rounded-md border border-border bg-background/96 shadow-2xl backdrop-blur-md">
              {searchResults.map((s) => (
                <button
                  key={s.id}
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
      </div>

      {pageIndex > 0 && (
        <button
          onClick={() => setPageIndex(p => p - 1)}
          className="absolute left-3 top-1/2 z-40 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/82 text-foreground shadow-xl backdrop-blur-sm transition-colors hover:bg-muted"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {pageIndex < totalPages - 1 && (
        <button
          onClick={() => setPageIndex(p => p + 1)}
          className="absolute right-3 top-1/2 z-40 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/82 text-foreground shadow-xl backdrop-blur-sm transition-colors hover:bg-muted"
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
