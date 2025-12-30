import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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

  // Reset to first clip when dialog opens
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
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < clips.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
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

  // Auto-play when clip changes
  useEffect(() => {
    if (videoRef.current && isPlaying) {
      videoRef.current.play().catch(() => {
        // Autoplay was prevented
        setIsPlaying(false);
      });
    }
  }, [currentIndex]);

  if (!currentClip) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black">
        <div className="relative">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Clip info overlay */}
          <div className="absolute top-2 left-2 z-10 bg-black/70 text-white text-sm px-3 py-2 rounded max-w-[70%]">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-bold">
                {currentIndex + 1}/{clips.length}
              </span>
              <span className="font-semibold">{currentClip.action_type}</span>
            </div>
            <p className="text-xs text-white/80 line-clamp-2">{currentClip.action_description}</p>
          </div>

          {/* Video player */}
          <video
            ref={videoRef}
            src={currentClip.video_url}
            className="w-full max-h-[70vh] object-contain"
            controls
            autoPlay
            onEnded={handleVideoEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {/* Navigation controls */}
          <div className="bg-black/90 p-4 flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <SkipBack className="h-5 w-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-12 w-12"
              onClick={togglePlayPause}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={handleNext}
              disabled={currentIndex === clips.length - 1}
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          {/* Clip thumbnails/list */}
          <div className="bg-black/95 p-2 max-h-[100px] overflow-x-auto">
            <div className="flex gap-2">
              {clips.map((clip, index) => (
                <button
                  key={clip.id}
                  onClick={() => setCurrentIndex(index)}
                  className={`flex-shrink-0 px-3 py-2 rounded text-xs text-left transition-colors ${
                    index === currentIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  <div className="font-bold">#{clip.action_number}</div>
                  <div className="truncate max-w-[100px]">{clip.action_type}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
