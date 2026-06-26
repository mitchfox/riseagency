import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TemplateRow {
  id: string;
  title: string;
  description: string | null;
  attachments: any;
}

interface Props {
  open: boolean;
  onClose: () => void;
  playerId: string;
  existingCount: number;
  onImported: () => void;
}

export const ImportTechnicalProgrammeDialog = ({ open, onClose, playerId, existingCount, onImported }: Props) => {
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("coaching_programmes")
        .select("id, title, description, attachments, category")
        .eq("category", "Technical")
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      setRows(((data || []) as any[]).filter(r => Array.isArray((r.attachments as any)?.technical_sessions)));
      setLoading(false);
    })();
  }, [open]);

  const filtered = rows.filter(r => !query.trim() || (r.title || "").toLowerCase().includes(query.toLowerCase()));

  const doImport = async (tpl: TemplateRow) => {
    setImporting(tpl.id);
    try {
      const sessionsTpl: any[] = (tpl.attachments?.technical_sessions || []);
      const { data: progIns, error: pErr } = await supabase
        .from("technical_programs" as any)
        .insert({
          player_id: playerId,
          program_name: tpl.title,
          phase_name: null,
          display_order: existingCount,
        } as any)
        .select("id")
        .single();
      if (pErr) throw pErr;
      const programId = (progIns as any).id as string;

      for (let si = 0; si < sessionsTpl.length; si++) {
        const s = sessionsTpl[si] || {};
        const { data: sIns, error: sErr } = await supabase
          .from("technical_sessions" as any)
          .insert({
            program_id: programId,
            session_key: s.key || String.fromCharCode(65 + si),
            title: s.title || null,
            description: s.description || null,
            display_order: si,
          } as any)
          .select("id")
          .single();
        if (sErr) throw sErr;
        const sessionId = (sIns as any).id as string;

        const drills: any[] = Array.isArray(s.drills) ? s.drills : [];
        for (let di = 0; di < drills.length; di++) {
          const d = drills[di] || {};
          const { data: dIns, error: dErr } = await supabase
            .from("technical_drills" as any)
            .insert({
              session_id: sessionId,
              name: d.name || "Drill",
              description: d.description || null,
              reps: d.reps ?? null,
              sets: d.sets ?? null,
              reps_per_side: !!d.reps_per_side,
              load: d.load ?? null,
              recovery_time: d.recovery_time ?? null,
              notes: d.notes ?? null,
              diagram: d.diagram ?? null,
              display_order: di,
            } as any)
            .select("id")
            .single();
          if (dErr) throw dErr;
          const drillId = (dIns as any).id as string;

          const variations: any[] = Array.isArray(d.variations) ? d.variations : [];
          if (variations.length) {
            const vRows = variations.map((v, vi) => ({
              drill_id: drillId,
              label: v.label || `Variation ${vi + 1}`,
              description: v.description || null,
              reps: v.reps ?? null,
              sets: v.sets ?? null,
              reps_per_side: !!v.reps_per_side,
              load: v.load ?? null,
              recovery_time: v.recovery_time ?? null,
              notes: v.notes ?? null,
              diagram: v.diagram ?? null,
              display_order: vi,
            }));
            const { error: vErr } = await supabase.from("technical_drill_variations" as any).insert(vRows as any);
            if (vErr) throw vErr;
          }
        }
      }
      toast.success(`Imported "${tpl.title}"`);
      onImported();
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Import failed");
    } finally {
      setImporting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Import Technical Programme from Coaching Database
          </DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search templates…" className="pl-9" />
        </div>
        <ScrollArea className="h-[420px] pr-3">
          {loading && <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">No Technical programmes saved to the database yet.</p>
          )}
          <div className="space-y-2">
            {filtered.map(r => {
              const sessionCount = Array.isArray(r.attachments?.technical_sessions) ? r.attachments.technical_sessions.length : 0;
              const drillCount = (r.attachments?.technical_sessions || []).reduce((a: number, s: any) => a + (Array.isArray(s.drills) ? s.drills.length : 0), 0);
              return (
                <div key={r.id} className="p-3 border rounded-lg flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground">{sessionCount} session(s) · {drillCount} drill(s)</div>
                    {r.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</div>}
                  </div>
                  <Button size="sm" onClick={() => doImport(r)} disabled={!!importing}>
                    {importing === r.id ? "Importing…" : "Import"}
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};