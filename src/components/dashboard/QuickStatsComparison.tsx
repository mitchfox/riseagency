import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, RefreshCw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from "recharts";

interface QuickStatsComparisonProps {
  playerId: string;
  playerName: string;
  playerPosition: string;
  onSeeAll?: () => void;
}

// Stats we can compare — keys must exist in both striker_stats and comparison_players.metrics
const COMPARABLE_STATS: { label: string; playerKey: string; benchmarkKey: string }[] = [
  { label: "xG /90", playerKey: "xG_adj_per90", benchmarkKey: "npxg_per90" },
  { label: "xA /90", playerKey: "xA_adj_per90", benchmarkKey: "xa_per90" },
  { label: "Prog. Passes /90", playerKey: "progressive_passes_adj_per90", benchmarkKey: "progressive_passes_per90" },
  { label: "Prog. Carries /90", playerKey: "progressive_carries_adj_per90", benchmarkKey: "progressive_carries_per90" },
  { label: "Duels Won %", playerKey: "duels_won_pct", benchmarkKey: "duels_won_pct" },
  { label: "Pass Accuracy %", playerKey: "pass_accuracy_pct", benchmarkKey: "pass_accuracy_pct" },
  { label: "Shots on Target /90", playerKey: "shots_on_target_per90", benchmarkKey: "shots_on_target_per90" },
  { label: "Key Passes /90", playerKey: "key_passes_per90", benchmarkKey: "key_passes_per90" },
  { label: "Tackles Won /90", playerKey: "tackles_won_per90", benchmarkKey: "tackles_won_per90" },
  { label: "Interceptions /90", playerKey: "interceptions_per90", benchmarkKey: "interceptions_per90" },
];

export const QuickStatsComparison = ({ playerId, playerName, playerPosition, onSeeAll }: QuickStatsComparisonProps) => {
  const [loading, setLoading] = React.useState(true);
  const [chartData, setChartData] = React.useState<{ name: string; value: number }[] | null>(null);
  const [statLabel, setStatLabel] = React.useState("");
  const [benchmarkName, setBenchmarkName] = React.useState("");

  const firstName = (name: string) => name.split(" ")[0];

  const fetchComparison = React.useCallback(async () => {
    setLoading(true);
    try {
      // Fetch last 5 analyses for the player
      const { data: playerAnalyses } = await supabase
        .from("player_analysis")
        .select("striker_stats")
        .eq("player_id", playerId)
        .not("r90_score", "is", null)
        .order("analysis_date", { ascending: false })
        .limit(5);

      if (!playerAnalyses || playerAnalyses.length === 0) {
        setChartData(null);
        setLoading(false);
        return;
      }

      // Fetch benchmark players matching position
      const { data: benchmarks } = await supabase
        .from("comparison_players")
        .select("name, position, metrics")
        .eq("position", playerPosition);

      if (!benchmarks || benchmarks.length === 0) {
        setChartData(null);
        setLoading(false);
        return;
      }

      const randomBenchmark = benchmarks[Math.floor(Math.random() * benchmarks.length)];
      const metrics = (randomBenchmark.metrics || {}) as Record<string, number>;
      setBenchmarkName(randomBenchmark.name);

      // Pick a random stat that both have data for
      const shuffled = [...COMPARABLE_STATS].sort(() => Math.random() - 0.5);

      for (const stat of shuffled) {
        // Player average from last 5
        const playerVals = playerAnalyses
          .map(a => (a.striker_stats as any)?.[stat.playerKey])
          .filter((v): v is number => typeof v === "number");

        const benchmarkVal = metrics[stat.benchmarkKey];

        if (playerVals.length > 0 && typeof benchmarkVal === "number") {
          const playerAvg = playerVals.reduce((a, b) => a + b, 0) / playerVals.length;

          setStatLabel(stat.label);
          setChartData([
            { name: firstName(playerName), value: Math.round(playerAvg * 100) / 100 },
            { name: firstName(randomBenchmark.name), value: Math.round(benchmarkVal * 100) / 100 },
          ]);
          setLoading(false);
          return;
        }
      }

      // No matching stat found
      setChartData(null);
    } catch (error) {
      console.error("Error fetching quick stats:", error);
      setChartData(null);
    } finally {
      setLoading(false);
    }
  }, [playerId, playerPosition, playerName]);

  React.useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  if (!loading && !chartData) return null;

  return (
    <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-primary border-b-0">
      <CardHeader marble className="py-2">
        <div className="flex items-center justify-between container mx-auto px-4 pr-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <CardTitle className="font-heading tracking-tight ml-[9px] mt-[1px]">Comparisons</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchComparison}
              className="flex items-center gap-1 text-sm text-primary hover:text-black hover:bg-primary h-10"
            >
              <RefreshCw className="h-4 w-4" />
              New
            </Button>
            {onSeeAll && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSeeAll}
                className="flex items-center gap-1 text-sm text-primary hover:text-black hover:bg-primary h-10"
              >
                See All
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="container mx-auto px-4 pt-3 pb-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-8 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : chartData ? (
          <div>
            <p className="text-xs text-muted-foreground mb-3">
              <span className="font-semibold text-foreground">{statLabel}</span> — Last 5 games avg vs{" "}
              <span className="font-semibold text-primary">{benchmarkName}</span>
            </p>
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={80}
                    tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={index === 0 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.4)"}
                      />
                    ))}
                    <LabelList
                      dataKey="value"
                      position="right"
                      style={{ fontSize: 13, fontWeight: 700, fill: "hsl(var(--foreground))" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
