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

interface StatTypeConfig {
  name: string;
  mode: StatInputMode;
  description?: string;
}

// Comprehensive stat types with proper input modes
const STAT_TYPE_CONFIGS: StatTypeConfig[] = [
  // Success/Fail stats (attempted with outcome)
  { name: 'Dribble', mode: 'success_fail' },
  { name: 'Pass', mode: 'success_fail' },
  { name: 'Shot', mode: 'success_fail' },
  { name: 'Tackle', mode: 'success_fail' },
  { name: 'Aerial Duel', mode: 'success_fail' },
  { name: 'Cross', mode: 'success_fail' },
  { name: 'Through Ball', mode: 'success_fail' },
  { name: 'Long Ball', mode: 'success_fail' },
  { name: 'Long Pass', mode: 'success_fail' },
  { name: 'Progressive Pass', mode: 'success_fail' },
  { name: 'Key Pass', mode: 'success_fail' },
  { name: 'Chance Created', mode: 'success_fail' },
  { name: 'Take-On', mode: 'success_fail' },
  { name: '1v1', mode: 'success_fail' },
  { name: 'Press', mode: 'success_fail' },
  { name: 'Defensive Duel', mode: 'success_fail' },
  { name: 'Hold Up Play', mode: 'success_fail' },
  { name: 'Cut Inside', mode: 'success_fail' },
  
  // Count-only stats (just occurrences, no success/fail)
  { name: 'Interception', mode: 'count' },
  { name: 'Clearance', mode: 'count' },
  { name: 'Block', mode: 'count' },
  { name: 'Recovery', mode: 'count' },
  { name: 'Regain', mode: 'count' },
  { name: 'Touch in Box', mode: 'count' },
  { name: 'Touches in Box', mode: 'count' },
  { name: 'Final Third Entry', mode: 'count' },
  { name: 'Foul Won', mode: 'count' },
  { name: 'Foul Committed', mode: 'count' },
  { name: 'Turnover', mode: 'count' },
  { name: 'Turnovers', mode: 'count' },
  { name: 'Goal', mode: 'count' },
  { name: 'Goals', mode: 'count' },
  { name: 'Assist', mode: 'count' },
  { name: 'Assists', mode: 'count' },
  { name: 'Progressive Carries', mode: 'count' },
  { name: 'Carries into Final Third', mode: 'count' },
  { name: 'Carries into Box', mode: 'count' },
  
  // Score stats (decimal values like xG, xA)
  { name: 'xG', mode: 'score', description: 'Expected Goals value' },
  { name: 'xA', mode: 'score', description: 'Expected Assists value' },
  { name: 'xGChain', mode: 'score', description: 'Expected Goals Chain value' },
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
    return STAT_TYPE_CONFIGS.find(c => c.name === typeName);
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
          className={`h-8 min-w-8 p-0 px-1 ${hasRecordedStats ? 'bg-primary/10' : ''}`}
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
