import { Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown, Trash2, Copy, Image as ImageIcon, GripVertical, ArrowUp, ArrowDown, ArrowUpToLine, ArrowDownToLine, AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useCallback, useMemo } from 'react';
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
  onAlign?: (id: string, alignment: 'top' | 'middle' | 'bottom' | 'left' | 'centre' | 'right') => void;
  canvasWidth?: number;
  canvasHeight?: number;
}

type TabType = 'arrange' | 'layers';
type LayerFilter = 'all' | 'overlapping';

export function LayersPanel({ elements, selectedIds, onSelect, onUpdate, onMoveLayer, onDelete, onDuplicate, onReorder, onAlign, canvasWidth, canvasHeight }: LayersPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('arrange');
  const [layerFilter, setLayerFilter] = useState<LayerFilter>('all');
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const selectedElement = elements.find(el => selectedIds.includes(el.id));

  // Find overlapping elements (elements whose bounding boxes intersect with the selected element)
  const overlappingElements = useMemo(() => {
    if (!selectedElement) return [];
    const sel = selectedElement;
    return elements.filter(el => {
      if (el.id === sel.id) return false;
      const overlapX = el.x < sel.x + sel.width && el.x + el.width > sel.x;
      const overlapY = el.y < sel.y + sel.height && el.y + el.height > sel.y;
      return overlapX && overlapY;
    });
  }, [elements, selectedElement]);

  const displayElements = useMemo(() => {
    if (layerFilter === 'overlapping' && selectedElement) {
      return [selectedElement, ...overlappingElements];
    }
    return elements;
  }, [elements, layerFilter, selectedElement, overlappingElements]);

  const reversedElements = [...displayElements].reverse();

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
    if (fromIndex !== -1 && toIndex !== -1) onReorder(fromIndex, toIndex);
    setDragId(null);
    setDragOverId(null);
  }, [dragId, elements, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDragOverId(null);
  }, []);

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

  // Mini preview of element
  const renderPreview = (el: DesignElement) => {
    const previewSize = 48;
    const scale = Math.min(previewSize / el.width, previewSize / el.height, 1);
    const w = el.width * scale;
    const h = el.height * scale;

    return (
      <div className="w-12 h-12 rounded border border-border/50 bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
        {el.type === 'image' && el.src ? (
          <img src={el.src} alt="" className="max-w-full max-h-full object-contain" draggable={false} />
        ) : el.type === 'text' ? (
          <div
            className="text-center overflow-hidden"
            style={{
              fontSize: Math.max(6, (el.fontSize || 16) * scale * 0.4),
              fontFamily: el.fontFamily,
              fontWeight: el.fontWeight,
              color: el.color || '#000',
              maxWidth: w,
              maxHeight: h,
              lineHeight: 1.1,
            }}
          >
            {el.text}
          </div>
        ) : el.type === 'shape' ? (
          <div
            style={{
              width: w * 0.7,
              height: h * 0.7,
              backgroundColor: el.fill || '#3b82f6',
              borderRadius: el.shapeType === 'circle' ? '50%' : el.borderRadius ? `${el.borderRadius * scale}px` : '2px',
            }}
          />
        ) : el.type === 'line' ? (
          <div style={{ width: w * 0.8, height: Math.max(2, (el.strokeWidth || 2) * scale), backgroundColor: el.fill || '#000' }} />
        ) : null}
      </div>
    );
  };

  const renderLayer = (el: DesignElement) => {
    const isSelected = selectedIds.includes(el.id);
    const isDragTarget = dragOverId === el.id && dragId !== el.id;
    return (
      <div
        key={el.id}
        draggable
        onDragStart={(e) => handleDragStart(e, el.id)}
        onDragOver={(e) => handleDragOver(e, el.id)}
        onDrop={(e) => handleDrop(e, el.id)}
        onDragEnd={handleDragEnd}
        onClick={(e) => onSelect(el.id, e.shiftKey)}
        className={`flex items-center gap-2 px-2 py-2 cursor-pointer text-xs transition-all ${
          isSelected
            ? 'bg-primary/15 border-l-[3px] border-l-primary'
            : isDragTarget
              ? 'bg-accent/20 border-l-[3px] border-l-accent'
              : 'hover:bg-muted/50 border-l-[3px] border-l-transparent'
        }`}
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 cursor-grab" />
        {renderPreview(el)}
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
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Position</h3>
        <div className="flex gap-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDuplicate} disabled={selectedIds.length === 0} title="Duplicate">
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDelete} disabled={selectedIds.length === 0} title="Delete">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('arrange')}
          className={`flex-1 py-2 text-xs font-medium text-center transition-colors relative ${activeTab === 'arrange' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Arrange
          {activeTab === 'arrange' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-2 text-xs font-medium text-center transition-colors relative ${activeTab === 'layers' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Layers
          {activeTab === 'layers' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'arrange' && (
          <div className="p-3 space-y-4">
            {/* Layer ordering */}
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                variant="outline" size="sm" className="h-9 text-xs gap-1.5 justify-start"
                onClick={() => selectedIds[0] && onMoveLayer(selectedIds[0], 'up')}
                disabled={selectedIds.length === 0}
              >
                <ArrowUp className="h-3.5 w-3.5" /> Forward
              </Button>
              <Button
                variant="outline" size="sm" className="h-9 text-xs gap-1.5 justify-start"
                onClick={() => selectedIds[0] && onMoveLayer(selectedIds[0], 'down')}
                disabled={selectedIds.length === 0}
              >
                <ArrowDown className="h-3.5 w-3.5" /> Backward
              </Button>
              <Button
                variant="outline" size="sm" className="h-9 text-xs gap-1.5 justify-start"
                onClick={() => selectedIds[0] && onMoveLayer(selectedIds[0], 'top')}
                disabled={selectedIds.length === 0}
              >
                <ArrowUpToLine className="h-3.5 w-3.5" /> To front
              </Button>
              <Button
                variant="outline" size="sm" className="h-9 text-xs gap-1.5 justify-start"
                onClick={() => selectedIds[0] && onMoveLayer(selectedIds[0], 'bottom')}
                disabled={selectedIds.length === 0}
              >
                <ArrowDownToLine className="h-3.5 w-3.5" /> To back
              </Button>
            </div>

            {/* Align to page */}
            {onAlign && (
              <>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Align to page</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      variant="outline" size="sm" className="h-9 text-xs gap-1.5 justify-start"
                      onClick={() => selectedIds[0] && onAlign(selectedIds[0], 'top')}
                      disabled={selectedIds.length === 0}
                    >
                      <AlignStartVertical className="h-3.5 w-3.5" /> Top
                    </Button>
                    <Button
                      variant="outline" size="sm" className="h-9 text-xs gap-1.5 justify-start"
                      onClick={() => selectedIds[0] && onAlign(selectedIds[0], 'left')}
                      disabled={selectedIds.length === 0}
                    >
                      <AlignStartHorizontal className="h-3.5 w-3.5" /> Left
                    </Button>
                    <Button
                      variant="outline" size="sm" className="h-9 text-xs gap-1.5 justify-start"
                      onClick={() => selectedIds[0] && onAlign(selectedIds[0], 'middle')}
                      disabled={selectedIds.length === 0}
                    >
                      <AlignCenterVertical className="h-3.5 w-3.5" /> Middle
                    </Button>
                    <Button
                      variant="outline" size="sm" className="h-9 text-xs gap-1.5 justify-start"
                      onClick={() => selectedIds[0] && onAlign(selectedIds[0], 'centre')}
                      disabled={selectedIds.length === 0}
                    >
                      <AlignCenterHorizontal className="h-3.5 w-3.5" /> Centre
                    </Button>
                    <Button
                      variant="outline" size="sm" className="h-9 text-xs gap-1.5 justify-start"
                      onClick={() => selectedIds[0] && onAlign(selectedIds[0], 'bottom')}
                      disabled={selectedIds.length === 0}
                    >
                      <AlignEndVertical className="h-3.5 w-3.5" /> Bottom
                    </Button>
                    <Button
                      variant="outline" size="sm" className="h-9 text-xs gap-1.5 justify-start"
                      onClick={() => selectedIds[0] && onAlign(selectedIds[0], 'right')}
                      disabled={selectedIds.length === 0}
                    >
                      <AlignEndHorizontal className="h-3.5 w-3.5" /> Right
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'layers' && (
          <div>
            {/* Filter tabs */}
            <div className="flex mx-2 mt-2 mb-1 bg-muted/50 rounded-lg p-0.5">
              <button
                onClick={() => setLayerFilter('all')}
                className={`flex-1 py-1.5 text-[10px] font-medium rounded-md transition-colors ${layerFilter === 'all' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
              >
                All
              </button>
              <button
                onClick={() => setLayerFilter('overlapping')}
                className={`flex-1 py-1.5 text-[10px] font-medium rounded-md transition-colors ${layerFilter === 'overlapping' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                disabled={selectedIds.length === 0}
              >
                Overlapping
              </button>
            </div>

            {/* Layer list with visual previews */}
            {reversedElements.map(el => renderLayer(el))}

            {reversedElements.length === 0 && (
              <div className="p-4 text-center text-xs text-muted-foreground">
                {layerFilter === 'overlapping' ? 'No overlapping elements' : 'No layers yet. Add elements to get started.'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
