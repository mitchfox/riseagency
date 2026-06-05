import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Target as TargetIcon, Users, MessageCircle, Reply, ChevronDown, ChevronRight, Sliders, X } from "lucide-react";
import { DEFAULT_WEIGHTS, type ScoringWeights } from "@/lib/fitScore";
import { invalidateScoringCaches } from "@/hooks/useRecruitmentScoring";

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
  weights_override: Partial<ScoringWeights> | null;
  ai_nudge_enabled: boolean | null;
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
  weights_override: null,
  ai_nudge_enabled: null,
});

const parseList = (s: string): string[] =>
  s.split(",").map(t => t.trim()).filter(Boolean);

const WEIGHT_LABELS: Record<keyof ScoringWeights, string> = {
  position: "Position match",
  age: "Age fit",
  nationality: "Nationality",
  club_country: "Club country",
  club_rating: "Club rating",
  outreach: "Outreach traction",
  ai_nudge: "AI nudge",
};

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
  const [counts, setCounts] = useState<Record<string, Counts>>({});
  const [drafts, setDrafts] = useState<Record<string, Target & { _positions: string; _nationalities: string; _countries_of_club: string }>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [weightsOpen, setWeightsOpen] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [newDraftId, setNewDraftId] = useState<string | null>(null);

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

  const makeDraft = (t: Target) => ({
    ...t,
    _positions: (t.positions || []).join(", "),
    _nationalities: (t.nationalities || []).join(", "),
    _countries_of_club: (t.countries_of_club || []).join(", "),
  });

  const startEdit = (t: Target) => {
    setDrafts(prev => ({ ...prev, [t.id || "new"]: makeDraft(t) }));
    setExpanded(prev => ({ ...prev, [t.id || "new"]: true }));
  };

  const startCreate = () => {
    const tempId = `new-${Date.now()}`;
    setNewDraftId(tempId);
    const t = emptyTarget();
    setDrafts(prev => ({ ...prev, [tempId]: makeDraft({ ...t, id: tempId }) }));
    setExpanded(prev => ({ ...prev, [tempId]: true }));
  };

  const cancelEdit = (key: string) => {
    setDrafts(prev => { const next = { ...prev }; delete next[key]; return next; });
    if (key === newDraftId) setNewDraftId(null);
  };

  const updateDraft = (key: string, patch: Partial<Target> & Partial<{ _positions: string; _nationalities: string; _countries_of_club: string }>) => {
    setDrafts(prev => ({ ...prev, [key]: { ...prev[key], ...patch } as any }));
  };

  const save = async (key: string) => {
    const draft = drafts[key];
    if (!draft) return;
    if (!draft.name.trim()) { toast.error("Name required"); return; }
    setSaving(key);
    const payload: any = {
      name: draft.name.trim(),
      scope: draft.scope,
      positions: parseList(draft._positions),
      min_age: draft.min_age,
      max_age: draft.max_age,
      nationalities: parseList(draft._nationalities),
      countries_of_club: parseList(draft._countries_of_club),
      min_club_rating: draft.min_club_rating,
      max_club_rating: draft.max_club_rating,
      priority: draft.priority,
      active: draft.active,
      notes: draft.notes,
      weights_override: draft.weights_override,
      ai_nudge_enabled: draft.ai_nudge_enabled,
    };
    const isNew = key === newDraftId || !targets.find(t => t.id === key);
    let res;
    if (isNew) {
      res = await supabase.from("recruitment_targets").insert(payload);
    } else {
      res = await supabase.from("recruitment_targets").update(payload).eq("id", key);
    }
    setSaving(null);
    if (res.error) {
      toast.error("Save failed", { description: res.error.message });
      return;
    }
    toast.success("Target saved");
    invalidateScoringCaches();
    cancelEdit(key);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this target?")) return;
    const { error } = await supabase.from("recruitment_targets").delete().eq("id", id);
    if (error) { toast.error("Delete failed", { description: error.message }); return; }
    invalidateScoringCaches();
    load();
  };

  const renderEditor = (key: string) => {
    const d = drafts[key];
    if (!d) return null;
    const wOpen = !!weightsOpen[key];
    const baseWeights: ScoringWeights = { ...DEFAULT_WEIGHTS, ...(d.weights_override || {}) };
    return (
      <div className="space-y-3 pt-3 border-t border-border mt-3">
        <div>
          <Label className="text-xs">Name</Label>
          <Input value={d.name} onChange={e => updateDraft(key, { name: e.target.value })} placeholder="e.g. U16 centre-backs, Iberia" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Scope</Label>
            <Select value={d.scope} onValueChange={(v: any) => updateDraft(key, { scope: v })}>
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
            <Input type="number" min={1} max={5} value={d.priority}
              onChange={e => updateDraft(key, { priority: parseInt(e.target.value) || 3 })} />
          </div>
          <div className="flex items-end gap-2 pb-1">
            <Switch checked={d.active} onCheckedChange={v => updateDraft(key, { active: v })} />
            <Label className="text-xs">Active</Label>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Min age</Label>
            <Input type="number" value={d.min_age ?? ""} onChange={e => updateDraft(key, { min_age: e.target.value === "" ? null : parseInt(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs">Max age</Label>
            <Input type="number" value={d.max_age ?? ""} onChange={e => updateDraft(key, { max_age: e.target.value === "" ? null : parseInt(e.target.value) })} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Positions (comma-separated: GK, CB, RB, LB, CDM, CM, CAM, RW, LW, CF)</Label>
          <Input value={d._positions} onChange={e => updateDraft(key, { _positions: e.target.value })} placeholder="CB, CDM" />
        </div>
        <div>
          <Label className="text-xs">Nationalities (comma-separated)</Label>
          <Input value={d._nationalities} onChange={e => updateDraft(key, { _nationalities: e.target.value })} placeholder="Spain, Portugal" />
        </div>
        <div>
          <Label className="text-xs">Club countries (comma-separated)</Label>
          <Input value={d._countries_of_club} onChange={e => updateDraft(key, { _countries_of_club: e.target.value })} placeholder="England, Germany" />
        </div>
        <div>
          <Label className="text-xs">Notes</Label>
          <Textarea value={d.notes ?? ""} onChange={e => updateDraft(key, { notes: e.target.value })} rows={2} />
        </div>

        <Collapsible open={wOpen} onOpenChange={(v) => setWeightsOpen(prev => ({ ...prev, [key]: v }))}>
          <CollapsibleTrigger asChild>
            <button type="button" className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wide py-2 px-2 rounded hover:bg-muted/40">
              <span className="flex items-center gap-2"><Sliders className="h-3.5 w-3.5 text-primary" /> Tune how this target is scored {d.weights_override ? <Badge variant="outline" className="text-[10px]">Tuned</Badge> : <Badge variant="outline" className="text-[10px]">Default</Badge>}</span>
              {wOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2 px-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch
                  checked={!!d.weights_override}
                  onCheckedChange={(v) => updateDraft(key, { weights_override: v ? { ...baseWeights } : null })}
                />
                <Label className="text-xs">Tune scoring for this target</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={d.ai_nudge_enabled !== false}
                  onCheckedChange={(v) => updateDraft(key, { ai_nudge_enabled: v ? null : false })}
                />
                <Label className="text-xs">AI nudge</Label>
              </div>
            </div>
            {d.weights_override && (
              <div className="space-y-2.5">
                {(Object.keys(WEIGHT_LABELS) as (keyof ScoringWeights)[]).map(wk => (
                  <div key={wk} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">{WEIGHT_LABELS[wk]}</Label>
                      <Badge variant="outline" className="text-[10px]">{baseWeights[wk]}</Badge>
                    </div>
                    <Slider
                      value={[baseWeights[wk]]}
                      min={0}
                      max={40}
                      step={1}
                      onValueChange={(v) => updateDraft(key, { weights_override: { ...baseWeights, [wk]: v[0] } })}
                    />
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground">Every player is scored as a ratio against every active target and keeps their best fit. Tuning here only changes how this target weights each component, so the player you actually want still rises to the top.</p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={() => cancelEdit(key)}>Cancel</Button>
          <Button size="sm" onClick={() => save(key)} disabled={saving === key}>{saving === key ? "Saving…" : "Save target"}</Button>
        </div>
      </div>
    );
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

      {newDraftId && drafts[newDraftId] && (
        <Card className="p-3 border-primary/40">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">New target</div>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => cancelEdit(newDraftId)}><X className="h-3.5 w-3.5" /></Button>
          </div>
          {renderEditor(newDraftId)}
        </Card>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : targets.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No targets yet. Create one to define the kind of player you want to approach (position, age, nationality), then track how many candidates you've contacted and heard back from.
        </Card>
      ) : (
        <div className="space-y-3">
          {targets.map(t => {
            const c = counts[t.id];
            const isEditing = !!drafts[t.id];
            return (
              <Card key={t.id} className={`p-3 ${t.active ? "" : "opacity-60"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">{t.name}</span>
                      <Badge variant="outline" className="text-[10px]">P{t.priority}</Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">{t.scope}</Badge>
                      {!t.active && <Badge variant="outline" className="text-[10px]">Paused</Badge>}
                      {t.weights_override && <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">Custom scoring</Badge>}
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
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => isEditing ? cancelEdit(t.id) : startEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
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
                {isEditing && renderEditor(t.id)}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};