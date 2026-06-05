import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Target as TargetIcon, Users, MessageCircle, Reply } from "lucide-react";

interface Target {
  id: string;
  name: string;
  scope: "youth" | "pro" | "both";
  positions: string[];
  min_age: number | null;
  max_age: number | null;
  nationalities: string[];
  countries_of_club: string[];
  min_club_rating: string | null;
  max_club_rating: string | null;
  priority: number;
  active: boolean;
  notes: string | null;
}

interface Counts {
  total: number;
  contacted: number;
  replied: number;
}

const emptyTarget = (): Target => ({
  id: "",
  name: "",
  scope: "both",
  positions: [],
  min_age: null,
  max_age: null,
  nationalities: [],
  countries_of_club: [],
  min_club_rating: null,
  max_club_rating: null,
  priority: 3,
  active: true,
  notes: null,
});

const parseList = (s: string): string[] =>
  s.split(",").map(t => t.trim()).filter(Boolean);

const matchesTarget = (row: any, t: Target): boolean => {
  if (t.positions.length && !t.positions.some(p => (row.position || "").toUpperCase() === p.toUpperCase())) return false;
  if (t.min_age !== null && row.age !== null && row.age < t.min_age) return false;
  if (t.max_age !== null && row.age !== null && row.age > t.max_age) return false;
  if (t.nationalities.length && !t.nationalities.some(n => (row.nationality || "").toLowerCase() === n.toLowerCase())) return false;
  return true;
};

export const OutreachTargetsManager = () => {
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Target | null>(null);
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, Counts>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("recruitment_targets")
      .select("*")
      .order("active", { ascending: false })
      .order("priority", { ascending: true })
      .order("name");
    setTargets((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (targets.length === 0) return;
    const computeCounts = async () => {
      const [{ data: youth }, { data: pro }] = await Promise.all([
        supabase.from("player_outreach_youth").select("position,age,nationality,messaged,response_status").limit(2000),
        supabase.from("player_outreach_pro").select("position,age,nationality,messaged,response_status").limit(2000),
      ]);
      const map: Record<string, Counts> = {};
      targets.forEach(t => {
        const pool = [
          ...(t.scope !== "pro" ? (youth || []) : []),
          ...(t.scope !== "youth" ? (pro || []) : []),
        ];
        const matches = pool.filter(r => matchesTarget(r, t));
        map[t.id] = {
          total: matches.length,
          contacted: matches.filter(r => r.messaged).length,
          replied: matches.filter(r => r.response_status && r.response_status !== "none").length,
        };
      });
      setCounts(map);
    };
    computeCounts();
  }, [targets]);

  const startCreate = () => { setEditing(emptyTarget()); setOpen(true); };
  const startEdit = (t: Target) => { setEditing({ ...t }); setOpen(true); };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { toast.error("Name required"); return; }
    const payload = { ...editing } as any;
    delete payload.id;
    let res;
    if (editing.id) {
      res = await supabase.from("recruitment_targets").update(payload).eq("id", editing.id);
    } else {
      res = await supabase.from("recruitment_targets").insert(payload);
    }
    if (res.error) { toast.error("Save failed"); return; }
    toast.success("Target saved");
    setOpen(false);
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this target?")) return;
    const { error } = await supabase.from("recruitment_targets").delete().eq("id", id);
    if (error) { toast.error("Delete failed"); return; }
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TargetIcon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wide">Recruitment targets</h3>
        </div>
        <Button onClick={startCreate} size="sm"><Plus className="h-4 w-4 mr-1" /> New target</Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : targets.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No targets yet. Create one to define the kind of player you want to approach (position, age, nationality), then track how many candidates you've contacted and heard back from.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {targets.map(t => {
            const c = counts[t.id];
            return (
              <Card key={t.id} className={`p-3 ${t.active ? "" : "opacity-60"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">{t.name}</span>
                      <Badge variant="outline" className="text-[10px]">P{t.priority}</Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">{t.scope}</Badge>
                      {!t.active && <Badge variant="outline" className="text-[10px]">Paused</Badge>}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
                      {(t.positions.length > 0) && <div>Positions: {t.positions.join(", ")}</div>}
                      {(t.min_age !== null || t.max_age !== null) && (
                        <div>Age: {t.min_age ?? "—"} to {t.max_age ?? "—"}</div>
                      )}
                      {t.nationalities.length > 0 && <div>Nationalities: {t.nationalities.join(", ")}</div>}
                      {t.countries_of_club.length > 0 && <div>Club country: {t.countries_of_club.join(", ")}</div>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                {c && (
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground"><Users className="h-3 w-3" />Matches</div>
                      <div className="text-base font-semibold">{c.total}</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground"><MessageCircle className="h-3 w-3" />Contacted</div>
                      <div className="text-base font-semibold">{c.contacted}</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground"><Reply className="h-3 w-3" />Replied</div>
                      <div className="text-base font-semibold text-primary">{c.replied}</div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit target" : "New target"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. U16 centre-backs, Iberia" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Scope</Label>
                  <Select value={editing.scope} onValueChange={(v: any) => setEditing({ ...editing, scope: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Both</SelectItem>
                      <SelectItem value="youth">Youth</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Priority</Label>
                  <Input type="number" min={1} max={5} value={editing.priority}
                    onChange={e => setEditing({ ...editing, priority: parseInt(e.target.value) || 3 })} />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Switch checked={editing.active} onCheckedChange={v => setEditing({ ...editing, active: v })} />
                  <Label className="text-xs">Active</Label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Min age</Label>
                  <Input type="number" value={editing.min_age ?? ""} onChange={e => setEditing({ ...editing, min_age: e.target.value === "" ? null : parseInt(e.target.value) })} />
                </div>
                <div>
                  <Label className="text-xs">Max age</Label>
                  <Input type="number" value={editing.max_age ?? ""} onChange={e => setEditing({ ...editing, max_age: e.target.value === "" ? null : parseInt(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Positions (comma-separated, use abbreviations: GK, CB, RB, LB, CDM, CM, CAM, RW, LW, CF)</Label>
                <Input value={editing.positions.join(", ")} onChange={e => setEditing({ ...editing, positions: parseList(e.target.value) })} placeholder="CB, CDM" />
              </div>
              <div>
                <Label className="text-xs">Nationalities (comma-separated)</Label>
                <Input value={editing.nationalities.join(", ")} onChange={e => setEditing({ ...editing, nationalities: parseList(e.target.value) })} placeholder="Spain, Portugal" />
              </div>
              <div>
                <Label className="text-xs">Club countries (comma-separated)</Label>
                <Input value={editing.countries_of_club.join(", ")} onChange={e => setEditing({ ...editing, countries_of_club: parseList(e.target.value) })} placeholder="England, Germany" />
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea value={editing.notes ?? ""} onChange={e => setEditing({ ...editing, notes: e.target.value })} rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save target</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};