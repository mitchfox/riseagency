import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Plus, ChevronRight, Trash2, Loader2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export interface InvestorUpdateRow {
  id: string;
  title: string;
  body: string | null;
  achieved_on: string;
  author_label: string | null;
  created_at: string;
}

interface Props {
  updates: InvestorUpdateRow[];
  token: string | null;
  unlocked: boolean;
  onChanged: () => void;
}

export const InvestorHighlineLog = ({ updates, token, unlocked, onChanged }: Props) => {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [achievedOn, setAchievedOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  // Locally-tracked rows so newly-saved updates appear instantly even while
  // the slow investor-data refresh is still in flight.
  const [localAdded, setLocalAdded] = useState<InvestorUpdateRow[]>([]);
  const [localDeleted, setLocalDeleted] = useState<Set<string>>(new Set());

  const merged = [
    ...localAdded.filter(u => !updates.some(x => x.id === u.id)),
    ...updates,
  ]
    .filter(u => !localDeleted.has(u.id))
    .sort((a, b) => (a.achieved_on < b.achieved_on ? 1 : a.achieved_on > b.achieved_on ? -1 : (a.created_at < b.created_at ? 1 : -1)));
  const latest = merged[0];

  const save = async () => {
    if (!token || !title.trim()) { toast.error("Add a title"); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("investor-write", {
        body: { token, op: "insert", table: "investor_updates", row: { title: title.trim(), body: body.trim() || null, achieved_on: achievedOn } },
      });
      const serverError = (data as any)?.error;
      if (serverError) throw new Error(serverError + ((data as any).details ? ` — ${(data as any).details}` : ""));
      if (error) throw new Error(error.message || "Request failed");
      const saved = (data as any)?.data as InvestorUpdateRow | undefined;
      if (saved && saved.id) {
        setLocalAdded(prev => [saved, ...prev.filter(u => u.id !== saved.id)]);
      }
      setTitle(""); setBody(""); setAdding(false);
      toast.success("Update logged");
      // Fire the background refresh but do not block the UI on it.
      onChanged();
    } catch (e: any) { toast.error(e.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!token) return;
    if (!confirm("Delete this update?")) return;
    try {
      const { data, error } = await supabase.functions.invoke("investor-write", {
        body: { token, op: "delete", table: "investor_updates", id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setLocalDeleted(prev => { const next = new Set(prev); next.add(id); return next; });
      setLocalAdded(prev => prev.filter(u => u.id !== id));
      toast.success("Deleted");
      onChanged();
    } catch (e: any) { toast.error(e.message || "Delete failed"); }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full mb-3 md:mb-4 rounded-lg border border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent hover:from-primary/20 hover:via-primary/10 transition-all px-3 md:px-4 py-2 md:py-2.5 flex items-center gap-3 text-left"
      >
        <span className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] uppercase tracking-widest font-bbh text-primary leading-none">Recent achievement</div>
          {latest ? (
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-sm font-semibold truncate text-foreground">{latest.title}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">{formatDistanceToNow(new Date(latest.achieved_on), { addSuffix: true })}</span>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground mt-0.5">No updates logged yet{unlocked ? " — click to add the first." : "."}</div>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Achievement log</DialogTitle>
          </DialogHeader>

          {unlocked && (
            <div className="mb-4">
              {!adding ? (
                <Button size="sm" onClick={() => setAdding(true)} className="gap-2"><Plus className="h-3.5 w-3.5" /> Add update</Button>
              ) : (
                <Card className="p-3 space-y-3 bg-muted/30">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Title</Label>
                      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Signed new sponsor partnership" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Date</Label>
                      <Input type="date" value={achievedOn} onChange={e => setAchievedOn(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Details (optional)</Label>
                    <Textarea value={body} onChange={e => setBody(e.target.value)} rows={3} placeholder="Context, numbers, links..." />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setTitle(""); setBody(""); }}>Cancel</Button>
                    <Button size="sm" onClick={save} disabled={saving} className="gap-2">
                      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}

          <div className="space-y-2">
            {merged.length === 0 && (
              <div className="text-sm text-muted-foreground italic py-6 text-center">No updates yet.</div>
            )}
            {merged.map(u => (
              <Card key={u.id} className="p-3 group">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase tracking-widest font-bbh text-primary">
                      {format(new Date(u.achieved_on), "d MMM yyyy")}
                      {u.author_label ? <span className="text-muted-foreground"> · {u.author_label}</span> : null}
                    </div>
                    <div className="font-semibold text-sm mt-0.5">{u.title}</div>
                    {u.body && <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{u.body}</div>}
                  </div>
                  {unlocked && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => remove(u.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};