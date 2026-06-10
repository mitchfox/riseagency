import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, FileText, Target, ListTree } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Variation {
  id: string;
  label: string;
  description: string | null;
  reps: string | null;
  sets: string | null;
  reps_per_side: boolean;
  load: string | null;
  recovery_time: string | null;
  notes: string | null;
  diagram: any;
}
interface Drill {
  id: string;
  name: string;
  description: string | null;
  reps: string | null;
  sets: string | null;
  reps_per_side: boolean;
  load: string | null;
  recovery_time: string | null;
  notes: string | null;
  diagram: any;
  variations: Variation[];
}
interface Session {
  id: string;
  session_key: string;
  title: string | null;
  description: string | null;
  drills: Drill[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  programName: string;
  phaseName?: string | null;
  sessions: Session[];
}

const CATEGORY = "Technical";

const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

export const SaveTechnicalToCoachingDBDialog = ({ open, onClose, programName, phaseName, sessions }: Props) => {
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"programme" | "sessions" | "drills">("programme");
  const [progSelected, setProgSelected] = useState(false);
  const [progName, setProgName] = useState(programName);
  const [sessionSel, setSessionSel] = useState<Record<string, { selected: boolean; name: string }>>({});
  const [drillSel, setDrillSel] = useState<Record<string, { selected: boolean; name: string }>>({});

  useEffect(() => {
    if (!open) return;
    setProgSelected(false);
    setProgName(programName || "Untitled Technical Programme");
    const sm: Record<string, { selected: boolean; name: string }> = {};
    const dm: Record<string, { selected: boolean; name: string }> = {};
    sessions.forEach(s => {
      sm[s.id] = { selected: false, name: `${s.title || `Session ${s.session_key}`} — ${phaseName || programName}` };
      s.drills.forEach(d => {
        dm[d.id] = { selected: false, name: d.name || "Drill" };
      });
    });
    setSessionSel(sm);
    setDrillSel(dm);
  }, [open, sessions, programName, phaseName]);

  const drillToExercise = (d: Drill | Variation, baseLabel?: string) => ({
    name: baseLabel ? `${("name" in d ? d.name : "")} — ${baseLabel}` : (("name" in d) ? d.name : d.label),
    description: d.description || "",
    repetitions: [d.reps, d.reps_per_side ? "each side" : null].filter(Boolean).join(" "),
    sets: d.sets || "",
    load: d.load || "",
    recoveryTime: d.recovery_time || "",
    notes: d.notes || "",
    diagram: d.diagram || null,
  });

  const handleSave = async () => {
    const sessionsChosen = Object.entries(sessionSel).filter(([, v]) => v.selected);
    const drillsChosen = Object.entries(drillSel).filter(([, v]) => v.selected);
    if (!progSelected && sessionsChosen.length === 0 && drillsChosen.length === 0) {
      toast.error("Select at least one item to save");
      return;
    }
    setSaving(true);
    try {
      if (progSelected) {
        const payload = clone(sessions).map(s => ({
          key: s.session_key,
          title: s.title,
          description: s.description,
          drills: s.drills.map(d => ({
            ...d,
            variations: d.variations,
          })),
        }));
        const { error } = await supabase.from("coaching_programmes").insert([{
          title: progName,
          description: `Technical programme — ${phaseName || ""}`.trim(),
          content: "",
          category: CATEGORY,
          attachments: { technical_sessions: payload } as any,
        }]);
        if (error) throw error;
        toast.success(`Programme "${progName}" saved`);
      }
      if (sessionsChosen.length > 0) {
        const rows = sessionsChosen.map(([sid, settings]) => {
          const s = sessions.find(x => x.id === sid)!;
          const exercises: any[] = [];
          s.drills.forEach(d => {
            exercises.push(drillToExercise(d));
            d.variations.forEach(v => exercises.push(drillToExercise(v, d.name)));
          });
          return {
            title: settings.name,
            description: s.description || `Saved from Technical — ${exercises.length} drills`,
            category: CATEGORY,
            exercises: clone(exercises) as any,
          };
        });
        const { error } = await supabase.from("coaching_sessions").insert(rows as any);
        if (error) throw error;
        toast.success(`${rows.length} session(s) saved`);
      }
      if (drillsChosen.length > 0) {
        const rows: any[] = [];
        drillsChosen.forEach(([did, settings]) => {
          let drill: Drill | undefined;
          for (const s of sessions) {
            drill = s.drills.find(d => d.id === did);
            if (drill) break;
          }
          if (!drill) return;
          rows.push({
            title: settings.name,
            description: drill.description || "",
            content: [
              drill.reps ? `Reps: ${drill.reps}${drill.reps_per_side ? " each side" : ""}` : null,
              drill.sets ? `Sets: ${drill.sets}` : null,
              drill.load ? `Load: ${drill.load}` : null,
              drill.recovery_time ? `Recovery: ${drill.recovery_time}` : null,
              drill.notes ? `Notes: ${drill.notes}` : null,
            ].filter(Boolean).join("\n"),
            category: CATEGORY,
            attachments: { diagram: drill.diagram, variations: clone(drill.variations) } as any,
          });
        });
        const { error } = await supabase.from("coaching_drills").insert(rows as any);
        if (error) throw error;
        toast.success(`${rows.length} drill(s) saved`);
      }
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to save to coaching database");
    } finally {
      setSaving(false);
    }
  };

  const totalChosen = (progSelected ? 1 : 0)
    + Object.values(sessionSel).filter(v => v.selected).length
    + Object.values(drillSel).filter(v => v.selected).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Save to Coaching Database
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Save independent copies of this technical programme, its sessions or its drills. Items are tagged under the <strong>Technical</strong> category.
        </p>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="programme" className="flex items-center gap-2"><FileText className="w-4 h-4" />Programme</TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center gap-2"><Target className="w-4 h-4" />Sessions ({sessions.length})</TabsTrigger>
            <TabsTrigger value="drills" className="flex items-center gap-2"><ListTree className="w-4 h-4" />Drills ({sessions.reduce((a, s) => a + s.drills.length, 0)})</TabsTrigger>
          </TabsList>

          <TabsContent value="programme" className="space-y-4 mt-4">
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Checkbox checked={progSelected} onCheckedChange={(c) => setProgSelected(c as boolean)} id="save-prog" />
              <div className="flex-1 space-y-2">
                <label htmlFor="save-prog" className="font-medium cursor-pointer">Save entire programme as template</label>
                <p className="text-sm text-muted-foreground">Captures every session, drill and variation</p>
                {progSelected && (
                  <div className="pt-2">
                    <Label htmlFor="prog-name">Programme name</Label>
                    <Input id="prog-name" value={progName} onChange={(e) => setProgName(e.target.value)} className="mt-1" />
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-3 mt-4">
            <ScrollArea className="h-[340px] pr-4">
              <div className="space-y-2">
                {sessions.length === 0 && <p className="text-center py-8 text-muted-foreground">No sessions to save</p>}
                {sessions.map(s => {
                  const sel = sessionSel[s.id];
                  if (!sel) return null;
                  const drillCount = s.drills.length;
                  return (
                    <div key={s.id} className={`p-3 border rounded-lg ${sel.selected ? "bg-primary/5 border-primary" : ""}`}>
                      <div className="flex items-start gap-3">
                        <Checkbox checked={sel.selected} onCheckedChange={() => setSessionSel(p => ({ ...p, [s.id]: { ...p[s.id], selected: !p[s.id].selected } }))} />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{s.title || `Session ${s.session_key}`}</span>
                            <span className="text-xs text-muted-foreground">{drillCount} drill(s)</span>
                          </div>
                          {sel.selected && (
                            <Input value={sel.name} onChange={(e) => setSessionSel(p => ({ ...p, [s.id]: { ...p[s.id], name: e.target.value } }))} className="text-sm" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="drills" className="space-y-3 mt-4">
            <ScrollArea className="h-[340px] pr-4">
              <div className="space-y-2">
                {sessions.flatMap(s => s.drills.map(d => ({ ...d, sessionLabel: s.title || `Session ${s.session_key}` }))).length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">No drills to save</p>
                )}
                {sessions.flatMap(s => s.drills.map(d => ({ drill: d, sessionLabel: s.title || `Session ${s.session_key}` }))).map(({ drill, sessionLabel }) => {
                  const sel = drillSel[drill.id];
                  if (!sel) return null;
                  return (
                    <div key={drill.id} className={`p-3 border rounded-lg ${sel.selected ? "bg-primary/5 border-primary" : ""}`}>
                      <div className="flex items-start gap-3">
                        <Checkbox checked={sel.selected} onCheckedChange={() => setDrillSel(p => ({ ...p, [drill.id]: { ...p[drill.id], selected: !p[drill.id].selected } }))} />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">{drill.name}</span>
                            <span className="text-xs text-muted-foreground">{sessionLabel} · {drill.variations.length} variation(s)</span>
                          </div>
                          {sel.selected && (
                            <Input value={sel.name} onChange={(e) => setDrillSel(p => ({ ...p, [drill.id]: { ...p[drill.id], name: e.target.value } }))} className="text-sm" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || totalChosen === 0}>
            {saving ? "Saving…" : `Save ${totalChosen || ""} to Database`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};