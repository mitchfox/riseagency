import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  clip_start?: number | null;
  clip_end?: number | null;
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
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [swipeY, setSwipeY] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchStartY = useRef(0);

  const sortedClips = useMemo(() => sortReportActionsChronologically(clips), [clips]);
  const currentClip = sortedClips[currentIndex];
  const hasTimeRange = currentClip?.clip_start != null && currentClip?.clip_end != null;

  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setIsPlaying(true);
      setProgress(0);
    }
  }, [open]);

  // When clip changes, seek to clip_start
  useEffect(() => {
    if (!videoRef.current || !currentClip) return;
    const vid = videoRef.current;
    setProgress(0);

    if (hasTimeRange) {
      const seekToStart = () => {
        vid.currentTime = currentClip.clip_start!;
        if (isPlaying) vid.play().catch(() => {});
      };

      if (vid.src && vid.src === currentClip.video_url) {
        seekToStart();
      } else {
        vid.src = currentClip.video_url;
        vid.addEventListener('loadedmetadata', seekToStart, { once: true });
        vid.load();
      }
    } else {
      if (vid.src !== currentClip.video_url) {
        vid.src = currentClip.video_url;
        vid.load();
      }
    }
  }, [currentIndex, currentClip?.video_url, currentClip?.clip_start]);

  // Enforce clip boundaries, update progress, auto-advance
  useEffect(() => {
    if (!videoRef.current || !hasTimeRange) return;
    const vid = videoRef.current;
    const clipStart = currentClip.clip_start!;
    const clipEnd = currentClip.clip_end!;
    const duration = clipEnd - clipStart;

    const handleTimeUpdate = () => {
      // Clamp within range
      if (vid.currentTime < clipStart - 0.5) {
        vid.currentTime = clipStart;
        return;
      }
      if (vid.currentTime >= clipEnd) {
        vid.pause();
        if (currentIndex < sortedClips.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
        return;
      }
      setProgress(Math.min(1, (vid.currentTime - clipStart) / duration));
    };

    // Block seeking outside range
    const handleSeeking = () => {
      if (vid.currentTime < clipStart) vid.currentTime = clipStart;
      if (vid.currentTime > clipEnd) vid.currentTime = clipEnd - 0.1;
    };

    vid.addEventListener('timeupdate', handleTimeUpdate);
    vid.addEventListener('seeking', handleSeeking);
    return () => {
      vid.removeEventListener('timeupdate', handleTimeUpdate);
      vid.removeEventListener('seeking', handleSeeking);
    };
  }, [currentIndex, currentClip?.clip_start, currentClip?.clip_end, hasTimeRange, sortedClips.length]);

  // Prefetch next clip
  useEffect(() => {
    const nextClip = sortedClips[currentIndex + 1];
    if (nextClip?.video_url) {
      fetch(nextClip.video_url, { mode: 'cors', cache: 'force-cache' }).catch(() => {});
    }
  }, [currentIndex, sortedClips]);

  const handleVideoEnded = () => {
    if (!hasTimeRange) {
      if (currentIndex < sortedClips.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsPlaying(false);
      }
    }
  };

  const handlePrevious = () => { if (currentIndex > 0) setCurrentIndex(prev => prev - 1); };
  const handleNext = () => { if (currentIndex < sortedClips.length - 1) setCurrentIndex(prev => prev + 1); };

  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      // If at clip end, restart from clip start
      if (hasTimeRange && currentClip && videoRef.current.currentTime >= currentClip.clip_end!) {
        videoRef.current.currentTime = currentClip.clip_start!;
      }
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [hasTimeRange, currentClip]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !videoRef.current || !hasTimeRange || !currentClip) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const duration = currentClip.clip_end! - currentClip.clip_start!;
    videoRef.current.currentTime = currentClip.clip_start! + ratio * duration;
  }, [hasTimeRange, currentClip]);

  if (!currentClip) return null;

  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; setSwiping(true); };
  const handleTouchMove = (e: React.TouchEvent) => { if (!swiping) return; setSwipeY(Math.max(0, e.touches[0].clientY - touchStartY.current)); };
  const handleTouchEnd = () => { if (swipeY > 120) onOpenChange(false); setSwipeY(0); setSwiping(false); };

  const formatMinute = (minute: number) => {
    const minPart = Math.floor(minute);
    const secPart = Math.round((minute - minPart) * 100);
    return `${minPart}.${secPart.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: swipeY > 0 ? `translateY(${swipeY}px)` : undefined, opacity: swipeY > 0 ? Math.max(0.3, 1 - swipeY / 300) : 1, transition: swiping ? 'none' : 'transform 0.3s ease, opacity 0.3s ease' }}
        className="fixed inset-0 !left-0 !top-0 !translate-x-0 !translate-y-0 w-screen h-screen max-w-none max-h-none p-0 bg-black border-0 rounded-none flex flex-col overflow-hidden z-[200] data-[state=open]:!animate-none data-[state=closed]:!animate-none data-[state=open]:!slide-in-from-left-0 data-[state=open]:!slide-in-from-top-0 [&>button.absolute]:hidden">
        <DialogTitle className="sr-only">{t(language, "full_match_video")}</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/80 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-bold">
              {currentIndex + 1}/{sortedClips.length}
            </span>
            <div className="min-w-0">
              <div className="text-white text-sm font-semibold truncate">{title || currentClip.action_type}</div>
              <div className="text-white/70 text-xs truncate">{formatMinute(currentClip.minute)}' • {currentClip.action_type}</div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-white hover:text-white hover:bg-white/20 h-10 w-10 min-w-[40px]">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Video */}
        <div className="flex-1 relative flex items-center justify-center bg-black min-h-0">
          <video
            ref={videoRef}
            src={currentClip.video_url}
            className="w-full h-full object-contain cursor-pointer"
            preload="auto"
            crossOrigin="anonymous"
            muted
            playsInline
            onClick={togglePlayPause}
            onCanPlay={(e) => { if (isPlaying) e.currentTarget.play().catch(() => {}); }}
            onEnded={handleVideoEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            controls={!hasTimeRange}
          />
          {/* Description overlay */}
          <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white text-xs px-3 py-2 rounded max-w-[80%]">
            <p>{currentClip.action_description}</p>
            {currentClip.notes && (
              <p className="text-[10px] text-risegold italic mt-1">📝 {currentClip.notes}</p>
            )}
          </div>
        </div>

        {/* Custom progress bar for clipped videos */}
        {hasTimeRange && (
          <div className="px-4 py-1 bg-black/90 shrink-0">
            <div
              ref={progressBarRef}
              className="w-full h-1.5 bg-white/20 rounded cursor-pointer"
              onClick={handleProgressClick}
            >
              <div className="h-full bg-primary rounded" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-black/90 border-t border-border/30 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={handlePrevious} disabled={currentIndex === 0}>
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-10 w-10" onClick={togglePlayPause}>
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={handleNext} disabled={currentIndex === sortedClips.length - 1}>
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          {/* Clip selector */}
          <div className="flex gap-1.5 overflow-x-auto max-w-[50%]">
            {sortedClips.map((clip, index) => (
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
