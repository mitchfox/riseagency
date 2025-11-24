import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, X, Save, ChevronUp, ChevronDown, List, Play, Trash2, Hash, Video, Download } from "lucide-react";
import { Label } from "@/components/ui/label";
import { PlaylistPlayer } from "./PlaylistPlayer";
import { ClipNameEditor } from "./ClipNameEditor";
import JSZip from "jszip";

interface Clip {
  id?: string;
  name: string;
  videoUrl: string;
  order: number;
  duration?: number; // in seconds
}

interface Playlist {
  id: string;
  name: string;
  clips: Clip[];
}

interface PlaylistManagerProps {
  playerData: any;
  availableClips: Array<{ id?: string; name: string; videoUrl: string }>;
  onClose: () => void;
}

export const PlaylistManager = ({ playerData, availableClips, onClose }: PlaylistManagerProps) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedClips, setSelectedClips] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<{ url: string; name: string } | null>(null);
  const [movingClipId, setMovingClipId] = useState<string | null>(null);
  const [targetPosition, setTargetPosition] = useState("");
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);
  const [clipDurations, setClipDurations] = useState<Record<string, number>>({});

  useEffect(() => {
    if (playerData?.id) {
      setIsLoadingPlaylists(true);
      fetchPlaylists();
    }
  }, [playerData?.id]);

  const fetchPlaylists = async () => {
    if (!playerData?.id) {
      setIsLoadingPlaylists(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('player_id', playerData.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching playlists:', error);
        toast.error("Failed to load playlists");
        setIsLoadingPlaylists(false);
        return;
      }

      const normalized = (data || []).map(p => ({
        ...p,
        clips: (p.clips as any) || [],
      }));

      setPlaylists(normalized);

      if (selectedPlaylist) {
        const fresh = normalized.find((p) => p.id === selectedPlaylist.id);
        if (fresh) {
          setSelectedPlaylist(fresh as Playlist);
        }
      }
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim() || !playerData?.id) return;

    try {
      // Get player email from localStorage
      const playerEmail = localStorage.getItem("player_email") || sessionStorage.getItem("player_email");
      
      if (!playerEmail) {
        toast.error("Please log in again");
        return;
      }

      // Call edge function to create playlist (bypasses RLS)
      const { data, error } = await supabase.functions.invoke('create-playlist', {
        body: {
          playerEmail,
          name: newPlaylistName.trim()
        }
      });

      if (error) {
        console.error('Playlist creation error:', error);
        toast.error(`Failed to create playlist: ${error.message}`);
        return;
      }

      if (data.error) {
        console.error('Playlist creation failed:', data.error);
        toast.error(`Failed to create playlist: ${data.error}`);
        return;
      }

      const newPlaylist = { ...data.playlist, clips: (data.playlist.clips as any) || [] };
      setPlaylists([newPlaylist, ...playlists]);
      setSelectedPlaylist(newPlaylist);
      setNewPlaylistName("");
      setIsCreating(false);
      toast.success("Playlist created");
    } catch (err: any) {
      console.error('Unexpected error creating playlist:', err);
      toast.error(`Error: ${err.message || 'Unknown error'}`);
    }
  };

  const deletePlaylist = async (id: string) => {
    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Failed to delete playlist");
      return;
    }

    setPlaylists(playlists.filter(p => p.id !== id));
    if (selectedPlaylist?.id === id) {
      setSelectedPlaylist(null);
    }
    toast.success("Playlist deleted");
  };

  const toggleClipSelection = (clipId: string) => {
    const newSelected = new Set(selectedClips);
    if (newSelected.has(clipId)) {
      newSelected.delete(clipId);
    } else {
      newSelected.add(clipId);
    }
    setSelectedClips(newSelected);
  };

  const addClipsToPlaylist = async () => {
    if (!selectedPlaylist || selectedClips.size === 0) return;

    // Get email from playerData or fallback to storage
    const playerEmail = playerData?.email || 
      localStorage.getItem("player_email") || 
      sessionStorage.getItem("player_email");
    
    if (!playerEmail) {
      toast.error("Unable to save: Player email not found. Please log in again.");
      return;
    }

    try {
      const existingClips = selectedPlaylist.clips || [];
      const maxOrder = existingClips.length > 0 
        ? Math.max(...existingClips.map(c => c.order))
        : 0;

      const newClips = Array.from(selectedClips).map((clipId, index) => {
        const clip = availableClips.find(c => (c.id || c.videoUrl) === clipId);
        return {
          id: clip!.id || clip!.videoUrl,
          name: clip!.name,
          videoUrl: clip!.videoUrl,
          order: maxOrder + index + 1
        };
      });

      const updatedClips = [...existingClips, ...newClips];

      // Use edge function to update playlist (bypasses RLS)
      const { data, error } = await supabase.functions.invoke('update-playlist', {
        body: {
          playerEmail,
          playlistId: selectedPlaylist.id,
          clips: updatedClips
        }
      });

      if (error) {
        console.error('Add clips error:', error);
        toast.error(`Failed to add clips: ${error.message}`);
        return;
      }

      if (data?.error) {
        console.error('Add clips data error:', data.error);
        toast.error(`Failed to add clips: ${data.error}`);
        return;
      }

      setSelectedPlaylist({ ...selectedPlaylist, clips: updatedClips });
      setPlaylists(playlists.map(p => 
        p.id === selectedPlaylist.id ? { ...p, clips: updatedClips } : p
      ));
      setSelectedClips(new Set());
      toast.success("Clips added to playlist");
    } catch (err: any) {
      console.error('Unexpected error adding clips:', err);
      toast.error(`Error: ${err.message || 'Unknown error'}`);
    }
  };

  const removeClipFromPlaylist = async (clipVideoUrl: string, clipName: string) => {
    if (!selectedPlaylist) return;

    // Get email from playerData or fallback to storage
    const playerEmail = playerData?.email ||
      localStorage.getItem("player_email") ||
      sessionStorage.getItem("player_email");

    if (!playerEmail) {
      toast.error("Unable to save: Player email not found. Please log in again.");
      return;
    }

    try {
      const originalCount = selectedPlaylist.clips?.length ?? 0;
      const updatedClips = (selectedPlaylist.clips || [])
        .filter((c) => c.videoUrl !== clipVideoUrl)
        .map((c, index) => ({ ...c, order: index + 1 }));

      console.log("Removing clip from playlist", {
        clipVideoUrl,
        clipName,
        originalCount,
        newCount: updatedClips.length,
      });

      // Use edge function to update playlist (bypasses RLS)
      const { data, error } = await supabase.functions.invoke("update-playlist", {
        body: {
          playerEmail,
          playlistId: selectedPlaylist.id,
          clips: updatedClips,
        },
      });

      if (error) {
        console.error("Remove clip error:", error);
        toast.error(`Failed to remove clip: ${error.message}`);
        return;
      }

      if (data?.error) {
        console.error("Remove clip data error:", data.error);
        toast.error(`Failed to remove clip: ${data.error}`);
        return;
      }

      const serverClips = (data?.playlist?.clips as any) || updatedClips;
      const newPlaylist = { ...selectedPlaylist, clips: serverClips };

      setSelectedPlaylist(newPlaylist);
      setPlaylists((prev) =>
        prev.map((p) => (p.id === selectedPlaylist.id ? { ...p, clips: serverClips } : p))
      );

      toast.success("Clip removed");
    } catch (err: any) {
      console.error("Unexpected error removing clip:", err);
      toast.error(`Error: ${err.message || "Unknown error"}`);
    }
  };

  const reorderClip = async (index: number, direction: 'up' | 'down') => {
    if (!selectedPlaylist) return;

    // Get email from playerData or fallback to storage
    const playerEmail = playerData?.email || 
      localStorage.getItem("player_email") || 
      sessionStorage.getItem("player_email");
    
    if (!playerEmail) {
      toast.error("Unable to save: Player email not found. Please log in again.");
      return;
    }

    try {
      const clips = [...selectedPlaylist.clips];
      const newIndex = direction === 'up' ? index - 1 : index + 1;

      if (newIndex < 0 || newIndex >= clips.length) return;

      [clips[index], clips[newIndex]] = [clips[newIndex], clips[index]];
      
      const reorderedClips = clips.map((c, i) => ({ ...c, order: i + 1 }));

      // Use edge function to update playlist (bypasses RLS)
      const { data, error } = await supabase.functions.invoke('update-playlist', {
        body: {
          playerEmail,
          playlistId: selectedPlaylist.id,
          clips: reorderedClips
        }
      });

      if (error) {
        console.error('Reorder clips error:', error);
        toast.error(`Failed to reorder clips: ${error.message}`);
        return;
      }

      if (data?.error) {
        console.error('Reorder clips data error:', data.error);
        toast.error(`Failed to reorder clips: ${data.error}`);
        return;
      }

      setSelectedPlaylist({ ...selectedPlaylist, clips: reorderedClips });
      setPlaylists(playlists.map(p => 
        p.id === selectedPlaylist.id ? { ...p, clips: reorderedClips } : p
      ));
      toast.success("Clip reordered");
    } catch (err: any) {
      console.error('Unexpected error reordering clips:', err);
      toast.error(`Error: ${err.message || 'Unknown error'}`);
    }
  };

  const moveClipToPosition = async (currentIndex: number, targetPos: number) => {
    if (!selectedPlaylist) return;
    
    // Get email from playerData or fallback to storage
    const playerEmail = playerData?.email || 
      localStorage.getItem("player_email") || 
      sessionStorage.getItem("player_email");
    
    if (!playerEmail) {
      toast.error("Unable to save: Player email not found. Please log in again.");
      return;
    }
    
    const newPosition = targetPos - 1; // Convert to 0-indexed
    if (newPosition < 0 || newPosition >= selectedPlaylist.clips.length || newPosition === currentIndex) {
      toast.error("Invalid position");
      return;
    }

    try {
      const clips = [...selectedPlaylist.clips];
      const [movedClip] = clips.splice(currentIndex, 1);
      clips.splice(newPosition, 0, movedClip);
      
      const reorderedClips = clips.map((c, i) => ({ ...c, order: i + 1 }));

      const { data, error } = await supabase.functions.invoke('update-playlist', {
        body: {
          playerEmail,
          playlistId: selectedPlaylist.id,
          clips: reorderedClips
        }
      });

      if (error) {
        console.error('Move clip error:', error);
        toast.error(`Failed to move clip: ${error.message}`);
        return;
      }

      if (data?.error) {
        console.error('Move clip data error:', data.error);
        toast.error(`Failed to move clip: ${data.error}`);
        return;
      }

      setSelectedPlaylist({ ...selectedPlaylist, clips: reorderedClips });
      setPlaylists(playlists.map(p => 
        p.id === selectedPlaylist.id ? { ...p, clips: reorderedClips } : p
      ));
      setMovingClipId(null);
      setTargetPosition("");
      toast.success(`Moved to position ${targetPos}`);
    } catch (err: any) {
      console.error('Unexpected error moving clip:', err);
      toast.error(`Error: ${err.message || 'Unknown error'}`);
    }
  };

  const downloadSavedPlaylist = async (
    savedClips: Array<{ newName: string; url: string }>,
    playlistName: string,
    toastId: string | number,
    totalClips: number,
    skippedCount: number
  ) => {
    if (!savedClips.length) {
      toast.error("No clips available to download", { id: toastId });
      return;
    }

    try {
      toast.loading(
        `Saved ${savedClips.length} of ${totalClips} clips. Preparing ZIP download...`,
        { id: toastId }
      );

      const zip = new JSZip();

      for (let i = 0; i < savedClips.length; i++) {
        const clip = savedClips[i];
        const response = await fetch(clip.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch clip: ${clip.newName || `Clip ${i + 1}`}`);
        }
        const blob = await response.blob();
        zip.file(clip.newName || `${i + 1}.mp4`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${playlistName}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      const skippedMessage = skippedCount
        ? ` (${skippedCount} clip${skippedCount !== 1 ? "s were" : " was"} skipped, may have been deleted)`
        : "";

      toast.success(
        `Folder downloaded with ${savedClips.length} clip${savedClips.length !== 1 ? "s" : ""}!${skippedMessage}`,
        { id: toastId, duration: 8000 }
      );
    } catch (error) {
      console.error("Error downloading saved playlist:", error);
      const msg =
        error instanceof Error
          ? error.message
          : "Failed to download folder. Clips were saved to your cloud folder.";
      toast.error(msg, { id: toastId, duration: 8000 });
    }
  };

  const savePlaylist = async () => {
    if (!selectedPlaylist || !playerData?.email) return;

    const totalClips = selectedPlaylist.clips.length;
    const loadingToast = toast.loading(
      `Preparing to save ${totalClips} clip${totalClips !== 1 ? 's' : ''}...`
    );

    setSaving(true);
    try {
      // Update toast to show processing has started
      toast.loading(
        `Processing ${totalClips} clip${totalClips !== 1 ? 's' : ''}... This may take a moment.`,
        { id: loadingToast }
      );

      const { data, error } = await supabase.functions.invoke('save-playlist', {
        body: { 
          playlistId: selectedPlaylist.id,
          playerEmail: playerData.email
        }
      });

      if (error) {
        console.error('Save playlist error:', error);
        toast.error('Failed to save playlist', { id: loadingToast });
        throw error;
      }

      if (data?.error) {
        console.error('Save playlist data error:', data.error);
        toast.error(data.error, { id: loadingToast });
        throw new Error(data.error);
      }

      const savedClips = data?.clips || [];
      const skippedCount = data?.skipped?.length || 0;

      await downloadSavedPlaylist(
        savedClips,
        selectedPlaylist.name,
        loadingToast,
        totalClips,
        skippedCount
      );
    } catch (error) {
      console.error('Save error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to save playlist';
      toast.error(errorMsg, { id: loadingToast });
    } finally {
      setSaving(false);
    }
  };

  const handleRenameClip = async (oldName: string, videoUrl: string, newName: string) => {
    if (!playerData?.email || !newName.trim() || newName === oldName) return;

    try {
      const { data, error } = await supabase.functions.invoke('rename-player-highlight', {
        body: {
          playerEmail: playerData.email,
          oldName,
          newName: newName.trim(),
          videoUrl
        }
      });

      if (error || data?.error) {
        console.error('Rename error:', error || data?.error);
        toast.error("Failed to rename clip");
        return;
      }

      // Update all playlists with the new name
      const updatedPlaylists = playlists.map(playlist => ({
        ...playlist,
        clips: playlist.clips.map(clip =>
          clip.videoUrl === videoUrl && clip.name === oldName
            ? { ...clip, name: newName.trim() }
            : clip
        )
      }));

      setPlaylists(updatedPlaylists);
      
      if (selectedPlaylist) {
        const updatedSelected = updatedPlaylists.find(p => p.id === selectedPlaylist.id);
        if (updatedSelected) setSelectedPlaylist(updatedSelected);
      }

      toast.success("Clip renamed globally");
    } catch (err: any) {
      console.error('Unexpected error renaming clip:', err);
      toast.error(`Error: ${err.message || 'Unknown error'}`);
    }
  };

  const downloadClip = async (clip: Clip, index: number) => {
    const loadingToast = toast.loading("Downloading clip...");

    try {
      const response = await fetch(clip.videoUrl);
      const blob = await response.blob();
      
      const extension = clip.videoUrl.split('.').pop()?.split('?')[0] || 'mp4';
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${index + 1}. ${clip.name}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Clip downloaded", { id: loadingToast });
    } catch (error) {
      console.error('Error downloading clip:', error);
      toast.error("Failed to download clip", { id: loadingToast });
    }
  };

  const loadVideoDuration = (videoUrl: string) => {
    // Skip if already loaded or loading
    if (clipDurations[videoUrl]) return;

    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const rawDuration = video.duration;
      if (Number.isFinite(rawDuration) && rawDuration > 0) {
        const rounded = Math.round(rawDuration);

        // Store in local duration map
        setClipDurations((prev) => ({
          ...prev,
          [videoUrl]: rounded,
        }));

        // Also persist in selectedPlaylist state
        setSelectedPlaylist((prev) =>
          prev
            ? {
                ...prev,
                clips: prev.clips.map((clip) =>
                  clip.videoUrl === videoUrl ? { ...clip, duration: rounded } : clip
                ),
              }
            : prev
        );

        // And update playlists collection so counts stay in sync
        setPlaylists((prev) =>
          prev.map((playlist) => ({
            ...playlist,
            clips: playlist.clips.map((clip) =>
              clip.videoUrl === videoUrl ? { ...clip, duration: rounded } : clip
            ),
          }))
        );
      }
    };
    video.onerror = () => {
      // Set to 0 to indicate failed load
      setClipDurations((prev) => ({
        ...prev,
        [videoUrl]: 0,
      }));
    };
    video.src = videoUrl;
  };

  const formatDuration = (seconds: number | undefined): string => {
    if (seconds === undefined) return '—';
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateRunningTotal = (clips: Clip[], upToIndex: number): number => {
    let total = 0;
    for (let i = 0; i <= upToIndex; i++) {
      const durationFromState = clipDurations[clips[i].videoUrl];
      const duration = durationFromState ?? clips[i].duration;
      if (duration && Number.isFinite(duration)) {
        total += duration;
      }
    }
    return total;
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[100vw] w-[100vw] max-h-[95vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl md:text-2xl font-bebas uppercase tracking-wider">
            Manage Playlists
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Playlists List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bebas text-base md:text-lg uppercase">Playlists</h3>
              <Button
                size="sm"
                onClick={() => setIsCreating(true)}
                variant="outline"
                className="h-8"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {isCreating && (
              <div className="space-y-2 p-3 border rounded-lg bg-card">
                <Input
                  placeholder="Playlist name..."
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createPlaylist();
                    if (e.key === 'Escape') setIsCreating(false);
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={createPlaylist}>Create</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-[300px] md:max-h-[400px] overflow-y-auto">
              {isLoadingPlaylists ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  <div className="animate-pulse">Loading playlists...</div>
                </div>
              ) : playlists.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No playlists yet. Create one to get started!</p>
              ) : (
                playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className={`p-2 md:p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedPlaylist?.id === playlist.id 
                      ? 'bg-primary/10 border-primary' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedPlaylist(playlist)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <List className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium truncate text-sm md:text-base">{playlist.name}</span>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                      <span className="text-xs md:text-sm text-muted-foreground px-2 py-0.5 bg-muted rounded">
                        {playlist.clips?.length || 0}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePlaylist(playlist.id);
                        }}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
                ))
              )}
            </div>
          </div>

          {/* Available Clips */}
          <div className="space-y-3">
            <h3 className="font-bebas text-base md:text-lg uppercase">Available Clips</h3>
            {selectedPlaylist ? (
              <>
                <div className="space-y-2 max-h-[250px] md:max-h-[400px] overflow-y-auto pr-2">
                  {availableClips.map((clip) => {
                    const clipKey = clip.id || clip.videoUrl || clip.name;
                    const alreadyInPlaylist = selectedPlaylist.clips?.some(
                      (pc) => pc.videoUrl === clip.videoUrl
                    );

                    return (
                      <div
                        key={clipKey}
                        className={`flex items-center gap-2 p-2 border rounded transition-colors ${
                          alreadyInPlaylist ? "bg-muted/60 opacity-60" : "hover:bg-muted"
                        }`}
                      >
                        <Checkbox
                          checked={selectedClips.has(clipKey)}
                          disabled={!!alreadyInPlaylist}
                          onCheckedChange={() => {
                            if (!alreadyInPlaylist) {
                              toggleClipSelection(clipKey);
                            }
                          }}
                        />
                        <Label
                          className={`flex-1 cursor-pointer text-xs md:text-sm leading-tight break-words ${
                            alreadyInPlaylist ? "line-through text-muted-foreground" : ""
                          }`}
                        >
                          {clip.name}
                          {alreadyInPlaylist && (
                            <span className="ml-2 text-[10px] md:text-xs text-muted-foreground">
                              (already in playlist)
                            </span>
                          )}
                        </Label>
                      </div>
                    );
                  })}
                </div>
                <Button
                  size="sm"
                  onClick={addClipsToPlaylist}
                  disabled={selectedClips.size === 0}
                  className="w-full h-9"
                >
                  Add Selected ({selectedClips.size})
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Select a playlist to view available clips
              </p>
            )}
          </div>

          {/* Playlist Clips */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bebas text-base md:text-lg uppercase truncate flex-1 min-w-0">
                {selectedPlaylist ? (
                  <span className="truncate block">Clips</span>
                ) : (
                  'Select Playlist'
                )}
              </h3>
              {selectedPlaylist && selectedPlaylist.clips?.length > 0 && (
                <>
                  <Button
                    size="sm"
                    onClick={() => setShowPlayer(true)}
                    variant="outline"
                    className="h-8 flex-shrink-0"
                  >
                    <Video className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Manage</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={savePlaylist}
                    disabled={saving}
                    variant="default"
                    className="h-8 flex-shrink-0"
                  >
                    <Download className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">
                      {saving ? 'Downloading...' : 'Download All'}
                    </span>
                  </Button>
                </>
              )}
            </div>

            {selectedPlaylist ? (
               <div className="space-y-2 max-h-[250px] md:max-h-[400px] overflow-y-auto pr-2">
                 {selectedPlaylist.clips
                   ?.slice()
                   .sort((a, b) => a.order - b.order)
                   .map((clip, index, sortedArray) => {
                     // Don't auto-load durations - only load on play
                     const clipDuration = clipDurations[clip.videoUrl] ?? clip.duration;
                     const runningTotal = calculateRunningTotal(sortedArray, index);
                     const clipKey = clip.id || clip.videoUrl || clip.name;
                     
                     return (
                     <div
                       key={clipKey}
                       className="space-y-1"
                     >
                       <div className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 border rounded bg-card hover:border-primary/30 transition-colors">
                         <span className="text-sm md:text-base font-bold text-primary w-8 md:w-10 flex-shrink-0 text-center">
                           {index + 1}.
                         </span>
                         <div className="flex-1 min-w-0 space-y-1">
                           <ClipNameEditor
                             initialName={clip.name}
                             videoUrl={clip.videoUrl}
                             onRename={(newName) => handleRenameClip(clip.name, clip.videoUrl, newName)}
                           />
                           <div className="flex items-center gap-2 text-xs text-muted-foreground">
                             <span className="font-mono">
                               {formatDuration(clipDuration)}
                             </span>
                             <span className="text-primary/60">•</span>
                             <span className="font-mono">
                               Total: {formatDuration(runningTotal)}
                             </span>
                           </div>
                         </div>
                           <Button
                             size="sm"
                             variant="ghost"
                             onClick={() => {
                               // Load duration when play is clicked
                               loadVideoDuration(clip.videoUrl);
                               setPlayingVideo({ url: clip.videoUrl, name: clip.name });
                             }}
                             className="h-8 w-8 p-0 hover:bg-primary/10 text-primary flex-shrink-0"
                             title="Watch clip"
                           >
                             <Play className="w-4 h-4" />
                           </Button>
                          
                          {movingClipId !== clipKey && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => downloadClip(clip, index)}
                              className="h-8 w-8 p-0 hover:bg-primary/10 flex-shrink-0"
                              title="Download clip"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}

                          {movingClipId === clipKey ? (
                           <div className="flex items-center gap-1.5 flex-shrink-0">
                             <Input
                               type="number"
                               min="1"
                               max={selectedPlaylist.clips.length}
                               value={targetPosition}
                               onChange={(e) => setTargetPosition(e.target.value)}
                               placeholder="#"
                               className="h-8 w-14 text-sm p-1 text-center"
                               autoFocus
                               onKeyDown={(e) => {
                                 if (e.key === 'Enter' && targetPosition) {
                                   moveClipToPosition(index, parseInt(targetPosition));
                                 }
                                 if (e.key === 'Escape') {
                                   setMovingClipId(null);
                                   setTargetPosition("");
                                 }
                               }}
                             />
                             <Button
                               size="sm"
                               variant="ghost"
                               onClick={() => {
                                 if (targetPosition) moveClipToPosition(index, parseInt(targetPosition));
                               }}
                               className="h-8 w-8 p-0 hover:bg-primary/10"
                             >
                               <Save className="w-4 h-4" />
                             </Button>
                             <Button
                               size="sm"
                               variant="ghost"
                               onClick={() => {
                                 setMovingClipId(null);
                                 setTargetPosition("");
                               }}
                               className="h-8 w-8 p-0 hover:bg-muted"
                             >
                               <X className="w-4 h-4" />
                             </Button>
                           </div>
                         ) : (
                           <>
                             <Button
                               size="sm"
                               variant="ghost"
                               onClick={() => {
                                 setMovingClipId(clipKey);
                                 setTargetPosition("");
                               }}
                               className="h-8 w-8 p-0 hover:bg-muted flex-shrink-0"
                               title="Move to position"
                             >
                               <Hash className="w-4 h-4" />
                             </Button>
                             <div className="flex flex-col gap-0.5 flex-shrink-0">
                               <Button
                                 size="sm"
                                 variant="ghost"
                                 onClick={() => reorderClip(index, 'up')}
                                 disabled={index === 0}
                                 className="h-6 w-6 md:h-7 md:w-7 p-0 hover:bg-muted"
                               >
                                 <ChevronUp className="w-3.5 h-3.5" />
                               </Button>
                               <Button
                                 size="sm"
                                 variant="ghost"
                                 onClick={() => reorderClip(index, 'down')}
                                 disabled={index === selectedPlaylist.clips.length - 1}
                                 className="h-6 w-6 md:h-7 md:w-7 p-0 hover:bg-muted"
                               >
                                 <ChevronDown className="w-3.5 h-3.5" />
                               </Button>
                             </div>
                           </>
                         )}
                         
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeClipFromPlaylist(clip.videoUrl, clip.name)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                            title="Remove from playlist (clip stays available in Best Clips)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                       </div>
                     </div>
                   );
                   })}
               </div>
             ) : (
               <p className="text-sm text-muted-foreground text-center py-8">
                 Select a playlist to view clips
               </p>
             )}
           </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Close</Button>
        </DialogFooter>
      </DialogContent>

      {/* Video Player Dialog */}
      {playingVideo && (
        <Dialog open={!!playingVideo} onOpenChange={() => setPlayingVideo(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <div className="flex items-center justify-between gap-4">
                <DialogTitle className="font-bebas uppercase tracking-wider flex-1">
                  {playingVideo.name}
                </DialogTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (!selectedPlaylist) return;
                    
                    // Find current and next clip
                    const sortedClips = [...selectedPlaylist.clips].sort((a, b) => a.order - b.order);
                    const currentIndex = sortedClips.findIndex(c => c.videoUrl === playingVideo.url);
                    const nextClip = sortedClips[currentIndex + 1];
                    
                    // Remove current clip
                    removeClipFromPlaylist(playingVideo.url, playingVideo.name);
                    
                    // Skip to next or close
                    if (nextClip) {
                      setPlayingVideo({ url: nextClip.videoUrl, name: nextClip.name });
                      loadVideoDuration(nextClip.videoUrl);
                    } else {
                      setPlayingVideo(null);
                    }
                  }}
                  className="h-8 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Remove from playlist and skip to next"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              </div>
            </DialogHeader>
            <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
              <video
                src={playingVideo.url}
                controls
                autoPlay
                className="w-full h-full"
                controlsList="nodownload"
                onLoadedMetadata={(e) => {
                  const rawDuration = e.currentTarget.duration;
                  if (!Number.isFinite(rawDuration) || rawDuration <= 0 || !playingVideo) {
                    return;
                  }
                  const duration = Math.round(rawDuration);
                  const url = playingVideo.url;

                  setClipDurations((prev) => ({
                    ...prev,
                    [url]: duration,
                  }));

                  setSelectedPlaylist((prev) =>
                    prev
                      ? {
                          ...prev,
                          clips: prev.clips.map((clip) =>
                            clip.videoUrl === url ? { ...clip, duration } : clip
                          ),
                        }
                      : prev
                  );

                  setPlaylists((prev) =>
                    prev.map((playlist) => ({
                      ...playlist,
                      clips: playlist.clips.map((clip) =>
                        clip.videoUrl === url ? { ...clip, duration } : clip
                      ),
                    }))
                  );
                }}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Playlist Player */}
      {selectedPlaylist && showPlayer && (
        <PlaylistPlayer
          playlistId={selectedPlaylist.id}
          playlistName={selectedPlaylist.name}
          clips={selectedPlaylist.clips}
          isOpen={showPlayer}
          onClose={() => setShowPlayer(false)}
          onPlaylistUpdate={fetchPlaylists}
        />
      )}
    </Dialog>
  );
};