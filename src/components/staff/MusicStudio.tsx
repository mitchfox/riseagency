import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music, Upload, Trash2, ExternalLink } from "lucide-react";
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
          <TabsTrigger value="portalmusic">Portal Music</TabsTrigger>
        </TabsList>

        <TabsContent value="suno" className="mt-4" forceMount={activeTab !== "suno" ? undefined : undefined}>
          <div className="hidden data-[state=inactive]:hidden" />
          <SunoTab />
        </TabsContent>

        <TabsContent value="portalmusic" className="mt-4">
          <PortalMusicTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ─── Suno AI Tab ─────────────────────────────────────────────────────────────

const SunoTab = () => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Music className="h-5 w-5" />
            Suno AI
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <a href="https://suno.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Open in new tab
            </a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Create music with AI directly from within the portal. Generated tracks can then be assigned to player portals in the Portal Music tab.
        </p>
      </CardHeader>
      <CardContent>
        <div className="w-full rounded-lg overflow-hidden border" style={{ height: "calc(100vh - 280px)", minHeight: "500px" }}>
          <iframe
            src="https://suno.com"
            className="w-full h-full border-0"
            allow="microphone; clipboard-write"
            title="Suno AI Music Generator"
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
      // Upsert into player_portal_settings
      const { error } = await supabase
        .from("player_portal_settings")
        .upsert(
          { player_id: selectedPlayerId, music_tracks: tracks as any },
          { onConflict: "player_id" }
        );
      if (error) throw error;

      // Update local state
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
      {/* Player selector */}
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
          <div className="flex items-center gap-3">
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

          {/* Track list */}
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

      {/* Summary of all players with tracks */}
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
