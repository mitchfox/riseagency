import { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, ChevronLeft, ChevronRight, Check, Maximize, Minimize } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Clip {
  id?: string;
  name: string;
  videoUrl: string;
  order: number;
  duration?: number;
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
  onPlaylistUpdate,
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

  const goToClip = (index: number) => {
    setCurrentIndex(index);
  };

  const handleRemoveCurrentClip = async () => {
    if (!currentClip) return;

    try {
      const playerEmail =
        localStorage.getItem("player_email") || sessionStorage.getItem("player_email");

      if (!playerEmail) {
        toast.error("Please log in again");
        return;
      }

      const updatedClips = clips
        .filter((_, idx) => idx !== currentIndex)
        .map((clip, idx) => ({ ...clip, order: idx }));

      const { data, error } = await supabase.functions.invoke("update-playlist", {
        body: {
          playerEmail,
          playlistId,
          clips: updatedClips,
        },
      });

      if (error || data?.error) {
        console.error("Remove clip error:", error || data?.error);
        toast.error("Failed to remove clip");
        return;
      }

      toast.success("Clip removed from playlist");

      if (updatedClips.length === 0) {
        onClose();
      } else if (currentIndex < updatedClips.length) {
        setCurrentIndex(currentIndex);
      } else {
        setCurrentIndex(updatedClips.length - 1);
      }

      onPlaylistUpdate();
    } catch (err) {
      console.error("Error removing clip:", err);
      toast.error("Failed to remove clip");
    }
  };

  const handleDurationLoaded = async (rawDuration: number) => {
    if (!currentClip) return;
    if (!Number.isFinite(rawDuration) || rawDuration <= 0) return;

    const duration = Math.round(rawDuration);

    try {
      const playerEmail =
        localStorage.getItem("player_email") || sessionStorage.getItem("player_email");

      if (!playerEmail) {
        // Don't block playback for this
        return;
      }

      const updatedClips = clips.map((clip, idx) =>
        idx === currentIndex ? { ...clip, duration } : clip,
      );

      const { error } = await supabase.functions.invoke("update-playlist", {
        body: {
          playerEmail,
          playlistId,
          clips: updatedClips,
        },
      });

      if (error) {
        console.error("Failed to save clip duration:", error);
      } else {
        onPlaylistUpdate();
      }
    } catch (err) {
      console.error("Error saving clip duration:", err);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error("Error attempting fullscreen:", err);
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
      const playerEmail =
        localStorage.getItem("player_email") || sessionStorage.getItem("player_email");

      if (!playerEmail) {
        toast.error("Please log in again");
        return;
      }

      const newClips = [...clips];
      const [movedClip] = newClips.splice(currentIndex, 1);
      newClips.splice(targetPos - 1, 0, movedClip);

      const updatedClips = newClips.map((clip, idx) => ({
        ...clip,
        order: idx,
      }));

      const { data, error } = await supabase.functions.invoke("update-playlist", {
        body: {
          playerEmail,
          playlistId,
          clips: updatedClips,
        },
      });

      if (error || data?.error) {
        toast.error("Failed to reorder clip");
        return;
      }

      toast.success("Clip reordered successfully");
      setNewPosition("");
      onPlaylistUpdate();

      setCurrentIndex(targetPos - 1);
    } catch (err) {
      console.error("Error reordering:", err);
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
              onLoadedMetadata={(e) => handleDurationLoaded(e.currentTarget.duration)}
              loop
              className="max-w-full max-h-full"
              controlsList="nodownload"
            >
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Floating Reorder Control - Bottom Center over Video */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-36 md:pb-32">
            <div className="pointer-events-auto flex items-center gap-3 bg-background/95 backdrop-blur-sm rounded-lg px-4 py-3 border-2 border-primary/50 shadow-xl">
              <span className="text-lg font-bold text-primary whitespace-nowrap">#</span>
              <Input
                type="number"
                min="1"
                max={totalClips}
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
                placeholder={`1-${totalClips}`}
                className="w-24 h-10 text-lg font-semibold text-center"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newPosition) handleReorder();
                  if (e.key === "Escape") setNewPosition("");
                }}
              />
              {newPosition && (
                <>
                  <Button onClick={handleReorder} size="sm" className="h-9 px-3">
                    <Check className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={() => setNewPosition("")}
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Bottom Bar: Previous / Title / Remove / Next */}
          <div className="bg-background/90 backdrop-blur-sm p-4 flex items-center justify-between gap-2 md:gap-4">
            <Button
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              variant="outline"
              size="lg"
            >
              <ChevronLeft className="w-6 h-6" />
              <span className="hidden md:inline">Previous</span>
            </Button>

            <div className="text-center flex-1 px-2 md:px-4 min-w-0">
              <h3 className="text-base md:text-xl font-semibold truncate">{currentClip.name}</h3>
              <p className="text-xs md:text-sm text-muted-foreground mt-1 truncate">{playlistName}</p>
              <Select value={currentIndex.toString()} onValueChange={(val) => goToClip(parseInt(val))}>
                <SelectTrigger className="w-[160px] h-7 text-xs mx-auto mt-2">
                  <SelectValue placeholder={`Clip ${currentIndex + 1} of ${totalClips}`} />
                </SelectTrigger>
                <SelectContent className="bg-background max-h-[300px]">
                  {clips.map((clip, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>
                      {idx + 1}. {clip.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleRemoveCurrentClip}
              variant="destructive"
              size="lg"
              className="hidden sm:flex items-center gap-2"
              title="Remove from playlist (clip stays available in Best Clips)"
            >
              <X className="w-5 h-5" />
              <span className="hidden md:inline">Remove</span>
            </Button>

            <Button
              onClick={goToNext}
              disabled={currentIndex === clips.length - 1}
              variant="outline"
              size="lg"
            >
              <span className="hidden md:inline">Next</span>
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
