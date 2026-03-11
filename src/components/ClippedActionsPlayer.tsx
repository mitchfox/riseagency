import { useState, useRef, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, SkipBack, SkipForward, Play, Pause } from 'lucide-react';
import { t } from '@/lib/portalTranslations';
import { sortReportActionsChronologically } from '@/lib/reportActionHelpers';

interface ClipAction {
  id: string;
  action_number: number;
  action_type: string;
  action_description: string;
  video_url: string;
  minute: number;
  notes?: string | null;
}

interface ClippedActionsPlayerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clips: ClipAction[];
  language?: string;
  title?: string;
}

export const ClippedActionsPlayer = ({
  open,
  onOpenChange,
  clips,
  language = "en",
  title,
}: ClippedActionsPlayerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [swipeY, setSwipeY] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchStartY = useRef(0);

  const sortedClips = useMemo(() => sortReportActionsChronologically(clips), [clips]);
  const currentClip = sortedClips[currentIndex];

  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setIsPlaying(true);
    }
  }, [open]);

  const handleVideoEnded = () => {
    if (currentIndex < clips.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  const handleNext = () => {
    if (currentIndex < clips.length - 1) setCurrentIndex(prev => prev + 1);
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const nextClip = clips[currentIndex + 1] ?? null;

  if (!currentClip) return null;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: swipeY > 0 ? `translateY(${swipeY}px)` : undefined, opacity: swipeY > 0 ? Math.max(0.3, 1 - swipeY / 300) : 1, transition: swiping ? 'none' : 'transform 0.3s ease, opacity 0.3s ease' }}
        className="fixed inset-0 !left-0 !top-0 !translate-x-0 !translate-y-0 w-screen h-screen max-w-none max-h-none p-0 bg-black border-0 rounded-none flex flex-col overflow-hidden z-[200] data-[state=open]:!animate-none data-[state=closed]:!animate-none data-[state=open]:!slide-in-from-left-0 data-[state=open]:!slide-in-from-top-0">
        <DialogTitle className="sr-only">{t(language, "full_match_video")}</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/80 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-3">
            <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-bold">
              {currentIndex + 1}/{clips.length}
            </span>
            <span className="text-white text-sm font-semibold">{currentClip.action_type}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-white hover:text-white hover:bg-white/20 h-10 w-10 min-w-[40px]">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Video */}
        <div className="flex-1 relative flex items-center justify-center bg-black min-h-0">
          <video
            ref={videoRef}
            key={currentClip.video_url}
            src={currentClip.video_url}
            className="w-full h-full object-contain"
            preload="auto"
            crossOrigin="anonymous"
            muted
            playsInline
            onCanPlay={(e) => { if (isPlaying) e.currentTarget.play().catch(() => {}); }}
            onEnded={handleVideoEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          {nextClip && (
            <video
              key={`prefetch-${nextClip.video_url}`}
              src={nextClip.video_url}
              preload="auto"
              crossOrigin="anonymous"
              muted
              style={{ display: 'none' }}
            />
          )}
          {/* Description overlay */}
          <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white text-xs px-3 py-2 rounded max-w-[80%]">
            <p>{currentClip.action_description}</p>
            {currentClip.notes && (
              <p className="text-[10px] text-risegold italic mt-1">📝 {currentClip.notes}</p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-black/90 border-t border-border/30 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={handlePrevious} disabled={currentIndex === 0}>
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-10 w-10" onClick={togglePlayPause}>
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={handleNext} disabled={currentIndex === clips.length - 1}>
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          {/* Clip selector */}
          <div className="flex gap-1.5 overflow-x-auto max-w-[50%]">
            {clips.map((clip, index) => (
              <button
                key={clip.id}
                onClick={() => setCurrentIndex(index)}
                className={`flex-shrink-0 px-2.5 py-1.5 rounded text-xs transition-colors ${
                  index === currentIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                #{clip.action_number}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
