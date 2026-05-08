import { useState, useRef, useCallback, useEffect, useMemo } from "react";
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


interface RejectionFeedback {
  actionType: string;
  reason: string;
  date: string;
}

interface ConfirmedExample {
  timestamp: number;
  actionType: string;
  description?: string;
}

interface Props {
  videoUrl: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  onClipsAccepted: (clips: { start: number; end: number; label: string; actionType: string; description?: string; confidence?: string }[]) => void;
  opponent?: string | null;
  players?: PlayerOption[];
  selectedPlayerId?: string | null;
  existingClips?: { start: number; end: number; label: string; action_type: string }[];
  rejectionHistory?: RejectionFeedback[];
  confirmedExamples?: ConfirmedExample[];
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

export const AIPlayerDetection = ({ videoUrl, videoRef, onClipsAccepted, opponent, players, selectedPlayerId, existingClips, rejectionHistory, confirmedExamples }: Props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [playerDescription, setPlayerDescription] = useState("");
  const [notPlayer, setNotPlayer] = useState("");
  const [kitDescription, setKitDescription] = useState("");
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [minConfidence, setMinConfidence] = useState<'medium' | 'high'>('medium');
  const [playerTags, setPlayerTags] = useState<PlayerTag[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [selectedPlayerForScan, setSelectedPlayerForScan] = useState<string>(selectedPlayerId || "");
  const [scanStartTime, setScanStartTime] = useState("");
  const [scanEndTime, setScanEndTime] = useState("");
  const [sampleInterval, setSampleInterval] = useState<string>("5");
  const [historicalConfirmedExamples, setHistoricalConfirmedExamples] = useState<ConfirmedExample[]>([]);
  const [globalCorpus, setGlobalCorpus] = useState<ConfirmedExample[]>([]);
  const [persistedRejections, setPersistedRejections] = useState<RejectionFeedback[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Pull a sample of confirmed action examples across the entire database — these
  // act as few-shot training context for Gemini so the AI learns from the full
  // RISE labelled-action corpus, not just this player's history.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('performance_report_actions')
          .select('action_type, action_description, minute')
          .not('action_type', 'is', null)
          .order('created_at', { ascending: false })
          .limit(400);
        if (cancelled || !data) return;

        // Spread across action types so the AI sees variety, not 400 of the same.
        const perType = new Map<string, ConfirmedExample[]>();
        for (const row of data) {
          const type = String(row.action_type);
          if (!perType.has(type)) perType.set(type, []);
          const bucket = perType.get(type)!;
          if (bucket.length < 8) {
            bucket.push({
              timestamp: row.minute ? Number(row.minute) * 60 : 0,
              actionType: type,
              description: row.action_description || undefined,
            });
          }
        }
        const flat: ConfirmedExample[] = [];
        perType.forEach((arr) => flat.push(...arr));
        setGlobalCorpus(flat);
      } catch {
        setGlobalCorpus([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // When a player is selected from dropdown, load saved description and previous report clips
  useEffect(() => {
    if (!selectedPlayerForScan || !players) return;
    const player = players.find(p => p.id === selectedPlayerForScan);
    if (!player) return;
    
    setPlayerName(player.name);

    // Pull persistent rejection feedback for this player so the AI learns across sessions.
    (async () => {
      const { data: fb } = await supabase
        .from('ai_detection_feedback')
        .select('action_type, feedback_type, reason, created_at')
        .eq('player_id', selectedPlayerForScan)
        .in('feedback_type', ['wrong_player', 'wrong_action', 'not_involved'])
        .order('created_at', { ascending: false })
        .limit(50);
      if (fb) {
        setPersistedRejections(fb.map((r: any) => ({
          actionType: r.action_type || 'unknown',
          reason: `${r.feedback_type}: ${r.reason || ''}`.trim(),
          date: r.created_at,
        })));
      } else {
        setPersistedRejections([]);
      }
    })();
    
    // Auto-load identification fields from the player record (set in Player Management).
    // Falls back to localStorage cache for back-compat.
    (async () => {
      const { data: pdata } = await supabase
        .from('players')
        .select('identification_description, identification_reference_image_url, not_to_confuse_with')
        .eq('id', selectedPlayerForScan)
        .maybeSingle();
      const idDesc = (pdata as any)?.identification_description as string | null | undefined;
      const idImg = (pdata as any)?.identification_reference_image_url as string | null | undefined;
      const idNot = (pdata as any)?.not_to_confuse_with as string | null | undefined;
      const saved = loadSavedDescriptions()[player.name.toLowerCase().trim()];
      setPlayerDescription(idDesc || saved?.description || "");
      setNotPlayer(idNot || saved?.notPlayer || "");
      setKitDescription(saved?.kitDescription || "");
      setReferenceImageUrl(idImg || "");
    })();
    
    // Load previous clips from performance reports as reference tags
    loadPreviousClips(selectedPlayerForScan);
  }, [selectedPlayerForScan, players]);


  const loadPreviousClips = async (playerId: string) => {
    try {
      const { data: reports } = await supabase
        .from('player_analysis')
        .select('id')
        .eq('player_id', playerId)
        .order('analysis_date', { ascending: false });

      if (!reports || reports.length === 0) {
        setHistoricalConfirmedExamples([]);
        return;
      }

      const { data: actions } = await supabase
        .from('performance_report_actions')
        .select('action_type, action_description, minute, video_url')
        .in('analysis_id', reports.map(r => r.id))
        .not('video_url', 'is', null);

      if (!actions || actions.length === 0) {
        setHistoricalConfirmedExamples([]);
        return;
      }

      const tags: PlayerTag[] = actions.map((a) => ({
        timestamp: a.minute ? a.minute * 60 : 0,
        description: `${a.action_type}${a.action_description ? `: ${a.action_description}` : ''} (report example)`,
      }));

      setPlayerTags(prev => {
        const existing = new Set(prev.map(t => t.description));
        return [...prev, ...tags.filter(t => !existing.has(t.description))];
      });

      setHistoricalConfirmedExamples(actions
        .filter((a) => !!a.action_type)
        .map((a) => ({
          timestamp: a.minute ? a.minute * 60 : 0,
          actionType: String(a.action_type),
          description: a.action_description || undefined,
        }))
      );
    } catch {
      setHistoricalConfirmedExamples([]);
    }
  };

  const tagCurrentFrame = () => {
    if (!videoRef.current) return;
    const ts = videoRef.current.currentTime;
    setPlayerTags(prev => [...prev, {
      timestamp: ts,
      description: `Tagged at ${Math.floor(ts / 60)}.${String(Math.floor(ts % 60)).padStart(2, '0')}`,
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

  /** Parse "mm.ss" (preferred), "mm:ss" or raw seconds string to seconds */
  const parseTimeToSeconds = (val: string): number | null => {
    const input = val.trim();
    if (!input) return null;

    if (input.includes('.') || input.includes(':')) {
      const parts = input.split(/[.:]/);
      if (parts.length !== 2) return null;
      const mins = Number(parts[0]);
      const secs = Number(parts[1]);
      if (!Number.isFinite(mins) || !Number.isFinite(secs) || secs < 0) return null;
      return (mins * 60) + secs;
    }

    const seconds = Number(input);
    return Number.isFinite(seconds) ? seconds : null;
  };

  const numericSampleInterval = useMemo(() => {
    const parsed = parseInt(sampleInterval, 10);
    if (!Number.isFinite(parsed)) return 5;
    return Math.max(1, Math.min(15, parsed));
  }, [sampleInterval]);

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

    const fullDuration = videoRef.current.duration;
    const segStart = parseTimeToSeconds(scanStartTime) ?? 0;
    const segEnd = parseTimeToSeconds(scanEndTime) ?? fullDuration;
    const clampedStart = Math.max(0, Math.min(segStart, fullDuration));
    const clampedEnd = Math.max(clampedStart, Math.min(segEnd, fullDuration));

    const sampleEvery = numericSampleInterval;
    const segmentDuration = Math.max(0, clampedEnd - clampedStart);
    const totalFrames = Math.max(1, Math.floor(segmentDuration / sampleEvery) + 1);
    const batchSize = 15;

    const mergedConfirmedExamples = [
      ...(confirmedExamples || []),
      ...historicalConfirmedExamples,
      ...globalCorpus,
    ];

    const allDetected: DetectedAction[] = [];

    let hiddenVideo: HTMLVideoElement | null = null;
    try {
      hiddenVideo = await createHiddenVideo();
      hiddenVideoRef.current = hiddenVideo;

      for (let batchStart = 0; batchStart < totalFrames; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, totalFrames);
        const frames: { dataUrl: string; timestamp: number; index: number }[] = [];

        for (let i = batchStart; i < batchEnd; i++) {
          const time = Math.min(clampedEnd, clampedStart + (i * sampleEvery));
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
            referenceImageUrl: referenceImageUrl || undefined,
            teamKitDescription: kitDescription || undefined,
            minConfidence,
            rejectionHistory: rejectionHistory && rejectionHistory.length > 0 ? rejectionHistory : undefined,
            confirmedExamples: mergedConfirmedExamples.length > 0 ? mergedConfirmedExamples : undefined,
          },
        });

        if (error) {
          console.error('AI detection error:', error);
          toast.error(`Batch ${Math.floor(batchStart / batchSize) + 1} failed: ${error.message}`);
          continue;
        }

        if (data?.actions) {
          const batchActions: DetectedAction[] = data.actions
            .map((a: any) => {
              const matchedTimestamp = frames.find(f => f.index === a.frameIndex)?.timestamp;
              const fallbackTimestamp = clampedStart + (a.frameIndex * sampleEvery);
              const timestamp = Number.isFinite(matchedTimestamp) ? matchedTimestamp : fallbackTimestamp;

              if (!Number.isFinite(timestamp)) return null;
              if (timestamp < clampedStart || timestamp > clampedEnd) return null;

              return {
                frameIndex: a.frameIndex,
                timestamp,
                actionType: a.actionType,
                confidence: a.confidence,
                description: a.description,
                status: 'pending' as const,
                clipBefore: a.clipBefore,
                clipAfter: a.clipAfter,
              };
            })
            .filter((a: DetectedAction | null): a is DetectedAction => a !== null);

          allDetected.push(...batchActions);
        }
      }

      const confidenceRank: Record<string, number> = { high: 2, medium: 1 };
      const contactSensitive = /(foul|fouled|penalty|red card|yellow card)/i;

      const qualityFiltered = allDetected.filter((action) => {
        const conf = action.confidence.toLowerCase();
        if (conf !== 'high' && conf !== 'medium') return false;
        if (contactSensitive.test(action.actionType) && conf !== 'high') return false;
        return true;
      });

      const sortedByTime = [...qualityFiltered].sort((a, b) => a.timestamp - b.timestamp);
      const dedupedByWindow: DetectedAction[] = [];

      for (const action of sortedByTime) {
        const last = dedupedByWindow[dedupedByWindow.length - 1];
        if (!last || Math.abs(last.timestamp - action.timestamp) >= 6) {
          dedupedByWindow.push(action);
          continue;
        }

        const isBetter = (confidenceRank[action.confidence.toLowerCase()] || 0) > (confidenceRank[last.confidence.toLowerCase()] || 0);
        if (isBetter) dedupedByWindow[dedupedByWindow.length - 1] = action;
      }

      if (dedupedByWindow.length === 0) {
        toast.info("No actions detected for this player");
      } else {
        const roundDown5 = (t: number) => Math.floor(t / 5) * 5;

        const clips = dedupedByWindow.map(a => {
          const roundedTs = roundDown5(a.timestamp);
          const before = a.clipBefore ?? 5;
          const after = a.clipAfter ?? 5;
          return {
            start: Math.max(clampedStart, roundedTs - before),
            end: Math.min(clampedEnd, roundedTs + after),
            label: `${a.actionType} at ${Math.floor(roundedTs / 60)}.${String(Math.floor(roundedTs % 60)).padStart(2, '0')}`,
            actionType: a.actionType,
            description: a.description,
            confidence: a.confidence,
          };
        }).filter((c) => c.end > c.start);

        onClipsAccepted(clips);
        toast.success(`${clips.length} potential actions added`);
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
                <h4 className="text-sm font-semibold uppercase tracking-wider">3. Set Scan Segment</h4>
                <p className="text-xs text-muted-foreground">
                  Optionally limit which portion of the video to scan. Leave blank to scan the entire video.
                  Use mm.ss format (e.g. 5.30) or raw seconds (e.g. 330).
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Start time</label>
                    <Input
                      value={scanStartTime}
                      onChange={e => setScanStartTime(e.target.value)}
                      placeholder="0.00 (start)"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">End time</label>
                    <Input
                      value={scanEndTime}
                      onChange={e => setScanEndTime(e.target.value)}
                      placeholder="End of video"
                    />
                  </div>
                </div>
                {videoRef.current?.duration && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px]"
                      onClick={() => {
                        if (!videoRef.current) return;
                        const t = videoRef.current.currentTime;
                        setScanStartTime(`${Math.floor(t / 60)}.${String(Math.floor(t % 60)).padStart(2, '0')}`);
                      }}
                    >
                      Set start to current position
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px]"
                      onClick={() => {
                        if (!videoRef.current) return;
                        const t = videoRef.current.currentTime;
                        setScanEndTime(`${Math.floor(t / 60)}.${String(Math.floor(t % 60)).padStart(2, '0')}`);
                      }}
                    >
                      Set end to current position
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold uppercase tracking-wider">4. Start AI Scan</h4>
                <p className="text-xs text-muted-foreground">
                  Sampling every {numericSampleInterval}s with duplicate suppression.
                </p>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Sample every</label>
                  <Input
                    value={sampleInterval}
                    onChange={(e) => setSampleInterval(e.target.value)}
                    className="w-16 h-7 text-xs"
                    inputMode="numeric"
                  />
                  <span className="text-xs text-muted-foreground">seconds</span>
                </div>
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
