import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { X, Search, Maximize, ChevronLeft, ChevronRight, Save } from "lucide-react";
import { toast } from "sonner";

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

  // Auto-advance when all 4 on screen are scored
  useEffect(() => {
    if (pageActions.length > 0 && pageActions.every(a => a.action_score && a.action_score !== "")) {
      const timer = setTimeout(() => {
        if (pageIndex < totalPages - 1) {
          setPageIndex(p => p + 1);
          handleUpdateReport();
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [pageActions, pageIndex, totalPages, handleUpdateReport]);

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
      ).slice(0, 12)
    );
  }, [r90Scores]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
      setSearchQuery("");
      setSearchResults([]);
      setActiveActionId(null);
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

  const getScoreInputPosition = (i: number) => {
    switch (i) {
      case 0: return "bottom-8 right-8";
      case 1: return "bottom-8 left-8";
      case 2: return "top-8 right-8";
      case 3: return "top-8 left-8";
      default: return "bottom-8 right-8";
    }
  };

  const getFullscreenPosition = (i: number) => {
    switch (i) {
      case 0: return "top-2 right-2";
      case 1: return "top-2 left-2";
      case 2: return "bottom-2 right-2";
      case 3: return "bottom-2 left-2";
      default: return "top-2 right-2";
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-white">Loading actions...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Top bar: progress + update report */}
      <div className="absolute top-3 left-0 right-0 z-30 flex items-center justify-between px-4">
        <div />
        <div className="flex items-center gap-2">
          <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${completionPct}%`,
                backgroundColor: completionPct < 30 ? '#ef4444' : completionPct < 70 ? '#f59e0b' : '#22c55e',
              }}
            />
          </div>
          <span className="text-white text-xs font-medium">{completionPct}%</span>
          <span className="text-white/40 text-[10px]">Page {pageIndex + 1}/{totalPages}</span>
        </div>
        <button
          onClick={handleUpdateReport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
        >
          <Save className="w-3 h-3" /> Update Report
        </button>
      </div>

      {/* 2x2 Grid — fills entire screen */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px">
        {pageActions.map((action, i) => (
          <div key={action.id} className="relative bg-black overflow-hidden">
            <video
              ref={el => { videoRefs.current[i] = el; }}
              src={action.video_url}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-contain"
            />

            {/* Action label — far corner */}
            <div className={`absolute ${getActionLabelPosition(i)} z-10`}>
              <span className="text-white/80 text-[10px] font-bold bg-black/60 px-1.5 py-0.5 rounded">
                #{pageIndex * 4 + i + 1} {action.action_type}
              </span>
            </div>

            {/* Score input — inner corner */}
            <div className={`absolute ${getScoreInputPosition(i)} z-10 flex flex-col items-center gap-1`}>
              <Input
                value={action.action_score || ""}
                onChange={(e) => handleScoreChange(action.id, e.target.value)}
                onFocus={() => setActiveActionId(action.id)}
                placeholder="—"
                className="w-14 h-7 text-xs text-center bg-black/70 border-white/20 text-white"
              />
            </div>

            {/* Fullscreen button */}
            <button
              onClick={() => handleFullscreen(i)}
              className={`absolute ${getFullscreenPosition(i)} z-10 p-1 bg-black/50 rounded hover:bg-black/80 transition-colors`}
            >
              <Maximize className="w-3 h-3 text-white/60" />
            </button>
          </div>
        ))}

        {/* Central R90 search — wider */}
        <div
          ref={searchRef}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[420px] max-w-[90vw]"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search R90 scores..."
              className="pl-9 h-10 text-sm bg-black/90 border-white/20 text-white placeholder:text-white/40 shadow-lg shadow-black/50"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-1 max-h-56 overflow-y-auto bg-black/95 border border-white/20 rounded-md shadow-xl">
              {searchResults.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    if (activeActionId) {
                      handleScoreChange(activeActionId, s.score);
                    }
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 flex items-center gap-3"
                >
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white shrink-0 ${getScoreColor(s.score)}`}>
                    {s.score}
                  </span>
                  <span className="flex-1">{s.title}</span>
                  <span className="text-white/40 text-[10px] shrink-0">{s.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation arrows — left and right edges */}
      {pageIndex > 0 && (
        <button
          onClick={() => setPageIndex(p => p - 1)}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-30 p-2 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
      )}
      {pageIndex < totalPages - 1 && (
        <button
          onClick={() => setPageIndex(p => p + 1)}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-30 p-2 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      )}

      {/* Close button — bottom centre */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
        <button
          onClick={() => { onSave?.(); onClose(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-black/80 border border-white/20 text-white text-xs hover:bg-white/10 transition-colors"
        >
          <X className="h-3.5 w-3.5" /> Close
        </button>
      </div>
    </div>
  );
};
