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
  { key: "progressive_passes_adj", label: "Progressive Passes" },
  { key: "regains_adj", label: "Regains" },
  { key: "turnovers_adj", label: "Turnovers" },
  { key: "duels_won_adj", label: "Duels Won" },
  { key: "aerial_duels_won_adj", label: "Aerial Duels Won" },
];

export const HighlightedMatchForm = ({ value, onChange, playerAnalyses = [] }: HighlightedMatchFormProps) => {
  const [homeLogoFile, setHomeLogoFile] = useState<File | null>(null);
  const [awayLogoFile, setAwayLogoFile] = useState<File | null>(null);

  const handleClear = () => {
    onChange(null);
    setHomeLogoFile(null);
    setAwayLogoFile(null);
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

  if (!value) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Create a highlighted match section to showcase a standout performance on the player's profile.
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
          Create Highlighted Match
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold">Highlighted Match Details</h4>
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
        </div>
        <div className="space-y-2">
          <Label>Away Team</Label>
          <Input
            value={value.away_team}
            onChange={(e) => updateField('away_team', e.target.value)}
            placeholder="e.g., Barcelona"
          />
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
        <div className="grid grid-cols-2 gap-2">
          {AVAILABLE_STATS.map((stat) => (
            <div key={stat.key} className="flex items-center gap-2">
              <Checkbox
                checked={value.selected_stats?.includes(stat.key)}
                onCheckedChange={() => toggleStat(stat.key)}
              />
              <Label className="cursor-pointer">{stat.label}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Match Highlight Video URL</Label>
        <Input
          value={value.video_url}
          onChange={(e) => updateField('video_url', e.target.value)}
          placeholder="https://..."
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
