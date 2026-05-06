import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const FORM_STAT_OPTIONS = [
  { key: "goals", label: "Goals" },
  { key: "assists", label: "Assists" },
  { key: "passes_per_game", label: "Passes / game" },
  { key: "pass_pct", label: "Pass %" },
  { key: "dribbles_per_game", label: "Dribbles / game" },
  { key: "dribble_pct", label: "Dribble %" },
  { key: "shots_per_game", label: "Shots / game" },
  { key: "shots_on_target_pct", label: "Shots on Target %" },
  { key: "tackles_per_game", label: "Tackles / game" },
  { key: "interceptions_per_game", label: "Interceptions / game" },
  { key: "duels_won_pct", label: "Duels Won %" },
  { key: "aerial_duels_won_pct", label: "Aerial Duels Won %" },
  { key: "minutes_per_game", label: "Minutes / game" },
];

interface Props { playerId: string; }

export const PlayerFormConfigTab = ({ playerId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [windowSize, setWindowSize] = useState<number>(5);
  const [stats, setStats] = useState<string[]>([]);

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
        setStats(Array.isArray(data.stats) ? data.stats : []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [playerId]);

  const toggle = (key: string) => {
    setStats(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
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
      <p className="text-sm text-muted-foreground">Pick the form stats to display as a banner on this player's public Stars profile.</p>

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
        <Label className="mb-2 block">Stats to display</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {FORM_STAT_OPTIONS.map(opt => (
            <label key={opt.key} className="flex items-center gap-2 rounded border border-border bg-card/50 px-3 py-2 text-sm">
              <Checkbox checked={stats.includes(opt.key)} onCheckedChange={() => toggle(opt.key)} />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save"}</Button>
    </div>
  );
};

export default PlayerFormConfigTab;