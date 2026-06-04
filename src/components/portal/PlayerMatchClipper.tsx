import { useState, useEffect, useRef } from "react";
import * as tus from 'tus-js-client';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Film, Plus, Play, Trash2, Loader2, Upload, Scissors, Clock, X, ChevronLeft, ChevronsLeft, ChevronsRight, ArrowLeft, Save, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
interface Clip {
  id: string;
  start: number;
  end: number;
  label: string;
  created_at: string;
}

interface VideoEntry {
  id: string;
  title: string;
  video_url: string;
  opponent: string | null;
  match_date: string | null;
  clips: Clip[];
  auto_delete_at: string | null;
  match_minute_offset: number;
  second_half_offset: number | null;
  second_half_video_time: number | null;
  created_at: string;
}

interface PlayerMatchClipperProps {
  playerId: string;
  playerEmail: string;
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/player-match-clipper`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
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
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const mins = Math.floor(safe / 60);
  const rawSecs = Math.floor(safe % 60);
  const roundedSecs = Math.floor(rawSecs / 5) * 5;
  return `${mins}.${roundedSecs.toString().padStart(2, '0')}`;
};

const callFunction = async (body: any) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token || ANON_KEY;

  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
};

export const PlayerMatchClipper = ({ playerId, playerEmail }: PlayerMatchClipperProps) => {
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoEntry | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Upload form
  const [newTitle, setNewTitle] = useState("");
  const [newOpponent, setNewOpponent] = useState("");
  const [newMatchDate, setNewMatchDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync
  const [showTimestampOverride, setShowTimestampOverride] = useState(false);
  const [overrideMinute, setOverrideMinute] = useState("");
  const [syncHalf, setSyncHalf] = useState<"1st" | "2nd">("1st");

  // Save to clips
  const [savingClipIds, setSavingClipIds] = useState<Set<string>>(new Set());
  const [savedClipIds, setSavedClipIds] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, [playerId]);

  const fetchVideos = async () => {
    try {
      const result = await callFunction({ action: 'list', playerEmail });
      if (result.data) {
        setVideos(result.data.map((v: any) => ({
          ...v,
          clips: (v.clips as Clip[]) || [],
          match_minute_offset: Number(v.match_minute_offset) || 0,
          second_half_offset: v.second_half_offset != null ? Number(v.second_half_offset) : null,
          second_half_video_time: v.second_half_video_time != null ? Number(v.second_half_video_time) : null,
        })));
      }
    } catch (err) {
      console.error('Failed to fetch videos:', err);
    }
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadFile(file);
  };

  const handleCreate = async () => {
    if (!newTitle || !uploadFile) return;

    if (uploadFile.size > MAX_VIDEO_UPLOAD_BYTES) {
      toast.error("This file exceeds the 50GB upload limit");
      return;
    }

    setCreating(true);

    try {
      // Upload file to storage first using TUS resumable protocol
      const ext = uploadFile.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${ext}`;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error("Please sign in again before uploading");
      }

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(uploadFile, {
          endpoint: `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            apikey: ANON_KEY,
            authorization: `Bearer ${accessToken}`,
            'x-upsert': 'false',
          },
          uploadDataDuringCreation: false,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: 'analysis-videos',
            objectName: filePath,
            contentType: uploadFile.type || 'video/mp4',
          },
          chunkSize: 6 * 1024 * 1024,
          onError: (error) => reject(new Error(error.message)),
          onSuccess: () => resolve(),
        });
        upload.start();
      });

      // Then tell the edge function about the uploaded file
      const result = await callFunction({
        action: 'createFromStorage',
        playerEmail,
        storagePath: filePath,
        title: newTitle,
        opponent: newOpponent || null,
        matchDate: newMatchDate || null,
      });

      if (result.data) {
        const entry: VideoEntry = {
          ...result.data,
          clips: [],
          match_minute_offset: 0,
          second_half_offset: null,
          second_half_video_time: null,
        };
        setVideos(prev => [entry, ...prev]);
        setSelectedVideo(entry);
        setShowUpload(false);
        setNewTitle("");
        setUploadFile(null);
        setNewOpponent("");
        setNewMatchDate("");
        toast.success("Video uploaded");
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
    const clipMinute = formatClipMinuteFromSeconds(clipStart + getEffectiveOffset(clipStart));

    const newClip: Clip = {
      id: crypto.randomUUID(),
      start: clipStart,
      end: clipEnd,
      label: `Clip ${clipMinute}`,
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
  };

  const saveClips = async (clips: Clip[]) => {
    if (!selectedVideo) return;
    try {
      await callFunction({
        action: 'updateClips',
        playerEmail,
        videoId: selectedVideo.id,
        clips,
      });
      const updated = { ...selectedVideo, clips };
      setSelectedVideo(updated);
      setVideos(prev => prev.map(v => v.id === selectedVideo.id ? updated : v));
    } catch (err) {
      toast.error('Failed to save clips');
    }
  };

  const handleDeleteClip = async (clipId: string) => {
    if (!selectedVideo) return;
    await saveClips(selectedVideo.clips.filter(c => c.id !== clipId));
  };

  const handleDeleteVideo = async (id: string) => {
    try {
      await callFunction({ action: 'delete', playerEmail, videoId: id });
      setVideos(prev => prev.filter(v => v.id !== id));
      if (selectedVideo?.id === id) setSelectedVideo(null);
      toast.success("Deleted");
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleSaveClipToAll = async (clipId: string) => {
    if (!selectedVideo) return;
    setSavingClipIds(prev => new Set(prev).add(clipId));
    try {
      await callFunction({
        action: 'saveToClips',
        playerEmail,
        videoId: selectedVideo.id,
        clipIds: [clipId],
      });
      setSavedClipIds(prev => new Set(prev).add(clipId));
      toast.success("Clip saved to All Clips");
    } catch (err: any) {
      toast.error(err.message || "Failed to save clip");
    }
    setSavingClipIds(prev => { const n = new Set(prev); n.delete(clipId); return n; });
  };

  const handleSaveAllClips = async () => {
    if (!selectedVideo || selectedVideo.clips.length === 0) return;
    setSavingAll(true);
    try {
      const unsavedIds = selectedVideo.clips.filter(c => !savedClipIds.has(c.id)).map(c => c.id);
      if (unsavedIds.length === 0) {
        toast.info("All clips already saved");
        setSavingAll(false);
        return;
      }
      await callFunction({
        action: 'saveToClips',
        playerEmail,
        videoId: selectedVideo.id,
        clipIds: unsavedIds,
      });
      setSavedClipIds(prev => {
        const n = new Set(prev);
        unsavedIds.forEach(id => n.add(id));
        return n;
      });
      toast.success(`${unsavedIds.length} clip${unsavedIds.length > 1 ? 's' : ''} saved to All Clips`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save clips");
    }
    setSavingAll(false);
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

  const handleTimestampOverride = async () => {
    if (!selectedVideo || !videoRef.current || !overrideMinute) return;
    const currentVideoTime = videoRef.current.currentTime;
    const targetMatchSeconds = parseMatchTimeInputToSeconds(overrideMinute);
    if (targetMatchSeconds === null) {
      toast.error("Enter match time as mm.ss");
      return;
    }

    if (syncHalf === "2nd") {
      const secondHalfOffset = targetMatchSeconds - currentVideoTime;
      const adjustedClips = selectedVideo.clips.map(clip => {
        if (clip.start < currentVideoTime) return clip;
        const newMinute = formatClipMinuteFromSeconds(clip.start + secondHalfOffset);
        return { ...clip, label: `Clip ${newMinute}` };
      });
      try {
        await callFunction({
          action: 'updateOffset',
          playerEmail,
          videoId: selectedVideo.id,
          second_half_offset: secondHalfOffset,
          second_half_video_time: currentVideoTime,
          clips: adjustedClips,
        });
        const updated = { ...selectedVideo, second_half_offset: secondHalfOffset, second_half_video_time: currentVideoTime, clips: adjustedClips };
        setSelectedVideo(updated);
        setVideos(prev => prev.map(v => v.id === selectedVideo.id ? updated : v));
        setShowTimestampOverride(false);
        setOverrideMinute("");
        toast.success(`2nd half synced: this point is now ${overrideMinute}'`);
      } catch (err) {
        toast.error('Failed to sync');
      }
    } else {
      const newOffset = targetMatchSeconds - currentVideoTime;
      const adjustedClips = selectedVideo.clips.map(clip => {
        const isSecondHalf = selectedVideo.second_half_video_time !== null && clip.start >= selectedVideo.second_half_video_time;
        if (isSecondHalf) return clip;
        const newMinute = formatClipMinuteFromSeconds(clip.start + newOffset);
        return { ...clip, label: `Clip ${newMinute}` };
      });
      try {
        await callFunction({
          action: 'updateOffset',
          playerEmail,
          videoId: selectedVideo.id,
          match_minute_offset: newOffset,
          clips: adjustedClips,
        });
        const updated = { ...selectedVideo, match_minute_offset: newOffset, clips: adjustedClips };
        setSelectedVideo(updated);
        setVideos(prev => prev.map(v => v.id === selectedVideo.id ? updated : v));
        setShowTimestampOverride(false);
        setOverrideMinute("");
        toast.success(`1st half synced: this point is now ${overrideMinute}'`);
      } catch (err) {
        toast.error('Failed to sync');
      }
    }
  };

  // Helpers
  const getEffectiveOffset = (videoSeconds: number) => {
    if (!selectedVideo) return 0;
    if (selectedVideo.second_half_video_time !== null && selectedVideo.second_half_offset !== null && videoSeconds >= selectedVideo.second_half_video_time) {
      return selectedVideo.second_half_offset;
    }
    return selectedVideo.match_minute_offset;
  };

  const fmtTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
    return Math.floor(matchSeconds / 60);
  };

  const daysUntilExpiry = (dateStr: string | null) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const clipsNewestFirst = selectedVideo
    ? [...selectedVideo.clips].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [];

  // Esc key to go back
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

  // Selected video workspace
  if (selectedVideo) {
    return (
      <div className="space-y-1">
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
          <Button
            onClick={() => setShowTimestampOverride(!showTimestampOverride)}
            variant="outline"
            size="sm"
            className="gap-1"
          >
            <Clock className="h-3.5 w-3.5" /> Sync
          </Button>
        </div>

        {/* Sync panel */}
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
          </div>
        )}

        {/* Video player */}
        {selectedVideo.video_url ? (
          <div className="relative w-full bg-black rounded-lg overflow-hidden group/player">
            <video
              ref={videoRef}
              src={selectedVideo.video_url}
              controls
              muted
              playsInline
              className="w-full aspect-video"
            />
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 opacity-0 group-hover/player:opacity-100 transition-opacity">
              <Button onClick={handleInstantClip} size="sm" className="gap-1.5 shadow-lg bg-primary/90 backdrop-blur-sm">
                <Scissors className="h-4 w-4" /> Clip (±5s)
              </Button>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Film className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Video file expired. Clips preserved below.</p>
            </CardContent>
          </Card>
        )}

        {/* Clips list */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-medium">Clips ({selectedVideo.clips.length})</h4>
            {selectedVideo.clips.length > 0 && selectedVideo.video_url && (
              <Button
                onClick={handleSaveAllClips}
                disabled={savingAll || selectedVideo.clips.every(c => savedClipIds.has(c.id))}
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
              >
                {savingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Save All to Clips
              </Button>
            )}
          </div>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {clipsNewestFirst.map(clip => {
              const isSaving = savingClipIds.has(clip.id);
              const isSaved = savedClipIds.has(clip.id);
              return (
                <div key={clip.id} className="p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors group/clip">
                  <div className="flex items-center gap-2">
                    <button onClick={() => playClip(clip)} className="flex items-center gap-1 text-primary hover:underline font-mono text-xs whitespace-nowrap shrink-0">
                      <Play className="h-3 w-3" />
                      {fmtTime(clip.start)} → {fmtTime(clip.end)}
                    </button>
                    <p className="text-[10px] text-muted-foreground shrink-0">
                      {getMatchMinute(clip.start, selectedVideo.match_minute_offset)}'
                    </p>

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

                    {/* Save to All Clips button */}
                    {selectedVideo.video_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-6 w-6 shrink-0 ${isSaved ? 'text-green-500' : 'opacity-0 group-hover/clip:opacity-100 text-muted-foreground hover:text-primary'}`}
                        onClick={() => !isSaved && handleSaveClipToAll(clip.id)}
                        disabled={isSaving || isSaved}
                        title={isSaved ? "Saved to All Clips" : "Save to All Clips"}
                      >
                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : isSaved ? <CheckCircle className="h-3 w-3" /> : <Save className="h-3 w-3" />}
                      </Button>
                    )}

                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/clip:opacity-100 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDeleteClip(clip.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Title only */}
                  <div className="mt-1.5">
                    <Input
                      placeholder="Clip title..."
                      defaultValue={clip.label || ""}
                      onBlur={e => {
                        if (e.target.value !== (clip.label || "")) {
                          handleUpdateClipLabel(clip.id, e.target.value);
                        }
                      }}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              );
            })}
            {clipsNewestFirst.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">No clips yet. Hover over the video and press "Clip (±5s)" during playback.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Video list
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bebas uppercase tracking-wider">Match Clipper</h3>
          <p className="text-xs text-muted-foreground">Upload match footage and clip your best moments</p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)} variant={showUpload ? "secondary" : "default"} size="sm">
          {showUpload ? <><X className="h-4 w-4 mr-1" /> Cancel</> : <><Plus className="h-4 w-4 mr-1" /> Upload Match</>}
        </Button>
      </div>

      {showUpload && (
        <Card className="border-primary/30">
          <CardContent className="p-4">
            <div className="space-y-3">
              <Input placeholder="Match title (e.g. vs Arsenal)" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Opponent" value={newOpponent} onChange={e => setNewOpponent(e.target.value)} />
                <Input type="date" value={newMatchDate} onChange={e => setNewMatchDate(e.target.value)} />
              </div>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors min-h-[100px]"
              >
                <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
                {uploadFile ? (
                  <div className="text-center space-y-1 p-3">
                    <Film className="h-6 w-6 mx-auto text-primary" />
                    <p className="font-medium text-xs truncate max-w-[200px]">{uploadFile.name}</p>
                    <p className="text-[10px] text-muted-foreground">{(uploadFile.size / (1024 * 1024)).toFixed(0)} MB</p>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}>
                      <X className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-1 p-3">
                    <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Drop or click to upload</p>
                    <p className="text-[10px] text-muted-foreground">Auto-deletes after 7 days. Clips are kept.</p>
                  </div>
                )}
              </div>
              <Button onClick={handleCreate} disabled={!newTitle || !uploadFile || creating} className="w-full" size="sm">
                {creating ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Uploading...</> : <><Upload className="h-4 w-4 mr-1" /> Upload</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {videos.length === 0 && !showUpload ? (
        <div className="text-center py-8 text-muted-foreground">
          <Film className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No match videos yet</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4 mr-1" /> Upload First Match
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {videos.map(video => {
            const expiry = daysUntilExpiry(video.auto_delete_at);
            return (
              <div
                key={video.id}
                onClick={() => setSelectedVideo(video)}
                className="p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{video.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {video.opponent && <span className="text-xs text-muted-foreground">vs {video.opponent}</span>}
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
  );
};
