import { useEffect, useState } from "react";
import { Loader2, Save, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Stat options: key matches data shape used by PlayerFormBanner
export const FORM_STAT_OPTIONS: { key: string; label: string }[] = [
  { key: "goals", label: "Goals" },
  { key: "assists", label: "Assists" },
  { key: "xg", label: "xG" },
  { key: "xa", label: "xA" },
  { key: "shots_on_target_per90", label: "Shots on Target /90" },
  { key: "key_passes_per90", label: "Key Passes /90" },
  { key: "pass_accuracy_pct", label: "Pass %" },
  { key: "dribble_success_pct", label: "Dribble %" },
  { key: "successful_dribbles_per90", label: "Dribbles /90" },
  { key: "tackles_won_per90", label: "Tackles /90" },
  { key: "interceptions_per90", label: "Interceptions /90" },
  { key: "duels_won_pct", label: "Duels Won %" },
  { key: "aerials_won_pct", label: "Aerial Duels Won %" },
  { key: "minutes_played", label: "Minutes /game" },
];

interface Props { playerId: string; }

const SortableStat = ({ id, label, checked, onToggle }: { id: string; label: string; checked: boolean; onToggle: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded border border-border bg-card p-2">
      <button type="button" {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground" aria-label="Reorder">
        <GripVertical className="h-4 w-4" />
      </button>
      <Switch checked={checked} onCheckedChange={onToggle} />
      <span className="flex-1 text-sm">{label}</span>
    </div>
  );
};

export const PlayerFormConfigTab = ({ playerId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [windowSize, setWindowSize] = useState<number>(5);
  // Ordered list of all keys; selected ones are stored true in `enabled`
  const [order, setOrder] = useState<string[]>(FORM_STAT_OPTIONS.map(o => o.key));
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("player_form_config")
        .select("window_size, stats")
        .eq("player_id", playerId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setWindowSize(data.window_size || 5);
        const saved: string[] = Array.isArray(data.stats) ? data.stats : [];
        // Order: saved (in saved order) first, then remaining defaults
        const remaining = FORM_STAT_OPTIONS.map(o => o.key).filter(k => !saved.includes(k));
        setOrder([...saved.filter(k => FORM_STAT_OPTIONS.some(o => o.key === k)), ...remaining]);
        const en: Record<string, boolean> = {};
        saved.forEach(k => { en[k] = true; });
        setEnabled(en);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [playerId]);

  const sensors = useSensors(useSensor(PointerSensor));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    setOrder(prev => {
      const oi = prev.indexOf(e.active.id as string);
      const ni = prev.indexOf(e.over!.id as string);
      if (oi < 0 || ni < 0) return prev;
      return arrayMove(prev, oi, ni);
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const stats = order.filter(k => enabled[k]);
      const { error } = await (supabase as any)
        .from("player_form_config")
        .upsert({ player_id: playerId, window_size: windowSize, stats }, { onConflict: "player_id" });
      if (error) throw error;
      toast.success("Form configuration saved");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading…</div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Pick and order the form stats shown as a banner on this player's public Stars profile. Drag to reorder.</p>

      <div className="max-w-xs space-y-2">
        <Label>Window</Label>
        <Select value={String(windowSize)} onValueChange={(v) => setWindowSize(parseInt(v))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">Last 5 matches</SelectItem>
            <SelectItem value="10">Last 10 matches</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="mb-2 block">Stats (drag to reorder, toggle to show)</Label>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {order.map(key => {
                const opt = FORM_STAT_OPTIONS.find(o => o.key === key);
                if (!opt) return null;
                return (
                  <SortableStat
                    key={key}
                    id={key}
                    label={opt.label}
                    checked={!!enabled[key]}
                    onToggle={() => setEnabled(p => ({ ...p, [key]: !p[key] }))}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save"}</Button>
    </div>
  );
};

export default PlayerFormConfigTab;
