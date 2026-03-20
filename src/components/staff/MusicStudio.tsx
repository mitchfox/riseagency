import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music, Upload, Trash2, ExternalLink, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MusicTrack {
  url: string;
  name: string;
}

interface PlayerOption {
  id: string;
  name: string;
  music_tracks: MusicTrack[];
}

const STORAGE_KEY = "musicStudio_activeTab";

export const MusicStudio = () => {
  const [activeTab, setActiveTab] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || "suno"; }
    catch { return "suno"; }
  });

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    try { localStorage.setItem(STORAGE_KEY, value); } catch {}
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Music className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Music Studio</h2>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="suno">Suno AI</TabsTrigger>
          <TabsTrigger value="sunolive">Suno Studio</TabsTrigger>
          <TabsTrigger value="portalmusic">Portal Music</TabsTrigger>
        </TabsList>

        <TabsContent value="suno" className="mt-4">
          <SunoTab />
        </TabsContent>

        <TabsContent value="sunolive" className="mt-4">
          <SunoLiveTab />
        </TabsContent>

        <TabsContent value="portalmusic" className="mt-4">
          <PortalMusicTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ─── Suno AI Tab ─────────────────────────────────────────────────────────────

const SUNO_SONGS_KEY = "musicStudio_sunoSongs";

interface SunoSong {
  id: string;
  url: string;
  title: string;
  addedAt: string;
}

const extractSunoId = (url: string): string | null => {
  const match = url.match(/suno\.com\/song\/([a-zA-Z0-9-]+)/);
  if (match) return match[1];
  if (/^[a-f0-9-]{36}$/.test(url.trim())) return url.trim();
  return null;
};

const SunoTab = () => {
  const [songs, setSongs] = useState<SunoSong[]>(() => {
    try { return JSON.parse(localStorage.getItem(SUNO_SONGS_KEY) || "[]"); }
    catch { return []; }
  });
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");

  const saveSongs = (updated: SunoSong[]) => {
    setSongs(updated);
    try { localStorage.setItem(SUNO_SONGS_KEY, JSON.stringify(updated)); } catch {}
  };

  const handleAddSong = () => {
    const id = extractSunoId(newUrl);
    if (!id) {
      toast.error("Please paste a valid Suno song URL (e.g. https://suno.com/song/...)");
      return;
    }
    if (songs.some(s => s.id === id)) {
      toast.error("This song has already been added.");
      return;
    }
    const song: SunoSong = {
      id,
      url: `https://suno.com/song/${id}`,
      title: newTitle.trim() || `Track ${songs.length + 1}`,
      addedAt: new Date().toISOString(),
    };
    saveSongs([song, ...songs]);
    setNewUrl("");
    setNewTitle("");
    toast.success("Song added");
  };

  const handleRemoveSong = (id: string) => {
    saveSongs(songs.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Music className="h-5 w-5" />
              Suno AI
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <a href="https://suno.com/create" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Open Suno
              </a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Open Suno to create music with AI, then paste the song link below to save and preview it here. Songs can be downloaded from Suno and uploaded to player portals in the Portal Music tab.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add song form */}
          <div className="flex items-end gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px] space-y-1">
              <label className="text-xs text-muted-foreground">Suno song URL</label>
              <Input
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                placeholder="https://suno.com/song/..."
                className="h-9"
                onKeyDown={e => e.key === "Enter" && handleAddSong()}
              />
            </div>
            <div className="w-48 space-y-1">
              <label className="text-xs text-muted-foreground">Title (optional)</label>
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Track name"
                className="h-9"
                onKeyDown={e => e.key === "Enter" && handleAddSong()}
              />
            </div>
            <Button size="sm" onClick={handleAddSong} disabled={!newUrl.trim()} className="h-9">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </div>

          {/* Song list with embeds */}
          {songs.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg p-10 text-center text-muted-foreground">
              <Music className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No songs saved yet</p>
              <p className="text-xs mt-1">Open Suno to create a track, then paste the link here to preview and manage it.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {songs.map(song => (
                <div key={song.id} className="rounded-xl border overflow-hidden bg-background">
                  <iframe
                    src={`https://suno.com/embed/${song.id}`}
                    className="w-full border-0"
                    style={{ height: "160px" }}
                    allow="autoplay"
                    title={song.title}
                  />
                  <div className="flex items-center justify-between px-3 py-2 border-t">
                    <div className="flex items-center gap-2 min-w-0">
                      <Music className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-sm font-medium truncate">{song.title}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 px-2" asChild>
                        <a href={song.url} target="_blank" rel="noopener noreferrer" title="Open in Suno">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => handleRemoveSong(song.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Suno Live / Studio Tab ──────────────────────────────────────────────────

const SunoLiveTab = () => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Music className="h-5 w-5" />
            Suno Studio
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <a href="https://suno.com/create" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Open in New Tab
            </a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Create and edit music directly within Suno. Use the Suno AI tab to save and manage your tracks.
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg overflow-hidden border" style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}>
          <iframe
            src="https://suno.com/create"
            className="w-full h-full border-0"
            allow="autoplay; microphone"
            title="Suno Studio"
          />
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Portal Music Admin Tab ──────────────────────────────────────────────────

const PortalMusicTab = () => {
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [uploading, setUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist selected player
  useEffect(() => {
    try {
      const saved = localStorage.getItem("musicStudio_selectedPlayer");
      if (saved) setSelectedPlayerId(saved);
    } catch {}
  }, []);

  // Fetch players with their music tracks
  useEffect(() => {
    const fetchPlayers = async () => {
      const { data: allPlayers } = await supabase
        .from("players")
        .select("id, name")
        .order("name");

      if (!allPlayers) return;

      const { data: settings } = await supabase
        .from("player_portal_settings")
        .select("player_id, music_tracks");

      const trackMap = new Map<string, MusicTrack[]>();
      if (settings) {
        for (const s of settings) {
          const mt = (s.music_tracks as any[]) || [];
          trackMap.set(s.player_id, mt.filter((t: any) => t?.url));
        }
      }

      const options: PlayerOption[] = allPlayers.map(p => ({
        id: p.id,
        name: p.name,
        music_tracks: trackMap.get(p.id) || [],
      }));

      setPlayers(options);

      // Auto-select saved or first player
      const savedId = localStorage.getItem("musicStudio_selectedPlayer");
      if (savedId && options.find(p => p.id === savedId)) {
        setSelectedPlayerId(savedId);
        setTracks(options.find(p => p.id === savedId)?.music_tracks || []);
      } else if (options.length > 0 && !selectedPlayerId) {
        setSelectedPlayerId(options[0].id);
        setTracks(options[0].music_tracks);
      }
    };
    fetchPlayers();
  }, []);

  const handlePlayerChange = (playerId: string) => {
    if (hasChanges) {
      const confirm = window.confirm("You have unsaved changes. Switch player anyway?");
      if (!confirm) return;
    }
    setSelectedPlayerId(playerId);
    localStorage.setItem("musicStudio_selectedPlayer", playerId);
    const player = players.find(p => p.id === playerId);
    setTracks(player?.music_tracks || []);
    setHasChanges(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPlayerId) return;
    e.target.value = "";

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${selectedPlayerId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("marketing-gallery")
        .upload(`portal-music/${fileName}`, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("marketing-gallery")
        .getPublicUrl(`portal-music/${fileName}`);

      const trackName = file.name.replace(/\.[^.]+$/, "");
      setTracks(prev => [...prev, { url: urlData.publicUrl, name: trackName }]);
      setHasChanges(true);
      toast.success("Track added");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveTrack = (index: number) => {
    setTracks(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleTrackNameChange = (index: number, name: string) => {
    setTracks(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name };
      return updated;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedPlayerId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("player_portal_settings")
        .upsert(
          { player_id: selectedPlayerId, music_tracks: tracks as any },
          { onConflict: "player_id" }
        );
      if (error) throw error;

      setPlayers(prev => prev.map(p =>
        p.id === selectedPlayerId ? { ...p, music_tracks: tracks } : p
      ));
      setHasChanges(false);
      toast.success("Music saved");
    } catch (err: any) {
      toast.error("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);
  const playersWithTracks = players.filter(p => p.music_tracks.length > 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Music className="h-5 w-5" />
            Portal Music Admin
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Manage which music tracks appear on each player's portal. Upload audio files or assign tracks from Suno.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={selectedPlayerId} onValueChange={handlePlayerChange}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Select player" />
              </SelectTrigger>
              <SelectContent>
                {players.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.music_tracks.length > 0 ? `(${p.music_tracks.length} tracks)` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading || !selectedPlayerId}>
              <Upload className="h-3.5 w-3.5 mr-1" />
              {uploading ? "Uploading..." : "Add Track"}
            </Button>

            {hasChanges && (
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {selectedPlayerId && tracks.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
              <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tracks yet. Upload audio files to build {selectedPlayer?.name}'s playlist.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tracks.map((track, index) => (
                <div key={index} className="flex items-center gap-2 rounded-lg border p-2.5 bg-background">
                  <Music className="h-4 w-4 text-primary shrink-0" />
                  <Input
                    value={track.name}
                    onChange={(e) => handleTrackNameChange(index, e.target.value)}
                    className="h-7 text-sm flex-1"
                    placeholder="Track name"
                  />
                  <audio src={track.url} controls className="h-8 max-w-[180px]" />
                  <Button size="sm" variant="destructive" className="h-7 text-xs px-2" onClick={() => handleRemoveTrack(index)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {playersWithTracks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Players with Music</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {playersWithTracks.map(p => (
                <button
                  key={p.id}
                  onClick={() => handlePlayerChange(p.id)}
                  className={`flex items-center gap-2 rounded-lg border p-2 text-left text-sm transition-colors hover:bg-muted ${
                    p.id === selectedPlayerId ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <Music className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">{p.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{p.music_tracks.length}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
