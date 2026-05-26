import { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, ChevronLeft, ChevronRight, Maximize, Minimize, Star, Check } from "lucide-react";
import { AddToPlaylistButton } from "@/components/portal/AddToPlaylistButton";
import { toast } from "sonner";

const getScoreBgColor = (score: number | null | undefined): string => {
  if (score === null || score === undefined) return 'bg-primary/90';
  if (score < 0) return 'bg-red-950';
  if (score < 0.2) return 'bg-red-600';
  if (score < 0.4) return 'bg-red-400';
  if (score < 0.6) return 'bg-orange-700';
  if (score < 0.8) return 'bg-orange-500';
  if (score < 1.0) return 'bg-yellow-400';
  if (score < 1.4) return 'bg-lime-400';
  if (score < 1.8) return 'bg-green-500';
  if (score < 2.5) return 'bg-green-700';
  return 'bg-yellow-600';
};

const getActionScoreBgColor = (score: number | null | undefined): string => {
  if (score === null || score === undefined) return 'bg-muted';
  if (score >= 0.15) return 'bg-green-800';
  if (score >= 0.10) return 'bg-green-600';
  if (score >= 0.05) return 'bg-green-500';
  if (score > 0) return 'bg-lime-500';
  if (score === 0) return 'bg-yellow-500';
  if (score > -0.05) return 'bg-orange-500';
  if (score > -0.10) return 'bg-red-500';
  return 'bg-red-700';
};

const getClipScoreColor = (clip: { r90Score?: number | null; actionScore?: number | null }): string => {
  if (clip.actionScore != null) return getActionScoreBgColor(clip.actionScore);
  if (clip.r90Score != null) return getScoreBgColor(clip.r90Score);
  return 'bg-primary/90';
};

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
  /** When supplied, surfaces "Add to playlist" for the current clip. */
  playerId?: string | null;
  /** When supplied, surfaces the floating # reorder input. Reorders the underlying clip list. */
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

export const HighlightReelPlayer = ({ clips, projectName, isOpen, onClose, playerId, onReorder }: HighlightReelPlayerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [newPosition, setNewPosition] = useState("");
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

  const handleReorder = () => {
    if (!onReorder) return;
    const targetPos = parseInt(newPosition);
    if (isNaN(targetPos) || targetPos < 1 || targetPos > totalClips) {
      toast.error(`Please enter a number between 1 and ${totalClips}`);
      return;
    }
    const toIdx = targetPos - 1;
    if (toIdx === currentIndex) { setNewPosition(""); return; }
    onReorder(currentIndex, toIdx);
    setNewPosition("");
    setCurrentIndex(toIdx);
    toast.success("Clip reordered");
  };

  if (!currentClip) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] h-[90vh] p-0">
        <div ref={containerRef} className="relative w-full h-full bg-black flex flex-col">
          {/* Top safe spacer bar */}
          <div className="w-full h-10 md:h-0 bg-black shrink-0" />

          {/* Top Bar */}
          <div className="absolute top-10 md:top-0 left-0 right-0 z-50 flex items-start justify-between p-4 gap-4 pointer-events-none">
            <div className="bg-background/95 backdrop-blur-sm rounded-lg px-4 md:px-6 py-2 md:py-3 shadow-xl border border-border/50 pointer-events-auto">
              <div className="text-3xl md:text-5xl font-bold text-foreground">
                {currentIndex + 1}
                <span className="text-lg md:text-2xl text-muted-foreground ml-1 md:ml-2">/ {totalClips}</span>
              </div>
            </div>
            <div className="flex gap-2 pointer-events-auto">
              {playerId && currentClip?.videoUrl && (
                <div className="bg-background/95 backdrop-blur-sm rounded-md shadow-xl border border-border/50">
                  <AddToPlaylistButton
                    asStaff
                    playerId={playerId}
                    clip={{ name: currentClip.title || `${projectName} clip`, videoUrl: currentClip.videoUrl }}
                    className="h-10 w-10"
                  />
                </div>
              )}
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

          {/* Floating reorder control — only when reorderable */}
          {onReorder && totalClips > 1 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-36 md:pb-32">
              <div className="pointer-events-auto flex items-center gap-3 bg-background/95 backdrop-blur-sm rounded-lg px-4 py-3 border-2 border-primary/50 shadow-xl">
                <span className="text-lg font-bold text-primary whitespace-nowrap">#</span>
                <Input
                  type="number"
                  min={1}
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
                    <Button onClick={() => setNewPosition("")} variant="ghost" size="sm" className="h-9 px-3">
                      <X className="w-5 h-5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

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
                  <Badge className={`text-xs flex-shrink-0 text-white ${getClipScoreColor(currentClip)}`}>
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
          {/* Bottom safe spacer bar */}
          <div className="w-full h-8 md:h-0 bg-background/90 shrink-0" />
        </div>
      </DialogContent>
    </Dialog>
  );
};
