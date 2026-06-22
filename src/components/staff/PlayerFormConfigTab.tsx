import { type MouseEvent, forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Loader2, Save, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  { key: "npxg_per90", label: "npxG /90" },
  { key: "xa_per90", label: "xA /90" },
  { key: "xGChain_per90", label: "xG Chain /90" },
  { key: "xt_via_live_passes_per90", label: "xT (live passes) /90" },
  { key: "xt_via_prog_carries_per90", label: "xT (prog carries) /90" },
  { key: "shots", label: "Shots" },
  { key: "shots_on_target_per90", label: "Shots on Target /90" },
  { key: "total_shots_per90", label: "Shots /90" },
  { key: "shots_inside_box_per90", label: "Shots in Box /90" },
  { key: "touches_in_opp_box_per90", label: "Touches in Box /90" },
  { key: "passes_total_per90", label: "Passes /90" },
  { key: "key_passes_per90", label: "Key Passes /90" },
  { key: "pass_accuracy_pct", label: "Pass %" },
  { key: "accurate_passes_per90", label: "Accurate Passes /90" },
  { key: "forward_passes_per90", label: "Forward Passes /90" },
  { key: "passes_into_final_3rd_per90", label: "Passes into Final 3rd /90" },
  { key: "progressive_passes_per90", label: "Progressive Passes /90" },
  { key: "passes_in_opp_half_per90", label: "Passes in Opp Half /90" },
  { key: "long_ball_accuracy_pct", label: "Long Ball %" },
  { key: "accurate_long_balls_per90", label: "Long Balls /90" },
  { key: "accurate_crosses_per90", label: "Crosses /90" },
  { key: "cross_accuracy_pct", label: "Cross %" },
  { key: "dribble_success_pct", label: "Dribble %" },
  { key: "successful_dribbles_per90", label: "Dribbles /90" },
  { key: "dribble_attempts_per90", label: "Dribbles Att. /90" },
  { key: "carries_into_final_3rd_per90", label: "Carries into Final 3rd /90" },
  { key: "progressive_carries_per90", label: "Progressive Carries /90" },
  { key: "fouls_drawn_per90", label: "Fouls Drawn /90" },
  { key: "tackles_won_per90", label: "Tackles /90" },
  { key: "tackles_won_pct", label: "Tackles Won %" },
  { key: "interceptions_per90", label: "Interceptions /90" },
  { key: "duels_won_pct", label: "Duels Won %" },
  { key: "duels_won_per90", label: "Duels Won /90" },
  { key: "aerials_won_pct", label: "Aerial Duels Won %" },
  { key: "aerials_won_per90", label: "Aerials Won /90" },
  { key: "triple_threat_xC_per90", label: "Triple Threat xC /90" },
  { key: "movement_to_feet_xC_per90", label: "Movement to Feet xC /90" },
  { key: "movement_in_behind_xC_per90", label: "In Behind xC /90" },
  { key: "movement_down_side_xC_per90", label: "Down Side xC /90" },
  { key: "crossing_movement_xC_per90", label: "Crossing xC /90" },
  { key: "minutes_played", label: "Minutes /game" },
];

interface Props { playerId: string; }

interface SortableStatProps {
  id: string;
  label: string;
  checked: boolean;
  mode: 'auto' | 'manual';
  manualValue: string;
  onToggle: () => void;
  onModeChange: (m: 'auto' | 'manual') => void;
  onManualChange: (v: string) => void;
}

const SortableStat = ({ id, label, checked, mode, manualValue, onToggle, onModeChange, onManualChange }: SortableStatProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex flex-wrap items-center gap-2 rounded border border-border bg-card p-2">
      <button type="button" {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground" aria-label="Reorder">
        <GripVertical className="h-4 w-4" />
      </button>
      <Switch checked={checked} onCheckedChange={onToggle} />
      <span className="flex-1 min-w-[120px] text-sm">{label}</span>
      {checked && (
        <>
          <Select value={mode} onValueChange={(v) => onModeChange(v as 'auto' | 'manual')}>
            <SelectTrigger className="h-7 w-[88px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
          {mode === 'manual' && (
            <Input
              value={manualValue}
              onChange={(e) => onManualChange(e.target.value)}
              placeholder="Value"
              className="h-7 w-[80px] text-xs"
            />
          )}
        </>
      )}
    </div>
  );
};

export type PlayerFormConfigHandle = { saveNow: () => Promise<boolean> };

export const PlayerFormConfigTab = forwardRef<PlayerFormConfigHandle, Props>(({ playerId }, ref) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [windowSize, setWindowSize] = useState<number>(5);
  const [defaultCategory, setDefaultCategory] = useState<string>("Passing");
  // Ordered list of all keys; selected ones are stored true in `enabled`
  const [order, setOrder] = useState<string[]>(FORM_STAT_OPTIONS.map(o => o.key));
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [modes, setModes] = useState<Record<string, 'auto' | 'manual'>>({});
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("player_form_config")
        .select("window_size, stats, match_by_match_default_category")
        .eq("player_id", playerId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setWindowSize(data.window_size || 5);
        setDefaultCategory(
          (data.match_by_match_default_category as string | null) || "Passing",
        );
        // stats can be either:
        //   string[] (legacy) — auto mode for each
        //   { key, mode, value }[] (new)
        const raw = Array.isArray(data.stats) ? data.stats : [];
        const items: { key: string; mode: 'auto' | 'manual'; value: string }[] = raw.map((it: any) =>
          typeof it === 'string'
            ? { key: it, mode: 'auto', value: '' }
            : { key: it.key, mode: (it.mode === 'manual' ? 'manual' : 'auto'), value: it.value != null ? String(it.value) : '' }
        ).filter((it) => FORM_STAT_OPTIONS.some(o => o.key === it.key));

        const savedKeys = items.map(i => i.key);
        const remaining = FORM_STAT_OPTIONS.map(o => o.key).filter(k => !savedKeys.includes(k));
        setOrder([...savedKeys, ...remaining]);

        const en: Record<string, boolean> = {};
        const md: Record<string, 'auto' | 'manual'> = {};
        const mv: Record<string, string> = {};
        items.forEach(it => {
          en[it.key] = true;
          md[it.key] = it.mode;
          mv[it.key] = it.value;
        });
        setEnabled(en);
        setModes(md);
        setManualValues(mv);
      }
      setDirty(false);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [playerId]);

  const sensors = useSensors(useSensor(PointerSensor));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    setDirty(true);
    setOrder(prev => {
      const oi = prev.indexOf(e.active.id as string);
      const ni = prev.indexOf(e.over!.id as string);
      if (oi < 0 || ni < 0) return prev;
      return arrayMove(prev, oi, ni);
    });
  };

  const persist = async (): Promise<boolean> => {
    const stats = order
      .filter(k => enabled[k])
      .map(k => ({
        key: k,
        mode: modes[k] || 'auto',
        value: (modes[k] === 'manual' ? (manualValues[k] ?? '') : ''),
      }));
    const { error } = await (supabase as any)
      .rpc("save_player_form_config", {
        _player_id: playerId,
        _window_size: windowSize,
        _stats: stats,
        _match_by_match_default_category: defaultCategory || null,
      });
    if (error) throw error;
    setDirty(false);
    return true;
  };

  useImperativeHandle(ref, () => ({
    saveNow: async () => {
      if (loading || !dirty) return true;
      try { await persist(); return true; } catch (e: any) {
        toast.error('Form config: ' + (e?.message || 'Failed to save'));
        return false;
      }
    }
  }), [order, enabled, modes, manualValues, windowSize, defaultCategory, playerId, loading, dirty]);

  const handleSave = async (event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    setSaving(true);
    try {
      await persist();
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
        <Label>Window — last N matches</Label>
        <Input
          type="number"
          min={1}
          max={50}
          value={windowSize}
          onChange={(e) => {
            const n = parseInt(e.target.value);
            if (isNaN(n)) return;
            setDirty(true);
            setWindowSize(Math.max(1, Math.min(50, n)));
          }}
        />
      </div>

      <div>
        <Label className="mb-2 block">Stats — drag to reorder, toggle to show, choose Auto or Manual value</Label>
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
                    mode={modes[key] || 'auto'}
                    manualValue={manualValues[key] ?? ''}
                    onToggle={() => { setDirty(true); setEnabled(p => ({ ...p, [key]: !p[key] })); }}
                    onModeChange={(m) => { setDirty(true); setModes(p => ({ ...p, [key]: m })); }}
                    onManualChange={(v) => { setDirty(true); setManualValues(p => ({ ...p, [key]: v })); }}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <Button type="button" onClick={handleSave} disabled={saving} size="sm" className="gap-2"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save"}</Button>
    </div>
  );
});
PlayerFormConfigTab.displayName = "PlayerFormConfigTab";

export default PlayerFormConfigTab;
