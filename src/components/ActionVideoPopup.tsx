import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Play, Pause, Loader2 } from 'lucide-react';
import { useRef, useEffect, useCallback, useState } from 'react';
import { t } from '@/lib/portalTranslations';
import { useSharedClipPlayer, type SharedClipPlayerState } from '@/hooks/useSharedClipPlayer';
import { toast } from 'sonner';
import { isFullMatchUrl } from '@/lib/clipVideoUtils';

interface ActionVideoPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
  actionTitle?: string;
  language?: string;
  clipStart?: number | null;
  clipEnd?: number | null;
  player?: SharedClipPlayerState;
  /** When true, treat the video as a standalone clip regardless of URL pattern */
  forceStandalone?: boolean;
}

export const ActionVideoPopup = ({
  open,
  onOpenChange,
  videoUrl,
  actionTitle,
  language = 'en',
  clipStart,
  clipEnd,
  player: providedPlayer,
  forceStandalone = false,
}: ActionVideoPopupProps) => {
  const localPlayer = useSharedClipPlayer();
  const player = providedPlayer ?? localPlayer;
  const progressBarRef = useRef<HTMLDivElement>(null);
  const standaloneVideoRef = useRef<HTMLVideoElement>(null);
  const hasClipWindow = clipStart != null && clipEnd != null && clipEnd > clipStart;
  const isStandaloneClip = !!videoUrl && !hasClipWindow && (forceStandalone || !isFullMatchUrl(videoUrl));

  // Standalone clip state
  const [standaloneReady, setStandaloneReady] = useState(false);
  const [standalonePlaying, setStandalonePlaying] = useState(false);

  const playClipFn = player.playClip;
  const stopFn = player.stop;
  const clipError = player.clipError;

  // Block if no video at all, or full match without clip boundaries
  useEffect(() => {
    if (!open) return;
    if (!videoUrl || (!hasClipWindow && !forceStandalone && isFullMatchUrl(videoUrl))) {
      toast.error('Clip unavailable. Full match playback has been blocked.');
      onOpenChange(false);
    }
  }, [open, videoUrl, hasClipWindow, forceStandalone, onOpenChange]);

  // Propagate shared player errors
  useEffect(() => {
    if (!open || !clipError || isStandaloneClip) return;
    toast.error(clipError);
    onOpenChange(false);
  }, [open, clipError, onOpenChange, isStandaloneClip]);

  // For clipped videos: use shared player
  useEffect(() => {
    if (!open || !videoUrl || !hasClipWindow) return;
    playClipFn({ videoUrl, clipStart: clipStart!, clipEnd: clipEnd! });
  }, [open, videoUrl, clipStart, clipEnd, hasClipWindow, playClipFn]);

  // For standalone clips: just play the video directly
  useEffect(() => {
    if (!open || !isStandaloneClip) return;
    setStandaloneReady(false);
    setStandalonePlaying(false);
  }, [open, isStandaloneClip, videoUrl]);

  useEffect(() => {
    if (!open || !isStandaloneClip || !standaloneReady) return;
    const vid = standaloneVideoRef.current;
    if (vid) {
      vid.play().then(() => setStandalonePlaying(true)).catch(() => {});
    }
  }, [open, isStandaloneClip, standaloneReady]);

  // Stop when dialog closes
  useEffect(() => {
    if (open) return;
    stopFn();
    const vid = standaloneVideoRef.current;
    if (vid) vid.pause();
    setStandalonePlaying(false);
    setStandaloneReady(false);
  }, [open, stopFn]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !hasClipWindow) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    player.seekToRatio(ratio);
  }, [hasClipWindow, player]);

  const toggleStandalonePlayPause = () => {
    const vid = standaloneVideoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().then(() => setStandalonePlaying(true)).catch(() => {});
    } else {
      vid.pause();
      setStandalonePlaying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl p-0 overflow-hidden bg-black">
        <DialogTitle className="sr-only">{actionTitle || t(language, 'fullscreen')}</DialogTitle>
        <div className="relative">
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="bg-black/50 hover:bg-black/70 text-white"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {actionTitle && (
            <div className="absolute top-2 left-2 z-10 bg-black/50 text-white text-sm px-3 py-1 rounded">
              {actionTitle}
            </div>
          )}

          {/* Standalone clip: simple video element */}
          {isStandaloneClip && (
            <>
              <video
                ref={standaloneVideoRef}
                src={videoUrl}
                className={`w-full max-h-[80vh] object-contain cursor-pointer transition-opacity ${standaloneReady ? 'opacity-100' : 'opacity-0'}`}
                preload="auto"
                crossOrigin="anonymous"
                muted
                playsInline
                onClick={toggleStandalonePlayPause}
                onCanPlay={() => setStandaloneReady(true)}
                controls={false}
                loop={false}
              />
              {!standaloneReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading clip…
                  </div>
                </div>
              )}
              {standaloneReady && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8" onClick={toggleStandalonePlayPause}>
                      {standalonePlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Clipped video: shared player */}
          {hasClipWindow && (
            <>
              <video
                ref={player.videoRefCallback}
                className={`w-full max-h-[80vh] object-contain cursor-pointer transition-opacity ${player.isClipReady ? 'opacity-100' : 'opacity-0'}`}
                preload="metadata"
                crossOrigin="anonymous"
                muted
                playsInline
                onClick={player.togglePlayPause}
                controls={false}
                loop={false}
              />
              {!player.isClipReady && !player.clipError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading clip…
                  </div>
                </div>
              )}
              {player.isClipReady && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                  <div
                    ref={progressBarRef}
                    className="w-full h-1.5 bg-white/20 rounded cursor-pointer mb-2"
                    onClick={handleProgressClick}
                  >
                    <div
                      className="h-full bg-primary rounded"
                      style={{ width: `${player.progress * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8" onClick={player.togglePlayPause}>
                      {player.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
