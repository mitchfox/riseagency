import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, EyeOff, Calculator, GripVertical, Sparkles, Loader2 } from 'lucide-react';
import { invokeEdgeFunction } from '@/lib/edgeFunctionHelper';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  STAT_TYPE_CONFIGS,
  StatTypeConfig,
  AggregatedStat, 
  StatInputMode 
} from './ActionStatRecorder';

export interface UnifiedStat {
  key: string;
  displayName: string;
  type: 'success_fail' | 'count' | 'score';
  // For success_fail
  successful?: number;
  total?: number;
  // For count
  count?: number;
  // For score
  score?: number;
  // Display helpers
  per90?: string;
  isFromActions?: boolean; // Whether this came from action recording
  isCalculated?: boolean; // Whether this is auto-calculated from other stats
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

interface UnifiedStatsEditorProps {
  stats: UnifiedStat[];
  onStatsChange: (stats: UnifiedStat[]) => void;
  minutesPlayed: number;
  actions?: PerformanceActionForAI[];
}

// Stat types that should show per90 (score-based stats)
const PER90_STAT_KEYS = ['xg', 'xa', 'xg_chain', 'xgchain', 'xc', 'npxg', 'xgot', 'xg_per_shot', 'r90', 'ratio'];

const shouldShowPer90 = (key: string): boolean => {
  const keyLower = key.toLowerCase();
  // Check for score-type patterns
  return PER90_STAT_KEYS.some(p => keyLower.includes(p.replace('_', '')));
};

// Calculated stat definitions
interface CalculatedStatDef {
  key: string;
  displayName: string;
  type: 'score';
  calculate: (stats: UnifiedStat[]) => number | null;
  description: string;
}

const getStatValue = (stats: UnifiedStat[], key: string): number | null => {
  const stat = stats.find(s => s.key === key);
  if (!stat) return null;
  if (stat.type === 'count') return stat.count ?? null;
  if (stat.type === 'score') return stat.score ?? null;
  if (stat.type === 'success_fail') return stat.total ?? null;
  return null;
};

const getSuccessValue = (stats: UnifiedStat[], key: string): number | null => {
  const stat = stats.find(s => s.key === key);
  if (!stat || stat.type !== 'success_fail') return null;
  return stat.successful ?? null;
};

const CALCULATED_STATS: CalculatedStatDef[] = [
  {
    key: 'recovery_turnover_ratio',
    displayName: 'Recovery/Turnover Ratio',
    type: 'score',
    calculate: (stats) => {
      const recoveries = getStatValue(stats, 'recoveries');
      const turnovers = getStatValue(stats, 'turnovers');
      if (recoveries === null || turnovers === null) return null;
      if (turnovers === 0) return recoveries > 0 ? recoveries : null;
      return recoveries / turnovers;
    },
    description: 'Recoveries ÷ Turnovers'
  },
  {
    key: 'pp_turnovers_ratio',
    displayName: 'PP/Turnovers Ratio',
    type: 'score',
    calculate: (stats) => {
      const ppSuccess = getSuccessValue(stats, 'progressive_passes');
      const turnovers = getStatValue(stats, 'turnovers');
      if (ppSuccess === null || turnovers === null) return null;
      if (turnovers === 0) return ppSuccess > 0 ? ppSuccess : null;
      return ppSuccess / turnovers;
    },
    description: 'Successful Progressive Passes ÷ Turnovers'
  },
  {
    key: 'aerial_duel_win_pct',
    displayName: 'Aerial Duel Win %',
    type: 'score',
    calculate: (stats) => {
      const stat = stats.find(s => s.key === 'aerial_duels');
      if (!stat || stat.type !== 'success_fail') return null;
      const total = stat.total ?? 0;
      const successful = stat.successful ?? 0;
      if (total === 0) return null;
      return (successful / total) * 100;
    },
    description: 'Aerial Duels Won ÷ Total × 100'
  },
  {
    key: 'pass_completion',
    displayName: 'Pass Completion %',
    type: 'score',
    calculate: (stats) => {
      const stat = stats.find(s => s.key === 'passes');
      if (!stat || stat.type !== 'success_fail') return null;
      const total = stat.total ?? 0;
      const successful = stat.successful ?? 0;
      if (total === 0) return null;
      return (successful / total) * 100;
    },
    description: 'Passes Completed ÷ Total × 100'
  },
  {
    key: 'dribble_success_pct',
    displayName: 'Dribble Success %',
    type: 'score',
    calculate: (stats) => {
      const stat = stats.find(s => s.key === 'dribbles');
      if (!stat || stat.type !== 'success_fail') return null;
      const total = stat.total ?? 0;
      const successful = stat.successful ?? 0;
      if (total === 0) return null;
      return (successful / total) * 100;
    },
    description: 'Dribbles Completed ÷ Total × 100'
  },
  {
    key: 'tackle_success_pct',
    displayName: 'Tackle Success %',
    type: 'score',
    calculate: (stats) => {
      const stat = stats.find(s => s.key === 'tackles');
      if (!stat || stat.type !== 'success_fail') return null;
      const total = stat.total ?? 0;
      const successful = stat.successful ?? 0;
      if (total === 0) return null;
      return (successful / total) * 100;
    },
    description: 'Tackles Won ÷ Total × 100'
  },
  {
    key: 'xg_per_shot',
    displayName: 'xG per Shot',
    type: 'score',
    calculate: (stats) => {
      const xg = getStatValue(stats, 'xg');
      const shotsStat = stats.find(s => s.key === 'shots');
      if (xg === null || !shotsStat) return null;
      const shots = shotsStat.type === 'success_fail' ? (shotsStat.total ?? 0) : (shotsStat.count ?? 0);
      if (shots === 0) return null;
      return xg / shots;
    },
    description: 'xG ÷ Total Shots'
  },
];

// Sortable stat card wrapper
const SortableStatCard = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1 cursor-grab active:cursor-grabbing z-10 p-0.5 hover:bg-accent/50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>
      {children}
    </div>
  );
};

export const UnifiedStatsEditor = ({
  stats,
  onStatsChange,
  minutesPlayed,
  actions,
}: UnifiedStatsEditorProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStatKey, setEditingStatKey] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const handleSuggestWithAI = async () => {
    if (!actions || actions.length === 0) {
      toast.error('No performance actions to analyse');
      return;
    }

    setAiLoading(true);
    try {
      const { data, error } = await invokeEdgeFunction('suggest-match-stats', {
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
          statDefinitions: STAT_TYPE_CONFIGS.map(c => ({ key: c.key, name: c.name, mode: c.mode })),
          existingStats: stats.map(s => ({ key: s.key, type: s.type, successful: s.successful, total: s.total, count: s.count, score: s.score })),
        },
      });

      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }

      const suggestions = data?.suggestions || [];
      if (suggestions.length === 0) {
        toast.info('No stat suggestions found from the actions');
        return;
      }

      // Merge suggestions into existing stats
      const updatedStats = [...stats];
      let addedCount = 0;
      let updatedCount = 0;

      for (const suggestion of suggestions) {
        const config = STAT_TYPE_CONFIGS.find(c => c.key === suggestion.stat_key);
        const displayName = config?.name || suggestion.stat_key;
        const existingIdx = updatedStats.findIndex(s => s.key === suggestion.stat_key);

        const newStat: UnifiedStat = {
          key: suggestion.stat_key,
          displayName,
          type: suggestion.stat_type,
          isFromActions: false,
        };

        if (suggestion.stat_type === 'success_fail') {
          newStat.successful = suggestion.successful ?? 0;
          newStat.total = suggestion.total ?? 0;
        } else if (suggestion.stat_type === 'count') {
          newStat.count = suggestion.count ?? 0;
        } else if (suggestion.stat_type === 'score') {
          newStat.score = suggestion.score ?? 0;
          if (shouldShowPer90(suggestion.stat_key) && minutesPlayed > 0) {
            newStat.per90 = ((newStat.score / minutesPlayed) * 90).toFixed(3);
          }
        }

        if (existingIdx >= 0) {
          updatedStats[existingIdx] = { ...updatedStats[existingIdx], ...newStat };
          updatedCount++;
        } else {
          updatedStats.push(newStat);
          addedCount++;
        }
      }

      onStatsChange(updatedStats);
      const parts = [];
      if (addedCount) parts.push(`${addedCount} added`);
      if (updatedCount) parts.push(`${updatedCount} updated`);
      toast.success(`AI suggested stats: ${parts.join(', ')}`);
    } catch (err: any) {
      console.error('AI match stats error:', err);
      toast.error('Failed to get AI suggestions');
    } finally {
      setAiLoading(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleStatDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = stats.findIndex(s => s.key === active.id);
      const newIndex = stats.findIndex(s => s.key === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onStatsChange(arrayMove(stats, oldIndex, newIndex));
      }
    }
  };
  
  // New stat form state
  const [selectedStatKey, setSelectedStatKey] = useState('');
  const [customStatName, setCustomStatName] = useState('');
  const [newStatType, setNewStatType] = useState<StatInputMode>('count');
  const [newStatValue1, setNewStatValue1] = useState(''); // successful or count or score
  const [newStatValue2, setNewStatValue2] = useState(''); // total (for success_fail)

  // Get available stats (not already added)
  const availableStats = STAT_TYPE_CONFIGS.filter(
    config => !stats.some(s => s.key === config.key)
  );

  // Group stats by mode for display
  const successFailStats = availableStats.filter(c => c.mode === 'success_fail');
  const countStats = availableStats.filter(c => c.mode === 'count');
  const scoreStats = availableStats.filter(c => c.mode === 'score');

  const resetNewStatForm = () => {
    setSelectedStatKey('');
    setCustomStatName('');
    setNewStatType('count');
    setNewStatValue1('');
    setNewStatValue2('');
  };

  const handleStatKeyChange = (key: string) => {
    setSelectedStatKey(key);
    if (key === 'custom') {
      setNewStatType('count');
      setCustomStatName('');
    } else {
      const config = STAT_TYPE_CONFIGS.find(c => c.key === key);
      if (config) {
        setNewStatType(config.mode);
      }
    }
  };

  const handleAddStat = () => {
    if (!selectedStatKey) return;

    let key: string;
    let displayName: string;
    let type: StatInputMode;

    if (selectedStatKey === 'custom') {
      if (!customStatName) return;
      key = customStatName.toLowerCase().replace(/\s+/g, '_');
      displayName = customStatName;
      type = newStatType;
    } else {
      const config = STAT_TYPE_CONFIGS.find(c => c.key === selectedStatKey);
      if (!config) return;
      key = config.key;
      displayName = config.name;
      type = config.mode;
    }
    
    // Check if stat already exists
    if (stats.find(s => s.key === key)) {
      return;
    }

    const newStat: UnifiedStat = {
      key,
      displayName,
      type,
      isFromActions: false,
    };

    if (type === 'success_fail') {
      newStat.successful = parseInt(newStatValue1) || 0;
      newStat.total = parseInt(newStatValue2) || 0;
    } else if (type === 'count') {
      newStat.count = parseInt(newStatValue1) || 0;
    } else if (type === 'score') {
      newStat.score = parseFloat(newStatValue1) || 0;
      if (shouldShowPer90(key) && minutesPlayed > 0) {
        newStat.per90 = ((newStat.score / minutesPlayed) * 90).toFixed(3);
      }
    }

    onStatsChange([...stats, newStat]);
    resetNewStatForm();
    setIsAddDialogOpen(false);
  };

  const handleUpdateStatType = (key: string, newType: StatInputMode) => {
    const updatedStats = stats.map(stat => {
      if (stat.key === key) {
        const updated: UnifiedStat = { 
          ...stat, 
          type: newType,
          // Reset values when type changes
          successful: undefined,
          total: undefined,
          count: undefined,
          score: undefined,
          per90: undefined,
        };
        
        // Convert existing values if possible
        if (newType === 'count') {
          if (stat.type === 'success_fail') {
            updated.count = stat.total || 0;
          } else if (stat.type === 'score') {
            updated.count = Math.round(stat.score || 0);
          }
        } else if (newType === 'success_fail') {
          updated.successful = 0;
          updated.total = stat.count || 0;
        } else if (newType === 'score') {
          updated.score = stat.count || 0;
          if (shouldShowPer90(key) && minutesPlayed > 0) {
            updated.per90 = ((updated.score / minutesPlayed) * 90).toFixed(3);
          }
        }
        
        return updated;
      }
      return stat;
    });
    onStatsChange(updatedStats);
  };

  const handleDeleteStat = (key: string) => {
    onStatsChange(stats.filter(s => s.key !== key));
  };

  const handleInlineEdit = (key: string, field: 'successful' | 'total' | 'count' | 'score', value: string) => {
    const updatedStats = stats.map(stat => {
      if (stat.key === key) {
        const updated = { ...stat };
        if (field === 'successful') updated.successful = parseInt(value) || 0;
        if (field === 'total') updated.total = parseInt(value) || 0;
        if (field === 'count') updated.count = parseInt(value) || 0;
        if (field === 'score') {
          updated.score = parseFloat(value) || 0;
          if (shouldShowPer90(key) && minutesPlayed > 0) {
            updated.per90 = ((updated.score / minutesPlayed) * 90).toFixed(3);
          }
        }
        return updated;
      }
      return stat;
    });
    onStatsChange(updatedStats);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Match Statistics</Label>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            resetNewStatForm();
            setEditingStatKey(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7">
              <Plus className="h-3 w-3 mr-1" />
              Add Stat
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Stat</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Select Stat</Label>
                <Select value={selectedStatKey} onValueChange={handleStatKeyChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a stat..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {successFailStats.length > 0 && (
                      <>
                        <SelectItem value="header-success" disabled className="font-semibold text-xs text-muted-foreground">
                          — Success/Fail Stats —
                        </SelectItem>
                        {successFailStats.map((config) => (
                          <SelectItem key={config.key} value={config.key}>{config.name}</SelectItem>
                        ))}
                      </>
                    )}
                    {countStats.length > 0 && (
                      <>
                        <SelectItem value="header-count" disabled className="font-semibold text-xs text-muted-foreground mt-2">
                          — Count Stats —
                        </SelectItem>
                        {countStats.map((config) => (
                          <SelectItem key={config.key} value={config.key}>{config.name}</SelectItem>
                        ))}
                      </>
                    )}
                    {scoreStats.length > 0 && (
                      <>
                        <SelectItem value="header-score" disabled className="font-semibold text-xs text-muted-foreground mt-2">
                          — Score Stats —
                        </SelectItem>
                        {scoreStats.map((config) => (
                          <SelectItem key={config.key} value={config.key}>
                            {config.name}
                            {config.description && <span className="text-muted-foreground ml-1">({config.description})</span>}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    <SelectItem value="custom" className="mt-2 font-medium">Custom...</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedStatKey === 'custom' && (
                <div className="space-y-3">
                  <div>
                    <Label>Custom Stat Name</Label>
                    <Input
                      value={customStatName}
                      onChange={(e) => setCustomStatName(e.target.value)}
                      placeholder="e.g. Progressive Runs"
                    />
                  </div>
                  <div>
                    <Label>Stat Type</Label>
                    <Select value={newStatType} onValueChange={(v) => setNewStatType(v as StatInputMode)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="success_fail">Success/Fail (e.g. 2/5)</SelectItem>
                        <SelectItem value="count">Count Only (e.g. 3)</SelectItem>
                        <SelectItem value="score">Score Value (e.g. 0.45)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {selectedStatKey && selectedStatKey !== 'custom' && (
                <div className="bg-accent/30 rounded-lg p-2">
                  <span className="text-xs text-muted-foreground">
                    Type: {STAT_TYPE_CONFIGS.find(c => c.key === selectedStatKey)?.mode === 'success_fail' 
                      ? 'Success/Fail' 
                      : STAT_TYPE_CONFIGS.find(c => c.key === selectedStatKey)?.mode === 'count'
                        ? 'Count'
                        : 'Score'}
                  </span>
                </div>
              )}

              {selectedStatKey && (
                <>
                  {(selectedStatKey === 'custom' ? newStatType : STAT_TYPE_CONFIGS.find(c => c.key === selectedStatKey)?.mode) === 'success_fail' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Successful</Label>
                        <Input
                          type="number"
                          value={newStatValue1}
                          onChange={(e) => setNewStatValue1(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label>Total</Label>
                        <Input
                          type="number"
                          value={newStatValue2}
                          onChange={(e) => setNewStatValue2(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  )}
                  {(selectedStatKey === 'custom' ? newStatType : STAT_TYPE_CONFIGS.find(c => c.key === selectedStatKey)?.mode) === 'count' && (
                    <div>
                      <Label>Count</Label>
                      <Input
                        type="number"
                        value={newStatValue1}
                        onChange={(e) => setNewStatValue1(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  )}
                  {(selectedStatKey === 'custom' ? newStatType : STAT_TYPE_CONFIGS.find(c => c.key === selectedStatKey)?.mode) === 'score' && (
                    <div>
                      <Label>Score Value</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newStatValue1}
                        onChange={(e) => setNewStatValue1(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleAddStat}
                disabled={!selectedStatKey || (selectedStatKey === 'custom' && !customStatName)}
              >
                Add Stat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {stats.length === 0 ? (
        <div className="text-center text-muted-foreground text-sm py-4 border rounded-lg bg-muted/20">
          No statistics recorded. Add stats manually or record them per action.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleStatDragEnd}>
          <SortableContext items={stats.map(s => s.key)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {stats.map((stat) => (
                <SortableStatCard key={stat.key} id={stat.key}>
                  <Card className="relative">
                    <CardContent className="p-3">
                      {/* Hide button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteStat(stat.key)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                        title="Hide from report"
                      >
                        <EyeOff className="h-3 w-3 text-muted-foreground" />
                      </button>

                      <div className="flex items-center gap-1 mb-2 pr-5 pl-4">
                        <Label className="text-xs font-semibold block truncate">{stat.displayName}</Label>
                        <Select value={stat.type} onValueChange={(v) => handleUpdateStatType(stat.key, v as StatInputMode)}>
                          <SelectTrigger className="h-5 w-5 p-0 border-0 opacity-0 group-hover:opacity-100 transition-opacity [&>svg]:h-3 [&>svg]:w-3">
                            <span className="sr-only">Change type</span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="success_fail">Success/Fail</SelectItem>
                            <SelectItem value="count">Count</SelectItem>
                            <SelectItem value="score">Score</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {stat.type === 'success_fail' && (
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Input type="number" value={stat.successful ?? 0} onChange={(e) => handleInlineEdit(stat.key, 'successful', e.target.value)} className="h-7 text-center text-sm w-14" />
                            <span className="text-muted-foreground">/</span>
                            <Input type="number" value={stat.total ?? 0} onChange={(e) => handleInlineEdit(stat.key, 'total', e.target.value)} className="h-7 text-center text-sm w-14" />
                          </div>
                          <div className="text-[10px] text-center text-muted-foreground">
                            {(stat.total ?? 0) > 0 ? (((stat.successful ?? 0) / (stat.total ?? 1)) * 100).toFixed(1) : '0.0'}% success
                          </div>
                        </div>
                      )}
                      
                      {stat.type === 'count' && (
                        <div className="text-center">
                          <Input type="number" value={stat.count ?? 0} onChange={(e) => handleInlineEdit(stat.key, 'count', e.target.value)} className="h-8 text-center text-lg font-bold w-full" />
                        </div>
                      )}
                      
                      {stat.type === 'score' && (
                        <div className="text-center">
                          <Input type="number" step="0.01" value={stat.score?.toFixed(2) ?? '0.00'} onChange={(e) => handleInlineEdit(stat.key, 'score', e.target.value)} className="h-8 text-center text-lg font-bold w-full" />
                          {stat.per90 && (
                            <div className="text-[10px] text-muted-foreground mt-1">p90: {stat.per90}</div>
                          )}
                        </div>
                      )}

                      {stat.isFromActions && (
                        <div className="text-[9px] text-muted-foreground mt-1 text-center">(from actions)</div>
                      )}
                    </CardContent>
                  </Card>
                </SortableStatCard>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Auto-Calculated Stats Section */}
      {stats.length > 0 && (
        <CalculatedStatsSection stats={stats} minutesPlayed={minutesPlayed} />
      )}
    </div>
  );
};

// Component to display auto-calculated stats
const CalculatedStatsSection = ({ stats, minutesPlayed }: { stats: UnifiedStat[], minutesPlayed: number }) => {
  const calculatedStats = CALCULATED_STATS
    .map(def => {
      const value = def.calculate(stats);
      if (value === null) return null;
      return {
        key: def.key,
        displayName: def.displayName,
        value,
        description: def.description
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  if (calculatedStats.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t">
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="h-4 w-4 text-primary" />
        <Label className="text-sm font-semibold text-primary">Auto-Calculated Ratios</Label>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {calculatedStats.map(stat => (
          <Card key={stat.key} className="bg-primary/5 border-primary/20">
            <CardContent className="p-3 text-center">
              <Label className="text-xs font-semibold block truncate mb-1" title={stat.description}>
                {stat.displayName}
              </Label>
              <div className="text-lg font-bold text-primary">
                {stat.key.includes('pct') || stat.key.includes('completion') || stat.key.includes('success')
                  ? `${stat.value.toFixed(1)}%`
                  : stat.value.toFixed(2)}
              </div>
              <div className="text-[9px] text-muted-foreground mt-1">
                {stat.description}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Helper to find config by key (case-insensitive with fallbacks)
const findStatConfig = (key: string): StatTypeConfig | undefined => {
  // Try exact match first
  let config = STAT_TYPE_CONFIGS.find(c => c.key === key);
  if (config) return config;
  
  // Try lowercase match
  const keyLower = key.toLowerCase();
  config = STAT_TYPE_CONFIGS.find(c => c.key.toLowerCase() === keyLower);
  if (config) return config;
  
  // Try normalized key (replace special chars, lowercase)
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '_');
  config = STAT_TYPE_CONFIGS.find(c => 
    c.key.toLowerCase().replace(/[^a-z0-9]/g, '_') === normalizedKey
  );
  return config;
};

// Helper to merge action-recorded stats with manual stats
export const mergeStatsForEditor = (
  actionRecordedStats: Record<string, AggregatedStat>,
  manualStats: Record<string, any>,
  minutesPlayed: number
): UnifiedStat[] => {
  const result: UnifiedStat[] = [];
  const processedKeys = new Set<string>();

  // First, add action-recorded stats
  Object.entries(actionRecordedStats).forEach(([statType, stat]) => {
    // Try to find matching config for proper key
    const config = STAT_TYPE_CONFIGS.find(c => 
      c.name.toLowerCase() === statType.toLowerCase() ||
      c.key === statType.toLowerCase().replace(/\s+/g, '_')
    );
    
    const key = config?.key || statType.toLowerCase().replace(/\s+/g, '_');
    const displayName = config?.name || statType;
    
    processedKeys.add(key);
    
    const unified: UnifiedStat = {
      key,
      displayName,
      type: stat.type,
      isFromActions: true,
    };

    if (stat.type === 'success_fail') {
      unified.successful = stat.successful;
      unified.total = stat.total;
    } else if (stat.type === 'count') {
      unified.count = stat.count;
    } else if (stat.type === 'score') {
      unified.score = stat.totalScore;
      if (shouldShowPer90(key) && minutesPlayed > 0) {
        unified.per90 = ((stat.totalScore / minutesPlayed) * 90).toFixed(3);
      }
    }

    result.push(unified);
  });

  // Then add manual stats that weren't already added from actions
  // Handle paired stats (successful/total)
  const manualKeys = Object.keys(manualStats).filter(k => 
    k !== 'stats_order' && 
    !k.endsWith('_per90') &&
    typeof manualStats[k] === 'number'
  );

  const pairedStats = new Map<string, { successful?: number; total?: number }>();

  manualKeys.forEach(key => {
    if (key.endsWith('_successful')) {
      const baseKey = key.replace('_successful', '');
      if (!pairedStats.has(baseKey)) pairedStats.set(baseKey, {});
      pairedStats.get(baseKey)!.successful = manualStats[key];
    } else if (key.endsWith('_total')) {
      const baseKey = key.replace('_total', '');
      if (!pairedStats.has(baseKey)) pairedStats.set(baseKey, {});
      pairedStats.get(baseKey)!.total = manualStats[key];
    }
  });

  // Add paired stats
  pairedStats.forEach((values, baseKey) => {
    if (processedKeys.has(baseKey)) return;
    processedKeys.add(baseKey);
    processedKeys.add(`${baseKey}_successful`);
    processedKeys.add(`${baseKey}_total`);

    // Try to find matching config for display name (case-insensitive)
    const config = findStatConfig(baseKey);
    const displayName = config?.name || baseKey
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    result.push({
      key: config?.key || baseKey,
      displayName,
      type: 'success_fail',
      successful: values.successful ?? 0,
      total: values.total ?? 0,
      isFromActions: false,
    });
  });

  // Add remaining single stats
  manualKeys.forEach(key => {
    if (processedKeys.has(key)) return;
    if (key.endsWith('_successful') || key.endsWith('_total')) return;

    processedKeys.add(key);
    const value = manualStats[key];
    
    // Try to find matching config (case-insensitive)
    const config = findStatConfig(key);
    const displayName = config?.name || key
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    // Use config key if available for consistency
    const statKey = config?.key || key;

    // Determine type based on config or key patterns
    const isScoreType = config?.mode === 'score' || shouldShowPer90(statKey);
    
    if (isScoreType) {
      result.push({
        key: statKey,
        displayName,
        type: 'score',
        score: value,
        per90: minutesPlayed > 0 ? ((value / minutesPlayed) * 90).toFixed(3) : undefined,
        isFromActions: false,
      });
    } else {
      // Use config mode if available
      const type = config?.mode || 'count';
      if (type === 'success_fail') {
        result.push({
          key: statKey,
          displayName,
          type: 'success_fail',
          successful: value,
          total: value,
          isFromActions: false,
        });
      } else {
        result.push({
          key: statKey,
          displayName,
          type: 'count',
          count: value,
          isFromActions: false,
        });
      }
    }
  });

  return result;
};

// Helper to convert unified stats back to striker_stats format for saving
export const unifiedStatsToStrikerStats = (stats: UnifiedStat[]): Record<string, any> => {
  const result: Record<string, any> = {};
  
  stats.forEach(stat => {
    if (stat.type === 'success_fail') {
      result[`${stat.key}_successful`] = stat.successful ?? 0;
      result[`${stat.key}_total`] = stat.total ?? 0;
    } else if (stat.type === 'count') {
      result[stat.key] = stat.count ?? 0;
    } else if (stat.type === 'score') {
      result[stat.key] = stat.score ?? 0;
      if (stat.per90) {
        result[`${stat.key}_per90`] = parseFloat(stat.per90);
      }
    }
  });

  // Add stats_order
  result.stats_order = stats.map(s => s.key);

  return result;
};
