import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Per90 { metric: string; target: string; unit?: string }
interface PlayerToWatch { name: string; reason?: string; url?: string }
interface Roadmap { six_months?: string; eighteen_months?: string; thirty_six_months?: string }

export const LongTermVisionEditor = ({ playerId }: { playerId: string }) => {
  const [skillset, setSkillset] = useState("");
  const [per90, setPer90] = useState<Per90[]>([]);
  const [roadmap, setRoadmap] = useState<Roadmap>({});
  const [watch, setWatch] = useState<PlayerToWatch[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("player_portal_settings")
        .select("vision_skillset, vision_per90_targets, vision_roadmap, vision_players_to_watch")
        .eq("player_id", playerId)
        .maybeSingle();
      const d: any = data || {};
      setSkillset(d.vision_skillset || "");
      setPer90(Array.isArray(d.vision_per90_targets) ? d.vision_per90_targets : []);
      setRoadmap((d.vision_roadmap && typeof d.vision_roadmap === "object") ? d.vision_roadmap : {});
      setWatch(Array.isArray(d.vision_players_to_watch) ? d.vision_players_to_watch : []);
      setLoading(false);
    })();
  }, [playerId]);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("player_portal_settings")
        .upsert({
          player_id: playerId,
          vision_skillset: skillset.trim() || null,
          vision_per90_targets: per90.filter(p => p.metric.trim() || p.target.trim()),
          vision_roadmap: roadmap,
          vision_players_to_watch: watch.filter(w => w.name.trim()),
        }, { onConflict: "player_id" });
      if (error) throw error;
      toast.success("Long-Term Vision saved");
    } catch (e: any) {
      toast.error(e?.message || "Could not save");
    } finally { setSaving(false); }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base md:text-lg font-semibold">Long-Term Vision</h3>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save
        </Button>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">Surfaces on the player's portal hub. Empty parts are hidden.</p>

      <Card>
        <CardHeader><CardTitle className="text-sm">1. Skillset &amp; Potential</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={skillset} onChange={(e) => setSkillset(e.target.value)} placeholder="How we evaluate this player's skillset, potential and what they could become..." className="min-h-[120px]" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">2. Per-90 Targets</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setPer90([...per90, { metric: "", target: "", unit: "" }])}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {per90.length === 0 && <p className="text-xs text-muted-foreground">No metrics yet.</p>}
          {per90.map((row, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <Input className="col-span-5" placeholder="Metric (e.g. Shots on target)" value={row.metric} onChange={(e) => setPer90(per90.map((r, j) => j === i ? { ...r, metric: e.target.value } : r))} />
              <Input className="col-span-4" placeholder="Target (e.g. 1.2)" value={row.target} onChange={(e) => setPer90(per90.map((r, j) => j === i ? { ...r, target: e.target.value } : r))} />
              <Input className="col-span-2" placeholder="Unit" value={row.unit || ""} onChange={(e) => setPer90(per90.map((r, j) => j === i ? { ...r, unit: e.target.value } : r))} />
              <Button size="icon" variant="ghost" className="col-span-1" onClick={() => setPer90(per90.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">3. Development Road Map</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">6 Months</Label>
            <Textarea value={roadmap.six_months || ""} onChange={(e) => setRoadmap({ ...roadmap, six_months: e.target.value })} className="min-h-[70px]" />
          </div>
          <div>
            <Label className="text-xs">18 Months</Label>
            <Textarea value={roadmap.eighteen_months || ""} onChange={(e) => setRoadmap({ ...roadmap, eighteen_months: e.target.value })} className="min-h-[70px]" />
          </div>
          <div>
            <Label className="text-xs">36 Months</Label>
            <Textarea value={roadmap.thirty_six_months || ""} onChange={(e) => setRoadmap({ ...roadmap, thirty_six_months: e.target.value })} className="min-h-[70px]" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">4. Players to Watch</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setWatch([...watch, { name: "", reason: "", url: "" }])}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {watch.length === 0 && <p className="text-xs text-muted-foreground">No players yet.</p>}
          {watch.map((row, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <Input className="col-span-3" placeholder="Player name" value={row.name} onChange={(e) => setWatch(watch.map((r, j) => j === i ? { ...r, name: e.target.value } : r))} />
              <Input className="col-span-5" placeholder="Reason to watch them" value={row.reason || ""} onChange={(e) => setWatch(watch.map((r, j) => j === i ? { ...r, reason: e.target.value } : r))} />
              <Input className="col-span-3" placeholder="URL (YouTube etc.)" value={row.url || ""} onChange={(e) => setWatch(watch.map((r, j) => j === i ? { ...r, url: e.target.value } : r))} />
              <Button size="icon" variant="ghost" className="col-span-1" onClick={() => setWatch(watch.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};