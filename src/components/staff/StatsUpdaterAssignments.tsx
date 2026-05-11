import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Player = { id: string; name: string; club: string | null; position: string | null };

export const StatsUpdaterAssignments = ({ userId, open, onOpenChange }: Props) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const [p, a] = await Promise.all([
        supabase.from("players").select("id, name, club, position").order("name"),
        (supabase as any).from("staff_player_assignments").select("player_id").eq("user_id", userId).eq("role_key", "stats_updater"),
      ]);
      setPlayers((p.data || []) as Player[]);
      setAssigned(new Set(((a.data as any[]) || []).map((r: any) => r.player_id)));
      setLoading(false);
    })();
  }, [open, userId]);

  const toggle = (id: string) => {
    const next = new Set(assigned);
    if (next.has(id)) next.delete(id); else next.add(id);
    setAssigned(next);
  };

  const save = async () => {
    setSaving(true);
    await (supabase as any).from("staff_player_assignments").delete().eq("user_id", userId).eq("role_key", "stats_updater");
    if (assigned.size) {
      const rows = [...assigned].map((player_id) => ({ user_id: userId, player_id, role_key: "stats_updater" }));
      const { error } = await (supabase as any).from("staff_player_assignments").insert(rows);
      if (error) { toast.error("Failed to save"); setSaving(false); return; }
    }
    toast.success("Assignments saved");
    setSaving(false);
    onOpenChange(false);
  };

  const q = query.trim().toLowerCase();
  const filtered = q ? players.filter((p) => [p.name, p.club, p.position].some((v) => v?.toLowerCase().includes(q))) : players;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Users className="h-4 w-4" />Stats Updater players</DialogTitle></DialogHeader>
        <Input placeholder="Search players..." value={query} onChange={(e) => setQuery(e.target.value)} />
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto space-y-1 border rounded-lg p-2">
            {filtered.map((p) => (
              <label key={p.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer">
                <Checkbox checked={assigned.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{[p.position, p.club].filter(Boolean).join(" · ")}</p>
                </div>
              </label>
            ))}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground p-3">No players match.</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : `Save (${assigned.size})`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StatsUpdaterAssignments;