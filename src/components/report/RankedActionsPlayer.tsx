import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, SkipForward, SkipBack } from "lucide-react";

interface Clip {
  id: string;
  action_number: number;
  action_type: string;
  action_description: string;
  action_score: number;
  video_url: string;
  minute: number;
  notes?: string | null;
}

interface RankedActionsPlayerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clips: Clip[];
  mode: "chronological" | "ranked" | "noted";
}

export const RankedActionsPlayer = ({ open, onOpenChange, clips, mode }: RankedActionsPlayerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [swipeY, setSwipeY] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredClips = mode === "noted"
    ? clips.filter(c => c.notes)
    : clips;

  const sortedClips = mode === "ranked"
    ? [...filteredClips].sort((a, b) => b.action_score - a.action_score)
    : [...filteredClips].sort((a, b) => a.minute - b.minute);

  const current = sortedClips[currentIndex];

  useEffect(() => {
    setCurrentIndex(0);
  }, [open, mode]);

  const handleNext = () => {
    if (currentIndex < sortedClips.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleVideoEnd = () => {
    // In noted mode, don't auto-advance
    if (mode === "noted") return;
    if (currentIndex < sortedClips.length - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      setTimeout(() => {
        videoRef.current?.play().catch(() => {});
      }, 100);
    }
  };

  if (!current) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setSwiping(true);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    setSwipeY(Math.max(0, delta));
  };
  const handleTouchEnd = () => {
    if (swipeY > 120) {
      onOpenChange(false);
    }
    setSwipeY(0);
    setSwiping(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.1) return "text-green-500";
    if (score >= 0.05) return "text-green-400";
    if (score > 0) return "text-lime-400";
    if (score === 0) return "text-muted-foreground";
    return "text-red-400";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: swipeY > 0 ? `translateY(${swipeY}px)` : undefined, opacity: swipeY > 0 ? Math.max(0.3, 1 - swipeY / 300) : 1, transition: swiping ? 'none' : 'transform 0.3s ease, opacity 0.3s ease' }}
        className="fixed inset-0 !left-0 !top-0 !translate-x-0 !translate-y-0 w-screen h-screen max-w-none max-h-none p-0 bg-black border-0 rounded-none flex flex-col overflow-hidden z-[200] data-[state=open]:!animate-none data-[state=closed]:!animate-none data-[state=open]:!slide-in-from-left-0 data-[state=open]:!slide-in-from-top-0">
        <DialogTitle className="sr-only">
          {mode === "ranked" ? "Ranked" : mode === "noted" ? "Noted" : "Full Match"} Video Report
        </DialogTitle>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/80 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-primary font-bold text-sm">
              {mode === "ranked" ? "RANKED" : mode === "noted" ? "NOTED" : "MATCH"} REPORT
            </span>
            <span className="text-xs text-white/60">
              {currentIndex + 1} / {sortedClips.length}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-white hover:text-white hover:bg-white/20 h-10 w-10 min-w-[40px]">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Video - fills remaining space */}
        <div className="flex-1 relative flex items-center justify-center bg-black min-h-0">
          <video
            ref={videoRef}
            key={current.video_url}
            src={current.video_url}
            preload="auto"
            crossOrigin="anonymous"
            controls
            className="w-full h-full object-contain"
            onCanPlay={(e) => { if (isPlaying) e.currentTarget.play().catch(() => {}); }}
            onEnded={handleVideoEnd}
          />
          {sortedClips[currentIndex + 1] && (
            <video
              key={`prefetch-${sortedClips[currentIndex + 1].video_url}`}
              src={sortedClips[currentIndex + 1].video_url}
              preload="auto"
              crossOrigin="anonymous"
              muted
              style={{ display: 'none' }}
            />
          )}
        </div>

        {/* Info bar */}
        <div className="px-4 py-2 bg-black/90 border-t border-border/30 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-semibold">#{current.action_number}</span>
                <span className="text-white/70 text-xs">{Math.floor(current.minute)}'</span>
                <span className={`text-sm font-bold ${getScoreColor(current.action_score ?? 0)}`}>
                  {current.action_score != null ? `${current.action_score >= 0 ? "+" : ""}${current.action_score.toFixed(3)}` : "—"}
                </span>
              </div>
              <p className="text-white/60 text-xs truncate mt-0.5">{current.action_type}: {current.action_description}</p>
              {current.notes && (
                <p className="text-risegold text-[10px] italic mt-1 line-clamp-2">📝 {current.notes}</p>
              )}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={handlePrev} disabled={currentIndex === 0} className="text-white/60 hover:text-white h-8 w-8 p-0">
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleNext} disabled={currentIndex === sortedClips.length - 1} className="text-white/60 hover:text-white h-8 w-8 p-0">
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
