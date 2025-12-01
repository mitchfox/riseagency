import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface HighlightedMatchProps {
  highlightedMatch: {
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
  };
}

const STAT_LABELS: Record<string, string> = {
  goals: "Goals",
  assists: "Assists",
  xG_adj: "xG",
  progressive_passes_adj: "Prog Passes",
  regains_adj: "Regains",
  turnovers_adj: "Turnovers",
  duels_won_adj: "Duels Won",
  aerial_duels_won_adj: "Aerial Duels",
};

export const HighlightedMatchDisplay = ({ highlightedMatch }: HighlightedMatchProps) => {
  const formatStatValue = (value: any): string => {
    if (typeof value === 'number') {
      return value % 1 === 0 ? value.toString() : value.toFixed(1);
    }
    return value?.toString() || "0";
  };

  return (
    <div className="mb-16">
      <h2 className="text-2xl font-bebas text-primary uppercase tracking-widest mb-6">
        Highlighted Match
      </h2>
      
      <div className="border-2 border-primary/30 rounded-lg overflow-hidden">
        {/* Match Header */}
        <div className="bg-secondary/30 backdrop-blur-sm p-6">
          <div className="flex items-center justify-center gap-6 mb-2">
            {highlightedMatch.home_team_logo && (
              <img 
                src={highlightedMatch.home_team_logo} 
                alt={highlightedMatch.home_team}
                className="w-16 h-16 object-contain"
              />
            )}
            <div className="text-center">
              <div className="text-3xl font-bebas text-foreground uppercase tracking-wider">
                {highlightedMatch.home_team || "Team A"} <span className="text-primary">{highlightedMatch.score}</span> {highlightedMatch.away_team || "Team B"}
              </div>
              <div className="text-sm text-muted-foreground uppercase tracking-widest font-semibold mt-1">
                {highlightedMatch.competition} • {new Date(highlightedMatch.match_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {highlightedMatch.minutes_played} minutes played
              </div>
            </div>
            {highlightedMatch.away_team_logo && (
              <img 
                src={highlightedMatch.away_team_logo} 
                alt={highlightedMatch.away_team}
                className="w-16 h-16 object-contain"
              />
            )}
          </div>
        </div>

        {/* Key Stats */}
        {highlightedMatch.selected_stats && highlightedMatch.selected_stats.length > 0 && (
          <div className="bg-background/50 p-6 border-t border-primary/10">
            <h3 className="text-sm font-bebas text-primary uppercase tracking-widest mb-4">Key Stats</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {highlightedMatch.selected_stats.map((statKey) => (
                <div key={statKey} className="text-center">
                  <div className="text-3xl font-bebas text-primary">
                    {formatStatValue(highlightedMatch.stats[statKey])}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">
                    {STAT_LABELS[statKey] || statKey}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Video */}
        {highlightedMatch.video_url && (
          <div className="bg-background p-6 border-t border-primary/10">
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted">
              <video 
                src={highlightedMatch.video_url}
                controls
                className="w-full h-full"
                poster=""
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}

        {/* Links */}
        {(highlightedMatch.full_match_url || highlightedMatch.r90_report_url) && (
          <div className="bg-secondary/20 p-6 border-t border-primary/10">
            <div className="flex flex-wrap gap-3 justify-center">
              {highlightedMatch.full_match_url && (
                <Button
                  asChild
                  variant="outline"
                  className="font-bebas uppercase tracking-wider"
                >
                  <a 
                    href={highlightedMatch.full_match_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Watch Full Match
                  </a>
                </Button>
              )}
              {highlightedMatch.r90_report_url && (
                <Button
                  asChild
                  className="font-bebas uppercase tracking-wider"
                >
                  <a 
                    href={highlightedMatch.r90_report_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View R90 Report
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
