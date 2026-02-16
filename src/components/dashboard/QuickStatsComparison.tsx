import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickStatsComparisonProps {
  playerId: string;
  playerName: string;
}

interface StatComparison {
  label: string;
  playerAvg: number;
  comparisonAvg: number;
  comparisonName: string;
}

export const QuickStatsComparison = ({ playerId, playerName }: QuickStatsComparisonProps) => {
  const [stats, setStats] = React.useState<StatComparison[]>([]);
  const [comparisonPlayer, setComparisonPlayer] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);

  const fetchComparison = React.useCallback(async () => {
    setLoading(true);
    try {
      // Fetch last 5 analyses for this player
      const { data: playerAnalyses } = await supabase
        .from("player_analysis")
        .select("r90_score, minutes_played, striker_stats")
        .eq("player_id", playerId)
        .not("r90_score", "is", null)
        .order("analysis_date", { ascending: false })
        .limit(5);

      if (!playerAnalyses || playerAnalyses.length === 0) {
        setStats([]);
        setLoading(false);
        return;
      }

      // Pick a random comparison player (different from current)
      const { data: otherPlayers } = await supabase
        .from("players")
        .select("id, name")
        .neq("id", playerId)
        .in("representation_status", ["represented", "mandated"]);

      if (!otherPlayers || otherPlayers.length === 0) {
        setStats([]);
        setLoading(false);
        return;
      }

      const randomPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
      setComparisonPlayer(randomPlayer.name);

      // Fetch last 5 analyses for comparison player
      const { data: compAnalyses } = await supabase
        .from("player_analysis")
        .select("r90_score, minutes_played, striker_stats")
        .eq("player_id", randomPlayer.id)
        .not("r90_score", "is", null)
        .order("analysis_date", { ascending: false })
        .limit(5);

      // Calculate averages
      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

      const playerR90s = playerAnalyses.map(a => a.r90_score).filter(Boolean) as number[];
      const compR90s = (compAnalyses || []).map(a => a.r90_score).filter(Boolean) as number[];

      const playerMins = playerAnalyses.map(a => a.minutes_played).filter(Boolean) as number[];
      const compMins = (compAnalyses || []).map(a => a.minutes_played).filter(Boolean) as number[];

      // Extract striker stats averages
      const extractStatAvg = (analyses: any[], key: string) => {
        const vals = analyses
          .map(a => a.striker_stats?.[key])
          .filter((v): v is number => typeof v === 'number');
        return vals.length > 0 ? avg(vals) : null;
      };

      const statPairs: { label: string; key: string }[] = [
        { label: "R90 Score", key: "_r90" },
        { label: "Minutes Played", key: "_mins" },
        { label: "xG (adj) /90", key: "xG_adj_per90" },
        { label: "xA (adj) /90", key: "xA_adj_per90" },
        { label: "Regains (adj) /90", key: "regains_adj_per90" },
        { label: "Prog. Passes (adj) /90", key: "progressive_passes_adj_per90" },
      ];

      const comparisons: StatComparison[] = [];

      for (const { label, key } of statPairs) {
        let pVal: number | null = null;
        let cVal: number | null = null;

        if (key === "_r90") {
          pVal = playerR90s.length > 0 ? avg(playerR90s) : null;
          cVal = compR90s.length > 0 ? avg(compR90s) : null;
        } else if (key === "_mins") {
          pVal = playerMins.length > 0 ? avg(playerMins) : null;
          cVal = compMins.length > 0 ? avg(compMins) : null;
        } else {
          pVal = extractStatAvg(playerAnalyses, key);
          cVal = extractStatAvg(compAnalyses || [], key);
        }

        if (pVal !== null) {
          comparisons.push({
            label,
            playerAvg: pVal,
            comparisonAvg: cVal ?? 0,
            comparisonName: randomPlayer.name,
          });
        }
      }

      setStats(comparisons);
    } catch (error) {
      console.error("Error fetching quick stats:", error);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  React.useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  if (loading) {
    return (
      <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-primary border-b-0">
        <CardHeader marble className="py-2">
          <div className="flex items-center gap-2 container mx-auto px-4">
            <BarChart3 className="h-5 w-5" />
            <CardTitle className="font-heading tracking-tight ml-[9px] mt-[1px]">Quick Stats</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="container mx-auto px-4 py-6">
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stats.length === 0) return null;

  const firstName = (name: string) => name.split(" ")[0];

  return (
    <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-primary border-b-0">
      <CardHeader marble className="py-2">
        <div className="flex items-center justify-between container mx-auto px-4 pr-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <CardTitle className="font-heading tracking-tight ml-[9px] mt-[1px]">Last 5 Games</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchComparison}
            className="flex items-center gap-1 text-sm text-primary hover:text-black hover:bg-primary h-10"
          >
            <RefreshCw className="h-4 w-4" />
            New Comparison
          </Button>
        </div>
      </CardHeader>
      <CardContent className="container mx-auto px-4 pt-3 pb-4">
        <p className="text-xs text-muted-foreground mb-3">
          Averages from last 5 games — compared to <span className="font-semibold text-primary">{comparisonPlayer}</span>
        </p>
        <div className="space-y-2">
          {stats.map((stat) => {
            const maxVal = Math.max(stat.playerAvg, stat.comparisonAvg, 0.01);
            const playerPct = (stat.playerAvg / maxVal) * 100;
            const compPct = (stat.comparisonAvg / maxVal) * 100;
            const playerWins = stat.playerAvg >= stat.comparisonAvg;

            return (
              <div key={stat.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{stat.label}</span>
                  <div className="flex gap-3">
                    <span className={`font-bold ${playerWins ? "text-primary" : "text-foreground"}`}>
                      {stat.playerAvg.toFixed(stat.label.includes("Minutes") ? 0 : 2)}
                    </span>
                    <span className={`font-bold ${!playerWins ? "text-primary" : "text-muted-foreground"}`}>
                      {stat.comparisonAvg.toFixed(stat.label.includes("Minutes") ? 0 : 2)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 h-2">
                  <div
                    className="rounded-l-full transition-all duration-500"
                    style={{
                      width: `${playerPct}%`,
                      backgroundColor: playerWins ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                    }}
                  />
                  <div
                    className="rounded-r-full transition-all duration-500"
                    style={{
                      width: `${compPct}%`,
                      backgroundColor: !playerWins ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{firstName(playerName)}</span>
                  <span>{firstName(comparisonPlayer)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
