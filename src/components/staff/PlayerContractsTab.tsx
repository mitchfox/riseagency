import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, differenceInDays } from "date-fns";

interface Contract {
  id: string;
  player_id: string;
  club_name: string;
  contract_start: string | null;
  contract_end: string | null;
  annual_salary: number | null;
  bonuses_notes: string | null;
  clauses_notes: string | null;
  sponsor_notes: string | null;
  general_notes: string | null;
  is_current: boolean;
}

interface Props {
  playerId: string;
}

const blank = (playerId: string): Contract => ({
  id: "",
  player_id: playerId,
  club_name: "",
  contract_start: null,
  contract_end: null,
  annual_salary: null,
  bonuses_notes: "",
  clauses_notes: "",
  sponsor_notes: "",
  general_notes: "",
  is_current: true,
});

export const PlayerContractsTab = ({ playerId }: Props) => {
  const [rows, setRows] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("player_club_contracts")
      .select("*")
      .eq("player_id", playerId)
      .order("contract_end", { ascending: false, nullsFirst: false });
    if (error) toast.error(error.message);
    else setRows((data as Contract[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (playerId) load(); }, [playerId]);

  const update = (idx: number, patch: Partial<Contract>) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };

  const saveRow = async (row: Contract) => {
    if (!row.club_name.trim()) { toast.error("Club name required"); return; }
    setSavingId(row.id || "new");
    const payload: any = { ...row };
    delete payload.id;
    if (!row.id) {
      const { error } = await supabase.from("player_club_contracts").insert(payload);
      if (error) toast.error(error.message); else { toast.success("Contract added"); load(); }
    } else {
      const { error } = await supabase.from("player_club_contracts").update(payload).eq("id", row.id);
      if (error) toast.error(error.message); else toast.success("Saved");
    }
    setSavingId(null);
  };

  const deleteRow = async (id: string) => {
    if (!id) { setRows(prev => prev.filter(r => r.id !== "")); return; }
    if (!confirm("Delete this contract entry?")) return;
    const { error } = await supabase.from("player_club_contracts").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Removed"); load(); }
  };

  const addNew = () => {
    if (rows.some(r => !r.id)) return;
    setRows(prev => [blank(playerId), ...prev]);
  };

  const expiryBadge = (end: string | null) => {
    if (!end) return null;
    const days = differenceInDays(parseISO(end), new Date());
    if (days < 0) return <span className="text-xs px-2 py-0.5 rounded bg-destructive/20 text-destructive">Expired</span>;
    if (days < 180) return <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-500">{days}d left</span>;
    return <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">{days}d</span>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-3 md:px-6 py-3 md:py-4">
        <CardTitle>Club Contracts</CardTitle>
        <Button size="sm" onClick={addNew} disabled={rows.some(r => !r.id)}>
          <Plus className="w-4 h-4 mr-1" /> Add contract
        </Button>
      </CardHeader>
      <CardContent className="px-3 md:px-6 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No contracts logged yet.</p>
        ) : rows.map((row, idx) => (
          <div key={row.id || `new-${idx}`} className="border border-border rounded-lg p-4 space-y-3 bg-card/50">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  value={row.club_name}
                  onChange={(e) => update(idx, { club_name: e.target.value })}
                  placeholder="Club name"
                  className="w-56 font-semibold"
                />
                {expiryBadge(row.contract_end)}
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground ml-2">
                  <Checkbox
                    checked={row.is_current}
                    onCheckedChange={(v) => update(idx, { is_current: !!v })}
                  />
                  Current
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => saveRow(row)} disabled={savingId === (row.id || "new")}>
                  {savingId === (row.id || "new") ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteRow(row.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Start date</Label>
                <Input type="date" value={row.contract_start ?? ""} onChange={(e) => update(idx, { contract_start: e.target.value || null })} />
              </div>
              <div>
                <Label className="text-xs">End date</Label>
                <Input type="date" value={row.contract_end ?? ""} onChange={(e) => update(idx, { contract_end: e.target.value || null })} />
              </div>
              <div>
                <Label className="text-xs">Annual salary</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={row.annual_salary ?? ""}
                  onChange={(e) => update(idx, { annual_salary: e.target.value === "" ? null : Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Bonuses</Label>
                <Textarea rows={2} value={row.bonuses_notes ?? ""} onChange={(e) => update(idx, { bonuses_notes: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Clauses</Label>
                <Textarea rows={2} value={row.clauses_notes ?? ""} onChange={(e) => update(idx, { clauses_notes: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Sponsor</Label>
                <Textarea rows={2} value={row.sponsor_notes ?? ""} onChange={(e) => update(idx, { sponsor_notes: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">General notes</Label>
                <Textarea rows={2} value={row.general_notes ?? ""} onChange={(e) => update(idx, { general_notes: e.target.value })} />
              </div>
            </div>

            {row.contract_end && (
              <p className="text-xs text-muted-foreground">
                Expires {format(parseISO(row.contract_end), "d MMM yyyy")}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
