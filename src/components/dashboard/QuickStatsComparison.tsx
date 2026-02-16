import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from "recharts";
import { AnimatePresence, motion } from "framer-motion";

interface QuickStatsComparisonProps {
  playerId: string;
  playerName: string;
  playerPosition: string;
  onSeeAll?: () => void;
}

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

const surname = (name: string) => {
  const parts = name.trim().split(" ");
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
};

export const QuickStatsComparison = ({ playerId, playerName, playerPosition, onSeeAll }: QuickStatsComparisonProps) => {
  const [loading, setLoading] = React.useState(true);
  const [chartData, setChartData] = React.useState<{ name: string; value: number }[] | null>(null);
  const [statLabel, setStatLabel] = React.useState("");
  const [benchmarkName, setBenchmarkName] = React.useState("");
  const [visible, setVisible] = React.useState(true);

  const playerAnalysesRef = React.useRef<any[] | null>(null);
  const benchmarksRef = React.useRef<any[] | null>(null);
  const usedStatsRef = React.useRef<Set<string>>(new Set());
  // Refs for deduplication — avoids circular deps
  const statLabelRef = React.useRef("");
  const benchmarkNameRef = React.useRef("");

  const pickComparison = React.useCallback(() => {
    const playerAnalyses = playerAnalysesRef.current;
    const benchmarks = benchmarksRef.current;
    if (!playerAnalyses || playerAnalyses.length === 0 || !benchmarks || benchmarks.length === 0) return false;

    if (usedStatsRef.current.size >= COMPARABLE_STATS.length) {
      usedStatsRef.current.clear();
    }

    const available = COMPARABLE_STATS.filter(s => !usedStatsRef.current.has(s.label));
    const shuffledStats = [...available].sort(() => Math.random() - 0.5);
    const shuffledBenchmarks = [...benchmarks].sort(() => Math.random() - 0.5);

    for (const stat of shuffledStats) {
      for (const benchmark of shuffledBenchmarks) {
        const metrics = (benchmark.metrics || {}) as Record<string, number>;
        const benchmarkVal = metrics[stat.benchmarkKey];
        // Deduplicate using refs (no state dependency)
        if (stat.label === statLabelRef.current && benchmark.name === benchmarkNameRef.current) continue;

        const playerVals = playerAnalyses
          .map((a: any) => (a.striker_stats as any)?.[stat.playerKey])
          .filter((v: any): v is number => typeof v === "number");

        if (playerVals.length > 0 && typeof benchmarkVal === "number") {
          const playerAvg = playerVals.reduce((a: number, b: number) => a + b, 0) / playerVals.length;

          usedStatsRef.current.add(stat.label);
          statLabelRef.current = stat.label;
          benchmarkNameRef.current = benchmark.name;
          setStatLabel(stat.label);
          setBenchmarkName(benchmark.name);
          setChartData([
            { name: surname(playerName), value: Math.round(playerAvg * 100) / 100 },
            { name: surname(benchmark.name), value: Math.round(benchmarkVal * 100) / 100 },
          ]);
          return true;
        }
      }
    }
    return false;
  }, [playerName]); // Only depends on playerName now — no circular dep

  React.useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [{ data: playerAnalyses }, { data: benchmarks }] = await Promise.all([
          supabase
            .from("player_analysis")
            .select("striker_stats")
            .eq("player_id", playerId)
            .not("r90_score", "is", null)
            .order("analysis_date", { ascending: false })
            .limit(5),
          supabase
            .from("comparison_players")
            .select("name, position, metrics")
            .eq("position", playerPosition),
        ]);

        if (cancelled) return;
        playerAnalysesRef.current = playerAnalyses || [];
        benchmarksRef.current = benchmarks || [];

        if (!pickComparison()) {
          setChartData(null);
        }
      } catch (error) {
        console.error("Error fetching quick stats:", error);
        if (!cancelled) setChartData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [playerId, playerPosition, pickComparison]);

  // Auto-rotate every 15 seconds
  React.useEffect(() => {
    if (loading || !playerAnalysesRef.current || !benchmarksRef.current) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        pickComparison();
        setVisible(true);
      }, 400);
    }, 15000);
    return () => clearInterval(interval);
  }, [pickComparison, loading]);

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
          <AnimatePresence mode="wait">
            {visible && (
              <motion.div
                key={statLabel + benchmarkName}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
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
              </motion.div>
            )}
          </AnimatePresence>
        ) : null}
      </CardContent>
    </Card>
  );
};
