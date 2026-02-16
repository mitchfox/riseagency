import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import type { DesignElement } from './types';
import { FONT_FAMILIES } from './types';

interface PropertiesPanelProps {
  element: DesignElement | null;
  onUpdate: (id: string, updates: Partial<DesignElement>) => void;
}

export function PropertiesPanel({ element, onUpdate }: PropertiesPanelProps) {
  if (!element) {
    return (
      <div className="p-4 text-center text-xs text-muted-foreground">
        Select an element to edit its properties
      </div>
    );
  }

  const update = (updates: Partial<DesignElement>) => onUpdate(element.id, updates);

  return (
    <div className="p-3 space-y-4 overflow-y-auto text-xs">
      {/* Name */}
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Name</Label>
        <Input value={element.name} onChange={e => update({ name: e.target.value })} className="h-7 text-xs" />
      </div>

      {/* Position & Size */}
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Position & Size</Label>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground w-3">X</span>
            <Input type="number" value={Math.round(element.x)} onChange={e => update({ x: Number(e.target.value) })} className="h-7 text-xs" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground w-3">Y</span>
            <Input type="number" value={Math.round(element.y)} onChange={e => update({ y: Number(e.target.value) })} className="h-7 text-xs" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground w-3">W</span>
            <Input type="number" value={Math.round(element.width)} onChange={e => update({ width: Number(e.target.value) })} className="h-7 text-xs" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground w-3">H</span>
            <Input type="number" value={Math.round(element.height)} onChange={e => update({ height: Number(e.target.value) })} className="h-7 text-xs" />
          </div>
        </div>
      </div>

      {/* Rotation */}
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Rotation</Label>
        <div className="flex items-center gap-2">
          <Slider value={[element.rotation]} min={0} max={360} step={1} onValueChange={([v]) => update({ rotation: v })} className="flex-1" />
          <span className="w-8 text-right">{element.rotation}°</span>
        </div>
      </div>

      {/* Opacity */}
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Opacity</Label>
        <div className="flex items-center gap-2">
          <Slider value={[element.opacity * 100]} min={0} max={100} step={1} onValueChange={([v]) => update({ opacity: v / 100 })} className="flex-1" />
          <span className="w-8 text-right">{Math.round(element.opacity * 100)}%</span>
        </div>
      </div>

      {/* Text properties */}
      {element.type === 'text' && (
        <>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Font</Label>
            <Select value={element.fontFamily} onValueChange={v => update({ fontFamily: v })}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map(f => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Size</Label>
            <Input type="number" value={element.fontSize} onChange={e => update({ fontSize: Number(e.target.value) })} className="h-7 text-xs" />
          </div>
          <div className="flex gap-1">
            <Button variant={element.fontWeight === 'bold' || element.fontWeight === '700' ? 'default' : 'outline'} size="icon" className="h-7 w-7"
              onClick={() => update({ fontWeight: element.fontWeight === 'bold' || element.fontWeight === '700' ? '400' : 'bold' })}>
              <Bold className="h-3 w-3" />
            </Button>
            <Button variant={element.fontStyle === 'italic' ? 'default' : 'outline'} size="icon" className="h-7 w-7"
              onClick={() => update({ fontStyle: element.fontStyle === 'italic' ? 'normal' : 'italic' })}>
              <Italic className="h-3 w-3" />
            </Button>
            <Button variant={element.textDecoration === 'underline' ? 'default' : 'outline'} size="icon" className="h-7 w-7"
              onClick={() => update({ textDecoration: element.textDecoration === 'underline' ? 'none' : 'underline' })}>
              <Underline className="h-3 w-3" />
            </Button>
            <div className="w-px bg-border mx-1" />
            <Button variant={element.textAlign === 'left' ? 'default' : 'outline'} size="icon" className="h-7 w-7"
              onClick={() => update({ textAlign: 'left' })}>
              <AlignLeft className="h-3 w-3" />
            </Button>
            <Button variant={element.textAlign === 'center' ? 'default' : 'outline'} size="icon" className="h-7 w-7"
              onClick={() => update({ textAlign: 'center' })}>
              <AlignCenter className="h-3 w-3" />
            </Button>
            <Button variant={element.textAlign === 'right' ? 'default' : 'outline'} size="icon" className="h-7 w-7"
              onClick={() => update({ textAlign: 'right' })}>
              <AlignRight className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Colour</Label>
            <div className="flex gap-2 items-center">
              <input type="color" value={element.color || '#000000'} onChange={e => update({ color: e.target.value })} className="w-7 h-7 rounded cursor-pointer border" />
              <Input value={element.color || '#000000'} onChange={e => update({ color: e.target.value })} className="h-7 text-xs flex-1" />
            </div>
          </div>
        </>
      )}

      {/* Shape properties */}
      {element.type === 'shape' && (
        <>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Fill</Label>
            <div className="flex gap-2 items-center">
              <input type="color" value={element.fill || '#3b82f6'} onChange={e => update({ fill: e.target.value })} className="w-7 h-7 rounded cursor-pointer border" />
              <Input value={element.fill || '#3b82f6'} onChange={e => update({ fill: e.target.value })} className="h-7 text-xs flex-1" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Stroke</Label>
            <div className="flex gap-2 items-center">
              <input type="color" value={element.stroke || '#000000'} onChange={e => update({ stroke: e.target.value })} className="w-7 h-7 rounded cursor-pointer border" />
              <Input type="number" value={element.strokeWidth || 0} onChange={e => update({ strokeWidth: Number(e.target.value) })} className="h-7 text-xs w-16" placeholder="Width" />
            </div>
          </div>
          {element.shapeType === 'rectangle' && (
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Corner Radius</Label>
              <Slider value={[element.borderRadius || 0]} min={0} max={100} step={1} onValueChange={([v]) => update({ borderRadius: v })} />
            </div>
          )}
        </>
      )}

      {/* Line properties */}
      {element.type === 'line' && (
        <>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Colour</Label>
            <div className="flex gap-2 items-center">
              <input type="color" value={element.fill || '#000000'} onChange={e => update({ fill: e.target.value })} className="w-7 h-7 rounded cursor-pointer border" />
              <Input value={element.fill || '#000000'} onChange={e => update({ fill: e.target.value })} className="h-7 text-xs flex-1" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Thickness</Label>
            <Slider value={[element.strokeWidth || 2]} min={1} max={20} step={1} onValueChange={([v]) => update({ strokeWidth: v })} />
          </div>
        </>
      )}

      {/* Image properties */}
      {element.type === 'image' && (
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Fit</Label>
          <Select value={element.objectFit || 'cover'} onValueChange={v => update({ objectFit: v as any })}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cover">Cover</SelectItem>
              <SelectItem value="contain">Contain</SelectItem>
              <SelectItem value="fill">Fill</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
