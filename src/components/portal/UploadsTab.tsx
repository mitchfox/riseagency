import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Upload, Play, Pencil, Trash2, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { AddToPlaylistButton } from "./AddToPlaylistButton";

interface UploadedClip {
  id: string;
  name: string;
  video_url: string;
  duration_seconds: number | null;
  created_at: string;
}

interface Props {
  playerId: string;
  /** Caller identity (one of these is required for create/rename/delete). */
  playerEmail?: string;
  makerUsername?: string;
  /** Open the shared player on a clip. */
  onPlay: (clip: { name: string; videoUrl: string }) => void;
}

const BUCKET = "analysis-videos";

export const UploadsTab = ({ playerId, playerEmail, makerUsername, onPlay }: Props) => {
  const [clips, setClips] = useState<UploadedClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("player-uploaded-clips", {
      body: { action: "list", playerId },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Failed to load uploads");
    } else {
      setClips((data as any).clips || []);
    }
    setLoading(false);
  };
  useEffect(() => { if (playerId) load(); }, [playerId]);

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!playerEmail && !makerUsername) { toast.error("Sign in required to upload"); return; }
    setUploading(true);
    let okCount = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress(Math.round(((i) / files.length) * 100));
      try {
        const safe = file.name.replace(/[^a-z0-9._-]/gi, "_");
        const path = `uploads/${playerId}/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type || "video/mp4", upsert: false,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        const { data, error } = await supabase.functions.invoke("player-uploaded-clips", {
          body: {
            action: "create", playerId, playerEmail, makerUsername,
            name: file.name.replace(/\.[^.]+$/, ""),
            videoUrl: pub.publicUrl,
          },
        });
        if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
        okCount += 1;
      } catch (e: any) {
        console.error(e);
        toast.error(`Failed to upload ${file.name}: ${e?.message || ""}`);
      }
    }
    setProgress(100);
    setUploading(false);
    if (okCount > 0) toast.success(`Uploaded ${okCount} clip${okCount === 1 ? "" : "s"}`);
    if (fileRef.current) fileRef.current.value = "";
    load();
  };

  const renameClip = async (clip: UploadedClip) => {
    const next = window.prompt("Rename clip", clip.name);
    if (!next || !next.trim() || next.trim() === clip.name) return;
    const { data, error } = await supabase.functions.invoke("player-uploaded-clips", {
      body: { action: "rename", playerId, playerEmail, makerUsername, clipId: clip.id, name: next.trim() },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Rename failed");
      return;
    }
    setClips((prev) => prev.map((c) => (c.id === clip.id ? { ...c, name: next.trim() } : c)));
  };

  const deleteClip = async (clip: UploadedClip) => {
    if (!window.confirm(`Delete "${clip.name}"? This can't be undone.`)) return;
    const { data, error } = await supabase.functions.invoke("player-uploaded-clips", {
      body: { action: "delete", playerId, playerEmail, makerUsername, clipId: clip.id },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Delete failed");
      return;
    }
    setClips((prev) => prev.filter((c) => c.id !== clip.id));
    toast.success("Clip deleted");
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 border-dashed">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <div className="font-semibold flex items-center gap-2"><Upload className="w-4 h-4" /> Upload video clips</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              MP4 / MOV files. They'll appear below and can be added to playlists.
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={(e) => uploadFiles(e.target.files)}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? (<><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Uploading {progress}%</>) : (<><Upload className="w-4 h-4 mr-1" /> Choose files</>)}
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading uploads…</div>
      ) : clips.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No uploaded clips yet.</Card>
      ) : (
        <div className="space-y-2">
          {clips.map((c) => (
            <Card key={c.id} className="p-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onPlay({ name: c.name, videoUrl: c.video_url })}
                className="flex items-center gap-2 flex-1 text-left min-w-0"
              >
                <Play className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate font-medium">{c.name}</span>
              </button>
              <AddToPlaylistButton
                playerId={playerId}
                playerEmail={playerEmail}
                makerUsername={makerUsername}
                clip={{ name: c.name, videoUrl: c.video_url }}
              />
              <Button size="icon" variant="ghost" onClick={() => renameClip(c)} title="Rename">
                <Pencil className="w-4 h-4" />
              </Button>
              <a
                href={c.video_url}
                download={c.name}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-accent"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </a>
              <Button size="icon" variant="ghost" onClick={() => deleteClip(c)} title="Delete">
                <Trash2 className="w-4 h-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};