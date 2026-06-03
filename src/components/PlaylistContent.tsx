import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, X, Save, ChevronUp, ChevronDown, List, Play, Trash2, Hash, Video, Download, Star, Copy, Pencil, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import JSZip from "jszip";
import { ClippedActionsPlayer } from "./ClippedActionsPlayer";
import { usePlaylistActionScores } from "@/hooks/usePlaylistActionScores";
import { getR90Grade } from "@/lib/gradeCalculations";
import { ArrowDownWideNarrow } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Clip {
  id?: string;
  name: string;
  videoUrl: string;
  order: number;
  action_score?: number | null;
}

interface Playlist {
  id: string;
  name: string;
  clips: Clip[];
  is_favourite?: boolean;
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
  const [confirmSortOpen, setConfirmSortOpen] = useState(false);
  const [showAddClips, setShowAddClips] = useState(false);
  const selectedPlaylistRef = useRef<HTMLDivElement | null>(null);

  const clipMeta = usePlaylistActionScores(playerData?.id);
  const scoreFor = (videoUrl: string): number | null => clipMeta[videoUrl]?.score ?? null;
  const logoFor = (videoUrl: string): string | null => clipMeta[videoUrl]?.clubLogoUrl ?? null;
  const opponentFor = (videoUrl: string): string | null => clipMeta[videoUrl]?.opponent ?? null;

  useEffect(() => {
    if (playerData?.id) {
      setIsLoadingPlaylists(true);
      fetchPlaylists();
    }
  }, [playerData?.id]);

  // Auto-scroll the selected playlist section into view when a playlist opens.
  useEffect(() => {
    if (!selectedPlaylist?.id) return;
    const id = requestAnimationFrame(() => {
      selectedPlaylistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(id);
  }, [selectedPlaylist?.id]);

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

  const duplicatePlaylist = async (playlistId: string) => {
    try {
      const playerEmail = localStorage.getItem("player_email") || sessionStorage.getItem("player_email");
      if (!playerEmail) {
        toast.error("Please log in again");
        return;
      }
      const { data, error } = await supabase.functions.invoke('duplicate-playlist', {
        body: { playerEmail, playlistId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const copy = { ...data.playlist, clips: (data.playlist.clips as any) || [] };
      setPlaylists(prev => [copy, ...prev]);
      toast.success("Playlist duplicated");
    } catch (err: any) {
      console.error('Error duplicating playlist:', err);
      toast.error("Failed to duplicate playlist");
    }
  };

  const renamePlaylist = async (playlistId: string, currentName: string) => {
    const next = window.prompt("Rename playlist", currentName);
    if (!next || !next.trim() || next.trim() === currentName) return;
    const playerEmail = localStorage.getItem("player_email") || sessionStorage.getItem("player_email");
    if (!playerEmail) { toast.error("Please log in again"); return; }
    const { data, error } = await supabase.functions.invoke('playlist-manage', {
      body: { action: 'rename', playlistId, playerEmail, name: next.trim() },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Rename failed");
      return;
    }
    const newName = next.trim();
    setPlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, name: newName } : p));
    setSelectedPlaylist(prev => prev && prev.id === playlistId ? { ...prev, name: newName } : prev);
    toast.success("Playlist renamed");
  };

  const toggleFavourite = async (playlist: Playlist) => {
    const next = !playlist.is_favourite;
    const playerEmail = localStorage.getItem("player_email") || sessionStorage.getItem("player_email");
    if (!playerEmail) { toast.error("Please log in again"); return; }
    const { data, error } = await supabase.functions.invoke('playlist-manage', {
      body: { action: 'favourite', playlistId: playlist.id, playerEmail, isFavourite: next },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Failed to update favourite");
      return;
    }
    setPlaylists(prev => prev.map(p => p.id === playlist.id ? { ...p, is_favourite: next } : p));
    toast.success(next ? 'Marked as favourite — visible to highlights makers' : 'Removed from favourites');
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

  const sortPlaylistByR90 = async () => {
    if (!selectedPlaylist) return;
    setSaving(true);
    try {
      const sorted = [...selectedPlaylist.clips]
        .map((c) => ({ ...c, _score: scoreFor(c.videoUrl) ?? 0 }))
        .sort((a, b) => b._score - a._score)
        .map(({ _score, ...c }, i) => ({ ...c, order: i }));

      const playerEmail = localStorage.getItem("player_email") || sessionStorage.getItem("player_email");
      if (!playerEmail) { toast.error("Please log in again"); setSaving(false); return; }

      const { data, error } = await supabase.functions.invoke("update-playlist", {
        body: { playerEmail, playlistId: selectedPlaylist.id, clips: sorted },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      setSelectedPlaylist({ ...selectedPlaylist, clips: sorted });
      setPlaylists(playlists.map((p) => p.id === selectedPlaylist.id ? { ...p, clips: sorted } : p));
      toast.success("Sorted by R90 (highest first)");
    } catch (e: any) {
      console.error("Sort by R90 failed:", e);
      toast.error("Failed to sort playlist");
    } finally {
      setSaving(false);
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
                      onClick={async (e) => {
                        e.stopPropagation();
                        await toggleFavourite(playlist);
                      }}
                      variant="ghost"
                      size="sm"
                      title={playlist.is_favourite ? 'Unmark favourite' : 'Mark favourite (show on Highlights Portal)'}
                    >
                      <Star className={`w-4 h-4 ${playlist.is_favourite ? 'fill-[#C6A332] text-[#C6A332]' : 'text-muted-foreground'}`} />
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        renamePlaylist(playlist.id, playlist.name);
                      }}
                      variant="ghost"
                      size="sm"
                      title="Rename playlist"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
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
                        duplicatePlaylist(playlist.id);
                      }}
                      variant="ghost"
                      size="sm"
                      title="Duplicate playlist"
                    >
                      <Copy className="w-4 h-4" />
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
        <div ref={selectedPlaylistRef} className="space-y-4 border-t pt-4 scroll-mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{selectedPlaylist.name}</h3>
            {selectedPlaylist.clips.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setConfirmSortOpen(true)}
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  title="Reorder clips by R90 score, highest first"
                >
                  <ArrowDownWideNarrow className="w-4 h-4 mr-2" />
                  Sort by R90
                </Button>
                <Button
                  onClick={() => setShowPlayer(true)}
                  size="sm"
                  className="bg-[hsl(var(--gold))] text-black hover:bg-[hsl(var(--gold))]/90 border-transparent"
                >
                  <Video className="w-4 h-4 mr-2" />
                  Player
                </Button>
              </div>
            )}
          </div>

          {/* Add Clips Section */}
          {availableClips.length > 0 && (
            <Collapsible open={showAddClips} onOpenChange={setShowAddClips}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full sm:w-auto justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add clips to playlist ({availableClips.length} available)
                  </span>
                  {showAddClips ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-3">
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
              </CollapsibleContent>
            </Collapsible>
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
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className="text-sm text-muted-foreground mt-1">#{index + 1}</span>
                        {logoFor(clip.videoUrl) && (
                          <img
                            src={logoFor(clip.videoUrl) as string}
                            alt={opponentFor(clip.videoUrl) || "Club logo"}
                            title={opponentFor(clip.videoUrl) || undefined}
                            className="w-5 h-5 object-contain mt-0.5 shrink-0"
                            loading="lazy"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm break-words">{clip.name}</p>
                            {(() => {
                              const s = scoreFor(clip.videoUrl);
                              if (s == null) return null;
                              const g = getR90Grade(s);
                              return (
                                <span
                                  className="inline-flex items-center justify-center min-w-[36px] px-1.5 py-[1px] rounded-full text-[10px] font-bold text-black"
                                  style={{ backgroundColor: g.color }}
                                  title={`R90 ${s.toFixed(2)} (${g.grade})`}
                                >
                                  {s.toFixed(2)}
                                </span>
                              );
                            })()}
                          </div>
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
                      <div className="flex items-center gap-1 flex-wrap justify-end shrink-0 self-end sm:self-start">
                        {movingClipId === clip.videoUrl ? (
                          <div className="flex items-center gap-1 flex-wrap">
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
                              size="icon"
                              className="h-8 w-8 bg-green-600 hover:bg-green-700 text-white"
                              title="Confirm move"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => {
                                setMovingClipId(null);
                                setTargetPosition("");
                              }}
                              size="icon"
                              className="h-8 w-8 bg-red-600 hover:bg-red-700 text-white"
                              title="Cancel"
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
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
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
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              title="Play clip"
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => downloadClip(clip, index)}
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              title="Download clip"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => removeClipFromPlaylist(index)}
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
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
        <ClippedActionsPlayer
          open={showPlayer}
          onOpenChange={(o) => setShowPlayer(o)}
          title={selectedPlaylist.name}
          language={playerData?.portal_language || "en"}
          mode="playlist"
          playerId={playerData?.id}
          playerEmail={localStorage.getItem("player_email") || sessionStorage.getItem("player_email") || undefined}
          onReorderClip={(fromIdx, toPos) => moveClip(fromIdx, toPos)}
          onRemoveClip={(idx) => removeClipFromPlaylist(idx)}
          clips={selectedPlaylist.clips.map((c, i) => ({
            id: c.id || `clip-${c.videoUrl}`,
            action_number: i + 1,
            action_type: "Playlist",
            action_description: c.name,
            video_url: c.videoUrl,
            minute: 0,
            action_score: scoreFor(c.videoUrl),
            clip_logo_url: logoFor(c.videoUrl),
          }))}
        />
      )}

      <AlertDialog open={confirmSortOpen} onOpenChange={setConfirmSortOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Reorder by R90 score?</AlertDialogTitle>
            <AlertDialogDescription>
              This rewrites the order of every clip in this playlist, highest R90 first. You can't undo it in one click.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-destructive sm:min-w-[140px]"
            >
              No, keep order
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sortPlaylistByR90()}
              className="bg-green-600 hover:bg-green-700 text-white sm:min-w-[140px]"
            >
              Yes, reorder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
