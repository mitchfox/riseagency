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

const tools: { id: AnnotationTool; icon: React.ComponentType<any>; label: string; group?: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select (V)', group: 'core' },
  { id: 'line', icon: Minus, label: 'Line', group: 'draw' },
  { id: 'arrow', icon: MoveRight, label: 'Arrow', group: 'draw' },
  { id: 'curve', icon: Spline, label: 'Curve', group: 'draw' },
  { id: 'freehand', icon: Pencil, label: 'Freehand', group: 'draw' },
  { id: 'rect', icon: Square, label: 'Rectangle', group: 'shape' },
  { id: 'circle', icon: Circle, label: 'Circle', group: 'shape' },
  { id: 'text', icon: Type, label: 'Text', group: 'label' },
  { id: 'player-marker', icon: UserCircle, label: 'Player Marker', group: 'label' },
  { id: 'spotlight', icon: Sun, label: 'Spotlight', group: 'effect' },
  { id: 'vision-cone', icon: Eye, label: 'Vision Cone', group: 'effect' },
  { id: 'magnifier', icon: Search, label: 'Magnifier', group: 'effect' },
  { id: 'distance', icon: Ruler, label: 'Distance Measure', group: 'effect' },
  { id: 'linked-line', icon: Link2, label: 'Linked Line', group: 'effect' },
  { id: 'tracker', icon: ScanEye, label: 'Motion Tracker', group: 'track' },
  { id: 'eraser', icon: Eraser, label: 'Eraser', group: 'util' },
];

const colors = ['#ff0000', '#ffff00', '#00ff00', '#00bfff', '#ffffff', '#ff8c00', '#ff00ff', '#000000'];

const groupDividers = new Set(['draw', 'shape', 'label', 'effect', 'track', 'util']);
let lastGroup = '';

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
                <TooltipContent side="right" className="text-xs">{tool.label}</TooltipContent>
              </Tooltip>
            </div>
          );
        })}
      </TooltipProvider>

      <div className="my-2 w-8 border-t border-white/10" />

      {/* Colour palette */}
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

      {/* Stroke width */}
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
