import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Film, Plus, Play, Trash2, Loader2, Upload, MessageSquare, Scissors, Clock, X, ChevronLeft, ChevronsLeft, ChevronsRight, ArrowLeft, Download, Pencil, Link2, Paperclip, UserSearch, Check } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AnnotationEditor } from "@/components/staff/annotations/AnnotationEditor";
import { AnnotationCanvas } from "@/components/staff/annotations/AnnotationCanvas";
import type { AnnotationProject, Klip, AnnotationElement } from "@/components/staff/annotations/AnnotationProjects";
import { computeVisibleElements } from "@/lib/annotationRenderUtils";
import { sortPlayersByRepresentation, getStatusLabel, groupPlayersByStatus } from "@/lib/playerSorting";
import { toTitleCase } from "@/lib/titleCase";
import { AIPlayerDetection } from "./AIPlayerDetection";

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
  ai_status?: 'pending' | 'accepted' | 'rejected';
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


export const VideoAnalysis = () => {
  const [videos, setVideos] = useState<VideoAnalysisEntry[]>([]);
  const [players, setPlayers] = useState<{ id: string; name: string; representation_status?: string | null; image_url?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoAnalysisEntry | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Upload form
  const [newTitle, setNewTitle] = useState("");
  const [newPlayerId, setNewPlayerId] = useState("");
  const [newOpponent, setNewOpponent] = useState("");
  const [newMatchDate, setNewMatchDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
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

  // Half-time sync
  const [syncHalf, setSyncHalf] = useState<"1st" | "2nd">("1st");

  // Clip-to-report attachment
  const [showAttachDialog, setShowAttachDialog] = useState(false);
  const [attachClip, setAttachClip] = useState<Clip | null>(null);
  const [linkedReportIds, setLinkedReportIds] = useState<string[]>([]);
  const [linkedReportActions, setLinkedReportActions] = useState<{ id: string; action_number: number; action_type: string; action_description: string; report_title: string; analysis_id: string; minute?: number | null; video_url?: string | null }[]>([]);
  const [showActionsWithClips, setShowActionsWithClips] = useState(false);
  const [loadingAttachActions, setLoadingAttachActions] = useState(false);

  // Clip saved toast
  const [clipSavedToast, setClipSavedToast] = useState(false);
  const clipSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Playback speed
  const SPEED_STEPS = [0.25, 0.5, 1, 2, 4, 8];
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

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

  const fetchVideos = async () => {
    const { data } = await supabase
      .from("video_analyses")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setVideos(data.map(v => ({
        ...v,
        annotations: (v.annotations as any as Annotation[]) || [],
        clips: (v.clips as any as Clip[]) || [],
        match_minute_offset: Number(v.match_minute_offset) || 0,
        second_half_offset: null,
        second_half_video_time: null,
      })));
    }
    setLoading(false);
  };

  const fetchPlayers = async () => {
    const { data } = await supabase.from("players").select("id, name, representation_status, image_url").order("name");
    if (data) setPlayers(sortPlayersByRepresentation(data));
  };

  const fetchKnownActionTypes = async () => {
    const { data } = await supabase
      .from("performance_report_actions")
      .select("action_type")
      .not("action_type", "is", null);
    if (data) {
      const allTypes = data.map(d => d.action_type).filter(Boolean) as string[];
      const unique = [...new Set(allTypes.map(t => toTitleCase(t)))];
      // Build frequency counts for sorting
      const counts: Record<string, number> = {};
      allTypes.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
      setKnownActionTypes(unique);
      setActionTypeFrequency(counts);
    }
  };

  // Sort action types by frequency of use (most used first), then alphabetical
  const allActionTypes = useMemo(() => {
    const merged = new Set([...DEFAULT_ACTION_TYPES, ...knownActionTypes]);
    return [...merged].sort((a, b) => {
      const freqA = actionTypeFrequency[a] || 0;
      const freqB = actionTypeFrequency[b] || 0;
      if (freqB !== freqA) return freqB - freqA;
      return a.localeCompare(b);
    });
  }, [knownActionTypes, actionTypeFrequency]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadFile(file);
  };

  const handleCreate = async () => {
    if (!newTitle || !uploadFile) return;
    setCreating(true);
    setUploadProgress(0);
    setUploadedBytes(0);

    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;

      const ext = uploadFile.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${ext}`;

      // Use XMLHttpRequest for upload progress tracking
      const fileSize = uploadFile.size;
      const publicUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Get the Supabase URL and key
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const token = session.session?.access_token || supabaseKey;
        
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setUploadedBytes(e.loaded);
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const { data: urlData } = supabase.storage
              .from("analysis-videos")
              .getPublicUrl(filePath);
            resolve(urlData.publicUrl);
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed')));

        xhr.open('POST', `${supabaseUrl}/storage/v1/object/analysis-videos/${filePath}`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('apikey', supabaseKey);
        xhr.setRequestHeader('Content-Type', uploadFile.type || 'video/mp4');
        xhr.setRequestHeader('x-upsert', 'false');
        xhr.send(uploadFile);
      });

      const autoDeleteAt = new Date();
      autoDeleteAt.setDate(autoDeleteAt.getDate() + 7);

      const insertData: any = {
        title: newTitle,
        video_url: publicUrl,
        opponent: newOpponent || null,
        match_date: newMatchDate || null,
        created_by: userId || null,
        annotations: [],
        clips: [],
        auto_delete_at: autoDeleteAt.toISOString(),
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
        const entry: VideoAnalysisEntry = { ...data, annotations: [] as Annotation[], clips: [] as Clip[], match_minute_offset: 0, second_half_offset: null, second_half_video_time: null };
        setVideos(prev => [entry, ...prev]);
        setSelectedVideo(entry);
        setShowUpload(false);
        setNewTitle("");
        setUploadFile(null);
        setNewPlayerId("");
        setNewOpponent("");
        setNewMatchDate("");
        setUploadProgress(0);
        setUploadedBytes(0);
        toast.success("Video uploaded successfully");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload video");
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
    const updatedClips = selectedVideo.clips.map(c => c.id === clipId ? { ...c, action_type } : c);
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

  const handleRejectAIClip = async (clipId: string) => {
    if (!selectedVideo) return;
    await saveClips(selectedVideo.clips.filter(c => c.id !== clipId));
  };

  const handleAcceptAllAIClips = async () => {
    if (!selectedVideo) return;
    await saveClips(selectedVideo.clips.map(c => c.ai_status === 'pending' ? { ...c, ai_status: 'accepted' as const } : c));
  };

  const handleRejectAllAIClips = async () => {
    if (!selectedVideo) return;
    await saveClips(selectedVideo.clips.filter(c => c.ai_status !== 'pending'));
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
    const targetMatchSeconds = parseFloat(overrideMinute) * 60;

    if (syncHalf === "2nd") {
      // Second half: store separately so we know after this video time, minutes reset to 45+
      const updated = {
        ...selectedVideo,
        second_half_offset: targetMatchSeconds - currentVideoTime,
        second_half_video_time: currentVideoTime,
      };
      setSelectedVideo(updated);
      setVideos(prev => prev.map(v => v.id === selectedVideo.id ? updated : v));
      setShowTimestampOverride(false);
      setOverrideMinute("");
      toast.success(`2nd half synced: this point is now ${overrideMinute}'`);
    } else {
      const newOffset = targetMatchSeconds - currentVideoTime;
      const { error } = await supabase
        .from("video_analyses")
        .update({ match_minute_offset: newOffset })
        .eq("id", selectedVideo.id);

      if (!error) {
        const updated = { ...selectedVideo, match_minute_offset: newOffset };
        setSelectedVideo(updated);
        setVideos(prev => prev.map(v => v.id === selectedVideo.id ? updated : v));
        setShowTimestampOverride(false);
        setOverrideMinute("");
        toast.success(`1st half synced: this point is now ${overrideMinute}'`);
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

  const jumpToTimestamp = (ts: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = ts;
      videoRef.current.play();
    }
  };

  // Export clips to a performance report
  const handleOpenExport = () => {
    setExportPlayerId("");
    setSelectedReportId("");
    setSelectedAnalysisId("");
    setSelectedPointIndex(null);
    setAvailableReports([]);
    setAvailableAnalyses([]);
    setExportDestination("report");
    setShowExportDialog(true);
  };

  const handleExportPlayerChange = async (playerId: string) => {
    setExportPlayerId(playerId);
    setSelectedReportId("");
    setSelectedAnalysisId("");
    setSelectedPointIndex(null);

    if (exportDestination === "report") {
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
      await fetchAnalysesForExport();
    }
  };

  const fetchAnalysesForExport = async () => {
    const { data } = await supabase
      .from("analyses")
      .select("id, title, analysis_type, points")
      .in("analysis_type", ["pre-match", "post-match"])
      .order("created_at", { ascending: false })
      .limit(50);

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
    if (dest === "analysis") {
      await fetchAnalysesForExport();
    } else if (exportPlayerId) {
      // Re-fetch reports for the selected player
      handleExportPlayerChange(exportPlayerId);
    }
  };

  const handleExportToAnalysisPoint = async () => {
    if (!selectedVideo || !selectedAnalysisId || selectedPointIndex === null) return;
    setExporting(true);
    try {
      const analysis = availableAnalyses.find(a => a.id === selectedAnalysisId);
      if (!analysis) throw new Error("Analysis not found");

      const points = [...analysis.points];
      const point = { ...points[selectedPointIndex] };
      const currentVideos = point.video_urls || (point.video_url ? [point.video_url] : []);

      // Extract each clip and add to point
      for (const clip of selectedVideo.clips) {
        let clipUrl: string;
        try {
          clipUrl = await extractClipFile(selectedVideo.video_url, clip.id, clip.start, clip.end);
        } catch {
          clipUrl = `${selectedVideo.video_url}#t=${clip.start},${clip.end}`;
        }
        currentVideos.push(clipUrl);
      }

      point.video_urls = currentVideos;
      points[selectedPointIndex] = point;

      const { error } = await supabase
        .from("analyses")
        .update({ points })
        .eq("id", selectedAnalysisId);

      if (error) throw error;
      toast.success(`${selectedVideo.clips.length} clip(s) added to point ${selectedPointIndex + 1}`);
      setShowExportDialog(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add clips to analysis");
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
    setExporting(true);

    try {
      // Get existing max action_number
      const { data: existing } = await supabase
        .from("performance_report_actions")
        .select("action_number")
        .eq("analysis_id", selectedReportId)
        .order("action_number", { ascending: false })
        .limit(1);

      let nextNumber = (existing?.[0]?.action_number || 0) + 1;

      // Extract each clip as an independent file
      const actionsToInsert = [];
      for (const [i, clip] of selectedVideo.clips.entries()) {
        let clipUrl: string | null = null;
        try {
          clipUrl = await extractClipFile(selectedVideo.video_url, clip.id, clip.start, clip.end);
        } catch (err) {
          console.error('Clip extraction failed, using fragment URL:', err);
          clipUrl = `${selectedVideo.video_url}#t=${clip.start},${clip.end}`;
        }
        
        const annotations = getClipAnnotations(clip.id);

        actionsToInsert.push({
          analysis_id: selectedReportId,
          action_number: nextNumber + i,
          minute: getMatchMinute(clip.start, selectedVideo.match_minute_offset),
          action_type: clip.action_type || "other",
          action_description: clip.action_description || "",
          notes: clip.notes || null,
          video_url: clipUrl,
          video_analysis_id: selectedVideo.id,
          clip_id: clip.id,
          is_successful: true,
          action_score: clip.action_score ?? 0,
          ...(annotations ? { clip_annotations: annotations } : {}),
        });
      }

      const { error } = await supabase
        .from("performance_report_actions")
        .insert(actionsToInsert);

      if (error) throw error;

      toast.success(`${actionsToInsert.length} actions exported to report`);
      setShowExportDialog(false);
      setSelectedReportId("");
    } catch (err: any) {
      toast.error(err.message || "Export failed");
    }
    setExporting(false);
  };

  const fmtTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
    const matchSeconds = videoSeconds + offset;
    const mins = Math.floor(matchSeconds / 60);
    const secs = Math.floor(matchSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /** Format minute for clip display: mm:ss with seconds rounded down to nearest 5 */
  const fmtClipMinute = (videoSeconds: number, _offset: number) => {
    const offset = getEffectiveOffset(videoSeconds);
    const matchSeconds = videoSeconds + offset;
    const mins = Math.floor(matchSeconds / 60);
    const rawSecs = Math.floor(matchSeconds % 60);
    const roundedSecs = Math.floor(rawSecs / 5) * 5;
    return `${mins}:${roundedSecs.toString().padStart(2, '0')}`;
  };

  const getMatchMinute = (videoSeconds: number, _offset: number) => {
    const offset = getEffectiveOffset(videoSeconds);
    const matchSeconds = videoSeconds + offset;
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

  // Hotkeys: arrow keys for seeking, Del for clip, +/- for speed
  useEffect(() => {
    if (!selectedVideo) return;
    const handleHotkey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      // Allow hotkeys even from video element (for fullscreen support)
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const video = videoRef.current;
      if (!video) return;

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
      } else if (e.key === 'Delete') {
        e.preventDefault();
        e.stopPropagation();
        handleInstantClip();
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        e.stopPropagation();
        setPlaybackSpeed(prev => {
          const idx = SPEED_STEPS.indexOf(prev);
          const next = idx < SPEED_STEPS.length - 1 ? SPEED_STEPS[idx + 1] : prev;
          if (video) video.playbackRate = next;
          return next;
        });
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        e.stopPropagation();
        setPlaybackSpeed(prev => {
          const idx = SPEED_STEPS.indexOf(prev);
          const next = idx > 0 ? SPEED_STEPS[idx - 1] : prev;
          if (video) video.playbackRate = next;
          return next;
        });
      } else if (e.key === '0') {
        e.preventDefault();
        e.stopPropagation();
        setPlaybackSpeed(1);
        if (video) video.playbackRate = 1;
      }
    };
    // Use capture phase so our handler fires before the browser's native video handlers
    window.addEventListener('keydown', handleHotkey, true);
    return () => window.removeEventListener('keydown', handleHotkey, true);
  }, [selectedVideo, handleInstantClip]);

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

  const handleOpenAttachClip = async (clip: Clip) => {
    setAttachClip(clip);
    setShowAttachDialog(true);
    setLoadingAttachActions(true);
    try {
      if (linkedReportIds.length === 0) {
        setLinkedReportActions([]);
        setLoadingAttachActions(false);
        return;
      }
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
    } catch (err) {
      console.error('Error fetching actions:', err);
    }
    setLoadingAttachActions(false);
  };

  const handleAttachClipToAction = async (actionId: string) => {
    if (!attachClip || !selectedVideo) return;
    try {
      let clipUrl: string;
      try {
        clipUrl = await extractClipFile(selectedVideo.video_url, attachClip.id, attachClip.start, attachClip.end);
      } catch (err) {
        console.error('Clip extraction failed, using fragment URL:', err);
        clipUrl = `${selectedVideo.video_url}#t=${attachClip.start},${attachClip.end}`;
      }
      
      const annotations = getClipAnnotations(attachClip.id);
      const updateData: any = { video_url: clipUrl };
      if (annotations) updateData.clip_annotations = annotations;

      const { error } = await supabase
        .from("performance_report_actions")
        .update(updateData)
        .eq("id", actionId);
      if (error) throw error;
      toast.success("Clip attached to action");
      setShowAttachDialog(false);
      setAttachClip(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to attach clip");
    }
  };

  const handleInsertNewActionWithClip = async (insertAfterNumber: number, reportAnalysisId: string) => {
    if (!attachClip || !selectedVideo) return;
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
        clipUrl = await extractClipFile(selectedVideo.video_url, attachClip.id, attachClip.start, attachClip.end);
      } catch (err) {
        console.error('Clip extraction failed, using fragment URL:', err);
        clipUrl = `${selectedVideo.video_url}#t=${attachClip.start},${attachClip.end}`;
      }
      
      const annotations = getClipAnnotations(attachClip.id);
      const insertData: any = {
        analysis_id: reportAnalysisId,
        action_number: insertAfterNumber + 1,
        action_type: attachClip.action_type || "other",
        action_description: attachClip.action_description || "",
        notes: attachClip.notes || null,
        video_url: clipUrl,
        is_successful: true,
        minute: parseClipMinuteToNumber(attachClip.minute) ?? getMatchMinute(attachClip.start, selectedVideo.match_minute_offset),
      };
      if (annotations) insertData.clip_annotations = annotations;

      const { error } = await supabase
        .from("performance_report_actions")
        .insert(insertData);

      if (error) throw error;
      toast.success("New action created with clip attached");
      setShowAttachDialog(false);
      setAttachClip(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to create action");
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
            <h3 className="font-medium text-sm truncate">{selectedVideo.title}</h3>
            <p className="text-xs text-muted-foreground">
              {selectedVideo.opponent && `vs ${selectedVideo.opponent}`}
              {selectedVideo.match_date && ` · ${format(new Date(selectedVideo.match_date), "dd MMM yyyy")}`}
              {selectedVideo.clips.length > 0 && ` · ${selectedVideo.clips.length} clips`}
            </p>
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
              <AIPlayerDetection
                videoUrl={selectedVideo.video_url}
                videoRef={videoRef as React.RefObject<HTMLVideoElement>}
                opponent={selectedVideo.opponent}
                players={players.map(p => ({ id: p.id, name: p.name }))}
                selectedPlayerId={selectedVideo.player_id}
                existingClips={selectedVideo.clips.map(c => ({ start: c.start, end: c.end, label: c.label, action_type: c.action_type }))}
                onClipsAccepted={async (newClips) => {
                  if (!selectedVideo) return;
                  const clips: Clip[] = newClips.map(c => ({
                    id: crypto.randomUUID(),
                    start: c.start,
                    end: c.end,
                    label: c.label,
                    action_type: c.actionType,
                    action_description: c.description || '',
                    notes: 'AI detected',
                    created_at: new Date().toISOString(),
                    minute: `${Math.floor(c.start / 60)}:${String(Math.floor(c.start % 60)).padStart(2, '0')}`,
                    ai_status: 'pending' as const,
                  }));
                  await saveClips([...selectedVideo.clips, ...clips]);
                }}
              />
            )}
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
          <div className="relative w-full bg-black rounded-lg overflow-hidden group/player">
            <video
              ref={videoRef}
              src={selectedVideo.video_url}
              crossOrigin="anonymous"
              controls
              controlsList="nodownload"
              className="w-full aspect-video object-fill"
              onKeyDown={(e) => {
                // Prevent native video controls from intercepting our hotkeys in fullscreen
                const key = e.key;
                if (['-', '_', '=', '+', '0', 'Delete', 'ArrowLeft', 'ArrowRight', 'Shift'].includes(key)) {
                  e.stopPropagation();
                }
              }}
              onTimeUpdate={() => {
                if (overlayElements.length > 0) {
                  setOverlayCurrentTime(videoRef.current?.currentTime ?? 0);
                }
              }}
            />
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
            {/* Clip button overlay */}
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 opacity-0 group-hover/player:opacity-100 transition-opacity flex gap-2 items-center">
              <div className="flex items-center gap-0.5 bg-black/70 backdrop-blur-sm rounded-lg px-1.5 py-1 shadow-lg">
                {SPEED_STEPS.map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      setPlaybackSpeed(s);
                      if (videoRef.current) videoRef.current.playbackRate = s;
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
              <Button onClick={handleInstantClip} size="sm" className="gap-1.5 shadow-lg bg-primary/90 backdrop-blur-sm">
                <Scissors className="h-4 w-4" /> Clip (±5s)
              </Button>
            </div>
            {/* Clip saved toast - visible even in fullscreen */}
            {clipSavedToast && (
              <div className="absolute bottom-4 right-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <Scissors className="h-4 w-4" />
                Clip saved
              </div>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Film className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Video file expired. Clips and annotations preserved below.</p>
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

                  {clip.ai_status === 'pending' && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-500 bg-amber-500/10">Pending</Badge>
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
                  {linkedReportIds.length > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover/clip:opacity-100 text-muted-foreground hover:text-primary shrink-0"
                      onClick={() => handleOpenAttachClip(clip)}
                      title="Attach to report action"
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
                    type="number"
                    step="0.00001"
                    defaultValue={clip.action_score != null ? clip.action_score : ""}
                    onBlur={e => {
                      const val = e.target.value === "" ? null : parseFloat(e.target.value);
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Export Clips</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
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
                  <Select value={exportPlayerId} onValueChange={handleExportPlayerChange}>
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
                  {exportPlayerId && (
                    <Select value={selectedReportId} onValueChange={setSelectedReportId}>
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
                  <div className="flex gap-2">
                    <Button onClick={handleLinkToReport} disabled={!selectedReportId || exporting} variant="outline" className="flex-1">
                      {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                      Link Clips
                    </Button>
                    <Button onClick={handleExportToReport} disabled={!selectedReportId || exporting || selectedVideo.clips.length === 0} className="flex-1">
                      {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                      Export as Actions
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Add {selectedVideo.clips.length} clip(s) to an analysis point's videos.
                  </p>
                  <Select value={selectedAnalysisId} onValueChange={(v) => { setSelectedAnalysisId(v); setSelectedPointIndex(null); }}>
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
                  {selectedAnalysisId && (() => {
                    const analysis = availableAnalyses.find(a => a.id === selectedAnalysisId);
                    if (!analysis || analysis.points.length === 0) return (
                      <p className="text-sm text-muted-foreground">No points on this analysis. Add points first.</p>
                    );
                    return (
                      <Select value={selectedPointIndex !== null ? String(selectedPointIndex) : ""} onValueChange={(v) => setSelectedPointIndex(parseInt(v))}>
                        <SelectTrigger><SelectValue placeholder="Select point" /></SelectTrigger>
                        <SelectContent>
                          {analysis.points.map((pt: any, idx: number) => (
                            <SelectItem key={idx} value={String(idx)}>
                              Point {idx + 1}{pt.title ? ` — ${pt.title}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  })()}
                  <Button
                    onClick={handleExportToAnalysisPoint}
                    disabled={!selectedAnalysisId || selectedPointIndex === null || exporting}
                    className="w-full"
                  >
                    {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                    Add Clips to Point
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Attach clip to report action dialog */}
        <Dialog open={showAttachDialog} onOpenChange={(open) => { setShowAttachDialog(open); if (!open) setShowActionsWithClips(false); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Attach Clip to Action</DialogTitle>
            </DialogHeader>
            <div className="max-h-[400px] overflow-y-auto">
              {loadingAttachActions ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : linkedReportActions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Paperclip className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No actions found on linked reports.</p>
                  <p className="text-xs mt-1">Add actions to the performance report first.</p>
                </div>
              ) : (() => {
                const actionsWithoutClip = linkedReportActions.filter(a => !a.video_url);
                const actionsWithClip = linkedReportActions.filter(a => !!a.video_url);
                return (
                  <>
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
                  </>
                );
              })()}
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
        <Button onClick={() => setShowUpload(!showUpload)} variant={showUpload ? "secondary" : "default"}>
          {showUpload ? <><X className="h-4 w-4 mr-2" /> Cancel</> : <><Plus className="h-4 w-4 mr-2" /> Upload Match</>}
        </Button>
      </div>

      {showUpload && (
        <Card className="border-primary/30">
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Input placeholder="Match title (e.g. vs Arsenal - PL R23)" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                <Select value={newPlayerId} onValueChange={setNewPlayerId}>
                  <SelectTrigger><SelectValue placeholder="Link to player (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {players.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Opponent" value={newOpponent} onChange={e => setNewOpponent(e.target.value)} />
                  <Input type="date" value={newMatchDate} onChange={e => setNewMatchDate(e.target.value)} />
                </div>
              </div>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors min-h-[140px]"
              >
                <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
                {uploadFile ? (
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
                    <p className="text-sm text-muted-foreground">Drop or click to upload full match</p>
                    <p className="text-[10px] text-muted-foreground">No size limit. Auto-deletes after 7 days (clips/notes kept).</p>
                  </div>
                )}
              </div>
            </div>
            <Button onClick={handleCreate} disabled={!newTitle || !uploadFile || creating} className="w-full mt-4">
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...
                  {uploadFile && (
                    <span className="ml-2 text-xs opacity-80">
                      {(uploadedBytes / (1024 * 1024)).toFixed(1)} / {(uploadFile.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  )}
                </>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> Upload Match Video</>
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
            {videos.map(video => {
              const expiry = daysUntilExpiry(video.auto_delete_at);
              return (
                <div
                  key={video.id}
                  onClick={() => setSelectedVideo(video)}
                  className="p-4 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{video.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {video.opponent && <span className="text-xs text-muted-foreground">vs {video.opponent}</span>}
                        {video.annotations.length > 0 && <Badge variant="secondary" className="text-xs">{video.annotations.length} notes</Badge>}
                        {video.clips.length > 0 && <Badge variant="outline" className="text-xs">{video.clips.length} clips</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {video.match_date && <p className="text-xs text-muted-foreground">{format(new Date(video.match_date), "dd MMM yyyy")}</p>}
                        {expiry !== null && (
                          <span className={`text-xs ${expiry <= 2 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            <Clock className="h-3 w-3 inline mr-0.5" />{expiry}d left
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary shrink-0" title="Extend deletion by 7 days" onClick={e => { 
                        e.stopPropagation(); 
                        const newDate = new Date(video.auto_delete_at ? new Date(video.auto_delete_at).getTime() + 7 * 86400000 : Date.now() + 14 * 86400000);
                        supabase.from('video_analyses').update({ auto_delete_at: newDate.toISOString() }).eq('id', video.id).then(({ error }) => {
                          if (error) { toast.error('Failed to extend'); return; }
                          toast.success('Deletion extended by 7 days');
                          // Refresh video list
                          setVideos(prev => prev.map(v => v.id === video.id ? { ...v, auto_delete_at: newDate.toISOString() } : v));
                        });
                      }}>
                        <Clock className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={e => { e.stopPropagation(); handleDeleteVideo(video.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Searchable / typeable action type combobox ──
function ActionTypeCombobox({
  value,
  onChange,
  actionTypes,
  compact = false,
}: {
  value: string;
  onChange: (v: string) => void;
  actionTypes: string[];
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = actionTypes.filter(t =>
    t.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (v: string) => {
    onChange(v);
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
          variant="outline"
          size="sm"
          className={`justify-between ${compact ? 'h-7 text-[10px] w-[110px]' : 'w-[130px]'}`}
        >
          {toTitleCase(value) || "Action type"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search or type..."
            value={search}
            onValueChange={setSearch}
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
