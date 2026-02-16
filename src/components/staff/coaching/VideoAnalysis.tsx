import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Film, Plus, Play, Trash2, Loader2, Upload, MessageSquare, Scissors, Clock, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";

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
  const [showCreate, setShowCreate] = useState(false);
  const [filterAction, setFilterAction] = useState("all");
  const [activeTab, setActiveTab] = useState<"annotations" | "clips">("annotations");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Create form
  const [newTitle, setNewTitle] = useState("");
  const [newPlayerId, setNewPlayerId] = useState("");
  const [newOpponent, setNewOpponent] = useState("");
  const [newMatchDate, setNewMatchDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Annotation form
  const [annotationText, setAnnotationText] = useState("");
  const [annotationAction, setAnnotationAction] = useState("other");

  // Clip form
  const [clipMode, setClipMode] = useState(false);
  const [clipStart, setClipStart] = useState<number | null>(null);
  const [clipLabel, setClipLabel] = useState("");
  const [clipAction, setClipAction] = useState("other");

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
    setUploadProgress(0);

    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;

      // Upload to storage
      const ext = uploadFile.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${ext}`;

      // Use XMLHttpRequest for progress tracking
      const formData = new FormData();
      formData.append('', uploadFile);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("analysis-videos")
        .upload(filePath, uploadFile, {
          cacheControl: '3600',
          upsert: false,
        });

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
      };
      if (newPlayerId && newPlayerId !== "none") insertData.player_id = newPlayerId;

      const { data, error } = await supabase
        .from("video_analyses")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setVideos(prev => [{ ...data, annotations: [], clips: [] }, ...prev]);
        setShowCreate(false);
        setNewTitle("");
        setUploadFile(null);
        setNewPlayerId("");
        setNewOpponent("");
        setNewMatchDate("");
        toast.success("Video uploaded and analysis created");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload video");
    }
    setCreating(false);
    setUploadProgress(0);
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

    const updatedAnnotations = [...selectedVideo.annotations, newAnnotation]
      .sort((a, b) => a.timestamp - b.timestamp);

    const { error } = await supabase
      .from("video_analyses")
      .update({ annotations: updatedAnnotations as any })
      .eq("id", selectedVideo.id);

    if (!error) {
      const updated = { ...selectedVideo, annotations: updatedAnnotations };
      setSelectedVideo(updated);
      setVideos(prev => prev.map(v => v.id === selectedVideo.id ? updated : v));
      setAnnotationText("");
      toast.success(`Annotation added at ${fmtTime(timestamp)}`);
    }
  };

  const handleDeleteAnnotation = async (annId: string) => {
    if (!selectedVideo) return;
    const updatedAnnotations = selectedVideo.annotations.filter(a => a.id !== annId);

    const { error } = await supabase
      .from("video_analyses")
      .update({ annotations: updatedAnnotations as any })
      .eq("id", selectedVideo.id);

    if (!error) {
      const updated = { ...selectedVideo, annotations: updatedAnnotations };
      setSelectedVideo(updated);
      setVideos(prev => prev.map(v => v.id === selectedVideo.id ? updated : v));
    }
  };

  // Clipping
  const handleMarkClipStart = () => {
    if (!videoRef.current) return;
    setClipStart(videoRef.current.currentTime);
    setClipMode(true);
    toast.info(`Clip start marked at ${fmtTime(videoRef.current.currentTime)}`);
  };

  const handleSaveClip = async () => {
    if (!selectedVideo || !videoRef.current || clipStart === null || !clipLabel) return;

    const clipEnd = videoRef.current.currentTime;
    if (clipEnd <= clipStart) {
      toast.error("Clip end must be after clip start");
      return;
    }

    const newClip: Clip = {
      id: crypto.randomUUID(),
      start: clipStart,
      end: clipEnd,
      label: clipLabel,
      action_type: clipAction,
      created_at: new Date().toISOString(),
    };

    const updatedClips = [...selectedVideo.clips, newClip].sort((a, b) => a.start - b.start);

    const { error } = await supabase
      .from("video_analyses")
      .update({ clips: updatedClips as any })
      .eq("id", selectedVideo.id);

    if (!error) {
      const updated = { ...selectedVideo, clips: updatedClips };
      setSelectedVideo(updated);
      setVideos(prev => prev.map(v => v.id === selectedVideo.id ? updated : v));
      setClipMode(false);
      setClipStart(null);
      setClipLabel("");
      setClipAction("other");
      toast.success(`Clip saved: ${fmtTime(newClip.start)} → ${fmtTime(newClip.end)}`);
    }
  };

  const handleDeleteClip = async (clipId: string) => {
    if (!selectedVideo) return;
    const updatedClips = selectedVideo.clips.filter(c => c.id !== clipId);

    const { error } = await supabase
      .from("video_analyses")
      .update({ clips: updatedClips as any })
      .eq("id", selectedVideo.id);

    if (!error) {
      const updated = { ...selectedVideo, clips: updatedClips };
      setSelectedVideo(updated);
      setVideos(prev => prev.map(v => v.id === selectedVideo.id ? updated : v));
    }
  };

  const playClip = (clip: Clip) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = clip.start;
    videoRef.current.play();
    // Auto-pause at end
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
    // Delete storage file too
    if (video?.video_url?.includes('analysis-videos')) {
      const path = video.video_url.split('analysis-videos/')[1];
      if (path) await supabase.storage.from('analysis-videos').remove([path]);
    }
    const { error } = await supabase.from("video_analyses").delete().eq("id", id);
    if (!error) {
      setVideos(prev => prev.filter(v => v.id !== id));
      if (selectedVideo?.id === id) setSelectedVideo(null);
      toast.success("Video analysis deleted");
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

  const filteredAnnotations = selectedVideo
    ? filterAction === "all"
      ? selectedVideo.annotations
      : selectedVideo.annotations.filter(a => a.action_type === filterAction)
    : [];

  const filteredClips = selectedVideo
    ? filterAction === "all"
      ? selectedVideo.clips
      : selectedVideo.clips.filter(c => c.action_type === filterAction)
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
          <p className="text-muted-foreground">Upload match footage, annotate key moments, and clip actions</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Video
        </Button>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Match Video</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            
            {/* File upload area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              {uploadFile ? (
                <div className="space-y-2">
                  <Film className="h-8 w-8 mx-auto text-primary" />
                  <p className="font-medium text-sm">{uploadFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(uploadFile.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                  >
                    <X className="h-3 w-3 mr-1" /> Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to select video file</p>
                  <p className="text-xs text-muted-foreground">No size limit. Full matches auto-delete after 7 days (annotations and clips are kept).</p>
                </div>
              )}
            </div>

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
            <Button onClick={handleCreate} disabled={!newTitle || !uploadFile || creating} className="w-full">
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload &amp; Create
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video List */}
        <div className="lg:col-span-1 space-y-2 max-h-[700px] overflow-y-auto">
          {videos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Film className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No video analyses yet</p>
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
                        <Badge variant="secondary" className="text-xs">{video.annotations.length} notes</Badge>
                        {video.clips.length > 0 && (
                          <Badge variant="outline" className="text-xs">{video.clips.length} clips</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {video.match_date && (
                          <p className="text-xs text-muted-foreground">{format(new Date(video.match_date), "dd MMM yyyy")}</p>
                        )}
                        {expiry !== null && (
                          <span className={`text-xs ${expiry <= 2 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            <Clock className="h-3 w-3 inline mr-0.5" />
                            {expiry}d left
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={e => { e.stopPropagation(); handleDeleteVideo(video.id); }}
                    >
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
              <Card>
                <CardContent className="p-4">
                  <video
                    ref={videoRef}
                    src={selectedVideo.video_url}
                    controls
                    className="w-full rounded-lg bg-black"
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Film className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Video file expired. Annotations and clips are preserved below.</p>
                </CardContent>
              </Card>
            )}

            {/* Toolbar */}
            {selectedVideo.video_url && (
              <div className="flex flex-col gap-3">
                {/* Annotation input */}
                <div className="flex flex-col sm:flex-row gap-2 p-3 bg-muted/30 rounded-lg border">
                  <Input
                    placeholder="Add note at current timestamp..."
                    value={annotationText}
                    onChange={e => setAnnotationText(e.target.value)}
                    className="flex-1"
                    onKeyDown={e => e.key === 'Enter' && handleAddAnnotation()}
                  />
                  <Select value={annotationAction} onValueChange={setAnnotationAction}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map(t => (
                        <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddAnnotation} disabled={!annotationText} size="sm">
                    <MessageSquare className="h-4 w-4 mr-1" /> Note
                  </Button>
                </div>

                {/* Clip controls */}
                <div className="flex flex-col sm:flex-row gap-2 p-3 bg-muted/30 rounded-lg border">
                  {!clipMode ? (
                    <Button onClick={handleMarkClipStart} variant="outline" size="sm" className="w-full sm:w-auto">
                      <Scissors className="h-4 w-4 mr-1" /> Mark Clip Start
                    </Button>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                        <Scissors className="h-4 w-4 text-primary" />
                        Start: {fmtTime(clipStart!)}
                      </div>
                      <Input
                        placeholder="Clip label..."
                        value={clipLabel}
                        onChange={e => setClipLabel(e.target.value)}
                        className="flex-1"
                      />
                      <Select value={clipAction} onValueChange={setClipAction}>
                        <SelectTrigger className="w-full sm:w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTION_TYPES.map(t => (
                            <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={handleSaveClip} disabled={!clipLabel} size="sm">
                        <Tag className="h-4 w-4 mr-1" /> Save Clip
                      </Button>
                      <Button
                        onClick={() => { setClipMode(false); setClipStart(null); setClipLabel(""); }}
                        variant="ghost"
                        size="sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Tab toggle + filter */}
            <div className="flex items-center gap-3">
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  onClick={() => setActiveTab("annotations")}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === "annotations" ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
                  }`}
                >
                  Notes ({selectedVideo.annotations.length})
                </button>
                <button
                  onClick={() => setActiveTab("clips")}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === "clips" ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
                  }`}
                >
                  Clips ({selectedVideo.clips.length})
                </button>
              </div>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {ACTION_TYPES.map(t => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Annotations List */}
            {activeTab === "annotations" && (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredAnnotations.map((ann) => (
                  <div key={ann.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors group">
                    <button
                      onClick={() => jumpToTimestamp(ann.timestamp)}
                      className="flex items-center gap-1 text-primary hover:underline font-mono text-sm whitespace-nowrap"
                    >
                      <Play className="h-3 w-3" />
                      {fmtTime(ann.timestamp)}
                    </button>
                    <p className="text-sm flex-1">{ann.text}</p>
                    <Badge variant="outline" className={`text-xs capitalize border ${ACTION_COLOURS[ann.action_type] || ''}`}>
                      {ann.action_type}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteAnnotation(ann.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {filteredAnnotations.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">No annotations yet. Play the video and add notes at key moments.</p>
                )}
              </div>
            )}

            {/* Clips List */}
            {activeTab === "clips" && (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredClips.map((clip) => (
                  <div key={clip.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors group">
                    <button
                      onClick={() => playClip(clip)}
                      className="flex items-center gap-1 text-primary hover:underline font-mono text-sm whitespace-nowrap"
                    >
                      <Play className="h-3 w-3" />
                      {fmtTime(clip.start)} → {fmtTime(clip.end)}
                    </button>
                    <p className="text-sm flex-1">{clip.label}</p>
                    <Badge variant="outline" className={`text-xs capitalize border ${ACTION_COLOURS[clip.action_type] || ''}`}>
                      {clip.action_type}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteClip(clip.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {filteredClips.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">No clips yet. Use "Mark Clip Start" then navigate to the end point and save.</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center py-12 text-muted-foreground">
            <div className="text-center">
              <Film className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>Select a video from the list to view and annotate</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
