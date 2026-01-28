import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { ClipboardList, Check, X } from 'lucide-react';

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
];

export interface RecordedStat {
  stat_type: string;
  is_successful: boolean;
}

interface ActionStatRecorderProps {
  currentStat: RecordedStat | null;
  onStatRecorded: (stat: RecordedStat | null) => void;
  disabled?: boolean;
}

export const ActionStatRecorder = ({
  currentStat,
  onStatRecorded,
  disabled = false,
}: ActionStatRecorderProps) => {
  const [open, setOpen] = useState(false);
  const [statType, setStatType] = useState(currentStat?.stat_type || '');
  const [isSuccessful, setIsSuccessful] = useState(currentStat?.is_successful ?? true);
  const [customType, setCustomType] = useState('');

  const handleSave = () => {
    const finalStatType = statType === 'custom' ? customType : statType;
    if (finalStatType) {
      onStatRecorded({ stat_type: finalStatType, is_successful: isSuccessful });
    }
    setOpen(false);
  };

  const handleClear = () => {
    onStatRecorded(null);
    setStatType('');
    setCustomType('');
    setIsSuccessful(true);
    setOpen(false);
  };

  const hasRecordedStat = currentStat !== null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${hasRecordedStat ? 'bg-primary/10' : ''}`}
          disabled={disabled}
          title={hasRecordedStat 
            ? `${currentStat.stat_type}: ${currentStat.is_successful ? '✓' : '✗'}` 
            : 'Record Stat'
          }
        >
          {hasRecordedStat ? (
            currentStat.is_successful ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <X className="h-4 w-4 text-red-500" />
            )
          ) : (
            <ClipboardList className="h-4 w-4 text-primary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 z-[100]" align="start">
        <div className="space-y-4">
          <div className="font-semibold text-sm">Record Stat</div>
          
          <div className="space-y-2">
            <Label className="text-xs">Stat Type</Label>
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

          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={!statType || (statType === 'custom' && !customType)}
              className="flex-1"
            >
              Save
            </Button>
            {hasRecordedStat && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleClear}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Helper function to aggregate stats from actions
export const aggregateRecordedStats = (
  actions: Array<{ recorded_stat?: RecordedStat | null }>
): Record<string, { successful: number; total: number }> => {
  const stats: Record<string, { successful: number; total: number }> = {};
  
  for (const action of actions) {
    if (action.recorded_stat?.stat_type) {
      const type = action.recorded_stat.stat_type;
      if (!stats[type]) {
        stats[type] = { successful: 0, total: 0 };
      }
      stats[type].total += 1;
      if (action.recorded_stat.is_successful) {
        stats[type].successful += 1;
      }
    }
  }
  
  return stats;
};
