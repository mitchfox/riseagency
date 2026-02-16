import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { IMAGE_FILTERS } from './types';
import type { DesignElement } from './types';

interface FiltersPanelProps {
  element: DesignElement | null;
  onUpdate: (id: string, updates: Partial<DesignElement>) => void;
}

export function FiltersPanel({ element, onUpdate }: FiltersPanelProps) {
  if (!element || element.type !== 'image') {
    return (
      <div className="p-4 text-center text-xs text-muted-foreground">
        Select an image to apply filters
      </div>
    );
  }

  const currentFilter = element.filter || 'none';

  return (
    <div className="p-3 space-y-4 overflow-y-auto text-xs">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Presets</Label>
      <div className="grid grid-cols-2 gap-1.5">
        {IMAGE_FILTERS.map(f => (
          <button
            key={f.name}
            onClick={() => onUpdate(element.id, { filter: f.value })}
            className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all ${currentFilter === f.value ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30'}`}
          >
            <img
              src={element.src}
              alt={f.name}
              className="w-full h-full object-cover"
              style={{ filter: f.value === 'none' ? undefined : f.value }}
            />
            <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] py-0.5 text-center">{f.name}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3 pt-2">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Custom Adjustments</Label>
        <FilterSlider label="Brightness" element={element} onUpdate={onUpdate} prop="brightness" min={0} max={200} defaultVal={100} unit="%" />
        <FilterSlider label="Contrast" element={element} onUpdate={onUpdate} prop="contrast" min={0} max={200} defaultVal={100} unit="%" />
        <FilterSlider label="Saturation" element={element} onUpdate={onUpdate} prop="saturate" min={0} max={200} defaultVal={100} unit="%" />
        <FilterSlider label="Blur" element={element} onUpdate={onUpdate} prop="blur" min={0} max={20} defaultVal={0} unit="px" />
        <FilterSlider label="Hue" element={element} onUpdate={onUpdate} prop="hue-rotate" min={0} max={360} defaultVal={0} unit="deg" />
      </div>
    </div>
  );
}

function FilterSlider({ label, element, onUpdate, prop, min, max, defaultVal, unit }: {
  label: string; element: DesignElement; onUpdate: (id: string, updates: Partial<DesignElement>) => void;
  prop: string; min: number; max: number; defaultVal: number; unit: string;
}) {
  // Parse current value from filter string
  const filter = element.filter || '';
  const regex = new RegExp(`${prop}\\((\\d+(?:\\.\\d+)?)${unit}\\)`);
  const match = filter.match(regex);
  const value = match ? parseFloat(match[1]) : defaultVal;

  const updateFilter = (newVal: number) => {
    let filterStr = element.filter || '';
    const filterPart = `${prop}(${newVal}${unit})`;

    if (regex.test(filterStr)) {
      filterStr = filterStr.replace(regex, filterPart);
    } else {
      filterStr = filterStr ? `${filterStr} ${filterPart}` : filterPart;
    }

    // Clean up default values
    filterStr = filterStr.replace(/brightness\(100%\)/g, '').replace(/contrast\(100%\)/g, '').replace(/saturate\(100%\)/g, '').replace(/blur\(0px\)/g, '').replace(/hue-rotate\(0deg\)/g, '').trim();

    onUpdate(element.id, { filter: filterStr || 'none' });
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="text-[10px] font-mono">{Math.round(value)}{unit}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={([v]) => updateFilter(v)} />
    </div>
  );
}
