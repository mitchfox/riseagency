import { useState, useRef, useEffect } from "react";
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
}

interface RankedActionsPlayerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clips: Clip[];
  mode: "chronological" | "ranked";
}

export const RankedActionsPlayer = ({ open, onOpenChange, clips, mode }: RankedActionsPlayerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const sortedClips = mode === "ranked"
    ? [...clips].sort((a, b) => b.action_score - a.action_score)
    : [...clips].sort((a, b) => a.minute - b.minute);

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
    if (currentIndex < sortedClips.length - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      setTimeout(() => {
        videoRef.current?.play().catch(() => {});
      }, 100);
    }
  };

  if (!current) return null;

  const getScoreColor = (score: number) => {
    if (score >= 0.1) return "text-green-500";
    if (score >= 0.05) return "text-green-400";
    if (score > 0) return "text-lime-400";
    if (score === 0) return "text-muted-foreground";
    return "text-red-400";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 !left-0 !top-0 !translate-x-0 !translate-y-0 w-screen h-screen max-w-none max-h-none p-0 bg-black border-0 rounded-none flex flex-col overflow-hidden z-[200] data-[state=open]:!animate-none data-[state=closed]:!animate-none data-[state=open]:!slide-in-from-left-0 data-[state=open]:!slide-in-from-top-0">
        <DialogTitle className="sr-only">
          {mode === "ranked" ? "Ranked" : "Full Match"} Video Report
        </DialogTitle>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-black/80 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-primary font-bold text-sm">
              {mode === "ranked" ? "RANKED" : "MATCH"} REPORT
            </span>
            <span className="text-xs text-white/60">
              {currentIndex + 1} / {sortedClips.length}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-white/60 hover:text-white">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Video - fills remaining space */}
        <div className="flex-1 relative flex items-center justify-center bg-black min-h-0">
          <video
            ref={videoRef}
            key={current.video_url}
            src={current.video_url}
            autoPlay={isPlaying}
            controls
            className="w-full h-full object-contain"
            onEnded={handleVideoEnd}
          />
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
