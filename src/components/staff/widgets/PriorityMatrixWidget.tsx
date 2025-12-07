import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface PriorityItem {
  id: string;
  title: string;
  quadrant: 'urgent-important' | 'not-urgent-important' | 'urgent-not-important' | 'not-urgent-not-important';
}

const QUADRANT_CONFIG = {
  'urgent-important': { label: 'Do First', color: 'bg-red-500/10 border-red-500/30', short: 'DO' },
  'not-urgent-important': { label: 'Schedule', color: 'bg-blue-500/10 border-blue-500/30', short: 'PLAN' },
  'urgent-not-important': { label: 'Delegate', color: 'bg-amber-500/10 border-amber-500/30', short: 'DELEGATE' },
  'not-urgent-not-important': { label: 'Eliminate', color: 'bg-gray-500/10 border-gray-500/30', short: 'DROP' }
};

export const PriorityMatrixWidget = () => {
  const [items, setItems] = useState<PriorityItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [selectedQuadrant, setSelectedQuadrant] = useState<PriorityItem['quadrant']>('urgent-important');

  useEffect(() => {
    const saved = localStorage.getItem('priority_matrix_items');
    if (saved) {
      setItems(JSON.parse(saved));
    }
  }, []);

  const saveItems = (newItems: PriorityItem[]) => {
    localStorage.setItem('priority_matrix_items', JSON.stringify(newItems));
    setItems(newItems);
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    const updated = [...items, { id: Date.now().toString(), title: newItem, quadrant: selectedQuadrant }];
    saveItems(updated);
    setNewItem("");
  };

  const deleteItem = (itemId: string) => {
    const updated = items.filter(item => item.id !== itemId);
    saveItems(updated);
  };

  const quadrants: Array<PriorityItem['quadrant']> = [
    'urgent-important', 
    'not-urgent-important', 
    'urgent-not-important', 
    'not-urgent-not-important'
  ];

  return (
    <div className="space-y-2 h-full flex flex-col">
      {/* Add item */}
      <div className="flex gap-1">
        <select
          value={selectedQuadrant}
          onChange={(e) => setSelectedQuadrant(e.target.value as PriorityItem['quadrant'])}
          className="h-6 px-1 text-[10px] bg-background border border-border rounded focus:outline-none"
        >
          {quadrants.map(q => (
            <option key={q} value={q}>{QUADRANT_CONFIG[q].short}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Add item..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addItem()}
          className="flex-1 h-6 px-2 text-[10px] bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button size="sm" className="h-6 w-6 p-0" onClick={addItem} disabled={!newItem.trim()}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Matrix grid */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-1 overflow-hidden">
        {quadrants.map(quadrant => (
          <div
            key={quadrant}
            className={`flex flex-col rounded border ${QUADRANT_CONFIG[quadrant].color} overflow-hidden`}
          >
            <div className="text-[8px] font-medium text-center py-0.5 border-b border-inherit">
              {QUADRANT_CONFIG[quadrant].label}
            </div>
            <div className="flex-1 overflow-auto p-1 space-y-0.5">
              {items
                .filter(item => item.quadrant === quadrant)
                .slice(0, 3)
                .map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-1 p-0.5 bg-background/50 rounded text-[9px] group"
                  >
                    <span className="flex-1 truncate">{item.title}</span>
                    <button 
                      onClick={() => deleteItem(item.id)}
                      className="opacity-0 group-hover:opacity-100"
                    >
                      <X className="h-2.5 w-2.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
              {items.filter(item => item.quadrant === quadrant).length > 3 && (
                <div className="text-[8px] text-muted-foreground text-center">
                  +{items.filter(item => item.quadrant === quadrant).length - 3} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
