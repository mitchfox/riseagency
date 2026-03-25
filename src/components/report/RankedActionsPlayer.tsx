import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, SkipForward, SkipBack, Play, Pause, Loader2 } from "lucide-react";
import { t } from "@/lib/portalTranslations";
import { sortReportActionsChronologically } from "@/lib/reportActionHelpers";
import { useSharedClipPlayer, type SharedClipPlayerState } from "@/hooks/useSharedClipPlayer";
import { toast } from "sonner";

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

export const RankedActionsPlayer = ({ open, onOpenChange, clips, mode, language = "en", player: providedPlayer }: RankedActionsPlayerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [swipeY, setSwipeY] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchStartY = useRef(0);

  const localPlayer = useSharedClipPlayer();
  const player = providedPlayer ?? localPlayer;

  const filteredClips = mode === "noted" ? clips.filter((clip) => clip.notes) : clips;
  const sortedClips = mode === "ranked"
    ? [...filteredClips]
        .filter((clip) => !!clip.video_url)
        .sort((a, b) => b.action_score - a.action_score)
    : sortReportActionsChronologically(filteredClips).filter((clip) => !!clip.video_url);

  const current = sortedClips[currentIndex];
  const hasTimeRange = current?.clip_start != null && current?.clip_end != null && current.clip_end > current.clip_start;
  const isStandaloneClip = !!current?.video_url && !hasTimeRange;

  const playClipFn = player.playClip;
  const stopFn = player.stop;
  const clipError = player.clipError;

  // Reset on open/mode change
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

  // Play current clip when index changes
  useEffect(() => {
    if (!open || !current) return;

    if (hasTimeRange) {
      playClipFn({
        videoUrl: current.video_url,
        clipStart: current.clip_start!,
        clipEnd: current.clip_end!,
      });
    }
    // Standalone clips handled by their own video element
  }, [open, current, hasTimeRange, playClipFn]);

  useEffect(() => {
    if (!open || !clipError) return;
    toast.error(clipError);
    onOpenChange(false);
  }, [open, clipError, onOpenChange]);

  // Auto-advance when clip finishes
  useEffect(() => {
    if (!hasTimeRange) return;
    if (player.progress >= 1 && !player.isPlaying && mode !== "noted") {
      if (currentIndex < sortedClips.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    }
  }, [player.progress, player.isPlaying, hasTimeRange, currentIndex, sortedClips.length, mode]);

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
        className="fixed inset-0 !left-0 !top-0 !translate-x-0 !translate-y-0 w-screen h-screen max-w-none max-h-none p-0 bg-black border-0 rounded-none flex flex-col overflow-hidden z-[200] data-[state=open]:!animate-none data-[state=closed]:!animate-none data-[state=open]:!slide-in-from-left-0 data-[state=open]:!slide-in-from-top-0 [&>button.absolute]:hidden"
      >
        <DialogTitle className="sr-only">{getModeLabel()}</DialogTitle>

        <div className="flex items-center justify-between px-4 py-3 bg-black/80 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-primary font-bold text-sm">{getModeLabel()}</span>
            <span className="text-xs text-white/60">{currentIndex + 1} / {sortedClips.length}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-white hover:text-white hover:bg-white/20 h-10 w-10 min-w-[40px]">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 relative flex items-center justify-center bg-black min-h-0">
          <video
            ref={player.videoRef}
            preload="metadata"
            crossOrigin="anonymous"
            className={`w-full h-full object-contain cursor-pointer transition-opacity ${player.isClipReady ? 'opacity-100' : 'opacity-0'}`}
            onClick={player.togglePlayPause}
            onPlay={() => {}}
            onPause={() => {}}
            controls={false}
          />
          {!player.isClipReady && !player.clipError && hasTimeRange && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="flex items-center gap-2 text-sm text-white/80">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading clip…
              </div>
            </div>
          )}
        </div>

        {/* Custom progress bar for clipped videos */}
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

        <div className="px-4 py-2 bg-black/90 border-t border-border/30 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-semibold">#{current.action_number}</span>
                <span className="text-white/70 text-xs">{formatMinute(current.minute)}'</span>
                <span className={`text-sm font-bold ${getScoreColor(current.action_score ?? 0)}`}>
                  {current.action_score != null ? `${current.action_score >= 0 ? "+" : ""}${current.action_score.toFixed(3)}` : "—"}
                </span>
              </div>
              <p className="text-white/60 text-xs mt-0.5">{current.action_type}: {current.action_description}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button variant="ghost" size="sm" onClick={handlePrev} disabled={currentIndex === 0} className="text-white/60 hover:text-white h-8 w-8 p-0">
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8" onClick={player.togglePlayPause}>
                {player.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleNext} disabled={currentIndex === sortedClips.length - 1} className="text-white/60 hover:text-white h-8 w-8 p-0">
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {current.notes && (
            <div className="mt-2 pb-1">
              <p className="text-risegold text-xs italic leading-relaxed">📝 {current.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
