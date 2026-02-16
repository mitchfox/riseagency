import { Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DesignElement } from './types';

interface LayersPanelProps {
  elements: DesignElement[];
  selectedIds: string[];
  onSelect: (id: string, multi: boolean) => void;
  onUpdate: (id: string, updates: Partial<DesignElement>) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function LayersPanel({ elements, selectedIds, onSelect, onUpdate, onMoveLayer, onDelete, onDuplicate }: LayersPanelProps) {
  // Render in reverse so top layer is first
  const reversedElements = [...elements].reverse();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Layers</h3>
        <div className="flex gap-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDuplicate} disabled={selectedIds.length === 0}>
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDelete} disabled={selectedIds.length === 0}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {reversedElements.map(el => {
          const isSelected = selectedIds.includes(el.id);
          return (
            <div
              key={el.id}
              onClick={(e) => onSelect(el.id, e.shiftKey)}
              className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer text-xs border-b border-border/50 transition-colors ${
                isSelected ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-muted/50'
              }`}
            >
              <button onClick={e => { e.stopPropagation(); onUpdate(el.id, { visible: !el.visible }); }} className="shrink-0 hover:text-primary">
                {el.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
              </button>
              <span className={`flex-1 truncate ${!el.visible ? 'text-muted-foreground line-through' : ''}`}>{el.name}</span>
              <button onClick={e => { e.stopPropagation(); onUpdate(el.id, { locked: !el.locked }); }} className="shrink-0 hover:text-primary">
                {el.locked ? <Lock className="h-3 w-3 text-amber-500" /> : <Unlock className="h-3 w-3 text-muted-foreground" />}
              </button>
              {isSelected && (
                <div className="flex gap-0.5 shrink-0">
                  <button onClick={e => { e.stopPropagation(); onMoveLayer(el.id, 'up'); }} className="hover:text-primary"><ChevronUp className="h-3 w-3" /></button>
                  <button onClick={e => { e.stopPropagation(); onMoveLayer(el.id, 'down'); }} className="hover:text-primary"><ChevronDown className="h-3 w-3" /></button>
                </div>
              )}
            </div>
          );
        })}
        {elements.length === 0 && (
          <div className="p-4 text-center text-xs text-muted-foreground">No layers yet. Add elements to get started.</div>
        )}
      </div>
    </div>
  );
}
