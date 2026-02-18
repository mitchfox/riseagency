import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { Monitor, Eye, EyeOff, Image, Save, RotateCcw } from "lucide-react";

interface Player {
  id: string;
  name: string;
  position: string;
  representation_status: string | null;
}

interface PortalSettings {
  id?: string;
  player_id: string;
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
  hero_images: string[];
  hero_focal_points: string[];
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
  hero_images: [],
  hero_focal_points: [],
};

const FEATURE_LABELS: { key: keyof typeof DEFAULT_SETTINGS; label: string; description: string }[] = [
  { key: 'show_hub', label: 'Hub', description: 'Main dashboard hub with news feed and stats' },
  { key: 'show_analysis', label: 'Analysis', description: 'Performance analysis and reports' },
  { key: 'show_programming', label: 'Programming', description: 'Strength and conditioning programmes' },
  { key: 'show_nutrition', label: 'Nutrition', description: 'Nutrition plans and guidance' },
  { key: 'show_highlights', label: 'Highlights', description: 'Video clips and highlights reel' },
  { key: 'show_transfer_hub', label: 'Transfer Hub', description: 'Transfer activity and club interest' },
  { key: 'show_key_documents', label: 'Key Documents', description: 'Contracts and important documents' },
  { key: 'show_updates', label: 'Updates', description: 'Player updates and communications' },
  { key: 'show_view_profile', label: 'View Profile', description: 'Link to public player profile' },
  { key: 'show_countdown', label: 'Next Fixture Countdown', description: 'Countdown timer to next match' },
  { key: 'show_comparisons', label: 'Comparisons', description: 'Statistical comparisons with peers' },
  { key: 'show_scouting', label: 'Scouting Reports', description: 'Scouting feedback and reports' },
  { key: 'show_cognisance', label: 'Cognisance', description: 'Mental performance and awareness tools' },
  { key: 'show_injury_log', label: 'Injury Log', description: 'Injury tracking and recovery' },
];

export const PortalManagement = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [settings, setSettings] = useState<PortalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, []);

  useEffect(() => {
    if (selectedPlayerId) {
      fetchSettings(selectedPlayerId);
    } else {
      setSettings(null);
    }
  }, [selectedPlayerId]);

  const fetchPlayers = async () => {
    const { data } = await supabase
      .from("players")
      .select("id, name, position, representation_status")
      .order("name");
    setPlayers(data || []);
    setLoading(false);
  };

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
      });
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
        const { error } = await supabase
          .from("player_portal_settings")
          .update(settingsToSave)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("player_portal_settings")
          .insert(settingsToSave);
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

  const visibleCount = settings
    ? FEATURE_LABELS.filter(f => settings[f.key as keyof PortalSettings] === true).length
    : 0;
  const totalCount = FEATURE_LABELS.length;

  if (loading) return <LoadingSpinner size="md" className="py-8" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Monitor className="h-5 w-5 md:h-6 md:w-6" />
          Portal Management
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Control which features are visible on each player's portal and manage their hero images
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
          <SelectTrigger className="w-full sm:w-[280px]">
            <SelectValue placeholder="Select a player..." />
          </SelectTrigger>
          <SelectContent>
            {players.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} — {p.position}
              </SelectItem>
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
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FEATURE_LABELS.map(feature => {
                  const isVisible = settings[feature.key as keyof PortalSettings] as boolean;
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Image className="h-5 w-5" />
                Hero Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Hero images are managed from the player's Marketing Gallery. Images tagged for this player will appear in their portal hero slideshow.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
