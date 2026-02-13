import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export interface ColumnConfig {
  key: string;
  label: string;
  defaultVisible?: boolean;
}

interface Props {
  storageKey: string;
  columns: ColumnConfig[];
  visibleColumns: Record<string, boolean>;
  onToggleColumn: (key: string) => void;
  viewMode?: 'table' | 'cards';
  onViewModeChange?: (mode: 'table' | 'cards') => void;
  showViewToggle?: boolean;
}

export const useTableSettings = (storageKey: string, columns: ColumnConfig[]) => {
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`table-settings-${storageKey}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    const defaults: Record<string, boolean> = {};
    columns.forEach(col => { defaults[col.key] = col.defaultVisible !== false; });
    return defaults;
  });

  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() => {
    try {
      return (localStorage.getItem(`view-mode-${storageKey}`) as 'table' | 'cards') || 'table';
    } catch {
      return 'table';
    }
  });

  useEffect(() => {
    localStorage.setItem(`table-settings-${storageKey}`, JSON.stringify(visibleColumns));
  }, [visibleColumns, storageKey]);

  useEffect(() => {
    localStorage.setItem(`view-mode-${storageKey}`, viewMode);
  }, [viewMode, storageKey]);

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isVisible = (key: string) => visibleColumns[key] !== false;

  return { visibleColumns, toggleColumn, isVisible, viewMode, setViewMode };
};

export const TableSettingsPopover = ({
  columns,
  visibleColumns,
  onToggleColumn,
  viewMode,
  onViewModeChange,
  showViewToggle = true,
}: Props) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="end">
        <div className="space-y-3">
          <p className="text-sm font-medium">Table Settings</p>

          {showViewToggle && onViewModeChange && (
            <>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onViewModeChange('table')}
                  className={`text-xs px-2 py-1 border rounded ${viewMode === 'table' ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}
                >
                  Table
                </button>
                <button
                  onClick={() => onViewModeChange('cards')}
                  className={`text-xs px-2 py-1 border rounded ${viewMode === 'cards' ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}
                >
                  Cards
                </button>
              </div>
              <Separator />
            </>
          )}

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Visible Columns</p>
            {columns.map(col => (
              <div key={col.key} className="flex items-center justify-between">
                <Label className="text-xs">{col.label}</Label>
                <Switch
                  checked={visibleColumns[col.key] !== false}
                  onCheckedChange={() => onToggleColumn(col.key)}
                />
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
