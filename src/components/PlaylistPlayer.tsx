import { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, ChevronLeft, ChevronRight, Check, Maximize, Minimize } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Clip {
  id?: string;
  name: string;
  videoUrl: string;
  order: number;
}

interface PlaylistPlayerProps {
  playlistId: string;
  playlistName: string;
  clips: Clip[];
  isOpen: boolean;
  onClose: () => void;
  onPlaylistUpdate: () => void;
}

export const PlaylistPlayer = ({
  playlistId,
  playlistName,
  clips,
  isOpen,
  onClose,
  onPlaylistUpdate
}: PlaylistPlayerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [newPosition, setNewPosition] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentClip = clips[currentIndex];
  const totalClips = clips.length;

  const goToNext = () => {
    if (currentIndex < clips.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToFirst = () => {
    setCurrentIndex(0);
  };

  const goToLast = () => {
    setCurrentIndex(clips.length - 1);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error('Error attempting fullscreen:', err);
        toast.error("Fullscreen not available");
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleReorder = async () => {
    const targetPos = parseInt(newPosition);
    
    if (isNaN(targetPos) || targetPos < 1 || targetPos > totalClips) {
      toast.error(`Please enter a number between 1 and ${totalClips}`);
      return;
    }

    try {
      const playerEmail = localStorage.getItem("player_email") || sessionStorage.getItem("player_email");
      
      if (!playerEmail) {
        toast.error("Please log in again");
        return;
      }

      // Reorder the clips array
      const newClips = [...clips];
      const [movedClip] = newClips.splice(currentIndex, 1);
      newClips.splice(targetPos - 1, 0, movedClip);
      
      // Update order property for all clips
      const updatedClips = newClips.map((clip, idx) => ({
        ...clip,
        order: idx
      }));

      // Call edge function to update playlist
      const { data, error } = await supabase.functions.invoke('update-playlist', {
        body: {
          playerEmail,
          playlistId,
          clips: updatedClips
        }
      });

      if (error || data?.error) {
        toast.error("Failed to reorder clip");
        return;
      }

      toast.success("Clip reordered successfully");
      setNewPosition("");
      onPlaylistUpdate();
      
      // Update current index to follow the moved clip
      setCurrentIndex(targetPos - 1);
    } catch (err) {
      console.error('Error reordering:', err);
      toast.error("Failed to reorder clip");
    }
  };

  if (!currentClip) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] h-[90vh] p-0">
        <div ref={containerRef} className="relative w-full h-full bg-black flex flex-col">
          {/* Top Bar with Position Number and Close */}
          <div className="absolute top-0 left-0 right-0 z-50 flex items-start justify-between p-4 gap-4 pointer-events-none">
            {/* Position Number - Top Left */}
            <div className="bg-background/95 backdrop-blur-sm rounded-lg px-6 py-3 shadow-xl border border-border/50 pointer-events-auto">
              <div className="text-5xl font-bold text-foreground">
                {currentIndex + 1}
                <span className="text-2xl text-muted-foreground ml-2">/ {totalClips}</span>
              </div>
            </div>

            {/* Fullscreen & Close Buttons - Top Right */}
            <div className="flex gap-2 pointer-events-auto">
              <Button
                onClick={toggleFullscreen}
                variant="ghost"
                size="icon"
                className="bg-background/95 backdrop-blur-sm hover:bg-background shadow-xl border border-border/50"
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
              </Button>
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon"
                className="bg-background/95 backdrop-blur-sm hover:bg-background shadow-xl border border-border/50"
                title="Close player"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Video Player */}
          <div className="flex-1 flex items-center justify-center p-4">
            <video
              key={currentClip.videoUrl}
              src={currentClip.videoUrl}
              controls
              autoPlay
              playsInline
              preload="metadata"
              className="max-w-full max-h-full"
              controlsList="nodownload"
              onEnded={goToNext}
            >
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Floating Reorder Control - Bottom Center over Video */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-20">
            <div className="pointer-events-auto flex items-center gap-3 bg-background/95 backdrop-blur-sm rounded-lg px-4 py-2 border border-border/50 shadow-xl">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">#</span>
              <Input
                type="number"
                min="1"
                max={totalClips}
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
                placeholder={`1-${totalClips}`}
                className="w-20 h-9 text-base"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPosition) handleReorder();
                  if (e.key === 'Escape') setNewPosition("");
                }}
              />
              {newPosition && (
                <>
                  <Button onClick={handleReorder} size="sm" className="h-8">
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button 
                    onClick={() => setNewPosition("")} 
                    variant="ghost" 
                    size="sm"
                    className="h-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Bottom Bar: First / Previous / Title / Next / Last */}
          <div className="bg-background/90 backdrop-blur-sm p-4 flex items-center justify-between gap-2 md:gap-4">
            <div className="flex gap-2">
              <Button
                onClick={goToFirst}
                disabled={currentIndex === 0}
                variant="outline"
                size="sm"
                className="hidden sm:flex"
              >
                First
              </Button>
              <Button
                onClick={goToPrevious}
                disabled={currentIndex === 0}
                variant="outline"
                size="lg"
              >
                <ChevronLeft className="w-6 h-6" />
                <span className="hidden md:inline">Previous</span>
              </Button>
            </div>

            <div className="text-center flex-1 px-2 md:px-4 min-w-0">
              <h3 className="text-base md:text-xl font-semibold truncate">{currentClip.name}</h3>
              <p className="text-xs md:text-sm text-muted-foreground mt-1 truncate">{playlistName}</p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={goToNext}
                disabled={currentIndex === clips.length - 1}
                variant="outline"
                size="lg"
              >
                <span className="hidden md:inline">Next</span>
                <ChevronRight className="w-6 h-6" />
              </Button>
              <Button
                onClick={goToLast}
                disabled={currentIndex === clips.length - 1}
                variant="outline"
                size="sm"
                className="hidden sm:flex"
              >
                Last
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
