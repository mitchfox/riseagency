import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  MousePointer2, Type, Square, Circle, Triangle, Star, Diamond, ArrowRight,
  Minus, Hand, Undo2, Redo2, ZoomIn, ZoomOut, Grid3X3,
  Magnet, Image as ImageIcon, Trash2, Layers, Keyboard,
  ChevronLeft, Upload, SlidersHorizontal,
  PanelLeftClose, Palette, LayoutTemplate, Wand2, Hexagon, Pentagon,
} from 'lucide-react';
import { useDesignCanvas } from './useDesignCanvas';
import { CanvasElement } from './CanvasElement';
import { LayersPanel } from './LayersPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { SavedAssetsPanel } from './SavedAssetsPanel';
import { BrandKitPanel } from './BrandKitPanel';
import { TemplatesPanel } from './TemplatesPanel';
import { FiltersPanel } from './FiltersPanel';
import { ExportDialog } from './ExportDialog';
import { CANVAS_PRESETS } from './types';
import type { ShapeType, SnapLine, DesignProject, DesignTemplate } from './types';

interface DesignStudioProps {
  initialProject: DesignProject;
  onBack: () => void;
  onSave: (project: DesignProject) => void;
}

type PanelType = 'assets' | 'layers' | 'properties' | 'brand' | 'templates' | 'filters' | null;

export function DesignStudio({ initialProject, onBack, onSave }: DesignStudioProps) {
  const canvas = useDesignCanvas(initialProject);
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const [leftPanel, setLeftPanel] = useState<PanelType>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [canvasPreset, setCanvasPreset] = useState<string>(() => {
    const match = CANVAS_PRESETS.find(p => p.width === initialProject.width && p.height === initialProject.height);
    return match?.name || 'Custom';
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSnapLines, setActiveSnapLines] = useState<SnapLine[]>([]);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [hasInitialised, setHasInitialised] = useState(false);
  const [customW, setCustomW] = useState(String(initialProject.width));
  const [customH, setCustomH] = useState(String(initialProject.height));

  const selectedElement = canvas.project.elements.find(el => canvas.selectedIds.includes(el.id)) || null;

  // Auto-show properties panel when element selected
  useEffect(() => {
    if (canvas.selectedIds.length > 0) {
      if (selectedElement?.type === 'image' && leftPanel === 'filters') return; // keep filters open
      setLeftPanel('properties');
    }
  }, [canvas.selectedIds]);

  // Auto-centre and fit canvas
  useEffect(() => {
    if (hasInitialised || !canvasAreaRef.current) return;
    const rect = canvasAreaRef.current.getBoundingClientRect();
    const padding = 60;
    const scaleX = (rect.width - padding * 2) / canvas.project.width;
    const scaleY = (rect.height - padding * 2) / canvas.project.height;
    const fitZoom = Math.min(scaleX, scaleY, 1);
    canvas.setZoom(fitZoom);
    canvas.setPanOffset({ x: 0, y: 0 });
    setHasInitialised(true);
  }, [hasInitialised, canvas.project.width, canvas.project.height]);

  // Auto-save
  useEffect(() => {
    const timer = setInterval(() => onSave(canvas.project), 10000);
    return () => clearInterval(timer);
  }, [canvas.project, onSave]);

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
      if (ctrl && e.key === 's') { e.preventDefault(); onSave(canvas.project); toast.success('Saved'); }
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
  }, [canvas, onSave]);

  // Wheel zoom
  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.ctrlKey || e.metaKey ? e.deltaY * 0.001 : e.deltaY * 0.002;
      canvas.setZoom(z => Math.max(0.1, Math.min(3, z - delta)));
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [canvas]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || e.target === canvasAreaRef.current || canvas.activeTool === 'hand') {
      if (e.button === 0 || e.button === 1) {
        setIsPanning(true);
        panStart.current = { x: e.clientX, y: e.clientY, panX: canvas.panOffset.x, panY: canvas.panOffset.y };
      }
    }
    if (e.target === canvasRef.current || e.target === canvasAreaRef.current) {
      canvas.deselectAll();
    }
  }, [canvas]);

  useEffect(() => {
    if (!isPanning) return;
    const handleMove = (e: MouseEvent) => {
      canvas.setPanOffset({
        x: panStart.current.panX + (e.clientX - panStart.current.x),
        y: panStart.current.panY + (e.clientY - panStart.current.y),
      });
    };
    const handleUp = () => setIsPanning(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [isPanning, canvas]);

  const handleDrag = useCallback((id: string, x: number, y: number) => {
    const el = canvas.project.elements.find(e => e.id === id);
    if (!el) return;
    const result = canvas.calculateSnap({ ...el, x, y }, canvas.project.elements);
    setActiveSnapLines(result.lines);
    canvas.updateElement(id, { x: result.x, y: result.y });
  }, [canvas]);

  const handleDragEnd = useCallback(() => setActiveSnapLines([]), []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { if (ev.target?.result) canvas.addImage(ev.target.result as string, file.name); };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [canvas]);

  const handlePresetChange = useCallback((preset: string) => {
    setCanvasPreset(preset);
    const p = CANVAS_PRESETS.find(pr => pr.name === preset);
    if (p) {
      canvas.setProject((prev: DesignProject) => ({ ...prev, width: p.width, height: p.height }));
      setCustomW(String(p.width));
      setCustomH(String(p.height));
    }
  }, [canvas]);

  const handleCustomDimensions = useCallback(() => {
    const w = parseInt(customW) || 1080;
    const h = parseInt(customH) || 1080;
    canvas.setProject((prev: DesignProject) => ({ ...prev, width: w, height: h }));
    setCanvasPreset('Custom');
  }, [customW, customH, canvas]);

  const handleApplyTemplate = useCallback((template: DesignTemplate) => {
    canvas.setProject((prev: DesignProject) => ({
      ...prev,
      width: template.width,
      height: template.height,
      background: template.background,
      elements: template.elements.map((el, i) => ({
        id: Math.random().toString(36).slice(2, 11),
        type: el.type || 'text',
        x: el.x ?? 0,
        y: el.y ?? 0,
        width: el.width ?? 200,
        height: el.height ?? 50,
        rotation: 0,
        opacity: el.opacity ?? 1,
        locked: false,
        visible: true,
        name: el.name || `${el.type} ${i + 1}`,
        ...el,
      })) as any,
    }));
    setCustomW(String(template.width));
    setCustomH(String(template.height));
    setLeftPanel(null);
    toast.success('Template applied');
  }, [canvas]);

  const shapes: { type: ShapeType; icon: any; label: string }[] = [
    { type: 'rectangle', icon: Square, label: 'Rectangle' },
    { type: 'circle', icon: Circle, label: 'Circle' },
    { type: 'triangle', icon: Triangle, label: 'Triangle' },
    { type: 'star', icon: Star, label: 'Star' },
    { type: 'diamond', icon: Diamond, label: 'Diamond' },
    { type: 'arrow', icon: ArrowRight, label: 'Arrow' },
    { type: 'hexagon', icon: Hexagon, label: 'Hexagon' },
    { type: 'pentagon', icon: Pentagon, label: 'Pentagon' },
  ];

  const ToolBtn = ({ active, onClick, icon: Icon, label, shortcut }: { active?: boolean; onClick: () => void; icon: any; label: string; shortcut?: string }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
        >
          <Icon className="h-5 w-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {label}{shortcut && <kbd className="ml-1.5 px-1 py-0.5 bg-muted rounded text-[10px] font-mono">{shortcut}</kbd>}
      </TooltipContent>
    </Tooltip>
  );

  const togglePanel = (panel: PanelType) => setLeftPanel(leftPanel === panel ? null : panel);

  const panelTitles: Record<string, string> = {
    assets: 'Saved Assets',
    layers: 'Layers',
    properties: 'Properties',
    brand: 'Brand Kit',
    templates: 'Templates',
    filters: 'Filters & Effects',
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-[calc(100vh-8rem)] bg-background rounded-lg border overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-muted/30">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { onSave(canvas.project); onBack(); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            value={canvas.project.name}
            onChange={e => canvas.setProject(p => ({ ...p, name: e.target.value }))}
            className="h-7 text-xs w-44 bg-transparent border-none focus-visible:ring-1"
          />
          <div className="w-px h-5 bg-border" />

          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={canvas.undo} disabled={canvas.historyIndex <= 0} title="Undo">
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={canvas.redo} disabled={canvas.historyIndex >= canvas.historyLength - 1} title="Redo">
            <Redo2 className="h-3.5 w-3.5" />
          </Button>

          <div className="flex-1" />

          {/* Canvas size */}
          <Select value={canvasPreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CANVAS_PRESETS.map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Custom dimensions */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-[10px] font-mono px-2">
                {canvas.project.width}×{canvas.project.height}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2 space-y-2" align="end">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Custom Size</p>
              <div className="flex gap-1.5 items-center">
                <Input value={customW} onChange={e => setCustomW(e.target.value)} className="h-7 text-xs" placeholder="Width" />
                <span className="text-muted-foreground text-xs">×</span>
                <Input value={customH} onChange={e => setCustomH(e.target.value)} className="h-7 text-xs" placeholder="Height" />
              </div>
              <Button size="sm" className="w-full h-7 text-xs" onClick={handleCustomDimensions}>Apply</Button>
            </PopoverContent>
          </Popover>

          <input type="color" value={canvas.project.background} onChange={e => canvas.setProject(p => ({ ...p, background: e.target.value }))} className="w-7 h-7 rounded cursor-pointer border" title="Background" />

          <div className="w-px h-5 bg-border" />

          <Button variant={canvas.showGrid ? 'default' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => canvas.setShowGrid(!canvas.showGrid)} title="Grid">
            <Grid3X3 className="h-3.5 w-3.5" />
          </Button>
          <Button variant={canvas.snapEnabled ? 'default' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => canvas.setSnapEnabled(!canvas.snapEnabled)} title="Snap">
            <Magnet className="h-3.5 w-3.5" />
          </Button>

          <div className="w-px h-5 bg-border" />

          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowShortcuts(!showShortcuts)} title="Shortcuts">
            <Keyboard className="h-3.5 w-3.5" />
          </Button>
          <ExportDialog canvasRef={canvasRef as any} project={canvas.project} />
        </div>

        {/* Main area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left toolbar */}
          <div className="w-[52px] border-r bg-muted/20 flex flex-col items-center py-2 gap-1 flex-shrink-0">
            <ToolBtn active={canvas.activeTool === 'select'} onClick={() => canvas.setActiveTool('select')} icon={MousePointer2} label="Select" shortcut="V" />
            <ToolBtn active={canvas.activeTool === 'hand'} onClick={() => canvas.setActiveTool('hand')} icon={Hand} label="Pan" shortcut="H" />

            <div className="w-6 h-px bg-border my-1" />

            <ToolBtn active={leftPanel === 'templates'} onClick={() => togglePanel('templates')} icon={LayoutTemplate} label="Templates" />
            <ToolBtn onClick={() => canvas.addText()} icon={Type} label="Text" shortcut="T" />

            <Popover>
              <PopoverTrigger asChild>
                <div>
                  <ToolBtn onClick={() => {}} icon={Square} label="Shapes" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2 grid grid-cols-4 gap-1" side="right" align="start">
                {shapes.map(s => {
                  const Icon = s.icon;
                  return (
                    <Button key={s.type} variant="ghost" size="icon" className="h-9 w-9" onClick={() => canvas.addShape(s.type)} title={s.label}>
                      <Icon className="h-4 w-4" />
                    </Button>
                  );
                })}
              </PopoverContent>
            </Popover>

            <ToolBtn onClick={() => canvas.addLine()} icon={Minus} label="Line" shortcut="L" />
            <ToolBtn onClick={() => fileInputRef.current?.click()} icon={Upload} label="Upload Image" />
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

            <div className="w-6 h-px bg-border my-1" />

            <ToolBtn active={leftPanel === 'assets'} onClick={() => togglePanel('assets')} icon={ImageIcon} label="Saved Assets" />
            <ToolBtn active={leftPanel === 'brand'} onClick={() => togglePanel('brand')} icon={Palette} label="Brand Kit" />
            <ToolBtn active={leftPanel === 'layers'} onClick={() => togglePanel('layers')} icon={Layers} label="Layers" />
            <ToolBtn active={leftPanel === 'properties'} onClick={() => togglePanel('properties')} icon={SlidersHorizontal} label="Properties" />
            <ToolBtn active={leftPanel === 'filters'} onClick={() => togglePanel('filters')} icon={Wand2} label="Filters" />

            <div className="flex-1" />

            {canvas.selectedIds.length > 0 && (
              <ToolBtn onClick={canvas.deleteSelected} icon={Trash2} label="Delete" shortcut="Del" />
            )}
          </div>

          {/* Slide-out panel */}
          {leftPanel && (
            <div className="w-60 border-r bg-card flex-shrink-0 overflow-hidden flex flex-col animate-in slide-in-from-left-2 duration-200">
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {panelTitles[leftPanel] || leftPanel}
                </h3>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setLeftPanel(null)}>
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto">
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
                {leftPanel === 'properties' && <PropertiesPanel element={selectedElement} onUpdate={canvas.updateElement} />}
                {leftPanel === 'brand' && (
                  <BrandKitPanel
                    onApplyColour={(c) => {
                      if (selectedElement) {
                        if (selectedElement.type === 'text') canvas.updateElement(selectedElement.id, { color: c });
                        else if (selectedElement.type === 'shape') canvas.updateElement(selectedElement.id, { fill: c });
                      }
                    }}
                    onApplyFont={(f) => {
                      if (selectedElement?.type === 'text') canvas.updateElement(selectedElement.id, { fontFamily: f });
                    }}
                    onAddLogo={(url) => canvas.addImage(url, 'Brand Logo')}
                  />
                )}
                {leftPanel === 'templates' && <TemplatesPanel onApplyTemplate={handleApplyTemplate} />}
                {leftPanel === 'filters' && <FiltersPanel element={selectedElement} onUpdate={canvas.updateElement} />}
              </div>
            </div>
          )}

          {/* Canvas area */}
          <div
            ref={canvasAreaRef}
            className="flex-1 overflow-hidden relative"
            style={{
              backgroundColor: 'hsl(var(--muted) / 0.3)',
              cursor: isPanning ? 'grabbing' : canvas.activeTool === 'hand' ? 'grab' : 'default',
            }}
            onMouseDown={handleCanvasMouseDown}
          >
            <div
              style={{
                transform: `translate(${canvas.panOffset.x}px, ${canvas.panOffset.y}px) scale(${canvas.zoom})`,
                transformOrigin: 'center center',
                position: 'absolute',
                left: '50%',
                top: '50%',
                marginLeft: -canvas.project.width / 2,
                marginTop: -canvas.project.height / 2,
              }}
            >
              {/* Shadow */}
              <div
                style={{
                  position: 'absolute', left: 4, top: 4,
                  width: canvas.project.width, height: canvas.project.height,
                  backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 2,
                }}
              />
              {/* Canvas */}
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

            {/* Zoom controls */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-card/90 backdrop-blur border rounded-lg px-2 py-1 shadow-sm">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => canvas.setZoom(z => Math.max(0.1, z - 0.1))}>
                <ZoomOut className="h-3 w-3" />
              </Button>
              <span className="text-[10px] w-10 text-center font-mono">{Math.round(canvas.zoom * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => canvas.setZoom(z => Math.min(3, z + 0.1))}>
                <ZoomIn className="h-3 w-3" />
              </Button>
            </div>

            <div className="absolute bottom-3 left-3 text-[10px] text-muted-foreground bg-card/80 backdrop-blur px-2 py-0.5 rounded shadow-sm">
              {canvas.project.width} × {canvas.project.height}
            </div>
          </div>
        </div>

        {/* Shortcuts overlay */}
        {showShortcuts && (
          <div className="absolute inset-0 bg-background/95 z-50 flex items-center justify-center" onClick={() => setShowShortcuts(false)}>
            <div className="bg-card border rounded-lg p-6 max-w-md shadow-lg" onClick={e => e.stopPropagation()}>
              <h3 className="font-semibold mb-4">Keyboard Shortcuts</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ['V', 'Select tool'], ['H', 'Hand / Pan'], ['T', 'Add text'], ['L', 'Add line'],
                  ['⌘C', 'Copy'], ['⌘V', 'Paste'], ['⌘D', 'Duplicate'], ['⌘S', 'Save'],
                  ['⌘Z', 'Undo'], ['⌘⇧Z', 'Redo'], ['⌘A', 'Select all'], ['Del', 'Delete'],
                  ['+/-', 'Zoom in/out'], ['⌘0', 'Reset zoom'], ['⌘[/]', 'Layer order'], ['Scroll', 'Zoom'],
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
    </TooltipProvider>
  );
}
