import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Settings, Copy, ExternalLink, Trash2, Search, Upload, MessageCircle, Shield, FileBadge2, Video, Film, FileText, X } from "lucide-react";
import { toast } from "sonner";

const APP_BASE = "https://risefootballagency.com";
const POSITION_SLOTS = ["GK", "CB", "FB", "DM", "CM", "AM", "W", "CF"];
const CHANNELS = ["WhatsApp", "Email", "Call", "Meeting", "Other"];

const slugify = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
const makeShortId = () => {
  const c = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += c[Math.floor(Math.random() * c.length)];
  return out;
};

interface PlayerLite { id: string; name: string; image_url: string | null; position: string | null; representation_status: string | null; }
interface ClubLite { id: string; club_name: string; country: string | null; image_url: string | null; }
interface LinkPlayerRow { player_id: string; position_slot: string | null; fit_recommendation: string | null; sort_order: number; }
interface OutreachRow {
  id: string;
  short_id: string;
  player_id: string | null;
  club_id: string;
  fit_recommendation: string | null;
  club_contact_name: string | null;
  club_contact_role: string | null;
  club_contact_phone: string | null;
  created_at: string;
  archived_at: string | null;
  link_players?: LinkPlayerRow[];
  club?: ClubLite | null;
}

export default function ClubOutreachManager() {
  const [rows, setRows] = useState<OutreachRow[]>([]);
  const [players, setPlayers] = useState<PlayerLite[]>([]);
  const [clubs, setClubs] = useState<ClubLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editRow, setEditRow] = useState<OutreachRow | null>(null);
  const [logRow, setLogRow] = useState<OutreachRow | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: linkRows }, { data: playerRows }, { data: clubRows }, { data: linkPlayerRows }] = await Promise.all([
      supabase.from("club_outreach_links").select("*").is("archived_at", null).order("created_at", { ascending: false }),
      supabase.from("players").select("id, name, image_url, position, representation_status").not("representation_status", "in", "(Scouted,Fuel For Football)").order("name"),
      supabase.from("club_map_positions").select("id, club_name, country, image_url").order("club_name"),
      supabase.from("club_outreach_link_players").select("link_id, player_id, position_slot, fit_recommendation, sort_order"),
    ]);
    const clubMap = new Map((clubRows ?? []).map((c: any) => [c.id, c]));
    const byLink = new Map<string, LinkPlayerRow[]>();
    (linkPlayerRows ?? []).forEach((lp: any) => {
      const arr = byLink.get(lp.link_id) ?? [];
      arr.push(lp);
      byLink.set(lp.link_id, arr);
    });
    setRows((linkRows ?? []).map((r: any) => ({
      ...r,
      link_players: (byLink.get(r.id) ?? []).sort((a, b) => a.sort_order - b.sort_order),
      club: clubMap.get(r.club_id) ?? null,
    })));
    setPlayers((playerRows ?? []) as PlayerLite[]);
    setClubs((clubRows ?? []) as ClubLite[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const playerById = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(r => {
      if ((r.club?.club_name ?? "").toLowerCase().includes(needle)) return true;
      return (r.link_players ?? []).some(lp => (playerById.get(lp.player_id)?.name ?? "").toLowerCase().includes(needle));
    });
  }, [rows, q, playerById]);

  const proposalUrl = (shortId: string) => `${APP_BASE}/club-proposal/${shortId}`;

  const copyLink = async (shortId: string) => {
    await navigator.clipboard.writeText(proposalUrl(shortId));
    toast.success("Link copied");
  };

  const remove = async (id: string) => {
    if (!confirm("Archive this outreach link? The public page will stop working.")) return;
    const { error } = await supabase.from("club_outreach_links").update({ archived_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Archived");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by player or club" className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setNewOpen(true)} className="bg-[hsl(43,96%,56%)] text-black hover:bg-[hsl(43,96%,56%)]/90">
            <Plus className="h-4 w-4 mr-2" /> New Outreach
          </Button>
          <Button variant="outline" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-2" /> Settings
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">No club outreach links yet. Create your first one to share a slick proposal with a club.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((r) => (
            <OutreachCard
              key={r.id}
              row={r}
              players={players}
              url={proposalUrl(r.short_id)}
              onCopy={() => copyLink(r.short_id)}
              onEdit={() => setEditRow(r)}
              onLog={() => setLogRow(r)}
              onRemove={() => remove(r.id)}
            />
          ))}
        </div>
      )}

      {newOpen && (
        <OutreachDialog open={newOpen} onClose={() => setNewOpen(false)} players={players} clubs={clubs} onSaved={() => { setNewOpen(false); load(); }} />
      )}
      {editRow && (
        <OutreachDialog open={!!editRow} onClose={() => setEditRow(null)} players={players} clubs={clubs} editing={editRow} onSaved={() => { setEditRow(null); load(); }} />
      )}
      {settingsOpen && (
        <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} players={players} />
      )}
      {logRow && (
        <CommunicationsDialog open={!!logRow} onClose={() => setLogRow(null)} outreach={logRow} players={players} />
      )}
    </div>
  );
}

function OutreachCard({ row, url, players, onCopy, onEdit, onLog, onRemove }: { row: OutreachRow; url: string; players: PlayerLite[]; onCopy: () => void; onEdit: () => void; onLog: () => void; onRemove: () => void; }) {
  const playerById = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);
  const names = (row.link_players ?? []).map(lp => playerById.get(lp.player_id)?.name).filter(Boolean) as string[];
  return (
    <div className="group relative rounded-xl border border-border bg-card p-4 hover:border-[hsl(43,96%,56%)]/60 hover:shadow-[0_10px_40px_-15px_rgba(251,189,35,0.3)] transition-all">
      <div className="flex items-start gap-3">
        {row.club?.image_url ? (
          <img src={row.club.image_url} alt={row.club.club_name} className="h-12 w-12 object-contain rounded-md bg-white/5 p-1" />
        ) : (
          <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center text-sm">{row.club?.club_name?.[0] ?? "?"}</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{row.club?.club_name ?? "Unknown club"}</div>
          <div className="text-xs text-muted-foreground truncate">{names.length ? names.join(", ") : "No players"}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{new Date(row.created_at).toLocaleDateString()}</div>
        </div>
      </div>
      <div className="mt-3 px-2 py-1.5 rounded-md bg-muted/40 text-[11px] font-mono text-muted-foreground truncate">{url}</div>
      <div className="mt-3 grid grid-cols-5 gap-2">
        <Button size="sm" variant="outline" onClick={onCopy} title="Copy link"><Copy className="h-3.5 w-3.5" /></Button>
        <Button size="sm" variant="outline" asChild title="Open link"><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a></Button>
        <Button size="sm" variant="outline" onClick={onLog} title="Log update"><FileText className="h-3.5 w-3.5" /></Button>
        <Button size="sm" variant="outline" onClick={onEdit} title="Edit">Edit</Button>
        <Button size="sm" variant="outline" onClick={onRemove} title="Archive"><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

function OutreachDialog({ open, onClose, players, clubs, onSaved, editing }: { open: boolean; onClose: () => void; players: PlayerLite[]; clubs: ClubLite[]; onSaved: () => void; editing?: OutreachRow; }) {
  const [clubId, setClubId] = useState(editing?.club_id ?? "");
  const [clubQuery, setClubQuery] = useState("");
  const [playerQuery, setPlayerQuery] = useState("");
  const [contactName, setContactName] = useState(editing?.club_contact_name ?? "");
  const [contactRole, setContactRole] = useState(editing?.club_contact_role ?? "");
  const [contactPhone, setContactPhone] = useState(editing?.club_contact_phone ?? "");
  const [entries, setEntries] = useState<LinkPlayerRow[]>(editing?.link_players ?? []);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const selectedClub = clubs.find(c => c.id === clubId) ?? null;
  const selectedIds = new Set(entries.map(e => e.player_id));
  const playerById = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);

  const filteredPlayers = useMemo(() => {
    const n = playerQuery.trim().toLowerCase();
    const pool = players.filter(p => !selectedIds.has(p.id));
    return n ? pool.filter(p => p.name.toLowerCase().includes(n)) : pool;
  }, [players, playerQuery, selectedIds]);
  const filteredClubs = useMemo(() => {
    const n = clubQuery.trim().toLowerCase();
    return n ? clubs.filter(c => c.club_name.toLowerCase().includes(n)) : clubs;
  }, [clubs, clubQuery]);

  const onClubLogoUpload = async (file: File) => {
    if (!selectedClub) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${slugify(selectedClub.club_name)}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("club-logos").upload(path, file, { cacheControl: "3600", upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("club-logos").getPublicUrl(path);
      const publicUrl = data.publicUrl;
      const { error: updErr } = await supabase.from("club_map_positions").update({ image_url: publicUrl }).eq("id", selectedClub.id);
      if (updErr) throw updErr;
      selectedClub.image_url = publicUrl;
      toast.success("Logo saved");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const addPlayer = (id: string) => {
    setEntries(prev => [...prev, { player_id: id, position_slot: null, fit_recommendation: "", sort_order: prev.length }]);
    setPlayerQuery("");
  };
  const removePlayer = (id: string) => setEntries(prev => prev.filter(e => e.player_id !== id).map((e, i) => ({ ...e, sort_order: i })));
  const updateEntry = (id: string, patch: Partial<LinkPlayerRow>) => setEntries(prev => prev.map(e => e.player_id === id ? { ...e, ...patch } : e));

  const save = async () => {
    if (!clubId) return toast.error("Pick a club");
    if (entries.length === 0) return toast.error("Add at least one player");
    setSaving(true);
    try {
      const payload = {
        club_id: clubId,
        player_id: entries[0]?.player_id ?? null,
        fit_recommendation: entries[0]?.fit_recommendation ?? null,
        club_contact_name: contactName.trim() || null,
        club_contact_role: contactRole.trim() || null,
        club_contact_phone: contactPhone.trim() || null,
      };
      let linkId = editing?.id ?? null;
      if (editing) {
        const { error } = await supabase.from("club_outreach_links").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        let inserted = false;
        for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
          const short = makeShortId();
          const { data, error } = await supabase
            .from("club_outreach_links")
            .insert({ short_id: short, ...payload, created_by: u.user?.id ?? null })
            .select("id").single();
          if (!error && data) { linkId = data.id; inserted = true; break; }
          if ((error as any)?.code !== "23505") throw error;
        }
        if (!inserted) throw new Error("Failed to generate unique short id");
      }
      if (linkId) {
        await supabase.from("club_outreach_link_players").delete().eq("link_id", linkId);
        if (entries.length) {
          const rows = entries.map((e, i) => ({
            link_id: linkId!,
            player_id: e.player_id,
            position_slot: e.position_slot,
            fit_recommendation: e.fit_recommendation,
            sort_order: i,
          }));
          const { error: lpErr } = await supabase.from("club_outreach_link_players").insert(rows);
          if (lpErr) throw lpErr;
        }
      }
      toast.success(editing ? "Outreach updated" : "Outreach link created");
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Club Outreach" : "New Club Outreach"}</DialogTitle>
          <DialogDescription>Build a personalised proposal for a club. Add one or many players, each with their own position and fit note.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div>
            <Label>Club</Label>
            <Input placeholder="Search clubs" value={clubQuery} onChange={(e) => setClubQuery(e.target.value)} className="mt-1.5" />
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {filteredClubs.map(c => (
                <button key={c.id} type="button" onClick={() => setClubId(c.id)}
                  className={`flex items-center gap-2 rounded-md border p-2 text-left ${clubId === c.id ? "border-[hsl(43,96%,56%)] bg-[hsl(43,96%,56%)]/10" : "border-border hover:border-[hsl(43,96%,56%)]/40"}`}>
                  {c.image_url ? <img src={c.image_url} className="h-8 w-8 object-contain bg-white/5 rounded" /> : <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-[10px]">No logo</div>}
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{c.club_name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{c.country ?? ""}</div>
                  </div>
                </button>
              ))}
            </div>
            {selectedClub && !selectedClub.image_url && (
              <div className="mt-3 rounded-md border border-dashed border-[hsl(43,96%,56%)]/40 p-3 bg-[hsl(43,96%,56%)]/5">
                <p className="text-xs mb-2">No logo on file for <b>{selectedClub.club_name}</b>. Upload one — it will be saved into the coaching database.</p>
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{uploadingLogo ? "Uploading…" : "Upload logo"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onClubLogoUpload(f); }} disabled={uploadingLogo} />
                </label>
              </div>
            )}
          </div>

          <div>
            <Label>Players to propose</Label>
            <p className="text-[11px] text-muted-foreground mt-1 mb-2">Add one or many players. Each gets a position slot and personalised fit note.</p>
            <Input placeholder="Search players to add" value={playerQuery} onChange={(e) => setPlayerQuery(e.target.value)} />
            {playerQuery && filteredPlayers.length > 0 && (
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                {filteredPlayers.slice(0, 30).map(p => (
                  <button key={p.id} type="button" onClick={() => addPlayer(p.id)}
                    className="flex items-center gap-2 rounded-md border border-border p-2 text-left hover:border-[hsl(43,96%,56%)]/60">
                    {p.image_url ? <img src={p.image_url} className="h-8 w-8 rounded-full object-cover" /> : <div className="h-8 w-8 rounded-full bg-muted" />}
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{p.position ?? ""}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {entries.length === 0 ? (
              <div className="mt-3 rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No players added yet.</div>
            ) : (
              <div className="mt-3 space-y-3">
                {entries.map((e, idx) => {
                  const p = playerById.get(e.player_id);
                  return (
                    <div key={e.player_id} className="rounded-lg border border-border p-3 bg-muted/20">
                      <div className="flex items-center gap-3">
                        {p?.image_url ? <img src={p.image_url} className="h-10 w-10 rounded-full object-cover" /> : <div className="h-10 w-10 rounded-full bg-muted" />}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{p?.name ?? "Unknown"}</div>
                          <div className="text-[10px] text-muted-foreground">{idx + 1} of {entries.length}</div>
                        </div>
                        <div className="w-28">
                          <Select value={e.position_slot ?? ""} onValueChange={(v) => updateEntry(e.player_id, { position_slot: v || null })}>
                            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Position" /></SelectTrigger>
                            <SelectContent>{POSITION_SLOTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => removePlayer(e.player_id)}><X className="h-4 w-4" /></Button>
                      </div>
                      <Textarea
                        rows={3}
                        className="mt-2 text-sm"
                        placeholder={`Why ${p?.name?.split(" ")[0] ?? "this player"} fits this club — playing style, role, why now.`}
                        value={e.fit_recommendation ?? ""}
                        onChange={(ev) => updateEntry(e.player_id, { fit_recommendation: ev.target.value })}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/10">
            <div>
              <Label>Club contact (optional)</Label>
              <p className="text-[11px] text-muted-foreground mt-1">Adds a second WhatsApp button on the proposal so the club official is reachable directly, clearly distinct from our agency contact.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input placeholder="Name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
              <Input placeholder="Role e.g. Technical Director" value={contactRole} onChange={(e) => setContactRole(e.target.value)} />
              <Input placeholder="Phone e.g. 447700900000" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !clubId || entries.length === 0} className="bg-[hsl(43,96%,56%)] text-black hover:bg-[hsl(43,96%,56%)]/90">
            {saving ? "Saving…" : editing ? "Save changes" : "Create link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CommunicationsDialog({ open, onClose, outreach, players }: { open: boolean; onClose: () => void; outreach: OutreachRow; players: PlayerLite[]; }) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerId, setPlayerId] = useState<string>("");
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [channel, setChannel] = useState("WhatsApp");
  const [summary, setSummary] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [contactedAt, setContactedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [saving, setSaving] = useState(false);

  const playerById = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);
  const linkPlayers = (outreach.link_players ?? []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("club_outreach_communications").select("*").eq("outreach_id", outreach.id).order("contacted_at", { ascending: false });
    setList(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [outreach.id]);

  const submit = async () => {
    if (!summary.trim()) return toast.error("Add a short summary");
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("club_outreach_communications").insert({
        outreach_id: outreach.id,
        player_id: playerId || null,
        contacted_at: new Date(contactedAt).toISOString(),
        contact_name: contactName.trim() || null,
        contact_role: contactRole.trim() || null,
        channel: channel || null,
        summary: summary.trim(),
        next_step: nextStep.trim() || null,
        created_by: u.user?.id ?? null,
      });
      if (error) throw error;
      toast.success("Update logged");
      setSummary(""); setNextStep(""); setContactName(""); setContactRole("");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to log");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    await supabase.from("club_outreach_communications").delete().eq("id", id);
    load();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log update — {outreach.club?.club_name ?? "Club"}</DialogTitle>
          <DialogDescription>Record who at the club was contacted. Players linked to this outreach can see entries that relate to them in their Transfer Hub.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Player</Label>
              <Select value={playerId} onValueChange={setPlayerId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Whole outreach / pick a player" /></SelectTrigger>
                <SelectContent>
                  {linkPlayers.map(lp => {
                    const p = playerById.get(lp.player_id);
                    return <SelectItem key={lp.player_id} value={lp.player_id}>{p?.name ?? "Player"}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contacted at</Label>
              <Input type="datetime-local" value={contactedAt} onChange={(e) => setContactedAt(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Who was contacted</Label>
              <Input placeholder="Name" value={contactName} onChange={(e) => setContactName(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Their role</Label>
              <Input placeholder="e.g. Technical Director" value={contactRole} onChange={(e) => setContactRole(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>{CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Summary</Label>
            <Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What was discussed?" className="mt-1.5" />
          </div>
          <div>
            <Label>Next step</Label>
            <Input value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="e.g. Follow up next week" className="mt-1.5" />
          </div>
          <div className="flex justify-end">
            <Button onClick={submit} disabled={saving} className="bg-[hsl(43,96%,56%)] text-black hover:bg-[hsl(43,96%,56%)]/90">{saving ? "Saving…" : "Log update"}</Button>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2">Previous updates</h4>
          {loading ? <p className="text-xs text-muted-foreground">Loading…</p> : list.length === 0 ? (
            <p className="text-xs text-muted-foreground">No updates yet.</p>
          ) : (
            <div className="space-y-2">
              {list.map((row) => (
                <div key={row.id} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">{new Date(row.contacted_at).toLocaleString()} • {row.channel ?? "—"}{row.player_id ? ` • ${playerById.get(row.player_id)?.name ?? ""}` : ""}</div>
                      <div className="font-medium">{row.contact_name ?? "—"}{row.contact_role ? ` · ${row.contact_role}` : ""}</div>
                      <div className="mt-1 whitespace-pre-wrap">{row.summary}</div>
                      {row.next_step && <div className="mt-1 text-xs"><b>Next:</b> {row.next_step}</div>}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => remove(row.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingsDialog({ open, onClose, players }: { open: boolean; onClose: () => void; players: PlayerLite[]; }) {
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [defaults, setDefaults] = useState<{ stars_url_override: string; highlights_url: string; proof_path: string | null }>({ stars_url_override: "", highlights_url: "", proof_path: null });
  const [uploading, setUploading] = useState(false);
  const [playerQuery, setPlayerQuery] = useState("");

  const filteredPlayers = useMemo(() => {
    const n = playerQuery.trim().toLowerCase();
    return n ? players.filter(p => p.name.toLowerCase().includes(n)) : players;
  }, [players, playerQuery]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("club_outreach_settings").select("whatsapp_number").eq("id", 1).maybeSingle();
      setWhatsapp(data?.whatsapp_number ?? "");
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedPlayerId) return;
    (async () => {
      const { data } = await supabase.from("club_outreach_player_defaults").select("*").eq("player_id", selectedPlayerId).maybeSingle();
      setDefaults({
        stars_url_override: data?.stars_url_override ?? "",
        highlights_url: data?.highlights_url ?? "",
        proof_path: data?.proof_of_representation_path ?? null,
      });
    })();
  }, [selectedPlayerId]);

  const saveWhatsapp = async () => {
    const { error } = await supabase.from("club_outreach_settings").upsert({ id: 1, whatsapp_number: whatsapp.trim(), updated_at: new Date().toISOString() });
    if (error) return toast.error(error.message);
    toast.success("WhatsApp number saved");
  };

  const saveDefaults = async () => {
    if (!selectedPlayerId) return;
    const { error } = await supabase.from("club_outreach_player_defaults").upsert({
      player_id: selectedPlayerId,
      stars_url_override: defaults.stars_url_override.trim() || null,
      highlights_url: defaults.highlights_url.trim() || null,
      proof_of_representation_path: defaults.proof_path,
      updated_at: new Date().toISOString(),
    });
    if (error) return toast.error(error.message);
    toast.success("Player defaults saved");
  };

  const uploadProof = async (file: File) => {
    if (!selectedPlayerId) return;
    setUploading(true);
    try {
      const path = `${selectedPlayerId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("proof-of-representation").upload(path, file, { upsert: true });
      if (error) throw error;
      setDefaults(d => ({ ...d, proof_path: path }));
      await supabase.from("club_outreach_player_defaults").upsert({
        player_id: selectedPlayerId,
        stars_url_override: defaults.stars_url_override.trim() || null,
        highlights_url: defaults.highlights_url.trim() || null,
        proof_of_representation_path: path,
        updated_at: new Date().toISOString(),
      });
      toast.success("Proof of Representation uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);
  const autoStars = selectedPlayer ? `https://risefootballagency.com/stars/${slugify(selectedPlayer.name)}` : "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Club Outreach Settings</DialogTitle>
          <DialogDescription>Agency WhatsApp and per-player defaults reused on every proposal.</DialogDescription>
        </DialogHeader>
        <div className="space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="h-4 w-4 text-[hsl(43,96%,56%)]" />
              <h3 className="text-sm font-semibold">Agency WhatsApp number</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Used by the WhatsApp button on every proposal. Include country code, e.g. <code>447700900000</code>.</p>
            <div className="flex gap-2">
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="447700900000" />
              <Button onClick={saveWhatsapp} disabled={loading}>Save</Button>
            </div>
          </section>
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-[hsl(43,96%,56%)]" />
              <h3 className="text-sm font-semibold">Per-player defaults</h3>
            </div>
            <Input placeholder="Search players" value={playerQuery} onChange={(e) => setPlayerQuery(e.target.value)} className="mb-2" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1 mb-4">
              {filteredPlayers.map(p => (
                <button key={p.id} type="button" onClick={() => setSelectedPlayerId(p.id)}
                  className={`flex items-center gap-2 rounded-md border p-2 text-left ${selectedPlayerId === p.id ? "border-[hsl(43,96%,56%)] bg-[hsl(43,96%,56%)]/10" : "border-border hover:border-[hsl(43,96%,56%)]/40"}`}>
                  {p.image_url ? <img src={p.image_url} className="h-8 w-8 rounded-full object-cover" /> : <div className="h-8 w-8 rounded-full bg-muted" />}
                  <div className="text-xs font-medium truncate">{p.name}</div>
                </button>
              ))}
            </div>
            {selectedPlayerId && (
              <div className="space-y-4 rounded-md border border-border p-4">
                <div>
                  <Label className="flex items-center gap-2"><Video className="h-3.5 w-3.5" /> Stars page link</Label>
                  <p className="text-[11px] text-muted-foreground mt-1">Auto: <span className="font-mono">{autoStars}</span></p>
                  <Input className="mt-1.5" placeholder="Override URL (optional)" value={defaults.stars_url_override} onChange={(e) => setDefaults(d => ({ ...d, stars_url_override: e.target.value }))} />
                </div>
                <div>
                  <Label className="flex items-center gap-2"><Film className="h-3.5 w-3.5" /> Full season highlights link</Label>
                  <Input className="mt-1.5" placeholder="Paste the highlights URL" value={defaults.highlights_url} onChange={(e) => setDefaults(d => ({ ...d, highlights_url: e.target.value }))} />
                </div>
                <div>
                  <Label className="flex items-center gap-2"><FileBadge2 className="h-3.5 w-3.5" /> Proof of Representation PDF</Label>
                  {defaults.proof_path ? (
                    <p className="text-[11px] text-muted-foreground mt-1 font-mono break-all">{defaults.proof_path}</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground mt-1">No file uploaded yet.</p>
                  )}
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs mt-2 rounded-md border border-border px-3 py-2 hover:border-[hsl(43,96%,56%)]/60">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{uploading ? "Uploading…" : "Upload PDF"}</span>
                    <input type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadProof(f); }} disabled={uploading} />
                  </label>
                </div>
                <div className="flex justify-end">
                  <Button onClick={saveDefaults} className="bg-[hsl(43,96%,56%)] text-black hover:bg-[hsl(43,96%,56%)]/90">Save defaults</Button>
                </div>
              </div>
            )}
          </section>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}