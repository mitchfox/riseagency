import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, SkipForward, SkipBack, Play, Pause, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { t } from "@/lib/portalTranslations";
import { sortReportActionsChronologically } from "@/lib/reportActionHelpers";
import { useSharedClipPlayer, type SharedClipPlayerState } from "@/hooks/useSharedClipPlayer";
import { toast } from "sonner";
import { toTitleCase } from "@/lib/titleCase";
import { isFullMatchUrl } from "@/lib/clipVideoUtils";

interface Clip {
  id: string;
  action_number: number;
  action_type: string;
  action_description: string;
  action_score: number;
  video_url: string;
  minute: number;
  notes?: string | null;
  clip_start?: number | null;
  clip_end?: number | null;
}

interface RankedActionsPlayerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clips: Clip[];
  mode: "chronological" | "ranked" | "noted";
  language?: string;
  player?: SharedClipPlayerState;
}

const categoriseAction = (type: string): string => {
  const lower = (type || '').toLowerCase();
  const keyPatterns: Record<string, string[]> = {
    'Key Actions': ['goal', 'assist', 'key pass', 'penalty', 'big chance', 'chance created'],
    'Offensive': ['shot', 'cross', 'dribble', 'pass', 'carry', 'through ball', 'progressive', 'touch', 'ball retention', 'chance', 'attacking', 'offensive', 'forward'],
    'Defensive': ['tackle', 'interception', 'clearance', 'block', 'header', 'recovery', 'regain', 'defensive', 'press', 'duel'],
  };
  for (const [cat, patterns] of Object.entries(keyPatterns)) {
    if (patterns.some(p => lower.includes(p))) return cat;
  }
  return 'Other';
};

export const RankedActionsPlayer = ({ open, onOpenChange, clips, mode, language = "en", player: providedPlayer }: RankedActionsPlayerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [swipeY, setSwipeY] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchStartY = useRef(0);
  const [showClipList, setShowClipList] = useState(true);
  const clipListRef = useRef<HTMLDivElement>(null);

  const localPlayer = useSharedClipPlayer();
  const player = providedPlayer ?? localPlayer;

  const filteredClips = mode === "noted" ? clips.filter((clip) => clip.notes) : clips;
  const sortedClips = mode === "ranked"
    ? [...filteredClips]
        .filter((clip) => !!clip.video_url)
        .sort((a, b) => b.action_score - a.action_score)
    : sortReportActionsChronologically(filteredClips).filter((clip) => !!clip.video_url);

  const categorisedClips = useMemo(() => {
    const categories: Record<string, typeof sortedClips> = {};
    for (const clip of sortedClips) {
      const rawType = clip.action_type || 'Other';
      const types = rawType.split(',').map(t => t.trim());
      const cat = categoriseAction(types[0] || rawType);
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(clip);
    }
    return categories;
  }, [sortedClips]);

  const current = sortedClips[currentIndex];
  const hasTimeRange = current?.clip_start != null && current?.clip_end != null && current.clip_end > current.clip_start;
  const isStandaloneClip = !!current?.video_url && !hasTimeRange && !isFullMatchUrl(current.video_url);

  const playClipFn = player.playClip;
  const stopFn = player.stop;
  const clipError = player.clipError;

  useEffect(() => {
    if (open) {
      if (sortedClips.length === 0) {
        toast.error("No valid clips available. Full match playback has been blocked.");
        onOpenChange(false);
        return;
      }
      setCurrentIndex(0);
    } else {
      stopFn();
    }
  }, [open, mode, onOpenChange, stopFn, sortedClips.length]);

  useEffect(() => {
    if (!open || !current) return;
    if (hasTimeRange) {
      playClipFn({
        videoUrl: current.video_url,
        clipStart: current.clip_start!,
        clipEnd: current.clip_end!,
      });
    }
  }, [open, current, hasTimeRange, playClipFn]);

  useEffect(() => {
    if (!open || !clipError) return;
    toast.error(clipError);
    onOpenChange(false);
  }, [open, clipError, onOpenChange]);

  useEffect(() => {
    if (!hasTimeRange) return;
    if (player.progress >= 1 && !player.isPlaying && mode !== "noted") {
      if (currentIndex < sortedClips.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    }
  }, [player.progress, player.isPlaying, hasTimeRange, currentIndex, sortedClips.length, mode]);

  // Scroll active clip into view
  useEffect(() => {
    if (!clipListRef.current) return;
    const activeEl = clipListRef.current.querySelector('[data-active="true"]');
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentIndex]);

  const handleNext = () => { if (currentIndex < sortedClips.length - 1) setCurrentIndex(prev => prev + 1); };
  const handlePrev = () => { if (currentIndex > 0) setCurrentIndex(prev => prev - 1); };

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !hasTimeRange) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    player.seekToRatio(ratio);
  }, [hasTimeRange, player]);

  const formatMinute = (minute: number) => {
    const minPart = Math.floor(minute);
    const secPart = Math.round((minute - minPart) * 100);
    return `${minPart}.${secPart.toString().padStart(2, "0")}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.1) return "text-green-500";
    if (score >= 0.05) return "text-green-400";
    if (score > 0) return "text-lime-400";
    if (score === 0) return "text-muted-foreground";
    return "text-red-400";
  };

  const getModeLabel = () => {
    if (mode === "ranked") return t(language, "ranked_report");
    if (mode === "noted") return t(language, "noted_report");
    return t(language, "match_report");
  };

  if (!current) return null;

  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; setSwiping(true); };
  const handleTouchMove = (e: React.TouchEvent) => { if (!swiping) return; setSwipeY(Math.max(0, e.touches[0].clientY - touchStartY.current)); };
  const handleTouchEnd = () => { if (swipeY > 120) onOpenChange(false); setSwipeY(0); setSwiping(false); };

  const jumpToClip = (clipId: string) => {
    const idx = sortedClips.findIndex(c => c.id === clipId);
    if (idx >= 0) setCurrentIndex(idx);
  };

  const categoryOrder = ['Key Actions', 'Offensive', 'Defensive', 'Other'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: swipeY > 0 ? `translateY(${swipeY}px)` : undefined,
          opacity: swipeY > 0 ? Math.max(0.3, 1 - swipeY / 300) : 1,
          transition: swiping ? "none" : "transform 0.3s ease, opacity 0.3s ease",
        }}
        className="fixed inset-0 !left-0 !top-0 !translate-x-0 !translate-y-0 w-screen h-[100dvh] max-w-none max-h-none p-0 bg-black border-0 rounded-none flex flex-col overflow-hidden z-[200] data-[state=open]:!animate-none data-[state=closed]:!animate-none data-[state=open]:!slide-in-from-left-0 data-[state=open]:!slide-in-from-top-0 [&>button.absolute]:hidden"
      >
        <DialogTitle className="sr-only">{getModeLabel()}</DialogTitle>

        <div
          className="flex items-center justify-between px-3 md:px-4 py-2 bg-black/80 border-b border-border/30 shrink-0"
          style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
        >
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <span className="text-primary font-bold text-xs md:text-sm truncate">{getModeLabel()}</span>
            <span className="text-[10px] md:text-xs text-white/60 shrink-0">{currentIndex + 1} / {sortedClips.length}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-white hover:text-white hover:bg-white/20 h-9 w-9 min-w-[36px] shrink-0">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Controls - above video */}
        <div className="px-3 md:px-4 py-2 bg-black/90 border-b border-border/30 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                <span className="text-white text-xs md:text-sm font-semibold">#{current.action_number}</span>
                <span className="text-white/70 text-[10px] md:text-xs">{formatMinute(current.minute)}'</span>
                <span className={`text-xs md:text-sm font-bold ${getScoreColor(current.action_score ?? 0)}`}>
                  {current.action_score != null ? `${current.action_score >= 0 ? "+" : ""}${current.action_score.toFixed(3)}` : "—"}
                </span>
              </div>
              <p className="text-white/60 text-[10px] md:text-xs mt-0.5 truncate">{toTitleCase(current.action_type)}: {current.action_description}</p>
            </div>
            <div className="flex gap-0.5 md:gap-1 flex-shrink-0 items-center">
              <Button variant="ghost" size="sm" onClick={handlePrev} disabled={currentIndex === 0} className="text-white/60 hover:text-white h-8 w-8 p-0">
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8" onClick={player.togglePlayPause}>
                {player.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleNext} disabled={currentIndex === sortedClips.length - 1} className="text-white/60 hover:text-white h-8 w-8 p-0">
                <SkipForward className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white hover:bg-white/20 text-xs gap-1 ml-1 md:ml-2 h-8 w-8 p-0"
                onClick={() => setShowClipList(!showClipList)}
              >
                {showClipList ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          {current.notes && (
            <p className="text-risegold text-[10px] md:text-xs italic leading-relaxed mt-1">📝 {current.notes}</p>
          )}
        </div>

        <div className="flex-1 relative flex items-center justify-center bg-black min-h-0">
          {isStandaloneClip && (
            <video
              key={current.id}
              src={current.video_url}
              className="w-full h-full object-contain cursor-pointer"
              preload="auto"
              crossOrigin="anonymous"
              muted
              playsInline
              autoPlay
              controls={false}
              onClick={(e) => {
                const vid = e.currentTarget;
                vid.paused ? vid.play().catch(() => {}) : vid.pause();
              }}
            />
          )}
          {hasTimeRange && (
            <>
              <video
                ref={player.videoRefCallback}
                preload="metadata"
                crossOrigin="anonymous"
                className={`w-full h-full object-contain cursor-pointer transition-opacity ${player.isClipReady ? 'opacity-100' : 'opacity-0'}`}
                onClick={player.togglePlayPause}
                controls={false}
              />
              {!player.isClipReady && !player.clipError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading clip…
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Progress bar */}
        {hasTimeRange && player.isClipReady && (
          <div className="px-4 py-1 bg-black/90 shrink-0">
            <div
              ref={progressBarRef}
              className="w-full h-1.5 bg-white/20 rounded cursor-pointer"
              onClick={handleProgressClick}
            >
              <div className="h-full bg-primary rounded" style={{ width: `${player.progress * 100}%` }} />
            </div>
          </div>
        )}

        {/* Clip list table categorised */}
        {showClipList && (
          <div
            ref={clipListRef}
            className="bg-black/95 border-t border-border/30 overflow-y-auto shrink-0 max-h-[28vh] md:max-h-[35vh]"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {mode === "ranked" ? (
              /* Ranked mode: just show by score, no categories */
              sortedClips.map(clip => (
                <button
                  key={clip.id}
                  data-active={clip.id === current.id}
                  onClick={() => jumpToClip(clip.id)}
                  className={`w-full text-left px-4 py-2 flex items-center gap-3 text-xs transition-colors border-b border-border/10 ${
                    clip.id === current.id ? 'bg-primary/20 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="font-bold text-white/50 w-6 text-center">#{clip.action_number}</span>
                  <span className="text-white/50 w-10">{formatMinute(clip.minute)}'</span>
                  <span className="flex-1 truncate">{toTitleCase(clip.action_type)}</span>
                  <span className={`text-xs font-bold ${getScoreColor(clip.action_score ?? 0)}`}>
                    {clip.action_score != null ? `${clip.action_score >= 0 ? "+" : ""}${clip.action_score.toFixed(3)}` : "—"}
                  </span>
                  {clip.id === current.id && <span className="text-primary text-[10px] font-bold">▶</span>}
                </button>
              ))
            ) : (
              categoryOrder.filter(cat => categorisedClips[cat]?.length).map(cat => (
                <div key={cat}>
                  <div className="sticky top-0 bg-black/90 px-4 py-1.5 text-[10px] uppercase tracking-wider text-primary font-semibold border-b border-border/20">
                    {cat} ({categorisedClips[cat].length})
                  </div>
                  {categorisedClips[cat].map(clip => (
                    <button
                      key={clip.id}
                      data-active={clip.id === current.id}
                      onClick={() => jumpToClip(clip.id)}
                      className={`w-full text-left px-4 py-2 flex items-center gap-3 text-xs transition-colors border-b border-border/10 ${
                        clip.id === current.id ? 'bg-primary/20 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="font-bold text-white/50 w-6 text-center">#{clip.action_number}</span>
                      <span className="text-white/50 w-10">{formatMinute(clip.minute)}'</span>
                      <span className="flex-1 truncate">{toTitleCase(clip.action_type)}</span>
                      <span className={`text-xs font-bold ${getScoreColor(clip.action_score ?? 0)}`}>
                        {clip.action_score != null ? `${clip.action_score >= 0 ? "+" : ""}${clip.action_score.toFixed(3)}` : "—"}
                      </span>
                      {clip.id === current.id && <span className="text-primary text-[10px] font-bold">▶</span>}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
