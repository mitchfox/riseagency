import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Play, Pause } from 'lucide-react';
import { useRef, useEffect, useCallback } from 'react';
import { t } from '@/lib/portalTranslations';
import { useSharedClipPlayer } from '@/hooks/useSharedClipPlayer';
import { toast } from 'sonner';

interface ActionVideoPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
  actionTitle?: string;
  language?: string;
  clipStart?: number | null;
  clipEnd?: number | null;
}

export const ActionVideoPopup = ({
  open,
  onOpenChange,
  videoUrl,
  actionTitle,
  language = 'en',
  clipStart,
  clipEnd,
}: ActionVideoPopupProps) => {
  const player = useSharedClipPlayer();
  const progressBarRef = useRef<HTMLDivElement>(null);
  const hasValidTimeRange = clipStart != null && clipEnd != null && clipEnd > clipStart;

  useEffect(() => {
    if (!open) return;
    if (hasValidTimeRange || !videoUrl) return;

    toast.error('Clip unavailable. Full match playback has been blocked.');
    onOpenChange(false);
    player.stop();
  }, [open, hasValidTimeRange, videoUrl, onOpenChange, player]);

  // When dialog opens or clip changes, play the clip
  useEffect(() => {
    if (!open || !videoUrl) return;

    if (!hasValidTimeRange) return;

    player.playClip({ videoUrl, clipStart: clipStart!, clipEnd: clipEnd! });

    return () => {
      if (!open) player.stop();
    };
  }, [open, videoUrl, clipStart, clipEnd, hasValidTimeRange, player]);

  // Stop when dialog closes
  useEffect(() => {
    if (!open) player.stop();
  }, [open]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !hasValidTimeRange) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    player.seekToRatio(ratio);
  }, [hasValidTimeRange, player]);

  const handleFullscreen = () => {
    const vid = player.videoRef.current;
    if (vid) {
      vid.requestFullscreen?.().catch(() => {
        (vid as any)?.webkitEnterFullscreen?.();
      });
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
          <video
            ref={player.videoRef}
            className="w-full max-h-[80vh] object-contain cursor-pointer"
            preload="metadata"
            crossOrigin="anonymous"
            muted
            playsInline
            onClick={player.togglePlayPause}
            controls={false}
            loop={false}
          />
          {/* Custom controls for clipped videos */}
          {hasValidTimeRange && (
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
