import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PlayerCombobox } from "@/components/staff/PlayerCombobox";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";
import { toast } from "sonner";
import { Loader2, UserSearch, Pencil, Brain, CheckCircle2, Link2, PlayCircle, PauseCircle, RotateCcw } from "lucide-react";

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

interface BacktestRow {
  type: 'matched' | 'missed' | 'false_positive' | 'type_mismatch';
  expectedActionType?: string;
  expectedTimestamp?: number;
  expectedEndTimestamp?: number;
  actionDescription?: string;
  detectedActionType?: string;
  detectedTimestamp?: number;
  confidence?: string;
  description?: string;
  reason?: string;
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

interface FeedbackRow {
  action_type: string | null;
  feedback_type: string;
  reason: string | null;
  created_at: string;
  expected_timestamp?: number | string | null;
}

interface PlayerIdentityRow {
  identification_description?: string | null;
  identification_reference_image_url?: string | null;
  not_to_confuse_with?: string | null;
}

interface EdgeActionResult {
  frameIndex: number;
  actionType: string;
  confidence: string;
  description: string;
  clipBefore?: number;
  clipAfter?: number;
}

interface ScanProcessFrame {
  frameIndex: number;
  timestamp: number;
  grounding: string;
  roboflowEndpoint?: string;
  rawModelActions: string[];
  acceptedActions: string[];
  rejectedReasons: string[];
}

interface ScanProcessReport {
  startedAt: string;
  finishedAt?: string;
  mode: 'scan' | 'backtest';
  totalFrames: number;
  batches: number;
  sampleEverySeconds: number;
  playerName: string;
  allowedActionTypes: string[];
  frames: ScanProcessFrame[];
  summary: string[];
}

interface AiDetectionFeedbackInsert {
  player_id: string;
  video_analysis_id?: string | null;
  action_type: string | null;
  feedback_type: 'wrong_player' | 'wrong_action' | 'not_involved' | 'confirmed' | 'missed_detection' | 'timing_mismatch';
  reason: string | null;
  expected_timestamp?: number | null;
  detected_timestamp?: number | null;
  feedback_context?: Record<string, unknown>;
}

interface Props {
  videoUrl: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  onClipsAccepted: (clips: { start: number; end: number; label: string; actionType: string; description?: string; confidence?: string }[]) => void;
  opponent?: string | null;
  players?: PlayerOption[];
  selectedPlayerId?: string | null;
  videoAnalysisId?: string | null;
  existingClips?: { start: number; end: number; label: string; action_type: string; action_description?: string }[];
  rejectionHistory?: RejectionFeedback[];
  confirmedExamples?: ConfirmedExample[];
  onLinkPlayer?: (playerId: string) => Promise<void> | void;
}

// Persist player AI descriptions across videos
const STORAGE_KEY = "ai_player_descriptions";
const SAMPLE_EVERY_SECONDS = 2;
const MIN_CONFIDENCE: 'medium' | 'high' = 'medium';
const SCAN_STATE_PREFIX = "ai_action_spotter_scan_state::";

interface PersistedScanState {
  videoUrl: string;
  playerId: string;
  backtestMode: boolean;
  totalFrames: number;
  nextBatchStart: number; // index of next frame batch to process
  allDetected: DetectedAction[];
  savedAt: number;
}

function scanStateKey(videoUrl: string, playerId: string, mode: 'scan' | 'backtest') {
  return `${SCAN_STATE_PREFIX}${mode}::${playerId}::${videoUrl}`;
}
function readScanState(videoUrl: string, playerId: string, mode: 'scan' | 'backtest'): PersistedScanState | null {
  try {
    const raw = localStorage.getItem(scanStateKey(videoUrl, playerId, mode));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedScanState;
    // Expire after 7 days
    if (Date.now() - parsed.savedAt > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(scanStateKey(videoUrl, playerId, mode));
      return null;
    }
    return parsed;
  } catch { return null; }
}
function writeScanState(state: PersistedScanState, mode: 'scan' | 'backtest') {
  try {
    localStorage.setItem(scanStateKey(state.videoUrl, state.playerId, mode), JSON.stringify(state));
  } catch { /* quota — ignore */ }
}
function clearScanState(videoUrl: string, playerId: string, mode: 'scan' | 'backtest') {
  try { localStorage.removeItem(scanStateKey(videoUrl, playerId, mode)); } catch { /* ignore */ }
}

const feedbackClient = supabase as unknown as {
  from: (table: 'ai_detection_feedback') => {
    insert: (rows: AiDetectionFeedbackInsert | AiDetectionFeedbackInsert[]) => Promise<{ error: { message?: string } | null }>;
  };
};

function loadSavedDescriptions(): Record<string, { description: string; notPlayer: string; kitDescription: string }> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

export const AIPlayerDetection = ({ videoUrl, videoRef, onClipsAccepted, opponent, players, selectedPlayerId, videoAnalysisId, existingClips, rejectionHistory, confirmedExamples, onLinkPlayer }: Props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [playerDescription, setPlayerDescription] = useState("");
  const [notPlayer, setNotPlayer] = useState("");
  const [kitDescription, setKitDescription] = useState("");
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [descriptionEditable, setDescriptionEditable] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [selectedPlayerForScan, setSelectedPlayerForScan] = useState<string>(selectedPlayerId || "");
  const [pendingLinkPlayerId, setPendingLinkPlayerId] = useState<string>("");
  const [linkingPlayer, setLinkingPlayer] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualNotPlayer, setManualNotPlayer] = useState("");
  const [manualReferenceImageUrl, setManualReferenceImageUrl] = useState("");
  const [historicalConfirmedExamples, setHistoricalConfirmedExamples] = useState<ConfirmedExample[]>([]);
  const [globalCorpus, setGlobalCorpus] = useState<ConfirmedExample[]>([]);
  const [playerActionsTotal, setPlayerActionsTotal] = useState(0);
  const [globalActionsTotal, setGlobalActionsTotal] = useState(0);
  const [persistedRejections, setPersistedRejections] = useState<RejectionFeedback[]>([]);
  const [backtestMode, setBacktestMode] = useState(false);
  const [backtestResults, setBacktestResults] = useState<BacktestRow[] | null>(null);
  const [learningSavedCount, setLearningSavedCount] = useState(0);
  const [resumeState, setResumeState] = useState<PersistedScanState | null>(null);
  const [examplesLoaded, setExamplesLoaded] = useState(0);
  const [negativePatternsLoaded, setNegativePatternsLoaded] = useState(0);
  const [confusionsLoaded, setConfusionsLoaded] = useState(0);
  const [roboflowGrounded, setRoboflowGrounded] = useState(0);
  const [roboflowRejected, setRoboflowRejected] = useState(0);
  const [verifierDropped, setVerifierDropped] = useState(0);
  const [scanProcessReport, setScanProcessReport] = useState<ScanProcessReport | null>(null);
  const pauseRef = useRef(false);
  const cancelledRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanningRef = useRef(false);
  useEffect(() => { scanningRef.current = scanning; }, [scanning]);

  const handleLinkPlayer = async () => {
    if (!pendingLinkPlayerId) {
      toast.error("Pick a player first");
      return;
    }
    setLinkingPlayer(true);
    try {
      if (onLinkPlayer) {
        await onLinkPlayer(pendingLinkPlayerId);
      }
      setSelectedPlayerForScan(pendingLinkPlayerId);
      toast.success("Player linked to this analysis");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to link player");
    } finally {
      setLinkingPlayer(false);
    }
  };

  // Detect unfinished scans for the current player+video so we can offer Resume.
  useEffect(() => {
    if (!selectedPlayerForScan || !videoUrl) { setResumeState(null); return; }
    const mode: 'scan' | 'backtest' = backtestMode ? 'backtest' : 'scan';
    setResumeState(readScanState(videoUrl, selectedPlayerForScan, mode));
  }, [selectedPlayerForScan, videoUrl, backtestMode, scanning]);

  // If the user navigates away or hides the tab mid-scan, ask the loop to pause
  // gracefully so a reload or revisit can resume from where we left off.
  // Mount-only — depending on `scanning` would re-run cleanup on every toggle
  // and immediately cancel the loop we just started.
  useEffect(() => {
    const persistAndStop = () => {
      if (scanningRef.current) pauseRef.current = true;
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') persistAndStop();
    };
    window.addEventListener('beforeunload', persistAndStop);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', persistAndStop);
      document.removeEventListener('visibilitychange', onVisibility);
      cancelledRef.current = true; // real unmount only
    };
  }, []);

  // Pull a sample of confirmed action examples across the entire database — these
  // act as few-shot training context for Gemini so the AI learns from the full
  // RISE labelled-action corpus, not just this player's history.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Use a HEAD count first so we can show the user how much labelled history is feeding the AI.
        const { count } = await supabase
          .from('performance_report_actions')
          .select('id', { count: 'exact', head: true })
          .not('action_type', 'is', null);
        if (!cancelled) setGlobalActionsTotal(count || 0);

        const { data } = await supabase
          .from('performance_report_actions')
          .select('action_type, action_description, minute')
          .not('action_type', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1500);
        if (cancelled || !data) return;

        // Spread across action types so the AI sees variety, not 1500 of the same.
        const perType = new Map<string, ConfirmedExample[]>();
        for (const row of data) {
          const type = String(row.action_type);
          if (!perType.has(type)) perType.set(type, []);
          const bucket = perType.get(type)!;
          if (bucket.length < 12) {
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
        setGlobalActionsTotal(0);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setSelectedPlayerForScan(selectedPlayerId || "");
  }, [selectedPlayerId]);

  // When the linked player is available, load identity and previous learning.
  useEffect(() => {
    if (!selectedPlayerForScan || !players) return;
    const player = players.find(p => p.id === selectedPlayerForScan);
    if (!player) return;
    
    setPlayerName(player.name);

    // Pull persistent rejection feedback for this player so the AI learns across sessions.
    (async () => {
      const { data: fb } = await supabase
        .from('ai_detection_feedback')
        .select('action_type, feedback_type, reason, created_at, expected_timestamp, feedback_context')
        .eq('player_id', selectedPlayerForScan)
        .in('feedback_type', ['wrong_player', 'wrong_action', 'not_involved', 'missed_detection', 'timing_mismatch'])
        .order('created_at', { ascending: false })
        .limit(50);
      if (fb) {
        setPersistedRejections((fb as FeedbackRow[]).map((r) => ({
          actionType: r.action_type || 'unknown',
          reason: `${r.feedback_type}: ${r.reason || ''}${r.expected_timestamp != null ? ` at ${Math.floor(Number(r.expected_timestamp) / 60)}.${String(Math.floor(Number(r.expected_timestamp) % 60)).padStart(2, '0')}` : ''}`.trim(),
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
        .select('identification_description, identification_reference_image_url, identification_reference_images, not_to_confuse_with')
        .eq('id', selectedPlayerForScan)
        .maybeSingle();
      const identity = pdata as PlayerIdentityRow | null;
      const idDesc = identity?.identification_description;
      const idImgs: string[] = Array.isArray((identity as any)?.identification_reference_images)
        ? (identity as any).identification_reference_images
        : [];
      const idImg = idImgs[0] || identity?.identification_reference_image_url;
      const idNot = identity?.not_to_confuse_with;
      const saved = loadSavedDescriptions()[player.name.toLowerCase().trim()];
      setPlayerDescription(idDesc || saved?.description || "");
      setNotPlayer(idNot || saved?.notPlayer || "");
      setKitDescription(saved?.kitDescription || "");
      setDescriptionEditable(false);
      setReferenceImageUrl(idImg || "");
    })();
    
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
        setPlayerActionsTotal(0);
        return;
      }

      // Pull ALL the player's confirmed actions (not just clipped ones) tagged with action_type
      // so the AI gets the full per-player labelled history as context.
      const { data: actions, count } = await supabase
        .from('performance_report_actions')
        .select('action_type, action_description, minute', { count: 'exact' })
        .in('analysis_id', reports.map(r => r.id))
        .not('action_type', 'is', null)
        .limit(1000);

      setPlayerActionsTotal(count || (actions?.length ?? 0));

      if (!actions || actions.length === 0) {
        setHistoricalConfirmedExamples([]);
        return;
      }

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
      setPlayerActionsTotal(0);
    }
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

  const formatTime = (t?: number) => t == null ? '—' : `${Math.floor(t / 60)}.${String(Math.floor(t % 60)).padStart(2, '0')}`;

  const formatWindow = (row: BacktestRow) => {
    if (row.expectedTimestamp == null) return '—';
    if (row.expectedEndTimestamp == null || row.expectedEndTimestamp === row.expectedTimestamp) return formatTime(row.expectedTimestamp);
    return `${formatTime(row.expectedTimestamp)}-${formatTime(row.expectedEndTimestamp)}`;
  };

  const saveBacktestLearning = async (rows: BacktestRow[], detectedCount: number, totalFrames: number) => {
    if (!selectedPlayerForScan) return;
    // Save EVERY backtest outcome as learning so the AI improves on its own:
    //  - missed       → coach-confirmed positive the AI failed to find
    //  - type_mismatch→ right window, wrong action label
    //  - matched      → coach-confirmed positive the AI got right (anchor)
    //  - false_positive→ AI flagged a moment that has no confirmed clip
    const typeMap: Record<BacktestRow['type'], AiDetectionFeedbackInsert['feedback_type']> = {
      missed: 'missed_detection',
      type_mismatch: 'timing_mismatch',
      matched: 'confirmed',
      false_positive: 'not_involved',
    };
    const learningRows: AiDetectionFeedbackInsert[] = rows.map((row) => ({
      player_id: selectedPlayerForScan,
      video_analysis_id: videoAnalysisId || null,
      action_type: row.expectedActionType || row.detectedActionType || null,
      feedback_type: typeMap[row.type],
      reason: row.reason || null,
      expected_timestamp: row.expectedTimestamp ?? null,
      detected_timestamp: row.detectedTimestamp ?? null,
      feedback_context: {
        backtestOutcome: row.type,
        expectedEnd: row.expectedEndTimestamp ?? null,
        expectedAction: row.expectedActionType || null,
        detectedAction: row.detectedActionType || null,
        actionDescription: row.actionDescription || null,
        detectedDescription: row.description || null,
        framesSampled: totalFrames,
        detectionsReturned: detectedCount,
        sampleEverySeconds: SAMPLE_EVERY_SECONDS,
        minimumConfidence: MIN_CONFIDENCE,
      },
    }));

    if (learningRows.length === 0) {
      setLearningSavedCount(0);
      return;
    }

    const { error } = await feedbackClient.from('ai_detection_feedback').insert(learningRows);
    if (error) {
      console.error('Could not save backtest learning', error);
      toast.error('Backtest ran, but learning could not be saved');
      return;
    }

    setLearningSavedCount(learningRows.length);
    setPersistedRejections(prev => [
      ...learningRows.map((row) => ({
        actionType: String(row.action_type || 'unknown'),
        reason: `${row.feedback_type}: ${row.reason || ''}`,
        date: new Date().toISOString(),
      })),
      ...prev,
    ].slice(0, 50));
  };

  const startScan = async () => {
    const usingManual = manualMode && !selectedPlayerForScan;
    if (usingManual) {
      if (!manualName.trim() || !manualDescription.trim()) {
        toast.error("Manual scan needs a name and identification description");
        return;
      }
    } else if (!selectedPlayerForScan || !playerName.trim()) {
      toast.error("Link this analysis to a player first");
      return;
    }
    if (!videoRef.current || !videoRef.current.duration) {
      toast.error("Video not loaded");
      return;
    }

    setScanning(true);
    setScanProgress(0);
    setLearningSavedCount(0);
    setExamplesLoaded(0);
    setNegativePatternsLoaded(0);
    setConfusionsLoaded(0);
    setRoboflowGrounded(0);
    setRoboflowRejected(0);
    setVerifierDropped(0);
    pauseRef.current = false;
    cancelledRef.current = false;
    setPaused(false);

    const fullDuration = videoRef.current.duration;
    const clampedStart = 0;
    const clampedEnd = fullDuration;

    const sampleEvery = SAMPLE_EVERY_SECONDS;
    const segmentDuration = Math.max(0, clampedEnd - clampedStart);
    const totalFrames = Math.max(1, Math.floor(segmentDuration / sampleEvery) + 1);
    const batchSize = 15;

    const mergedConfirmedExamples = [
      ...(confirmedExamples || []),
      ...historicalConfirmedExamples,
      ...globalCorpus,
    ];
    const playerShortlist = Array.from(new Set([
      ...(confirmedExamples || []),
      ...historicalConfirmedExamples,
      ...(existingClips || []).map((clip) => ({ actionType: clip.action_type || clip.label })),
    ]
      .flatMap((ex) => String(ex.actionType || '').split(','))
      .map((type) => type.trim())
      .filter(Boolean)
    ));

    const mode: 'scan' | 'backtest' = backtestMode ? 'backtest' : 'scan';
    const scanIdentityKey = usingManual ? `manual::${manualName.trim().toLowerCase()}` : selectedPlayerForScan;
    const existing = readScanState(videoUrl, scanIdentityKey, mode);
    const allDetected: DetectedAction[] =
      existing && existing.totalFrames === totalFrames ? [...existing.allDetected] : [];
    const startBatchAt =
      existing && existing.totalFrames === totalFrames ? Math.max(0, existing.nextBatchStart) : 0;
    if (startBatchAt > 0) {
      setScanProgress(Math.round((startBatchAt / totalFrames) * 100));
      toast.info(`Resuming previous scan at ${Math.round((startBatchAt / totalFrames) * 100)}%`);
    }
    setResumeState(null);

    let hiddenVideo: HTMLVideoElement | null = null;
    try {
      hiddenVideo = await createHiddenVideo();
      hiddenVideoRef.current = hiddenVideo;

      for (let batchStart = startBatchAt; batchStart < totalFrames; batchStart += batchSize) {
        if (cancelledRef.current) break;
        if (pauseRef.current) {
          // Persist progress and stop the loop until the user resumes (which restarts startScan)
          writeScanState({
            videoUrl,
            playerId: scanIdentityKey,
            backtestMode,
            totalFrames,
            nextBatchStart: batchStart,
            allDetected,
            savedAt: Date.now(),
          }, mode);
          toast.info(`Paused at ${Math.round((batchStart / totalFrames) * 100)}%. Press Resume to continue.`);
          setResumeState(readScanState(videoUrl, scanIdentityKey, mode));
          if (hiddenVideo) {
            hiddenVideo.pause();
            hiddenVideo.src = "";
            hiddenVideo.remove();
            hiddenVideoRef.current = null;
          }
          setScanning(false);
          setPaused(false);
          return;
        }
        const batchEnd = Math.min(batchStart + batchSize, totalFrames);
        const frames: { dataUrl: string; timestamp: number; index: number }[] = [];

        for (let i = batchStart; i < batchEnd; i++) {
          const time = Math.min(clampedEnd, clampedStart + (i * sampleEvery));
          try {
            const dataUrl = await extractFrame(hiddenVideo, time);
            frames.push({ dataUrl, timestamp: time, index: i - batchStart });
          } catch {
            // Skip frames that fail
          }
          setScanProgress(Math.round(((i + 1) / totalFrames) * 100));
        }

        if (frames.length === 0) continue;

        const { data, error } = await invokeEdgeFunction('detect-player-actions', {
          body: {
            frames,
            videoAnalysisId: videoAnalysisId || null,
            playerId: usingManual ? null : selectedPlayerForScan,
            playerInfo: {
              name: usingManual ? manualName.trim() : playerName,
              description: usingManual
                ? manualDescription.trim()
                : ([playerDescription, kitDescription].filter(Boolean).join('. ') || undefined),
              notPlayer: usingManual ? (manualNotPlayer.trim() || undefined) : (notPlayer || undefined),
              position: usingManual ? undefined : (players?.find(p => p.id === selectedPlayerForScan) as any)?.position || undefined,
            },
            videoContext: {
              opponent: opponent || undefined,
            },
            referenceImageUrl: usingManual ? (manualReferenceImageUrl.trim() || undefined) : (referenceImageUrl || undefined),
            teamKitDescription: usingManual ? undefined : (kitDescription || undefined),
            minConfidence: MIN_CONFIDENCE,
            sampleEverySeconds: sampleEvery,
            allowedActionTypes: playerShortlist.length > 0 ? playerShortlist : undefined,
            confirmedExamples: mergedConfirmedExamples.length > 0 ? mergedConfirmedExamples : undefined,
          },
        });

        if (error) {
          console.error('AI detection error:', error);
          toast.error(`Batch ${Math.floor(batchStart / batchSize) + 1} failed: ${error.message}`);
          continue;
        }

        const d = data as any;
        if (typeof d?.examplesLoaded === 'number') setExamplesLoaded(d.examplesLoaded);
        if (typeof d?.negativeExamplesLoaded === 'number') setNegativePatternsLoaded(d.negativeExamplesLoaded);
        if (typeof d?.confusionsLoaded === 'number') setConfusionsLoaded(d.confusionsLoaded);
        if (typeof d?.roboflowGroundedFrames === 'number') setRoboflowGrounded((prev) => prev + d.roboflowGroundedFrames);
        if (typeof d?.roboflowRejected === 'number') setRoboflowRejected((prev) => prev + d.roboflowRejected);
        if (typeof d?.verifierDropped === 'number') setVerifierDropped((prev) => prev + d.verifierDropped);

        if (data?.actions) {
          const batchActions: DetectedAction[] = data.actions
            .map((a: EdgeActionResult) => {
              const matchedTimestamp = frames.find(f => f.index === a.frameIndex)?.timestamp;
              const fallbackTimestamp = clampedStart + ((batchStart + a.frameIndex) * sampleEvery);
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

        // Persist a checkpoint after every successful batch so a navigation/reload can resume.
        writeScanState({
          videoUrl,
          playerId: scanIdentityKey,
          backtestMode,
          totalFrames,
          nextBatchStart: batchEnd,
          allDetected,
          savedAt: Date.now(),
        }, mode);
      }
      // Completed cleanly — drop checkpoint
      clearScanState(videoUrl, scanIdentityKey, mode);

      const confidenceRank: Record<string, number> = { high: 2, medium: 1 };
      const contactSensitive = /(foul|fouled|penalty|red card|yellow card)/i;

      const qualityFiltered = allDetected.filter((action) => {
        const conf = action.confidence.toLowerCase();
        if (conf !== 'high' && conf !== 'medium') return false;
        if (contactSensitive.test(action.actionType) && conf !== 'high') return false;
        return true;
      });

      const sortedByTime = [...qualityFiltered].sort((a, b) => a.timestamp - b.timestamp);

      // If multiple distinct actions happen within the same <5s passage, fold them
      // into ONE entry whose actionType is a comma-separated list (e.g. "Interception, Pass").
      // Same action repeated within the window collapses to a single occurrence.
      const COMBINE_WINDOW = 5;
      const dedupedByWindow: DetectedAction[] = [];
      for (const action of sortedByTime) {
        const last = dedupedByWindow[dedupedByWindow.length - 1];
        if (!last || Math.abs(last.timestamp - action.timestamp) >= COMBINE_WINDOW) {
          dedupedByWindow.push({ ...action });
          continue;
        }
        const existingTypes = last.actionType.split(',').map(s => s.trim()).filter(Boolean);
        const incoming = action.actionType.trim();
        if (!existingTypes.some(t => t.toLowerCase() === incoming.toLowerCase())) {
          existingTypes.push(incoming);
          last.actionType = existingTypes.join(', ');
        }
        // Keep the higher-confidence rationale and widen the clip window if needed
        if ((confidenceRank[action.confidence.toLowerCase()] || 0) > (confidenceRank[last.confidence.toLowerCase()] || 0)) {
          last.confidence = action.confidence;
          last.description = action.description;
        }
        last.clipBefore = Math.max(last.clipBefore ?? 5, action.clipBefore ?? 5);
        last.clipAfter = Math.max(last.clipAfter ?? 5, action.clipAfter ?? 5);
      }

      if (dedupedByWindow.length === 0) {
        if (backtestMode) {
          // In backtest mode an empty detection set is still a result — every existing clip is a "miss".
          const rows: BacktestRow[] = (existingClips || []).map((clip) => ({
            type: 'missed',
            expectedActionType: clip.action_type || clip.label,
            expectedTimestamp: clip.start,
            expectedEndTimestamp: clip.end,
            actionDescription: clip.action_description,
            reason: `No AI detections came back from the scan. The known clip is ${clip.action_type || clip.label} from ${formatTime(clip.start)} to ${formatTime(clip.end)}, so this has been saved as a missed positive example for the next run.`,
          }));
          setBacktestResults(rows);
          await saveBacktestLearning(rows, 0, totalFrames);
          toast.info(`Backtest: 0 detected, ${rows.length} existing clips missed`);
        } else {
          toast.info("No actions detected for this player");
        }
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

        if (backtestMode) {
          const norm = (value?: string | null) => (value || '').toLowerCase().trim();
          const splitTypes = (value?: string | null) =>
            (value || '').split(',').map(s => norm(s)).filter(Boolean);
          const EDGE_TOL = 2;
          const expected = (existingClips || []).filter((c) => c.end >= clampedStart && c.start <= clampedEnd);
          const usedExpected = new Set<number>();
          const rows: BacktestRow[] = [];

          for (const det of dedupedByWindow) {
            let bestIdx = -1;
            let bestDistance = Infinity;
            let duplicateInsideMatchedClip = false;

            expected.forEach((exp, idx) => {
              const insideWindow = det.timestamp >= exp.start - EDGE_TOL && det.timestamp <= exp.end + EDGE_TOL;
              if (!insideWindow) return;
              if (usedExpected.has(idx)) {
                duplicateInsideMatchedClip = true;
                return;
              }
              const centre = exp.start + ((exp.end - exp.start) / 2);
              const distance = Math.abs(centre - det.timestamp);
              if (distance < bestDistance) {
                bestDistance = distance;
                bestIdx = idx;
              }
            });

            if (bestIdx >= 0) {
              const exp = expected[bestIdx];
              const expectedType = exp.action_type || exp.label;
              const detectedSet = splitTypes(det.actionType);
              const expectedSet = splitTypes(expectedType);
              // Right event if any expected sub-type is present in the detected combined types
              const sameType = expectedSet.length === 0
                ? norm(expectedType) === norm(det.actionType)
                : expectedSet.some(t => detectedSet.includes(t));
              usedExpected.add(bestIdx);
              rows.push({
                type: sameType ? 'matched' : 'type_mismatch',
                expectedActionType: expectedType,
                expectedTimestamp: exp.start,
                expectedEndTimestamp: exp.end,
                actionDescription: exp.action_description,
                detectedActionType: det.actionType,
                detectedTimestamp: det.timestamp,
                confidence: det.confidence,
                description: det.description,
                reason: sameType
                  ? `Detected inside the confirmed clip window (${formatTime(exp.start)}-${formatTime(exp.end)}).`
                  : `Found the right clip window, but called it ${det.actionType} instead of ${expectedType}. This has been saved as action-type learning.`,
              });
            } else if (duplicateInsideMatchedClip) {
              // Do not count repeat detections from the same confirmed passage as false positives.
              // They are duplicates of an already matched clip, not extra wrong events.
              continue;
            } else {
              rows.push({
                type: 'false_positive',
                detectedActionType: det.actionType,
                detectedTimestamp: det.timestamp,
                confidence: det.confidence,
                description: det.description,
                reason: 'AI flagged a moment outside every confirmed clip window.',
              });
            }
          }

          expected.forEach((exp, idx) => {
            if (usedExpected.has(idx)) return;
            rows.push({
              type: 'missed',
              expectedActionType: exp.action_type || exp.label,
              expectedTimestamp: exp.start,
              expectedEndTimestamp: exp.end,
              actionDescription: exp.action_description,
              reason: `No AI detection landed inside this confirmed clip window (${formatTime(exp.start)}-${formatTime(exp.end)}). This has been saved as a missed positive example for the next run.`,
            });
          });

          setBacktestResults(rows);
          await saveBacktestLearning(rows, dedupedByWindow.length, totalFrames);
          const matched = rows.filter((r) => r.type === 'matched').length;
          const missed = rows.filter((r) => r.type === 'missed').length;
          const mismatched = rows.filter((r) => r.type === 'type_mismatch').length;
          const fp = rows.filter((r) => r.type === 'false_positive').length;
          toast.success(`Backtest: ${matched} matched, ${missed} missed, ${mismatched} type mismatches, ${fp} false positives`);
        } else {
          onClipsAccepted(clips);
          toast.success(`${clips.length} potential actions added`);
          setDialogOpen(false);
        }
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Scan failed");
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
        <UserSearch className="h-3.5 w-3.5" /> RISE Action Spotter
      </Button>

      <canvas ref={canvasRef} className="hidden" width={640} height={360} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[90vw] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bebas uppercase tracking-wider text-primary">
              RISE Action Spotter
            </DialogTitle>
            <DialogDescription>
              Uses the linked analysis player, saved identity details and confirmed clips to scan the full video.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="rounded border border-border bg-muted/30 p-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Linked player</div>
                  <div className="text-base font-semibold text-foreground">{playerName || 'No player linked'}</div>
                  {opponent && <div className="text-xs text-muted-foreground">Opponent: {opponent}</div>}
                </div>
                <Badge variant={selectedPlayerForScan ? 'default' : 'destructive'}>
                  {selectedPlayerForScan ? 'Auto loaded' : 'Missing link'}
                </Badge>
              </div>

              {selectedPlayerForScan ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Identification description</div>
                    <Button type="button" variant="outline" size="sm" className="h-7 gap-1" onClick={() => setDescriptionEditable((v) => !v)}>
                      <Pencil className="h-3.5 w-3.5" /> {descriptionEditable ? 'Lock' : 'Edit'}
                    </Button>
                  </div>
                  {descriptionEditable ? (
                    <Textarea
                      value={playerDescription}
                      onChange={(e) => setPlayerDescription(e.target.value)}
                      placeholder="Add shirt number, hair, skin tone, build, boots and other identifying cues."
                      className="min-h-[90px]"
                    />
                  ) : (
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {playerDescription || 'No identification description saved in Player Management yet.'}
                    </p>
                  )}
                  {notPlayer && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Do not confuse with:</span> {notPlayer}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    No player linked to this analysis yet. Pick one below to link them — this will save against the analysis so the rest of the app sees the same link. Or scan an unlisted player without linking.
                  </p>
                  {!manualMode && players && players.length > 0 ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <PlayerCombobox
                        players={[...players].sort((a, b) => a.name.localeCompare(b.name)).map(p => ({
                          id: p.id, name: p.name, position: (p as any).position,
                        }))}
                        value={pendingLinkPlayerId || null}
                        onChange={setPendingLinkPlayerId}
                        placeholder="Type to search players..."
                        className="h-9 w-full sm:w-[320px]"
                        groupedByStatus={false}
                        showAvatar={false}
                      />
                      <Button type="button" size="sm" onClick={handleLinkPlayer} disabled={!pendingLinkPlayerId || linkingPlayer} className="gap-1">
                        {linkingPlayer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                        Link to analysis
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setManualMode(true)}>
                        Player not in list?
                      </Button>
                    </div>
                  ) : !manualMode ? (
                    <p className="text-xs text-muted-foreground">No players available to link.</p>
                  ) : null}
                  {manualMode && (
                    <div className="space-y-2 rounded border border-border bg-background/50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">Scan an unlisted player</div>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setManualMode(false)}>Back to list</Button>
                      </div>
                      <Input
                        placeholder="Player name (required)"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                      />
                      <Textarea
                        placeholder="Identification description (required) — shirt number, hair, skin tone, build, boots, anything that uniquely identifies them on screen."
                        value={manualDescription}
                        onChange={(e) => setManualDescription(e.target.value)}
                        className="min-h-[80px]"
                      />
                      <Input
                        placeholder="Do not confuse with — names and brief look of similar teammates"
                        value={manualNotPlayer}
                        onChange={(e) => setManualNotPlayer(e.target.value)}
                      />
                      <Input
                        placeholder="Reference image URL (optional but strongly recommended)"
                        value={manualReferenceImageUrl}
                        onChange={(e) => setManualReferenceImageUrl(e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Manual scans are not stored against any player record. Past corrections cannot be applied because there is no player to learn against.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded border border-border bg-muted/20 p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Brain className="h-4 w-4 text-primary" />
                Full video scan · sample every 2 seconds · Medium+ confidence · learning context loaded in the background
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {persistedRejections.length > 0 && (
                  <Badge variant="outline">{persistedRejections.length} stored corrections loaded</Badge>
                )}
                {playerActionsTotal > 0 && (
                  <Badge variant="outline">{playerActionsTotal} player actions loaded</Badge>
                )}
                {globalActionsTotal > 0 && (
                  <Badge variant="outline">{globalActionsTotal.toLocaleString()} total actions loaded</Badge>
                )}
                {examplesLoaded > 0 && (
                  <Badge variant="outline">{examplesLoaded} confirmed examples loaded</Badge>
                )}
                {negativePatternsLoaded > 0 && (
                  <Badge variant="outline">{negativePatternsLoaded} false-positive patterns loaded</Badge>
                )}
                {confusionsLoaded > 0 && (
                  <Badge variant="outline">{confusionsLoaded} action confusions loaded</Badge>
                )}
                {roboflowGrounded > 0 && (
                  <Badge variant="outline">{roboflowGrounded} frames object-grounded (Roboflow)</Badge>
                )}
                {roboflowRejected > 0 && (
                  <Badge variant="default">Roboflow rejected {roboflowRejected} ball-action without ball</Badge>
                )}
                {verifierDropped > 0 && (
                  <Badge variant="default">Verifier dropped {verifierDropped} wrong-player flags</Badge>
                )}
              </div>
            </div>

            {resumeState && !scanning && (
              <div className="rounded border border-primary/40 bg-primary/5 p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm text-foreground flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-primary" />
                  Previous {resumeState.backtestMode ? 'backtest' : 'scan'} paused at {Math.round((resumeState.nextBatchStart / Math.max(1, resumeState.totalFrames)) * 100)}% with {resumeState.allDetected.length} detection{resumeState.allDetected.length === 1 ? '' : 's'} held.
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="default" className="gap-1" onClick={() => { setBacktestMode(resumeState.backtestMode); startScan(); }}>
                    <PlayCircle className="h-3.5 w-3.5" /> Resume
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { clearScanState(videoUrl, selectedPlayerForScan, resumeState.backtestMode ? 'backtest' : 'scan'); setResumeState(null); }}>
                    Discard
                  </Button>
                </div>
              </div>
            )}

            {existingClips && existingClips.length > 0 && (
              <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer p-3 rounded border border-border bg-muted/30">
                <input
                  type="checkbox"
                  checked={backtestMode}
                  onChange={(e) => { setBacktestMode(e.target.checked); setBacktestResults(null); setLearningSavedCount(0); }}
                  className="mt-0.5"
                />
                <span>
                  <strong className="text-foreground">Backtest mode</strong> checks the scan against the {existingClips.length} confirmed clip{existingClips.length === 1 ? '' : 's'} already on this analysis and saves misses as learning for the next run.
                </span>
              </label>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={startScan}
                disabled={
                  scanning ||
                  (!(manualMode && manualName.trim() && manualDescription.trim()) &&
                    (!selectedPlayerForScan || !playerName.trim()))
                }
                className="gap-2"
              >
                {scanning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scanning... {scanProgress}%
                  </>
                ) : (
                  <>
                    <UserSearch className="h-4 w-4" />
                    {backtestMode ? 'Run Backtest' : 'Start Full Scan'}
                  </>
                )}
              </Button>
              {scanning && (
                <Button variant="outline" className="gap-1" onClick={() => { pauseRef.current = true; setPaused(true); }} disabled={paused}>
                  <PauseCircle className="h-4 w-4" /> {paused ? 'Pausing…' : 'Pause'}
                </Button>
              )}
            </div>

            {scanning && (
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            )}

            {backtestResults && (
              <div className="mt-3 space-y-2">
                {(() => {
                  const matched = backtestResults.filter((r) => r.type === 'matched').length;
                  const missed = backtestResults.filter((r) => r.type === 'missed').length;
                  const mismatched = backtestResults.filter((r) => r.type === 'type_mismatch').length;
                  const fp = backtestResults.filter((r) => r.type === 'false_positive').length;
                  const total = matched + missed + mismatched;
                  const recall = total > 0 ? Math.round((matched / total) * 100) : 0;
                  return (
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <Badge variant="default">Matched {matched}</Badge>
                      <Badge variant="destructive">Missed {missed}</Badge>
                      <Badge variant="secondary">Type mismatches {mismatched}</Badge>
                      <Badge variant="secondary">False positives {fp}</Badge>
                      <span className="text-muted-foreground">Recall: {recall}%</span>
                      {learningSavedCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-primary"><CheckCircle2 className="h-3.5 w-3.5" /> Saved {learningSavedCount} backtest outcome{learningSavedCount === 1 ? '' : 's'} as cross-video training</span>
                      )}
                    </div>
                  );
                })()}
                <div className="max-h-72 overflow-y-auto border border-border rounded divide-y divide-border">
                  {backtestResults.map((row, i) => {
                    const colour = row.type === 'matched' ? 'text-primary' : row.type === 'missed' ? 'text-destructive' : 'text-muted-foreground';
                    const logFeedback = async (feedback_type: 'wrong_player' | 'wrong_action' | 'not_involved' | 'confirmed') => {
                      if (!selectedPlayerForScan) {
                        toast.error('Link a player first to log feedback');
                        return;
                      }
                      const { error } = await feedbackClient.from('ai_detection_feedback').insert({
                        player_id: selectedPlayerForScan,
                        video_analysis_id: videoAnalysisId || null,
                        action_type: row.detectedActionType || row.expectedActionType || null,
                        feedback_type,
                        reason: row.description || row.reason || null,
                        expected_timestamp: row.expectedTimestamp ?? null,
                        detected_timestamp: row.detectedTimestamp ?? null,
                        feedback_context: {
                          expectedEnd: row.expectedEndTimestamp ?? null,
                          expectedAction: row.expectedActionType || null,
                          detectedAction: row.detectedActionType || null,
                          actionDescription: row.actionDescription || null,
                        },
                      });
                      if (error) toast.error('Could not save feedback');
                      else toast.success('Feedback saved');
                    };
                    return (
                      <div key={i} className="p-2 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-semibold uppercase tracking-wider ${colour}`}>{row.type.replace('_', ' ')}</span>
                          <span className="text-muted-foreground">
                            {row.type === 'missed' ? `expected ${formatWindow(row)}` : `detected ${formatTime(row.detectedTimestamp)}`}
                          </span>
                        </div>
                        <div className="text-foreground">
                          {row.type === 'missed'
                            ? `Expected: ${row.expectedActionType}`
                            : `${row.detectedActionType}${row.confidence ? ` (${row.confidence})` : ''}${row.expectedActionType && row.expectedActionType !== row.detectedActionType ? ` vs expected ${row.expectedActionType}` : ''}`}
                        </div>
                        {row.actionDescription && <div className="text-muted-foreground">Confirmed clip note: {row.actionDescription}</div>}
                        {row.description && <div className="text-muted-foreground italic">AI reason: {row.description}</div>}
                        <div className="text-muted-foreground">{row.reason}</div>
                        {row.type === 'false_positive' && (
                          <div className="flex gap-1 pt-1 flex-wrap">
                            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => logFeedback('wrong_player')}>Wrong player</Button>
                            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => logFeedback('wrong_action')}>Wrong action</Button>
                            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => logFeedback('not_involved')}>Not involved</Button>
                          </div>
                        )}
                        {row.type === 'matched' && (
                          <div className="flex gap-1 pt-1">
                            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => logFeedback('confirmed')}>Confirm correct</Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
