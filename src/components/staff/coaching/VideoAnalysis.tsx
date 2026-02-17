import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Film, Plus, Play, Trash2, Loader2, Upload, MessageSquare, Scissors, Clock, X, ChevronLeft, ChevronsLeft, ChevronsRight, ArrowLeft, Download, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AnnotationEditor } from "@/components/staff/annotations/AnnotationEditor";
import type { AnnotationProject, Klip } from "@/components/staff/annotations/AnnotationProjects";

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
  "pressing", "build-up", "transition", "set-piece", "defensive", "attacking",
  "individual", "dribble", "pass", "cross", "shot", "tackle", "interception",
  "header", "save", "clearance", "foul", "free-kick", "corner", "throw-in",
  "goal-kick", "penalty", "offside", "substitution", "other"
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
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
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

  // Export to report
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [availableReports, setAvailableReports] = useState<{ id: string; title: string; player_name: string }[]>([]);
  const [selectedReportId, setSelectedReportId] = useState("");
  const [exportPlayerId, setExportPlayerId] = useState("");
  const [exporting, setExporting] = useState(false);

  // Half-time sync
  const [syncHalf, setSyncHalf] = useState<"1st" | "2nd">("1st");

  // Inline annotation
  const [annotatingClip, setAnnotatingClip] = useState<Clip | null>(null);
  const [annotationProject, setAnnotationProject] = useState<AnnotationProject | null>(null);

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
    const { data } = await supabase.from("players").select("id, name").order("name");
    if (data) setPlayers(data);
  };

  const fetchKnownActionTypes = async () => {
    const { data } = await supabase
      .from("performance_report_actions")
      .select("action_type")
      .not("action_type", "is", null);
    if (data) {
      const unique = [...new Set(data.map(d => d.action_type).filter(Boolean) as string[])];
      setKnownActionTypes(unique);
    }
  };

  const allActionTypes = useMemo(() => {
    const merged = new Set([...DEFAULT_ACTION_TYPES, ...knownActionTypes]);
    return [...merged].sort();
  }, [knownActionTypes]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadFile(file);
  };

  const handleCreate = async () => {
    if (!newTitle || !uploadFile) return;
    setCreating(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;

      const ext = uploadFile.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("analysis-videos")
        .upload(filePath, uploadFile, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("analysis-videos")
        .getPublicUrl(filePath);

      const autoDeleteAt = new Date();
      autoDeleteAt.setDate(autoDeleteAt.getDate() + 7);

      const insertData: any = {
        title: newTitle,
        video_url: urlData.publicUrl,
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
        toast.success("Video uploaded successfully");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload video");
    }
    setCreating(false);
  };

  const handleInstantClip = async () => {
    if (!selectedVideo || !videoRef.current) return;

    const currentTime = videoRef.current.currentTime;
    const clipStart = Math.max(0, currentTime - 5);
    const clipEnd = Math.min(videoRef.current.duration || currentTime + 5, currentTime + 5);

    const newClip: Clip = {
      id: crypto.randomUUID(),
      start: clipStart,
      end: clipEnd,
      label: `Action at ${fmtMatchTime(currentTime, selectedVideo.match_minute_offset)}`,
      action_type: "",
      action_description: "",
      notes: "",
      created_at: new Date().toISOString(),
    };

    const updatedClips = [...selectedVideo.clips, newClip];
    await saveClips(updatedClips);
    toast.success(`Clip created: ${fmtTime(clipStart)} → ${fmtTime(clipEnd)}`);
  };

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
    videoRef.current.currentTime = clip.start;
    videoRef.current.play();
    const checkEnd = () => {
      if (videoRef.current && videoRef.current.currentTime >= clip.end) {
        videoRef.current.pause();
        videoRef.current.removeEventListener('timeupdate', checkEnd);
      }
    };
    videoRef.current.addEventListener('timeupdate', checkEnd);
  };

  const handleDeleteVideo = async (id: string) => {
    const video = videos.find(v => v.id === id);
    if (video?.video_url?.includes('analysis-videos')) {
      const path = video.video_url.split('analysis-videos/')[1];
      if (path) await supabase.storage.from('analysis-videos').remove([path]);
    }
    const { error } = await supabase.from("video_analyses").delete().eq("id", id);
    if (!error) {
      setVideos(prev => prev.filter(v => v.id !== id));
      if (selectedVideo?.id === id) setSelectedVideo(null);
      toast.success("Deleted");
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
    setAvailableReports([]);
    setShowExportDialog(true);
  };

  const handleExportPlayerChange = async (playerId: string) => {
    setExportPlayerId(playerId);
    setSelectedReportId("");
    const { data } = await supabase
      .from("analyses")
      .select("id, title, player_name")
      .eq("analysis_type", "performance")
      .eq("player_name", players.find(p => p.id === playerId)?.name || "")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      setAvailableReports(data.map(d => ({
        id: d.id,
        title: d.title || "Untitled Report",
        player_name: d.player_name || "Unknown",
      })));
    }
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

      const actionsToInsert = selectedVideo.clips.map((clip, i) => ({
        analysis_id: selectedReportId,
        action_number: nextNumber + i,
        minute: getMatchMinute(clip.start, selectedVideo.match_minute_offset),
        action_type: clip.action_type || "other",
        action_description: clip.action_description || clip.label,
        notes: clip.notes || null,
        video_url: selectedVideo.video_url || null,
        video_analysis_id: selectedVideo.id,
        clip_id: clip.id,
        is_successful: true,
      }));

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

  const getMatchMinute = (videoSeconds: number, _offset: number) => {
    const offset = getEffectiveOffset(videoSeconds);
    const matchSeconds = videoSeconds + offset;
    const snapped = Math.floor(matchSeconds / 5) * 5;
    return Math.floor(snapped / 60);
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
                <Download className="h-3.5 w-3.5" /> Export to Report
              </Button>
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
              controls
              className="w-full aspect-video"
            />
            {/* Clip button overlay */}
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 opacity-0 group-hover/player:opacity-100 transition-opacity flex gap-2">
              <Button onClick={handleInstantClip} size="sm" className="gap-1.5 shadow-lg bg-primary/90 backdrop-blur-sm">
                <Scissors className="h-4 w-4" /> Clip (±5s)
              </Button>
            </div>
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
          <h4 className="text-sm font-medium mb-1">Clips ({selectedVideo.clips.length})</h4>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {clipsNewestFirst.map(clip => (
              <div key={clip.id} className="p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors group/clip">
                <div className="flex items-center gap-2">
                  <button onClick={() => playClip(clip)} className="flex items-center gap-1 text-primary hover:underline font-mono text-xs whitespace-nowrap shrink-0">
                    <Play className="h-3 w-3" />
                    {fmtTime(clip.start)} → {fmtTime(clip.end)}
                  </button>
                  <p className="text-[10px] text-muted-foreground shrink-0">
                    {getMatchMinute(clip.start, selectedVideo.match_minute_offset)}'
                  </p>

                  <ActionTypeCombobox
                    value={clip.action_type}
                    onChange={(v) => handleUpdateClipAction(clip.id, v)}
                    actionTypes={allActionTypes}
                    compact
                  />

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
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/clip:opacity-100 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDeleteClip(clip.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <div className="mt-1.5 grid grid-cols-1 md:grid-cols-2 gap-1.5">
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
            {annotationProject && (
              <AnnotationEditor
                project={annotationProject}
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

        {/* Export dialog with player picker first */}
        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Export Clips to Performance Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {selectedVideo.clips.length} clip(s) will be added as additional actions to the selected report.
              </p>
              <Select value={exportPlayerId} onValueChange={handleExportPlayerChange}>
                <SelectTrigger><SelectValue placeholder="Select player first" /></SelectTrigger>
                <SelectContent>
                  {players.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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
              <Button onClick={handleExportToReport} disabled={!selectedReportId || exporting} className="w-full">
                {exporting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Exporting...</> : <><Download className="h-4 w-4 mr-2" /> Export Actions</>}
              </Button>
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
              {creating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...</> : <><Upload className="h-4 w-4 mr-2" /> Upload Match Video</>}
            </Button>
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={e => { e.stopPropagation(); handleDeleteVideo(video.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
      onChange(search.trim().toLowerCase());
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
          className={`justify-between capitalize ${compact ? 'h-7 text-[10px] w-[110px]' : 'w-[130px]'}`}
        >
          {value || "Action type"}
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
                  Use "{search.trim()}"
                </button>
              ) : (
                <span className="text-muted-foreground text-sm">No matches</span>
              )}
            </CommandEmpty>
            <CommandGroup>
              {filtered.map(t => (
                <CommandItem key={t} value={t} onSelect={() => handleSelect(t)} className="capitalize cursor-pointer">
                  {t}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
