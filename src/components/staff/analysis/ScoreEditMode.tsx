import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, ChevronLeft, ChevronRight, Search } from "lucide-react";

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

  // Auto-advance when all 4 on screen are scored
  useEffect(() => {
    if (pageActions.length > 0 && pageActions.every(a => a.action_score && a.action_score !== "")) {
      const timer = setTimeout(() => {
        if (pageIndex < totalPages - 1) {
          setPageIndex(p => p + 1);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [pageActions, pageIndex, totalPages]);

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

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-white">Loading actions...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/90 border-b border-white/10">
        <span className="text-white text-sm font-medium">Score Edit — {playerName}</span>
        <div className="flex items-center gap-4">
          <span className="text-white/60 text-xs">Page {pageIndex + 1}/{totalPages}</span>
          <Button size="sm" variant="ghost" className="text-white" onClick={() => { onSave?.(); onClose(); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 2x2 Grid of videos */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-1 p-1 min-h-0 relative">
        {pageActions.map((action, i) => (
          <div key={action.id} className="relative flex flex-col bg-black rounded overflow-hidden">
            <video
              src={action.video_url}
              controls
              autoPlay={i === 0}
              muted={i > 0}
              className="flex-1 w-full object-contain min-h-0"
            />
            {/* Action number & score input in the central corner */}
            <div className={`absolute ${i === 0 ? 'bottom-2 right-2' : i === 1 ? 'bottom-2 left-2' : i === 2 ? 'top-2 right-2' : 'top-2 left-2'} flex flex-col items-center gap-1 z-10`}>
              <span className="text-white/80 text-[10px] font-bold bg-black/60 px-1.5 py-0.5 rounded">
                #{pageIndex * 4 + i + 1} {action.action_type}
              </span>
              <Input
                value={action.action_score || ""}
                onChange={(e) => handleScoreChange(action.id, e.target.value)}
                onFocus={() => setActiveActionId(action.id)}
                placeholder="Score"
                className="w-16 h-7 text-xs text-center bg-black/70 border-white/20 text-white"
              />
            </div>
          </div>
        ))}

        {/* Central R90 search */}
        <div
          ref={searchRef}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-64"
        >
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/50" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search R90 scores..."
              className="pl-7 h-8 text-xs bg-black/80 border-white/20 text-white placeholder:text-white/40"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-1 max-h-48 overflow-y-auto bg-black/90 border border-white/20 rounded-md">
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
                  className="w-full text-left px-3 py-1.5 text-xs text-white hover:bg-white/10 flex items-center gap-2"
                >
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${getScoreColor(s.score)}`}>
                    {s.score}
                  </span>
                  <span className="truncate">{s.title}</span>
                  <span className="text-white/40 ml-auto text-[10px]">{s.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/90 border-t border-white/10">
        <Button
          size="sm"
          variant="ghost"
          className="text-white"
          disabled={pageIndex === 0}
          onClick={() => setPageIndex(p => p - 1)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>

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
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="text-white"
          disabled={pageIndex >= totalPages - 1}
          onClick={() => setPageIndex(p => p + 1)}
        >
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
