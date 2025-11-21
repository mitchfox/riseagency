import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, X, Save, ChevronUp, ChevronDown, List, Play, Trash2, Hash, Video, Download } from "lucide-react";
import { Label } from "@/components/ui/label";
import JSZip from "jszip";
import { PlaylistPlayer } from "./PlaylistPlayer";

interface Clip {
  id?: string;
  name: string;
  videoUrl: string;
  order: number;
}

interface Playlist {
  id: string;
  name: string;
  clips: Clip[];
}

interface PlaylistContentProps {
  playerData: any;
  availableClips: Array<{ id?: string; name: string; videoUrl: string }>;
}

export const PlaylistContent = ({ playerData, availableClips }: PlaylistContentProps) => {
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

      const mappedPlaylists = (data || []).map(p => ({
        ...p,
        clips: (p.clips as any) || [],
      }));

      setPlaylists(mappedPlaylists);

      if (selectedPlaylist) {
        const updatedSelected = mappedPlaylists.find(p => p.id === selectedPlaylist.id);
        if (updatedSelected) {
          setSelectedPlaylist(updatedSelected as Playlist);
        } else {
          setSelectedPlaylist(null);
        }
      }
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim() || !playerData?.id) return;

    try {
      const playerEmail = localStorage.getItem("player_email") || sessionStorage.getItem("player_email");
      
      if (!playerEmail) {
        toast.error("Please log in again");
        return;
      }

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

  const deletePlaylist = async (playlistId: string) => {
    try {
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId);

      if (error) throw error;

      setPlaylists(playlists.filter(p => p.id !== playlistId));
      if (selectedPlaylist?.id === playlistId) {
        setSelectedPlaylist(null);
      }
      toast.success("Playlist deleted");
    } catch (error: any) {
      console.error('Error deleting playlist:', error);
      toast.error("Failed to delete playlist");
    }
  };

  const addClipsToPlaylist = async () => {
    if (!selectedPlaylist || selectedClips.size === 0) return;

    setSaving(true);
    try {
      const clipsToAdd = availableClips
        .filter(clip => selectedClips.has(clip.videoUrl))
        .map((clip, idx) => ({
          id: clip.id,
          name: clip.name,
          videoUrl: clip.videoUrl,
          order: selectedPlaylist.clips.length + idx
        }));

      const updatedClips = [...selectedPlaylist.clips, ...clipsToAdd];

      const playerEmail = localStorage.getItem("player_email") || sessionStorage.getItem("player_email");
      
      if (!playerEmail) {
        toast.error("Please log in again");
        setSaving(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('update-playlist', {
        body: {
          playerEmail,
          playlistId: selectedPlaylist.id,
          clips: updatedClips
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setSelectedPlaylist({ ...selectedPlaylist, clips: updatedClips });
      setPlaylists(playlists.map(p => 
        p.id === selectedPlaylist.id ? { ...p, clips: updatedClips } : p
      ));
      setSelectedClips(new Set());
      toast.success("Clips added to playlist");
    } catch (error: any) {
      console.error('Error adding clips:', error);
      toast.error("Failed to add clips");
    } finally {
      setSaving(false);
    }
  };

  const removeClipFromPlaylist = async (clipIndex: number) => {
    if (!selectedPlaylist) return;

    setSaving(true);
    try {
      const updatedClips = selectedPlaylist.clips
        .filter((_, idx) => idx !== clipIndex)
        .map((clip, idx) => ({ ...clip, order: idx }));

      const playerEmail = localStorage.getItem("player_email") || sessionStorage.getItem("player_email");
      
      if (!playerEmail) {
        toast.error("Please log in again");
        setSaving(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('update-playlist', {
        body: {
          playerEmail,
          playlistId: selectedPlaylist.id,
          clips: updatedClips
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setSelectedPlaylist({ ...selectedPlaylist, clips: updatedClips });
      setPlaylists(playlists.map(p => 
        p.id === selectedPlaylist.id ? { ...p, clips: updatedClips } : p
      ));
      toast.success("Clip removed");
    } catch (error: any) {
      console.error('Error removing clip:', error);
      toast.error("Failed to remove clip");
    } finally {
      setSaving(false);
    }
  };

  const moveClip = async (fromIndex: number, toIndex: number) => {
    if (!selectedPlaylist || toIndex < 1 || toIndex > selectedPlaylist.clips.length) return;

    setSaving(true);
    try {
      const clips = [...selectedPlaylist.clips];
      const [movedClip] = clips.splice(fromIndex, 1);
      clips.splice(toIndex - 1, 0, movedClip);
      
      const updatedClips = clips.map((clip, idx) => ({ ...clip, order: idx }));

      const playerEmail = localStorage.getItem("player_email") || sessionStorage.getItem("player_email");
      
      if (!playerEmail) {
        toast.error("Please log in again");
        setSaving(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('update-playlist', {
        body: {
          playerEmail,
          playlistId: selectedPlaylist.id,
          clips: updatedClips
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setSelectedPlaylist({ ...selectedPlaylist, clips: updatedClips });
      setPlaylists(playlists.map(p => 
        p.id === selectedPlaylist.id ? { ...p, clips: updatedClips } : p
      ));
      setMovingClipId(null);
      setTargetPosition("");
      toast.success("Clip moved");
    } catch (error: any) {
      console.error('Error moving clip:', error);
      toast.error("Failed to move clip");
    } finally {
      setSaving(false);
    }
  };

  const downloadPlaylist = async (playlist: Playlist) => {
    if (!playlist.clips.length) {
      toast.error("No clips to download");
      return;
    }

    const loadingToast = toast.loading(`Preparing ${playlist.clips.length} clips...`);

    try {
      const zip = new JSZip();
      
      for (let i = 0; i < playlist.clips.length; i++) {
        const clip = playlist.clips[i];
        const response = await fetch(clip.videoUrl);
        const blob = await response.blob();
        
        const extension = clip.videoUrl.split('.').pop()?.split('?')[0] || 'mp4';
        zip.file(`${i + 1}. ${clip.name}.${extension}`, blob);
      }
      
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${playlist.name}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Playlist downloaded", { id: loadingToast });
    } catch (error) {
      console.error('Error downloading playlist:', error);
      toast.error("Failed to download playlist", { id: loadingToast });
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

  if (isLoadingPlaylists) {
    return <div className="text-center py-8 text-muted-foreground">Loading playlists...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Playlist Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Your Playlists</h3>
          {!isCreating && (
            <Button
              onClick={() => setIsCreating(true)}
              variant="outline"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Playlist
            </Button>
          )}
        </div>

        {isCreating && (
          <div className="flex gap-2">
            <Input
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="Playlist name"
              onKeyDown={(e) => e.key === 'Enter' && createPlaylist()}
              autoFocus
            />
            <Button onClick={createPlaylist} size="sm">
              <Save className="w-4 h-4" />
            </Button>
            <Button onClick={() => { setIsCreating(false); setNewPlaylistName(""); }} variant="ghost" size="sm">
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {playlists.length === 0 ? (
          <p className="text-muted-foreground text-sm">No playlists yet. Create one to get started!</p>
        ) : (
          <div className="grid gap-2">
            {playlists.map(playlist => (
              <div
                key={playlist.id}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedPlaylist?.id === playlist.id ? 'bg-accent border-primary' : 'hover:bg-accent/50'
                }`}
                onClick={() => setSelectedPlaylist(playlist)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <List className="w-4 h-4" />
                    <span className="font-medium">{playlist.name}</span>
                    <span className="text-sm text-muted-foreground">({playlist.clips.length} clips)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadPlaylist(playlist);
                      }}
                      variant="ghost"
                      size="sm"
                      title="Download playlist"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePlaylist(playlist.id);
                      }}
                      variant="ghost"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Playlist Content */}
      {selectedPlaylist && (
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{selectedPlaylist.name}</h3>
            {selectedPlaylist.clips.length > 0 && (
              <Button
                onClick={() => setShowPlayer(true)}
                size="sm"
                variant="outline"
              >
                <Video className="w-4 h-4 mr-2" />
                Player
              </Button>
            )}
          </div>

          {/* Add Clips Section */}
          {availableClips.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Add clips to playlist:</Label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {availableClips.map((clip) => {
                  const isInPlaylist = selectedPlaylist.clips.some(c => c.videoUrl === clip.videoUrl);
                  return (
                    <div key={clip.videoUrl} className="flex items-center space-x-2">
                      <Checkbox
                        id={`clip-${clip.videoUrl}`}
                        checked={selectedClips.has(clip.videoUrl)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedClips);
                          if (checked) {
                            newSelected.add(clip.videoUrl);
                          } else {
                            newSelected.delete(clip.videoUrl);
                          }
                          setSelectedClips(newSelected);
                        }}
                        disabled={isInPlaylist}
                      />
                      <Label
                        htmlFor={`clip-${clip.videoUrl}`}
                        className={`flex-1 cursor-pointer ${isInPlaylist ? 'text-muted-foreground line-through' : ''}`}
                      >
                        {clip.name}
                        {isInPlaylist && <span className="ml-2 text-xs">(Already in playlist)</span>}
                      </Label>
                    </div>
                  );
                })}
              </div>
              {selectedClips.size > 0 && (
                <Button
                  onClick={addClipsToPlaylist}
                  disabled={saving}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add {selectedClips.size} clip{selectedClips.size !== 1 ? 's' : ''}
                </Button>
              )}
            </div>
          )}

          {/* Playlist Clips */}
          {selectedPlaylist.clips.length === 0 ? (
            <p className="text-muted-foreground text-sm">No clips in this playlist yet.</p>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Playlist clips:</Label>
              <div className="space-y-2">
                {selectedPlaylist.clips.map((clip, index) => (
                  <div key={clip.id || clip.videoUrl} className="border rounded-lg p-3 bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        <span className="text-sm text-muted-foreground mt-1">#{index + 1}</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{clip.name}</p>
                          {playingVideo?.url === clip.videoUrl && (
                            <video
                              src={clip.videoUrl}
                              controls
                              autoPlay
                              className="w-full mt-2 rounded"
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {movingClipId === clip.videoUrl ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="1"
                              max={selectedPlaylist.clips.length}
                              value={targetPosition}
                              onChange={(e) => setTargetPosition(e.target.value)}
                              placeholder="#"
                              className="w-16 h-8 text-xs"
                            />
                            <Button
                              onClick={() => {
                                const pos = parseInt(targetPosition);
                                if (!isNaN(pos)) {
                                  moveClip(index, pos);
                                }
                              }}
                              size="sm"
                              variant="ghost"
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => {
                                setMovingClipId(null);
                                setTargetPosition("");
                              }}
                              size="sm"
                              variant="ghost"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              onClick={() => {
                                setMovingClipId(clip.videoUrl);
                                setTargetPosition((index + 1).toString());
                              }}
                              size="sm"
                              variant="ghost"
                              title="Move to position"
                            >
                              <Hash className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => setPlayingVideo(
                                playingVideo?.url === clip.videoUrl 
                                  ? null 
                                  : { url: clip.videoUrl, name: clip.name }
                              )}
                              size="sm"
                              variant="ghost"
                              title="Play clip"
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => downloadClip(clip, index)}
                              size="sm"
                              variant="ghost"
                              title="Download clip"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => removeClipFromPlaylist(index)}
                              size="sm"
                              variant="ghost"
                              title="Remove from playlist"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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
    </div>
  );
};
