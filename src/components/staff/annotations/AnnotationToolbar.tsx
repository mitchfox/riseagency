import { useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MousePointer2, Minus, MoveRight, Square, Circle,
  Sun, Pencil, UserCircle, Eraser, Eye, Ruler, Search, Link2, MapPin, CircleDot,
  Redo2, Eclipse, ImagePlus, Type, Lightbulb, ChevronUp, ChevronDown,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { AnnotationTool } from "./AnnotationEditor";

interface AnnotationToolbarProps {
  activeTool: AnnotationTool;
  setActiveTool: (tool: AnnotationTool) => void;
  activeColor: string;
  setActiveColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (w: number) => void;
  fillOpacity: number;
  setFillOpacity: (o: number) => void;
}

interface ToolDef {
  id: AnnotationTool;
  icon: React.ComponentType<any>;
  label: string;
  shortLabel: string;
  hotkey: string;
  group: string;
}

const tools: ToolDef[] = [
  { id: 'select', icon: MousePointer2, label: 'Select & move elements', shortLabel: 'Select', hotkey: 'Ctrl', group: 'core' },
  { id: 'line', icon: Minus, label: 'Straight line', shortLabel: 'Line', hotkey: '1', group: 'draw' },
  { id: 'arrow', icon: MoveRight, label: 'Directional arrow', shortLabel: 'Arrow', hotkey: '2', group: 'draw' },
  { id: 'curved-arrow', icon: Redo2, label: 'Curved pass / aerial', shortLabel: 'Curve', hotkey: '3', group: 'draw' },
  { id: 'rect', icon: Square, label: 'Highlight an area', shortLabel: 'Rect', hotkey: '', group: 'shape' },
  { id: 'circle', icon: Circle, label: 'Circle or ring', shortLabel: 'Circle', hotkey: 'C', group: 'shape' },
  { id: 'semi-circle', icon: CircleDot, label: 'Flat oval disc', shortLabel: 'Disc', hotkey: 'D', group: 'shape' },
  { id: 'space-oval', icon: Eclipse, label: 'Hatched space oval', shortLabel: 'Space', hotkey: 'S', group: 'shape' },
  { id: 'player-marker', icon: UserCircle, label: 'Numbered player', shortLabel: 'Player', hotkey: '', group: 'label' },
  { id: 'point', icon: MapPin, label: 'Anchor point', shortLabel: 'Point', hotkey: 'P', group: 'label' },
  { id: 'text-banner', icon: Type, label: 'Text fixed top or bottom', shortLabel: 'Text', hotkey: 'T', group: 'label' },
  { id: 'spotlight', icon: Sun, label: 'Focus highlight (dimmed background)', shortLabel: 'Highlight', hotkey: 'H', group: 'effect' },
  { id: 'cylinder-spotlight', icon: Lightbulb, label: 'Spotlight beam under player', shortLabel: 'Spot', hotkey: 'G', group: 'effect' },
  { id: 'vision-cone', icon: Eye, label: 'Field of view', shortLabel: 'Vision', hotkey: 'V', group: 'effect' },
  { id: 'magnifier', icon: Search, label: 'Zoom into area', shortLabel: 'Mag', hotkey: 'M', group: 'effect' },
  { id: 'distance', icon: Ruler, label: 'Measure distance', shortLabel: 'Dist', hotkey: 'R', group: 'effect' },
  { id: 'linked-line', icon: Link2, label: 'Connect elements', shortLabel: 'Link', hotkey: 'L', group: 'effect' },
  { id: 'image-layer', icon: ImagePlus, label: 'Keep image in front', shortLabel: 'Layer', hotkey: 'B', group: 'effect' },
  { id: 'eraser', icon: Eraser, label: 'Remove element', shortLabel: 'Erase', hotkey: 'E', group: 'util' },
];

const RISE_GOLD = '#C6A332';
const brandColors = [
  { color: RISE_GOLD, label: 'Rise Gold' },
  { color: '#dc2626', label: 'Red' },
  { color: '#f97316', label: 'Orange' },
  { color: '#facc15', label: 'Yellow' },
  { color: '#22c55e', label: 'Green' },
  { color: '#14532d', label: 'Dark Green' },
  { color: '#ffffff', label: 'White' },
  { color: '#000000', label: 'Black' },
];

const USAGE_KEY = 'annotation-tool-usage';
const TOP_COUNT = 6;

const loadUsage = (): Record<string, number> => {
  try { return JSON.parse(localStorage.getItem(USAGE_KEY) || '{}'); } catch { return {}; }
};

export const AnnotationToolbar = ({
  activeTool, setActiveTool, activeColor, setActiveColor, strokeWidth, setStrokeWidth,
  fillOpacity, setFillOpacity,
}: AnnotationToolbarProps) => {
  const showFillOpacity = ['rect', 'circle', 'spotlight', 'magnifier', 'semi-circle', 'vision-cone', 'space-oval'].includes(activeTool);
  const [recentColors, setRecentColors] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('annotation-recent-colours') || '[]'); } catch { return []; }
  });
  const [usage, setUsage] = useState<Record<string, number>>(loadUsage);
  const [expanded, setExpanded] = useState(false);

  // Track tool selection — bump usage for the chosen tool
  const handleSelectTool = (id: AnnotationTool) => {
    setActiveTool(id);
    if (id === 'select' || id === 'eraser') return; // ignore utility selections
    setUsage(prev => {
      const next = { ...prev, [id]: (prev[id] || 0) + 1 };
      try { localStorage.setItem(USAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Always keep Select pinned at the top of the most-used row
  const sortedByUsage = [...tools]
    .filter(t => t.id !== 'select')
    .sort((a, b) => (usage[b.id] || 0) - (usage[a.id] || 0));
  const topTools: ToolDef[] = [tools.find(t => t.id === 'select')!, ...sortedByUsage.slice(0, TOP_COUNT - 1)];
  const remainingTools = sortedByUsage.slice(TOP_COUNT - 1);

  return (
    <div className="absolute bottom-3 right-3 z-30 flex flex-col items-end gap-2 pointer-events-auto">
      {/* Expanded tool grid (View more) */}
      {expanded && (
        <div className="bg-[#161a24]/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl p-2 animate-fade-in">
          <p className="text-[9px] uppercase tracking-wider text-white/40 px-1 pb-1.5">All tools</p>
          <div className="grid grid-cols-6 gap-1 max-w-[280px]">
            <TooltipProvider delayDuration={200}>
              {remainingTools.map(tool => (
                <Tooltip key={tool.id}>
                  <TooltipTrigger asChild>
                    <button
                      className={`w-10 h-10 flex flex-col items-center justify-center rounded-md transition-colors ${
                        activeTool === tool.id
                          ? 'bg-primary text-primary-foreground'
                          : 'text-white/60 hover:text-white hover:bg-white/10'
                      }`}
                      onClick={() => { handleSelectTool(tool.id); setExpanded(false); }}
                    >
                      <tool.icon className="w-3.5 h-3.5" />
                      <span className="text-[7px] leading-tight mt-0.5 opacity-70">{tool.shortLabel}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs space-y-0.5">
                    <p className="font-medium">{tool.shortLabel}{tool.hotkey ? ` (${tool.hotkey})` : ''}</p>
                    <p className="text-muted-foreground text-[10px]">{tool.label}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
        </div>
      )}

      {/* Main panel: most-used tools + colours + sliders */}
      <div className="bg-[#161a24]/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl p-2 flex flex-col gap-2 max-h-[70vh] overflow-y-auto">
        {/* Top row: most-used tools + view-more toggle */}
        <div className="flex flex-col gap-1">
          <p className="text-[9px] uppercase tracking-wider text-white/40 px-1">Tools</p>
          <div className="flex flex-col gap-0.5">
            <TooltipProvider delayDuration={200}>
              {topTools.map(tool => (
                <Tooltip key={tool.id}>
                  <TooltipTrigger asChild>
                    <button
                      className={`w-10 h-10 flex flex-col items-center justify-center rounded-md transition-colors ${
                        activeTool === tool.id
                          ? 'bg-primary text-primary-foreground'
                          : 'text-white/60 hover:text-white hover:bg-white/10'
                      }`}
                      onClick={() => handleSelectTool(tool.id)}
                    >
                      <tool.icon className="w-3.5 h-3.5" />
                      <span className="text-[7px] leading-tight mt-0.5 opacity-70">{tool.shortLabel}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs space-y-0.5">
                    <p className="font-medium">{tool.shortLabel}{tool.hotkey ? ` (${tool.hotkey})` : ''}</p>
                    <p className="text-muted-foreground text-[10px]">{tool.label}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
            {remainingTools.length > 0 && (
              <button
                className="w-10 h-7 flex items-center justify-center rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                onClick={() => setExpanded(e => !e)}
                title={expanded ? 'Hide more tools' : 'View more tools'}
              >
                {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Colour palette — always visible */}
        <div className="border-t border-white/10 pt-2 flex flex-col items-center gap-1">
          <TooltipProvider delayDuration={200}>
            {brandColors.map(({ color, label }) => (
              <Tooltip key={color}>
                <TooltipTrigger asChild>
                  <button
                    className={`w-5 h-5 rounded-full border-2 transition-transform ${
                      activeColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setActiveColor(color)}
                  />
                </TooltipTrigger>
                <TooltipContent side="left" className="text-[10px]">{label}</TooltipContent>
              </Tooltip>
            ))}
            <Tooltip>
              <TooltipTrigger asChild>
                <label className={`w-5 h-5 rounded-full cursor-pointer border-2 transition-transform overflow-hidden ${
                  !brandColors.some(b => b.color === activeColor) ? 'border-white scale-110' : 'border-white/30 hover:scale-105'
                }`} style={{ background: 'conic-gradient(red,yellow,lime,aqua,blue,magenta,red)' }}>
                  <input type="color" value={activeColor} onChange={e => {
                    setActiveColor(e.target.value);
                    setRecentColors(prev => {
                      const next = [e.target.value, ...prev.filter(c => c !== e.target.value)].slice(0, 4);
                      try { localStorage.setItem('annotation-recent-colours', JSON.stringify(next)); } catch {}
                      return next;
                    });
                  }} className="sr-only" />
                </label>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-[10px]">Custom colour</TooltipContent>
            </Tooltip>
            {recentColors.filter(c => !brandColors.some(b => b.color === c)).slice(0, 3).map(c => (
              <button
                key={c}
                className={`w-4 h-4 rounded-full border transition-transform ${
                  activeColor === c ? 'border-white scale-110' : 'border-white/20 hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
                onClick={() => setActiveColor(c)}
              />
            ))}
          </TooltipProvider>
        </div>

        {/* Thickness */}
        <div className="border-t border-white/10 pt-2 flex flex-col items-center gap-1 w-full">
          <Label className="text-[8px] text-white/40 uppercase">Thick</Label>
          <span className="text-[9px] text-white/30 font-mono">{strokeWidth.toFixed(2)}</span>
          <div className="w-10 py-1">
            <Slider
              value={[strokeWidth]}
              min={0.05} max={6} step={0.05}
              onValueChange={([v]) => setStrokeWidth(v)}
              className="[&_[role=slider]]:bg-white [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
            />
          </div>
        </div>

        {showFillOpacity && (
          <div className="border-t border-white/10 pt-2 flex flex-col items-center gap-1 w-full">
            <Label className="text-[8px] text-white/40 uppercase">Fill</Label>
            <span className="text-[8px] text-white/30">{Math.round(fillOpacity * 100)}%</span>
            <div className="w-10 py-1">
              <Slider
                value={[fillOpacity]}
                min={0} max={1} step={0.05}
                onValueChange={([v]) => setFillOpacity(v)}
                className="[&_[role=slider]]:bg-white [&_[role=slider]]:h-2 [&_[role=slider]]:w-2"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
