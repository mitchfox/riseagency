import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MousePointer2, Minus, MoveRight, Square, Circle,
  Sun, UserCircle, Eraser, Eye, Ruler, Search, Link2, MapPin, CircleDot,
  Redo2, Eclipse, ImagePlus, Type, Lightbulb,
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
}

const tools: ToolDef[] = [
  { id: 'select', icon: MousePointer2, label: 'Select & move elements', shortLabel: 'Select', hotkey: 'V' },
  { id: 'line', icon: Minus, label: 'Straight line', shortLabel: 'Line', hotkey: '1' },
  { id: 'arrow', icon: MoveRight, label: 'Directional arrow', shortLabel: 'Arrow', hotkey: '2' },
  { id: 'curved-arrow', icon: Redo2, label: 'Curved pass / aerial', shortLabel: 'Curve', hotkey: '3' },
  { id: 'rect', icon: Square, label: 'Highlight an area', shortLabel: 'Rect', hotkey: '4' },
  { id: 'circle', icon: Circle, label: 'Circle or ring', shortLabel: 'Circle', hotkey: 'C' },
  { id: 'semi-circle', icon: CircleDot, label: 'Flat oval disc', shortLabel: 'Disc', hotkey: 'D' },
  { id: 'space-oval', icon: Eclipse, label: 'Hatched space oval', shortLabel: 'Space', hotkey: 'S' },
  { id: 'player-marker', icon: UserCircle, label: 'Numbered player', shortLabel: 'Player', hotkey: 'N' },
  { id: 'point', icon: MapPin, label: 'Anchor point', shortLabel: 'Point', hotkey: 'P' },
  { id: 'text-banner', icon: Type, label: 'Text fixed top or bottom', shortLabel: 'Text', hotkey: 'T' },
  { id: 'spotlight', icon: Sun, label: 'Focus highlight (dimmed background)', shortLabel: 'Highlight', hotkey: 'H' },
  { id: 'cylinder-spotlight', icon: Lightbulb, label: 'Spotlight beam under player', shortLabel: 'Spot', hotkey: 'G' },
  { id: 'vision-cone', icon: Eye, label: 'Field of view', shortLabel: 'Vision', hotkey: 'F' },
  { id: 'magnifier', icon: Search, label: 'Zoom into area', shortLabel: 'Mag', hotkey: 'M' },
  { id: 'distance', icon: Ruler, label: 'Measure distance', shortLabel: 'Dist', hotkey: 'R' },
  { id: 'linked-line', icon: Link2, label: 'Connect elements', shortLabel: 'Link', hotkey: 'L' },
  { id: 'image-layer', icon: ImagePlus, label: 'Keep image in front', shortLabel: 'Layer', hotkey: 'B' },
  { id: 'eraser', icon: Eraser, label: 'Remove element', shortLabel: 'Erase', hotkey: 'E' },
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

const loadUsage = (): Record<string, number> => {
  try { return JSON.parse(localStorage.getItem(USAGE_KEY) || '{}'); } catch { return {}; }
};

export const AnnotationToolbar = ({
  activeTool, setActiveTool, activeColor, setActiveColor, strokeWidth, setStrokeWidth,
  fillOpacity, setFillOpacity,
}: AnnotationToolbarProps) => {
  const showFillOpacity = ['rect', 'circle', 'spotlight', 'magnifier', 'semi-circle', 'vision-cone', 'space-oval'].includes(activeTool);
  const [recentColors, setRecentColors] = useState<string[]>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('annotation-recent-colours') || '[]');
      return Array.from(new Set(Array.isArray(raw) ? raw : [])).slice(0, 8) as string[];
    } catch { return []; }
  });
  const [usage, setUsage] = useState<Record<string, number>>(loadUsage);

  const handleSelectTool = (id: AnnotationTool) => {
    setActiveTool(id);
    if (id === 'select' || id === 'eraser') return;
    setUsage(prev => {
      const next = { ...prev, [id]: (prev[id] || 0) + 1 };
      try { localStorage.setItem(USAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const sortedTools: ToolDef[] = [
    tools.find(t => t.id === 'select')!,
    ...[...tools]
      .filter(t => t.id !== 'select')
      .sort((a, b) => (usage[b.id] || 0) - (usage[a.id] || 0)),
  ];

  return (
    <div className="flex h-full min-h-0">
      {/* Tool grid — fills the area under the video */}
      <div className="flex-1 min-w-0 flex flex-col p-3">
        <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2 shrink-0">Tools</p>
        <div
          className="grid gap-1.5 content-start overflow-y-auto pr-1"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))' }}
        >
          <TooltipProvider delayDuration={200}>
            {sortedTools.map(tool => {
              const isActive = activeTool === tool.id;
              return (
                <Tooltip key={tool.id}>
                  <TooltipTrigger asChild>
                    <button
                      className={`relative aspect-square flex items-center justify-center rounded-md transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground ring-1 ring-primary/60'
                          : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10'
                      }`}
                      onClick={() => handleSelectTool(tool.id)}
                    >
                      {tool.hotkey && (
                        <span className={`absolute top-0.5 right-0.5 text-[8px] font-mono leading-none px-0.5 rounded ${
                          isActive ? 'bg-black/30 text-white' : 'bg-black/40 text-white/60'
                        }`}>
                          {tool.hotkey}
                        </span>
                      )}
                      <tool.icon className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs space-y-0.5">
                    <p className="font-medium">{tool.shortLabel}{tool.hotkey ? ` (${tool.hotkey})` : ''}</p>
                    <p className="text-muted-foreground text-[10px]">{tool.label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
      </div>

      {/* Right column — width matches the right sidebar (w-60 = 240px) */}
      <div className="w-60 shrink-0 border-l border-white/10 bg-[#161a24] p-3 flex flex-col gap-3 overflow-y-auto">
        {/* Colour palette — fills the 240px column width */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Colour</p>
          <div className="grid grid-cols-9 gap-1">
            <TooltipProvider delayDuration={200}>
              {brandColors.map(({ color, label }) => (
                <Tooltip key={color}>
                  <TooltipTrigger asChild>
                    <button
                      className={`aspect-square rounded-full border-2 transition-transform ${
                        activeColor === color ? 'border-white scale-110' : 'border-white/10 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setActiveColor(color)}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px]">{label}</TooltipContent>
                </Tooltip>
              ))}
              <Tooltip>
                <TooltipTrigger asChild>
                  <label
                    className={`aspect-square rounded-full cursor-pointer border-2 transition-transform overflow-hidden ${
                      !brandColors.some(b => b.color === activeColor) && !recentColors.includes(activeColor)
                        ? 'border-white scale-110'
                        : 'border-white/30 hover:scale-105'
                    }`}
                    style={{ background: 'conic-gradient(red,yellow,lime,aqua,blue,magenta,red)' }}
                  >
                    <input
                      type="color"
                      value={activeColor}
                      onChange={e => {
                        setActiveColor(e.target.value);
                        setRecentColors(prev => {
                          const next = Array.from(new Set([e.target.value, ...prev])).slice(0, 8);
                          try { localStorage.setItem('annotation-recent-colours', JSON.stringify(next)); } catch {}
                          return next;
                        });
                      }}
                      className="sr-only"
                    />
                  </label>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[10px]">Custom colour</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {recentColors.filter(c => !brandColors.some(b => b.color === c)).length > 0 && (
            <div className="mt-1.5">
              <p className="text-[9px] text-white/30 mb-1">Recent</p>
              <div className="grid grid-cols-9 gap-1">
                {recentColors.filter(c => !brandColors.some(b => b.color === c)).slice(0, 9).map(c => (
                  <button
                    key={c}
                    className={`aspect-square rounded-full border transition-transform ${
                      activeColor === c ? 'border-white scale-110' : 'border-white/20 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setActiveColor(c)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sliders */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-[10px] text-white/40 uppercase">Thickness</Label>
            <span className="text-[10px] text-white/30 font-mono">{strokeWidth.toFixed(2)}</span>
          </div>
          <Slider
            value={[strokeWidth]}
            min={0.05} max={6} step={0.05}
            onValueChange={([v]) => setStrokeWidth(v)}
            className="[&_[role=slider]]:bg-white [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
          />
        </div>

        {showFillOpacity && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-[10px] text-white/40 uppercase">Fill</Label>
              <span className="text-[10px] text-white/30">{Math.round(fillOpacity * 100)}%</span>
            </div>
            <Slider
              value={[fillOpacity]}
              min={0} max={1} step={0.05}
              onValueChange={([v]) => setFillOpacity(v)}
              className="[&_[role=slider]]:bg-white [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
            />
          </div>
        )}
      </div>
    </div>
  );
};
