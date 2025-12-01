import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageIcon, X } from "lucide-react";
import { useState } from "react";

interface HighlightedMatchData {
  analysis_id?: string | null;
  home_team: string;
  home_team_logo: string;
  away_team: string;
  away_team_logo: string;
  score: string;
  minutes_played: number;
  match_date: string;
  competition: string;
  selected_stats: string[];
  stats: Record<string, any>;
  video_url: string;
  full_match_url: string;
  r90_report_url: string;
}

interface HighlightedMatchFormProps {
  value: HighlightedMatchData | null;
  onChange: (value: HighlightedMatchData | null) => void;
  playerAnalyses?: any[];
}

const AVAILABLE_STATS = [
  { key: "goals", label: "Goals" },
  { key: "assists", label: "Assists" },
  { key: "xG_adj", label: "xG" },
  { key: "xA_adj", label: "Expected Assists (xA)" },
  { key: "progressive_passes_adj", label: "Progressive Passes" },
  { key: "regains_adj", label: "Regains" },
  { key: "turnovers_adj", label: "Turnovers" },
  { key: "duels_won_adj", label: "Duels Won" },
  { key: "aerial_duels_won_adj", label: "Aerial Duels Won" },
  { key: "xGChain", label: "xG Chain" },
  { key: "interceptions", label: "Interceptions" },
  { key: "crossing_movement_xC", label: "Crossing Movement xC" },
  { key: "movement_in_behind_xC", label: "Movement In Behind xC" },
  { key: "movement_to_feet_xC", label: "Movement To Feet xC" },
  { key: "triple_threat_xC", label: "Triple Threat xC" },
  { key: "tackles", label: "Tackles" },
  { key: "passes_completed", label: "Passes Completed" },
  { key: "shots", label: "Shots" },
  { key: "shots_on_target", label: "Shots On Target" },
];

export const HighlightedMatchForm = ({ value, onChange, playerAnalyses = [] }: HighlightedMatchFormProps) => {
  const [homeLogoFile, setHomeLogoFile] = useState<File | null>(null);
  const [awayLogoFile, setAwayLogoFile] = useState<File | null>(null);
  const [homeLogoPreview, setHomeLogoPreview] = useState<string>("");
  const [awayLogoPreview, setAwayLogoPreview] = useState<string>("");
  const [isUploadingHomeLogo, setIsUploadingHomeLogo] = useState(false);
  const [isUploadingAwayLogo, setIsUploadingAwayLogo] = useState(false);

  const handleClear = () => {
    onChange(null);
    setHomeLogoFile(null);
    setAwayLogoFile(null);
    setHomeLogoPreview("");
    setAwayLogoPreview("");
  };

  const updateField = (field: keyof HighlightedMatchData, fieldValue: any) => {
    onChange({
      ...value!,
      [field]: fieldValue,
    });
  };

  const toggleStat = (statKey: string) => {
    if (!value) return;
    const selected = value.selected_stats || [];
    const newSelected = selected.includes(statKey)
      ? selected.filter(s => s !== statKey)
      : [...selected, statKey];
    updateField('selected_stats', newSelected);
  };

  const handleLogoUpload = async (file: File, type: 'home' | 'away') => {
    const setUploading = type === 'home' ? setIsUploadingHomeLogo : setIsUploadingAwayLogo;
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `team-logos/${fileName}`;

      const { supabase } = await import("@/integrations/supabase/client");
      const { error: uploadError } = await supabase.storage
        .from('player_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('player_images')
        .getPublicUrl(filePath);

      if (type === 'home') {
        setHomeLogoPreview(publicUrl);
        updateField('home_team_logo', publicUrl);
      } else {
        setAwayLogoPreview(publicUrl);
        updateField('away_team_logo', publicUrl);
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
    } finally {
      setUploading(false);
    }
  };

  const importFromAnalysis = (analysisId: string) => {
    const analysis = playerAnalyses.find(a => a.id === analysisId);
    if (!analysis) return;

    const stats = typeof analysis.striker_stats === 'string' 
      ? JSON.parse(analysis.striker_stats) 
      : analysis.striker_stats || {};

    onChange({
      analysis_id: analysis.id,
      home_team: "",
      home_team_logo: "",
      away_team: analysis.opponent || "",
      away_team_logo: "",
      score: analysis.result || "",
      minutes_played: analysis.minutes_played || 0,
      match_date: analysis.analysis_date || "",
      competition: "",
      selected_stats: ["goals", "assists", "xG_adj", "progressive_passes_adj"],
      stats: stats,
      video_url: analysis.video_url || "",
      full_match_url: "",
      r90_report_url: analysis.pdf_url || "",
    });
  };

  // Get available highlight videos from analyses
  const availableVideos = playerAnalyses
    .filter(a => a.video_url)
    .map(a => ({
      id: a.id,
      label: `vs ${a.opponent} - ${new Date(a.analysis_date).toLocaleDateString()}`,
      url: a.video_url
    }));

  if (!value) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Create a highlighted game section to showcase a standout performance on the player's profile.
        </p>
        
        {playerAnalyses.length > 0 && (
          <div className="space-y-2">
            <Label>Import from Performance Report</Label>
            <Select onValueChange={importFromAnalysis}>
              <SelectTrigger>
                <SelectValue placeholder="Select a report to import data" />
              </SelectTrigger>
              <SelectContent>
                {playerAnalyses.map((analysis) => (
                  <SelectItem key={analysis.id} value={analysis.id}>
                    vs {analysis.opponent} - {new Date(analysis.analysis_date).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button onClick={() => onChange({
          home_team: "",
          home_team_logo: "",
          away_team: "",
          away_team_logo: "",
          score: "",
          minutes_played: 0,
          match_date: "",
          competition: "",
          selected_stats: [],
          stats: {},
          video_url: "",
          full_match_url: "",
          r90_report_url: "",
        })}>
          Create Highlighted Game
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold">Highlighted Game Details</h4>
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <X className="w-4 h-4 mr-1" />
          Clear
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Home Team</Label>
          <Input
            value={value.home_team}
            onChange={(e) => updateField('home_team', e.target.value)}
            placeholder="e.g., Real Madrid"
          />
          <div className="space-y-2">
            <Label>Home Team Logo</Label>
            {(value.home_team_logo || homeLogoPreview) && (
              <div className="relative w-20 h-20 border rounded-lg overflow-hidden">
                <img 
                  src={homeLogoPreview || value.home_team_logo} 
                  alt="Home team logo" 
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploadingHomeLogo}
                onClick={() => document.getElementById('home-logo-upload')?.click()}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                {isUploadingHomeLogo ? "Uploading..." : "Upload Logo"}
              </Button>
              <input
                id="home-logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setHomeLogoFile(file);
                    handleLogoUpload(file, 'home');
                  }
                }}
              />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Away Team</Label>
          <Input
            value={value.away_team}
            onChange={(e) => updateField('away_team', e.target.value)}
            placeholder="e.g., Barcelona"
          />
          <div className="space-y-2">
            <Label>Away Team Logo</Label>
            {(value.away_team_logo || awayLogoPreview) && (
              <div className="relative w-20 h-20 border rounded-lg overflow-hidden">
                <img 
                  src={awayLogoPreview || value.away_team_logo} 
                  alt="Away team logo" 
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploadingAwayLogo}
                onClick={() => document.getElementById('away-logo-upload')?.click()}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                {isUploadingAwayLogo ? "Uploading..." : "Upload Logo"}
              </Button>
              <input
                id="away-logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setAwayLogoFile(file);
                    handleLogoUpload(file, 'away');
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Score</Label>
          <Input
            value={value.score}
            onChange={(e) => updateField('score', e.target.value)}
            placeholder="e.g., 3-1"
          />
        </div>
        <div className="space-y-2">
          <Label>Minutes Played</Label>
          <Input
            type="number"
            value={value.minutes_played}
            onChange={(e) => updateField('minutes_played', parseInt(e.target.value) || 0)}
            placeholder="90"
          />
        </div>
        <div className="space-y-2">
          <Label>Match Date</Label>
          <Input
            type="date"
            value={value.match_date}
            onChange={(e) => updateField('match_date', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Competition</Label>
        <Input
          value={value.competition}
          onChange={(e) => updateField('competition', e.target.value)}
          placeholder="e.g., Czech 2. Liga"
        />
      </div>

      <div className="space-y-2">
        <Label>Key Stats to Display</Label>
        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 border rounded">
          {AVAILABLE_STATS.map((stat) => (
            <div key={stat.key} className="flex items-center gap-2">
              <Checkbox
                checked={value.selected_stats?.includes(stat.key)}
                onCheckedChange={() => toggleStat(stat.key)}
              />
              <Label className="cursor-pointer text-sm">{stat.label}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Match Highlight Video</Label>
        {availableVideos.length > 0 && (
          <Select onValueChange={(url) => updateField('video_url', url)}>
            <SelectTrigger>
              <SelectValue placeholder="Select from existing highlights" />
            </SelectTrigger>
            <SelectContent>
              {availableVideos.map((video) => (
                <SelectItem key={video.id} value={video.url}>
                  {video.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Input
          value={value.video_url}
          onChange={(e) => updateField('video_url', e.target.value)}
          placeholder="Or paste video URL here..."
        />
      </div>

      <div className="space-y-2">
        <Label>Full Match URL</Label>
        <Input
          value={value.full_match_url}
          onChange={(e) => updateField('full_match_url', e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <Label>R90 Performance Report URL</Label>
        <Input
          value={value.r90_report_url}
          onChange={(e) => updateField('r90_report_url', e.target.value)}
          placeholder="https://..."
        />
      </div>
    </div>
  );
};
