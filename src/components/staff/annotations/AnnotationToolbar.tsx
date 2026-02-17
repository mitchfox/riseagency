import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MousePointer2, Minus, MoveRight, Square, Circle,
  Sun, Pencil, UserCircle, Eraser, Eye, Ruler, Search, Link2, MapPin, CircleDot,
  Redo2, Eclipse, ImagePlus
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

const tools: { id: AnnotationTool; icon: React.ComponentType<any>; label: string; shortLabel: string; hotkey: string; group: string }[] = [
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
  { id: 'spotlight', icon: Sun, label: 'Focus highlight', shortLabel: 'Spot', hotkey: 'H', group: 'effect' },
  { id: 'vision-cone', icon: Eye, label: 'Field of view', shortLabel: 'Vision', hotkey: 'V', group: 'effect' },
  { id: 'magnifier', icon: Search, label: 'Zoom into area', shortLabel: 'Mag', hotkey: 'M', group: 'effect' },
  { id: 'distance', icon: Ruler, label: 'Measure distance', shortLabel: 'Dist', hotkey: 'R', group: 'effect' },
  { id: 'linked-line', icon: Link2, label: 'Connect elements', shortLabel: 'Link', hotkey: 'L', group: 'effect' },
  { id: 'image-layer', icon: ImagePlus, label: 'Keep image in front', shortLabel: 'Layer', hotkey: 'B', group: 'effect' },
  { id: 'eraser', icon: Eraser, label: 'Remove element', shortLabel: 'Erase', hotkey: 'E', group: 'util' },
];

const colors = ['#ff0000', '#ffff00', '#00ff00', '#00bfff', '#ffffff', '#ff8c00', '#ff00ff', '#000000'];

export const AnnotationToolbar = ({
  activeTool, setActiveTool, activeColor, setActiveColor, strokeWidth, setStrokeWidth,
  fillOpacity, setFillOpacity,
}: AnnotationToolbarProps) => {
  const showFillOpacity = ['rect', 'circle', 'spotlight', 'magnifier', 'semi-circle', 'vision-cone', 'space-oval'].includes(activeTool);

  return (
    <div className="w-14 bg-[#161a24] border-r border-white/10 flex flex-col items-center py-2 gap-0.5 shrink-0 overflow-y-auto">
      <TooltipProvider delayDuration={200}>
        {tools.map((tool, i) => {
          const showDivider = i > 0 && tool.group !== tools[i - 1].group;
          return (
            <div key={tool.id} className="flex flex-col items-center">
              {showDivider && <div className="my-1 w-8 border-t border-white/10" />}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={`w-10 h-10 flex flex-col items-center justify-center rounded-md transition-colors gap-0 ${
                      activeTool === tool.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-white/50 hover:text-white hover:bg-white/10'
                    }`}
                    onClick={() => setActiveTool(tool.id)}
                  >
                    <tool.icon className="w-3.5 h-3.5" />
                    <span className="text-[7px] leading-tight mt-0.5 opacity-60">{tool.shortLabel}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs space-y-0.5">
                  <p className="font-medium">{tool.shortLabel}{tool.hotkey ? ` (${tool.hotkey})` : ''}</p>
                  <p className="text-muted-foreground text-[10px]">{tool.label}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          );
        })}
      </TooltipProvider>

      <div className="my-2 w-8 border-t border-white/10" />

      <div className="grid grid-cols-2 gap-1 px-1">
        {colors.map(c => (
          <button
            key={c}
            className={`w-5 h-5 rounded-full border-2 transition-transform ${
              activeColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'
            }`}
            style={{ backgroundColor: c }}
            onClick={() => setActiveColor(c)}
          />
        ))}
      </div>

      <div className="my-2 w-8 border-t border-white/10" />

      <div className="flex flex-col items-center gap-1 px-1 w-full">
        <Label className="text-[8px] text-white/40 uppercase">Thickness</Label>
        <div className="flex items-center justify-center w-full px-0.5">
          <span className="text-[9px] text-white/30 font-mono w-4 text-center">{strokeWidth}</span>
        </div>
        <div className="w-10 py-1">
          <Slider
            value={[strokeWidth]}
            min={1} max={20} step={1}
            onValueChange={([v]) => setStrokeWidth(v)}
            className="[&_[role=slider]]:bg-white [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
          />
        </div>
        <div className="flex items-center justify-center gap-0.5 mt-0.5">
          {[1, 3, 5, 8].map(w => (
            <button
              key={w}
              className={`flex items-center justify-center w-6 h-5 rounded ${
                strokeWidth === w ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
              onClick={() => setStrokeWidth(w)}
              title={`${w}px`}
            >
              <div className="rounded-full bg-white" style={{ width: `${Math.min(w * 2, 12)}px`, height: `${Math.max(w, 2)}px` }} />
            </button>
          ))}
        </div>
      </div>

      {showFillOpacity && (
        <>
          <div className="my-2 w-8 border-t border-white/10" />
          <div className="flex flex-col items-center gap-1 px-1 w-full">
            <Label className="text-[8px] text-white/40 uppercase">Fill</Label>
            <div className="w-10">
              <Slider
                value={[fillOpacity]}
                min={0} max={1} step={0.05}
                onValueChange={([v]) => setFillOpacity(v)}
                className="[&_[role=slider]]:bg-white [&_[role=slider]]:h-2 [&_[role=slider]]:w-2"
                orientation="vertical"
              />
            </div>
            <span className="text-[8px] text-white/30">{Math.round(fillOpacity * 100)}%</span>
          </div>
        </>
      )}
    </div>
  );
};
