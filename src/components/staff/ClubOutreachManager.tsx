import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Settings, Copy, ExternalLink, Trash2, Search, Upload, MessageCircle, Shield, FileBadge2, Video, Film, FileText, X, Building2, FileEdit, Send, CheckCircle2, UserCircle2 } from "lucide-react";
import { toast } from "sonner";

const APP_BASE = "https://risefootballagency.com";
const POSITION_SLOTS = ["GK", "CB", "FB", "DM", "CM", "AM", "W", "CF"];
const CHANNELS = ["WhatsApp", "Email", "Call", "Meeting", "Other"];
const STATUSES = ["draft", "ready", "sent"] as const;
type OutreachStatus = typeof STATUSES[number];
const STATUS_LABELS: Record<OutreachStatus, string> = { draft: "Drafts", ready: "Ready To Send", sent: "Sent" };
const STATUS_ORDER: OutreachStatus[] = ["ready", "draft", "sent"];

const slugify = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
const slugifyShortId = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "").slice(0, 64);
const makeShortId = () => {
  const c = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += c[Math.floor(Math.random() * c.length)];
  return out;
};

interface QuickTemplate { id: string; title: string; content: string; sort_order: number; }

function fillTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

interface PlayerLite { id: string; name: string; image_url: string | null; position: string | null; representation_status: string | null; }
interface ClubLite { id: string; club_name: string; country: string | null; image_url: string | null; }
interface LinkPlayerRow { player_id: string; position_slot: string | null; fit_recommendation: string | null; sort_order: number; }
interface OutreachRow {
  id: string;
  short_id: string;
  player_id: string | null;
  club_id: string | null;
  fit_recommendation: string | null;
  club_contact_name: string | null;
  club_contact_role: string | null;
  club_contact_phone: string | null;
  club_contact_accent: string | null;
  created_at: string;
  archived_at: string | null;
  status: OutreachStatus;
  comm_count: number;
  prepared_for_name?: string | null;
  show_form?: boolean;
  show_in_numbers?: boolean;
  show_season_stats?: boolean;
  show_strengths?: boolean;
  link_players?: LinkPlayerRow[];
  club?: ClubLite | null;
  target_type?: 'club' | 'agent';
  agent_name?: string | null;
  agent_logo_url?: string | null;
}

type OutreachMode = 'club' | 'agent';

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
  const [templates, setTemplates] = useState<QuickTemplate[]>([]);
  const [defaultFit, setDefaultFit] = useState<string>("");
  const [mode, setMode] = useState<OutreachMode>('club');

  const loadTemplates = async () => {
    const { data } = await supabase.from("club_outreach_quick_templates").select("id,title,content,sort_order").order("sort_order").order("created_at");
    setTemplates((data ?? []) as QuickTemplate[]);
  };
  const loadSettings = async () => {
    const { data } = await (supabase as any).from("club_outreach_settings").select("default_fit_recommendation").eq("id", 1).maybeSingle();
    setDefaultFit(data?.default_fit_recommendation ?? "");
  };

  const load = async () => {
    setLoading(true);
    const [{ data: linkRows }, { data: playerRows }, { data: clubRows }, { data: linkPlayerRows }, { data: commRows }] = await Promise.all([
      supabase.from("club_outreach_links").select("*").is("archived_at", null).order("created_at", { ascending: false }),
      supabase.from("players").select("id, name, image_url, position, representation_status").not("representation_status", "in", "(Scouted,Fuel For Football)").order("name"),
      supabase.from("club_map_positions").select("id, club_name, country, image_url").order("club_name"),
      supabase.from("club_outreach_link_players").select("link_id, player_id, position_slot, fit_recommendation, sort_order"),
      supabase.from("club_outreach_communications").select("outreach_id"),
    ]);
    const clubMap = new Map((clubRows ?? []).map((c: any) => [c.id, c]));
    const byLink = new Map<string, LinkPlayerRow[]>();
    (linkPlayerRows ?? []).forEach((lp: any) => {
      const arr = byLink.get(lp.link_id) ?? [];
      arr.push(lp);
      byLink.set(lp.link_id, arr);
    });
    const commByLink = new Map<string, number>();
    (commRows ?? []).forEach((c: any) => {
      commByLink.set(c.outreach_id, (commByLink.get(c.outreach_id) ?? 0) + 1);
    });
    setRows((linkRows ?? []).map((r: any) => ({
      ...r,
      status: (r.status ?? "draft") as OutreachStatus,
      comm_count: commByLink.get(r.id) ?? 0,
      link_players: (byLink.get(r.id) ?? []).sort((a, b) => a.sort_order - b.sort_order),
      club: clubMap.get(r.club_id) ?? null,
      target_type: (r.target_type ?? 'club') as OutreachMode,
    })));
    setPlayers((playerRows ?? []) as PlayerLite[]);
    setClubs((clubRows ?? []) as ClubLite[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { loadTemplates(); loadSettings(); }, []);

  const playerById = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const scoped = rows.filter(r => (r.target_type ?? 'club') === mode);
    if (!needle) return scoped;
    return scoped.filter(r => {
      const targetLabel = mode === 'agent'
        ? (r.agent_name ?? "").toLowerCase()
        : (r.club?.club_name ?? "").toLowerCase();
      if (targetLabel.includes(needle)) return true;
      return (r.link_players ?? []).some(lp => (playerById.get(lp.player_id)?.name ?? "").toLowerCase().includes(needle));
    });
  }, [rows, q, playerById, mode]);

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

  const updateShortId = async (id: string, currentShort: string, nextRaw: string): Promise<boolean> => {
    const next = slugifyShortId(nextRaw);
    if (!next) { toast.error("URL ending can't be empty"); return false; }
    if (next === currentShort) return true;
    const { error } = await supabase.from("club_outreach_links").update({ short_id: next }).eq("id", id);
    if (error) {
      if ((error as any).code === "23505") toast.error("That URL ending is already taken");
      else toast.error(error.message);
      return false;
    }
    setRows(prev => prev.map(r => r.id === id ? { ...r, short_id: next } : r));
    toast.success("URL updated");
    return true;
  };

  const setStatus = async (id: string, status: OutreachStatus) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    const { error } = await supabase.from("club_outreach_links").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      load();
    }
  };

  const grouped = useMemo(() => {
    const map: Record<OutreachStatus, OutreachRow[]> = { ready: [], draft: [], sent: [] };
    filtered.forEach((r) => { map[r.status]?.push(r) ?? (map.draft.push(r)); });
    return map;
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1">
        {([
          { v: 'club', label: 'Club Outreach' },
          { v: 'agent', label: 'Agent Outreach' },
        ] as { v: OutreachMode; label: string }[]).map((t) => (
          <button
            key={t.v}
            type="button"
            onClick={() => setMode(t.v)}
            className={`px-4 py-1.5 text-xs uppercase tracking-wider rounded-md transition ${
              mode === t.v ? 'bg-[#cbb96b] text-black font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={mode === 'agent' ? 'Search by player or agent' : 'Search by player or club'} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setNewOpen(true)} className="bg-[#cbb96b] text-black hover:bg-[#cbb96b]/90">
            <Plus className="h-4 w-4 mr-2" /> {mode === 'agent' ? 'New Agent Outreach' : 'New Outreach'}
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
          <p className="text-sm text-muted-foreground">
            {mode === 'agent'
              ? "No agent outreach links yet. Create your first one to share a slick proposal with an agent."
              : "No club outreach links yet. Create your first one to share a slick proposal with a club."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {STATUS_ORDER.map((status, i) => (
            <section key={status}>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-white text-lg font-semibold tracking-tight">{STATUS_LABELS[status]}</h3>
                <span className="text-xs text-muted-foreground">{grouped[status].length}</span>
                <div className="flex-1 h-px bg-gradient-to-r from-[#cbb96b]/70 via-[#cbb96b]/30 to-transparent" />
              </div>
              {grouped[status].length === 0 ? (
                <p className="text-xs text-muted-foreground px-1">No outreach in this column.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {grouped[status].map((r) => (
                    <OutreachCard
                      key={r.id}
                      row={r}
                      players={players}
                      url={proposalUrl(r.short_id)}
                      onCopy={() => copyLink(r.short_id)}
                      onEdit={() => setEditRow(r)}
                      onLog={() => setLogRow(r)}
                      onRemove={() => remove(r.id)}
                      onStatusChange={(s) => setStatus(r.id, s)}
                      templates={templates}
                      onShortIdSave={(next) => updateShortId(r.id, r.short_id, next)}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {newOpen && (
       <OutreachDialog mode={mode} open={newOpen} onClose={() => setNewOpen(false)} players={players} clubs={clubs} defaultFit={defaultFit} onClubAdded={(c) => setClubs(prev => [...prev, c].sort((a, b) => a.club_name.localeCompare(b.club_name)))} onSaved={() => { setNewOpen(false); load(); }} />
      )}
      {editRow && (
       <OutreachDialog mode={(editRow.target_type ?? 'club') as OutreachMode} open={!!editRow} onClose={() => setEditRow(null)} players={players} clubs={clubs} defaultFit={defaultFit} editing={editRow} onClubAdded={(c) => setClubs(prev => [...prev, c].sort((a, b) => a.club_name.localeCompare(b.club_name)))} onSaved={() => { setEditRow(null); load(); }} />
      )}
      {settingsOpen && (
        <SettingsDialog open={settingsOpen} onClose={() => { setSettingsOpen(false); loadTemplates(); loadSettings(); }} players={players} clubs={clubs} />
      )}
      {logRow && (
        <CommunicationsDialog open={!!logRow} onClose={() => setLogRow(null)} outreach={logRow} players={players} />
      )}
    </div>
  );
}

function OutreachCard({ row, url, players, onCopy, onEdit, onLog, onRemove, onStatusChange, templates, onShortIdSave }: { row: OutreachRow; url: string; players: PlayerLite[]; onCopy: () => void; onEdit: () => void; onLog: () => void; onRemove: () => void; onStatusChange: (s: OutreachStatus) => void; templates: QuickTemplate[]; onShortIdSave: (next: string) => Promise<boolean>; }) {
  const playerById = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);
  const names = (row.link_players ?? []).map(lp => playerById.get(lp.player_id)?.name).filter(Boolean) as string[];
  const hasLogs = row.comm_count > 0;
  const [editingUrl, setEditingUrl] = useState(false);
  const [shortIdDraft, setShortIdDraft] = useState(row.short_id);
  useEffect(() => { setShortIdDraft(row.short_id); }, [row.short_id]);
  const firstPlayerName = names[0] ?? "";
  const copyTemplate = async (t: QuickTemplate) => {
    const filled = fillTemplate(t.content, {
      club: row.club?.club_name ?? "",
      player: firstPlayerName,
      first_name: firstPlayerName.split(" ")[0] ?? "",
      players: names.join(", "),
      link: url,
      url,
    });
    try {
      await navigator.clipboard.writeText(filled);
      toast.success(`Copied: ${t.title}`);
    } catch {
      toast.error("Clipboard unavailable");
    }
  };
  return (
    <div className="group relative rounded-xl border border-border bg-card p-4 hover:border-[#cbb96b]/60 hover:shadow-[0_10px_40px_-15px_rgba(203,185,107,0.3)] transition-all">
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
      <div className="mt-3 rounded-md bg-muted/40 px-2 py-1.5">
        {editingUrl ? (
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-muted-foreground shrink-0">/club-proposal/</span>
            <Input
              autoFocus
              value={shortIdDraft}
              onChange={(e) => setShortIdDraft(e.target.value)}
              className="h-6 text-[11px] font-mono px-1.5"
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  const ok = await onShortIdSave(shortIdDraft);
                  if (ok) setEditingUrl(false);
                } else if (e.key === "Escape") {
                  setShortIdDraft(row.short_id);
                  setEditingUrl(false);
                }
              }}
            />
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={async () => { const ok = await onShortIdSave(shortIdDraft); if (ok) setEditingUrl(false); }}>Save</Button>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => { setShortIdDraft(row.short_id); setEditingUrl(false); }}>Cancel</Button>
          </div>
        ) : (
          <button type="button" onClick={() => setEditingUrl(true)} className="w-full text-left text-[11px] font-mono text-muted-foreground truncate hover:text-foreground" title="Click to edit URL ending">
            {url}
          </button>
        )}
      </div>
      {templates.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {templates.map(t => {
            const preview = fillTemplate(t.content, {
              club: row.club?.club_name ?? "",
              player: firstPlayerName,
              first_name: firstPlayerName.split(" ")[0] ?? "",
              players: names.join(", "),
              link: url,
              url,
            });
            return (
              <button
                key={t.id}
                type="button"
                title={preview}
                onClick={() => copyTemplate(t)}
                className="inline-flex items-center gap-1 rounded-md border border-[#cbb96b]/40 bg-[#cbb96b]/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-[#cbb96b] hover:bg-[#cbb96b]/20"
              >
                <Copy className="h-3 w-3" /> {t.title}
              </button>
            );
          })}
        </div>
      )}
      <StatusToggle status={row.status} onChange={onStatusChange} />
      <div className="mt-3 grid grid-cols-5 gap-2">
        <Button size="sm" variant="outline" onClick={onCopy} title="Copy link"><Copy className="h-3.5 w-3.5" /></Button>
        <Button size="sm" variant="outline" asChild title="Open link"><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a></Button>
        <Button
          size="sm"
          variant={hasLogs ? "default" : "outline"}
          onClick={onLog}
          title={hasLogs ? "Update Transfer Hub log" : "Log to Transfer Hub"}
          className={hasLogs ? "bg-emerald-600 text-white hover:bg-emerald-500 border-emerald-600" : ""}
        >
          <Building2 className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline" onClick={onEdit} title="Edit">Edit</Button>
        <Button size="sm" variant="outline" onClick={onRemove} title="Archive"><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

function StatusToggle({ status, onChange }: { status: OutreachStatus; onChange: (s: OutreachStatus) => void }) {
  const opts: { value: OutreachStatus; label: string; icon: any }[] = [
    { value: "draft", label: "Draft", icon: FileEdit },
    { value: "ready", label: "Ready", icon: Send },
    { value: "sent", label: "Sent", icon: CheckCircle2 },
  ];
  return (
    <div className="mt-3 grid grid-cols-3 rounded-md border border-border p-0.5 bg-muted/30">
      {opts.map((o) => {
        const active = status === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex items-center justify-center gap-1.5 rounded-sm px-2 py-1 text-[11px] uppercase tracking-wider transition ${
              active
                ? "bg-[#cbb96b] text-black font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3 w-3" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function OutreachDialog({ open, onClose, players, clubs, onSaved, onClubAdded, editing, defaultFit, mode = 'club' }: { open: boolean; onClose: () => void; players: PlayerLite[]; clubs: ClubLite[]; onSaved: () => void; onClubAdded: (c: ClubLite) => void; editing?: OutreachRow; defaultFit?: string; mode?: OutreachMode; }) {
  const isAgent = mode === 'agent';
  const [clubId, setClubId] = useState(editing?.club_id ?? "");
  const [agentName, setAgentName] = useState(editing?.agent_name ?? "");
  const [agentLogoUrl, setAgentLogoUrl] = useState(editing?.agent_logo_url ?? "");
  const [agentLogoUploading, setAgentLogoUploading] = useState(false);
  const [clubQuery, setClubQuery] = useState("");
  const [playerQuery, setPlayerQuery] = useState("");
  const [preparedFor, setPreparedFor] = useState<string>(editing?.prepared_for_name ?? "");
  const [showForm, setShowForm] = useState<boolean>(editing?.show_form ?? false);
  const [showInNumbers, setShowInNumbers] = useState<boolean>(editing?.show_in_numbers ?? false);
  const [showSeasonStats, setShowSeasonStats] = useState<boolean>(editing?.show_season_stats ?? false);
  const [showStrengths, setShowStrengths] = useState<boolean>(editing?.show_strengths ?? false);
  const [entries, setEntries] = useState<LinkPlayerRow[]>(editing?.link_players ?? []);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [creatingClub, setCreatingClub] = useState(false);
  const [newClubName, setNewClubName] = useState("");
  const [newClubCountry, setNewClubCountry] = useState("");
  const [newClubLogoFile, setNewClubLogoFile] = useState<File | null>(null);
  const [savingNewClub, setSavingNewClub] = useState(false);

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
  const exactMatch = useMemo(() => {
    const n = clubQuery.trim().toLowerCase();
    return n ? clubs.some(c => c.club_name.toLowerCase() === n) : true;
  }, [clubs, clubQuery]);

  const createNewClub = async () => {
    const name = newClubName.trim();
    if (!name) return toast.error("Club name required");
    setSavingNewClub(true);
    try {
      const { data: inserted, error } = await supabase
        .from("club_map_positions")
        .insert({ club_name: name, country: newClubCountry.trim() || null })
        .select("id, club_name, country, image_url")
        .single();
      if (error) throw error;
      let image_url: string | null = inserted.image_url ?? null;
      if (newClubLogoFile) {
        const ext = newClubLogoFile.name.split(".").pop() || "png";
        const path = `${slugify(name)}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("club-logos").upload(path, newClubLogoFile, { cacheControl: "3600", upsert: true });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("club-logos").getPublicUrl(path);
        image_url = pub.publicUrl;
        await supabase.from("club_map_positions").update({ image_url }).eq("id", inserted.id);
      }
      const newClub: ClubLite = { id: inserted.id, club_name: inserted.club_name, country: inserted.country, image_url };
      onClubAdded(newClub);
      setClubId(newClub.id);
      setClubQuery("");
      setCreatingClub(false);
      setNewClubName("");
      setNewClubCountry("");
      setNewClubLogoFile(null);
      toast.success("Club added to database");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create club");
    } finally {
      setSavingNewClub(false);
    }
  };

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

  const onAgentLogoUpload = async (file: File) => {
    setAgentLogoUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `agent-outreach-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("club-logos").upload(path, file, { cacheControl: "3600", upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("club-logos").getPublicUrl(path);
      setAgentLogoUrl(data.publicUrl);
      toast.success("Logo uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to upload logo");
    } finally {
      setAgentLogoUploading(false);
    }
  };

  const addPlayer = async (id: string) => {
    setPlayerQuery("");
    if (editing) {
      setEntries(prev => [...prev, { player_id: id, position_slot: null, fit_recommendation: "", sort_order: prev.length }]);
      return;
    }
    // Determine new entries count after adding
    const willBeSingle = entries.length === 0;
    let initialFit = "";
    if (willBeSingle) {
      // Single-player outreach: prefer that player's per-player default
      const { data } = await (supabase as any)
        .from("club_outreach_player_defaults")
        .select("default_fit_recommendation")
        .eq("player_id", id)
        .maybeSingle();
      initialFit = (data?.default_fit_recommendation ?? "").trim() || (defaultFit ?? "");
    } else {
      initialFit = defaultFit ?? "";
    }
    setEntries(prev => {
      const next = [...prev, { player_id: id, position_slot: null, fit_recommendation: initialFit, sort_order: prev.length }];
      // If we crossed from 1 → 2 players, swap the first entry's player-default fit to the general default (only if it still equals the prior player default & user hasn't edited).
      if (prev.length === 1) {
        const [first] = prev;
        // Replace only when first entry text is still the player-specific default (unknown here, so leave it untouched to avoid wiping user edits).
        return next;
      }
      return next;
    });
  };
  const removePlayer = (id: string) => setEntries(prev => prev.filter(e => e.player_id !== id).map((e, i) => ({ ...e, sort_order: i })));
  const updateEntry = (id: string, patch: Partial<LinkPlayerRow>) => setEntries(prev => prev.map(e => e.player_id === id ? { ...e, ...patch } : e));

  const save = async () => {
    if (isAgent) {
      if (!agentName.trim()) return toast.error("Agent name required");
    } else if (!clubId) {
      return toast.error("Pick a club");
    }
    if (entries.length === 0) return toast.error("Add at least one player");
    setSaving(true);
    try {
      const payload: any = {
        target_type: isAgent ? 'agent' : 'club',
        club_id: isAgent ? null : clubId,
        agent_name: isAgent ? agentName.trim() : null,
        agent_logo_url: isAgent ? (agentLogoUrl.trim() || null) : null,
        player_id: entries[0]?.player_id ?? null,
        fit_recommendation: entries[0]?.fit_recommendation ?? null,
        prepared_for_name: preparedFor.trim() || null,
        show_form: showForm,
        show_in_numbers: showInNumbers,
        show_season_stats: showSeasonStats,
        show_strengths: showStrengths,
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
          <DialogTitle>
            {editing
              ? (isAgent ? "Edit Agent Outreach" : "Edit Club Outreach")
              : (isAgent ? "New Agent Outreach" : "New Club Outreach")}
          </DialogTitle>
          <DialogDescription>
            {isAgent
              ? "Build a personalised proposal for an agent. Add one or many players, each with their own position and fit note."
              : "Build a personalised proposal for a club. Add one or many players, each with their own position and fit note."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {isAgent ? (
            <div className="space-y-3">
              <div>
                <Label>Agent name</Label>
                <Input className="mt-1.5" placeholder="e.g. John Smith" value={agentName} onChange={(e) => setAgentName(e.target.value)} />
              </div>
              <div>
                <Label>Logo (optional)</Label>
                <div className="mt-1.5 flex items-center gap-3">
                  {agentLogoUrl ? (
                    <img src={agentLogoUrl} className="h-12 w-12 rounded-md object-contain bg-white/5 p-1 border border-border" />
                  ) : (
                    <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center text-[10px] text-muted-foreground">No logo</div>
                  )}
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs rounded-md border border-border px-2 py-1.5 hover:border-[#cbb96b]/60">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{agentLogoUploading ? "Uploading…" : agentLogoUrl ? "Replace logo" : "Upload logo"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onAgentLogoUpload(f); }} disabled={agentLogoUploading} />
                  </label>
                  {agentLogoUrl && (
                    <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground" onClick={() => setAgentLogoUrl("")}>Remove</button>
                  )}
                </div>
              </div>
            </div>
          ) : (
          <div>
            <Label>Club</Label>
            <Input placeholder="Search clubs" value={clubQuery} onChange={(e) => setClubQuery(e.target.value)} className="mt-1.5" />
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {filteredClubs.map(c => (
                <button key={c.id} type="button" onClick={() => setClubId(c.id)}
                  className={`flex items-center gap-2 rounded-md border p-2 text-left ${clubId === c.id ? "border-[#cbb96b] bg-[#cbb96b]/10" : "border-border hover:border-[#cbb96b]/40"}`}>
                  {c.image_url ? <img src={c.image_url} className="h-8 w-8 object-contain bg-white/5 rounded" /> : <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-[10px]">No logo</div>}
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{c.club_name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{c.country ?? ""}</div>
                  </div>
                </button>
              ))}
            </div>
          {clubQuery.trim() && !exactMatch && !creatingClub && (
            <div className="mt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setNewClubName(clubQuery.trim()); setCreatingClub(true); }}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Create "{clubQuery.trim()}"
              </Button>
            </div>
          )}
          {creatingClub && (
            <div className="mt-3 rounded-md border border-[#cbb96b]/50 p-3 bg-[#cbb96b]/5 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#cbb96b]">Add new club to database</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Club name</Label>
                  <Input value={newClubName} onChange={(e) => setNewClubName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Country</Label>
                  <Input value={newClubCountry} onChange={(e) => setNewClubCountry(e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Logo (optional)</Label>
                <div className="mt-1 flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs rounded-md border border-border px-2 py-1.5 hover:border-[#cbb96b]/60">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{newClubLogoFile ? newClubLogoFile.name : "Choose file"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setNewClubLogoFile(e.target.files?.[0] ?? null)} />
                  </label>
                  {newClubLogoFile && (
                    <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground" onClick={() => setNewClubLogoFile(null)}>Remove</button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => { setCreatingClub(false); setNewClubLogoFile(null); }}>Cancel</Button>
                <Button type="button" size="sm" onClick={createNewClub} disabled={savingNewClub}>{savingNewClub ? "Saving…" : "Create club"}</Button>
              </div>
            </div>
          )}
            {selectedClub && !selectedClub.image_url && (
              <div className="mt-3 rounded-md border border-dashed border-[#cbb96b]/40 p-3 bg-[#cbb96b]/5">
                <p className="text-xs mb-2">No logo on file for <b>{selectedClub.club_name}</b>. Upload one — it will be saved into the coaching database.</p>
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{uploadingLogo ? "Uploading…" : "Upload logo"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onClubLogoUpload(f); }} disabled={uploadingLogo} />
                </label>
              </div>
            )}
          </div>
          )}

          <div>
            <Label>Players to propose</Label>
            <p className="text-[11px] text-muted-foreground mt-1 mb-2">Add one or many players. Each gets a position slot and personalised fit note.</p>
            <Input placeholder="Search players to add" value={playerQuery} onChange={(e) => setPlayerQuery(e.target.value)} />
            {playerQuery && filteredPlayers.length > 0 && (
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                {filteredPlayers.slice(0, 30).map(p => (
                  <button key={p.id} type="button" onClick={() => addPlayer(p.id)}
                    className="flex items-center gap-2 rounded-md border border-border p-2 text-left hover:border-[#cbb96b]/60">
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

          <div className="rounded-lg border border-border p-4 space-y-4 bg-muted/10">
            <div>
              <Label>Prepared for (recipient at target club)</Label>
              <p className="text-[11px] text-muted-foreground mt-1">The individual at the club you're outreaching to (e.g. their sporting director). Shown at the top under the player's name. This is different from the saved Key Club Contact at the bottom of the proposal.</p>
              <Input className="mt-1.5" placeholder="e.g. Mehmet Yilmaz" value={preparedFor} onChange={(e) => setPreparedFor(e.target.value)} />
            </div>
            <div>
              <Label>Show on proposal</Label>
              <p className="text-[11px] text-muted-foreground mt-1">Pull these sections through from the player's Stars profile.</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  { v: showForm, set: setShowForm, label: "Form" },
                  { v: showInNumbers, set: setShowInNumbers, label: "In Numbers" },
                  { v: showSeasonStats, set: setShowSeasonStats, label: "Season stats" },
                  { v: showStrengths, set: setShowStrengths, label: "Strengths / Play style" },
                ].map((opt) => (
                  <label key={opt.label} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs cursor-pointer hover:border-[#cbb96b]/60">
                    <Checkbox checked={opt.v} onCheckedChange={(c) => opt.set(!!c)} />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">Club contact details now live in <b>Settings → Club contacts</b> and are shared across every outreach for that club.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !clubId || entries.length === 0} className="bg-[#cbb96b] text-black hover:bg-[#cbb96b]/90">
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
  const linkPlayers = (outreach.link_players ?? []);
  const playerById = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);

  // Prefill from data the outreach link already holds. No assumptions from the
  // club's other contacts — only what's on this specific link row.
  const defaultPlayerId = linkPlayers.length === 1 ? linkPlayers[0].player_id : "";
  const defaultContactName = (outreach as any).club_contact_name ?? "";
  const defaultContactRole = (outreach as any).club_contact_role ?? "";

  const [playerId, setPlayerId] = useState<string>(defaultPlayerId);
  const [contactName, setContactName] = useState(defaultContactName);
  const [contactRole, setContactRole] = useState(defaultContactRole);
  const [channel, setChannel] = useState("WhatsApp");
  const [summary, setSummary] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [contactedAt, setContactedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [saving, setSaving] = useState(false);

  // Re-apply prefill when switching between outreach rows.
  useEffect(() => {
    setPlayerId(linkPlayers.length === 1 ? linkPlayers[0].player_id : "");
    setContactName((outreach as any).club_contact_name ?? "");
    setContactRole((outreach as any).club_contact_role ?? "");
  }, [outreach.id]);

  // If the link row doesn't carry contact details, fall back to the club's
  // saved contact in club_outreach_club_contacts so staff don't have to retype
  // what's already on record for that club.
  useEffect(() => {
    if (!outreach.club_id) return;
    const linkName = ((outreach as any).club_contact_name ?? "").trim();
    const linkRole = ((outreach as any).club_contact_role ?? "").trim();
    if (linkName && linkRole) return;
    (async () => {
      const { data } = await supabase
        .from("club_outreach_club_contacts")
        .select("contact_name, contact_role")
        .eq("club_id", outreach.club_id)
        .maybeSingle();
      const prepared = ((outreach as any).prepared_for_name ?? "").trim();
      // Prefer the saved club contact; if it's missing, fall back to the
      // "Prepared for" name on the proposal so the same name that's shown
      // on the club proposal page is already filled in here.
      setContactName((prev) => {
        if (prev.trim()) return prev;
        return (data?.contact_name ?? "").trim() || prepared || "";
      });
      setContactRole((prev) => {
        if (prev.trim()) return prev;
        return data?.contact_role ?? "";
      });
    })();
  }, [outreach.id, outreach.club_id]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("club_outreach_communications").select("*").eq("outreach_id", outreach.id).order("contacted_at", { ascending: false });
    setList(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [outreach.id]);

  const submit = async () => {
    const clubName = outreach.club?.club_name ?? "Club";
    const playerName = playerId ? (playerById.get(playerId)?.name ?? "") : "";
    const fallbackSummary = playerName
      ? `Outreach link sent to ${clubName} re ${playerName}.`
      : `Outreach link sent to ${clubName}.`;
    const finalSummary = summary.trim() || fallbackSummary;
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
        summary: finalSummary,
        next_step: nextStep.trim() || null,
        created_by: u.user?.id ?? null,
      });
      if (error) throw error;
      // Persist the contact back onto the link row when the link doesn't
      // already carry it, so Transfer Hub (which reads from the link) shows
      // the person without staff having to re-enter it there.
      const linkPatch: Record<string, string> = {};
      if (!((outreach as any).club_contact_name ?? "").trim() && contactName.trim()) {
        linkPatch.club_contact_name = contactName.trim();
      }
      if (!((outreach as any).club_contact_role ?? "").trim() && contactRole.trim()) {
        linkPatch.club_contact_role = contactRole.trim();
      }
      if (Object.keys(linkPatch).length > 0) {
        await supabase.from("club_outreach_links").update(linkPatch).eq("id", outreach.id);
      }
      toast.success("Update logged");
      setSummary(""); setNextStep("");
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
            <Button onClick={submit} disabled={saving} className="bg-[#cbb96b] text-black hover:bg-[#cbb96b]/90">{saving ? "Saving…" : "Log update"}</Button>
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

function SettingsDialog({ open, onClose, players, clubs }: { open: boolean; onClose: () => void; players: PlayerLite[]; clubs: ClubLite[]; }) {
  const [whatsapp, setWhatsapp] = useState("");
  const [agentName, setAgentName] = useState("");
  const [agentImageUrl, setAgentImageUrl] = useState("");
  const [agentUploading, setAgentUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [defaultFit, setDefaultFit] = useState("");
  const [templates, setTemplates] = useState<QuickTemplate[]>([]);
  const [newTplTitle, setNewTplTitle] = useState("");
  const [newTplContent, setNewTplContent] = useState("");
  const [tplSaving, setTplSaving] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [defaults, setDefaults] = useState<{ stars_url_override: string; highlights_url: string; proof_path: string | null }>({ stars_url_override: "", highlights_url: "", proof_path: null });
  const [playerDefaultFit, setPlayerDefaultFit] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [playerQuery, setPlayerQuery] = useState("");
  // Club contacts state
  const [clubQuery, setClubQuery] = useState("");
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [contact, setContact] = useState<{ contact_name: string; contact_role: string; contact_phone: string; contact_accent: string; contact_image_url: string; contact_club_id: string; transfermarkt_url: string }>({
    contact_name: "", contact_role: "", contact_phone: "", contact_accent: "#1f2937", contact_image_url: "", contact_club_id: "", transfermarkt_url: "",
  });
  const [contactClubQuery, setContactClubQuery] = useState("");
  const [contactImgUploading, setContactImgUploading] = useState(false);

  const filteredPlayers = useMemo(() => {
    const n = playerQuery.trim().toLowerCase();
    return n ? players.filter(p => p.name.toLowerCase().includes(n)) : players;
  }, [players, playerQuery]);
  const filteredClubs = useMemo(() => {
    const n = clubQuery.trim().toLowerCase();
    return n ? clubs.filter(c => c.club_name.toLowerCase().includes(n)) : clubs;
  }, [clubs, clubQuery]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("club_outreach_settings").select("whatsapp_number, agent_name, agent_image_url, default_fit_recommendation").eq("id", 1).maybeSingle();
      setWhatsapp(data?.whatsapp_number ?? "");
      setAgentName(data?.agent_name ?? "");
      setAgentImageUrl(data?.agent_image_url ?? "");
      setDefaultFit(data?.default_fit_recommendation ?? "");
      setLoading(false);
      const { data: tpls } = await supabase.from("club_outreach_quick_templates").select("id,title,content,sort_order").order("sort_order").order("created_at");
      setTemplates((tpls ?? []) as QuickTemplate[]);
    })();
  }, []);

  useEffect(() => {
    if (!selectedClubId) return;
    (async () => {
      const { data } = await supabase.from("club_outreach_club_contacts").select("*").eq("club_id", selectedClubId).maybeSingle();
      setContact({
        contact_name: data?.contact_name ?? "",
        contact_role: data?.contact_role ?? "",
        contact_phone: data?.contact_phone ?? "",
        contact_accent: data?.contact_accent ?? "#1f2937",
        contact_image_url: data?.contact_image_url ?? "",
        // Default the contact's own club to the outreach club so existing
        // records that pre-date this field display sensibly until edited.
        contact_club_id: (data as any)?.contact_club_id ?? selectedClubId,
        transfermarkt_url: (data as any)?.transfermarkt_url ?? "",
      });
      setContactClubQuery("");
    })();
  }, [selectedClubId]);

  useEffect(() => {
    if (!selectedPlayerId) return;
    (async () => {
      const { data } = await supabase.from("club_outreach_player_defaults").select("*").eq("player_id", selectedPlayerId).maybeSingle();
      setDefaults({
        stars_url_override: data?.stars_url_override ?? "",
        highlights_url: data?.highlights_url ?? "",
        proof_path: data?.proof_of_representation_path ?? null,
      });
      setPlayerDefaultFit((data as any)?.default_fit_recommendation ?? "");
    })();
  }, [selectedPlayerId]);

  const saveWhatsapp = async () => {
    const { error } = await (supabase as any).from("club_outreach_settings").upsert({
      id: 1,
      whatsapp_number: whatsapp.trim(),
      agent_name: agentName.trim() || null,
      agent_image_url: agentImageUrl.trim() || null,
      default_fit_recommendation: defaultFit.trim() || null,
      updated_at: new Date().toISOString(),
    });
    if (error) return toast.error(error.message);
    toast.success("Agency contact saved");
  };

  const addTemplate = async () => {
    if (!newTplTitle.trim() || !newTplContent.trim()) return toast.error("Title and content required");
    setTplSaving(true);
    const { data, error } = await supabase.from("club_outreach_quick_templates").insert({
      title: newTplTitle.trim(),
      content: newTplContent,
      sort_order: templates.length,
    }).select("id,title,content,sort_order").single();
    setTplSaving(false);
    if (error) return toast.error(error.message);
    setTemplates(prev => [...prev, data as QuickTemplate]);
    setNewTplTitle(""); setNewTplContent("");
    toast.success("Template added");
  };
  const updateTemplate = async (id: string, patch: Partial<QuickTemplate>) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  };
  const saveTemplate = async (t: QuickTemplate) => {
    const { error } = await supabase.from("club_outreach_quick_templates").update({ title: t.title, content: t.content }).eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Template saved");
  };
  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    const { error } = await supabase.from("club_outreach_quick_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const uploadAgentImage = async (file: File) => {
    setAgentUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `agent-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("club-logos").upload(path, file, { cacheControl: "3600", upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("club-logos").getPublicUrl(path);
      setAgentImageUrl(data.publicUrl);
      toast.success("Agent image uploaded — click Save to apply");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setAgentUploading(false);
    }
  };

  const saveClubContact = async () => {
    if (!selectedClubId) return;
    const { error } = await (supabase as any).from("club_outreach_club_contacts").upsert({
      club_id: selectedClubId,
      contact_name: contact.contact_name.trim() || null,
      contact_role: contact.contact_role.trim() || null,
      contact_phone: contact.contact_phone.trim() || null,
      contact_accent: contact.contact_name.trim() ? contact.contact_accent : null,
      contact_image_url: contact.contact_image_url.trim() || null,
      contact_club_id: contact.contact_club_id || null,
      transfermarkt_url: contact.transfermarkt_url.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "club_id" });
    if (error) return toast.error(error.message);
    toast.success("Club contact saved");
  };

  const uploadContactImage = async (file: File) => {
    if (!selectedClubId) return;
    setContactImgUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `contact-${selectedClubId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("club-logos").upload(path, file, { cacheControl: "3600", upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("club-logos").getPublicUrl(path);
      setContact(c => ({ ...c, contact_image_url: data.publicUrl }));
      toast.success("Image uploaded — click Save to apply");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setContactImgUploading(false);
    }
  };

  const saveDefaults = async () => {
    if (!selectedPlayerId) return;
    const { error } = await (supabase as any).from("club_outreach_player_defaults").upsert({
      player_id: selectedPlayerId,
      stars_url_override: defaults.stars_url_override.trim() || null,
      highlights_url: defaults.highlights_url.trim() || null,
      proof_of_representation_path: defaults.proof_path,
      default_fit_recommendation: playerDefaultFit.trim() || null,
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
              <MessageCircle className="h-4 w-4 text-[#cbb96b]" />
              <h3 className="text-sm font-semibold">Agency contact</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Shown as the WhatsApp agent on every proposal. WhatsApp number must include country code, e.g. <code>447700900000</code>.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="WhatsApp number (e.g. 447700900000)" />
              <Input value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Agent name (e.g. Jolon Levene)" />
            </div>
            <div className="mt-2 flex items-center gap-3">
              {agentImageUrl ? (
                <img src={agentImageUrl} className="h-12 w-12 rounded-full object-cover border border-[#cbb96b]/40" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center"><UserCircle2 className="h-6 w-6 text-muted-foreground" /></div>
              )}
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs rounded-md border border-border px-3 py-2 hover:border-[#cbb96b]/60">
                <Upload className="h-3.5 w-3.5" />
                <span>{agentUploading ? "Uploading…" : agentImageUrl ? "Replace agent image" : "Upload agent image"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAgentImage(f); }} disabled={agentUploading} />
              </label>
              <Button onClick={saveWhatsapp} disabled={loading} className="ml-auto bg-[#cbb96b] text-black hover:bg-[#cbb96b]/90">Save</Button>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-2">
              <FileEdit className="h-4 w-4 text-[#cbb96b]" />
              <h3 className="text-sm font-semibold">Default fit / recommendation</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Auto-applied to every new outreach as the starting fit note for each player. Edit per player on the outreach itself when needed.</p>
            <Textarea rows={4} value={defaultFit} onChange={(e) => setDefaultFit(e.target.value)} placeholder="e.g. A press-resistant ball-progresser who fits a possession-led 4-3-3..." />
            <div className="flex justify-end mt-2">
              <Button onClick={saveWhatsapp} className="bg-[#cbb96b] text-black hover:bg-[#cbb96b]/90">Save default</Button>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-2">
              <Copy className="h-4 w-4 text-[#cbb96b]" />
              <h3 className="text-sm font-semibold">Quick copy templates</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              One-tap copy buttons shown above every outreach link. Use placeholders <code>{"{club}"}</code>, <code>{"{player}"}</code>, <code>{"{first_name}"}</code>, <code>{"{players}"}</code>, <code>{"{link}"}</code> — they fill in automatically when copied.
            </p>
            <div className="space-y-3">
              {templates.map((t) => (
                <div key={t.id} className="rounded-md border border-border p-3 bg-muted/10 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={t.title}
                      onChange={(e) => updateTemplate(t.id, { title: e.target.value })}
                      placeholder="Button title (e.g. WhatsApp intro)"
                      className="flex-1"
                    />
                    <Button size="sm" variant="outline" onClick={() => saveTemplate(t)}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteTemplate(t.id)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                  <Textarea
                    rows={4}
                    value={t.content}
                    onChange={(e) => updateTemplate(t.id, { content: e.target.value })}
                    placeholder="Message text. Use {club}, {player}, {first_name}, {link}."
                  />
                </div>
              ))}
              <div className="rounded-md border border-dashed border-[#cbb96b]/40 p-3 bg-[#cbb96b]/5 space-y-2">
                <div className="text-[11px] uppercase tracking-wider text-[#cbb96b] font-semibold">Add new template</div>
                <Input value={newTplTitle} onChange={(e) => setNewTplTitle(e.target.value)} placeholder="Button title" />
                <Textarea rows={3} value={newTplContent} onChange={(e) => setNewTplContent(e.target.value)} placeholder="Message — placeholders welcome." />
                <div className="flex justify-end">
                  <Button size="sm" onClick={addTemplate} disabled={tplSaving} className="bg-[#cbb96b] text-black hover:bg-[#cbb96b]/90"><Plus className="h-3.5 w-3.5 mr-1" />{tplSaving ? "Adding…" : "Add template"}</Button>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-[#cbb96b]" />
              <h3 className="text-sm font-semibold">Club contacts</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-2">One saved contact per club, reused across every outreach to that club. Text auto-switches between black and white for contrast.</p>
            <Input placeholder="Search clubs" value={clubQuery} onChange={(e) => setClubQuery(e.target.value)} className="mb-2" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1 mb-3">
              {filteredClubs.map(c => (
                <button key={c.id} type="button" onClick={() => setSelectedClubId(c.id)}
                  className={`flex items-center gap-2 rounded-md border p-2 text-left ${selectedClubId === c.id ? "border-[#cbb96b] bg-[#cbb96b]/10" : "border-border hover:border-[#cbb96b]/40"}`}>
                  {c.image_url ? <img src={c.image_url} className="h-8 w-8 object-contain bg-white/5 rounded" /> : <div className="h-8 w-8 rounded bg-muted" />}
                  <div className="text-xs font-medium truncate">{c.club_name}</div>
                </button>
              ))}
            </div>
            {selectedClubId && (
              <div className="space-y-3 rounded-md border border-border p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input placeholder="Contact name" value={contact.contact_name} onChange={(e) => setContact(c => ({ ...c, contact_name: e.target.value }))} />
                  <Input placeholder="Role e.g. Technical Director" value={contact.contact_role} onChange={(e) => setContact(c => ({ ...c, contact_role: e.target.value }))} />
                  <Input placeholder="WhatsApp e.g. 447700900000" value={contact.contact_phone} onChange={(e) => setContact(c => ({ ...c, contact_phone: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Transfermarkt URL (for the target club)</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5 mb-1.5">
                    Shown as a pinned Transfermarkt button at the bottom of the club proposal until the visitor scrolls to the contact CTAs.
                  </p>
                  <Input
                    placeholder="https://www.transfermarkt.com/..."
                    value={contact.transfermarkt_url}
                    onChange={(e) => setContact(c => ({ ...c, transfermarkt_url: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Contact's own club</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5 mb-1.5">
                    The club this contact actually works for — shown next to their name on the proposal.
                    Usually different from the club we're outreaching to.
                  </p>
                  {(() => {
                    const selected = clubs.find(c => c.id === contact.contact_club_id);
                    return (
                      <div className="flex items-center gap-2 mb-2 text-xs">
                        <span className="text-muted-foreground">Selected:</span>
                        {selected ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-[#cbb96b]/40 bg-[#cbb96b]/10 px-2 py-1">
                            {selected.image_url ? <img src={selected.image_url} className="h-4 w-4 object-contain" /> : null}
                            <span className="font-medium">{selected.club_name}</span>
                          </span>
                        ) : (
                          <span className="italic text-muted-foreground">None</span>
                        )}
                      </div>
                    );
                  })()}
                  <Input
                    placeholder="Search the contact's club"
                    value={contactClubQuery}
                    onChange={(e) => setContactClubQuery(e.target.value)}
                    className="mb-2"
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto pr-1">
                    {clubs
                      .filter(c => {
                        const n = contactClubQuery.trim().toLowerCase();
                        return n ? c.club_name.toLowerCase().includes(n) : true;
                      })
                      .slice(0, 60)
                      .map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setContact(prev => ({ ...prev, contact_club_id: c.id }))}
                          className={`flex items-center gap-2 rounded-md border p-2 text-left ${contact.contact_club_id === c.id ? "border-[#cbb96b] bg-[#cbb96b]/10" : "border-border hover:border-[#cbb96b]/40"}`}
                        >
                          {c.image_url ? <img src={c.image_url} className="h-6 w-6 object-contain bg-white/5 rounded" /> : <div className="h-6 w-6 rounded bg-muted" />}
                          <div className="text-[11px] font-medium truncate">{c.club_name}</div>
                        </button>
                      ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <Label className="text-xs text-muted-foreground">Button colour</Label>
                  <input type="color" value={contact.contact_accent} onChange={(e) => setContact(c => ({ ...c, contact_accent: e.target.value }))}
                    className="h-8 w-12 rounded cursor-pointer border border-border bg-transparent p-0" aria-label="Contact button colour" />
                  <span className="text-[11px] text-muted-foreground font-mono">{contact.contact_accent}</span>
                  <span className="text-[11px] text-muted-foreground">Match the club's team colour.</span>
                </div>
                <div className="flex items-center gap-3">
                  {contact.contact_image_url ? (
                    <img src={contact.contact_image_url} className="h-12 w-12 rounded-full object-cover border border-[#cbb96b]/40" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center"><UserCircle2 className="h-6 w-6 text-muted-foreground" /></div>
                  )}
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs rounded-md border border-border px-3 py-2 hover:border-[#cbb96b]/60">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{contactImgUploading ? "Uploading…" : contact.contact_image_url ? "Replace contact image" : "Upload contact image"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadContactImage(f); }} disabled={contactImgUploading} />
                  </label>
                  <Button onClick={saveClubContact} className="ml-auto bg-[#cbb96b] text-black hover:bg-[#cbb96b]/90">Save contact</Button>
                </div>
              </div>
            )}
          </section>
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-[#cbb96b]" />
              <h3 className="text-sm font-semibold">Per-player defaults</h3>
            </div>
            <Input placeholder="Search players" value={playerQuery} onChange={(e) => setPlayerQuery(e.target.value)} className="mb-2" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1 mb-4">
              {filteredPlayers.map(p => (
                <button key={p.id} type="button" onClick={() => setSelectedPlayerId(p.id)}
                  className={`flex items-center gap-2 rounded-md border p-2 text-left ${selectedPlayerId === p.id ? "border-[#cbb96b] bg-[#cbb96b]/10" : "border-border hover:border-[#cbb96b]/40"}`}>
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
                  <Label className="flex items-center gap-2"><FileEdit className="h-3.5 w-3.5" /> Default fit / recommendation (single-player only)</Label>
                  <p className="text-[11px] text-muted-foreground mt-1">Used when this player is the only one on an outreach. If two or more players are attached, the general default applies instead.</p>
                  <Textarea rows={4} className="mt-1.5" value={playerDefaultFit} onChange={(e) => setPlayerDefaultFit(e.target.value)} placeholder="Tailored fit note for this player when sent solo to a club." />
                </div>
                <div>
                  <Label className="flex items-center gap-2"><FileBadge2 className="h-3.5 w-3.5" /> Proof of Representation PDF</Label>
                  {defaults.proof_path ? (
                    <p className="text-[11px] text-muted-foreground mt-1 font-mono break-all">{defaults.proof_path}</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground mt-1">No file uploaded yet.</p>
                  )}
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs mt-2 rounded-md border border-border px-3 py-2 hover:border-[#cbb96b]/60">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{uploading ? "Uploading…" : "Upload PDF"}</span>
                    <input type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadProof(f); }} disabled={uploading} />
                  </label>
                </div>
                <div className="flex justify-end">
                  <Button onClick={saveDefaults} className="bg-[#cbb96b] text-black hover:bg-[#cbb96b]/90">Save defaults</Button>
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