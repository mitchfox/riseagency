import { useState, useEffect, type ReactNode } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GripVertical } from 'lucide-react';

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
  columnOrder?: string[];
  onReorderColumns?: (newOrder: string[]) => void;
  viewMode?: 'table' | 'cards';
  onViewModeChange?: (mode: 'table' | 'cards') => void;
  showViewToggle?: boolean;
  filters?: ReactNode;
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

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`col-order-${storageKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge any new columns not in saved order
        const allKeys = columns.map(c => c.key);
        const merged = [...parsed.filter((k: string) => allKeys.includes(k))];
        allKeys.forEach(k => { if (!merged.includes(k)) merged.push(k); });
        return merged;
      }
    } catch {}
    return columns.map(c => c.key);
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
    localStorage.setItem(`col-order-${storageKey}`, JSON.stringify(columnOrder));
  }, [columnOrder, storageKey]);

  useEffect(() => {
    localStorage.setItem(`view-mode-${storageKey}`, viewMode);
  }, [viewMode, storageKey]);

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isVisible = (key: string) => visibleColumns[key] !== false;

  const moveColumn = (fromIndex: number, toIndex: number) => {
    setColumnOrder(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  };

  const getOrderedColumns = (cols: ColumnConfig[]): ColumnConfig[] => {
    return columnOrder
      .map(key => cols.find(c => c.key === key))
      .filter((c): c is ColumnConfig => !!c);
  };

  return { visibleColumns, toggleColumn, isVisible, viewMode, setViewMode, columnOrder, setColumnOrder, moveColumn, getOrderedColumns };
};

export const TableSettingsPopover = ({
  columns,
  visibleColumns,
  onToggleColumn,
  columnOrder,
  onReorderColumns,
  viewMode,
  onViewModeChange,
  showViewToggle = true,
  filters,
}: Props) => {
  const orderedColumns = columnOrder
    ? columnOrder.map(key => columns.find(c => c.key === key)).filter((c): c is ColumnConfig => !!c)
    : columns;

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index || !onReorderColumns || !columnOrder) return;
    const updated = [...columnOrder];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, moved);
    onReorderColumns(updated);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Settings className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] sm:max-w-[540px]">
        <SheetHeader>
          <SheetTitle>Table Settings</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)] mt-4">
          <div className="space-y-4 pr-4">
            {showViewToggle && onViewModeChange && (
              <>
                <div>
                  <p className="text-sm font-medium mb-2">View Mode</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewModeChange('table')}
                      className={`text-sm px-3 py-1.5 border rounded-md ${viewMode === 'table' ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}
                    >
                      Table
                    </button>
                    <button
                      onClick={() => onViewModeChange('cards')}
                      className={`text-sm px-3 py-1.5 border rounded-md ${viewMode === 'cards' ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}
                    >
                      Cards
                    </button>
                  </div>
                </div>
                <Separator />
              </>
            )}

            <div className="space-y-3">
              <p className="text-sm font-medium">Visible Columns</p>
              <p className="text-xs text-muted-foreground">Toggle columns on/off. Drag to reorder.</p>
              <div className="space-y-1">
                {orderedColumns.map((col, index) => (
                  <div
                    key={col.key}
                    draggable={!!onReorderColumns}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center justify-between p-2 rounded-md border ${
                      dragIndex === index ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50'
                    } ${onReorderColumns ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      {onReorderColumns && (
                        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <Label className="text-sm cursor-pointer">{col.label}</Label>
                    </div>
                    <Switch
                      checked={visibleColumns[col.key] !== false}
                      onCheckedChange={() => onToggleColumn(col.key)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {filters && (
              <>
                <Separator />
                {filters}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
