import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import {
  MousePointer2, Type, Square, Circle, Triangle, Star, Diamond, ArrowRight,
  Minus, Hand, Undo2, Redo2, ZoomIn, ZoomOut, Download, Save, Grid3X3,
  Magnet, Image as ImageIcon, Trash2, Copy, ClipboardPaste, Layers,
  PanelRight, PanelLeft, Keyboard, RotateCcw,
} from 'lucide-react';
import { useDesignCanvas } from './useDesignCanvas';
import { CanvasElement } from './CanvasElement';
import { LayersPanel } from './LayersPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { SavedAssetsPanel } from './SavedAssetsPanel';
import { CANVAS_PRESETS } from './types';
import type { ShapeType, SnapLine } from './types';
import html2canvas from 'html2canvas';

export function DesignStudio() {
  const canvas = useDesignCanvas();
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const [leftPanel, setLeftPanel] = useState<'assets' | 'layers' | null>('assets');
  const [rightPanel, setRightPanel] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [canvasPreset, setCanvasPreset] = useState('Instagram Post');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSnapLines, setActiveSnapLines] = useState<SnapLine[]>([]);

  const selectedElement = canvas.project.elements.find(el => canvas.selectedIds.includes(el.id)) || null;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).contentEditable === 'true' || (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      const ctrl = e.ctrlKey || e.metaKey;
      
      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); canvas.undo(); }
      if (ctrl && e.key === 'z' && e.shiftKey) { e.preventDefault(); canvas.redo(); }
      if (ctrl && e.key === 'y') { e.preventDefault(); canvas.redo(); }
      if (ctrl && e.key === 'c') { e.preventDefault(); canvas.copySelected(); }
      if (ctrl && e.key === 'v') { e.preventDefault(); canvas.paste(); }
      if (ctrl && e.key === 'd') { e.preventDefault(); canvas.duplicateSelected(); }
      if (ctrl && e.key === 'a') { e.preventDefault(); canvas.selectAll(); }
      if (e.key === 'Delete' || e.key === 'Backspace') { canvas.deleteSelected(); }
      if (e.key === 'Escape') { canvas.deselectAll(); canvas.setActiveTool('select'); }
      if (e.key === 'v' && !ctrl) canvas.setActiveTool('select');
      if (e.key === 't' && !ctrl) canvas.setActiveTool('text');
      if (e.key === 'h' && !ctrl) canvas.setActiveTool('hand');
      if (e.key === 'l' && !ctrl) canvas.setActiveTool('line');
      if (e.key === '?' && !ctrl) setShowShortcuts(prev => !prev);
      if (e.key === '+' || e.key === '=') { e.preventDefault(); canvas.setZoom(z => Math.min(z + 0.1, 3)); }
      if (e.key === '-') { e.preventDefault(); canvas.setZoom(z => Math.max(z - 0.1, 0.1)); }
      if (e.key === '0' && ctrl) { e.preventDefault(); canvas.setZoom(0.5); }
      if (e.key === '[' && ctrl) { if (canvas.selectedIds[0]) canvas.moveLayer(canvas.selectedIds[0], 'down'); }
      if (e.key === ']' && ctrl) { if (canvas.selectedIds[0]) canvas.moveLayer(canvas.selectedIds[0], 'up'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvas]);

  // Wheel zoom
  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        canvas.setZoom(z => Math.max(0.1, Math.min(3, z - e.deltaY * 0.001)));
      } else {
        canvas.setPanOffset(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [canvas]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || e.target === canvasAreaRef.current) {
      canvas.deselectAll();
    }
  }, [canvas]);

  const handleDrag = useCallback((id: string, x: number, y: number) => {
    const el = canvas.project.elements.find(e => e.id === id);
    if (!el) return;
    const result = canvas.calculateSnap({ ...el, x, y }, canvas.project.elements);
    setActiveSnapLines(result.lines);
    canvas.updateElement(id, { x: result.x, y: result.y });
  }, [canvas]);

  const handleDragEnd = useCallback(() => {
    setActiveSnapLines([]);
  }, []);

  const handleExport = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      const c = await html2canvas(canvasRef.current, {
        useCORS: true,
        backgroundColor: null,
        width: canvas.project.width,
        height: canvas.project.height,
      } as any);
      const link = document.createElement('a');
      link.download = `${canvas.project.name}.png`;
      link.href = c.toDataURL('image/png');
      link.click();
      toast.success('Design exported');
    } catch {
      toast.error('Failed to export');
    }
  }, [canvas.project]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) canvas.addImage(ev.target.result as string, file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [canvas]);

  const handlePresetChange = useCallback((preset: string) => {
    setCanvasPreset(preset);
    const p = CANVAS_PRESETS.find(pr => pr.name === preset);
    if (p) {
      canvas.setProject(prev => ({ ...prev, width: p.width, height: p.height }));
    }
  }, [canvas]);

  const shapes: { type: ShapeType; icon: any; label: string }[] = [
    { type: 'rectangle', icon: Square, label: 'Rectangle' },
    { type: 'circle', icon: Circle, label: 'Circle' },
    { type: 'triangle', icon: Triangle, label: 'Triangle' },
    { type: 'star', icon: Star, label: 'Star' },
    { type: 'diamond', icon: Diamond, label: 'Diamond' },
    { type: 'arrow', icon: ArrowRight, label: 'Arrow' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-background rounded-lg border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-muted/30 flex-wrap">
        {/* Name */}
        <Input
          value={canvas.project.name}
          onChange={e => canvas.setProject(p => ({ ...p, name: e.target.value }))}
          className="h-7 text-xs w-36 bg-transparent border-none focus-visible:ring-1"
        />
        <div className="w-px h-5 bg-border mx-1" />

        {/* Tools */}
        <Button variant={canvas.activeTool === 'select' ? 'default' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => canvas.setActiveTool('select')} title="Select (V)">
          <MousePointer2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant={canvas.activeTool === 'hand' ? 'default' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => canvas.setActiveTool('hand')} title="Hand (H)">
          <Hand className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => canvas.addText()} title="Add Text (T)">
          <Type className="h-3.5 w-3.5" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Add Shape">
              <Square className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-1 flex gap-1" side="bottom">
            {shapes.map(s => {
              const Icon = s.icon;
              return (
                <Button key={s.type} variant="ghost" size="icon" className="h-8 w-8" onClick={() => canvas.addShape(s.type)} title={s.label}>
                  <Icon className="h-4 w-4" />
                </Button>
              );
            })}
          </PopoverContent>
        </Popover>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => canvas.addLine()} title="Add Line (L)">
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => fileInputRef.current?.click()} title="Upload Image">
          <ImageIcon className="h-3.5 w-3.5" />
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

        <div className="w-px h-5 bg-border mx-1" />

        {/* Undo/Redo */}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={canvas.undo} disabled={canvas.historyIndex <= 0} title="Undo (⌘Z)">
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={canvas.redo} disabled={canvas.historyIndex >= canvas.historyLength - 1} title="Redo (⌘⇧Z)">
          <Redo2 className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Zoom */}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => canvas.setZoom(z => Math.max(0.1, z - 0.1))}>
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs w-10 text-center">{Math.round(canvas.zoom * 100)}%</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => canvas.setZoom(z => Math.min(3, z + 0.1))}>
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => canvas.setZoom(0.5)} title="Reset Zoom (⌘0)">
          <RotateCcw className="h-3 w-3" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Toggles */}
        <Button variant={canvas.showGrid ? 'default' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => canvas.setShowGrid(!canvas.showGrid)} title="Grid">
          <Grid3X3 className="h-3.5 w-3.5" />
        </Button>
        <Button variant={canvas.snapEnabled ? 'default' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => canvas.setSnapEnabled(!canvas.snapEnabled)} title="Snap">
          <Magnet className="h-3.5 w-3.5" />
        </Button>

        <div className="flex-1" />

        {/* Canvas size */}
        <Select value={canvasPreset} onValueChange={handlePresetChange}>
          <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CANVAS_PRESETS.map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Bg color */}
        <input type="color" value={canvas.project.background} onChange={e => canvas.setProject(p => ({ ...p, background: e.target.value }))} className="w-7 h-7 rounded cursor-pointer border" title="Background colour" />

        <div className="w-px h-5 bg-border mx-1" />

        {/* Panels */}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLeftPanel(leftPanel === 'assets' ? null : 'assets')} title="Assets">
          <PanelLeft className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLeftPanel(leftPanel === 'layers' ? null : 'layers')} title="Layers">
          <Layers className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRightPanel(!rightPanel)} title="Properties">
          <PanelRight className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowShortcuts(!showShortcuts)} title="Shortcuts (?)">
          <Keyboard className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleExport}>
          <Download className="h-3 w-3" /> Export
        </Button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        {leftPanel && (
          <div className="w-52 border-r bg-muted/10 flex-shrink-0 overflow-hidden">
            {leftPanel === 'assets' && <SavedAssetsPanel onAddImage={canvas.addImage} />}
            {leftPanel === 'layers' && (
              <LayersPanel
                elements={canvas.project.elements}
                selectedIds={canvas.selectedIds}
                onSelect={(id, multi) => {
                  if (multi) canvas.setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                  else canvas.setSelectedIds([id]);
                }}
                onUpdate={canvas.updateElement}
                onMoveLayer={canvas.moveLayer}
                onDelete={canvas.deleteSelected}
                onDuplicate={canvas.duplicateSelected}
              />
            )}
          </div>
        )}

        {/* Canvas area */}
        <div
          ref={canvasAreaRef}
          className="flex-1 overflow-hidden relative bg-muted/20"
          onClick={handleCanvasClick}
          style={{ cursor: canvas.activeTool === 'hand' ? 'grab' : 'default' }}
        >
          <div
            style={{
              transform: `translate(${canvas.panOffset.x}px, ${canvas.panOffset.y}px) scale(${canvas.zoom})`,
              transformOrigin: '0 0',
              position: 'absolute',
              left: '50%',
              top: '50%',
              marginLeft: -(canvas.project.width * canvas.zoom) / 2 / canvas.zoom,
              marginTop: -(canvas.project.height * canvas.zoom) / 2 / canvas.zoom,
            }}
          >
            {/* Canvas shadow */}
            <div
              style={{
                position: 'absolute',
                left: 4,
                top: 4,
                width: canvas.project.width,
                height: canvas.project.height,
                backgroundColor: 'rgba(0,0,0,0.1)',
                borderRadius: 2,
              }}
            />
            {/* Actual canvas */}
            <div
              ref={canvasRef}
              style={{
                position: 'relative',
                width: canvas.project.width,
                height: canvas.project.height,
                backgroundColor: canvas.project.background,
                overflow: 'hidden',
                backgroundImage: canvas.showGrid
                  ? `linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)`
                  : undefined,
                backgroundSize: canvas.showGrid ? '20px 20px' : undefined,
              }}
            >
              {/* Snap lines */}
              {activeSnapLines.map((line, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    ...(line.type === 'vertical'
                      ? { left: line.position, top: 0, width: 1, height: '100%' }
                      : { top: line.position, left: 0, height: 1, width: '100%' }),
                    backgroundColor: '#ef4444',
                    zIndex: 9999,
                    pointerEvents: 'none',
                  }}
                />
              ))}

              {canvas.project.elements.map(el => (
                <CanvasElement
                  key={el.id}
                  element={el}
                  isSelected={canvas.selectedIds.includes(el.id)}
                  zoom={canvas.zoom}
                  onSelect={(id, multi) => {
                    if (multi) canvas.setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                    else canvas.setSelectedIds([id]);
                  }}
                  onUpdate={canvas.updateElement}
                  onDragStart={() => {}}
                  onDragEnd={handleDragEnd}
                  onDrag={handleDrag}
                />
              ))}
            </div>
          </div>

          {/* Canvas size indicator */}
          <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground bg-background/80 px-2 py-0.5 rounded">
            {canvas.project.width} × {canvas.project.height}
          </div>
        </div>

        {/* Right panel */}
        {rightPanel && (
          <div className="w-56 border-l bg-muted/10 flex-shrink-0 overflow-y-auto">
            <div className="px-3 py-2 border-b">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Properties</h3>
            </div>
            <PropertiesPanel element={selectedElement} onUpdate={canvas.updateElement} />
          </div>
        )}
      </div>

      {/* Shortcuts overlay */}
      {showShortcuts && (
        <div className="absolute inset-0 bg-background/95 z-50 flex items-center justify-center" onClick={() => setShowShortcuts(false)}>
          <div className="bg-card border rounded-lg p-6 max-w-md shadow-lg" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-4">Keyboard Shortcuts</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['V', 'Select tool'], ['H', 'Hand tool'], ['T', 'Add text'], ['L', 'Add line'],
                ['⌘C', 'Copy'], ['⌘V', 'Paste'], ['⌘D', 'Duplicate'], ['⌘Z', 'Undo'],
                ['⌘⇧Z', 'Redo'], ['⌘A', 'Select all'], ['Del', 'Delete'], ['Esc', 'Deselect'],
                ['+/-', 'Zoom in/out'], ['⌘0', 'Reset zoom'], ['⌘[/]', 'Layer order'], ['?', 'Shortcuts'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">{key}</kbd>
                  <span className="text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setShowShortcuts(false)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}
