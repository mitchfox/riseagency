import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, SkipBack, SkipForward, Play, Pause, Loader2 } from 'lucide-react';
import { t } from '@/lib/portalTranslations';
import { sortReportActionsChronologically } from '@/lib/reportActionHelpers';
import { useSharedClipPlayer, type SharedClipPlayerState } from '@/hooks/useSharedClipPlayer';
import { toast } from 'sonner';

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
  player?: SharedClipPlayerState;
}

export const ClippedActionsPlayer = ({
  open,
  onOpenChange,
  clips,
  language = "en",
  title,
  player: providedPlayer,
}: ClippedActionsPlayerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [swipeY, setSwipeY] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchStartY = useRef(0);

  const localPlayer = useSharedClipPlayer();
  const player = providedPlayer ?? localPlayer;

  const sortedClips = useMemo(
    () => sortReportActionsChronologically(clips).filter((clip) => clip.clip_start != null && clip.clip_end != null && clip.clip_end > clip.clip_start),
    [clips]
  );
  const currentClip = sortedClips[currentIndex];
  const hasTimeRange = currentClip?.clip_start != null && currentClip?.clip_end != null && currentClip.clip_end > currentClip.clip_start;

  const playClipFn = player.playClip;
  const stopFn = player.stop;
  const clipError = player.clipError;

  // Reset on open
  useEffect(() => {
    if (open) {
      if (sortedClips.length === 0) {
        toast.error('No valid clips available. Full match playback has been blocked.');
        onOpenChange(false);
        return;
      }
      setCurrentIndex(0);
    } else {
      stopFn();
    }
  }, [open, onOpenChange, stopFn, sortedClips.length]);

  // Play current clip when index changes
  useEffect(() => {
    if (!open || !currentClip) return;

    if (!hasTimeRange) {
      toast.error('This clip has no valid timing window, so playback was blocked.');
      onOpenChange(false);
      return;
    }

    playClipFn({
      videoUrl: currentClip.video_url,
      clipStart: currentClip.clip_start!,
      clipEnd: currentClip.clip_end!,
    });
  }, [open, currentClip, hasTimeRange, onOpenChange, playClipFn]);

  useEffect(() => {
    if (!open || !clipError) return;
    toast.error(clipError);
    onOpenChange(false);
  }, [open, clipError, onOpenChange]);

  // Auto-advance when clip finishes (check progress reaching 1)
  useEffect(() => {
    if (!hasTimeRange || !player.isPlaying) return;

    // When progress hits 1 and playback stops, advance
    if (player.progress >= 1 && !player.isPlaying) {
      if (currentIndex < sortedClips.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    }
  }, [player.progress, player.isPlaying, hasTimeRange, currentIndex, sortedClips.length]);

  const handlePrevious = () => { if (currentIndex > 0) setCurrentIndex(prev => prev - 1); };
  const handleNext = () => { if (currentIndex < sortedClips.length - 1) setCurrentIndex(prev => prev + 1); };

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !hasTimeRange) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    player.seekToRatio(ratio);
  }, [hasTimeRange, player]);

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

        {/* Video — single shared element */}
        <div className="flex-1 relative flex items-center justify-center bg-black min-h-0">
          <video
            ref={player.videoRef}
            className={`w-full h-full object-contain cursor-pointer transition-opacity ${player.isClipReady ? 'opacity-100' : 'opacity-0'}`}
            preload="metadata"
            crossOrigin="anonymous"
            muted
            playsInline
            onClick={player.togglePlayPause}
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
          {/* Description overlay */}
          <div className={`absolute bottom-4 left-4 right-4 bg-black/70 text-white text-xs px-3 py-2 rounded max-w-[80%] transition-opacity ${player.isClipReady ? 'opacity-100' : 'opacity-0'}`}>
            <p>{currentClip.action_description}</p>
            {currentClip.notes && (
              <p className="text-[10px] text-risegold italic mt-1">📝 {currentClip.notes}</p>
            )}
          </div>
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

        {/* Controls */}
        <div className="bg-black/90 border-t border-border/30 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={handlePrevious} disabled={currentIndex === 0}>
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-10 w-10" onClick={player.togglePlayPause}>
              {player.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
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
