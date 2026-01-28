import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Check, X, Plus, Trash2 } from 'lucide-react';

const STAT_TYPES = [
  'Dribble',
  'Pass',
  'Shot',
  'Tackle',
  'Aerial Duel',
  'Cross',
  'Through Ball',
  'Long Ball',
  'Interception',
  'Clearance',
  'Block',
  'Key Pass',
  'Chance Created',
  'Take-On',
  'Press',
  'Recovery',
  'Touch in Box',
  'Foul Won',
  'Foul Committed',
];

export interface RecordedStat {
  stat_type: string;
  is_successful: boolean;
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
  const [customType, setCustomType] = useState('');

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

  const handleAddStat = () => {
    const finalStatType = statType === 'custom' ? customType : statType;
    if (finalStatType) {
      const newStat: RecordedStat = { stat_type: finalStatType, is_successful: isSuccessful };
      const newStats = [...stats, newStat];
      setStats(newStats);
      onStatRecorded(newStats);
      // Reset form for next stat
      setStatType('');
      setCustomType('');
      setIsSuccessful(true);
    }
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
    setOpen(false);
  };

  const hasRecordedStats = stats.length > 0;
  const successCount = stats.filter(s => s.is_successful).length;
  const failCount = stats.length - successCount;

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
                    variant={stat.is_successful ? "default" : "destructive"}
                    className="flex items-center gap-1 pr-1"
                  >
                    {stat.is_successful ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                    <span>{stat.stat_type}</span>
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
                <SelectContent>
                  {STAT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                  <SelectItem value="custom">Custom...</SelectItem>
                </SelectContent>
              </Select>
              {statType === 'custom' && (
                <Input
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder="Enter custom stat type"
                  className="h-8 text-sm"
                />
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Outcome</Label>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${!isSuccessful ? 'font-semibold text-red-500' : 'text-muted-foreground'}`}>
                  Unsuccessful
                </span>
                <Switch
                  checked={isSuccessful}
                  onCheckedChange={setIsSuccessful}
                />
                <span className={`text-xs ${isSuccessful ? 'font-semibold text-green-600' : 'text-muted-foreground'}`}>
                  Successful
                </span>
              </div>
            </div>

            <Button 
              size="sm" 
              onClick={handleAddStat}
              disabled={!statType || (statType === 'custom' && !customType)}
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

// Helper function to aggregate stats from actions (supports both single and array formats)
export const aggregateRecordedStats = (
  actions: Array<{ recorded_stat?: RecordedStat | RecordedStat[] | null }>
): Record<string, { successful: number; total: number }> => {
  const stats: Record<string, { successful: number; total: number }> = {};
  
  for (const action of actions) {
    if (!action.recorded_stat) continue;
    
    // Normalize to array
    const recordedStats: RecordedStat[] = Array.isArray(action.recorded_stat) 
      ? action.recorded_stat 
      : [action.recorded_stat];
    
    for (const stat of recordedStats) {
      if (stat?.stat_type) {
        const type = stat.stat_type;
        if (!stats[type]) {
          stats[type] = { successful: 0, total: 0 };
        }
        stats[type].total += 1;
        if (stat.is_successful) {
          stats[type].successful += 1;
        }
      }
    }
  }
  
  return stats;
};
