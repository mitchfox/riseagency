import { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, ChevronLeft, ChevronRight, Maximize, Minimize, Star } from "lucide-react";

interface ReelClip {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  r90Score?: number | null;
  actionScore?: number | null;
}

interface HighlightReelPlayerProps {
  clips: ReelClip[];
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const HighlightReelPlayer = ({ clips, projectName, isOpen, onClose }: HighlightReelPlayerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentClip = clips[currentIndex];
  const totalClips = clips.length;

  const goToNext = () => { if (currentIndex < totalClips - 1) setCurrentIndex(currentIndex + 1); };
  const goToPrevious = () => { if (currentIndex > 0) setCurrentIndex(currentIndex - 1); };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (!currentClip) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] h-[90vh] p-0">
        <div ref={containerRef} className="relative w-full h-full bg-black flex flex-col">
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 z-50 flex items-start justify-between p-4 gap-4 pointer-events-none">
            <div className="bg-background/95 backdrop-blur-sm rounded-lg px-6 py-3 shadow-xl border border-border/50 pointer-events-auto">
              <div className="text-5xl font-bold text-foreground">
                {currentIndex + 1}
                <span className="text-2xl text-muted-foreground ml-2">/ {totalClips}</span>
              </div>
            </div>
            <div className="flex gap-2 pointer-events-auto">
              <Button onClick={toggleFullscreen} variant="ghost" size="icon" className="bg-background/95 backdrop-blur-sm hover:bg-background shadow-xl border border-border/50">
                {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
              </Button>
              <Button onClick={onClose} variant="ghost" size="icon" className="bg-background/95 backdrop-blur-sm hover:bg-background shadow-xl border border-border/50">
                <X className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Video */}
          <div className="flex-1 flex items-center justify-center p-4">
            <video
              key={currentClip.videoUrl}
              src={currentClip.videoUrl}
              controls autoPlay playsInline preload="metadata" loop
              className="max-w-full max-h-full"
              crossOrigin="anonymous"
            />
          </div>

          {/* Bottom Bar */}
          <div className="bg-background/90 backdrop-blur-sm p-4 flex items-center justify-between gap-2 md:gap-4">
            <Button onClick={goToPrevious} disabled={currentIndex === 0} variant="outline" size="lg">
              <ChevronLeft className="w-6 h-6" />
              <span className="hidden md:inline">Previous</span>
            </Button>

            <div className="text-center flex-1 px-2 md:px-4 min-w-0">
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-base md:text-xl font-semibold truncate">{currentClip.title}</h3>
                {(currentClip.r90Score != null || currentClip.actionScore != null) && (
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    <Star className="h-3 w-3 mr-1" />
                    {currentClip.actionScore != null ? currentClip.actionScore.toFixed(3) : currentClip.r90Score?.toFixed(2)}
                  </Badge>
                )}
              </div>
              {currentClip.description && (
                <p className="text-xs md:text-sm text-muted-foreground mt-1 truncate">{currentClip.description}</p>
              )}
              <Select value={currentIndex.toString()} onValueChange={(val) => setCurrentIndex(parseInt(val))}>
                <SelectTrigger className="w-[200px] h-7 text-xs mx-auto mt-2">
                  <SelectValue placeholder={`Clip ${currentIndex + 1} of ${totalClips}`} />
                </SelectTrigger>
                <SelectContent className="bg-background max-h-[300px]">
                  {clips.map((clip, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>
                      {idx + 1}. {clip.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={goToNext} disabled={currentIndex === totalClips - 1} variant="outline" size="lg">
              <span className="hidden md:inline">Next</span>
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
