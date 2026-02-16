import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { METRIC_CATEGORIES } from "./ComparisonPlayerData";
import type { UnifiedStat } from "./UnifiedStatsEditor";

// Mapping from fixture stat keys to match statistics (unified stats) keys
// fixture_stat_key → { unifiedKey, unifiedType }
export const FIXTURE_TO_UNIFIED_MAP: Record<string, { key: string; type: 'count' | 'score' }> = {
  goals_per90: { key: 'goals', type: 'count' },
  assists_per90: { key: 'assists', type: 'count' },
  shots_on_target_per90: { key: 'shots_on_target', type: 'count' },
  total_shots_per90: { key: 'shots', type: 'count' },
  progressive_passes_per90: { key: 'progressive_passes', type: 'count' },
  key_passes_per90: { key: 'key_passes', type: 'count' },
  successful_dribbles_per90: { key: 'dribbles_completed', type: 'count' },
  progressive_carries_per90: { key: 'progressive_carries', type: 'count' },
  carries_into_final_3rd_per90: { key: 'carries_into_final_third', type: 'count' },
  touches_in_opp_box_per90: { key: 'touches_in_box', type: 'count' },
  fouls_drawn_per90: { key: 'fouls_won', type: 'count' },
  tackles_won_per90: { key: 'tackles_won', type: 'count' },
  aerials_won_per90: { key: 'aerial_duels_won', type: 'count' },
  duels_won_per90: { key: 'duels_won', type: 'count' },
  clearances_per90: { key: 'clearances', type: 'count' },
  interceptions_per90: { key: 'interceptions', type: 'count' },
  accurate_crosses_per90: { key: 'crosses_completed', type: 'count' },
  accurate_long_balls_per90: { key: 'long_passes_completed', type: 'count' },
  npxg_per90: { key: 'npxg', type: 'score' },
  xa_per90: { key: 'xa', type: 'score' },
};

// Reverse mapping: unified stat key → fixture stat key
export const UNIFIED_TO_FIXTURE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(FIXTURE_TO_UNIFIED_MAP).map(([fKey, { key }]) => [key, fKey])
);

interface FixtureStatsEditorProps {
  fixtureStats: Record<string, number>;
  onStatsChange: (stats: Record<string, number>) => void;
  unifiedStats?: UnifiedStat[];
  onUnifiedStatsChange?: (stats: UnifiedStat[]) => void;
}

export const FixtureStatsEditor = ({ fixtureStats, onStatsChange, unifiedStats, onUnifiedStatsChange }: FixtureStatsEditorProps) => {
  const [activeCategory, setActiveCategory] = useState("Shooting");

  const handleChange = (key: string, value: string) => {
    const updated = { ...fixtureStats };
    if (value === '' || isNaN(parseFloat(value))) {
      delete updated[key];
    } else {
      updated[key] = parseFloat(value);
    }
    onStatsChange(updated);

    // Sync to unified stats if mapping exists
    const mapping = FIXTURE_TO_UNIFIED_MAP[key];
    if (mapping && unifiedStats && onUnifiedStatsChange) {
      const numVal = parseFloat(value);
      const existingIdx = unifiedStats.findIndex(s => s.key === mapping.key);
      if (existingIdx >= 0) {
        const newStats = [...unifiedStats];
        if (value === '' || isNaN(numVal)) {
          // Remove the unified stat
          newStats.splice(existingIdx, 1);
        } else {
          newStats[existingIdx] = {
            ...newStats[existingIdx],
            count: mapping.type === 'count' ? numVal : undefined,
            score: mapping.type === 'score' ? numVal : undefined,
          };
        }
        onUnifiedStatsChange(newStats);
      } else if (!isNaN(numVal) && value !== '') {
        // Add new unified stat
        const config = { name: key, key: mapping.key };
        onUnifiedStatsChange([...unifiedStats, {
          key: mapping.key,
          displayName: mapping.key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          type: mapping.type === 'count' ? 'count' : 'score',
          count: mapping.type === 'count' ? numVal : undefined,
          score: mapping.type === 'score' ? numVal : undefined,
        }]);
      }
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">Fixture Stats</Label>
      <p className="text-xs text-muted-foreground">
        Raw match totals. Per-90 averages are calculated automatically for portal comparisons.
      </p>
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="grid grid-cols-4 gap-1">
          {METRIC_CATEGORIES.map(cat => (
            <TabsTrigger key={cat.category} value={cat.category} className="text-xs">
              {cat.category}
            </TabsTrigger>
          ))}
        </TabsList>

        {METRIC_CATEGORIES.map(cat => (
          <TabsContent key={cat.category} value={cat.category} className="mt-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {cat.metrics.map(m => (
                <div key={m.key}>
                  <Label className="text-xs text-muted-foreground">{m.label}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={fixtureStats[m.key] ?? ''}
                    onChange={(e) => handleChange(m.key, e.target.value)}
                    className="h-8 text-sm"
                    placeholder="-"
                  />
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
