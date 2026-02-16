import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Palette, Type as TypeIcon } from 'lucide-react';
import { FONT_FAMILIES, type BrandKit } from './types';

const generateId = () => Math.random().toString(36).slice(2, 11);

interface BrandKitPanelProps {
  onApplyColour: (colour: string) => void;
  onApplyFont: (font: string) => void;
  onAddLogo: (url: string) => void;
}

export function BrandKitPanel({ onApplyColour, onApplyFont, onAddLogo }: BrandKitPanelProps) {
  const [kit, setKit] = useState<BrandKit>(() => {
    const saved = localStorage.getItem('design_brand_kit');
    return saved ? JSON.parse(saved) : {
      id: generateId(),
      name: 'My Brand',
      colours: ['#1a1a2e', '#16213e', '#0f3460', '#e94560', '#ffffff'],
      fonts: ['Inter', 'Impact'],
      logos: [],
    };
  });
  const [newColour, setNewColour] = useState('#000000');

  const save = (updated: BrandKit) => {
    setKit(updated);
    localStorage.setItem('design_brand_kit', JSON.stringify(updated));
  };

  const addColour = () => {
    if (!kit.colours.includes(newColour)) {
      save({ ...kit, colours: [...kit.colours, newColour] });
    }
  };

  const removeColour = (c: string) => {
    save({ ...kit, colours: kit.colours.filter(x => x !== c) });
  };

  const addFont = (f: string) => {
    if (!kit.fonts.includes(f)) {
      save({ ...kit, fonts: [...kit.fonts, f] });
    }
  };

  const removeFont = (f: string) => {
    save({ ...kit, fonts: kit.fonts.filter(x => x !== f) });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        const url = ev.target.result as string;
        save({ ...kit, logos: [...kit.logos, url] });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="p-3 space-y-4 text-xs">
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Brand Name</Label>
        <Input value={kit.name} onChange={e => save({ ...kit, name: e.target.value })} className="h-7 text-xs" />
      </div>

      {/* Colours */}
      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <Palette className="h-3 w-3" /> Brand Colours
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {kit.colours.map(c => (
            <button
              key={c}
              className="group relative w-7 h-7 rounded border border-border/50 hover:ring-2 hover:ring-primary/50 transition-all"
              style={{ backgroundColor: c }}
              onClick={() => onApplyColour(c)}
              title={c}
            >
              <span
                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-destructive text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={e => { e.stopPropagation(); removeColour(c); }}
              >×</span>
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 items-center">
          <input type="color" value={newColour} onChange={e => setNewColour(e.target.value)} className="w-7 h-7 rounded cursor-pointer border" />
          <Input value={newColour} onChange={e => setNewColour(e.target.value)} className="h-7 text-xs flex-1" />
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={addColour}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Fonts */}
      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <TypeIcon className="h-3 w-3" /> Brand Fonts
        </Label>
        <div className="space-y-1">
          {kit.fonts.map(f => (
            <div key={f} className="flex items-center justify-between px-2 py-1 rounded bg-muted/50 hover:bg-muted transition-colors">
              <button className="text-xs hover:text-primary transition-colors" style={{ fontFamily: f }} onClick={() => onApplyFont(f)}>{f}</button>
              <button className="text-muted-foreground hover:text-destructive" onClick={() => removeFont(f)}>
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <select className="w-full h-7 text-xs border rounded px-1 bg-background" onChange={e => { if (e.target.value) addFont(e.target.value); e.target.value = ''; }}>
          <option value="">Add font...</option>
          {FONT_FAMILIES.filter(f => !kit.fonts.includes(f)).map(f => (
            <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
          ))}
        </select>
      </div>

      {/* Logos */}
      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Brand Logos</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {kit.logos.map((url, i) => (
            <div key={i} className="group relative aspect-square rounded border overflow-hidden bg-muted/30">
              <img src={url} alt="Logo" className="w-full h-full object-contain p-1" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center gap-1 transition-colors">
                <button className="opacity-0 group-hover:opacity-100 text-white text-[10px] px-1.5 py-0.5 bg-primary rounded" onClick={() => onAddLogo(url)}>Use</button>
                <button className="opacity-0 group-hover:opacity-100 text-white text-[10px] px-1.5 py-0.5 bg-destructive rounded" onClick={() => save({ ...kit, logos: kit.logos.filter((_, j) => j !== i) })}>×</button>
              </div>
            </div>
          ))}
        </div>
        <label className="flex items-center justify-center gap-1.5 px-2 py-1.5 border border-dashed rounded cursor-pointer hover:bg-muted/50 transition-colors text-muted-foreground">
          <Plus className="h-3 w-3" /> Upload logo
          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
        </label>
      </div>
    </div>
  );
}
