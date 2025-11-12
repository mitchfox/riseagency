import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Trash2, Save, ChevronUp, ChevronDown, List } from "lucide-react";
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bebas uppercase tracking-wider">
            Manage Playlists
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Playlists List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bebas text-lg uppercase">Playlists</h3>
              <Button
                size="sm"
                onClick={() => setIsCreating(true)}
                variant="outline"
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

            <div className="space-y-2">
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedPlaylist?.id === playlist.id 
                      ? 'bg-primary/10 border-primary' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedPlaylist(playlist)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <List className="w-4 h-4" />
                      <span className="font-medium truncate">{playlist.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {playlist.clips?.length || 0}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePlaylist(playlist.id);
                        }}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Available Clips */}
          <div className="space-y-3">
            <h3 className="font-bebas text-lg uppercase">Available Clips</h3>
            {selectedPlaylist && (
              <>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableClips
                    .filter(clip => !selectedPlaylist.clips?.some(pc => pc.name === clip.name))
                    .map((clip) => (
                      <div
                        key={clip.name}
                        className="flex items-center gap-2 p-2 border rounded hover:bg-muted"
                      >
                        <Checkbox
                          checked={selectedClips.has(clip.name)}
                          onCheckedChange={() => toggleClipSelection(clip.name)}
                        />
                        <Label className="flex-1 cursor-pointer truncate text-sm">
                          {clip.name}
                        </Label>
                      </div>
                    ))}
                </div>
                <Button
                  size="sm"
                  onClick={addClipsToPlaylist}
                  disabled={selectedClips.size === 0}
                  className="w-full"
                >
                  Add Selected ({selectedClips.size})
                </Button>
              </>
            )}
          </div>

          {/* Playlist Clips */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bebas text-lg uppercase">
                {selectedPlaylist ? selectedPlaylist.name : 'Select a playlist'}
              </h3>
              {selectedPlaylist && selectedPlaylist.clips?.length > 0 && (
                <Button
                  size="sm"
                  onClick={savePlaylist}
                  disabled={saving}
                  variant="default"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              )}
            </div>

            {selectedPlaylist && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {selectedPlaylist.clips?.sort((a, b) => a.order - b.order).map((clip, index) => (
                  <div
                    key={clip.name}
                    className="flex items-center gap-2 p-2 border rounded bg-card"
                  >
                    <span className="text-sm font-bold text-primary w-6">
                      {index + 1}.
                    </span>
                    <span className="flex-1 truncate text-sm">{clip.name}</span>
                    <div className="flex flex-col gap-0.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => reorderClip(index, 'up')}
                        disabled={index === 0}
                        className="h-4 px-1 py-0"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => reorderClip(index, 'down')}
                        disabled={index === selectedPlaylist.clips.length - 1}
                        className="h-4 px-1 py-0"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeClipFromPlaylist(clip.name)}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};