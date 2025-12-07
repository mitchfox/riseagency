import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, X } from "lucide-react";

interface KanbanItem {
  id: string;
  title: string;
  column: 'todo' | 'doing' | 'done';
}

const COLUMN_CONFIG = {
  todo: { label: 'To Do', color: 'border-amber-500/50 bg-amber-500/5' },
  doing: { label: 'Doing', color: 'border-blue-500/50 bg-blue-500/5' },
  done: { label: 'Done', color: 'border-emerald-500/50 bg-emerald-500/5' }
};

export const KanbanWidget = () => {
  const [items, setItems] = useState<KanbanItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('kanban_items');
    if (saved) {
      setItems(JSON.parse(saved));
    }
  }, []);

  const saveItems = (newItems: KanbanItem[]) => {
    localStorage.setItem('kanban_items', JSON.stringify(newItems));
    setItems(newItems);
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    const updated = [...items, { id: Date.now().toString(), title: newItem, column: 'todo' as const }];
    saveItems(updated);
    setNewItem("");
  };

  const moveItem = (itemId: string, newColumn: 'todo' | 'doing' | 'done') => {
    const updated = items.map(item => 
      item.id === itemId ? { ...item, column: newColumn } : item
    );
    saveItems(updated);
  };

  const deleteItem = (itemId: string) => {
    const updated = items.filter(item => item.id !== itemId);
    saveItems(updated);
  };

  const handleDragStart = (itemId: string) => {
    setDraggedItem(itemId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, column: 'todo' | 'doing' | 'done') => {
    e.preventDefault();
    if (draggedItem) {
      moveItem(draggedItem, column);
      setDraggedItem(null);
    }
  };

  const columns: Array<'todo' | 'doing' | 'done'> = ['todo', 'doing', 'done'];

  return (
    <div className="space-y-2 h-full flex flex-col">
      {/* Add item input */}
      <div className="flex gap-1">
        <input
          type="text"
          placeholder="Add task..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addItem()}
          className="flex-1 h-6 px-2 text-[10px] bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button size="sm" className="h-6 w-6 p-0" onClick={addItem} disabled={!newItem.trim()}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Kanban columns */}
      <div className="flex-1 grid grid-cols-3 gap-1 overflow-hidden">
        {columns.map(column => (
          <div
            key={column}
            className={`flex flex-col rounded border ${COLUMN_CONFIG[column].color}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column)}
          >
            <div className="text-[9px] font-medium text-center py-1 border-b border-inherit">
              {COLUMN_CONFIG[column].label}
              <span className="ml-1 text-muted-foreground">
                ({items.filter(i => i.column === column).length})
              </span>
            </div>
            <div className="flex-1 overflow-auto p-1 space-y-1">
              {items
                .filter(item => item.column === column)
                .map(item => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(item.id)}
                    className="flex items-center gap-1 p-1 bg-background rounded border border-border/50 cursor-move hover:border-primary/30 group text-[10px]"
                  >
                    <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{item.title}</span>
                    <button 
                      onClick={() => deleteItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
