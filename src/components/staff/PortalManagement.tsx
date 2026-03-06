import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { Monitor, Eye, EyeOff, Image, Save, RotateCcw, Upload, Trash2, GripVertical, User, Move, Music } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ImageCropDialog } from "./ImageCropDialog";

interface Player {
  id: string;
  name: string;
  position: string;
  representation_status: string | null;
  image_url: string | null;
}

interface PortalSettings {
  id?: string;
  player_id: string;
  // Sections
  show_hub: boolean;
  show_analysis: boolean;
  show_programming: boolean;
  show_nutrition: boolean;
  show_highlights: boolean;
  show_transfer_hub: boolean;
  show_key_documents: boolean;
  show_updates: boolean;
  show_view_profile: boolean;
  show_countdown: boolean;
  show_comparisons: boolean;
  show_scouting: boolean;
  show_cognisance: boolean;
  show_injury_log: boolean;
  // Granular components
  show_aphorisms: boolean;
  show_quick_stats: boolean;
  show_news_feed: boolean;
  show_r90_chart: boolean;
  show_match_clipper: boolean;
  show_positional_guides: boolean;
  show_video_reports: boolean;
  show_data_tab: boolean;
  show_performance_reports: boolean;
  show_music_player: boolean;
  // Hero
  hero_images: string[];
  hero_focal_points: string[];
  // Music
  music_tracks: { url: string; name: string }[];
}

const DEFAULT_SETTINGS: Omit<PortalSettings, 'player_id'> = {
  show_hub: true,
  show_analysis: true,
  show_programming: true,
  show_nutrition: true,
  show_highlights: true,
  show_transfer_hub: true,
  show_key_documents: true,
  show_updates: true,
  show_view_profile: true,
  show_countdown: true,
  show_comparisons: true,
  show_scouting: true,
  show_cognisance: true,
  show_injury_log: true,
  show_aphorisms: true,
  show_quick_stats: true,
  show_news_feed: true,
  show_r90_chart: true,
  show_match_clipper: true,
  show_positional_guides: true,
  show_video_reports: true,
  show_data_tab: true,
  show_performance_reports: true,
  show_music_player: false,
  hero_images: [],
  hero_focal_points: [],
  music_tracks: [],
};

type FeatureItem = { key: string; label: string; description: string };

const SECTION_FEATURES: FeatureItem[] = [
  { key: 'show_hub', label: 'Hub', description: 'Main dashboard hub' },
  { key: 'show_analysis', label: 'Analysis', description: 'Performance analysis section' },
  { key: 'show_programming', label: 'Programming', description: 'S&C programmes' },
  { key: 'show_nutrition', label: 'Nutrition', description: 'Nutrition plans' },
  { key: 'show_highlights', label: 'Highlights', description: 'Video highlights reel' },
  { key: 'show_transfer_hub', label: 'Transfer Hub', description: 'Transfer activity' },
  { key: 'show_key_documents', label: 'Key Documents', description: 'Contracts and documents' },
  { key: 'show_updates', label: 'Updates', description: 'Player communications' },
  { key: 'show_view_profile', label: 'View Profile', description: 'Public profile link' },
  { key: 'show_countdown', label: 'Next Fixture Countdown', description: 'Match countdown timer' },
  { key: 'show_comparisons', label: 'Comparisons', description: 'Peer comparisons' },
  { key: 'show_scouting', label: 'Scouting Reports', description: 'Scouting feedback' },
  { key: 'show_cognisance', label: 'Cognisance', description: 'Mental performance tools' },
  { key: 'show_injury_log', label: 'Injury Log', description: 'Injury tracking' },
];

const COMPONENT_FEATURES: FeatureItem[] = [
  { key: 'show_aphorisms', label: 'Aphorisms', description: 'Inspirational quotes on Hub' },
  { key: 'show_quick_stats', label: 'Quick Stats', description: 'Rotating stat comparisons' },
  { key: 'show_news_feed', label: 'News Feed', description: 'Hub news and updates feed' },
  { key: 'show_r90_chart', label: 'R90 Chart', description: 'R90 performance bar chart' },
  { key: 'show_match_clipper', label: 'Match Clipper', description: 'In-portal match clipping tool' },
  { key: 'show_positional_guides', label: 'Positional Guides', description: 'Position-specific guidance' },
  { key: 'show_video_reports', label: 'Video Reports', description: 'Analysis video reports' },
  { key: 'show_data_tab', label: 'Data Tab', description: 'Statistical data tables' },
  { key: 'show_performance_reports', label: 'Performance Reports', description: 'Downloadable performance PDFs' },
  { key: 'show_music_player', label: 'Music Player', description: 'Background music player on portal' },
];

const ALL_FEATURES = [...SECTION_FEATURES, ...COMPONENT_FEATURES];

const STATUS_ORDER = ['represented', 'mandated', 'previously_mandated', 'fuel_for_football', 'other', 'scouted'];
const STATUS_LABELS: Record<string, string> = {
  represented: 'Represented',
  mandated: 'Mandated',
  previously_mandated: 'Previously Mandated',
  fuel_for_football: 'Fuel for Football',
  other: 'Other',
  scouted: 'Scouted',
};

export const PortalManagement = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [settings, setSettings] = useState<PortalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Hero image management
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [editingHeroIndex, setEditingHeroIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const musicFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingMusic, setUploadingMusic] = useState(false);

  useEffect(() => { fetchPlayers(); }, []);
  useEffect(() => {
    if (selectedPlayerId) fetchSettings(selectedPlayerId);
    else setSettings(null);
  }, [selectedPlayerId]);

  const fetchPlayers = async () => {
    const { data } = await supabase
      .from("players")
      .select("id, name, position, representation_status, image_url")
      .order("name");
    setPlayers(data || []);
    setLoading(false);
  };

  const groupedPlayers = useMemo(() => {
    const groups: { status: string; label: string; players: Player[] }[] = [];
    STATUS_ORDER.forEach(status => {
      const matching = players.filter(p => p.representation_status === status);
      if (matching.length > 0) groups.push({ status, label: STATUS_LABELS[status] || status, players: matching });
    });
    const uncategorised = players.filter(p => !p.representation_status || !STATUS_ORDER.includes(p.representation_status));
    if (uncategorised.length > 0) groups.push({ status: 'uncategorised', label: 'Uncategorised', players: uncategorised });
    return groups;
  }, [players]);

  const fetchSettings = async (playerId: string) => {
    const { data } = await supabase
      .from("player_portal_settings")
      .select("*")
      .eq("player_id", playerId)
      .maybeSingle();

    if (data) {
      setSettings({
        ...data,
        hero_images: (data.hero_images as string[]) || [],
        hero_focal_points: (data.hero_focal_points as string[]) || [],
        music_tracks: (data.music_tracks as any[] || []) as { url: string; name: string }[],
        // Ensure new columns have defaults
        show_aphorisms: data.show_aphorisms ?? true,
        show_quick_stats: data.show_quick_stats ?? true,
        show_news_feed: data.show_news_feed ?? true,
        show_r90_chart: data.show_r90_chart ?? true,
        show_match_clipper: data.show_match_clipper ?? true,
        show_positional_guides: data.show_positional_guides ?? true,
        show_video_reports: data.show_video_reports ?? true,
        show_data_tab: data.show_data_tab ?? true,
        show_performance_reports: data.show_performance_reports ?? true,
        show_music_player: data.show_music_player ?? false,
      } as PortalSettings);
    } else {
      setSettings({ player_id: playerId, ...DEFAULT_SETTINGS });
    }
    setHasChanges(false);
  };

  const handleToggle = (key: string, value: boolean) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const { id, ...settingsToSave } = settings;
      if (id) {
        const { error } = await supabase.from("player_portal_settings").update(settingsToSave).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("player_portal_settings").insert(settingsToSave);
        if (error) throw error;
      }
      toast.success("Portal settings saved");
      setHasChanges(false);
      fetchSettings(settings.player_id);
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetAll = () => {
    if (!settings) return;
    setSettings({ ...settings, ...DEFAULT_SETTINGS });
    setHasChanges(true);
  };

  // Hero image handlers
  const handleHeroFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCropImageSrc(url);
    setEditingHeroIndex(null);
    setCropDialogOpen(true);
    e.target.value = "";
  };

  const handleCropComplete = async (blob: Blob) => {
    if (!settings) return;
    const playerId = settings.player_id;
    const fileName = `hero-${playerId}-${Date.now()}.png`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("marketing-gallery")
        .upload(`portal-heroes/${fileName}`, blob, { contentType: "image/png", upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("marketing-gallery")
        .getPublicUrl(`portal-heroes/${fileName}`);

      const newImages = [...settings.hero_images];
      const newFocalPoints = [...settings.hero_focal_points];

      if (editingHeroIndex !== null) {
        newImages[editingHeroIndex] = urlData.publicUrl;
        newFocalPoints[editingHeroIndex] = "center center";
      } else {
        newImages.push(urlData.publicUrl);
        newFocalPoints.push("center center");
      }

      setSettings({ ...settings, hero_images: newImages, hero_focal_points: newFocalPoints });
      setHasChanges(true);
      toast.success("Hero image added");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    }
  };

  const handleRemoveHeroImage = (index: number) => {
    if (!settings) return;
    const newImages = settings.hero_images.filter((_, i) => i !== index);
    const newFocalPoints = settings.hero_focal_points.filter((_, i) => i !== index);
    setSettings({ ...settings, hero_images: newImages, hero_focal_points: newFocalPoints });
    setHasChanges(true);
  };

  const handleRecropHero = (index: number) => {
    if (!settings) return;
    setCropImageSrc(settings.hero_images[index]);
    setEditingHeroIndex(index);
    setCropDialogOpen(true);
  };

  const handleFocalPointChange = (index: number, focalPoint: string) => {
    if (!settings) return;
    const newFocalPoints = [...settings.hero_focal_points];
    newFocalPoints[index] = focalPoint;
    setSettings({ ...settings, hero_focal_points: newFocalPoints });
    setHasChanges(true);
  };

  // Music track handlers
  const handleMusicFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    e.target.value = "";
    setUploadingMusic(true);
    try {
      const fileName = `music-${settings.player_id}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from("marketing-gallery")
        .upload(`portal-music/${fileName}`, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from("marketing-gallery")
        .getPublicUrl(`portal-music/${fileName}`);
      const trackName = file.name.replace(/\.[^.]+$/, '');
      const newTracks = [...settings.music_tracks, { url: urlData.publicUrl, name: trackName }];
      setSettings({ ...settings, music_tracks: newTracks });
      setHasChanges(true);
      toast.success("Track added");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploadingMusic(false);
    }
  };

  const handleRemoveTrack = (index: number) => {
    if (!settings) return;
    const newTracks = settings.music_tracks.filter((_, i) => i !== index);
    setSettings({ ...settings, music_tracks: newTracks });
    setHasChanges(true);
  };

  const handleTrackNameChange = (index: number, name: string) => {
    if (!settings) return;
    const newTracks = [...settings.music_tracks];
    newTracks[index] = { ...newTracks[index], name };
    setSettings({ ...settings, music_tracks: newTracks });
    setHasChanges(true);
  };

    ? ALL_FEATURES.filter(f => (settings as any)[f.key] === true).length
    : 0;
  const totalCount = ALL_FEATURES.length;

  if (loading) return <LoadingSpinner size="md" className="py-8" />;

  const renderFeatureGrid = (features: FeatureItem[], title: string) => (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-muted-foreground">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {features.map(feature => {
          const isVisible = (settings as any)?.[feature.key] as boolean;
          return (
            <div
              key={feature.key}
              className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                isVisible ? 'bg-background border-border' : 'bg-muted/50 border-border/50 opacity-70'
              }`}
            >
              <div className="flex-1 min-w-0 mr-3">
                <div className="flex items-center gap-2">
                  {isVisible ? (
                    <Eye className="h-3.5 w-3.5 text-primary shrink-0" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <Label className="text-sm font-medium cursor-pointer" htmlFor={feature.key}>
                    {feature.label}
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 ml-5.5">{feature.description}</p>
              </div>
              <Switch
                id={feature.key}
                checked={isVisible}
                onCheckedChange={(checked) => handleToggle(feature.key, checked)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );

  const FOCAL_OPTIONS = [
    { value: "center center", label: "Centre" },
    { value: "center top", label: "Top" },
    { value: "center bottom", label: "Bottom" },
    { value: "left center", label: "Left" },
    { value: "right center", label: "Right" },
    { value: "left top", label: "Top Left" },
    { value: "right top", label: "Top Right" },
    { value: "left bottom", label: "Bottom Left" },
    { value: "right bottom", label: "Bottom Right" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Monitor className="h-5 w-5 md:h-6 md:w-6" />
          Portal Management
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Control features, hero images and visibility for each player's portal
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
          <SelectTrigger className="w-full sm:w-[320px]">
            <SelectValue placeholder="Select a player..." />
          </SelectTrigger>
          <SelectContent>
            {groupedPlayers.map((group) => (
              <div key={group.status}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {group.label}
                </div>
                {group.players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
                        {player.image_url ? (
                          <img src={player.image_url} alt={player.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <span>{player.name}</span>
                      <span className="text-muted-foreground text-xs">({player.position})</span>
                    </div>
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>

        {settings && (
          <Badge variant="outline" className="text-xs">
            {visibleCount}/{totalCount} features visible
          </Badge>
        )}
      </div>

      {!selectedPlayerId && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select a player to manage their portal settings
          </CardContent>
        </Card>
      )}

      {settings && (
        <div className="space-y-4">
          {/* Feature Visibility */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Feature Visibility
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleResetAll}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Reset All
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
                    <Save className="h-3.5 w-3.5 mr-1" />
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderFeatureGrid(SECTION_FEATURES, "Portal Sections")}
              {renderFeatureGrid(COMPONENT_FEATURES, "Individual Components")}
            </CardContent>
          </Card>

          {/* Hero Images */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Hero Images
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  Add Image
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Images shown in the hero slideshow at the top of the player's Hub. Crop to control how they appear.
              </p>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleHeroFileSelect}
              />

              {settings.hero_images.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                  <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hero images yet. Add images to create the portal hero slideshow.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {settings.hero_images.map((imgUrl, index) => (
                    <div key={index} className="relative group rounded-lg overflow-hidden border">
                      <div className="aspect-[16/7] bg-muted">
                        <img
                          src={imgUrl}
                          alt={`Hero ${index + 1}`}
                          className="w-full h-full object-cover"
                          style={{ objectPosition: (settings.hero_focal_points[index] || 'center center').replace('-', ' ') }}
                        />
                      </div>
                      <div className="p-2 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Move className="h-3 w-3 text-muted-foreground shrink-0" />
                          <Select
                            value={settings.hero_focal_points[index] || "center center"}
                            onValueChange={(val) => handleFocalPointChange(index, val)}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FOCAL_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => handleRecropHero(index)}>
                            Re-crop
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 text-xs px-2" onClick={() => handleRemoveHeroImage(index)}>
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
      )}

      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageSrc={cropImageSrc}
        onCropComplete={handleCropComplete}
        aspectRatio={16 / 7}
        title="Crop Hero Image"
        cropHeight={280}
      />
    </div>
  );
};
