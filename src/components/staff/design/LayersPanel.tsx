import { Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, Trash2, Copy, Image as ImageIcon, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useCallback } from 'react';
import type { DesignElement } from './types';

interface LayersPanelProps {
  elements: DesignElement[];
  selectedIds: string[];
  onSelect: (id: string, multi: boolean) => void;
  onUpdate: (id: string, updates: Partial<DesignElement>) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

export function LayersPanel({ elements, selectedIds, onSelect, onUpdate, onMoveLayer, onDelete, onDuplicate, onReorder }: LayersPanelProps) {
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  // Separate background elements from regular elements
  const backgroundElements = elements.filter(el => el.isBackground);
  const regularElements = elements.filter(el => !el.isBackground);

  // Render in reverse so top layer is first
  const reversedRegular = [...regularElements].reverse();
  const reversedBg = [...backgroundElements].reverse();

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(id);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId || !onReorder) return;
    const fromIndex = elements.findIndex(el => el.id === dragId);
    const toIndex = elements.findIndex(el => el.id === targetId);
    if (fromIndex !== -1 && toIndex !== -1) {
      onReorder(fromIndex, toIndex);
    }
    setDragId(null);
    setDragOverId(null);
  }, [dragId, elements, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDragOverId(null);
  }, []);

  const typeLabel = (el: DesignElement) => {
    if (el.isBackground) return 'BG';
    switch (el.type) {
      case 'text': return 'T';
      case 'image': return 'IMG';
      case 'shape': return el.shapeType?.charAt(0).toUpperCase() || 'S';
      case 'line': return '—';
      default: return '?';
    }
  };

  const typeColor = (el: DesignElement) => {
    if (el.isBackground) return 'bg-emerald-500/20 text-emerald-400';
    switch (el.type) {
      case 'text': return 'bg-blue-500/20 text-blue-400';
      case 'image': return 'bg-purple-500/20 text-purple-400';
      case 'shape': return 'bg-orange-500/20 text-orange-400';
      case 'line': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const renderLayer = (el: DesignElement, isBg: boolean) => {
    const isSelected = selectedIds.includes(el.id);
    const isDragTarget = dragOverId === el.id && dragId !== el.id;
    return (
      <div
        key={el.id}
        draggable={!isBg}
        onDragStart={(e) => handleDragStart(e, el.id)}
        onDragOver={(e) => handleDragOver(e, el.id)}
        onDrop={(e) => handleDrop(e, el.id)}
        onDragEnd={handleDragEnd}
        onClick={(e) => onSelect(el.id, e.shiftKey)}
        className={`flex items-center gap-1.5 px-2 py-2 cursor-pointer text-xs transition-all ${
          isSelected
            ? 'bg-primary/15 border-l-[3px] border-l-primary'
            : isDragTarget
              ? 'bg-accent/20 border-l-[3px] border-l-accent'
              : 'hover:bg-muted/50 border-l-[3px] border-l-transparent'
        }`}
      >
        {!isBg && (
          <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0 cursor-grab" />
        )}
        <div className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0 ${typeColor(el)}`}>
          {typeLabel(el)}
        </div>
        <span className={`flex-1 truncate font-medium ${!el.visible ? 'text-muted-foreground line-through' : ''}`}>
          {el.name}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={e => { e.stopPropagation(); onUpdate(el.id, { visible: !el.visible }); }} className="hover:text-primary p-0.5">
            {el.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
          </button>
          <button onClick={e => { e.stopPropagation(); onUpdate(el.id, { locked: !el.locked }); }} className="hover:text-primary p-0.5">
            {el.locked ? <Lock className="h-3 w-3 text-amber-500" /> : <Unlock className="h-3 w-3 text-muted-foreground/50" />}
          </button>
        </div>
        {isSelected && !isBg && (
          <div className="flex gap-0.5 shrink-0">
            <button onClick={e => { e.stopPropagation(); onMoveLayer(el.id, 'up'); }} className="hover:text-primary p-0.5"><ChevronUp className="h-3 w-3" /></button>
            <button onClick={e => { e.stopPropagation(); onMoveLayer(el.id, 'down'); }} className="hover:text-primary p-0.5"><ChevronDown className="h-3 w-3" /></button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Layers</h3>
        <div className="flex gap-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDuplicate} disabled={selectedIds.length === 0} title="Duplicate">
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDelete} disabled={selectedIds.length === 0} title="Delete">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Regular elements */}
        {reversedRegular.length > 0 && (
          <div>
            <div className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b">
              Elements ({reversedRegular.length})
            </div>
            {reversedRegular.map(el => renderLayer(el, false))}
          </div>
        )}

        {/* Background section */}
        <div className="border-t">
          <div className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            Backgrounds ({reversedBg.length})
          </div>
          {reversedBg.map(el => renderLayer(el, true))}
          {reversedBg.length === 0 && (
            <div className="px-3 py-2 text-[10px] text-muted-foreground/50">
              Mark any element as background via properties
            </div>
          )}
        </div>

        {elements.length === 0 && (
          <div className="p-4 text-center text-xs text-muted-foreground">No layers yet. Add elements to get started.</div>
        )}
      </div>
    </div>
  );
}
