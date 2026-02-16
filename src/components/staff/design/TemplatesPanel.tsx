import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { DESIGN_TEMPLATES, type DesignTemplate } from './types';

interface TemplatesPanelProps {
  onApplyTemplate: (template: DesignTemplate) => void;
}

export function TemplatesPanel({ onApplyTemplate }: TemplatesPanelProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = Array.from(new Set(DESIGN_TEMPLATES.map(t => t.category)));

  const filtered = DESIGN_TEMPLATES.filter(t => {
    if (search) return t.name.toLowerCase().includes(search.toLowerCase());
    if (activeCategory) return t.category === activeCategory;
    return true;
  });

  return (
    <div className="flex flex-col h-full text-xs">
      <div className="px-3 py-2 space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..." className="h-7 text-xs pl-7" />
        </div>
        <div className="flex gap-1 flex-wrap">
          <Button variant={activeCategory === null ? 'default' : 'outline'} size="sm" className="h-5 text-[10px] px-2" onClick={() => setActiveCategory(null)}>All</Button>
          {categories.map(c => (
            <Button key={c} variant={activeCategory === c ? 'default' : 'outline'} size="sm" className="h-5 text-[10px] px-2" onClick={() => setActiveCategory(c)}>{c}</Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
        {filtered.map(template => (
          <button
            key={template.id}
            onClick={() => onApplyTemplate(template)}
            className="w-full group rounded-lg border overflow-hidden hover:border-primary/50 hover:shadow-sm transition-all text-left"
          >
            <div
              className="aspect-video flex items-center justify-center relative"
              style={{ backgroundColor: template.background }}
            >
              {/* Mini preview */}
              <div className="absolute inset-2 flex flex-col items-center justify-center gap-1">
                {template.elements.slice(0, 3).map((el, i) => {
                  if (el.type === 'text') {
                    return (
                      <div
                        key={i}
                        className="truncate max-w-full"
                        style={{
                          fontSize: Math.min((el.fontSize || 32) * 0.12, 12),
                          fontFamily: el.fontFamily,
                          fontWeight: el.fontWeight as any,
                          color: el.color || '#fff',
                          textAlign: (el.textAlign as any) || 'center',
                        }}
                      >
                        {el.text}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 text-white text-[10px] bg-primary px-2 py-1 rounded transition-opacity">Use Template</span>
              </div>
            </div>
            <div className="px-2 py-1.5 border-t">
              <p className="text-[11px] font-medium truncate">{template.name}</p>
              <p className="text-[9px] text-muted-foreground">{template.width}×{template.height} · {template.category}</p>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-6">No templates found</p>
        )}
      </div>
    </div>
  );
}
