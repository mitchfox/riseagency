import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { METRIC_CATEGORIES, GK_METRIC_CATEGORIES, getMetricCategoriesForPosition } from "./ComparisonPlayerData";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";
import { toast } from "sonner";
import { Sparkles, Plus, Loader2, ArrowUpToLine, Link2 } from "lucide-react";

// Mapping from fixture stat keys to match statistics (unified stats) keys
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

interface AISuggestion {
  value: number;
  reasoning: string;
  contributing_action_numbers: number[];
}

interface PerformanceActionForAI {
  action_number: number;
  minute: string;
  action_score: string;
  action_type: string;
  action_description: string;
  notes: string;
  zone?: number | null;
}

interface FixtureStatsEditorProps {
  fixtureStats: Record<string, number>;
  onStatsChange: (stats: Record<string, number>) => void;
  actions?: PerformanceActionForAI[];
  previousFixtureStats?: Record<string, number>;
  onAddToMatchStats?: (fixtureKey: string, label: string, value: number) => void;
  playerPosition?: string;
}

export const FixtureStatsEditor = ({ fixtureStats, onStatsChange, actions, previousFixtureStats, onAddToMatchStats, playerPosition }: FixtureStatsEditorProps) => {
  const [activeCategory, setActiveCategory] = useState(() => getMetricCategoriesForPosition(playerPosition)[0]?.category || "Shooting");
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, AISuggestion>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlParsing, setUrlParsing] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const positionCategories = getMetricCategoriesForPosition(playerPosition);

  useEffect(() => {
    const defaultCategory = positionCategories[0]?.category;
    if (defaultCategory && !positionCategories.some(category => category.category === activeCategory)) {
      setActiveCategory(defaultCategory);
    }
  }, [activeCategory, positionCategories]);

  const handleChange = (key: string, value: string) => {
    const updated = { ...fixtureStats };
    if (value === '' || isNaN(parseFloat(value))) {
      delete updated[key];
    } else {
      updated[key] = parseFloat(value);
    }
    onStatsChange(updated);
  };

  const handleAcceptSuggestion = (key: string, value: number) => {
    const updated = { ...fixtureStats, [key]: value };
    onStatsChange(updated);
    setAiSuggestions(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const getActionHoverText = (actionNumber: number) => {
    const action = actions?.find(a => a.action_number === actionNumber);
    if (!action) return `Action #${actionNumber}`;

    return `#${actionNumber} · min ${action.minute || '?'} · score ${action.action_score || 'N/A'} · ${action.action_description || action.action_type || 'No description'}`;
  };

  const handleSuggestWithAI = async () => {
    if (!actions || actions.length === 0) {
      toast.error('No performance actions to analyse');
      return;
    }

    setAiLoading(true);
    try {
      const categories = positionCategories;
      const allMetrics = categories.flatMap(cat =>
        cat.metrics.map(m => ({ key: m.key, label: m.label }))
      );

      const { data, error } = await invokeEdgeFunction('suggest-fixture-stats', {
        body: {
          actions: actions.map(a => ({
            action_number: a.action_number,
            minute: a.minute,
            action_score: a.action_score,
            action_type: a.action_type,
            action_description: a.action_description,
            notes: a.notes,
            zone: a.zone || null,
          })),
          statDefinitions: allMetrics,
          previousStats: previousFixtureStats || {},
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.suggestions) {
        setAiSuggestions(data.suggestions);
        const count = Object.keys(data.suggestions).length;
        toast.success(`AI suggested ${count} stat${count !== 1 ? 's' : ''}`);
      }
    } catch (err: any) {
      console.error('AI suggestion error:', err);
      toast.error('Failed to get AI suggestions');
    } finally {
      setAiLoading(false);
    }
  };

  const handleParseUrl = async () => {
    if (!urlInput.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    setUrlParsing(true);
    try {
      const { data, error } = await invokeEdgeFunction('parse-stats-url', {
        body: { url: urlInput.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.multiplePlayersAvailable && data?.players) {
        // Auto-pick player with the richest stat set (avoids selecting a player with only 1 stat)
        const bestPlayerEntry = Object.entries(data.players as Record<string, { stats?: Record<string, number>; team?: string }>)
          .map(([name, player]) => ({
            name,
            team: player?.team || 'Unknown',
            stats: player?.stats || {},
            count: Object.keys(player?.stats || {}).length,
          }))
          .sort((a, b) => b.count - a.count)[0];

        if (bestPlayerEntry && bestPlayerEntry.count > 0) {
          const suggestions: Record<string, AISuggestion> = {};
          for (const [key, value] of Object.entries(bestPlayerEntry.stats)) {
            suggestions[key] = {
              value,
              reasoning: `From SofaScore (${bestPlayerEntry.name}, ${bestPlayerEntry.team})`,
              contributing_action_numbers: [],
            };
          }
          setAiSuggestions(prev => ({ ...prev, ...suggestions }));
          toast.success(`Parsed ${bestPlayerEntry.count} stat${bestPlayerEntry.count !== 1 ? 's' : ''} from SofaScore for ${bestPlayerEntry.name}`);
          setShowUrlInput(false);
          setUrlInput("");
        } else {
          const playerCount = Object.keys(data.players).length;
          toast.info(`Found ${playerCount} players but no reliable stats were extracted yet`);
        }
      } else if (data?.fixtureStats) {
        const suggestions: Record<string, AISuggestion> = {};
        for (const [key, value] of Object.entries(data.fixtureStats as Record<string, number>)) {
          suggestions[key] = {
            value,
            reasoning: `From ${data.source || 'external source'}`,
            contributing_action_numbers: [],
          };
        }
        setAiSuggestions(prev => ({ ...prev, ...suggestions }));
        const count = Object.keys(data.fixtureStats).length;
        toast.success(`Parsed ${count} stat${count !== 1 ? 's' : ''} from ${data.source || 'link'}${data.playerName ? ` (${data.playerName})` : ''}`);
        setShowUrlInput(false);
        setUrlInput("");
      } else {
        toast.info('No stats could be extracted from that page');
      }
    } catch (err: any) {
      console.error('URL parse error:', err);
      toast.error('Failed to parse stats: ' + (err.message || 'Unknown error'));
    } finally {
      setUrlParsing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <Label className="text-sm font-semibold">Fixture Stats</Label>
          <p className="text-xs text-muted-foreground">
            Raw match totals. Per-90 averages are calculated automatically for portal comparisons.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="gap-1.5"
          >
            <Link2 className="w-3.5 h-3.5" />
            Parse Link
          </Button>
          {actions && actions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSuggestWithAI}
              disabled={aiLoading}
              className="gap-1.5"
            >
              {aiLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {aiLoading ? 'Analysing...' : 'Suggest with AI'}
            </Button>
          )}
        </div>
      </div>

      {showUrlInput && (
        <div className="flex gap-2 items-center p-2 bg-muted/50 rounded-md border">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste SofaScore or FBRef match URL..."
            className="h-8 text-sm flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleParseUrl()}
          />
          <Button
            size="sm"
            onClick={handleParseUrl}
            disabled={urlParsing || !urlInput.trim()}
            className="h-8 gap-1.5"
          >
            {urlParsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
            {urlParsing ? 'Parsing...' : 'Parse'}
          </Button>
        </div>
      )}

        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className={`grid gap-1`} style={{ gridTemplateColumns: `repeat(${positionCategories.length}, 1fr)` }}>
            {positionCategories.map(cat => (
            <TabsTrigger key={cat.category} value={cat.category} className="text-xs">
              {cat.category}
            </TabsTrigger>
          ))}
        </TabsList>

          {positionCategories.map(cat => (
          <TabsContent key={cat.category} value={cat.category} className="mt-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {cat.metrics.map(m => {
                const suggestion = aiSuggestions[m.key];
                return (
                  <div key={m.key}>
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground">{m.label}</Label>
                      {onAddToMatchStats && fixtureStats[m.key] != null && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => onAddToMatchStats(m.key, m.label, fixtureStats[m.key])}
                              className="p-0.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-primary"
                            >
                              <ArrowUpToLine className="w-3 h-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">Add to Match Statistics</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      value={fixtureStats[m.key] ?? ''}
                      onChange={(e) => handleChange(m.key, e.target.value)}
                      className="h-8 text-sm"
                      placeholder="-"
                    />
                    {suggestion && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="mt-1 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer">
                            <span className="font-mono font-semibold bg-primary/10 px-1.5 py-0.5 rounded">
                              {suggestion.value}
                            </span>
                            <Plus className="w-3 h-3" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 text-xs" align="start">
                          <div className="space-y-2">
                            <p className="font-medium">AI Suggestion: {suggestion.value}</p>
                            <p className="text-muted-foreground">{suggestion.reasoning}</p>
                            {suggestion.contributing_action_numbers.length > 0 && (
                              <div className="text-muted-foreground">
                                <p>Contributing actions:</p>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {suggestion.contributing_action_numbers.map((actionNumber) => (
                                    <span
                                      key={actionNumber}
                                      title={getActionHoverText(actionNumber)}
                                      className="px-1.5 py-0.5 rounded bg-muted font-mono cursor-help"
                                    >
                                      #{actionNumber}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            <Button
                              size="sm"
                              className="w-full h-7 text-xs"
                              onClick={() => handleAcceptSuggestion(m.key, suggestion.value)}
                            >
                              Accept suggestion
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
