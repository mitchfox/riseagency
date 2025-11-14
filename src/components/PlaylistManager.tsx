import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, X, Save, ChevronUp, ChevronDown, List, Play, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";

interface Clip {
  name: string;
  videoUrl: string;
  order: number;
}

interface Playlist {
  id: string;
  name: string;
  clips: Clip[];
}

interface PlaylistManagerProps {
  playerData: any;
  availableClips: Array<{ name: string; videoUrl: string }>;
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

  useEffect(() => {
    fetchPlaylists();
  }, [playerData]);

  const fetchPlaylists = async () => {
    if (!playerData?.id) return;

    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('player_id', playerData.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching playlists:', error);
      toast.error("Failed to load playlists");
      return;
    }

    setPlaylists((data || []).map(p => ({
      ...p,
      clips: (p.clips as any) || []
    })));
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim() || !playerData?.id) return;

    const { data, error } = await supabase
      .from('playlists')
      .insert({
        player_id: playerData.id,
        name: newPlaylistName.trim(),
        clips: []
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create playlist");
      return;
    }

    const newPlaylist = { ...data, clips: (data.clips as any) || [] };
    setPlaylists([newPlaylist, ...playlists]);
    setSelectedPlaylist(newPlaylist);
    setNewPlaylistName("");
    setIsCreating(false);
    toast.success("Playlist created");
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

  const toggleClipSelection = (clipName: string) => {
    const newSelected = new Set(selectedClips);
    if (newSelected.has(clipName)) {
      newSelected.delete(clipName);
    } else {
      newSelected.add(clipName);
    }
    setSelectedClips(newSelected);
  };

  const addClipsToPlaylist = async () => {
    if (!selectedPlaylist || selectedClips.size === 0) return;

    const existingClips = selectedPlaylist.clips || [];
    const maxOrder = existingClips.length > 0 
      ? Math.max(...existingClips.map(c => c.order))
      : 0;

    const newClips = Array.from(selectedClips).map((clipName, index) => {
      const clip = availableClips.find(c => c.name === clipName);
      return {
        name: clipName,
        videoUrl: clip!.videoUrl,
        order: maxOrder + index + 1
      };
    });

    const updatedClips = [...existingClips, ...newClips];

    const { error } = await supabase
      .from('playlists')
      .update({ clips: updatedClips as any })
      .eq('id', selectedPlaylist.id);

    if (error) {
      toast.error("Failed to add clips");
      return;
    }

    setSelectedPlaylist({ ...selectedPlaylist, clips: updatedClips });
    setPlaylists(playlists.map(p => 
      p.id === selectedPlaylist.id ? { ...p, clips: updatedClips } : p
    ));
    setSelectedClips(new Set());
    toast.success("Clips added to playlist");
  };

  const removeClipFromPlaylist = async (clipName: string) => {
    if (!selectedPlaylist) return;

    const updatedClips = selectedPlaylist.clips
      .filter(c => c.name !== clipName)
      .map((c, index) => ({ ...c, order: index + 1 }));

    const { error } = await supabase
      .from('playlists')
      .update({ clips: updatedClips as any })
      .eq('id', selectedPlaylist.id);

    if (error) {
      toast.error("Failed to remove clip");
      return;
    }

    setSelectedPlaylist({ ...selectedPlaylist, clips: updatedClips });
    setPlaylists(playlists.map(p => 
      p.id === selectedPlaylist.id ? { ...p, clips: updatedClips } : p
    ));
    toast.success("Clip removed");
  };

  const reorderClip = async (index: number, direction: 'up' | 'down') => {
    if (!selectedPlaylist) return;

    const clips = [...selectedPlaylist.clips];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= clips.length) return;

    [clips[index], clips[newIndex]] = [clips[newIndex], clips[index]];
    
    const reorderedClips = clips.map((c, i) => ({ ...c, order: i + 1 }));

    const { error } = await supabase
      .from('playlists')
      .update({ clips: reorderedClips as any })
      .eq('id', selectedPlaylist.id);

    if (error) {
      toast.error("Failed to reorder clips");
      return;
    }

    setSelectedPlaylist({ ...selectedPlaylist, clips: reorderedClips });
    setPlaylists(playlists.map(p => 
      p.id === selectedPlaylist.id ? { ...p, clips: reorderedClips } : p
    ));
  };

  const savePlaylist = async () => {
    if (!selectedPlaylist || !playerData?.email) return;

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('save-playlist', {
        body: { 
          playlistId: selectedPlaylist.id,
          playerEmail: playerData.email
        }
      });

      if (error) throw error;

      toast.success(`Playlist saved! ${data.clips.length} clips exported to folder.`);
    } catch (error) {
      console.error('Save error:', error);
      toast.error("Failed to save playlist");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
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
              {playlists.length === 0 ? (
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
                  {availableClips
                    .filter(clip => !selectedPlaylist.clips?.some(pc => pc.name === clip.name))
                    .map((clip) => (
                      <div
                        key={clip.name}
                        className="flex items-center gap-2 p-2 border rounded hover:bg-muted transition-colors"
                      >
                        <Checkbox
                          checked={selectedClips.has(clip.name)}
                          onCheckedChange={() => toggleClipSelection(clip.name)}
                        />
                        <Label className="flex-1 cursor-pointer text-xs md:text-sm leading-tight break-words">
                          {clip.name}
                        </Label>
                      </div>
                    ))}
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
                <Button
                  size="sm"
                  onClick={savePlaylist}
                  disabled={saving}
                  variant="default"
                  className="h-8 flex-shrink-0"
                >
                  <Save className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">
                    {saving ? 'Saving...' : 'Save'}
                  </span>
                </Button>
              )}
            </div>

            {selectedPlaylist ? (
              <div className="space-y-2 max-h-[250px] md:max-h-[400px] overflow-y-auto pr-2">
                {selectedPlaylist.clips?.sort((a, b) => a.order - b.order).map((clip, index) => (
                  <div
                    key={clip.name}
                    className="flex items-center gap-1.5 md:gap-2 p-2 border rounded bg-card"
                  >
                    <span className="text-xs md:text-sm font-bold text-primary w-5 md:w-6 flex-shrink-0">
                      {index + 1}.
                    </span>
                    <span className="flex-1 text-xs md:text-sm leading-tight break-words min-w-0">{clip.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPlayingVideo({ url: clip.videoUrl, name: clip.name })}
                      className="h-7 w-7 p-0 hover:bg-primary/10 text-primary flex-shrink-0"
                      title="Watch clip"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </Button>
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => reorderClip(index, 'up')}
                        disabled={index === 0}
                        className="h-5 w-5 md:h-6 md:w-6 p-0 hover:bg-muted"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => reorderClip(index, 'down')}
                        disabled={index === selectedPlaylist.clips.length - 1}
                        className="h-5 w-5 md:h-6 md:w-6 p-0 hover:bg-muted"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeClipFromPlaylist(clip.name)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
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
              <DialogTitle className="font-bebas uppercase tracking-wider">
                {playingVideo.name}
              </DialogTitle>
            </DialogHeader>
            <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
              <video
                src={playingVideo.url}
                controls
                autoPlay
                className="w-full h-full"
                controlsList="nodownload"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};