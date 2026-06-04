import { useState, useEffect, useRef, useMemo, useCallback, type SyntheticEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as tus from 'tus-js-client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Film, Plus, Play, Trash2, Loader2, Upload, MessageSquare, Scissors, Clock, X, ChevronLeft, ChevronsLeft, ChevronsRight, ArrowLeft, Download, Pencil, Link2, Paperclip, UserSearch, Check, HelpCircle, HardDriveDownload, RefreshCw, Maximize2, Minimize2, Square, CheckSquare, Eye, EyeOff, Search } from "lucide-react";
import { R90RatingsViewer } from "@/components/staff/R90RatingsViewer";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { format } from "date-fns";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AnnotationEditor } from "@/components/staff/annotations/AnnotationEditor";
import { ZonePitchSelector, type ZonePoint } from "@/components/report/ZonePitchSelector";
import { AnnotationCanvas } from "@/components/staff/annotations/AnnotationCanvas";
import type { AnnotationProject, Klip, AnnotationElement } from "@/components/staff/annotations/AnnotationProjects";
import { computeVisibleElements } from "@/lib/annotationRenderUtils";
import { sortPlayersByRepresentation, getStatusLabel, groupPlayersByStatus } from "@/lib/playerSorting";
import { toTitleCase } from "@/lib/titleCase";
import { AIPlayerDetection } from "./AIPlayerDetection";
import { RoboflowTracking } from "./RoboflowTracking";
import { AICommentaryClipper } from "./AICommentaryClipper";
import { fetchPlayerActionFrequencies } from "@/lib/playerActionFrequency";
import { playTick, playSuccess } from "@/lib/soundEffects";
import { startExportJob, subscribeToExportProgress, isExportRunning, getActiveExport, type ExportProgress } from "@/lib/backgroundExportService";

interface Annotation {
  id: string;
  timestamp: number;
  text: string;
  action_type: string;
}

interface Clip {
  id: string;
  start: number;
  end: number;
  label: string;
  action_type: string;
  action_description: string;
  notes: string;
  created_at: string;
  minute?: string;
  action_score?: number | null;
  zone_details?: { zone: number; sub?: number; direction?: "forward" | "backward" }[];
  ai_status?: 'pending' | 'accepted' | 'rejected';
  ai_reason?: string;
  ai_suggested_action?: string;
}

interface VideoAnalysisEntry {
  id: string;
  title: string;
  video_url: string;
  player_id: string | null;
  match_date: string | null;
  opponent: string | null;
  annotations: Annotation[];
  clips: Clip[];
  auto_delete_at: string | null;
  match_minute_offset: number;
  second_half_offset: number | null;
  second_half_video_time: number | null;
  created_at: string;
  part_number: number | null;
  group_id: string | null;
  total_parts: number | null;
}

const DEFAULT_ACTION_TYPES = [
  "Pressing", "Build-Up", "Transition", "Set-Piece", "Defensive", "Attacking",
  "Individual", "Dribble", "Pass", "Cross", "Shot", "Tackle", "Interception",
  "Header", "Save", "Clearance", "Foul", "Free-Kick", "Corner", "Throw-In",
  "Goal-Kick", "Penalty", "Offside", "Substitution", "Other"
];

const ACTION_COLOURS: Record<string, string> = {
  pressing: "bg-red-500/20 text-red-400 border-red-500/30",
  "build-up": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  transition: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "set-piece": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  defensive: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  attacking: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  individual: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};



interface VideoAnalysisProps {
  defaultPlayerId?: string;
}

const MAX_VIDEO_UPLOAD_BYTES = 50 * 1024 * 1024 * 1024;

const parseMatchTimeInputToSeconds = (value: string): number | null => {
  const raw = value.trim();
  if (!raw) return null;
  const match = raw.match(/^(\d+)(?:[.:](\d{1,2}))?$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = match[2] ? Number(match[2].padEnd(2, "0")) : 0;
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds > 59) return null;
  return minutes * 60 + seconds;
};

const formatClipMinuteFromSeconds = (seconds: number): string => {
  const matchSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  // Snap the entire match-time to the nearest 5s bucket, then split into
  // mm.ss. Using nearest-snap (rather than floor) prevents a systematic
  // bias where every clip rounded DOWN by up to ~4.99s, which compounded
  // to feel like timestamps were "a minute out" when the bucketed seconds
  // crossed a minute boundary (e.g. real 1:59 floored to 1.55 instead of 2.00).
  const totalSnapped = Math.round(matchSeconds / 5) * 5;
  const mins = Math.floor(totalSnapped / 60);
  const secs = totalSnapped % 60;
  return `${mins}.${secs.toString().padStart(2, '0')}`;
};

export const VideoAnalysis = ({ defaultPlayerId }: VideoAnalysisProps = {}) => {
  const [videos, setVideos] = useState<VideoAnalysisEntry[]>([]);
  const [players, setPlayers] = useState<{ id: string; name: string; position?: string | null; representation_status?: string | null; image_url?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoAnalysisEntry | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const playerShellRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hoverPreview, setHoverPreview] = useState<{ x: number; time: number } | null>(null);
  const [r90ViewerOpen, setR90ViewerOpen] = useState(false);
  const [r90ViewerSearch, setR90ViewerSearch] = useState<string | undefined>(undefined);

  // Upload form
  const [newTitle, setNewTitle] = useState("");
  const [newPlayerId, setNewPlayerId] = useState(defaultPlayerId || "");
  const [newOpponent, setNewOpponent] = useState("");
  const [newMatchDate, setNewMatchDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Annotation form
  const [annotationText, setAnnotationText] = useState("");
  const [annotationAction, setAnnotationAction] = useState("other");

  // Clip editing
  const [editingClipId, setEditingClipId] = useState<string | null>(null);

  // Timestamp override
  const [showTimestampOverride, setShowTimestampOverride] = useState(false);
  const [overrideMinute, setOverrideMinute] = useState("");

  // Known action types from existing reports
  const [knownActionTypes, setKnownActionTypes] = useState<string[]>([]);
  const [actionTypeFrequency, setActionTypeFrequency] = useState<Record<string, number>>({});
  const [historicalLearningExamples, setHistoricalLearningExamples] = useState<{ timestamp: number; actionType: string; description?: string }[]>([]);

  // Export to report or analysis
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportDestination, setExportDestination] = useState<"report" | "analysis">("report");
  const [availableReports, setAvailableReports] = useState<{ id: string; title: string; player_name: string }[]>([]);
  const [availableAnalyses, setAvailableAnalyses] = useState<{ id: string; title: string; analysis_type: string; points: any[] }[]>([]);
  const [selectedReportId, setSelectedReportId] = useState("");
  const [selectedAnalysisId, setSelectedAnalysisId] = useState("");
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [exportPlayerId, setExportPlayerId] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportClipProgress, setExportClipProgress] = useState<{ current: number; total: number; statuses: Record<string, "pending" | "done" | "skipped" | "error"> }>({ current: 0, total: 0, statuses: {} });
  const [selectedExportClipIds, setSelectedExportClipIds] = useState<Set<string>>(new Set());
  const [alreadyExportedClipIds, setAlreadyExportedClipIds] = useState<Set<string>>(new Set());

  // Half-time sync
  const [syncHalf, setSyncHalf] = useState<"1st" | "2nd">("1st");

  // Clip-to-report attachment
  const [showAttachDialog, setShowAttachDialog] = useState(false);
  const [attachClip, setAttachClip] = useState<Clip | null>(null);
  const [linkedReportIds, setLinkedReportIds] = useState<string[]>([]);
  const [linkedReportActions, setLinkedReportActions] = useState<{ id: string; action_number: number; action_type: string; action_description: string; report_title: string; analysis_id: string; minute?: number | null; video_url?: string | null }[]>([]);
  const [showActionsWithClips, setShowActionsWithClips] = useState(false);
  const [loadingAttachActions, setLoadingAttachActions] = useState(false);

  // Clip-to-analysis-point attachment (mirrors clip-to-report flow)
  const [linkedAnalysisIds, setLinkedAnalysisIds] = useState<string[]>([]);
  const [linkedAnalysisPoints, setLinkedAnalysisPoints] = useState<
    { analysisId: string; analysisTitle: string; analysisType: string; pointIndex: number; pointTitle: string; videoCount: number }[]
  >([]);

  // Clip saved toast
  const [clipSavedToast, setClipSavedToast] = useState(false);
  const clipSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [purging, setPurging] = useState(false);

  // Playback speed
  const SPEED_STEPS = [0.25, 0.5, 1, 2, 4];
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlayerFullscreen, setIsPlayerFullscreen] = useState(false);
  // Fullscreen quick-edit overlay: shows the most recent clip's action type /
  // score / notes / zone pinned to the top of the player so the analyst can
  // tag without leaving fullscreen. Toggled by the semi-invisible eye icon.
  const [showClipOverlay, setShowClipOverlay] = useState(false);
  // Refs for in-overlay hotkeys (a/s/n/Tab) while in fullscreen
  const overlayActionTypeBtnRef = useRef<HTMLButtonElement | null>(null);
  const overlayScoreInputRef = useRef<HTMLInputElement | null>(null);
  const overlayNotesInputRef = useRef<HTMLInputElement | null>(null);

  // 8x simulation: native 4x + RAF nudge to double effective speed
  const eightXRafRef = useRef<number | null>(null);
  const eightXLastRef = useRef<number>(0);

  const stopEightXSim = useCallback(() => {
    if (eightXRafRef.current !== null) {
      cancelAnimationFrame(eightXRafRef.current);
      eightXRafRef.current = null;
    }
  }, []);

  const applySpeed = useCallback((speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    stopEightXSim();
    if (speed === 8) {
      video.playbackRate = 4;
      eightXLastRef.current = performance.now();
      const tick = () => {
        if (!videoRef.current || video.paused || video.ended) {
          stopEightXSim();
          return;
        }
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        if (duration > 0 && video.currentTime >= duration - 0.08) {
          video.currentTime = Math.max(0, duration - 0.05);
          stopEightXSim();
          return;
        }
        const now = performance.now();
        const elapsed = (now - eightXLastRef.current) / 1000;
        eightXLastRef.current = now;
        // Native 4x already advances 4s per real second; nudge an extra 4s worth
        video.currentTime = duration > 0
          ? Math.min(duration - 0.05, video.currentTime + elapsed * 4)
          : video.currentTime + elapsed * 4;
        eightXRafRef.current = requestAnimationFrame(tick);
      };
      eightXRafRef.current = requestAnimationFrame(tick);
    } else {
      video.playbackRate = speed;
    }
  }, [stopEightXSim]);

  const stopVideoControlEvent = (event: SyntheticEvent) => {
    event.stopPropagation();
  };

  // Clean up 8x simulation on video change or unmount
  useEffect(() => {
    stopEightXSim();
    setPlaybackSpeed(1);
  }, [selectedVideo, stopEightXSim]);

  useEffect(() => () => stopEightXSim(), [stopEightXSim]);

  // Inline annotation
  const [annotatingClip, setAnnotatingClip] = useState<Clip | null>(null);
  const [annotationProject, setAnnotationProject] = useState<AnnotationProject | null>(null);

  // Clip playback annotation freeze system — time-driven, no setTimeout race conditions
  const [overlayElements, setOverlayElements] = useState<any[]>([]);
  const [overlayKlipStart, setOverlayKlipStart] = useState(0);
  const [overlayFreezeActive, setOverlayFreezeActive] = useState(false);
  const [overlayFreezePhase, setOverlayFreezePhase] = useState<'idle' | 'showing' | 'fading'>('idle');
  const overlayTriggeredRef = useRef<Set<number>>(new Set());
  const overlayFreezeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayFreezeDurationRef = useRef<number>(3);
  const overlayClipEndRef = useRef<number>(0);
  const [overlayCurrentTime, setOverlayCurrentTime] = useState(0);
  /** Absolute video time at which the current freeze should end */
  const overlayFreezeUntilRef = useRef<number>(0);

  useEffect(() => {
    fetchVideos();
    fetchPlayers();
    fetchKnownActionTypes();
  }, []);

  useEffect(() => {
    if (defaultPlayerId) {
      setNewPlayerId(defaultPlayerId);
      setExportPlayerId(defaultPlayerId);
    }
    fetchVideos();
  }, [defaultPlayerId]);

  // Re-fetch action types when selected video's player changes
  useEffect(() => {
    if (selectedVideo?.player_id) {
      fetchKnownActionTypes(selectedVideo.player_id);
    }
  }, [selectedVideo?.player_id]);

  const togglePlayerFullscreen = useCallback(async () => {
    const shell = playerShellRef.current;
    if (!shell) return;

    try {
      if (document.fullscreenElement === shell) {
        await document.exitFullscreen();
      } else {
        await shell.requestFullscreen();
      }
    } catch {
      // Ignore fullscreen API failures
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const shell = playerShellRef.current;
      const playerVideo = videoRef.current;
      const fullscreenElement = document.fullscreenElement;

      if (shell && playerVideo && fullscreenElement === playerVideo) {
        void shell.requestFullscreen().catch(() => {});
      }

      setIsPlayerFullscreen(document.fullscreenElement === shell);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (clipSavedTimerRef.current) clearTimeout(clipSavedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const loadHistoricalLearningExamples = async () => {
      const playerId = selectedVideo?.player_id;
      if (!playerId) {
        setHistoricalLearningExamples([]);
        return;
      }

      const { data: reports } = await supabase
        .from("player_analysis")
        .select("id")
        .eq("player_id", playerId)
        .order("analysis_date", { ascending: false });

      if (!reports || reports.length === 0) {
        setHistoricalLearningExamples([]);
        return;
      }

      const { data: actions } = await supabase
        .from("performance_report_actions")
        .select("action_type, action_description, minute")
        .in("analysis_id", reports.map((r) => r.id))
        .not("action_type", "is", null);

      if (!actions || actions.length === 0) {
        setHistoricalLearningExamples([]);
        return;
      }

      setHistoricalLearningExamples(actions.map((a) => ({
        timestamp: Number.isFinite(a.minute) ? Number(a.minute) * 60 : 0,
        actionType: String(a.action_type),
        description: a.action_description || undefined,
      })));
    };

    void loadHistoricalLearningExamples();
  }, [selectedVideo?.player_id]);

  const fetchVideos = async () => {
    // Only fetch metadata columns — exclude heavy annotations/clips JSON blobs
    let query = supabase
      .from("video_analyses")
      .select("id, title, video_url, player_id, match_date, opponent, auto_delete_at, created_at, match_minute_offset, second_half_offset, second_half_video_time, part_number, group_id, total_parts")
      .order("created_at", { ascending: false });

    // When embedded in Athlete Centre, only show videos for this player
    if (defaultPlayerId) {
      query = query.eq("player_id", defaultPlayerId);
    }

    const { data } = await query;

    if (data) {
      setVideos(data.map(v => ({
        ...v,
        annotations: [] as Annotation[],
        clips: [] as Clip[],
        match_minute_offset: Number(v.match_minute_offset) || 0,
        second_half_offset: v.second_half_offset != null ? Number(v.second_half_offset) : null,
        second_half_video_time: v.second_half_video_time != null ? Number(v.second_half_video_time) : null,
        part_number: (v as any).part_number ?? null,
        group_id: (v as any).group_id ?? null,
        total_parts: (v as any).total_parts ?? null,
      })));
    }
    setLoading(false);
  };

  /** Lazy-load annotations and clips for a single video when selected */
  const [detailLoading, setDetailLoading] = useState(false);
  const loadVideoDetail = async (videoId: string) => {
    setDetailLoading(true);
    try {
      const { data, error } = await supabase
        .from("video_analyses")
        .select("annotations, clips")
        .eq("id", videoId)
        .single();
      if (error) {
        console.error("Failed to load video detail:", error);
        toast.error("Failed to load video data");
        return;
      }
      if (data) {
        const annotations = (data.annotations as any as Annotation[]) || [];
        const clips = (data.clips as any as Clip[]) || [];
        const updater = (prev: VideoAnalysisEntry[]) =>
          prev.map(v => v.id === videoId ? { ...v, annotations, clips } : v);
        setVideos(updater);
        setSelectedVideo(prev => prev?.id === videoId ? { ...prev, annotations, clips } : prev);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchPlayers = async () => {
    const { data } = await supabase.from("players").select("id, name, position, representation_status, image_url").order("name");
    if (!data) return;
    // Stats updater scoping: only show assigned players
    let list: any[] = data;
    try {
      const uid = localStorage.getItem("staff_user_id") || sessionStorage.getItem("staff_user_id");
      if (uid) {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
        const rl = (roles || []).map((r: any) => r.role);
        if (rl.length > 0 && rl.every((r: string) => r === "stats_updater")) {
          const { data: assigns } = await (supabase as any)
            .from("staff_player_assignments").select("player_id")
            .eq("user_id", uid).eq("role_key", "stats_updater");
          const allowed = new Set(((assigns as any[]) || []).map((a: any) => a.player_id));
          list = list.filter((p) => allowed.has(p.id));
        }
      }
    } catch { /* ignore */ }
    setPlayers(sortPlayersByRepresentation(list));
  };

  const fetchKnownActionTypes = async (forPlayerId?: string | null) => {
    const pid = forPlayerId ?? selectedVideo?.player_id ?? (newPlayerId || null);
    const result = await fetchPlayerActionFrequencies(pid);
    setKnownActionTypes(result.sortedTypes);
    setActionTypeFrequency(result.frequencyMap);
  };

  const handleRefreshData = async () => {
    setLoading(true);
    await Promise.all([fetchVideos(), fetchPlayers(), fetchKnownActionTypes()]);
    setLoading(false);
    toast.success("Video analysis refreshed");
  };

  // Sort action types by frequency of use (most used first), then alphabetical
  // Normalise to Title Case to prevent duplicates like "1v1 defending" vs "1v1 Defending"
  const allActionTypes = useMemo(() => {
    const normalised = new Map<string, string>();
    [...DEFAULT_ACTION_TYPES, ...knownActionTypes].forEach(t => {
      const tc = toTitleCase(t);
      if (!normalised.has(tc.toLowerCase())) {
        normalised.set(tc.toLowerCase(), tc);
      }
    });
    const unique = [...normalised.values()];
    // Merge frequency counts for case variants
    const mergedFreq: Record<string, number> = {};
    unique.forEach(t => {
      const key = t.toLowerCase();
      mergedFreq[t] = Object.entries(actionTypeFrequency)
        .filter(([k]) => k.toLowerCase() === key)
        .reduce((sum, [, v]) => sum + v, 0);
    });
    return unique.sort((a, b) => {
      const freqA = mergedFreq[a] || 0;
      const freqB = mergedFreq[b] || 0;
      if (freqB !== freqA) return freqB - freqA;
      return a.localeCompare(b);
    });
  }, [knownActionTypes, actionTypeFrequency]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files).slice(0, 10);
    if (fileArray.length === 1) {
      setUploadFile(fileArray[0]);
      setUploadFiles([]);
    } else {
      setUploadFile(fileArray[0]);
      setUploadFiles(fileArray);
    }
  };

  const handleCreate = async () => {
    if (!newTitle || !uploadFile) return;

    const filesToUpload = uploadFiles.length > 1 ? uploadFiles : [uploadFile];
    const isMulti = filesToUpload.length > 1;

    // Validate all files
    for (const f of filesToUpload) {
      if (f.size > MAX_VIDEO_UPLOAD_BYTES) {
        toast.error(`${f.name} exceeds the 50GB upload limit`);
        return;
      }
    }

    setCreating(true);
    setUploadProgress(0);
    setUploadedBytes(0);

    const toastId = isMulti ? toast.loading(`Uploading 0/${filesToUpload.length} videos...`) : undefined;

    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;
      const token = session.session?.access_token;
      if (!token) throw new Error("Please sign in again before uploading");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      let lastEntry: VideoAnalysisEntry | null = null;

      for (let fi = 0; fi < filesToUpload.length; fi++) {
        const currentFile = filesToUpload[fi];
        const fileTitle = isMulti
          ? currentFile.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
          : newTitle;

        if (toastId) {
          toast.loading(`Uploading ${fi + 1}/${filesToUpload.length}: ${currentFile.name}`, { id: toastId });
        }

        // Normal TUS upload
        const ext = currentFile.name.split('.').pop();
        const filePath = `${crypto.randomUUID()}.${ext}`;

        const publicUrl = await new Promise<string>((resolve, reject) => {
          const upload = new tus.Upload(currentFile, {
            endpoint: `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              authorization: `Bearer ${token}`,
              'x-upsert': 'false',
            },
            uploadDataDuringCreation: false,
            removeFingerprintOnSuccess: true,
            metadata: {
              bucketName: 'analysis-videos',
              objectName: filePath,
              contentType: currentFile.type || 'video/mp4',
            },
            chunkSize: 6 * 1024 * 1024,
            onError: (error) => {
              reject(new Error(`Upload failed: ${error.message || 'network error. Check your connection and try again.'}`));
            },
            onProgress: (bytesUploaded, bytesTotal) => {
              setUploadedBytes(bytesUploaded);
              setUploadProgress(Math.round((bytesUploaded / bytesTotal) * 100));
            },
            onSuccess: () => {
              const { data: urlData } = supabase.storage
                .from('analysis-videos')
                .getPublicUrl(filePath);
              resolve(urlData.publicUrl);
            },
          });
          upload.start();
        });

        const insertData: any = {
          title: fileTitle,
          video_url: publicUrl,
          opponent: newOpponent || null,
          match_date: newMatchDate || null,
          created_by: userId || null,
          annotations: [],
          clips: [],
          auto_delete_at: null,
          match_minute_offset: 0,
        };
        if (newPlayerId && newPlayerId !== "none") insertData.player_id = newPlayerId;

        const { data, error } = await supabase
          .from("video_analyses")
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          const entry: VideoAnalysisEntry = { ...data, annotations: [] as Annotation[], clips: [] as Clip[], match_minute_offset: 0, second_half_offset: (data as any).second_half_offset ?? null, second_half_video_time: (data as any).second_half_video_time ?? null, part_number: null, group_id: null, total_parts: null };
          setVideos(prev => [entry, ...prev]);
          lastEntry = entry;
        }
      }

      // Done with all files
      if (lastEntry) setSelectedVideo(lastEntry);
      setShowUpload(false);
      setNewTitle("");
      setUploadFile(null);
      setUploadFiles([]);
      setNewPlayerId(defaultPlayerId || "");
      setNewOpponent("");
      setNewMatchDate("");
      setUploadProgress(0);
      setUploadedBytes(0);

      if (toastId) {
        toast.success(`${filesToUpload.length} videos uploaded successfully`, { id: toastId });
      } else {
        toast.success("Video uploaded successfully");
      }
    } catch (err: any) {
      if (err.message !== 'Cancelled') {
        toast.error(err.message || "Failed to upload video");
        if (toastId) toast.dismiss(toastId);
      }
    }
    setCreating(false);
  };

  const handleInstantClip = useCallback(async () => {
    if (!selectedVideo || !videoRef.current) return;

    const currentTime = videoRef.current.currentTime;
    const clipStart = Math.max(0, currentTime - 5);
    const clipEnd = Math.min(videoRef.current.duration || currentTime + 5, currentTime + 5);

    // Compute formatted minute for the clip
    const clipMinute = fmtClipMinute(currentTime, selectedVideo.match_minute_offset);

    const newClip: Clip = {
      id: crypto.randomUUID(),
      start: clipStart,
      end: clipEnd,
      label: `Clip ${fmtClipMinute(currentTime, selectedVideo.match_minute_offset)}`,
      action_type: "",
      action_description: "",
      notes: "",
      created_at: new Date().toISOString(),
      minute: clipMinute,
    };

    const updatedClips = [...selectedVideo.clips, newClip];
    await saveClips(updatedClips);

    // Show persistent clip saved toast (works in fullscreen too)
    if (clipSavedTimerRef.current) clearTimeout(clipSavedTimerRef.current);
    setClipSavedToast(true);
    clipSavedTimerRef.current = setTimeout(() => setClipSavedToast(false), 2500);
  }, [selectedVideo]);

  const handleExtendClip = async (clipId: string, side: 'start' | 'end', seconds: number) => {
    if (!selectedVideo) return;
    const updatedClips = selectedVideo.clips.map(c => {
      if (c.id !== clipId) return c;
      if (side === 'start') return { ...c, start: Math.max(0, c.start + seconds) };
      const maxDuration = videoRef.current?.duration || Infinity;
      return { ...c, end: Math.min(maxDuration, c.end + seconds) };
    });
    await saveClips(updatedClips);
  };

  const handleUpdateClipLabel = async (clipId: string, label: string) => {
    if (!selectedVideo) return;
    const updatedClips = selectedVideo.clips.map(c => c.id === clipId ? { ...c, label } : c);
    await saveClips(updatedClips);
    setEditingClipId(null);
  };

  const handleUpdateClipAction = async (clipId: string, action_type: string) => {
    if (!selectedVideo) return;
    const normalised = toTitleCase(action_type);
    const updatedClips = selectedVideo.clips.map(c => c.id === clipId ? { ...c, action_type: normalised } : c);
    await saveClips(updatedClips);
  };

  const handleUpdateClipZones = async (clipId: string, zone_details: Clip['zone_details']) => {
    if (!selectedVideo) return;
    const updatedClips = selectedVideo.clips.map(c => c.id === clipId ? { ...c, zone_details } : c);
    await saveClips(updatedClips);
  };

  const handleUpdateClipDescription = async (clipId: string, action_description: string) => {
    if (!selectedVideo) return;
    const updatedClips = selectedVideo.clips.map(c => c.id === clipId ? { ...c, action_description } : c);
    await saveClips(updatedClips);
  };

  const handleUpdateClipNotes = async (clipId: string, notes: string) => {
    if (!selectedVideo) return;
    const updatedClips = selectedVideo.clips.map(c => c.id === clipId ? { ...c, notes } : c);
    await saveClips(updatedClips);
  };

  const handleUpdateClipMinute = async (clipId: string, minute: string) => {
    if (!selectedVideo) return;
    const updatedClips = selectedVideo.clips.map(c => c.id === clipId ? { ...c, minute } : c);
    await saveClips(updatedClips);
  };

  const handleUpdateClipScore = async (clipId: string, action_score: number | null) => {
    if (!selectedVideo) return;
    const updatedClips = selectedVideo.clips.map(c => c.id === clipId ? { ...c, action_score } : c);
    await saveClips(updatedClips);
  };

  const saveClips = async (clips: Clip[]) => {
    if (!selectedVideo) return;
    const { error } = await supabase
      .from("video_analyses")
      .update({ clips: clips as any })
      .eq("id", selectedVideo.id);

    if (!error) {
      const updated = { ...selectedVideo, clips };
      setSelectedVideo(updated);
      setVideos(prev => prev.map(v => v.id === selectedVideo.id ? updated : v));
    }
  };

  const handleDeleteClip = async (clipId: string) => {
    if (!selectedVideo) return;
    await saveClips(selectedVideo.clips.filter(c => c.id !== clipId));
  };

  const handleAcceptAIClip = async (clipId: string) => {
    if (!selectedVideo) return;
    await saveClips(selectedVideo.clips.map(c => c.id === clipId ? { ...c, ai_status: 'accepted' as const } : c));
  };

  const [rejectingClipId, setRejectingClipId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const REJECTION_STORAGE_KEY = "ai_scan_rejections";

  const saveRejection = (actionType: string, reason: string) => {
    try {
      const existing = JSON.parse(localStorage.getItem(REJECTION_STORAGE_KEY) || '[]') as { actionType: string; reason: string; date: string }[];
      existing.push({ actionType, reason, date: new Date().toISOString() });
      // Keep last 50 rejections
      const trimmed = existing.slice(-50);
      localStorage.setItem(REJECTION_STORAGE_KEY, JSON.stringify(trimmed));
    } catch { /* ignore */ }
  };

  const handleRejectAIClip = async (clipId: string) => {
    setRejectingClipId(clipId);
    setRejectionReason("");
  };

  const confirmRejectAIClip = async () => {
    if (!selectedVideo || !rejectingClipId) return;
    const clip = selectedVideo.clips.find(c => c.id === rejectingClipId);
    if (clip && rejectionReason.trim()) {
      saveRejection(clip.ai_suggested_action || clip.action_type || 'Unknown', rejectionReason.trim());
    }
    await saveClips(selectedVideo.clips.filter(c => c.id !== rejectingClipId));
    setRejectingClipId(null);
    setRejectionReason("");
  };

  const handleAcceptAllAIClips = async () => {
    if (!selectedVideo) return;
    await saveClips(selectedVideo.clips.map(c => c.ai_status === 'pending' ? { ...c, ai_status: 'accepted' as const } : c));
  };

  const handleRejectAllAIClips = async () => {
    if (!selectedVideo) return;
    await saveClips(selectedVideo.clips.filter(c => c.ai_status !== 'pending'));
  };

  const handleDeleteAllClips = async () => {
    if (!selectedVideo) return;
    if (!confirm(`Delete all ${selectedVideo.clips.length} clips? This cannot be undone.`)) return;
    await saveClips([]);
    toast.success("All clips deleted");
  };

  const handleAddAnnotation = async () => {
    if (!selectedVideo || !videoRef.current || !annotationText) return;
    const timestamp = videoRef.current.currentTime;
    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      timestamp,
      text: annotationText,
      action_type: annotationAction,
    };
    const updated = [...selectedVideo.annotations, newAnnotation].sort((a, b) => a.timestamp - b.timestamp);
    const { error } = await supabase
      .from("video_analyses")
      .update({ annotations: updated as any })
      .eq("id", selectedVideo.id);
    if (!error) {
      const updatedVideo = { ...selectedVideo, annotations: updated };
      setSelectedVideo(updatedVideo);
      setVideos(prev => prev.map(v => v.id === selectedVideo.id ? updatedVideo : v));
      setAnnotationText("");
      toast.success(`Note at ${fmtMatchTime(timestamp, selectedVideo.match_minute_offset)}`);
    }
  };

  const handleDeleteAnnotation = async (annId: string) => {
    if (!selectedVideo) return;
    const updated = selectedVideo.annotations.filter(a => a.id !== annId);
    const { error } = await supabase
      .from("video_analyses")
      .update({ annotations: updated as any })
      .eq("id", selectedVideo.id);
    if (!error) {
      const updatedVideo = { ...selectedVideo, annotations: updated };
      setSelectedVideo(updatedVideo);
      setVideos(prev => prev.map(v => v.id === selectedVideo.id ? updatedVideo : v));
    }
  };

  const handleTimestampOverride = async () => {
    if (!selectedVideo || !videoRef.current || !overrideMinute) return;
    const currentVideoTime = videoRef.current.currentTime;
    const targetMatchSeconds = parseMatchTimeInputToSeconds(overrideMinute);
    if (targetMatchSeconds === null) {
      toast.error("Enter match time as mm.ss");
      return;
    }

    if (syncHalf === "2nd") {
      const newSecondHalfOffset = targetMatchSeconds - currentVideoTime;
      const newSecondHalfVideoTime = currentVideoTime;

      // Persist to DB
      const { error } = await supabase
        .from("video_analyses")
        .update({ second_half_offset: newSecondHalfOffset, second_half_video_time: newSecondHalfVideoTime })
        .eq("id", selectedVideo.id);

      if (error) {
        toast.error("Failed to save 2nd half sync");
        return;
      }

      // Retroactively adjust existing clips that fall in the second half
      const adjustedClips = selectedVideo.clips.map(clip => {
        // Determine if this clip is in the second half by its video start time
        if (clip.start >= newSecondHalfVideoTime) {
          // Recalculate minute using new second half offset instead of first half offset
          const newMinute = formatClipMinuteFromSeconds(clip.start + newSecondHalfOffset);
          return { ...clip, minute: newMinute, label: `Clip ${newMinute}` };
        }
        return clip;
      });

      // Save adjusted clips to DB
      await supabase
        .from("video_analyses")
        .update({ clips: adjustedClips as any })
        .eq("id", selectedVideo.id);

      const updated = {
        ...selectedVideo,
        second_half_offset: newSecondHalfOffset,
        second_half_video_time: newSecondHalfVideoTime,
        clips: adjustedClips,
      };
      setSelectedVideo(updated);
      setVideos(prev => prev.map(v => v.id === selectedVideo.id ? updated : v));
      setShowTimestampOverride(false);
      setOverrideMinute("");
      toast.success(`2nd half synced: this point is now ${overrideMinute}'. ${adjustedClips.filter((c, i) => c.minute !== selectedVideo.clips[i]?.minute).length} clip timestamps adjusted.`);
    } else {
      const newOffset = targetMatchSeconds - currentVideoTime;

      // Retroactively adjust existing clips that fall in the first half
      const adjustedClips = selectedVideo.clips.map(clip => {
        const isSecondHalf = selectedVideo.second_half_video_time !== null && clip.start >= selectedVideo.second_half_video_time;
        if (!isSecondHalf) {
          const newMinute = formatClipMinuteFromSeconds(clip.start + newOffset);
          return { ...clip, minute: newMinute, label: `Clip ${newMinute}` };
        }
        return clip;
      });

      const { error } = await supabase
        .from("video_analyses")
        .update({ match_minute_offset: newOffset, clips: adjustedClips as any })
        .eq("id", selectedVideo.id);

      if (!error) {
        const updated = { ...selectedVideo, match_minute_offset: newOffset, clips: adjustedClips };
        setSelectedVideo(updated);
        setVideos(prev => prev.map(v => v.id === selectedVideo.id ? updated : v));
        setShowTimestampOverride(false);
        setOverrideMinute("");
        const adjustedCount = adjustedClips.filter((c, i) => c.minute !== selectedVideo.clips[i]?.minute).length;
        toast.success(`1st half synced: this point is now ${overrideMinute}'.${adjustedCount > 0 ? ` ${adjustedCount} clip timestamps adjusted.` : ''}`);
      }
    }
  };

  const playClip = (clip: Clip) => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Load saved annotations for this clip
    let allEls: any[] = [];
    let klipStart = clip.start;
    try {
      const saved = JSON.parse(localStorage.getItem(`va_annotations_${clip.id}`) || 'null');
      if (saved?.klips?.[0]) {
        allEls = saved.klips[0].elements || [];
        klipStart = saved.klips[0].startTime ?? clip.start;
      }
    } catch {}

    // Reset freeze state
    overlayTriggeredRef.current.clear();
    if (overlayFreezeTimerRef.current) clearTimeout(overlayFreezeTimerRef.current);
    setOverlayFreezeActive(false);
    setOverlayFreezePhase('idle');
    overlayFreezeUntilRef.current = 0;
    setOverlayElements(allEls);
    setOverlayKlipStart(klipStart);
    overlayClipEndRef.current = clip.end;

    video.currentTime = clip.start;
    video.play();

    // End-check listener — guarded against interfering with active freeze
    const checkEnd = () => {
      if (!videoRef.current) return;
      // Don't stop during a freeze
      if (overlayFreezeActive) return;
      if (videoRef.current.currentTime >= clip.end) {
        videoRef.current.pause();
        videoRef.current.removeEventListener('timeupdate', checkEnd);
        setOverlayElements([]);
        setOverlayFreezeActive(false);
        setOverlayFreezePhase('idle');
      }
    };
    video.addEventListener('timeupdate', checkEnd);
  };

  // Effect A: Detect annotation timestamps during clip playback, pause video
  // Uses computeVisibleElements for consistency with export
  useEffect(() => {
    if (overlayElements.length === 0 || overlayFreezeActive) return;
    const video = videoRef.current;
    if (!video || video.paused) return;

    const offset = video.currentTime - overlayKlipStart;

    // Use the shared pure function
    const visible = computeVisibleElements(overlayElements as AnnotationElement[], offset, { forceOpacity: 1 });

    // Check for newly visible elements we haven't triggered yet
    const newVisible = visible.filter(el => {
      const roundedTime = Math.round(el.appearAt * 100) / 100;
      return !overlayTriggeredRef.current.has(roundedTime);
    });

    if (newVisible.length === 0) return;

    // Mark as triggered
    newVisible.forEach(el => {
      overlayTriggeredRef.current.add(Math.round(el.appearAt * 100) / 100);
    });

    // Calculate longest remaining duration among all visible
    const maxDuration = Math.max(
      ...visible.map(el => {
        const elDur = el.duration ?? 3;
        const elapsed = offset - el.appearAt;
        return Math.max(elDur - elapsed, 0.5);
      })
    );
    overlayFreezeDurationRef.current = maxDuration;

    // Set freeze-until as absolute video time
    overlayFreezeUntilRef.current = video.currentTime + maxDuration;

    // Pause video — the paused frame IS the background
    video.pause();
    setOverlayFreezeActive(true);
    setOverlayFreezePhase('showing');
  }, [overlayCurrentTime, overlayElements, overlayKlipStart, overlayFreezeActive]);

  // Effect B: Resume after freeze — time-driven with a single timer (no setTimeout chains)
  useEffect(() => {
    if (!overlayFreezeActive) return;

    const showDuration = overlayFreezeDurationRef.current * 1000;
    const fadeDuration = 400;

    const showTimer = setTimeout(() => {
      setOverlayFreezePhase('fading');

      const fadeTimer = setTimeout(() => {
        setOverlayFreezeActive(false);
        setOverlayFreezePhase('idle');
        overlayFreezeUntilRef.current = 0;
        const v = videoRef.current;
        if (v && v.currentTime < overlayClipEndRef.current) {
          v.play();
        }
      }, fadeDuration);

      overlayFreezeTimerRef.current = fadeTimer;
    }, showDuration);

    return () => {
      clearTimeout(showTimer);
      if (overlayFreezeTimerRef.current) clearTimeout(overlayFreezeTimerRef.current);
    };
  }, [overlayFreezeActive]);

  const handleDeleteVideo = async (id: string) => {
    const video = videos.find(v => v.id === id);

    // Before deleting, copy any clip URLs used in report actions to standalone storage
    // so they survive the video analysis deletion
    if (video) {
      try {
        // Find all report actions referencing clips from this video
        const { data: linkedActions } = await supabase
          .from("performance_report_actions")
          .select("id, video_url, video_analysis_id")
          .eq("video_analysis_id", id);

        if (linkedActions && linkedActions.length > 0) {
          // Clear the video_analysis_id link but keep the video_url (clip URL) intact
          await supabase
            .from("performance_report_actions")
            .update({ video_analysis_id: null })
            .eq("video_analysis_id", id);
        }
      } catch (err) {
        console.warn("Could not unlink clip references:", err);
      }
    }

    // Only delete the main uploaded video file, not individual clips
    if (video?.video_url?.includes('analysis-videos')) {
      const path = video.video_url.split('analysis-videos/')[1];
      if (path) await supabase.storage.from('analysis-videos').remove([path]);
    }
    const { error } = await supabase.from("video_analyses").delete().eq("id", id);
    if (!error) {
      setVideos(prev => prev.filter(v => v.id !== id));
      if (selectedVideo?.id === id) setSelectedVideo(null);
      toast.success("Deleted — clips attached to reports are preserved");
    }
  };

  const handlePurgeSource = async () => {
    if (!selectedVideo || !selectedVideo.video_url) return;
    setPurging(true);
    try {
      // Extract storage path from the video URL
      const urlParts = selectedVideo.video_url.split('analysis-videos/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        // Only delete the source file, not clips
        if (!filePath.startsWith('clips/')) {
          await supabase.storage.from('analysis-videos').remove([filePath]);
        }
      }

      // Clear video_url and auto_delete_at on the record
      const { error } = await supabase
        .from('video_analyses')
        .update({ video_url: '', auto_delete_at: null })
        .eq('id', selectedVideo.id);

      if (error) throw error;

      const updated = { ...selectedVideo, video_url: '', auto_delete_at: null };
      setSelectedVideo(updated);
      setVideos(prev => prev.map(v => v.id === selectedVideo.id ? updated : v));
      toast.success('Source video purged. Clips and annotations preserved.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to purge source video');
    }
    setPurging(false);
  };

  const jumpToTimestamp = (ts: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = ts;
      videoRef.current.play();
    }
  };

  // Export clips to a performance report
  const handleOpenExport = async () => {
    const contextPlayerId = defaultPlayerId || selectedVideo?.player_id || "";
    setExportPlayerId(contextPlayerId);
    setSelectedReportId("");
    setSelectedAnalysisId("");
    setSelectedPointIndex(null);
    setAvailableReports([]);
    setAvailableAnalyses([]);
    setExportDestination("report");
    setAlreadyExportedClipIds(new Set());
    // Pre-select all clips
    const allClipIds = new Set((selectedVideo?.clips || []).map(c => c.id));
    setSelectedExportClipIds(allClipIds);
    setShowExportDialog(true);

    if (contextPlayerId) {
      await handleExportPlayerChange(contextPlayerId, "report");
    }
  };

  /** When a report is selected, fetch which clip IDs are already on it */
  const handleReportSelect = async (reportId: string) => {
    setSelectedReportId(reportId);
    if (!reportId) {
      setAlreadyExportedClipIds(new Set());
      return;
    }
    const { data } = await supabase
      .from("performance_report_actions")
      .select("clip_id")
      .eq("analysis_id", reportId)
      .not("clip_id", "is", null);
    const existing = new Set((data || []).map(r => r.clip_id).filter(Boolean) as string[]);
    setAlreadyExportedClipIds(existing);
    // Deselect already-exported clips
    setSelectedExportClipIds(prev => {
      const next = new Set(prev);
      existing.forEach(id => next.delete(id));
      return next;
    });
  };

  const handleExportPlayerChange = async (
    playerId: string,
    destinationOverride?: "report" | "analysis"
  ) => {
    const destination = destinationOverride || exportDestination;
    setExportPlayerId(playerId);
    setSelectedReportId("");
    setSelectedAnalysisId("");
    setSelectedPointIndex(null);

    if (destination === "report") {
      const { data } = await supabase
        .from("player_analysis")
        .select("id, opponent, analysis_date")
        .eq("player_id", playerId)
        .order("analysis_date", { ascending: false })
        .limit(50);

      if (data) {
        setAvailableReports(data.map(d => ({
          id: d.id,
          title: d.opponent ? `vs ${d.opponent} (${d.analysis_date})` : `Report ${d.analysis_date}`,
          player_name: players.find(p => p.id === playerId)?.name || "Unknown",
        })));
      }
    } else {
      await fetchAnalysesForExport(playerId);
    }
  };

  const fetchAnalysesForExport = async (playerId?: string) => {
    let filteredAnalysisIds: string[] | null = null;

    if (playerId && playerId !== "all") {
      const [{ data: tagged }, { data: linkedReports }] = await Promise.all([
        supabase
          .from("analysis_player_tags")
          .select("analysis_id")
          .eq("player_id", playerId),
        supabase
          .from("player_analysis")
          .select("analysis_writer_id")
          .eq("player_id", playerId)
          .not("analysis_writer_id", "is", null),
      ]);

      const idSet = new Set<string>();
      (tagged || []).forEach((row: any) => {
        if (row.analysis_id) idSet.add(row.analysis_id);
      });
      (linkedReports || []).forEach((row: any) => {
        if (row.analysis_writer_id) idSet.add(row.analysis_writer_id);
      });

      filteredAnalysisIds = Array.from(idSet);
      if (filteredAnalysisIds.length === 0) {
        setAvailableAnalyses([]);
        return;
      }
    }

    let query = supabase
      .from("analyses")
      .select("id, title, analysis_type, points")
      .in("analysis_type", ["pre-match", "post-match"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (filteredAnalysisIds) {
      query = query.in("id", filteredAnalysisIds);
    }

    const { data } = await query;

    if (data) {
      setAvailableAnalyses(data.map(d => ({
        id: d.id,
        title: d.title || `${d.analysis_type} analysis`,
        analysis_type: d.analysis_type,
        points: (d.points as any[]) || [],
      })));
    }
  };

  const handleExportDestinationChange = async (dest: "report" | "analysis") => {
    setExportDestination(dest);
    setSelectedReportId("");
    setSelectedAnalysisId("");
    setSelectedPointIndex(null);
    setAvailableReports([]);
    setAvailableAnalyses([]);

    const contextPlayerId = defaultPlayerId || exportPlayerId || selectedVideo?.player_id || "";

    if (dest === "analysis") {
      await fetchAnalysesForExport(contextPlayerId || undefined);
    } else if (contextPlayerId) {
      // Re-fetch reports for the selected player
      await handleExportPlayerChange(contextPlayerId, "report");
    }
  };

  // Link video analysis to an analysis (mirrors handleLinkToReport pattern)
  const handleLinkToAnalysis = async () => {
    if (!selectedVideo || !selectedAnalysisId) return;
    setExporting(true);
    try {
      const { data: analysis } = await supabase
        .from("analyses")
        .select("linked_video_analysis_ids")
        .eq("id", selectedAnalysisId)
        .single();

      const existing = (analysis?.linked_video_analysis_ids || []) as string[];
      if (!existing.includes(selectedVideo.id)) {
        const { error } = await supabase
          .from("analyses")
          .update({ linked_video_analysis_ids: [...existing, selectedVideo.id] })
          .eq("id", selectedAnalysisId);
        if (error) throw error;
      }

      toast.success(`Video analysis linked. Clips are now available for selection when editing points.`);
      fetchLinkedAnalyses();
      setShowExportDialog(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to link to analysis");
    }
    setExporting(false);
  };

  // Link clips to a report (makes them available for selection, doesn't add as actions)
  const handleLinkToReport = async () => {
    if (!selectedVideo || !selectedReportId) return;
    setExporting(true);
    try {
      // Get current linked IDs
      const { data: report } = await supabase
        .from("player_analysis")
        .select("linked_video_analysis_ids")
        .eq("id", selectedReportId)
        .single();

      const existing = (report?.linked_video_analysis_ids || []) as string[];
      if (!existing.includes(selectedVideo.id)) {
        const { error } = await supabase
          .from("player_analysis")
          .update({ linked_video_analysis_ids: [...existing, selectedVideo.id] })
          .eq("id", selectedReportId);
        if (error) throw error;
      }

      toast.success(`Clips linked to report. They'll be available for selection when editing.`);
      setShowExportDialog(false);
      // Refresh linked report IDs so export buttons appear immediately
      fetchLinkedReports();
    } catch (err: any) {
      toast.error(err.message || "Failed to link clips");
    }
    setExporting(false);
  };

  // Helper: extract clip as independent trimmed file using client-side canvas+MediaRecorder
  const extractClipFile = async (sourceUrl: string, clipId: string, start: number, end: number): Promise<string> => {
    const { trimAndUploadClip } = await import("@/lib/clientClipExtractor");
    return trimAndUploadClip(sourceUrl, clipId, start, end);
  };

  // Helper: read localStorage annotations for a clip
  const getClipAnnotations = (clipId: string): any[] | null => {
    try {
      const saved = JSON.parse(localStorage.getItem(`va_annotations_${clipId}`) || 'null');
      if (saved?.klips?.[0]?.elements?.length > 0) {
        return saved.klips[0].elements;
      }
    } catch {}
    return null;
  };

  const handleExportToReport = async () => {
    if (!selectedVideo || !selectedReportId) return;
    if (isExportRunning()) {
      toast.error("An export is already in progress");
      return;
    }

    // Only export selected clips that aren't already on the report
    const clips = (selectedVideo.clips || []).filter(
      c => selectedExportClipIds.has(c.id) && !alreadyExportedClipIds.has(c.id)
    );
    if (clips.length === 0) {
      toast.info("No new clips to export");
      return;
    }

    // Initialise progress UI immediately
    const statuses: Record<string, "pending" | "done" | "skipped" | "error"> = {};
    clips.forEach(c => { statuses[c.id] = "pending"; });
    setExportClipProgress({ current: 0, total: clips.length, statuses: { ...statuses } });
    setExporting(true);

    // Fire and forget — the background service will complete even if we navigate away
    startExportJob({
      id: `${selectedVideo.id}_${Date.now()}`,
      videoId: selectedVideo.id,
      videoUrl: selectedVideo.video_url,
      reportId: selectedReportId,
      clips: clips.map(c => ({
        id: c.id,
        start: c.start,
        end: c.end,
        action_type: c.action_type,
        action_description: c.action_description,
        notes: c.notes,
        action_score: c.action_score,
        zone_details: c.zone_details,
        minute: c.minute || fmtClipMinute(c.start, selectedVideo.match_minute_offset),
      })),
      matchMinuteOffset: selectedVideo.match_minute_offset,
      secondHalfOffset: selectedVideo.second_half_offset,
      secondHalfVideoTime: selectedVideo.second_half_video_time,
      getClipAnnotations,
    });

    // Close the dialog
    setShowExportDialog(false);
    setSelectedReportId("");
  };

  // Subscribe to background export progress
  useEffect(() => {
    const unsub = subscribeToExportProgress((progress) => {
      setExportClipProgress({
        current: progress.current,
        total: progress.total,
        statuses: progress.statuses,
      });
      if (progress.finished) {
        setExporting(false);
        setExportClipProgress({ current: 0, total: 0, statuses: {} });
      }
    });
    // Restore active export state on mount
    const active = getActiveExport();
    if (active && !active.finished) {
      setExporting(true);
      setExportClipProgress({
        current: active.current,
        total: active.total,
        statuses: active.statuses,
      });
    }
    return unsub;
  }, []);

  const toDotTime = (seconds: number) => {
    const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    const mins = Math.floor(safe / 60);
    const secs = Math.floor(safe % 60);
    return `${mins}.${secs.toString().padStart(2, '0')}`;
  };

  const fmtTime = (s: number) => {
    return toDotTime(s);
  };

  // Get the effective offset for a given video time, accounting for half-time
  const getEffectiveOffset = (videoSeconds: number) => {
    if (!selectedVideo) return 0;
    if (selectedVideo.second_half_video_time !== null && selectedVideo.second_half_offset !== null && videoSeconds >= selectedVideo.second_half_video_time) {
      return selectedVideo.second_half_offset;
    }
    return selectedVideo.match_minute_offset;
  };

  const fmtMatchTime = (videoSeconds: number, _offset: number) => {
    const offset = getEffectiveOffset(videoSeconds);
    return toDotTime(videoSeconds + offset);
  };

  /** Format minute for clip display with seconds rounded down to nearest 5 */
  const fmtClipMinute = (videoSeconds: number, _offset: number) => {
    const offset = getEffectiveOffset(videoSeconds);
    const matchSeconds = Math.max(0, (Number.isFinite(videoSeconds) ? videoSeconds : 0) + offset);
    // Nearest-5 snap (see formatClipMinuteFromSeconds for rationale).
    const totalSnapped = Math.round(matchSeconds / 5) * 5;
    const mins = Math.floor(totalSnapped / 60);
    const secs = totalSnapped % 60;
    return `${mins}.${secs.toString().padStart(2, '0')}`;
  };

  const getMatchMinute = (videoSeconds: number, _offset: number) => {
    const offset = getEffectiveOffset(videoSeconds);
    const matchSeconds = Math.max(0, videoSeconds + offset);
    const snapped = Math.floor(matchSeconds / 5) * 5;
    return Math.floor(snapped / 60);
  };

  /** Parse clip minute string "mm:ss" to a numeric minute for report insertion */
  const parseClipMinuteToNumber = (minuteStr?: string): number | null => {
    if (!minuteStr) return null;
    const parts = minuteStr.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) || 0;
    }
    return parseInt(minuteStr) || null;
  };

  const daysUntilExpiry = (dateStr: string | null) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  // Clips sorted newest first for display
  const clipsNewestFirst = selectedVideo
    ? [...selectedVideo.clips].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [];

  // Esc key: close video workspace only (not the parent section)
  useEffect(() => {
    if (!selectedVideo) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedVideo(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [selectedVideo]);

  // Hotkeys: arrow keys for seeking, period/Delete for clip, +/- for speed
  useEffect(() => {
    if (!selectedVideo) return;
    const handleHotkey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      // Allow hotkeys even from video element (for fullscreen support)
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const video = videoRef.current;
      if (!video) return;

      const isClipHotkey = e.key === '.' || e.key === '>' || e.code === 'Period' || e.code === 'NumpadDecimal';

      if (e.key === 'ArrowRight' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        video.currentTime = Math.min(video.duration, video.currentTime + 10);
      } else if (e.key === 'ArrowLeft' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        video.currentTime = Math.max(0, video.currentTime - 10);
      } else if (e.key === 'Shift') {
        e.preventDefault();
        e.stopPropagation();
        video.currentTime = Math.min(video.duration, video.currentTime + 30);
      } else if (e.key === 'Delete' || isClipHotkey) {
        e.preventDefault();
        e.stopPropagation();
        handleInstantClip();
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        e.stopPropagation();
        setPlaybackSpeed(prev => {
          const idx = SPEED_STEPS.indexOf(prev);
          const next = idx < SPEED_STEPS.length - 1 ? SPEED_STEPS[idx + 1] : prev;
          applySpeed(next);
          return next;
        });
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        e.stopPropagation();
        setPlaybackSpeed(prev => {
          const idx = SPEED_STEPS.indexOf(prev);
          const next = idx > 0 ? SPEED_STEPS[idx - 1] : prev;
          applySpeed(next);
          return next;
        });
      } else if (e.key === '0') {
        e.preventDefault();
        e.stopPropagation();
        setPlaybackSpeed(1);
        applySpeed(1);
      } else if (showClipOverlay && (e.key === 'a' || e.key === 'A')) {
        if (overlayActionTypeBtnRef.current) {
          e.preventDefault();
          e.stopPropagation();
          overlayActionTypeBtnRef.current.click();
        }
      } else if (showClipOverlay && (e.key === 's' || e.key === 'S')) {
        if (overlayScoreInputRef.current) {
          e.preventDefault();
          e.stopPropagation();
          overlayScoreInputRef.current.focus();
          overlayScoreInputRef.current.select();
        }
      } else if (showClipOverlay && (e.key === 'n' || e.key === 'N')) {
        if (overlayNotesInputRef.current) {
          e.preventDefault();
          e.stopPropagation();
          overlayNotesInputRef.current.focus();
        }
      } else if (showClipOverlay && e.key === 'Tab') {
        // Cycle action type → score → notes when none focused
        const active = document.activeElement as HTMLElement | null;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        e.stopPropagation();
        overlayActionTypeBtnRef.current?.click();
      }
    };
    // Use capture phase so our handler fires before the browser's native video handlers
    window.addEventListener('keydown', handleHotkey, true);
    return () => window.removeEventListener('keydown', handleHotkey, true);
  }, [selectedVideo, handleInstantClip, showClipOverlay]);

  // Fetch linked report IDs for clip-to-report attachment
  const fetchLinkedReports = useCallback(async () => {
    if (!selectedVideo) return;
    const { data } = await supabase
      .from("player_analysis")
      .select("id, linked_video_analysis_ids")
      .contains("linked_video_analysis_ids", [selectedVideo.id]);
    if (data && data.length > 0) {
      setLinkedReportIds(data.map(d => d.id));
    } else {
      setLinkedReportIds([]);
    }
  }, [selectedVideo]);

  useEffect(() => {
    fetchLinkedReports();
  }, [fetchLinkedReports]);

  // Fetch linked analysis IDs (pre-match / post-match / concept) so the
  // attach dialog can also offer analysis points as a destination — same
  // experience as the report linking flow.
  const fetchLinkedAnalyses = useCallback(async () => {
    if (!selectedVideo) return;
    const { data } = await supabase
      .from("analyses")
      .select("id, linked_video_analysis_ids")
      .contains("linked_video_analysis_ids", [selectedVideo.id]);
    if (data && data.length > 0) {
      setLinkedAnalysisIds(data.map((d: any) => d.id));
    } else {
      setLinkedAnalysisIds([]);
    }
  }, [selectedVideo]);

  useEffect(() => {
    fetchLinkedAnalyses();
  }, [fetchLinkedAnalyses]);

  const handleOpenAttachClip = async (clip: Clip) => {
    setAttachClip(clip);
    setShowAttachDialog(true);
    setLoadingAttachActions(true);
    try {
      if (linkedReportIds.length === 0) {
        setLinkedReportActions([]);
      } else {
        const { data: reports } = await supabase
          .from("player_analysis")
          .select("id, opponent, analysis_date")
          .in("id", linkedReportIds);
        const { data: actions } = await supabase
          .from("performance_report_actions")
          .select("id, action_number, action_type, action_description, analysis_id, minute, video_url")
          .in("analysis_id", linkedReportIds)
          .order("action_number");
        if (actions && reports) {
          setLinkedReportActions(actions.map(a => ({
            id: a.id,
            action_number: a.action_number,
            action_type: a.action_type || '',
            action_description: a.action_description || '',
            analysis_id: a.analysis_id,
            minute: a.minute,
            video_url: a.video_url,
            report_title: reports.find(r => r.id === a.analysis_id)?.opponent
              ? `vs ${reports.find(r => r.id === a.analysis_id)!.opponent}`
              : `Report ${reports.find(r => r.id === a.analysis_id)?.analysis_date || ''}`,
          })));
        }
      }

      // Also load points from any linked analyses so the user can pick a
      // point as the destination — exactly mirroring the report flow.
      if (linkedAnalysisIds.length === 0) {
        setLinkedAnalysisPoints([]);
      } else {
        const { data: analyses } = await supabase
          .from("analyses")
          .select("id, title, analysis_type, points")
          .in("id", linkedAnalysisIds);
        if (analyses) {
          const flat: typeof linkedAnalysisPoints = [];
          for (const a of analyses as any[]) {
            const points: any[] = Array.isArray(a.points) ? a.points : [];
            points.forEach((p, idx) => {
              const vids = (p.video_urls && Array.isArray(p.video_urls))
                ? p.video_urls.length
                : (p.video_url ? 1 : 0);
              flat.push({
                analysisId: a.id,
                analysisTitle: a.title || `${a.analysis_type} analysis`,
                analysisType: a.analysis_type || '',
                pointIndex: idx,
                pointTitle: p.title || `Point ${idx + 1}`,
                videoCount: vids,
              });
            });
          }
          setLinkedAnalysisPoints(flat);
        }
      }
    } catch (err) {
      console.error('Error fetching actions:', err);
    }
    setLoadingAttachActions(false);
  };

  // Attach a clip to an analysis point. Trims the clip to a standalone
  // file (so the point never plays back the full match recording) and
  // pushes its URL into the point's video_urls array.
  const handleAttachClipToAnalysisPoint = async (analysisId: string, pointIndex: number) => {
    if (!attachClip || !selectedVideo) return;
    setShowAttachDialog(false);
    const clipRef = attachClip;
    const videoRef2 = selectedVideo;
    setAttachClip(null);

    const toastId = toast.loading("Extracting and attaching clip...", { duration: Infinity });
    try {
      let clipUrl: string;
      try {
        clipUrl = await extractClipFile(videoRef2.video_url, clipRef.id, clipRef.start, clipRef.end);
      } catch (err) {
        console.error("Clip extraction failed for analysis point:", err);
        throw new Error("Clip could not be trimmed — try again.");
      }

      const { data: analysis, error: fetchErr } = await supabase
        .from("analyses")
        .select("points")
        .eq("id", analysisId)
        .single();
      if (fetchErr) throw fetchErr;

      const points: any[] = Array.isArray(analysis?.points) ? [...(analysis!.points as any[])] : [];
      if (!points[pointIndex]) throw new Error("Point no longer exists");

      const point = { ...points[pointIndex] };
      const existing = point.video_urls
        ? [...point.video_urls]
        : (point.video_url ? [point.video_url] : []);
      point.video_urls = [...existing, clipUrl];
      delete point.video_url;
      points[pointIndex] = point;

      const { error: updateErr } = await supabase
        .from("analyses")
        .update({ points })
        .eq("id", analysisId);
      if (updateErr) throw updateErr;

      toast.success("Clip attached to analysis point", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Failed to attach clip to analysis point", { id: toastId });
    }
  };

  // Unlink the current video analysis from a target (report or analysis).
  const handleUnlinkFromReport = async (reportId: string) => {
    if (!selectedVideo) return;
    try {
      const { data: report } = await supabase
        .from("player_analysis")
        .select("linked_video_analysis_ids")
        .eq("id", reportId)
        .single();
      const next = ((report?.linked_video_analysis_ids || []) as string[]).filter(id => id !== selectedVideo.id);
      const { error } = await supabase
        .from("player_analysis")
        .update({ linked_video_analysis_ids: next })
        .eq("id", reportId);
      if (error) throw error;
      toast.success("Unlinked from report");
      fetchLinkedReports();
    } catch (err: any) {
      toast.error(err.message || "Failed to unlink");
    }
  };

  const handleUnlinkFromAnalysis = async (analysisId: string) => {
    if (!selectedVideo) return;
    try {
      const { data: analysis } = await supabase
        .from("analyses")
        .select("linked_video_analysis_ids")
        .eq("id", analysisId)
        .single();
      const next = ((analysis?.linked_video_analysis_ids || []) as string[]).filter(id => id !== selectedVideo.id);
      const { error } = await supabase
        .from("analyses")
        .update({ linked_video_analysis_ids: next })
        .eq("id", analysisId);
      if (error) throw error;
      toast.success("Unlinked from analysis");
      fetchLinkedAnalyses();
    } catch (err: any) {
      toast.error(err.message || "Failed to unlink");
    }
  };

  const handleAttachClipToAction = async (actionId: string) => {
    if (!attachClip || !selectedVideo) return;
    // Close dialog immediately so user can continue working
    setShowAttachDialog(false);
    const clipRef = attachClip;
    const videoRef2 = selectedVideo;
    setAttachClip(null);
    
    const toastId = toast.loading("Extracting and attaching clip...", { duration: Infinity });
    try {
      let clipUrl: string;
      try {
        clipUrl = await extractClipFile(videoRef2.video_url, clipRef.id, clipRef.start, clipRef.end);
        toast.loading("Uploading clip...", { id: toastId });
      } catch (err) {
        console.error('Clip extraction failed, using fragment URL:', err);
        clipUrl = `${videoRef2.video_url}#t=${clipRef.start},${clipRef.end}`;
      }
      
      const annotations = getClipAnnotations(clipRef.id);
      const updateData: any = { video_url: clipUrl };
      if (annotations) updateData.clip_annotations = annotations;

      const { error } = await supabase
        .from("performance_report_actions")
        .update(updateData)
        .eq("id", actionId);
      if (error) throw error;
      toast.success("Clip attached to action", { id: toastId, duration: 15000 });
    } catch (err: any) {
      toast.error(err.message || "Failed to attach clip", { id: toastId });
    }
  };

  const handleInsertNewActionWithClip = async (insertAfterNumber: number, reportAnalysisId: string) => {
    if (!attachClip || !selectedVideo) return;
    // Close dialog immediately so user can continue working
    setShowAttachDialog(false);
    const clipRef = attachClip;
    const videoRef2 = selectedVideo;
    setAttachClip(null);
    
    const toastId = toast.loading("Creating action with clip...", { duration: Infinity });
    try {
      // Shift existing actions that come after the insert position
      const { data: actionsToShift } = await supabase
        .from("performance_report_actions")
        .select("id, action_number")
        .eq("analysis_id", reportAnalysisId)
        .gt("action_number", insertAfterNumber)
        .order("action_number", { ascending: false });

      if (actionsToShift) {
        for (const a of actionsToShift) {
          await supabase
            .from("performance_report_actions")
            .update({ action_number: a.action_number + 1 })
            .eq("id", a.id);
        }
      }

      let clipUrl: string;
      try {
        toast.loading("Extracting clip...", { id: toastId });
        clipUrl = await extractClipFile(videoRef2.video_url, clipRef.id, clipRef.start, clipRef.end);
        toast.loading("Uploading clip...", { id: toastId });
      } catch (err) {
        console.error('Clip extraction failed, using fragment URL:', err);
        clipUrl = `${videoRef2.video_url}#t=${clipRef.start},${clipRef.end}`;
      }
      
      const annotations = getClipAnnotations(clipRef.id);
      const insertData: any = {
        analysis_id: reportAnalysisId,
        action_number: insertAfterNumber + 1,
        action_type: clipRef.action_type ? toTitleCase(clipRef.action_type) : "",
        action_description: clipRef.action_description || "",
        notes: clipRef.notes || null,
        video_url: clipUrl,
        is_successful: true,
        minute: parseClipMinuteToNumber(clipRef.minute) ?? getMatchMinute(clipRef.start, videoRef2.match_minute_offset),
      };
      if (clipRef.action_score != null) insertData.action_score = clipRef.action_score;
      if (annotations) insertData.clip_annotations = annotations;
      if (clipRef.zone_details?.length) {
        insertData.zone_details = clipRef.zone_details;
        insertData.zone = clipRef.zone_details[0].zone;
      }

      const { error } = await supabase
        .from("performance_report_actions")
        .insert(insertData);

      if (error) throw error;
      toast.success("New action created with clip attached", { id: toastId, duration: 15000 });
    } catch (err: any) {
      toast.error(err.message || "Failed to create action", { id: toastId });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  // ── Selected video: full-width takeover ──
  if (selectedVideo) {
    return (
      <div className="space-y-1">
        {/* Header: back + title + sync/export */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedVideo(null)} className="h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="font-medium text-sm truncate">{selectedVideo.title}</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" title="Rename" onClick={() => {
                const newName = prompt("Rename video analysis:", selectedVideo.title);
                if (newName && newName.trim() && newName.trim() !== selectedVideo.title) {
                  supabase.from('video_analyses').update({ title: newName.trim() }).eq('id', selectedVideo.id).then(({ error }) => {
                    if (error) { toast.error('Failed to rename'); return; }
                    toast.success('Renamed');
                    const updated = { ...selectedVideo, title: newName.trim() };
                    setSelectedVideo(updated);
                    setVideos(prev => prev.map(v => v.id === selectedVideo.id ? updated : v));
                  });
                }
              }}>
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedVideo.opponent && `vs ${selectedVideo.opponent}`}
              {selectedVideo.match_date && ` · ${format(new Date(selectedVideo.match_date), "dd MMM yyyy")}`}
              {selectedVideo.clips.length > 0 && ` · ${selectedVideo.clips.length} clips`}
            </p>
            {/* Multi-part navigation */}
            {selectedVideo.group_id && selectedVideo.total_parts && selectedVideo.total_parts > 1 && (
              <div className="flex items-center gap-2 mt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-xs"
                  disabled={selectedVideo.part_number === 1}
                  onClick={() => {
                    const prevPart = videos.find(v => v.group_id === selectedVideo.group_id && v.part_number === (selectedVideo.part_number || 1) - 1);
                    if (prevPart) setSelectedVideo(prevPart);
                  }}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="text-xs font-medium">Part {selectedVideo.part_number} of {selectedVideo.total_parts}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-xs"
                  disabled={selectedVideo.part_number === selectedVideo.total_parts}
                  onClick={() => {
                    const nextPart = videos.find(v => v.group_id === selectedVideo.group_id && v.part_number === (selectedVideo.part_number || 1) + 1);
                    if (nextPart) setSelectedVideo(nextPart);
                  }}
                >
                  <ChevronsRight className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => setShowTimestampOverride(!showTimestampOverride)}
              variant="outline"
              size="sm"
              className="gap-1"
            >
              <Clock className="h-3.5 w-3.5" /> Sync
            </Button>
            {selectedVideo.clips.length > 0 && (
              <Button onClick={handleOpenExport} variant="outline" size="sm" className="gap-1">
                <Link2 className="h-3.5 w-3.5" /> Link / Export
              </Button>
            )}
            {selectedVideo.video_url && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive">
                    <HardDriveDownload className="h-3.5 w-3.5" /> Purge Source
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-lg">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Purge source video?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes the full match video file from storage. All clips, annotations and report links will be preserved. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePurgeSource} disabled={purging} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {purging ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Purging...</> : 'Purge Source Video'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {selectedVideo.video_url && (
              <AIPlayerDetection
                videoUrl={selectedVideo.video_url}
                videoRef={videoRef as React.RefObject<HTMLVideoElement>}
                opponent={selectedVideo.opponent}
                players={players.map(p => ({ id: p.id, name: p.name, position: p.position || undefined }))}
                selectedPlayerId={selectedVideo.player_id}
                videoAnalysisId={selectedVideo.id}
                onLinkPlayer={async (playerId) => {
                  if (!selectedVideo) return;
                  const { error } = await supabase
                    .from('video_analyses')
                    .update({ player_id: playerId })
                    .eq('id', selectedVideo.id);
                  if (error) throw new Error(error.message);
                  const updated = { ...selectedVideo, player_id: playerId };
                  setSelectedVideo(updated);
                  setVideos(prev => prev.map(v => v.id === selectedVideo.id ? updated : v));
                }}
                existingClips={selectedVideo.clips.map(c => ({ start: c.start, end: c.end, label: c.label, action_type: c.action_type, action_description: c.action_description }))}
                onClipsAccepted={async (newClips) => {
                  if (!selectedVideo) return;
                  const clips: Clip[] = newClips.map(c => ({
                    id: crypto.randomUUID(),
                    start: c.start,
                    end: c.end,
                    label: c.label,
                    action_type: '',
                    action_description: '',
                    notes: '',
                    created_at: new Date().toISOString(),
                    minute: toDotTime(c.start),
                    ai_status: 'pending' as const,
                    ai_reason: c.description || '',
                    ai_suggested_action: c.actionType || '',
                  }));
                  await saveClips([...selectedVideo.clips, ...clips]);
                }}
                rejectionHistory={(() => {
                  try {
                    return JSON.parse(localStorage.getItem('ai_scan_rejections') || '[]');
                  } catch { return []; }
                })()}
                confirmedExamples={[
                  ...historicalLearningExamples,
                  ...selectedVideo.clips
                    .filter(c => c.action_type)
                    .map(c => ({
                      timestamp: c.start,
                      actionType: c.action_type,
                      description: c.action_description || c.label || undefined,
                    })),
                ]}
              />
            )}
            {selectedVideo.video_url && (
              <RoboflowTracking
                videoRef={videoRef as React.RefObject<HTMLVideoElement>}
                videoUrl={selectedVideo.video_url}
              />
            )}
            {selectedVideo.video_url && selectedVideo.player_id && (() => {
              const player = players.find(p => p.id === selectedVideo.player_id);
              return player ? (
                <AICommentaryClipper
                  videoUrl={selectedVideo.video_url}
                  playerName={player.name}
                  onClipsAccepted={async (newClips) => {
                    if (!selectedVideo) return;
                    const clips: Clip[] = newClips.map(c => ({
                      id: crypto.randomUUID(),
                      start: c.start,
                      end: c.end,
                      label: c.label,
                      action_type: '',
                      action_description: '',
                      notes: '',
                      created_at: new Date().toISOString(),
                      minute: toDotTime(c.start),
                    }));
                    await saveClips([...selectedVideo.clips, ...clips]);
                  }}
                />
              ) : null;
            })()}
          </div>
        </div>

        {/* Sync panel - ABOVE the video */}
        {showTimestampOverride && (
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border text-sm">
            <div className="flex rounded-md border overflow-hidden shrink-0">
              <button
                onClick={() => setSyncHalf("1st")}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${syncHalf === "1st" ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"}`}
              >1st Half</button>
              <button
                onClick={() => setSyncHalf("2nd")}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${syncHalf === "2nd" ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"}`}
              >2nd Half</button>
            </div>
            <span className="text-muted-foreground whitespace-nowrap text-xs">This point =</span>
            <Input
              type="number"
              placeholder={syncHalf === "2nd" ? "e.g. 45" : "e.g. 0"}
              value={overrideMinute}
              onChange={e => setOverrideMinute(e.target.value)}
              className="w-20 h-7 text-xs"
            />
            <span className="text-muted-foreground text-xs">'</span>
            <Button onClick={handleTimestampOverride} size="sm" className="h-7 text-xs" disabled={!overrideMinute}>Apply</Button>
            <span className="text-[10px] text-muted-foreground flex-1">
              {syncHalf === "2nd"
                ? "Sets where 2nd half begins. Clips after this use 2nd half offset."
                : "Sets 1st half offset. Clips before 2nd half marker use this."}
            </span>
          </div>
        )}

        {/* Widescreen video player with overlaid clip button */}
         {selectedVideo.video_url ? (
          <div
            ref={playerShellRef}
            className="relative w-full bg-black rounded-lg overflow-hidden group/player"
            onWheel={(e) => {
              if ((e.target as HTMLElement).closest('[data-video-control="true"]')) return;
              e.preventDefault();
              const video = videoRef.current;
              if (!video) return;
              if (e.deltaY < 0) {
                // Scroll up = faster
                setPlaybackSpeed(prev => {
                  const idx = SPEED_STEPS.indexOf(prev);
                  const next = idx < SPEED_STEPS.length - 1 ? SPEED_STEPS[idx + 1] : prev;
                  applySpeed(next);
                  return next;
                });
              } else if (e.deltaY > 0) {
                // Scroll down = slower
                setPlaybackSpeed(prev => {
                  const idx = SPEED_STEPS.indexOf(prev);
                  const next = idx > 0 ? SPEED_STEPS[idx - 1] : prev;
                  applySpeed(next);
                  return next;
                });
              }
            }}
          >
            <Button
              type="button"
              size="sm"
              variant="secondary"
              data-video-control="true"
              onPointerDown={stopVideoControlEvent}
              onMouseDown={stopVideoControlEvent}
              onTouchStart={stopVideoControlEvent}
              onClick={(e) => { e.stopPropagation(); togglePlayerFullscreen(); }}
              className="absolute top-3 right-3 z-40 h-8 gap-1.5"
            >
              {isPlayerFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              {isPlayerFullscreen ? "Exit full screen" : "Full screen"}
            </Button>
            {/* Semi-invisible quick-tag overlay toggle (sits left of Full screen). */}
            <button
              type="button"
              data-video-control="true"
              onPointerDown={stopVideoControlEvent}
              onMouseDown={stopVideoControlEvent}
              onTouchStart={stopVideoControlEvent}
              onClick={(e) => { e.stopPropagation(); setShowClipOverlay(v => !v); }}
              className="absolute top-3 left-3 z-40 h-8 w-8 inline-flex items-center justify-center rounded-md text-white/30 hover:text-white/90 hover:bg-black/40 transition-colors"
              title={showClipOverlay ? "Hide quick-tag overlay" : "Show quick-tag overlay"}
              aria-label={showClipOverlay ? "Hide quick-tag overlay" : "Show quick-tag overlay"}
            >
              {showClipOverlay ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            {/* Quick-tag overlay: most recent clip's editable fields pinned to top */}
            {showClipOverlay && clipsNewestFirst.length > 0 && (() => {
              const latest = clipsNewestFirst[0];
              return (
                <div
                  data-video-control="true"
                  onPointerDown={stopVideoControlEvent}
                  onMouseDown={stopVideoControlEvent}
                  onTouchStart={stopVideoControlEvent}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-28 left-3 right-3 z-40 bg-black/70 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 shadow-lg"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wider text-white/50 shrink-0">Latest clip</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); playClip(latest); }}
                      className="font-mono text-xs text-white/90 hover:text-primary hover:underline shrink-0"
                      title="Return to the start of this clip"
                    >
                      {latest.minute || fmtClipMinute(latest.start, selectedVideo.match_minute_offset)}
                    </button>
                    <div className="min-w-[160px]">
                      <ActionTypeCombobox
                        value={latest.action_type}
                        onChange={(v) => handleUpdateClipAction(latest.id, v)}
                        actionTypes={allActionTypes}
                        compact
                        overlayMode
                        triggerRef={overlayActionTypeBtnRef}
                        portalContainer={isPlayerFullscreen ? playerShellRef.current : null}
                        onKeyDown={(e) => {
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            e.stopPropagation();
                            overlayScoreInputRef.current?.focus();
                            overlayScoreInputRef.current?.select();
                          }
                        }}
                      />
                    </div>
                    <ZonePitchSelector
                      value={(latest.zone_details || []) as ZonePoint[]}
                      onChange={(zd) => handleUpdateClipZones(latest.id, zd as Clip['zone_details'])}
                      actionType={latest.action_type}
                      compact
                    />
                    <Input
                      ref={overlayScoreInputRef}
                      key={`${latest.id}-score`}
                      placeholder="Score"
                      type="text"
                      inputMode="decimal"
                      defaultValue={latest.action_score != null ? latest.action_score : "0.0"}
                      onBlur={e => {
                        const v = e.target.value;
                        let parsed: number | null = null;
                        if (v !== "") {
                          const n = Number(v.replace(/-/g, ""));
                          if (!Number.isNaN(n)) {
                            parsed = v.includes("-") ? -Math.abs(n) : n;
                          }
                        }
                        if (parsed !== (latest.action_score ?? null)) {
                          handleUpdateClipScore(latest.id, parsed);
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          e.stopPropagation();
                          (e.currentTarget as HTMLInputElement).blur();
                          overlayNotesInputRef.current?.focus();
                        } else {
                          // Stop all other keys from reaching the global hotkey listener
                          e.stopPropagation();
                        }
                      }}
                      className="h-7 text-xs w-[90px] bg-black/40 border-white/20 text-white"
                    />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title="Search R90 database"
                        onClick={() => { setR90ViewerSearch(latest.action_type || ""); setR90ViewerOpen(true); }}
                        className="h-7 w-7 text-white hover:bg-white/10"
                      >
                        <Search className="h-3.5 w-3.5" />
                      </Button>
                    <Input
                      ref={overlayNotesInputRef}
                      key={`${latest.id}-notes`}
                      placeholder="Coach's note…"
                      defaultValue={latest.notes || ""}
                      onBlur={e => {
                        if (e.target.value !== (latest.notes || "")) {
                          handleUpdateClipNotes(latest.id, e.target.value);
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          e.stopPropagation();
                          (e.currentTarget as HTMLInputElement).blur();
                        } else {
                          // Stop other keys from reaching global hotkeys while typing
                          e.stopPropagation();
                        }
                      }}
                      className="h-7 text-xs flex-1 min-w-[120px] bg-black/40 border-white/20 text-white"
                    />
                  </div>
                </div>
              );
            })()}
            <video
              ref={videoRef}
              key={selectedVideo.id}
              src={selectedVideo.video_url}
              crossOrigin="anonymous"
              controls
              controlsList="nodownload nofullscreen"
              preload="auto"
              className="w-full aspect-video object-fill"
              onKeyDown={(e) => {
                // Prevent native video controls from intercepting our hotkeys in fullscreen
                const key = e.key;
                if (['-', '_', '=', '+', '0', 'Delete', 'ArrowLeft', 'ArrowRight', 'Shift', '.', '>'].includes(key) || e.code === 'Period' || e.code === 'NumpadDecimal') {
                  e.stopPropagation();
                }
              }}
              onTimeUpdate={() => {
                if (overlayElements.length > 0) {
                  setOverlayCurrentTime(videoRef.current?.currentTime ?? 0);
                }
              }}
            />
            {/* Click anywhere on the video frame to toggle play/pause.
                Sits above the video but leaves the bottom 50px clear so the native
                controls and the hover-preview strip remain interactive. */}
            <div
              className="absolute inset-x-0 top-0 z-20 cursor-pointer"
              style={{ bottom: '50px' }}
              onClick={() => {
                const v = videoRef.current;
                if (!v) return;
                if (v.paused) v.play().catch(() => {});
                else v.pause();
              }}
            />
            {/* Hover preview thumbnail strip — sits just above the native controls */}
            <div
              className="absolute left-0 right-0 z-30 cursor-pointer"
              style={{ bottom: '36px', height: '14px' }}
              onMouseMove={(e) => {
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                const x = e.clientX - rect.left;
                const ratio = Math.max(0, Math.min(1, x / rect.width));
                const duration = videoRef.current?.duration || 0;
                if (!duration) return;
                const time = ratio * duration;
                setHoverPreview({ x, time });
              }}
              onMouseLeave={() => setHoverPreview(null)}
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                const v = videoRef.current;
                if (v && v.duration) v.currentTime = ratio * v.duration;
              }}
            />
            {hoverPreview && (
              <div
                className="absolute z-40 pointer-events-none rounded-md overflow-hidden border border-white/20 bg-black/80 shadow-lg"
                style={{
                  left: `${Math.max(8, Math.min(hoverPreview.x - 80, (videoRef.current?.parentElement?.clientWidth || 0) - 168))}px`,
                  bottom: '60px',
                  width: '160px',
                }}
              >
                <div className="flex h-16 items-center justify-center text-xs text-white/80">
                  Preview disabled for stability
                </div>
                <div className="text-[10px] text-white text-center py-0.5 font-mono border-t border-white/10">
                  {(() => {
                    const t = hoverPreview.time;
                    const m = Math.floor(t / 60);
                    const s = Math.floor(t % 60);
                    return `${m}:${String(s).padStart(2, '0')}`;
                  })()}
                </div>
              </div>
            )}
            {/* Video stays visible but paused — no separate freeze frame image needed */}
            {/* Annotation canvas overlay during freeze */}
            {overlayFreezeActive && (() => {
              const offset = (videoRef.current?.currentTime ?? 0) - overlayKlipStart;
              // Use the shared pure function for consistency with export
              const computed = computeVisibleElements(overlayElements as AnnotationElement[], offset, { forceOpacity: 1 });
              if (computed.length === 0) return null;
              // Map computed results back to shape AnnotationCanvas expects
              const visible = computed.map(el => ({
                ...el,
                x: el.computedX,
                y: el.computedY,
                opacity: el.computedOpacity,
              }));
              return (
                <div
                  className="absolute inset-0"
                  style={{
                    zIndex: 20,
                    pointerEvents: 'none',
                    opacity: overlayFreezePhase === 'fading' ? 0 : 1,
                    transition: overlayFreezePhase === 'fading' ? 'opacity 0.4s ease-out' : 'none',
                  }}
                >
                  <AnnotationCanvas
                    elements={visible as AnnotationElement[]}
                    setElements={() => {}}
                    activeTool="select"
                    activeColor="#ff0000"
                    strokeWidth={3}
                    fillOpacity={0}
                    selectedId={null}
                    setSelectedId={() => {}}
                    videoRef={videoRef}
                    linkSource={null}
                    setLinkSource={() => {}}
                    klipOffset={offset}
                    isDrawingMode={false}
                  />
                </div>
              );
            })()}
            {/* Clip button overlay — sits above the click-to-pause overlay */}
            <div
              data-video-control="true"
              className="absolute bottom-14 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover/player:opacity-100 transition-opacity flex gap-2 items-center"
              onPointerDown={stopVideoControlEvent}
              onMouseDown={stopVideoControlEvent}
              onTouchStart={stopVideoControlEvent}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-0.5 bg-black/70 backdrop-blur-sm rounded-lg px-1.5 py-1 shadow-lg">
                {SPEED_STEPS.map(s => (
                  <button
                    key={s}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlaybackSpeed(s);
                      applySpeed(s);
                    }}
                    className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors ${
                      playbackSpeed === s
                        ? 'bg-primary text-primary-foreground'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {s === 0.25 ? '¼' : s === 0.5 ? '½' : `${s}x`}
                  </button>
                ))}
              </div>
              <Button onClick={(e) => { e.stopPropagation(); handleInstantClip(); }} size="sm" className="gap-1.5 shadow-lg bg-primary/90 backdrop-blur-sm">
                <Scissors className="h-4 w-4" /> Clip (±5s)
              </Button>
            </div>
            {/* Clip saved toast - visible in full screen mode */}
            {clipSavedToast && (
              <div className="absolute top-4 right-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <Scissors className="h-4 w-4" />
                Clip saved
              </div>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <HardDriveDownload className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Source video purged</p>
              <p className="text-sm mt-1">Clips and annotations are still available below.</p>
            </CardContent>
          </Card>
        )}

        {/* Clips list: newest first */}
        <div className="pt-1">
          {(() => {
            const pendingCount = selectedVideo.clips.filter(c => c.ai_status === 'pending').length;
            return (
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium">Clips ({selectedVideo.clips.length}){pendingCount > 0 && <span className="text-xs text-amber-500 ml-1.5">· {pendingCount} pending review</span>}</h4>
                {pendingCount > 0 && (
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" className="h-6 text-xs gap-1" onClick={handleAcceptAllAIClips}>
                      <Check className="h-3 w-3" /> Accept All
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-destructive hover:text-destructive" onClick={handleRejectAllAIClips}>
                      <X className="h-3 w-3" /> Reject All
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {clipsNewestFirst.map(clip => (
              <div key={clip.id} className={`p-2.5 rounded-lg border transition-colors group/clip ${
                clip.ai_status === 'pending' ? 'bg-amber-500/5 border-amber-500/30' :
                clip.ai_status === 'accepted' ? 'bg-card border-green-500/30' :
                'bg-card hover:bg-muted/30'
              }`}>
                <div className="flex items-center gap-2">
                  <button onClick={() => playClip(clip)} className="flex items-center gap-1 text-primary hover:underline font-mono text-xs whitespace-nowrap shrink-0">
                    <Play className="h-3 w-3" />
                    {fmtTime(clip.start)} → {fmtTime(clip.end)}
                  </button>
                  {(() => {
                    try {
                      const saved = localStorage.getItem(`va_annotations_${clip.id}`);
                      if (saved) {
                        const parsed = JSON.parse(saved);
                        const count = parsed?.klips?.reduce((sum: number, k: any) => sum + (k.elements?.length || 0), 0) || 0;
                        if (count > 0) return (
                          <span className="inline-flex items-center gap-0.5 text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full shrink-0">
                            <Pencil className="h-2.5 w-2.5" /> {count}
                          </span>
                        );
                      }
                    } catch {}
                    return null;
                  })()}
                  <Input
                    key={`${clip.id}-${clip.minute}`}
                    defaultValue={clip.minute || fmtClipMinute(clip.start, selectedVideo.match_minute_offset)}
                    onBlur={e => {
                      if (e.target.value !== (clip.minute || '')) {
                        handleUpdateClipMinute(clip.id, e.target.value);
                      }
                    }}
                    className="h-7 text-[10px] font-mono w-[60px] shrink-0"
                    title="Match time (editable)"
                  />

                  <ActionTypeCombobox
                    value={clip.action_type}
                    onChange={(v) => handleUpdateClipAction(clip.id, v)}
                    actionTypes={allActionTypes}
                    compact
                  />

                  <ZonePitchSelector
                    value={(clip.zone_details || []) as ZonePoint[]}
                    onChange={(zd) => handleUpdateClipZones(clip.id, zd as Clip['zone_details'])}
                    actionType={clip.action_type}
                    compact
                  />

                  {/* AI suggested action type */}
                  {clip.ai_suggested_action && !clip.action_type && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/5 font-normal">
                        {clip.ai_suggested_action}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                        onClick={async () => {
                          await handleUpdateClipAction(clip.id, clip.ai_suggested_action!);
                          // Clear suggestion after accepting
                          if (!selectedVideo) return;
                          const updated = selectedVideo.clips.map(c => c.id === clip.id ? { ...c, ai_suggested_action: '' } : c);
                          await saveClips(updated);
                        }}
                        title="Accept suggestion"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-destructive hover:bg-destructive/10"
                        onClick={async () => {
                          if (!selectedVideo) return;
                          const updated = selectedVideo.clips.map(c => c.id === clip.id ? { ...c, ai_suggested_action: '' } : c);
                          await saveClips(updated);
                        }}
                        title="Dismiss suggestion"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {clip.ai_status === 'pending' && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-500 bg-amber-500/10">Pending</Badge>
                      {clip.ai_reason && (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3.5 w-3.5 text-amber-500/60 hover:text-amber-500 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs">
                              {clip.ai_reason}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500 hover:text-green-600 hover:bg-green-500/10" onClick={() => handleAcceptAIClip(clip.id)} title="Accept">
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleRejectAIClip(clip.id)} title="Reject">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  {clip.ai_status === 'accepted' && (
                    <Badge variant="outline" className="text-[10px] border-green-500/40 text-green-500 bg-green-500/10 shrink-0">AI ✓</Badge>
                  )}

                  <div className="flex-1" />

                  <div className="flex items-center gap-0.5 opacity-0 group-hover/clip:opacity-100 transition-opacity shrink-0">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleExtendClip(clip.id, 'start', -1)} title="Extend start -1s">
                      <ChevronsLeft className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleExtendClip(clip.id, 'start', 1)} title="Trim start +1s">
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <span className="text-[9px] text-muted-foreground mx-0.5">|</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleExtendClip(clip.id, 'end', -1)} title="Trim end -1s">
                      <ChevronLeft className="h-3 w-3 rotate-180" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleExtendClip(clip.id, 'end', 1)} title="Extend end +1s">
                      <ChevronsRight className="h-3 w-3" />
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover/clip:opacity-100 text-primary hover:text-primary shrink-0"
                    onClick={() => {
                      // Create an inline annotation project from the clip's video
                      const klip: Klip = {
                        id: crypto.randomUUID(),
                        name: clip.label || 'Clip',
                        startTime: clip.start,
                        endTime: clip.end,
                        elements: [],
                        color: '#3b82f6',
                      };
                      const proj: AnnotationProject = {
                        id: `va-${selectedVideo.id}-${clip.id}`,
                        name: `${selectedVideo.title} — ${clip.label || 'Clip'}`,
                        videoUrl: selectedVideo.video_url,
                        videoName: selectedVideo.title,
                        createdAt: new Date().toISOString(),
                        klips: [klip],
                      };
                      // Check if we have saved annotations for this clip
                      try {
                        const saved = JSON.parse(localStorage.getItem(`va_annotations_${clip.id}`) || 'null');
                        if (saved?.klips) proj.klips = saved.klips;
                      } catch {}
                      setAnnotationProject(proj);
                      setAnnotatingClip(clip);
                    }}
                    title="Annotate this clip"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  {(linkedReportIds.length > 0 || linkedAnalysisIds.length > 0) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover/clip:opacity-100 text-muted-foreground hover:text-primary shrink-0"
                      onClick={() => handleOpenAttachClip(clip)}
                      title="Attach to report action or analysis point"
                    >
                      <Paperclip className="h-3 w-3" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/clip:opacity-100 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDeleteClip(clip.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <div className="mt-1.5 grid grid-cols-1 md:grid-cols-3 gap-1.5">
                  <Input
                    placeholder="Action description..."
                    defaultValue={clip.action_description || ""}
                    onBlur={e => {
                      if (e.target.value !== (clip.action_description || "")) {
                        handleUpdateClipDescription(clip.id, e.target.value);
                      }
                    }}
                    className="h-7 text-xs"
                  />
                  <Input
                    placeholder="Coach's note..."
                    defaultValue={clip.notes || ""}
                    onBlur={e => {
                      if (e.target.value !== (clip.notes || "")) {
                        handleUpdateClipNotes(clip.id, e.target.value);
                      }
                    }}
                    className="h-7 text-xs"
                  />
                  <Input
                    placeholder="R90 score (e.g. 0.05)"
                    type="text"
                    inputMode="decimal"
                    defaultValue={clip.action_score != null ? clip.action_score : ""}
                    onBlur={e => {
                      const raw = e.target.value;
                      let val: number | null = null;
                      if (raw !== "") {
                        const n = parseFloat(raw.replace(/-/g, ""));
                        if (!Number.isNaN(n)) {
                          val = raw.includes("-") ? -Math.abs(n) : n;
                        }
                      }
                      if (val !== (clip.action_score ?? null)) {
                        handleUpdateClipScore(clip.id, val);
                      }
                    }}
                    className="h-7 text-xs font-mono"
                    title="R90 action score"
                  />
                </div>
              </div>
            ))}
            {clipsNewestFirst.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">No clips yet. Hover over the video and press "Clip (±5s)" during playback.</p>
            )}
          </div>
          {selectedVideo.clips.length > 0 && (
            <div className="flex justify-end pt-2">
              <Button variant="destructive" size="sm" className="h-7 text-xs gap-1" onClick={handleDeleteAllClips}>
                <Trash2 className="h-3 w-3" /> Delete All Clips ({selectedVideo.clips.length})
              </Button>
            </div>
          )}
        </div>

        {/* Inline annotation dialog */}
        <Dialog open={!!annotatingClip} onOpenChange={(open) => { if (!open) { setAnnotatingClip(null); setAnnotationProject(null); } }}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 overflow-hidden">
             {annotationProject && annotatingClip && (
               <AnnotationEditor
                 project={annotationProject}
                 clipConstraint={{ start: annotatingClip.start, end: annotatingClip.end }}
                 autoPlay
                 onSave={(proj) => {
                   // Save annotations to localStorage keyed by clip id
                   if (annotatingClip) {
                     try {
                       localStorage.setItem(`va_annotations_${annotatingClip.id}`, JSON.stringify({ klips: proj.klips }));
                     } catch {}
                   }
                   setAnnotationProject(proj);
                   toast.success("Annotations saved to clip");
                 }}
                 onBack={() => { setAnnotatingClip(null); setAnnotationProject(null); }}
               />
             )}
          </DialogContent>
        </Dialog>

        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Export Clips</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Currently linked targets — quick unlink */}
              {(linkedReportIds.length > 0 || linkedAnalysisIds.length > 0) && (
                <div className="rounded-md border p-2 space-y-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Currently linked</p>
                  {linkedReportIds.map((id) => (
                    <div key={`r-${id}`} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate">Report · {id.slice(0, 8)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-destructive hover:text-destructive"
                        onClick={() => handleUnlinkFromReport(id)}
                      >
                        <X className="h-3 w-3 mr-1" /> Unlink
                      </Button>
                    </div>
                  ))}
                  {linkedAnalysisIds.map((id) => (
                    <div key={`a-${id}`} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate">Analysis · {id.slice(0, 8)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-destructive hover:text-destructive"
                        onClick={() => handleUnlinkFromAnalysis(id)}
                      >
                        <X className="h-3 w-3 mr-1" /> Unlink
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Destination toggle */}
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  onClick={() => handleExportDestinationChange("report")}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${exportDestination === "report" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  Performance Report
                </button>
                <button
                  onClick={() => handleExportDestinationChange("analysis")}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${exportDestination === "analysis" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  Analysis
                </button>
              </div>

              {exportDestination === "report" ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    <strong>Link:</strong> Makes this video analysis available for clip selection on the report.
                    {selectedVideo.clips.length > 0 && (
                      <>
                        <br />
                        <strong>Export:</strong> Adds {selectedVideo.clips.length} clip(s) directly as actions.
                      </>
                    )}
                  </p>
                  {defaultPlayerId ? (
                    <div className="rounded-md border px-3 py-2 text-sm">
                      <span className="text-muted-foreground mr-1">Player:</span>
                      <span className="font-medium">{players.find(p => p.id === defaultPlayerId)?.name || "Selected player"}</span>
                    </div>
                  ) : (
                    <Select value={exportPlayerId} onValueChange={(value) => handleExportPlayerChange(value, "report")}>
                      <SelectTrigger><SelectValue placeholder="Select player first" /></SelectTrigger>
                      <SelectContent>
                        {groupPlayersByStatus(players).map(group => (
                          <SelectGroup key={group.status}>
                            <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">{group.label}</SelectLabel>
                            {group.players.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {exportPlayerId && (
                    <Select value={selectedReportId} onValueChange={handleReportSelect}>
                      <SelectTrigger><SelectValue placeholder="Select performance report" /></SelectTrigger>
                      <SelectContent>
                        {availableReports.length === 0 ? (
                          <SelectItem value="__none" disabled>No reports found for this player</SelectItem>
                        ) : (
                          availableReports.map(r => (
                            <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                  {/* Clip selection */}
                  {selectedReportId && selectedVideo.clips.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">Select clips to export</p>
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => {
                            const exportable = selectedVideo.clips.filter(c => !alreadyExportedClipIds.has(c.id));
                            const allSelected = exportable.every(c => selectedExportClipIds.has(c.id));
                            if (allSelected) {
                              setSelectedExportClipIds(new Set());
                            } else {
                              setSelectedExportClipIds(new Set(exportable.map(c => c.id)));
                            }
                          }}
                        >
                          {selectedVideo.clips.filter(c => !alreadyExportedClipIds.has(c.id)).every(c => selectedExportClipIds.has(c.id)) ? "Deselect all" : "Select all"}
                        </button>
                      </div>
                      <div className="max-h-[200px] overflow-y-auto border rounded-md p-2 space-y-1">
                        {selectedVideo.clips.map(clip => {
                          const alreadyExported = alreadyExportedClipIds.has(clip.id);
                          const selected = selectedExportClipIds.has(clip.id);
                          return (
                            <label
                              key={clip.id}
                              className={`flex items-center gap-2 text-xs py-1 px-1 rounded cursor-pointer hover:bg-muted/30 ${alreadyExported ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              <button
                                type="button"
                                disabled={alreadyExported}
                                onClick={() => {
                                  if (alreadyExported) return;
                                  setSelectedExportClipIds(prev => {
                                    const next = new Set(prev);
                                    if (next.has(clip.id)) next.delete(clip.id);
                                    else next.add(clip.id);
                                    return next;
                                  });
                                }}
                                className="shrink-0"
                              >
                                {alreadyExported || selected ? (
                                  <CheckSquare className="h-4 w-4 text-primary" />
                                ) : (
                                  <Square className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>
                              <span className="truncate flex-1">{clip.action_description || clip.action_type || clip.label || "Clip"}</span>
                              {alreadyExported && <span className="text-[10px] text-muted-foreground shrink-0">Already added</span>}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={handleLinkToReport} disabled={!selectedReportId || exporting} variant="outline" className="flex-1">
                      {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                      Link Clips
                    </Button>
                    <Button
                      onClick={handleExportToReport}
                      disabled={!selectedReportId || exporting || selectedExportClipIds.size === 0}
                      className="flex-1"
                    >
                      {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                      Export {selectedExportClipIds.size > 0 ? `${selectedExportClipIds.size} clip${selectedExportClipIds.size !== 1 ? 's' : ''}` : "as Actions"}
                    </Button>
                  </div>
                  {/* Per-clip export progress */}
                  {exporting && exportClipProgress.total > 0 && (
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto border rounded-md p-2 bg-muted/20">
                      <p className="text-xs font-medium text-muted-foreground">
                        Exporting clip {exportClipProgress.current}/{exportClipProgress.total}...
                      </p>
                      {selectedVideo.clips.filter(c => selectedExportClipIds.has(c.id)).map((clip: any) => {
                        const status = exportClipProgress.statuses[clip.id] || "pending";
                        return (
                          <div key={clip.id} className="flex items-center gap-2 text-xs">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${
                              status === "done" ? "bg-green-500" :
                              status === "skipped" ? "bg-yellow-500" :
                              status === "error" ? "bg-red-500" :
                              "bg-muted-foreground/30"
                            }`} />
                            <span className="truncate flex-1">{clip.action_description || clip.action_type || clip.label || "Clip"}</span>
                            <span className={`text-[10px] shrink-0 ${
                              status === "done" ? "text-green-600" :
                              status === "skipped" ? "text-yellow-600" :
                              status === "error" ? "text-red-600" :
                              "text-muted-foreground"
                            }`}>
                              {status === "done" ? "Done" : status === "skipped" ? "Already added" : status === "error" ? "Failed" : "Pending"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
              <>
                  <p className="text-sm text-muted-foreground">
                    Link this video analysis so its clips are available for selection when editing analysis points.
                  </p>
                  <Select value={selectedAnalysisId} onValueChange={(v) => { setSelectedAnalysisId(v); }}>
                    <SelectTrigger><SelectValue placeholder="Select analysis" /></SelectTrigger>
                    <SelectContent>
                      {availableAnalyses.length === 0 ? (
                        <SelectItem value="__none" disabled>No analyses found</SelectItem>
                      ) : (
                        availableAnalyses.map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            <span className="capitalize">{a.analysis_type.replace('-', ' ')}</span> — {a.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleLinkToAnalysis}
                    disabled={!selectedAnalysisId || exporting}
                    className="w-full"
                  >
                    {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                    Link Clips
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Attach clip to report action dialog */}
        <Dialog open={showAttachDialog} onOpenChange={(open) => { setShowAttachDialog(open); if (!open) setShowActionsWithClips(false); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Attach Clip</DialogTitle>
            </DialogHeader>
            <div className="max-h-[500px] overflow-y-auto space-y-4">
              {loadingAttachActions ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : linkedReportActions.length === 0 && linkedAnalysisPoints.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Paperclip className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nothing to attach to yet.</p>
                  <p className="text-xs mt-1">Link this video analysis to a report or an analysis from the Link / Export button first.</p>
                </div>
              ) : (
                <>
                {linkedReportActions.length > 0 && (() => {
                const actionsWithoutClip = linkedReportActions.filter(a => !a.video_url);
                const actionsWithClip = linkedReportActions.filter(a => !!a.video_url);
                return (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Performance Report Actions</p>
                    {/* Actions without clips - shown prominently */}
                    <button
                      onClick={() => {
                        const first = actionsWithoutClip[0] || linkedReportActions[0];
                        handleInsertNewActionWithClip(first.action_number - 1, first.analysis_id);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Plus className="h-3 w-3" /> Add new action here
                    </button>
                    {actionsWithoutClip.map((action) => (
                      <div key={action.id}>
                        <button
                          onClick={() => handleAttachClipToAction(action.id)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors text-left"
                        >
                          <span className="text-xs font-mono text-muted-foreground shrink-0">#{action.action_number}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{action.action_description || action.action_type || 'Untitled action'}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {action.action_type && <span>{action.action_type}</span>}
                              {action.minute !== undefined && action.minute !== null && (
                                <span className="ml-1.5 font-mono text-[10px] opacity-70">{action.minute}'</span>
                              )}
                              <span className="ml-2 opacity-60">{action.report_title}</span>
                            </p>
                          </div>
                          <Paperclip className="h-3.5 w-3.5 text-primary shrink-0" />
                        </button>
                        <button
                          onClick={() => handleInsertNewActionWithClip(action.action_number, action.analysis_id)}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Plus className="h-3 w-3" /> Add new action here
                        </button>
                      </div>
                    ))}

                    {/* Actions with clips - collapsed at bottom */}
                    {actionsWithClip.length > 0 && (
                      <div className="mt-3 border-t pt-2">
                        <button
                          onClick={() => setShowActionsWithClips(!showActionsWithClips)}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <span>{actionsWithClip.length} action{actionsWithClip.length !== 1 ? 's' : ''} already have a clip</span>
                          <ChevronLeft className={`h-3.5 w-3.5 transition-transform ${showActionsWithClips ? '-rotate-90' : 'rotate-0'}`} />
                        </button>
                        {showActionsWithClips && actionsWithClip.map((action) => (
                          <button
                            key={action.id}
                            onClick={() => handleAttachClipToAction(action.id)}
                            className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-muted hover:bg-muted/30 transition-colors text-left opacity-60 hover:opacity-100"
                          >
                            <span className="text-xs font-mono text-muted-foreground shrink-0">#{action.action_number}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{action.action_description || action.action_type || 'Untitled action'}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {action.action_type && <span>{action.action_type}</span>}
                                {action.minute !== undefined && action.minute !== null && (
                                  <span className="ml-1.5 font-mono text-[10px] opacity-70">{action.minute}'</span>
                                )}
                                <span className="ml-2 opacity-60">{action.report_title}</span>
                                <span className="ml-1.5 text-amber-500/80">· has clip</span>
                              </p>
                            </div>
                            <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
                })()}
                {linkedAnalysisPoints.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Analysis Points</p>
                    <div className="space-y-1">
                      {linkedAnalysisPoints.map((p) => (
                        <button
                          key={`${p.analysisId}-${p.pointIndex}`}
                          onClick={() => handleAttachClipToAnalysisPoint(p.analysisId, p.pointIndex)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors text-left"
                        >
                          <span className="text-xs font-mono text-muted-foreground shrink-0">#{p.pointIndex + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{p.pointTitle}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              <span>{p.analysisType.replace('-', ' ')}</span>
                              <span className="ml-2 opacity-60">{p.analysisTitle}</span>
                              {p.videoCount > 0 && (
                                <span className="ml-1.5 text-amber-500/80">· {p.videoCount} clip{p.videoCount !== 1 ? 's' : ''}</span>
                              )}
                            </p>
                          </div>
                          <Paperclip className="h-3.5 w-3.5 text-primary shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Rejection reason dialog */}
        <Dialog open={!!rejectingClipId} onOpenChange={(open) => { if (!open) { setRejectingClipId(null); setRejectionReason(""); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-bebas uppercase tracking-wider text-primary">
                Why are you rejecting this clip?
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              {(() => {
                const clip = selectedVideo?.clips.find(c => c.id === rejectingClipId);
                return clip ? (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><span className="font-medium text-foreground">Suggested:</span> {clip.ai_suggested_action || 'N/A'}</p>
                    <p><span className="font-medium text-foreground">AI reason:</span> {clip.ai_reason || 'N/A'}</p>
                    <p><span className="font-medium text-foreground">Time:</span> {clip.minute || toDotTime(clip.start)}</p>
                  </div>
                ) : null;
              })()}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Rejection reason (helps AI learn)</label>
                <Input
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="e.g. Player not involved, wrong player identified, ball is elsewhere"
                  onKeyDown={e => { if (e.key === 'Enter') confirmRejectAIClip(); }}
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => { setRejectingClipId(null); setRejectionReason(""); }}>
                  Cancel
                </Button>
                <Button variant="outline" size="sm" onClick={confirmRejectAIClip} className="text-muted-foreground">
                  Skip reason & reject
                </Button>
                <Button size="sm" onClick={confirmRejectAIClip} disabled={!rejectionReason.trim()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Reject with reason
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Video list (no video selected) ──
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bebas mb-2">VIDEO ANALYSIS</h2>
          <p className="text-muted-foreground">Upload full match footage, annotate and clip key actions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleRefreshData} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setShowUpload(!showUpload)} variant={showUpload ? "secondary" : "default"}>
            {showUpload ? <><X className="h-4 w-4 mr-2" /> Cancel</> : <><Plus className="h-4 w-4 mr-2" /> Upload Match</>}
          </Button>
        </div>
      </div>

      {showUpload && (
        <Card className="border-primary/30">
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Input placeholder="Match title (e.g. vs Arsenal - PL R23)" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                {defaultPlayerId ? (
                  <div className="rounded-md border px-3 py-2 text-sm">
                    <span className="text-muted-foreground mr-1">Player:</span>
                    <span className="font-medium">{players.find(p => p.id === defaultPlayerId)?.name || "Selected player"}</span>
                  </div>
                ) : (
                  <Select value={newPlayerId} onValueChange={setNewPlayerId}>
                    <SelectTrigger><SelectValue placeholder="Link to player (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {players.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Opponent" value={newOpponent} onChange={e => setNewOpponent(e.target.value)} />
                  <Input type="date" value={newMatchDate} onChange={e => setNewMatchDate(e.target.value)} />
                </div>
              </div>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/'));
                  if (dropped.length === 0) {
                    toast.error('Please drop video files only');
                    return;
                  }
                  const fileArray = dropped.slice(0, 10);
                  if (dropped.length > 10) {
                    toast.warning(`Only the first 10 videos will be uploaded (${dropped.length} dropped)`);
                  }
                  if (fileArray.length === 1) {
                    setUploadFile(fileArray[0]);
                    setUploadFiles([]);
                  } else {
                    setUploadFile(fileArray[0]);
                    setUploadFiles(fileArray);
                  }
                  // Auto-fill title if empty so the upload button enables for multi-drop
                  if (!newTitle) {
                    setNewTitle(fileArray.length > 1
                      ? `Batch upload (${fileArray.length} videos)`
                      : fileArray[0].name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
                  }
                }}
                className="border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors min-h-[140px]"
              >
                <input ref={fileInputRef} type="file" accept="video/*" multiple onChange={handleFileSelect} className="hidden" />
                {uploadFiles.length > 1 ? (
                  <div className="text-center space-y-1 p-4">
                    <Film className="h-8 w-8 mx-auto text-primary" />
                    <p className="font-medium text-sm">{uploadFiles.length} videos selected</p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadFiles.reduce((s, f) => s + f.size, 0) / (1024 * 1024)).toFixed(0)} MB total
                    </p>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setUploadFile(null); setUploadFiles([]); }}>
                      <X className="h-3 w-3 mr-1" /> Remove all
                    </Button>
                  </div>
                ) : uploadFile ? (
                  <div className="text-center space-y-1 p-4">
                    <Film className="h-8 w-8 mx-auto text-primary" />
                    <p className="font-medium text-sm truncate max-w-[200px]">{uploadFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(uploadFile.size / (1024 * 1024)).toFixed(0)} MB</p>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}>
                      <X className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-1 p-4">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Drop or click to upload match videos</p>
                    <p className="text-[10px] text-muted-foreground">Up to 10 at once. No size limit. Auto-deletes after 7 days (clips/notes kept).</p>
                  </div>
                )}
              </div>
            </div>
            <Button onClick={handleCreate} disabled={!uploadFile || creating} className="w-full mt-4">
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading{uploadFiles.length > 1 ? ` ${uploadFiles.length} videos` : ''}...
                  {uploadFile && uploadFiles.length <= 1 && (
                    <span className="ml-2 text-xs opacity-80">
                      {(uploadedBytes / (1024 * 1024)).toFixed(1)} / {(uploadFile.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  )}
                </>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> Upload Match Video{uploadFiles.length > 1 ? `s (${uploadFiles.length})` : ''}</>
              )}
            </Button>
            {creating && uploadProgress > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uploading video...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {videos.length === 0 && !showUpload ? (
          <div className="text-center py-12 text-muted-foreground">
            <Film className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p>No match videos yet</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4 mr-1" /> Upload First Match
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(() => {
              // Group multi-part videos: show only part 1 as the entry point, hide other parts
              const seenGroups = new Set<string>();
              return videos.filter(video => {
                if (video.group_id && video.part_number && video.part_number > 1) {
                  return false; // hide non-first parts
                }
                if (video.group_id) {
                  if (seenGroups.has(video.group_id)) return false;
                  seenGroups.add(video.group_id);
                }
                return true;
              }).map(video => {
                return (
                  <div
                    key={video.id}
                    onClick={() => { setSelectedVideo(video); loadVideoDetail(video.id); }}
                    className="p-4 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{video.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {video.opponent && <span className="text-xs text-muted-foreground">vs {video.opponent}</span>}
                          {video.annotations.length > 0 && <Badge variant="secondary" className="text-xs">{video.annotations.length} notes</Badge>}
                          {video.clips.length > 0 && <Badge variant="outline" className="text-xs">{video.clips.length} clips</Badge>}
                          {video.total_parts && video.total_parts > 1 && (
                            <Badge variant="secondary" className="text-xs">{video.total_parts} parts</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {video.match_date && <p className="text-xs text-muted-foreground">{format(new Date(video.match_date), "dd MMM yyyy")}</p>}
                          {!video.video_url && video.clips.length > 0 && (
                            <Badge variant="outline" className="text-[10px]">Source removed</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary shrink-0" title="Rename" onClick={e => {
                          e.stopPropagation();
                          const newName = prompt("Rename video analysis:", video.title);
                          if (newName && newName.trim() && newName.trim() !== video.title) {
                            supabase.from('video_analyses').update({ title: newName.trim() }).eq('id', video.id).then(({ error }) => {
                              if (error) { toast.error('Failed to rename'); return; }
                              toast.success('Renamed');
                              setVideos(prev => prev.map(v => v.id === video.id ? { ...v, title: newName.trim() } : v));
                            });
                          }
                        }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={e => { e.stopPropagation(); handleDeleteVideo(video.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Large video processing modal */}
      <LargeVideoProcessingModal
        open={showHybridModal}
        progress={hybridProgress}
        onCancel={() => {
          hybridAbortRef.current?.abort();
          setShowHybridModal(false);
          setHybridProgress(null);
          setCreating(false);
        }}
      />
      <R90RatingsViewer
        open={r90ViewerOpen}
        onOpenChange={(o) => { setR90ViewerOpen(o); if (!o) setR90ViewerSearch(undefined); }}
        searchTerm={r90ViewerSearch}
      />
    </div>
  );
};

// ── Searchable / typeable action type combobox ──
function ActionTypeCombobox({
  value,
  onChange,
  actionTypes,
  compact = false,
  triggerRef,
  onKeyDown,
  overlayMode = false,
  portalContainer,
}: {
  value: string;
  onChange: (v: string) => void;
  actionTypes: string[];
  compact?: boolean;
  triggerRef?: React.RefObject<HTMLButtonElement>;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  overlayMode?: boolean;
  portalContainer?: HTMLElement | null;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = actionTypes.filter(t =>
    t.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (v: string) => {
    onChange(toTitleCase(v));
    setOpen(false);
    setSearch("");
  };

  const handleCustom = () => {
    if (search.trim()) {
      onChange(toTitleCase(search.trim()));
      setOpen(false);
      setSearch("");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          size="sm"
          className={`justify-between ${compact ? 'h-7 text-[10px] w-[110px]' : 'w-[130px]'}`}
        >
          {toTitleCase(value) || "Action type"}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={overlayMode ? "w-[420px] max-w-[90vw] p-0" : "w-[200px] p-0"}
        align="start"
        side={overlayMode ? "top" : "bottom"}
        sideOffset={overlayMode ? 8 : 4}
        container={portalContainer ?? undefined}
      >
        <Command onKeyDownCapture={onKeyDown}>
          <CommandInput
            placeholder="Search or type..."
            value={search}
            onValueChange={setSearch}
            onKeyDown={onKeyDown}
          />
          <CommandList>
            <CommandEmpty>
              {search.trim() ? (
                <button
                  className="w-full px-3 py-2 text-sm text-left hover:bg-accent cursor-pointer"
                  onClick={handleCustom}
                >
                  Use "{toTitleCase(search.trim())}"
                </button>
              ) : (
                <span className="text-muted-foreground text-sm">No matches</span>
              )}
            </CommandEmpty>
            <CommandGroup>
              {filtered.map(t => (
                <CommandItem key={t} value={t} onSelect={() => handleSelect(t)} className="cursor-pointer">
                  {toTitleCase(t)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
