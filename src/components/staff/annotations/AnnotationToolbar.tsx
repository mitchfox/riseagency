import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MousePointer2, Minus, MoveRight, Spline, Square, Circle,
  Sun, Type, Pencil, UserCircle, Eraser, Eye, Ruler, Search, Link2, ScanEye
} from "lucide-react";
import { AnnotationTool } from "./AnnotationEditor";

interface AnnotationToolbarProps {
  activeTool: AnnotationTool;
  setActiveTool: (tool: AnnotationTool) => void;
  activeColor: string;
  setActiveColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (w: number) => void;
}

const tools: { id: AnnotationTool; icon: React.ComponentType<any>; label: string; desc: string; group: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select', desc: 'Select & move elements (V)', group: 'core' },
  { id: 'line', icon: Minus, label: 'Line', desc: 'Draw a straight line', group: 'draw' },
  { id: 'arrow', icon: MoveRight, label: 'Arrow', desc: 'Directional arrow', group: 'draw' },
  { id: 'curve', icon: Spline, label: 'Curve', desc: 'Curved path between points', group: 'draw' },
  { id: 'freehand', icon: Pencil, label: 'Freehand', desc: 'Draw freely', group: 'draw' },
  { id: 'rect', icon: Square, label: 'Rectangle', desc: 'Highlight an area', group: 'shape' },
  { id: 'circle', icon: Circle, label: 'Circle', desc: 'Circle or ring', group: 'shape' },
  { id: 'text', icon: Type, label: 'Text', desc: 'Add a text label', group: 'label' },
  { id: 'player-marker', icon: UserCircle, label: 'Player', desc: 'Numbered player marker', group: 'label' },
  { id: 'spotlight', icon: Sun, label: 'Spotlight', desc: 'Highlight focus area', group: 'effect' },
  { id: 'vision-cone', icon: Eye, label: 'Vision Cone', desc: 'Show field of view', group: 'effect' },
  { id: 'magnifier', icon: Search, label: 'Magnifier', desc: 'Zoom into an area', group: 'effect' },
  { id: 'distance', icon: Ruler, label: 'Distance', desc: 'Measure between points', group: 'effect' },
  { id: 'linked-line', icon: Link2, label: 'Link', desc: 'Connect two elements', group: 'effect' },
  { id: 'tracker', icon: ScanEye, label: 'Tracker', desc: 'Track object through frames', group: 'track' },
  { id: 'eraser', icon: Eraser, label: 'Eraser', desc: 'Remove an element', group: 'util' },
];

const colors = ['#ff0000', '#ffff00', '#00ff00', '#00bfff', '#ffffff', '#ff8c00', '#ff00ff', '#000000'];

export const AnnotationToolbar = ({
  activeTool, setActiveTool, activeColor, setActiveColor, strokeWidth, setStrokeWidth,
}: AnnotationToolbarProps) => {
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
                    className={`w-10 h-10 flex items-center justify-center rounded-md transition-colors ${
                      activeTool === tool.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-white/50 hover:text-white hover:bg-white/10'
                    }`}
                    onClick={() => setActiveTool(tool.id)}
                  >
                    <tool.icon className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs space-y-0.5">
                  <p className="font-medium">{tool.label}</p>
                  <p className="text-muted-foreground text-[10px]">{tool.desc}</p>
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

      <div className="flex flex-col items-center gap-1">
        {[2, 3, 5, 8].map(w => (
          <button
            key={w}
            className={`flex items-center justify-center w-8 h-6 rounded ${
              strokeWidth === w ? 'bg-white/20' : 'hover:bg-white/10'
            }`}
            onClick={() => setStrokeWidth(w)}
          >
            <div className="rounded-full bg-white" style={{ width: `${w * 3}px`, height: `${Math.max(w, 2)}px` }} />
          </button>
        ))}
      </div>
    </div>
  );
};
