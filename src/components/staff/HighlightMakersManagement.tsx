import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Trash2, Users, KeyRound, Pencil, Search, Film } from "lucide-react";
import { format } from "date-fns";

interface Maker {
  id: string;
  username: string;
  password: string;
  display_name: string;
  status: string;
  last_login_at: string | null;
  created_at: string;
}

interface PlayerLite {
  id: string;
  name: string;
  position: string | null;
  club: string | null;
  representation_status?: string | null;
  category?: string | null;
}

const isAvailableForHighlightMakers = (player: PlayerLite) =>
  player.category !== "Scouted" &&
  player.category !== "Fuel For Football" &&
  player.representation_status !== "Scouted" &&
  player.representation_status !== "Fuel For Football";

const normaliseSearch = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const autoMatchedPlayerIds = (players: PlayerLite[], username: string, displayName: string) => {
  const haystack = normaliseSearch(`${username} ${displayName}`);
  if (!haystack) return [] as string[];
  return players
    .filter((player) => {
      const nameParts = player.name.split(/\s+/).filter((part) => part.length >= 3);
      const surname = nameParts[nameParts.length - 1] || "";
      return nameParts.some((part) => haystack.includes(normaliseSearch(part))) ||
        (!!surname && haystack.includes(normaliseSearch(surname)));
    })
    .map((player) => player.id);
};

export const HighlightMakersManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  const [makers, setMakers] = useState<Maker[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Maker | null>(null);
  const [managing, setManaging] = useState<Maker | null>(null);

  const load = async () => {
    setLoading(true);
    const [m, c] = await Promise.all([
      supabase.from("highlight_makers").select("*").order("created_at", { ascending: false }),
      supabase.from("highlight_maker_players").select("highlight_maker_id"),
    ]);
    if (m.error) toast.error(m.error.message);
    else setMakers((m.data || []) as Maker[]);
    if (!c.error) {
      const map: Record<string, number> = {};
      (c.data || []).forEach((r: any) => {
        map[r.highlight_maker_id] = (map[r.highlight_maker_id] || 0) + 1;
      });
      setCounts(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const deleteMaker = async (m: Maker) => {
    if (!confirm(`Delete ${m.display_name}?`)) return;
    const { error } = await supabase.from("highlight_makers").delete().eq("id", m.id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  };

  const toggleStatus = async (m: Maker) => {
    const next = m.status === "active" ? "disabled" : "active";
    const { error } = await supabase
      .from("highlight_makers").update({ status: next }).eq("id", m.id);
    if (error) toast.error(error.message);
    else { toast.success(`Set to ${next}`); load(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Highlights Makers</h2>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAdd(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Add maker
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        External editors who can view assigned players' playlists and reports, and
        download clips. Sign-in is at <code>/highlights-login</code>.
      </p>

      {loading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : makers.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No Highlights Makers yet.
        </Card>
      ) : (
        <div className="space-y-2">
          {makers.map((m) => (
            <Card key={m.id} className="p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{m.display_name}</span>
                  <Badge variant={m.status === "active" ? "default" : "secondary"}>
                    {m.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  <span>@{m.username}</span>
                  <span>{counts[m.id] || 0} players</span>
                  {m.last_login_at && (
                    <span>Last login {format(new Date(m.last_login_at), "d MMM yyyy HH:mm")}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => setManaging(m)}>
                  <Users className="w-4 h-4 mr-1" /> Players
                </Button>
                {isAdmin && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setEditing(m)}>
                      <Pencil className="w-4 h-4 mr-1" /> Edit
                    </Button>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={m.status === "active"}
                        onCheckedChange={() => toggleStatus(m)}
                      />
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => deleteMaker(m)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showAdd && (
        <MakerDialog
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load(); }}
        />
      )}
      {editing && (
        <MakerDialog
          maker={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      {managing && (
        <ManagePlayersDialog
          maker={managing}
          onClose={() => { setManaging(null); load(); }}
        />
      )}
    </div>
  );
};

const MakerDialog = ({
  maker, onClose, onSaved,
}: { maker?: Maker; onClose: () => void; onSaved: () => void }) => {
  const [username, setUsername] = useState(maker?.username || "");
  const [displayName, setDisplayName] = useState(maker?.display_name || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!username.trim() || !displayName.trim()) {
      toast.error("Username and display name are required");
      return;
    }
    setSaving(true);
    try {
      if (maker) {
        const { error } = await supabase.from("highlight_makers").update({
          username: username.trim(),
          password: "",
          display_name: displayName.trim(),
        }).eq("id", maker.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("highlight_makers").insert({
          username: username.trim(),
          password: "",
          display_name: displayName.trim(),
        });
        if (error) throw error;
      }
      toast.success("Saved");
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{maker ? "Edit maker" : "Add Highlights Maker"}</DialogTitle>
          <DialogDescription>
            Username can be anything you like (letters, numbers, symbols). No password needed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Display name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ManagePlayersDialog = ({
  maker, onClose,
}: { maker: Maker; onClose: () => void }) => {
  const [players, setPlayers] = useState<PlayerLite[]>([]);
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [p, a] = await Promise.all([
        supabase
          .from("players")
          .select("id, name, position, club, representation_status, category")
          .order("name", { ascending: true }),
        supabase
          .from("highlight_maker_players")
          .select("player_id")
          .eq("highlight_maker_id", maker.id),
      ]);
      if (!p.error) {
        const filtered = (p.data || []).filter((pl: any) =>
          pl.category !== "Scouted" && pl.category !== "Fuel For Football",
        );
        setPlayers(filtered as any);
      }
      if (!a.error) {
        setAssigned(new Set((a.data || []).map((r: any) => r.player_id)));
      }
      setLoading(false);
    })();
  }, [maker.id]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return players;
    return players.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.club || "").toLowerCase().includes(q),
    );
  }, [players, search]);

  const toggle = (id: string) => {
    setAssigned((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Replace strategy: delete current, insert new
      const { error: delErr } = await supabase
        .from("highlight_maker_players")
        .delete()
        .eq("highlight_maker_id", maker.id);
      if (delErr) throw delErr;
      if (assigned.size > 0) {
        const rows = Array.from(assigned).map((pid) => ({
          highlight_maker_id: maker.id,
          player_id: pid,
        }));
        const { error: insErr } = await supabase
          .from("highlight_maker_players").insert(rows);
        if (insErr) throw insErr;
      }
      toast.success("Players updated");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Players for {maker.display_name}</DialogTitle>
          <DialogDescription>
            Tick the players whose clips and reports this maker should be able to see.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="max-h-[400px] overflow-y-auto border border-border rounded-md divide-y divide-border">
          {loading ? (
            <div className="p-4 text-muted-foreground">Loading players...</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-muted-foreground">No players</div>
          ) : (
            filtered.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-3 p-2 cursor-pointer hover:bg-muted/30"
              >
                <Checkbox
                  checked={assigned.has(p.id)}
                  onCheckedChange={() => toggle(p.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {p.position}{p.club ? ` • ${p.club}` : ""}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>
        <DialogFooter>
          <div className="text-sm text-muted-foreground mr-auto">
            {assigned.size} selected
          </div>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};