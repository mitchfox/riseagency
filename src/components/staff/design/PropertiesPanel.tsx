import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Pipette, CaseSensitive } from 'lucide-react';
import type { DesignElement } from './types';
import { FONT_FAMILIES } from './types';

function EyedropperButton({ onPick }: { onPick: (colour: string) => void }) {
  const handlePick = useCallback(async () => {
    try {
      if (!('EyeDropper' in window)) return;
      const dropper = new (window as any).EyeDropper();
      const result = await dropper.open();
      onPick(result.sRGBHex);
    } catch {
      // user cancelled
    }
  }, [onPick]);

  if (!('EyeDropper' in window)) return null;

  return (
    <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={handlePick} title="Pick colour from screen">
      <Pipette className="h-3.5 w-3.5" />
    </Button>
  );
}

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

      {/* Background toggle */}
      {(element.type === 'image' || element.type === 'shape') && (
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Layer Role</Label>
          <Button
            variant={element.isBackground ? 'default' : 'outline'}
            size="sm"
            className="w-full h-7 text-xs"
            onClick={() => update({ isBackground: !element.isBackground })}
          >
            {element.isBackground ? '✓ Background Layer' : 'Set as Background'}
          </Button>
          {element.isBackground && (
            <p className="text-[9px] text-muted-foreground">Double-click on canvas to select and move background layers.</p>
          )}
        </div>
      )}

      {/* Corner Radius */}
      {(element.type === 'image' || (element.type === 'shape' && element.shapeType === 'rectangle')) && (
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Corner Radius</Label>
          <div className="flex items-center gap-2">
            <Slider value={[element.borderRadius || 0]} min={0} max={Math.min(element.width, element.height) / 2} step={1} onValueChange={([v]) => update({ borderRadius: v })} className="flex-1" />
            <span className="w-8 text-right">{element.borderRadius || 0}px</span>
          </div>
        </div>
      )}

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
          <div className="space-y-1.5">
            <div className="flex gap-1 flex-wrap">
              <Button variant={element.fontWeight === 'bold' || element.fontWeight === '700' ? 'default' : 'outline'} size="icon" className="h-7 w-7"
                onClick={() => update({ fontWeight: element.fontWeight === 'bold' || element.fontWeight === '700' ? '400' : 'bold' })} title="Bold (Ctrl+B)">
                <Bold className="h-3 w-3" />
              </Button>
              <Button variant={element.fontStyle === 'italic' ? 'default' : 'outline'} size="icon" className="h-7 w-7"
                onClick={() => update({ fontStyle: element.fontStyle === 'italic' ? 'normal' : 'italic' })} title="Italic (Ctrl+I)">
                <Italic className="h-3 w-3" />
              </Button>
              <Button variant={element.textDecoration === 'underline' ? 'default' : 'outline'} size="icon" className="h-7 w-7"
                onClick={() => update({ textDecoration: element.textDecoration === 'underline' ? 'none' : 'underline' })} title="Underline (Ctrl+U)">
                <Underline className="h-3 w-3" />
              </Button>
              <Button variant={element.textTransform === 'uppercase' ? 'default' : 'outline'} size="icon" className="h-7 w-7"
                onClick={() => update({ textTransform: element.textTransform === 'uppercase' ? 'none' : 'uppercase' })} title="Uppercase">
                <CaseSensitive className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex gap-1">
              <Button variant={element.textAlign === 'left' ? 'default' : 'outline'} size="icon" className="h-7 w-7"
                onClick={() => update({ textAlign: 'left' })} title="Align left">
                <AlignLeft className="h-3 w-3" />
              </Button>
              <Button variant={element.textAlign === 'center' ? 'default' : 'outline'} size="icon" className="h-7 w-7"
                onClick={() => update({ textAlign: 'center' })} title="Align centre">
                <AlignCenter className="h-3 w-3" />
              </Button>
              <Button variant={element.textAlign === 'right' ? 'default' : 'outline'} size="icon" className="h-7 w-7"
                onClick={() => update({ textAlign: 'right' })} title="Align right">
                <AlignRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Colour</Label>
            <div className="flex gap-2 items-center">
              <input type="color" value={element.color || '#000000'} onChange={e => update({ color: e.target.value })} className="w-7 h-7 rounded cursor-pointer border" />
              <Input value={element.color || '#000000'} onChange={e => update({ color: e.target.value })} className="h-7 text-xs flex-1" />
              <EyedropperButton onPick={(c) => update({ color: c })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Letter Spacing</Label>
            <div className="flex items-center gap-2">
              <Slider value={[element.letterSpacing || 0]} min={-5} max={20} step={0.5} onValueChange={([v]) => update({ letterSpacing: v })} className="flex-1" />
              <span className="w-8 text-right">{element.letterSpacing || 0}px</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Line Height</Label>
            <div className="flex items-center gap-2">
              <Slider value={[(element.lineHeight || 1.2) * 100]} min={80} max={300} step={5} onValueChange={([v]) => update({ lineHeight: v / 100 })} className="flex-1" />
              <span className="w-8 text-right">{(element.lineHeight || 1.2).toFixed(1)}</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Text Shadow</Label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { label: 'None', value: '' },
                { label: 'Soft', value: '2px 2px 4px rgba(0,0,0,0.3)' },
                { label: 'Hard', value: '3px 3px 0px rgba(0,0,0,0.5)' },
                { label: 'Glow', value: '0 0 10px rgba(255,255,255,0.8)' },
                { label: 'Lift', value: '0 4px 8px rgba(0,0,0,0.4)' },
                { label: 'Outline', value: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' },
              ].map(s => (
                <button
                  key={s.label}
                  onClick={() => update({ textShadow: s.value })}
                  className={`text-[10px] py-1 rounded border text-center transition-colors ${element.textShadow === s.value ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                >
                  {s.label}
                </button>
              ))}
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
              <EyedropperButton onPick={(c) => update({ fill: c })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Border Colour</Label>
            <div className="flex gap-2 items-center">
              <input type="color" value={element.stroke || '#000000'} onChange={e => update({ stroke: e.target.value })} className="w-7 h-7 rounded cursor-pointer border" />
              <Input value={element.stroke || '#000000'} onChange={e => update({ stroke: e.target.value })} className="h-7 text-xs flex-1" />
              <EyedropperButton onPick={(c) => update({ stroke: c })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Border Width</Label>
            <div className="flex items-center gap-2">
              <Slider value={[element.strokeWidth || 0]} min={0} max={20} step={1} onValueChange={([v]) => update({ strokeWidth: v })} className="flex-1" />
              <span className="w-8 text-right">{element.strokeWidth || 0}px</span>
            </div>
          </div>
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
