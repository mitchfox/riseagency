import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Film, Plus, Play, Clock, Trash2, Loader2, Upload, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Annotation {
  timestamp: number;
  text: string;
  action_type: string;
}

interface VideoAnalysisEntry {
  id: string;
  title: string;
  video_url: string;
  player_id: string | null;
  match_date: string | null;
  opponent: string | null;
  annotations: Annotation[];
  created_at: string;
}

const ACTION_TYPES = [
  "pressing", "build-up", "transition", "set-piece", "defensive", "attacking", "individual", "other"
];

export const VideoAnalysis = () => {
  const [videos, setVideos] = useState<VideoAnalysisEntry[]>([]);
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoAnalysisEntry | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterAction, setFilterAction] = useState("all");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newPlayerId, setNewPlayerId] = useState("");
  const [newOpponent, setNewOpponent] = useState("");
  const [newMatchDate, setNewMatchDate] = useState("");
  const [creating, setCreating] = useState(false);

  // Annotation form state
  const [annotationText, setAnnotationText] = useState("");
  const [annotationAction, setAnnotationAction] = useState("other");

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
      })));
    }
    setLoading(false);
  };

  const fetchPlayers = async () => {
    const { data } = await supabase.from("players").select("id, name").order("name");
    if (data) setPlayers(data);
  };

  const handleCreate = async () => {
    if (!newTitle || !newUrl) return;
    setCreating(true);

    const { data: session } = await supabase.auth.getSession();

    const { data, error } = await supabase
      .from("video_analyses")
      .insert({
        title: newTitle,
        video_url: newUrl,
        player_id: newPlayerId || null,
        opponent: newOpponent || null,
        match_date: newMatchDate || null,
        created_by: session.session?.user?.id || null,
        annotations: [],
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create video analysis");
    } else if (data) {
      setVideos(prev => [{ ...data, annotations: [] }, ...prev]);
      setShowCreate(false);
      setNewTitle("");
      setNewUrl("");
      setNewPlayerId("");
      setNewOpponent("");
      setNewMatchDate("");
      toast.success("Video analysis created");
    }
    setCreating(false);
  };

  const handleAddAnnotation = async () => {
    if (!selectedVideo || !videoRef.current || !annotationText) return;

    const timestamp = videoRef.current.currentTime;
    const newAnnotation: Annotation = {
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
      setSelectedVideo({ ...selectedVideo, annotations: updatedAnnotations });
      setVideos(prev => prev.map(v => v.id === selectedVideo.id ? { ...v, annotations: updatedAnnotations } : v));
      setAnnotationText("");
      toast.success(`Annotation added at ${formatTimestamp(timestamp)}`);
    }
  };

  const handleDeleteAnnotation = async (index: number) => {
    if (!selectedVideo) return;
    const updatedAnnotations = selectedVideo.annotations.filter((_, i) => i !== index);

    const { error } = await supabase
      .from("video_analyses")
      .update({ annotations: updatedAnnotations as any })
      .eq("id", selectedVideo.id);

    if (!error) {
      setSelectedVideo({ ...selectedVideo, annotations: updatedAnnotations });
      setVideos(prev => prev.map(v => v.id === selectedVideo.id ? { ...v, annotations: updatedAnnotations } : v));
    }
  };

  const handleDeleteVideo = async (id: string) => {
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

  const formatTimestamp = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredAnnotations = selectedVideo
    ? filterAction === "all"
      ? selectedVideo.annotations
      : selectedVideo.annotations.filter(a => a.action_type === filterAction)
    : [];

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bebas mb-2">VIDEO ANALYSIS</h2>
          <p className="text-muted-foreground">Annotate match footage with timestamped notes</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Video
        </Button>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Video Analysis</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            <Input placeholder="Video URL (from storage or external)" value={newUrl} onChange={e => setNewUrl(e.target.value)} />
            <Select value={newPlayerId} onValueChange={setNewPlayerId}>
              <SelectTrigger><SelectValue placeholder="Link to player (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {players.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Opponent" value={newOpponent} onChange={e => setNewOpponent(e.target.value)} />
              <Input type="date" value={newMatchDate} onChange={e => setNewMatchDate(e.target.value)} />
            </div>
            <Button onClick={handleCreate} disabled={!newTitle || !newUrl || creating} className="w-full">
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Film className="h-4 w-4 mr-2" />}
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video List */}
        <div className="lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto">
          {videos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Film className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No video analyses yet</p>
            </div>
          ) : (
            videos.map(video => (
              <div
                key={video.id}
                onClick={() => setSelectedVideo(video)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedVideo?.id === video.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{video.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {video.opponent && <span className="text-xs text-muted-foreground">vs {video.opponent}</span>}
                      <Badge variant="secondary" className="text-xs">{video.annotations.length} notes</Badge>
                    </div>
                    {video.match_date && (
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(video.match_date), "dd MMM yyyy")}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={e => { e.stopPropagation(); handleDeleteVideo(video.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Video Player & Annotations */}
        {selectedVideo ? (
          <div className="lg:col-span-2 space-y-4">
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

            {/* Add Annotation */}
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
                <MessageSquare className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filter:</span>
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
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredAnnotations.map((ann, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors group">
                  <button
                    onClick={() => jumpToTimestamp(ann.timestamp)}
                    className="flex items-center gap-1 text-primary hover:underline font-mono text-sm whitespace-nowrap"
                  >
                    <Play className="h-3 w-3" />
                    {formatTimestamp(ann.timestamp)}
                  </button>
                  <p className="text-sm flex-1">{ann.text}</p>
                  <Badge variant="outline" className="text-xs capitalize">{ann.action_type}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteAnnotation(idx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {filteredAnnotations.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">No annotations yet. Play the video and add notes at key moments.</p>
              )}
            </div>
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
