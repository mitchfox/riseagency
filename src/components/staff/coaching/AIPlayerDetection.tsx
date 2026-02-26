import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";
import { toast } from "sonner";
import { Loader2, UserSearch, X, Tag } from "lucide-react";

interface DetectedAction {
  frameIndex: number;
  timestamp: number;
  actionType: string;
  confidence: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected';
  clipBefore?: number;
  clipAfter?: number;
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
  onClipsAccepted: (clips: { start: number; end: number; label: string; actionType: string; description?: string; confidence?: string }[]) => void;
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

  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);

  const createHiddenVideo = useCallback((): Promise<HTMLVideoElement> => {
    return new Promise((resolve, reject) => {
      const vid = document.createElement("video");
      vid.src = videoUrl;
      vid.crossOrigin = "anonymous";
      vid.preload = "auto";
      vid.style.display = "none";
      document.body.appendChild(vid);
      vid.oncanplay = () => resolve(vid);
      vid.onerror = () => reject(new Error("Failed to load video for scanning"));
    });
  }, [videoUrl]);

  const extractFrame = useCallback((video: HTMLVideoElement, time: number): Promise<string> => {
    return new Promise((resolve, reject) => {
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
  }, []);

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

    const duration = videoRef.current.duration;
    const sampleInterval = 3;
    const totalFrames = Math.floor(duration / sampleInterval);
    const batchSize = 15;

    const allDetected: DetectedAction[] = [];

    let hiddenVideo: HTMLVideoElement | null = null;
    try {
      hiddenVideo = await createHiddenVideo();
      hiddenVideoRef.current = hiddenVideo;

      for (let batchStart = 0; batchStart < totalFrames; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, totalFrames);
        const frames: { dataUrl: string; timestamp: number; index: number }[] = [];

        for (let i = batchStart; i < batchEnd; i++) {
          const time = i * sampleInterval;
          try {
            const dataUrl = await extractFrame(hiddenVideo, time);
            frames.push({ dataUrl, timestamp: time, index: i });
          } catch {
            // Skip frames that fail
          }
          setScanProgress(Math.round(((i + 1) / totalFrames) * 100));
        }

        if (frames.length === 0) continue;

        const { data, error } = await invokeEdgeFunction('detect-player-actions', {
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
            clipBefore: a.clipBefore,
            clipAfter: a.clipAfter,
          }));
          allDetected.push(...batchActions);
        }
      }

      const deduped = allDetected.filter((action, idx) => {
        return !allDetected.slice(0, idx).some(prev => Math.abs(prev.timestamp - action.timestamp) < 3);
      });

      if (deduped.length === 0) {
        toast.info("No actions detected for this player");
      } else {
        // Send all detected actions as pending clips to the clip list
        const clips = deduped.map(a => {
          const before = a.clipBefore ?? 5;
          const after = a.clipAfter ?? 5;
          return {
            start: Math.max(0, a.timestamp - before),
            end: a.timestamp + after,
            label: `${a.actionType} at ${Math.floor(a.timestamp / 60)}:${String(Math.floor(a.timestamp % 60)).padStart(2, '0')}`,
            actionType: a.actionType,
            description: a.description,
            confidence: a.confidence,
          };
        });
        onClipsAccepted(clips);
        toast.success(`${deduped.length} potential actions added as pending clips`);
        setDialogOpen(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Scan failed");
    } finally {
      if (hiddenVideo) {
        hiddenVideo.pause();
        hiddenVideo.src = "";
        hiddenVideo.remove();
        hiddenVideoRef.current = null;
      }
    }

    setScanning(false);
  };

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
                  Detected actions will appear as pending clips below the video for you to review.
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
        </DialogContent>
      </Dialog>
    </>
  );
};
