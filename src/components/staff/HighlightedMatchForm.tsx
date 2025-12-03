import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { createPerformanceReportSlug } from "@/lib/urlHelpers";
interface HighlightedMatchData {
  analysis_id?: string | null;
  home_team: string;
  home_team_logo: string;
  away_team: string;
  away_team_logo: string;
  score: string;
  show_score: boolean;
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
  playerHighlights?: any;
  playerName?: string;
}

const STAT_LABELS: Record<string, string> = {
  // Basic stats
  goals: "Goals",
  assists: "Assists",
  shots: "Shots",
  shots_on_target: "Shots On Target",
  tackles: "Tackles",
  passes_completed: "Passes Completed",
  
  // Adjusted stats
  xG_adj: "xG",
  xA_adj: "xA",
  progressive_passes_adj: "Progressive Passes",
  regains_adj: "Regains",
  turnovers_adj: "Turnovers",
  duels_won_adj: "Duels Won",
  aerial_duels_won_adj: "Aerial Duels",
  interceptions: "Interceptions",
  dribbles: "Dribbles",
  dribbles_attempted: "Dribbles Attempted",
  
  // xC stats
  xGChain: "xG Chain",
  crossing_movement_xC: "Crossing xC",
  movement_in_behind_xC: "In Behind xC",
  movement_to_feet_xC: "To Feet xC",
  movement_down_side_xC: "Down Side xC",
  triple_threat_xC: "Triple Threat xC",
  
  // Per 90 stats
  xG_adj_per90: "xG per 90",
  xA_adj_per90: "xA per 90",
  progressive_passes_adj_per90: "Progressive Passes per 90",
  regains_adj_per90: "Regains per 90",
  turnovers_adj_per90: "Turnovers per 90",
  interceptions_per90: "Interceptions per 90",
  dribbles_per90: "Dribbles per 90",
  dribbles_attempted_per90: "Dribbles Attempted per 90",
  xGChain_per90: "xG Chain per 90",
  crossing_movement_xC_per90: "Crossing xC per 90",
  movement_in_behind_xC_per90: "In Behind xC per 90",
  movement_to_feet_xC_per90: "To Feet xC per 90",
  movement_down_side_xC_per90: "Down Side xC per 90",
  triple_threat_xC_per90: "Triple Threat xC per 90",
};

export const HighlightedMatchForm = ({ value, onChange, playerAnalyses = [], playerHighlights, playerName = "" }: HighlightedMatchFormProps) => {
  const handleClear = () => {
    onChange(null);
  };

  // Parse player highlights if it's a string
  const parsedHighlights = typeof playerHighlights === 'string' 
    ? JSON.parse(playerHighlights) 
    : playerHighlights;

  const toggleStat = (statKey: string) => {
    if (!value) return;
    const selected = value.selected_stats || [];
    const newSelected = selected.includes(statKey)
      ? selected.filter(s => s !== statKey)
      : [...selected, statKey];
    
    onChange({
      ...value,
      selected_stats: newSelected,
    });
  };

  const selectPerformanceReport = (analysisId: string) => {
    const analysis = playerAnalyses.find(a => a.id === analysisId);
    if (!analysis) return;

    const stats = typeof analysis.striker_stats === 'string' 
      ? JSON.parse(analysis.striker_stats) 
      : analysis.striker_stats || {};

    // Generate internal performance report URL
    const reportUrl = playerName && analysis.opponent 
      ? createPerformanceReportSlug(playerName, analysis.opponent, analysis.id)
      : "";

    onChange({
      analysis_id: analysis.id,
      home_team: "",
      home_team_logo: "",
      away_team: analysis.opponent || "",
      away_team_logo: "",
      score: analysis.result || "",
      show_score: true,
      minutes_played: analysis.minutes_played || 0,
      match_date: analysis.analysis_date || "",
      competition: "",
      selected_stats: [],
      stats: stats,
      video_url: analysis.video_url || "",
      full_match_url: "",
      r90_report_url: reportUrl,
    });
  };

  if (!value) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Select a performance report to showcase as the highlighted game on this player's profile.
        </p>
        
        {playerAnalyses.length > 0 ? (
          <div className="space-y-2">
            <Label>Select Performance Report</Label>
            <Select onValueChange={selectPerformanceReport}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a performance report..." />
              </SelectTrigger>
              <SelectContent>
                {playerAnalyses.map((analysis) => (
                  <SelectItem key={analysis.id} value={analysis.id}>
                    vs {analysis.opponent} - {new Date(analysis.analysis_date).toLocaleDateString()}
                    {analysis.result && ` (${analysis.result})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No performance reports available. Create a performance report first to use as a highlighted game.
          </p>
        )}
      </div>
    );
  }

  // Get available stats from the imported data
  const availableStats = Object.keys(value.stats || {})
    .filter(key => STAT_LABELS[key]) // Only show stats we have labels for
    .map(key => ({
      key,
      label: STAT_LABELS[key],
      value: value.stats[key]
    }))
    .filter(stat => stat.value !== null && stat.value !== undefined); // Only show stats with values
  
  // Also include any stats that are currently selected but missing from stats object
  const selectedButMissing = (value.selected_stats || [])
    .filter(key => STAT_LABELS[key] && !availableStats.find(s => s.key === key))
    .map(key => ({
      key,
      label: STAT_LABELS[key],
      value: "N/A"
    }));
  
  const allStats = [...availableStats, ...selectedButMissing];

  const selectedAnalysis = playerAnalyses.find(a => a.id === value.analysis_id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold">Highlighted Game</h4>
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <X className="w-4 h-4 mr-1" />
          Clear & Select Different Game
        </Button>
      </div>

      {/* Selected Performance Report Info */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Selected Performance Report
        </div>
        <div className="text-lg font-semibold">
          vs {value.away_team}
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>Score: {value.score || "N/A"}</div>
          <div>Date: {new Date(value.match_date).toLocaleDateString()}</div>
          <div>Minutes Played: {value.minutes_played}</div>
          {value.competition && <div>Competition: {value.competition}</div>}
          {value.video_url && <div className="text-primary">✓ Highlight video available</div>}
          {value.r90_report_url && <div className="text-primary">✓ R90 report available</div>}
        </div>
      </div>

      {/* Option to change selection */}
      {playerAnalyses.length > 1 && (
        <div className="space-y-2">
          <Label>Change to Different Performance Report</Label>
          <Select 
            value={value.analysis_id || undefined} 
            onValueChange={selectPerformanceReport}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a different report..." />
            </SelectTrigger>
            <SelectContent>
              {playerAnalyses.map((analysis) => (
                <SelectItem key={analysis.id} value={analysis.id}>
                  vs {analysis.opponent} - {new Date(analysis.analysis_date).toLocaleDateString()}
                  {analysis.result && ` (${analysis.result})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Highlight Video Selection */}
      <div className="space-y-3">
        <div>
          <Label className="text-base">Match Highlight Video</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Select which highlight video to display from this player's match highlights.
          </p>
        </div>
        
        {parsedHighlights?.matchHighlights && parsedHighlights.matchHighlights.length > 0 ? (
          <Select 
            value={value.video_url || undefined}
            onValueChange={(videoUrl) => {
              const selectedHighlight = parsedHighlights.matchHighlights.find((h: any) => {
                const url = h.videoUrl || h.video_url || h.url;
                return url === videoUrl;
              });

              onChange({
                ...value,
                video_url: videoUrl,
                // If the highlight carries opponent or club logo info, use it to enrich the card
                away_team: selectedHighlight?.opponent || value.away_team,
                away_team_logo: selectedHighlight?.clubLogo || value.away_team_logo,
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select highlight video..." />
            </SelectTrigger>
            <SelectContent>
              {parsedHighlights.matchHighlights.map((highlight: any, index: number) => {
                const url = highlight.videoUrl || highlight.video_url || highlight.url;
                const label = highlight.name || highlight.clipName || highlight.opponent || `Highlight ${index + 1}`;
                return (
                  <SelectItem key={index} value={url}>
                    {label}
                    {highlight.opponent && !label.includes(highlight.opponent) && ` - vs ${highlight.opponent}`}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-muted-foreground italic p-4 bg-muted/30 rounded">
            No match highlight videos available. Add highlights to this player first.
          </p>
        )}
        
        {value.video_url && (
          <div className="text-sm text-primary">
            ✓ Highlight video selected
          </div>
        )}
      </div>

      {/* Score Display Toggle */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="show-score"
          checked={value.show_score}
          onCheckedChange={(checked) => onChange({ ...value, show_score: !!checked })}
        />
        <Label htmlFor="show-score" className="cursor-pointer">
          Show match score on profile
        </Label>
      </div>

      {/* Full Match URL */}
      <div className="space-y-2">
        <Label>Full Match URL (Optional)</Label>
        <Input
          value={value.full_match_url}
          onChange={(e) => onChange({ ...value, full_match_url: e.target.value })}
          placeholder="https://... (link to watch the full match)"
        />
      </div>

      {/* Stats Selection */}
      <div className="space-y-3">
        <div>
          <Label className="text-base">Select Stats to Display</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Choose which statistics from this performance report to highlight on the player profile.
          </p>
        </div>
        
        {allStats.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-3 border rounded-lg bg-background">
            {allStats.map((stat) => (
              <div 
                key={stat.key} 
                className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={`stat-${stat.key}`}
                  checked={value.selected_stats?.includes(stat.key)}
                  onCheckedChange={() => toggleStat(stat.key)}
                />
                <Label 
                  htmlFor={`stat-${stat.key}`}
                  className="cursor-pointer flex-1 flex justify-between items-center"
                >
                  <span className="font-medium">{stat.label}</span>
                  <span className="text-muted-foreground font-mono text-sm">
                    {typeof stat.value === 'number' 
                      ? (stat.value % 1 === 0 ? stat.value : stat.value.toFixed(1))
                      : stat.value}
                  </span>
                </Label>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic p-4 bg-muted/30 rounded">
            No stats available from this performance report.
          </p>
        )}

        {value.selected_stats && value.selected_stats.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {value.selected_stats.length} {value.selected_stats.length === 1 ? 'stat' : 'stats'} selected for display
          </div>
        )}
      </div>
    </div>
  );
};
