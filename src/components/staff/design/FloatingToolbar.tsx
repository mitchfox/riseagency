import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Trash2, Copy, Lock, Unlock, FlipHorizontal, FlipVertical,
  ArrowUp, ArrowDown, ArrowUpToLine, ArrowDownToLine,
  CornerUpRight, Eye, EyeOff,
} from 'lucide-react';
import type { DesignElement } from './types';

interface FloatingToolbarProps {
  element: DesignElement;
  zoom: number;
  onUpdate: (id: string, updates: Partial<DesignElement>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveLayer: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
}

export function FloatingToolbar({ element, zoom, onUpdate, onDelete, onDuplicate, onMoveLayer }: FloatingToolbarProps) {
  const update = (updates: Partial<DesignElement>) => onUpdate(element.id, updates);

  const toolbarTop = element.y - 44 / zoom;
  const toolbarLeft = element.x + element.width / 2;

  const Btn = ({ onClick, icon: Icon, label, active }: { onClick: () => void; icon: any; label: string; active?: boolean }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${active ? 'bg-purple-500/20 text-purple-400' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-[10px]">{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: toolbarLeft,
        top: toolbarTop,
        transform: `translateX(-50%) scale(${1 / zoom})`,
        transformOrigin: 'bottom center',
        zIndex: 10000,
        pointerEvents: 'all',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-0.5 bg-card border border-border rounded-lg shadow-lg px-1 py-0.5">
        {/* Colour swatches for shapes/text */}
        {(element.type === 'shape' || element.type === 'text' || element.type === 'line') && (
          <>
            <input
              type="color"
              value={element.type === 'text' ? (element.color || '#000000') : (element.fill || '#3b82f6')}
              onChange={(e) => {
                if (element.type === 'text') update({ color: e.target.value });
                else update({ fill: e.target.value });
              }}
              className="w-6 h-6 rounded-full cursor-pointer border-0 p-0"
              title="Colour"
            />
            <div className="w-px h-4 bg-border mx-0.5" />
          </>
        )}

        {/* Flip */}
        <Popover>
          <PopoverTrigger asChild>
            <div><Btn onClick={() => {}} icon={FlipHorizontal} label="Flip" /></div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-1 flex gap-0.5" side="top" align="center">
            <Btn onClick={() => update({ rotation: (element.rotation + 180) % 360 })} icon={FlipHorizontal} label="Flip Horizontal" />
            <Btn onClick={() => update({ rotation: element.rotation === 0 ? 180 : 0 })} icon={FlipVertical} label="Flip Vertical" />
          </PopoverContent>
        </Popover>

        {/* Position / Layer ordering */}
        <Popover>
          <PopoverTrigger asChild>
            <div><Btn onClick={() => {}} icon={ArrowUp} label="Position" /></div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-1 flex gap-0.5" side="top" align="center">
            <Btn onClick={() => onMoveLayer(element.id, 'top')} icon={ArrowUpToLine} label="Bring to Front" />
            <Btn onClick={() => onMoveLayer(element.id, 'up')} icon={ArrowUp} label="Bring Forward" />
            <Btn onClick={() => onMoveLayer(element.id, 'down')} icon={ArrowDown} label="Send Backward" />
            <Btn onClick={() => onMoveLayer(element.id, 'bottom')} icon={ArrowDownToLine} label="Send to Back" />
          </PopoverContent>
        </Popover>

        <div className="w-px h-4 bg-border mx-0.5" />

        {/* Visibility */}
        <Btn
          onClick={() => update({ visible: !element.visible })}
          icon={element.visible ? Eye : EyeOff}
          label={element.visible ? 'Hide' : 'Show'}
        />

        {/* Lock */}
        <Btn
          onClick={() => update({ locked: !element.locked })}
          icon={element.locked ? Lock : Unlock}
          label={element.locked ? 'Unlock' : 'Lock'}
          active={element.locked}
        />

        <div className="w-px h-4 bg-border mx-0.5" />

        {/* Duplicate */}
        <Btn onClick={onDuplicate} icon={Copy} label="Duplicate" />

        {/* Delete */}
        <Btn onClick={onDelete} icon={Trash2} label="Delete" />
      </div>
    </div>
  );
}
