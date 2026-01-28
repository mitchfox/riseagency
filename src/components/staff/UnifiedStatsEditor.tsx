import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Edit2, X } from 'lucide-react';
import { 
  AggregatedStat, 
  AggregatedSuccessFailStat, 
  AggregatedCountStat, 
  AggregatedScoreStat,
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
}

interface UnifiedStatsEditorProps {
  stats: UnifiedStat[];
  onStatsChange: (stats: UnifiedStat[]) => void;
  minutesPlayed: number;
}

// Stat types that should show per90
const PER90_STAT_KEYS = ['xg', 'xa', 'xgchain', 'xc', 'xgc'];

const shouldShowPer90 = (key: string): boolean => {
  const keyLower = key.toLowerCase();
  return PER90_STAT_KEYS.some(p => keyLower.includes(p));
};

export const UnifiedStatsEditor = ({
  stats,
  onStatsChange,
  minutesPlayed,
}: UnifiedStatsEditorProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStatKey, setEditingStatKey] = useState<string | null>(null);
  
  // New stat form state
  const [newStatName, setNewStatName] = useState('');
  const [newStatType, setNewStatType] = useState<StatInputMode>('count');
  const [newStatValue1, setNewStatValue1] = useState(''); // successful or count or score
  const [newStatValue2, setNewStatValue2] = useState(''); // total (for success_fail)

  const resetNewStatForm = () => {
    setNewStatName('');
    setNewStatType('count');
    setNewStatValue1('');
    setNewStatValue2('');
  };

  const handleAddStat = () => {
    if (!newStatName) return;

    const key = newStatName.toLowerCase().replace(/\s+/g, '_');
    
    // Check if stat already exists
    if (stats.find(s => s.key === key)) {
      // Update existing stat instead
      handleUpdateStat(key);
      return;
    }

    const newStat: UnifiedStat = {
      key,
      displayName: newStatName,
      type: newStatType,
      isFromActions: false,
    };

    if (newStatType === 'success_fail') {
      newStat.successful = parseInt(newStatValue1) || 0;
      newStat.total = parseInt(newStatValue2) || 0;
    } else if (newStatType === 'count') {
      newStat.count = parseInt(newStatValue1) || 0;
    } else if (newStatType === 'score') {
      newStat.score = parseFloat(newStatValue1) || 0;
      if (shouldShowPer90(key) && minutesPlayed > 0) {
        newStat.per90 = ((newStat.score / minutesPlayed) * 90).toFixed(3);
      }
    }

    onStatsChange([...stats, newStat]);
    resetNewStatForm();
    setIsAddDialogOpen(false);
  };

  const handleUpdateStat = (key: string) => {
    const updatedStats = stats.map(stat => {
      if (stat.key === key) {
        const updated = { ...stat };
        if (stat.type === 'success_fail') {
          updated.successful = parseInt(newStatValue1) || 0;
          updated.total = parseInt(newStatValue2) || 0;
        } else if (stat.type === 'count') {
          updated.count = parseInt(newStatValue1) || 0;
        } else if (stat.type === 'score') {
          updated.score = parseFloat(newStatValue1) || 0;
          if (shouldShowPer90(key) && minutesPlayed > 0) {
            updated.per90 = ((updated.score / minutesPlayed) * 90).toFixed(3);
          }
        }
        return updated;
      }
      return stat;
    });
    onStatsChange(updatedStats);
    setEditingStatKey(null);
    resetNewStatForm();
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

  const openEditDialog = (stat: UnifiedStat) => {
    setEditingStatKey(stat.key);
    setNewStatName(stat.displayName);
    setNewStatType(stat.type);
    if (stat.type === 'success_fail') {
      setNewStatValue1(String(stat.successful || 0));
      setNewStatValue2(String(stat.total || 0));
    } else if (stat.type === 'count') {
      setNewStatValue1(String(stat.count || 0));
    } else if (stat.type === 'score') {
      setNewStatValue1(String(stat.score || 0));
    }
    setIsAddDialogOpen(true);
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
              <DialogTitle>{editingStatKey ? 'Edit Stat' : 'Add New Stat'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Stat Name</Label>
                <Input
                  value={newStatName}
                  onChange={(e) => setNewStatName(e.target.value)}
                  placeholder="e.g. Dribbles, xG, Turnovers"
                  disabled={!!editingStatKey}
                />
              </div>
              <div>
                <Label>Stat Type</Label>
                <Select 
                  value={newStatType} 
                  onValueChange={(v) => setNewStatType(v as StatInputMode)}
                  disabled={!!editingStatKey}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="success_fail">Success/Fail (e.g. Dribbles 2/5)</SelectItem>
                    <SelectItem value="count">Count Only (e.g. Turnovers, Goals)</SelectItem>
                    <SelectItem value="score">Score Value (e.g. xG 0.45)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newStatType === 'success_fail' && (
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
              {newStatType === 'count' && (
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
              {newStatType === 'score' && (
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={editingStatKey ? () => handleUpdateStat(editingStatKey) : handleAddStat}>
                {editingStatKey ? 'Update' : 'Add Stat'}
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <Card key={stat.key} className="relative group">
              <CardContent className="p-3">
                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleDeleteStat(stat.key)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                  title="Remove stat"
                >
                  <X className="h-3 w-3 text-destructive" />
                </button>

                <Label className="text-xs font-semibold block mb-2 pr-5">{stat.displayName}</Label>
                
                {stat.type === 'success_fail' && (
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Input
                        type="number"
                        value={stat.successful ?? 0}
                        onChange={(e) => handleInlineEdit(stat.key, 'successful', e.target.value)}
                        className="h-7 text-center text-sm w-14"
                      />
                      <span className="text-muted-foreground">/</span>
                      <Input
                        type="number"
                        value={stat.total ?? 0}
                        onChange={(e) => handleInlineEdit(stat.key, 'total', e.target.value)}
                        className="h-7 text-center text-sm w-14"
                      />
                    </div>
                    <div className="text-[10px] text-center text-muted-foreground">
                      {(stat.total ?? 0) > 0 
                        ? (((stat.successful ?? 0) / (stat.total ?? 1)) * 100).toFixed(1) 
                        : '0.0'}% success
                    </div>
                  </div>
                )}
                
                {stat.type === 'count' && (
                  <div className="text-center">
                    <Input
                      type="number"
                      value={stat.count ?? 0}
                      onChange={(e) => handleInlineEdit(stat.key, 'count', e.target.value)}
                      className="h-8 text-center text-lg font-bold w-full"
                    />
                  </div>
                )}
                
                {stat.type === 'score' && (
                  <div className="text-center">
                    <Input
                      type="number"
                      step="0.01"
                      value={stat.score?.toFixed(2) ?? '0.00'}
                      onChange={(e) => handleInlineEdit(stat.key, 'score', e.target.value)}
                      className="h-8 text-center text-lg font-bold w-full"
                    />
                    {stat.per90 && (
                      <div className="text-[10px] text-muted-foreground mt-1">
                        p90: {stat.per90}
                      </div>
                    )}
                  </div>
                )}

                {stat.isFromActions && (
                  <div className="text-[9px] text-muted-foreground mt-1 text-center">
                    (from actions)
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
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
    const key = statType.toLowerCase().replace(/\s+/g, '_');
    processedKeys.add(key);
    
    const unified: UnifiedStat = {
      key,
      displayName: statType,
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

    const displayName = baseKey
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    result.push({
      key: baseKey,
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
    
    const displayName = key
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    // Determine type based on key patterns
    const isScoreType = shouldShowPer90(key);
    
    if (isScoreType) {
      result.push({
        key,
        displayName,
        type: 'score',
        score: value,
        per90: minutesPlayed > 0 ? ((value / minutesPlayed) * 90).toFixed(3) : undefined,
        isFromActions: false,
      });
    } else {
      result.push({
        key,
        displayName,
        type: 'count',
        count: value,
        isFromActions: false,
      });
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
