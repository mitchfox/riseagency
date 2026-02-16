import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, SkipBack, SkipForward, Play, Pause } from 'lucide-react';

interface ClipAction {
  id: string;
  action_number: number;
  action_type: string;
  action_description: string;
  video_url: string;
  minute: number;
}

interface ClippedActionsPlayerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clips: ClipAction[];
}

export const ClippedActionsPlayer = ({
  open,
  onOpenChange,
  clips,
}: ClippedActionsPlayerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentClip = clips[currentIndex];

  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setIsPlaying(true);
    }
  }, [open]);

  const handleVideoEnded = () => {
    if (currentIndex < clips.length - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      setTimeout(() => {
        videoRef.current?.play().catch(() => {});
      }, 100);
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

  useEffect(() => {
    if (videoRef.current && isPlaying) {
      videoRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [currentIndex]);

  if (!currentClip) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 !left-0 !top-0 !translate-x-0 !translate-y-0 w-screen h-screen max-w-none max-h-none p-0 bg-black border-0 rounded-none flex flex-col overflow-hidden z-[200] data-[state=open]:!animate-none data-[state=closed]:!animate-none data-[state=open]:!slide-in-from-left-0 data-[state=open]:!slide-in-from-top-0">
        <DialogTitle className="sr-only">Full Match Video</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-black/80 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-3">
            <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-bold">
              {currentIndex + 1}/{clips.length}
            </span>
            <span className="text-white text-sm font-semibold">{currentClip.action_type}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-white/60 hover:text-white">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Video - fills remaining space */}
        <div className="flex-1 relative flex items-center justify-center bg-black min-h-0">
          <video
            ref={videoRef}
            src={currentClip.video_url}
            className="w-full h-full object-contain"
            autoPlay
            muted
            playsInline
            onEnded={handleVideoEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          {/* Description overlay */}
          <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white text-xs px-3 py-2 rounded max-w-[80%]">
            <p className="line-clamp-2">{currentClip.action_description}</p>
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
