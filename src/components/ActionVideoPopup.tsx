import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Maximize } from 'lucide-react';
import { useRef, useEffect } from 'react';
import { t } from '@/lib/portalTranslations';

interface ActionVideoPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
  actionTitle?: string;
  language?: string;
}

export const ActionVideoPopup = ({
  open,
  onOpenChange,
  videoUrl,
  actionTitle,
  language = 'en',
}: ActionVideoPopupProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-open fullscreen when dialog opens
  useEffect(() => {
    if (open && videoRef.current) {
      // Small delay to ensure video is loaded
      const timer = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.requestFullscreen?.().catch(() => {
            // Fallback for iOS Safari
            (videoRef.current as any)?.webkitEnterFullscreen?.();
          });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if ((videoRef.current as any).webkitEnterFullscreen) {
        // iOS Safari
        (videoRef.current as any).webkitEnterFullscreen();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black">
        <div className="relative">
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="bg-black/50 hover:bg-black/70 text-white"
              onClick={handleFullscreen}
              title="Fullscreen"
            >
              <Maximize className="h-4 w-4" />
            </Button>
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
            ref={videoRef}
            key={videoUrl}
            src={videoUrl}
            className="w-full max-h-[80vh] object-contain"
            preload="auto"
            crossOrigin="anonymous"
            muted
            loop
            playsInline
            onCanPlay={(e) => e.currentTarget.play().catch(() => {})}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
