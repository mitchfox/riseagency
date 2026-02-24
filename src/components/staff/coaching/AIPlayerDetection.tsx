import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, UserSearch, Check, X, Play, Eye, Tag } from "lucide-react";

interface DetectedAction {
  frameIndex: number;
  timestamp: number;
  actionType: string;
  confidence: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface PlayerTag {
  timestamp: number;
  description: string;
}

interface Props {
  videoUrl: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  onClipsAccepted: (clips: { start: number; end: number; label: string; actionType: string }[]) => void;
  opponent?: string | null;
}

export const AIPlayerDetection = ({ videoUrl, videoRef, onClipsAccepted, opponent }: Props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [playerDescription, setPlayerDescription] = useState("");
  const [notPlayer, setNotPlayer] = useState("");
  const [playerTags, setPlayerTags] = useState<PlayerTag[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [detectedActions, setDetectedActions] = useState<DetectedAction[]>([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const tagCurrentFrame = () => {
    if (!videoRef.current) return;
    const ts = videoRef.current.currentTime;
    setPlayerTags(prev => [...prev, {
      timestamp: ts,
      description: `Tagged at ${Math.floor(ts / 60)}:${String(Math.floor(ts % 60)).padStart(2, '0')}`,
    }]);
    toast.success("Player tagged at current frame");
  };

  const extractFrame = useCallback((time: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = videoRef.current;
      if (!video) return reject("No video element");

      const canvas = canvasRef.current || document.createElement("canvas");
      // Use small dimensions to reduce payload size
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("No canvas context");

      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Use JPEG for smaller size
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      };

      video.addEventListener("seeked", onSeeked);
      video.currentTime = time;
    });
  }, [videoRef]);

  const startScan = async () => {
    if (!playerName.trim()) {
      toast.error("Enter the player's name first");
      return;
    }
    if (!videoRef.current || !videoRef.current.duration) {
      toast.error("Video not loaded");
      return;
    }

    setScanning(true);
    setScanProgress(0);
    setDetectedActions([]);

    const video = videoRef.current;
    const duration = video.duration;
    const sampleInterval = 3; // Every 3 seconds
    const totalFrames = Math.floor(duration / sampleInterval);
    const batchSize = 15; // Send 15 frames per API call to stay under limits

    const allDetected: DetectedAction[] = [];

    try {
      // Pause the video for frame extraction
      video.pause();

      for (let batchStart = 0; batchStart < totalFrames; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, totalFrames);
        const frames: { dataUrl: string; timestamp: number; index: number }[] = [];

        // Extract frames for this batch
        for (let i = batchStart; i < batchEnd; i++) {
          const time = i * sampleInterval;
          try {
            const dataUrl = await extractFrame(time);
            frames.push({ dataUrl, timestamp: time, index: i });
          } catch {
            // Skip frames that fail
          }
          setScanProgress(Math.round(((i + 1) / totalFrames) * 100));
        }

        if (frames.length === 0) continue;

        // Call AI
        const { data, error } = await supabase.functions.invoke('detect-player-actions', {
          body: {
            frames,
            playerInfo: {
              name: playerName,
              description: playerDescription || undefined,
              notPlayer: notPlayer || undefined,
            },
            videoContext: {
              opponent: opponent || undefined,
            },
          },
        });

        if (error) {
          console.error('AI detection error:', error);
          toast.error(`Batch ${Math.floor(batchStart / batchSize) + 1} failed: ${error.message}`);
          continue;
        }

        if (data?.actions) {
          const batchActions: DetectedAction[] = data.actions.map((a: any) => ({
            frameIndex: a.frameIndex,
            timestamp: frames.find(f => f.index === a.frameIndex)?.timestamp || (a.frameIndex * sampleInterval),
            actionType: a.actionType,
            confidence: a.confidence,
            description: a.description,
            status: 'pending' as const,
          }));
          allDetected.push(...batchActions);
        }
      }

      // Deduplicate nearby timestamps (within 3s)
      const deduped = allDetected.filter((action, idx) => {
        return !allDetected.slice(0, idx).some(prev => Math.abs(prev.timestamp - action.timestamp) < 3);
      });

      setDetectedActions(deduped);
      setReviewMode(true);
      setCurrentReviewIndex(0);

      if (deduped.length === 0) {
        toast.info("No actions detected for this player");
      } else {
        toast.success(`Found ${deduped.length} potential actions`);
      }
    } catch (err: any) {
      toast.error(err.message || "Scan failed");
    }

    setScanning(false);
  };

  const handleReviewAction = (index: number, status: 'accepted' | 'rejected') => {
    setDetectedActions(prev => prev.map((a, i) => i === index ? { ...a, status } : a));
    // Auto-advance to next pending
    const nextPending = detectedActions.findIndex((a, i) => i > index && a.status === 'pending');
    if (nextPending !== -1) setCurrentReviewIndex(nextPending);
  };

  const previewAction = (action: DetectedAction) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, action.timestamp - 5);
      videoRef.current.play();
    }
  };

  const acceptAll = () => {
    setDetectedActions(prev => prev.map(a => a.status === 'pending' ? { ...a, status: 'accepted' } : a));
  };

  const finishReview = () => {
    const accepted = detectedActions.filter(a => a.status === 'accepted');
    if (accepted.length === 0) {
      toast.info("No actions accepted");
      setDialogOpen(false);
      return;
    }

    const clips = accepted.map(a => ({
      start: Math.max(0, a.timestamp - 5),
      end: a.timestamp + 5,
      label: `${a.actionType} at ${Math.floor(a.timestamp / 60)}:${String(Math.floor(a.timestamp % 60)).padStart(2, '0')}`,
      actionType: a.actionType,
    }));

    onClipsAccepted(clips);
    toast.success(`${clips.length} clips created from AI detection`);
    setDialogOpen(false);
    setReviewMode(false);
    setDetectedActions([]);
  };

  const pendingCount = detectedActions.filter(a => a.status === 'pending').length;
  const acceptedCount = detectedActions.filter(a => a.status === 'accepted').length;
  const rejectedCount = detectedActions.filter(a => a.status === 'rejected').length;

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1" onClick={() => setDialogOpen(true)}>
        <UserSearch className="h-3.5 w-3.5" /> AI Player Scan
      </Button>

      <canvas ref={canvasRef} className="hidden" width={640} height={360} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[90vw] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bebas uppercase tracking-wider text-primary">
              AI Player Action Detection
            </DialogTitle>
          </DialogHeader>

          {!reviewMode ? (
            <div className="space-y-4 mt-2">
              {/* Player identity */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold uppercase tracking-wider">1. Identify the Player</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Player Name *</label>
                    <Input
                      value={playerName}
                      onChange={e => setPlayerName(e.target.value)}
                      placeholder="e.g. Tyrese Omotoye"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Description (kit, appearance)</label>
                    <Input
                      value={playerDescription}
                      onChange={e => setPlayerDescription(e.target.value)}
                      placeholder="e.g. #9, red shirt, tall striker"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Who they are NOT (disambiguation)</label>
                  <Input
                    value={notPlayer}
                    onChange={e => setNotPlayer(e.target.value)}
                    placeholder="e.g. The shorter player also wearing red"
                  />
                </div>
              </div>

              {/* Tag the player */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold uppercase tracking-wider">2. Tag the Player in Video</h4>
                <p className="text-xs text-muted-foreground">
                  Navigate to moments in the video where the player is clearly visible, then click "Tag Here" to help the AI identify them.
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={tagCurrentFrame} className="gap-1">
                    <Tag className="h-3.5 w-3.5" /> Tag Here
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {playerTags.length} tag{playerTags.length !== 1 ? 's' : ''} added
                  </span>
                </div>
                {playerTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {playerTags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tag.description}
                        <button onClick={() => setPlayerTags(prev => prev.filter((_, j) => j !== i))} className="ml-1">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Start scan */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold uppercase tracking-wider">3. Start AI Scan</h4>
                <p className="text-xs text-muted-foreground">
                  The AI will sample a frame every 3 seconds and analyse each one for actions by {playerName || 'the player'}.
                  This may take a few minutes for longer videos.
                </p>
                <Button onClick={startScan} disabled={scanning || !playerName.trim()} className="gap-2">
                  {scanning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Scanning... {scanProgress}%
                    </>
                  ) : (
                    <>
                      <UserSearch className="h-4 w-4" />
                      Start Scan
                    </>
                  )}
                </Button>
                {scanning && (
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Review mode */
            <div className="space-y-4 mt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{pendingCount} pending</Badge>
                  <Badge className="bg-green-600 text-white">{acceptedCount} accepted</Badge>
                  <Badge variant="destructive">{rejectedCount} rejected</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={acceptAll}>Accept All Pending</Button>
                  <Button size="sm" onClick={finishReview} disabled={acceptedCount === 0}>
                    Create {acceptedCount} Clips
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                {detectedActions.map((action, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                      action.status === 'accepted' ? 'bg-green-500/10 border-green-500/30' :
                      action.status === 'rejected' ? 'bg-destructive/10 border-destructive/30 opacity-50' :
                      idx === currentReviewIndex ? 'bg-primary/5 border-primary/30' :
                      'bg-card border-border'
                    }`}
                  >
                    <button
                      onClick={() => previewAction(action)}
                      className="shrink-0 w-8 h-8 rounded bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                    >
                      <Play className="h-3.5 w-3.5 text-primary" />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{action.actionType}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {Math.floor(action.timestamp / 60)}:{String(Math.floor(action.timestamp % 60)).padStart(2, '0')}
                        </Badge>
                        <Badge variant={
                          action.confidence === 'high' ? 'default' :
                          action.confidence === 'medium' ? 'secondary' : 'outline'
                        } className="text-[10px]">
                          {action.confidence}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant={action.status === 'accepted' ? 'default' : 'ghost'}
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleReviewAction(idx, 'accepted')}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant={action.status === 'rejected' ? 'destructive' : 'ghost'}
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleReviewAction(idx, 'rejected')}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setReviewMode(false); setDetectedActions([]); }}>
                  Back to Setup
                </Button>
                <Button onClick={finishReview} disabled={acceptedCount === 0} className="flex-1">
                  Create {acceptedCount} Clips
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};