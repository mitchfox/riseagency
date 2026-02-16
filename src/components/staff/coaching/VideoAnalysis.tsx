import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Film, Plus, Play, Trash2, Loader2, Upload, MessageSquare, Scissors, Clock, Tag, X, ChevronLeft, Minus, ChevronsLeft, ChevronsRight, Edit3, Link2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Slider } from "@/components/ui/slider";

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
  created_at: string;
}

const ACTION_TYPES = [
  "pressing", "build-up", "transition", "set-piece", "defensive", "attacking", "individual", "other"
];

const ACTION_COLOURS: Record<string, string> = {
  pressing: "bg-red-500/20 text-red-400 border-red-500/30",
  "build-up": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  transition: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "set-piece": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  defensive: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  attacking: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  individual: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  other: "bg-muted text-muted-foreground border-border",
};

export const VideoAnalysis = () => {
  const [videos, setVideos] = useState<VideoAnalysisEntry[]>([]);
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoAnalysisEntry | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [filterAction, setFilterAction] = useState("all");
  const [activeTab, setActiveTab] = useState<"annotations" | "clips">("annotations");
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

  useEffect(() => {
    fetchVideos();
    fetchPlayers();
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
      })));
    }
    setLoading(false);
  };

  const fetchPlayers = async () => {
    const { data } = await supabase.from("players").select("id, name").order("name");
    if (data) setPlayers(data);
  };

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
        const entry = { ...data, annotations: [] as Annotation[], clips: [] as Clip[], match_minute_offset: 0 };
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

  // Instant clip: 5s before, 5s after current time
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
      action_type: annotationAction,
      created_at: new Date().toISOString(),
    };

    const updatedClips = [...selectedVideo.clips, newClip].sort((a, b) => a.start - b.start);
    await saveClips(updatedClips);
    toast.success(`Clip created: ${fmtTime(clipStart)} → ${fmtTime(clipEnd)}`);
    setActiveTab("clips");
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

  const saveClips = async (clips: Clip[]) => {
    if (!selectedVideo) return;
    const sorted = clips.sort((a, b) => a.start - b.start);
    const { error } = await supabase
      .from("video_analyses")
      .update({ clips: sorted as any })
      .eq("id", selectedVideo.id);

    if (!error) {
      const updated = { ...selectedVideo, clips: sorted };
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

  // Timestamp override: sets offset so that current video position = entered match minute
  const handleTimestampOverride = async () => {
    if (!selectedVideo || !videoRef.current || !overrideMinute) return;
    const currentVideoTime = videoRef.current.currentTime;
    const targetMatchSeconds = parseFloat(overrideMinute) * 60;
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
      toast.success(`Timestamp synced: this point is now ${overrideMinute}'`);
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

  const fmtTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Match time = video time + offset, snapped to nearest 5s for report linking
  const fmtMatchTime = (videoSeconds: number, offset: number) => {
    const matchSeconds = videoSeconds + offset;
    const mins = Math.floor(matchSeconds / 60);
    const secs = Math.floor(matchSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMatchMinute = (videoSeconds: number, offset: number) => {
    const matchSeconds = videoSeconds + offset;
    // Snap to nearest 5 second marker before
    const snapped = Math.floor(matchSeconds / 5) * 5;
    return Math.floor(snapped / 60);
  };

  const filteredAnnotations = selectedVideo
    ? filterAction === "all" ? selectedVideo.annotations : selectedVideo.annotations.filter(a => a.action_type === filterAction)
    : [];

  const filteredClips = selectedVideo
    ? filterAction === "all" ? selectedVideo.clips : selectedVideo.clips.filter(c => c.action_type === filterAction)
    : [];

  const daysUntilExpiry = (dateStr: string | null) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

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

      {/* Inline Upload Panel */}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video List */}
        <div className="lg:col-span-1 space-y-2 max-h-[700px] overflow-y-auto">
          {videos.length === 0 && !showUpload ? (
            <div className="text-center py-8 text-muted-foreground">
              <Film className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No match videos yet</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowUpload(true)}>
                <Upload className="h-4 w-4 mr-1" /> Upload First Match
              </Button>
            </div>
          ) : (
            videos.map(video => {
              const expiry = daysUntilExpiry(video.auto_delete_at);
              return (
                <div
                  key={video.id}
                  onClick={() => setSelectedVideo(video)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedVideo?.id === video.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
                  }`}
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
            })
          )}
        </div>

        {/* Video Player & Tools */}
        {selectedVideo ? (
          <div className="lg:col-span-2 space-y-4">
            {selectedVideo.video_url ? (
              <>
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <video ref={videoRef} src={selectedVideo.video_url} controls className="w-full bg-black" />
                  </CardContent>
                </Card>

                {/* Action bar */}
                <div className="flex flex-wrap gap-2 items-center">
                  {/* Instant clip button */}
                  <Button onClick={handleInstantClip} variant="default" size="sm" className="gap-1.5">
                    <Scissors className="h-4 w-4" /> Clip (±5s)
                  </Button>

                  {/* Annotation quick-add */}
                  <div className="flex-1 flex gap-2 min-w-[200px]">
                    <Input
                      placeholder="Add note..."
                      value={annotationText}
                      onChange={e => setAnnotationText(e.target.value)}
                      className="flex-1"
                      onKeyDown={e => e.key === 'Enter' && handleAddAnnotation()}
                    />
                    <Select value={annotationAction} onValueChange={setAnnotationAction}>
                      <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ACTION_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAddAnnotation} disabled={!annotationText} size="sm" variant="secondary">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Timestamp sync */}
                  <Button
                    onClick={() => setShowTimestampOverride(!showTimestampOverride)}
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    title="Sync video time to match minute"
                  >
                    <Clock className="h-3.5 w-3.5" /> Sync
                  </Button>
                </div>

                {/* Timestamp override panel */}
                {showTimestampOverride && (
                  <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border text-sm">
                    <span className="text-muted-foreground whitespace-nowrap">Current position =</span>
                    <Input
                      type="number"
                      placeholder="Match minute"
                      value={overrideMinute}
                      onChange={e => setOverrideMinute(e.target.value)}
                      className="w-24"
                    />
                    <span className="text-muted-foreground">'</span>
                    <Button onClick={handleTimestampOverride} size="sm" disabled={!overrideMinute}>Apply</Button>
                    <span className="text-[10px] text-muted-foreground flex-1">All timestamps after this point will adjust. Does not affect earlier clips.</span>
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Film className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Video file expired. Clips and annotations preserved below.</p>
                </CardContent>
              </Card>
            )}

            {/* Tabs + filter */}
            <div className="flex items-center gap-3">
              <div className="flex rounded-lg border overflow-hidden">
                <button onClick={() => setActiveTab("annotations")} className={`px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === "annotations" ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"}`}>
                  Notes ({selectedVideo.annotations.length})
                </button>
                <button onClick={() => setActiveTab("clips")} className={`px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === "clips" ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"}`}>
                  Clips ({selectedVideo.clips.length})
                </button>
              </div>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {ACTION_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Annotations */}
            {activeTab === "annotations" && (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {filteredAnnotations.map(ann => (
                  <div key={ann.id} className="flex items-start gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors group">
                    <button onClick={() => jumpToTimestamp(ann.timestamp)} className="flex items-center gap-1 text-primary hover:underline font-mono text-xs whitespace-nowrap">
                      <Play className="h-3 w-3" />
                      {fmtMatchTime(ann.timestamp, selectedVideo.match_minute_offset)}
                    </button>
                    <p className="text-sm flex-1">{ann.text}</p>
                    <Badge variant="outline" className={`text-[10px] capitalize border ${ACTION_COLOURS[ann.action_type] || ''}`}>{ann.action_type}</Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteAnnotation(ann.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {filteredAnnotations.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No annotations yet.</p>}
              </div>
            )}

            {/* Clips */}
            {activeTab === "clips" && (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredClips.map(clip => (
                  <div key={clip.id} className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors group">
                    <div className="flex items-start gap-3">
                      <button onClick={() => playClip(clip)} className="flex items-center gap-1 text-primary hover:underline font-mono text-xs whitespace-nowrap mt-0.5">
                        <Play className="h-3 w-3" />
                        {fmtTime(clip.start)} → {fmtTime(clip.end)}
                      </button>
                      <div className="flex-1 min-w-0">
                        {editingClipId === clip.id ? (
                          <Input
                            defaultValue={clip.label}
                            autoFocus
                            onBlur={e => handleUpdateClipLabel(clip.id, e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleUpdateClipLabel(clip.id, (e.target as HTMLInputElement).value)}
                            className="h-7 text-sm"
                          />
                        ) : (
                          <p className="text-sm truncate cursor-pointer hover:text-primary" onClick={() => setEditingClipId(clip.id)}>
                            {clip.label}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Match: {fmtMatchTime(clip.start, selectedVideo.match_minute_offset)} → {fmtMatchTime(clip.end, selectedVideo.match_minute_offset)}
                          {' · '}Report minute: {getMatchMinute(clip.start, selectedVideo.match_minute_offset)}'
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] capitalize border shrink-0 ${ACTION_COLOURS[clip.action_type] || ''}`}>{clip.action_type}</Badge>
                    </div>
                    {/* Clip adjust controls */}
                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-muted-foreground mr-1">Adjust:</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleExtendClip(clip.id, 'start', -1)} title="Extend start -1s">
                        <ChevronsLeft className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleExtendClip(clip.id, 'start', 1)} title="Trim start +1s">
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <span className="text-[9px] text-muted-foreground mx-1">|</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleExtendClip(clip.id, 'end', -1)} title="Trim end -1s">
                        <ChevronLeft className="h-3 w-3 rotate-180" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleExtendClip(clip.id, 'end', 1)} title="Extend end +1s">
                        <ChevronsRight className="h-3 w-3" />
                      </Button>
                      <div className="flex-1" />
                      <Select value={clip.action_type} onValueChange={v => handleUpdateClipAction(clip.id, v)}>
                        <SelectTrigger className="h-6 w-[100px] text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ACTION_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize text-xs">{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteClip(clip.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredClips.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No clips yet. Press "Clip (±5s)" during playback to create instant clips.</p>}
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center py-12 text-muted-foreground">
            <div className="text-center">
              <Film className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>Select a match video to begin analysis</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
