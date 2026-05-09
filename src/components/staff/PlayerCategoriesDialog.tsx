import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, Save, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface PlayerCategory {
  id: string;
  name: string;
  sort_order: number;
  is_system: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export const PlayerCategoriesDialog = ({ open, onOpenChange, onSaved }: Props) => {
  const [rows, setRows] = useState<PlayerCategory[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from('player_categories').select('*').order('sort_order');
    if (error) toast.error(error.message);
    setRows((data as PlayerCategory[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (open) void load(); }, [open]);

  const updateRow = (id: string, patch: Partial<PlayerCategory>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    setRows(prev => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      // Re-stamp sort_order in steps of 10 so the new order persists on save
      return next.map((r, i) => ({ ...r, sort_order: (i + 1) * 10 }));
    });
  };

  const addCategory = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const next = (rows[rows.length - 1]?.sort_order ?? 0) + 10;
    const { error } = await (supabase as any).from('player_categories').insert({ name: trimmed, sort_order: next });
    if (error) return toast.error(error.message);
    setNewName("");
    toast.success(`Added "${trimmed}"`);
    void load();
  };

  const remove = async (row: PlayerCategory) => {
    if (row.is_system) return toast.error("System categories cannot be deleted");
    if (!confirm(`Delete category "${row.name}"? Any players in it will keep the name on their record.`)) return;
    const { error } = await (supabase as any).from('player_categories').delete().eq('id', row.id);
    if (error) return toast.error(error.message);
    toast.success("Category deleted");
    void load();
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const r of rows) {
        const { error } = await (supabase as any).from('player_categories').update({
          name: r.name.trim(),
          sort_order: r.sort_order,
        }).eq('id', r.id);
        if (error) throw error;
      }
      toast.success("Categories saved");
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save categories');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Player Categories</DialogTitle>
          <DialogDescription>
            Rename existing categories, change their order, or add new ones. Categories appear in every player's edit form.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {rows.map((r, index) => (
                <div key={r.id} className="flex items-center gap-2">
                  <Input
                    value={r.name}
                    onChange={(e) => updateRow(r.id, { name: e.target.value })}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => moveRow(index, -1)} disabled={index === 0} title="Move up">
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => moveRow(index, 1)} disabled={index === rows.length - 1} title="Move down">
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => remove(r)} disabled={r.is_system} title={r.is_system ? "System category" : "Delete"}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 border-t border-border pt-3">
              <Input
                placeholder="New category name…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void addCategory(); }}
                className="flex-1"
              />
              <Button size="sm" onClick={addCategory} disabled={!newName.trim()} className="gap-1">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={saveAll} disabled={saving} className="gap-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
