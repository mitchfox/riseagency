import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, UserSearch, Check, X, Play, Tag } from "lucide-react";

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

interface PlayerOption {
  id: string;
  name: string;
  position?: string;
}

interface Props {
  videoUrl: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  onClipsAccepted: (clips: { start: number; end: number; label: string; actionType: string }[]) => void;
  opponent?: string | null;
  players?: PlayerOption[];
  selectedPlayerId?: string | null;
  existingClips?: { start: number; end: number; label: string; action_type: string }[];
}

// Persist player AI descriptions across videos
const STORAGE_KEY = "ai_player_descriptions";

function loadSavedDescriptions(): Record<string, { description: string; notPlayer: string; kitDescription: string }> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function saveDescription(playerName: string, data: { description: string; notPlayer: string; kitDescription: string }) {
  const all = loadSavedDescriptions();
  all[playerName.toLowerCase().trim()] = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export const AIPlayerDetection = ({ videoUrl, videoRef, onClipsAccepted, opponent, players, selectedPlayerId, existingClips }: Props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [playerDescription, setPlayerDescription] = useState("");
  const [notPlayer, setNotPlayer] = useState("");
  const [kitDescription, setKitDescription] = useState("");
  const [playerTags, setPlayerTags] = useState<PlayerTag[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [detectedActions, setDetectedActions] = useState<DetectedAction[]>([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [selectedPlayerForScan, setSelectedPlayerForScan] = useState<string>(selectedPlayerId || "");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // When a player is selected from dropdown, load saved description and previous report clips
  useEffect(() => {
    if (!selectedPlayerForScan || !players) return;
    const player = players.find(p => p.id === selectedPlayerForScan);
    if (!player) return;
    
    setPlayerName(player.name);
    
    // Load saved description
    const saved = loadSavedDescriptions()[player.name.toLowerCase().trim()];
    if (saved) {
      setPlayerDescription(saved.description || "");
      setNotPlayer(saved.notPlayer || "");
      setKitDescription(saved.kitDescription || "");
    }
    
    // Load previous clips from performance reports as reference tags
    loadPreviousClips(selectedPlayerForScan);
  }, [selectedPlayerForScan, players]);

  const loadPreviousClips = async (playerId: string) => {
    try {
      // Get recent performance report actions with video clips for this player
      const { data: reports } = await supabase
        .from('player_analysis')
        .select('id')
        .eq('player_id', playerId)
        .order('analysis_date', { ascending: false })
        .limit(5);
      
      if (!reports || reports.length === 0) return;
      
      const { data: actions } = await supabase
        .from('performance_report_actions')
        .select('action_type, minute, video_url')
        .in('analysis_id', reports.map(r => r.id))
        .not('video_url', 'is', null)
        .limit(30);
      
      if (actions && actions.length > 0) {
        const tags: PlayerTag[] = actions.map(a => ({
          timestamp: a.minute ? a.minute * 60 : 0,
          description: `${a.action_type} (previous report)`,
        }));
        setPlayerTags(prev => {
          // Don't duplicate existing tags
          const existing = new Set(prev.map(t => t.description));
          return [...prev, ...tags.filter(t => !existing.has(t.description))];
        });
      }
    } catch {
      // Silently fail - reference tags are optional
    }
  };

  const tagCurrentFrame = () => {
    if (!videoRef.current) return;
    const ts = videoRef.current.currentTime;
    setPlayerTags(prev => [...prev, {
      timestamp: ts,
      description: `Tagged at ${Math.floor(ts / 60)}:${String(Math.floor(ts % 60)).padStart(2, '0')}`,
    }]);
    toast.success("Player tagged at current frame");
  };

  const tagFromExistingClip = (clip: { start: number; label: string; action_type: string }) => {
    setPlayerTags(prev => [...prev, {
      timestamp: clip.start,
      description: `${clip.action_type || clip.label} (existing clip)`,
    }]);
    toast.success("Tagged from existing clip");
  };

  const extractFrame = useCallback((time: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = videoRef.current;
      if (!video) return reject("No video element");

      const canvas = canvasRef.current || document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("No canvas context");

      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
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

    // Save description for future videos
    saveDescription(playerName, { description: playerDescription, notPlayer, kitDescription });

    setScanning(true);
    setScanProgress(0);
    setDetectedActions([]);

    const video = videoRef.current;
    const duration = video.duration;
    const sampleInterval = 3;
    const totalFrames = Math.floor(duration / sampleInterval);
    const batchSize = 15;

    const allDetected: DetectedAction[] = [];

    try {
      video.pause();

      for (let batchStart = 0; batchStart < totalFrames; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, totalFrames);
        const frames: { dataUrl: string; timestamp: number; index: number }[] = [];

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

        const { data, error } = await supabase.functions.invoke('detect-player-actions', {
          body: {
            frames,
            playerInfo: {
              name: playerName,
              description: [playerDescription, kitDescription].filter(Boolean).join('. ') || undefined,
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
              {/* Player selection */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold uppercase tracking-wider">1. Identify the Player</h4>
                
                {players && players.length > 0 && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Select Player</label>
                    <Select value={selectedPlayerForScan} onValueChange={setSelectedPlayerForScan}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a player..." />
                      </SelectTrigger>
                      <SelectContent>
                        {players.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}{p.position ? ` (${p.position})` : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

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
                    <label className="text-xs text-muted-foreground mb-1 block">Description (appearance)</label>
                    <Input
                      value={playerDescription}
                      onChange={e => setPlayerDescription(e.target.value)}
                      placeholder="e.g. #9, tall striker, dark skin"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Kit Description (this game)</label>
                    <Input
                      value={kitDescription}
                      onChange={e => setKitDescription(e.target.value)}
                      placeholder="e.g. red shirt, white shorts, #9"
                    />
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
              </div>

              {/* Tag the player */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold uppercase tracking-wider">2. Tag the Player in Video</h4>
                <p className="text-xs text-muted-foreground">
                  Navigate to moments in the video where the player is clearly visible, then click "Tag Here". Previous report clips are auto-loaded as references.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={tagCurrentFrame} className="gap-1">
                    <Tag className="h-3.5 w-3.5" /> Tag Here
                  </Button>
                  {existingClips && existingClips.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => {
                      existingClips.forEach(clip => tagFromExistingClip(clip));
                    }} className="gap-1">
                      <Tag className="h-3.5 w-3.5" /> Tag From All Clips ({existingClips.length})
                    </Button>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {playerTags.length} tag{playerTags.length !== 1 ? 's' : ''} added
                  </span>
                </div>
                {existingClips && existingClips.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {existingClips.slice(0, 8).map((clip, i) => (
                      <Badge key={i} variant="outline" className="text-xs cursor-pointer hover:bg-primary/10" onClick={() => tagFromExistingClip(clip)}>
                        + {clip.action_type || clip.label}
                      </Badge>
                    ))}
                    {existingClips.length > 8 && <Badge variant="outline" className="text-xs">+{existingClips.length - 8} more</Badge>}
                  </div>
                )}
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
