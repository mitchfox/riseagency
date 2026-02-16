import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Check, X, Plus, Trash2 } from 'lucide-react';

// Stat type configurations with input modes
export type StatInputMode = 'success_fail' | 'count' | 'score';

export interface StatTypeConfig {
  name: string;
  key: string;  // Normalized key for database matching (e.g., "dribbles", "xg")
  mode: StatInputMode;
  description?: string;
}

// Comprehensive stat types with proper input modes and database-compatible keys
// Keys match form_grade_configs.metric_key for chart consistency
export const STAT_TYPE_CONFIGS: StatTypeConfig[] = [
  // Success/Fail stats (attempted with outcome)
  { name: 'Dribbles', key: 'dribbles', mode: 'success_fail' },
  { name: 'Passes', key: 'passes', mode: 'success_fail' },
  { name: 'Shots', key: 'shots', mode: 'success_fail' },
  { name: 'Tackles', key: 'tackles', mode: 'success_fail' },
  { name: 'Aerial Duels', key: 'aerial_duels', mode: 'success_fail' },
  { name: 'Crosses', key: 'crosses', mode: 'success_fail' },
  { name: 'Through Balls', key: 'through_balls', mode: 'success_fail' },
  { name: 'Long Balls', key: 'long_balls', mode: 'success_fail' },
  { name: 'Long Passes', key: 'long_passes', mode: 'success_fail' },
  { name: 'Progressive Passes', key: 'progressive_passes', mode: 'success_fail' },
  { name: 'Key Passes', key: 'key_passes', mode: 'success_fail' },
  { name: 'Chances Created', key: 'chances_created', mode: 'success_fail' },
  { name: 'Take-Ons', key: 'take_ons', mode: 'success_fail' },
  { name: '1v1s', key: '1v1s', mode: 'success_fail' },
  { name: 'Presses', key: 'presses', mode: 'success_fail' },
  { name: 'Pressing Actions', key: 'pressing_actions', mode: 'success_fail' },
  { name: 'Defensive Duels', key: 'defensive_duels', mode: 'success_fail' },
  { name: 'Hold Up Play', key: 'hold_up_play', mode: 'success_fail' },
  { name: 'Cut Insides', key: 'cut_insides', mode: 'success_fail' },
  { name: 'Duels', key: 'duels', mode: 'success_fail' },
  
  // Count-only stats (just occurrences, no success/fail)
  { name: 'Interceptions', key: 'interceptions', mode: 'count' },
  { name: 'Clearances', key: 'clearances', mode: 'count' },
  { name: 'Blocks', key: 'blocks', mode: 'count' },
  { name: 'Recoveries', key: 'recoveries', mode: 'count' },
  { name: 'Regains', key: 'regains', mode: 'count' },
  { name: 'Touches in Box', key: 'touches_in_box', mode: 'count' },
  { name: 'Box Entries', key: 'box_entries', mode: 'count' },
  { name: 'Final Third Entries', key: 'final_third_entries', mode: 'count' },
  { name: 'Fouls Won', key: 'fouls_won', mode: 'count' },
  { name: 'Fouls Committed', key: 'fouls_committed', mode: 'count' },
  { name: 'Turnovers', key: 'turnovers', mode: 'count' },
  { name: 'Dispossessed', key: 'dispossessed', mode: 'count' },
  { name: 'Miscontrols', key: 'miscontrols', mode: 'count' },
  { name: 'Goals', key: 'goals', mode: 'count' },
  { name: 'Assists', key: 'assists', mode: 'count' },
  { name: 'Progressive Carries', key: 'progressive_carries', mode: 'count' },
  { name: 'Progressive Passes Received', key: 'progressive_passes_received', mode: 'count' },
  { name: 'Carries into Final Third', key: 'carries_into_final_third', mode: 'count' },
  { name: 'Carries into Box', key: 'carries_into_box', mode: 'count' },
  { name: 'Touches', key: 'touches', mode: 'count' },
  { name: 'Ground Duels Won', key: 'ground_duels_won', mode: 'count' },
  { name: 'Duels Won', key: 'duels_won', mode: 'count' },
  { name: 'Aerial Duels Won', key: 'aerial_duels_won', mode: 'count' },
  { name: 'Tackles Won', key: 'tackles_won', mode: 'count' },
  { name: 'Dribbles Completed', key: 'dribbles_completed', mode: 'count' },
  { name: 'Crosses Completed', key: 'crosses_completed', mode: 'count' },
  { name: 'Long Passes Completed', key: 'long_passes_completed', mode: 'count' },
  { name: 'Shots on Target', key: 'shots_on_target', mode: 'count' },
  { name: 'Shot Creating Actions', key: 'shot_creating_actions', mode: 'count' },
  { name: 'Goal Creating Actions', key: 'goal_creating_actions', mode: 'count' },
  
  // Score stats (decimal values like xG, xA)
  { name: 'xG', key: 'xg', mode: 'score', description: 'Expected Goals value' },
  { name: 'xA', key: 'xa', mode: 'score', description: 'Expected Assists value' },
  { name: 'xG Chain', key: 'xg_chain', mode: 'score', description: 'Expected Goals Chain value' },
  { name: 'xGChain', key: 'xGChain', mode: 'score', description: 'Expected Goals Chain value (legacy)' },
  { name: 'xC', key: 'xc', mode: 'score', description: 'Expected Contribution value' },
  { name: 'npxG', key: 'npxg', mode: 'score', description: 'Non-penalty Expected Goals' },
  { name: 'xGOT', key: 'xgot', mode: 'score', description: 'Expected Goals on Target' },
  { name: 'xG per Shot', key: 'xg_per_shot', mode: 'score', description: 'xG per shot taken' },
  
  // Adjusted stats (zone-adjusted values)
  { name: 'xG Adj', key: 'xG_adj', mode: 'score', description: 'Zone-adjusted Expected Goals' },
  { name: 'xA Adj', key: 'xA_adj', mode: 'score', description: 'Zone-adjusted Expected Assists' },
  { name: 'Regains Adj', key: 'regains_adj', mode: 'count', description: 'Zone-adjusted Regains' },
  { name: 'Turnovers Adj', key: 'turnovers_adj', mode: 'count', description: 'Zone-adjusted Turnovers' },
  { name: 'Progressive Passes Adj', key: 'progressive_passes_adj', mode: 'count', description: 'Zone-adjusted Progressive Passes' },
  
  // Percentage stats (0-100 values)
  { name: 'Aerial Duel Win %', key: 'aerial_duel_win_pct', mode: 'score', description: 'Aerial duel success rate' },
  { name: 'Pass Completion %', key: 'pass_completion', mode: 'score', description: 'Pass completion rate' },
  
  // Ratio stats (calculated from other stats)
  { name: 'PP/Turnovers Ratio', key: 'pp_turnovers_ratio', mode: 'score', description: 'Progressive passes to turnovers ratio' },
  { name: 'Recovery/Turnover Ratio', key: 'recovery_turnover_ratio', mode: 'score', description: 'Recoveries to turnovers ratio' },
  { name: 'R90 Score', key: 'r90', mode: 'score', description: 'R90 performance score' },
];

export interface RecordedStat {
  stat_type: string;
  is_successful?: boolean; // For success_fail mode
  count?: number; // For count mode (default 1)
  score?: number; // For score mode (decimal value)
  mode: StatInputMode;
}

interface ActionStatRecorderProps {
  currentStat: RecordedStat | RecordedStat[] | null;
  onStatRecorded: (stat: RecordedStat | RecordedStat[] | null) => void;
  disabled?: boolean;
}

export const ActionStatRecorder = ({
  currentStat,
  onStatRecorded,
  disabled = false,
}: ActionStatRecorderProps) => {
  const [open, setOpen] = useState(false);
  
  // Normalize to array format internally
  const currentStats: RecordedStat[] = Array.isArray(currentStat) 
    ? currentStat 
    : currentStat 
      ? [currentStat] 
      : [];
  
  const [stats, setStats] = useState<RecordedStat[]>(currentStats);
  const [statType, setStatType] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(true);
  const [scoreValue, setScoreValue] = useState('');
  const [customType, setCustomType] = useState('');
  const [customMode, setCustomMode] = useState<StatInputMode>('success_fail');

  // Sync with external state when popover opens
  useEffect(() => {
    if (open) {
      const normalized: RecordedStat[] = Array.isArray(currentStat) 
        ? currentStat 
        : currentStat 
          ? [currentStat] 
          : [];
      setStats(normalized);
    }
  }, [open, currentStat]);

  const getStatConfig = (typeName: string): StatTypeConfig | undefined => {
    // Support both name and key lookups for backwards compatibility
    return STAT_TYPE_CONFIGS.find(c => c.name === typeName || c.key === typeName);
  };

  const getCurrentMode = (): StatInputMode => {
    if (statType === 'custom') return customMode;
    const config = getStatConfig(statType);
    return config?.mode || 'success_fail';
  };

  const handleAddStat = () => {
    const finalStatType = statType === 'custom' ? customType : statType;
    if (!finalStatType) return;

    const mode = getCurrentMode();
    let newStat: RecordedStat;

    if (mode === 'success_fail') {
      newStat = { stat_type: finalStatType, is_successful: isSuccessful, mode };
    } else if (mode === 'count') {
      newStat = { stat_type: finalStatType, count: 1, mode };
    } else {
      // score mode
      const parsedScore = parseFloat(scoreValue);
      if (isNaN(parsedScore)) {
        return; // Don't add if no valid score
      }
      newStat = { stat_type: finalStatType, score: parsedScore, mode };
    }

    const newStats = [...stats, newStat];
    setStats(newStats);
    onStatRecorded(newStats);
    
    // Reset form for next stat
    setStatType('');
    setCustomType('');
    setIsSuccessful(true);
    setScoreValue('');
  };

  const handleRemoveStat = (index: number) => {
    const newStats = stats.filter((_, i) => i !== index);
    setStats(newStats);
    onStatRecorded(newStats.length > 0 ? newStats : null);
  };

  const handleClearAll = () => {
    setStats([]);
    onStatRecorded(null);
    setStatType('');
    setCustomType('');
    setIsSuccessful(true);
    setScoreValue('');
    setOpen(false);
  };

  const formatStatDisplay = (stat: RecordedStat): string => {
    const mode = stat.mode || 'success_fail';
    if (mode === 'score' && stat.score !== undefined) {
      return `${stat.stat_type}: ${stat.score.toFixed(2)}`;
    }
    if (mode === 'count') {
      return stat.stat_type;
    }
    return stat.stat_type;
  };

  const getStatBadgeVariant = (stat: RecordedStat): "default" | "destructive" | "secondary" => {
    const mode = stat.mode || 'success_fail';
    if (mode === 'success_fail') {
      return stat.is_successful ? "default" : "destructive";
    }
    if (mode === 'score') {
      return "secondary";
    }
    return "default"; // count mode
  };

  const hasRecordedStats = stats.length > 0;
  const currentMode = getCurrentMode();
  const canAddStat = statType && (
    statType !== 'custom' || customType
  ) && (
    currentMode !== 'score' || (scoreValue && !isNaN(parseFloat(scoreValue)))
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 min-w-8 p-0 px-1 hover:text-black ${hasRecordedStats ? 'bg-primary/10' : ''}`}
          disabled={disabled}
          title={hasRecordedStats 
            ? `${stats.length} stat(s) recorded` 
            : 'Record Stats'
          }
        >
          {hasRecordedStats ? (
            <div className="flex items-center gap-0.5">
              <ClipboardList className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium">{stats.length}</span>
            </div>
          ) : (
            <ClipboardList className="h-4 w-4 text-primary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 z-[100]" align="start">
        <div className="space-y-4">
          <div className="font-semibold text-sm">Record Stats</div>
          
          {/* Already recorded stats */}
          {stats.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Recorded Stats:</Label>
              <div className="flex flex-wrap gap-1.5">
                {stats.map((stat, index) => (
                  <Badge 
                    key={index} 
                    variant={getStatBadgeVariant(stat)}
                    className="flex items-center gap-1 pr-1"
                  >
                    {stat.mode === 'success_fail' && (
                      stat.is_successful ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )
                    )}
                    <span>{formatStatDisplay(stat)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveStat(index)}
                      className="ml-1 hover:bg-background/20 rounded p-0.5"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Add new stat form */}
          <div className="border-t pt-3 space-y-3">
            <Label className="text-xs font-medium">Add a Stat:</Label>
            
            <div className="space-y-2">
              <Select value={statType} onValueChange={setStatType}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select stat type" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="header-success" disabled className="font-semibold text-xs text-muted-foreground">
                    — Success/Fail Stats —
                  </SelectItem>
                  {STAT_TYPE_CONFIGS.filter(c => c.mode === 'success_fail').map((config) => (
                    <SelectItem key={config.name} value={config.name}>{config.name}</SelectItem>
                  ))}
                  <SelectItem value="header-count" disabled className="font-semibold text-xs text-muted-foreground mt-2">
                    — Count Stats —
                  </SelectItem>
                  {STAT_TYPE_CONFIGS.filter(c => c.mode === 'count').map((config) => (
                    <SelectItem key={config.name} value={config.name}>{config.name}</SelectItem>
                  ))}
                  <SelectItem value="header-score" disabled className="font-semibold text-xs text-muted-foreground mt-2">
                    — Score Stats —
                  </SelectItem>
                  {STAT_TYPE_CONFIGS.filter(c => c.mode === 'score').map((config) => (
                    <SelectItem key={config.name} value={config.name}>
                      {config.name}
                      {config.description && <span className="text-muted-foreground ml-1">({config.description})</span>}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom" className="mt-2">Custom...</SelectItem>
                </SelectContent>
              </Select>
              
              {statType === 'custom' && (
                <div className="space-y-2">
                  <Input
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    placeholder="Enter custom stat type"
                    className="h-8 text-sm"
                  />
                  <Select value={customMode} onValueChange={(v) => setCustomMode(v as StatInputMode)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="success_fail">Success/Fail</SelectItem>
                      <SelectItem value="count">Count Only</SelectItem>
                      <SelectItem value="score">Score Value</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Input based on mode */}
            {statType && currentMode === 'success_fail' && (
              <div className="flex items-center justify-between">
                <Label className="text-xs">Outcome</Label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${!isSuccessful ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>
                    Unsuccessful
                  </span>
                  <Switch
                    checked={isSuccessful}
                    onCheckedChange={setIsSuccessful}
                  />
                  <span className={`text-xs ${isSuccessful ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                    Successful
                  </span>
                </div>
              </div>
            )}

            {statType && currentMode === 'count' && (
              <div className="bg-accent/30 rounded-lg p-2 text-center">
                <span className="text-xs text-muted-foreground">
                  This stat type counts occurrences (no success/fail)
                </span>
              </div>
            )}

            {statType && currentMode === 'score' && (
              <div className="space-y-2">
                <Label className="text-xs">Score Value</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={scoreValue}
                  onChange={(e) => setScoreValue(e.target.value)}
                  placeholder="e.g. 0.45"
                  className="h-8 text-sm"
                />
              </div>
            )}

            <Button 
              size="sm" 
              onClick={handleAddStat}
              disabled={!canAddStat}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Stat
            </Button>
          </div>

          {/* Footer buttons */}
          <div className="flex gap-2 border-t pt-3">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Done
            </Button>
            {hasRecordedStats && (
              <Button 
                size="sm" 
                variant="destructive"
                onClick={handleClearAll}
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Aggregation result types
export interface AggregatedSuccessFailStat {
  type: 'success_fail';
  successful: number;
  total: number;
}

export interface AggregatedCountStat {
  type: 'count';
  count: number;
}

export interface AggregatedScoreStat {
  type: 'score';
  totalScore: number;
  count: number;
}

export type AggregatedStat = AggregatedSuccessFailStat | AggregatedCountStat | AggregatedScoreStat;

// Helper function to aggregate stats from actions (supports all modes)
export const aggregateRecordedStats = (
  actions: Array<{ recorded_stat?: RecordedStat | RecordedStat[] | null }>
): Record<string, AggregatedStat> => {
  const stats: Record<string, AggregatedStat> = {};
  
  for (const action of actions) {
    if (!action.recorded_stat) continue;
    
    // Normalize to array
    const recordedStats: RecordedStat[] = Array.isArray(action.recorded_stat) 
      ? action.recorded_stat 
      : [action.recorded_stat];
    
    for (const stat of recordedStats) {
      if (!stat?.stat_type) continue;
      
      const type = stat.stat_type;
      const mode = stat.mode || 'success_fail'; // Default to success_fail for legacy data
      
      if (mode === 'success_fail') {
        if (!stats[type]) {
          stats[type] = { type: 'success_fail', successful: 0, total: 0 };
        }
        const existing = stats[type] as AggregatedSuccessFailStat;
        existing.total += 1;
        if (stat.is_successful) {
          existing.successful += 1;
        }
      } else if (mode === 'count') {
        if (!stats[type]) {
          stats[type] = { type: 'count', count: 0 };
        }
        const existing = stats[type] as AggregatedCountStat;
        existing.count += stat.count || 1;
      } else if (mode === 'score') {
        if (!stats[type]) {
          stats[type] = { type: 'score', totalScore: 0, count: 0 };
        }
        const existing = stats[type] as AggregatedScoreStat;
        existing.totalScore += stat.score || 0;
        existing.count += 1;
      }
    }
  }
  
  return stats;
};

// Format aggregated stat for display
export const formatAggregatedStat = (stat: AggregatedStat): string => {
  if (stat.type === 'success_fail') {
    return `${stat.successful} / ${stat.total}`;
  }
  if (stat.type === 'count') {
    return `${stat.count}`;
  }
  if (stat.type === 'score') {
    return stat.totalScore.toFixed(2);
  }
  return '-';
};

// Get success rate for success/fail stats
export const getSuccessRate = (stat: AggregatedStat): number | null => {
  if (stat.type === 'success_fail' && stat.total > 0) {
    return (stat.successful / stat.total) * 100;
  }
  return null;
};
