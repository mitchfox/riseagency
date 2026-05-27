import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from "recharts";
import { AnimatePresence, motion } from "framer-motion";
import { ALL_METRICS } from "@/components/staff/ComparisonPlayerData";
import { computeStatAverage } from "@/lib/statAggregation";
import { t } from "@/lib/portalTranslations";
import { useAutoTranslateStrings } from "@/hooks/useAutoTranslateStrings";

interface QuickStatsComparisonProps {
  playerId: string;
  playerName: string;
  playerPosition: string;
  analyses: any[];
  onSeeAll?: () => void;
  portalLanguage?: string | null;
}

const surname = (name: string) => {
  const parts = name.trim().split(" ");
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
};

/** Pick a random subset of metrics that have data for both player and benchmark */
const FORM_WINDOW = 5;

export const QuickStatsComparison = ({ playerId, playerName, playerPosition, analyses, onSeeAll, portalLanguage }: QuickStatsComparisonProps) => {
  const [loading, setLoading] = React.useState(true);
  const [chartData, setChartData] = React.useState<{ name: string; value: number }[] | null>(null);
  const [statLabel, setStatLabel] = React.useState("");
  const [benchmarkName, setBenchmarkName] = React.useState("");
  const [visible, setVisible] = React.useState(true);

  const phraseEn = `Last ${FORM_WINDOW} games avg vs`;
  const { translate: trAuto } = useAutoTranslateStrings([statLabel, phraseEn].filter(Boolean), portalLanguage);

  const benchmarksRef = React.useRef<any[] | null>(null);
  const usedStatsRef = React.useRef<Set<string>>(new Set());
  const statLabelRef = React.useRef("");
  const benchmarkNameRef = React.useRef("");

  // Recent analyses sorted newest-first, limited to form window
  const recentAnalyses = React.useMemo(() => {
    return [...analyses]
      .filter(a => a.r90_score != null)
      .sort((a, b) => new Date(b.analysis_date).getTime() - new Date(a.analysis_date).getTime())
      .slice(0, FORM_WINDOW);
  }, [analyses]);

  const pickComparison = React.useCallback(() => {
    const benchmarks = benchmarksRef.current;
    if (recentAnalyses.length === 0 || !benchmarks || benchmarks.length === 0) return false;

    if (usedStatsRef.current.size >= ALL_METRICS.length) {
      usedStatsRef.current.clear();
    }

    const available = ALL_METRICS.filter(m => !usedStatsRef.current.has(m.key));
    const shuffledMetrics = [...available].sort(() => Math.random() - 0.5);
    const shuffledBenchmarks = [...benchmarks].sort(() => Math.random() - 0.5);

    for (const metric of shuffledMetrics) {
      // Use centralised rule: raw blanks count as 0, percentages exclude blanks.
      const playerAvg = computeStatAverage(recentAnalyses, metric.key);
      if (playerAvg == null) continue;

      for (const benchmark of shuffledBenchmarks) {
        const metrics = (benchmark.metrics || {}) as Record<string, number>;
        const benchmarkVal = metrics[metric.key];

        // Deduplicate
        if (metric.label === statLabelRef.current && benchmark.name === benchmarkNameRef.current) continue;

        if (typeof benchmarkVal === "number") {
          usedStatsRef.current.add(metric.key);
          statLabelRef.current = metric.label;
          benchmarkNameRef.current = benchmark.name;
          setStatLabel(metric.label);
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
  }, [playerName, recentAnalyses]);

  // Fetch only benchmarks (player data comes from props now)
  React.useEffect(() => {
    let cancelled = false;
    const fetchBenchmarks = async () => {
      setLoading(true);
      try {
        const { data: benchmarks } = await supabase
          .from("comparison_players")
          .select("name, position, metrics")
          .eq("position", playerPosition);

        if (cancelled) return;
        benchmarksRef.current = benchmarks || [];

        if (!pickComparison()) {
          setChartData(null);
        }
      } catch (error) {
        console.error("Error fetching benchmarks:", error);
        if (!cancelled) setChartData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchBenchmarks();
    return () => { cancelled = true; };
  }, [playerPosition, pickComparison]);

  // Auto-rotate every 15 seconds
  React.useEffect(() => {
    if (loading || !benchmarksRef.current) return;
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
            <CardTitle className="font-heading tracking-tight ml-[9px] mt-[1px]">{t(portalLanguage, "comparisons")}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {onSeeAll && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSeeAll}
                className="flex items-center gap-1 text-sm text-primary hover:text-black hover:bg-primary h-10"
              >
                {t(portalLanguage, "view_all")}
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
                  <span className="font-semibold text-foreground">{trAuto(statLabel)}</span> — {trAuto(phraseEn)}{" "}
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
