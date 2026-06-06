import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Settings, Copy, ExternalLink, Trash2, Search, Upload, MessageCircle, Shield, FileBadge2, Video, Film } from "lucide-react";
import { toast } from "sonner";

const APP_BASE = "https://risefootballagency.com";
const slugify = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
const makeShortId = () => {
  const c = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += c[Math.floor(Math.random() * c.length)];
  return out;
};

interface PlayerLite { id: string; name: string; image_url: string | null; position: string | null; representation_status: string | null; }
interface ClubLite { id: string; club_name: string; country: string | null; image_url: string | null; }
interface OutreachRow {
  id: string;
  short_id: string;
  player_id: string;
  club_id: string;
  fit_recommendation: string | null;
  created_at: string;
  archived_at: string | null;
  player?: PlayerLite | null;
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

  const load = async () => {
    setLoading(true);
    const [{ data: linkRows }, { data: playerRows }, { data: clubRows }] = await Promise.all([
      supabase.from("club_outreach_links").select("*").is("archived_at", null).order("created_at", { ascending: false }),
      supabase.from("players").select("id, name, image_url, position, representation_status").not("representation_status", "in", "(Scouted,Fuel For Football)").order("name"),
      supabase.from("club_map_positions").select("id, club_name, country, image_url").order("club_name"),
    ]);
    const playerMap = new Map((playerRows ?? []).map((p: any) => [p.id, p]));
    const clubMap = new Map((clubRows ?? []).map((c: any) => [c.id, c]));
    setRows((linkRows ?? []).map((r: any) => ({ ...r, player: playerMap.get(r.player_id) ?? null, club: clubMap.get(r.club_id) ?? null })));
    setPlayers((playerRows ?? []) as PlayerLite[]);
    setClubs((clubRows ?? []) as ClubLite[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(r =>
      (r.player?.name ?? "").toLowerCase().includes(needle) ||
      (r.club?.club_name ?? "").toLowerCase().includes(needle)
    );
  }, [rows, q]);

  const proposalUrl = (shortId: string) => `${APP_BASE}/clubs/${shortId}`;

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
          <Button onClick={() => setNewOpen(true)} className="bg-[#C6A332] text-black hover:bg-[#C6A332]/90">
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
              url={proposalUrl(r.short_id)}
              onCopy={() => copyLink(r.short_id)}
              onEdit={() => setEditRow(r)}
              onRemove={() => remove(r.id)}
            />
          ))}
        </div>
      )}

      {newOpen && (
        <NewOutreachDialog
          open={newOpen}
          onClose={() => setNewOpen(false)}
          players={players}
          clubs={clubs}
          onCreated={() => { setNewOpen(false); load(); }}
        />
      )}
      {editRow && (
        <NewOutreachDialog
          open={!!editRow}
          onClose={() => setEditRow(null)}
          players={players}
          clubs={clubs}
          editing={editRow}
          onCreated={() => { setEditRow(null); load(); }}
        />
      )}
      {settingsOpen && (
        <SettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          players={players}
        />
      )}
    </div>
  );
}

function OutreachCard({ row, url, onCopy, onEdit, onRemove }: { row: OutreachRow; url: string; onCopy: () => void; onEdit: () => void; onRemove: () => void; }) {
  return (
    <div className="group relative rounded-xl border border-border bg-card p-4 hover:border-[#C6A332]/60 hover:shadow-[0_10px_40px_-15px_rgba(198,163,50,0.3)] transition-all">
      <div className="flex items-start gap-3">
        {row.club?.image_url ? (
          <img src={row.club.image_url} alt={row.club.club_name} className="h-12 w-12 object-contain rounded-md bg-white/5 p-1" />
        ) : (
          <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center text-sm">{row.club?.club_name?.[0] ?? "?"}</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{row.club?.club_name ?? "Unknown club"}</div>
          <div className="text-xs text-muted-foreground truncate">{row.player?.name ?? "Unknown player"}{row.player?.position ? ` • ${row.player.position}` : ""}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{new Date(row.created_at).toLocaleDateString()}</div>
        </div>
      </div>
      <div className="mt-3 px-2 py-1.5 rounded-md bg-muted/40 text-[11px] font-mono text-muted-foreground truncate">{url}</div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <Button size="sm" variant="outline" onClick={onCopy}><Copy className="h-3.5 w-3.5" /></Button>
        <Button size="sm" variant="outline" asChild><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a></Button>
        <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
        <Button size="sm" variant="outline" onClick={onRemove}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

function NewOutreachDialog({
  open, onClose, players, clubs, onCreated, editing,
}: {
  open: boolean; onClose: () => void; players: PlayerLite[]; clubs: ClubLite[]; onCreated: () => void; editing?: OutreachRow;
}) {
  const [playerId, setPlayerId] = useState(editing?.player_id ?? "");
  const [clubId, setClubId] = useState(editing?.club_id ?? "");
  const [clubQuery, setClubQuery] = useState("");
  const [playerQuery, setPlayerQuery] = useState("");
  const [fit, setFit] = useState(editing?.fit_recommendation ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const selectedClub = clubs.find(c => c.id === clubId) ?? null;

  const filteredPlayers = useMemo(() => {
    const n = playerQuery.trim().toLowerCase();
    return n ? players.filter(p => p.name.toLowerCase().includes(n)) : players;
  }, [players, playerQuery]);
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
      toast.success("Logo saved to coaching database");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const save = async () => {
    if (!playerId || !clubId) return toast.error("Pick a player and a club");
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("club_outreach_links").update({ player_id: playerId, club_id: clubId, fit_recommendation: fit }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Outreach updated");
      } else {
        const { data: u } = await supabase.auth.getUser();
        let attempt = 0;
        while (attempt < 5) {
          const short = makeShortId();
          const { error } = await supabase.from("club_outreach_links").insert({ short_id: short, player_id: playerId, club_id: clubId, fit_recommendation: fit, created_by: u.user?.id ?? null });
          if (!error) { toast.success("Outreach link created"); break; }
          if (!error || (error as any)?.code !== "23505") { throw error; }
          attempt++;
        }
      }
      onCreated();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Club Outreach" : "New Club Outreach"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Player */}
          <div>
            <Label>Player</Label>
            <Input placeholder="Search players" value={playerQuery} onChange={(e) => setPlayerQuery(e.target.value)} className="mt-1.5" />
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {filteredPlayers.map(p => (
                <button key={p.id} type="button" onClick={() => setPlayerId(p.id)}
                  className={`flex items-center gap-2 rounded-md border p-2 text-left ${playerId === p.id ? "border-[#C6A332] bg-[#C6A332]/10" : "border-border hover:border-[#C6A332]/40"}`}>
                  {p.image_url ? <img src={p.image_url} className="h-8 w-8 rounded-full object-cover" /> : <div className="h-8 w-8 rounded-full bg-muted" />}
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{p.position ?? ""}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Club */}
          <div>
            <Label>Club</Label>
            <Input placeholder="Search clubs" value={clubQuery} onChange={(e) => setClubQuery(e.target.value)} className="mt-1.5" />
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {filteredClubs.map(c => (
                <button key={c.id} type="button" onClick={() => setClubId(c.id)}
                  className={`flex items-center gap-2 rounded-md border p-2 text-left ${clubId === c.id ? "border-[#C6A332] bg-[#C6A332]/10" : "border-border hover:border-[#C6A332]/40"}`}>
                  {c.image_url ? <img src={c.image_url} className="h-8 w-8 object-contain bg-white/5 rounded" /> : <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-[10px]">No logo</div>}
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{c.club_name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{c.country ?? ""}</div>
                  </div>
                </button>
              ))}
            </div>
            {selectedClub && !selectedClub.image_url && (
              <div className="mt-3 rounded-md border border-dashed border-[#C6A332]/40 p-3 bg-[#C6A332]/5">
                <p className="text-xs mb-2">No logo on file for <b>{selectedClub.club_name}</b>. Upload one — it will be saved into the coaching database for future use.</p>
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{uploadingLogo ? "Uploading…" : "Upload logo"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onClubLogoUpload(f); }} disabled={uploadingLogo} />
                </label>
              </div>
            )}
          </div>

          {/* Fit text */}
          <div>
            <Label>Fit & Recommendation</Label>
            <Textarea
              rows={6}
              value={fit}
              onChange={(e) => setFit(e.target.value)}
              placeholder="Write a personalised note about why this player fits this club — playing style, role, why now."
              className="mt-1.5"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !playerId || !clubId} className="bg-[#C6A332] text-black hover:bg-[#C6A332]/90">
            {saving ? "Saving…" : editing ? "Save changes" : "Create link"}
          </Button>
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
      // immediate save
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
        </DialogHeader>

        <div className="space-y-8">
          {/* Agency WhatsApp */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="h-4 w-4 text-[#C6A332]" />
              <h3 className="text-sm font-semibold">Agency WhatsApp number</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Used by the WhatsApp button on every club proposal page. Include country code, e.g. <code>447700900000</code>.</p>
            <div className="flex gap-2">
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="447700900000" />
              <Button onClick={saveWhatsapp} disabled={loading}>Save</Button>
            </div>
          </section>

          {/* Player defaults */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-[#C6A332]" />
              <h3 className="text-sm font-semibold">Per-player defaults</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Configure the links and PoR PDF used for every outreach featuring this player.</p>

            <Input placeholder="Search players" value={playerQuery} onChange={(e) => setPlayerQuery(e.target.value)} className="mb-2" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1 mb-4">
              {filteredPlayers.map(p => (
                <button key={p.id} type="button" onClick={() => setSelectedPlayerId(p.id)}
                  className={`flex items-center gap-2 rounded-md border p-2 text-left ${selectedPlayerId === p.id ? "border-[#C6A332] bg-[#C6A332]/10" : "border-border hover:border-[#C6A332]/40"}`}>
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
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs mt-2 rounded-md border border-border px-3 py-2 hover:border-[#C6A332]/60">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{uploading ? "Uploading…" : "Upload PDF"}</span>
                    <input type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadProof(f); }} disabled={uploading} />
                  </label>
                </div>
                <div className="flex justify-end">
                  <Button onClick={saveDefaults} className="bg-[#C6A332] text-black hover:bg-[#C6A332]/90">Save defaults</Button>
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