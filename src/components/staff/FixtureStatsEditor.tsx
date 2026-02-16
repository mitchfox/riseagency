import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { METRIC_CATEGORIES } from "./ComparisonPlayerData";

interface FixtureStatsEditorProps {
  fixtureStats: Record<string, number>;
  onStatsChange: (stats: Record<string, number>) => void;
}

export const FixtureStatsEditor = ({ fixtureStats, onStatsChange }: FixtureStatsEditorProps) => {
  const [activeCategory, setActiveCategory] = useState("Shooting");

  const handleChange = (key: string, value: string) => {
    const updated = { ...fixtureStats };
    if (value === '' || isNaN(parseFloat(value))) {
      delete updated[key];
    } else {
      updated[key] = parseFloat(value);
    }
    onStatsChange(updated);
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
