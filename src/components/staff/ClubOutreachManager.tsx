import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Settings, Copy, ExternalLink, Trash2, Search, Upload, MessageCircle, Shield, FileBadge2, Video, Film, FileText, X, Building2, FileEdit, Send, CheckCircle2, UserCircle2, Check, HelpCircle, Sparkles, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { openExternalUrl } from "@/utils/openExternalUrl";
import OutreachStrategyTab from "@/components/staff/outreach/OutreachStrategyTab";
import RelationshipsTab from "@/components/staff/outreach/RelationshipsTab";
import MarketTablesTab from "@/components/staff/outreach/MarketTablesTab";
import {
  DEFAULT_KEY_DETAILS,
  DEFAULT_SECTION_ORDER,
  KEY_DETAIL_HAS_VALUE,
  KEY_DETAIL_LABELS,
  KeyDetailItem,
  KeyDetailKind,
  ProposalSectionKey,
  SECTION_LABELS,
  normaliseKeyDetails,
  normaliseSectionOrder,
} from "@/lib/proposalConfig";

const APP_BASE = "https://risefootballagency.com";
const EXTERNAL_APP_BASE = "https://www.risefootballagency.com";
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
  is_mandated?: boolean;
  key_details?: KeyDetailItem[] | null;
  section_order?: ProposalSectionKey[] | null;
  mandated_agent_name?: string | null;
  mandated_agent_role?: string | null;
  mandated_agent_phone?: string | null;
  mandated_agent_logo_url?: string | null;
  mandate_proof_path?: string | null;
  mandate_proof_url?: string | null;
  is_suggested_to_agent?: boolean | null;
  suggested_agent_note?: string | null;
  link_players?: LinkPlayerRow[];
  club?: ClubLite | null;
  target_type?: 'club' | 'agent';
  agent_name?: string | null;
  agent_logo_url?: string | null;
  language?: string | null;
  translations?: any | null;
  is_pending_strategy_draft?: boolean;
  season_data_mode?: 'popup' | 'link' | null;
  selected_video_ids?: string[] | null;
  alternate_profile_link_ids?: string[] | null;
  alternate_profiles_blurb?: string | null;
  season_id?: string | null;
}

type OutreachMode = 'club' | 'agent';

const OUTREACH_LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "pt", label: "Portuguese" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pl", label: "Polish" },
  { code: "cs", label: "Czech" },
  { code: "ru", label: "Russian" },
  { code: "tr", label: "Turkish" },
  { code: "hr", label: "Croatian" },
  { code: "no", label: "Norwegian" },
];

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
  const [defaultSeasonDataMode, setDefaultSeasonDataMode] = useState<'popup' | 'link'>('popup');
  const [defaultVideoMode, setDefaultVideoMode] = useState<'all' | 'first' | 'custom'>('all');
  const [mode, setMode] = useState<OutreachMode>('club');
  const [topTab, setTopTab] = useState<'outreach' | 'strategy' | 'relationships' | 'markettables'>('outreach');

  const loadTemplates = async () => {
    const { data } = await supabase.from("club_outreach_quick_templates").select("id,title,content,sort_order").order("sort_order").order("created_at");
    setTemplates((data ?? []) as QuickTemplate[]);
  };
  const loadSettings = async () => {
    const { data } = await (supabase as any)
      .from("club_outreach_settings")
      .select("default_fit_recommendation, default_season_data_mode, default_video_selection_mode")
      .eq("id", 1)
      .maybeSingle();
    setDefaultFit(data?.default_fit_recommendation ?? "");
    const sm = data?.default_season_data_mode;
    if (sm === 'popup' || sm === 'link') setDefaultSeasonDataMode(sm);
    const vm = data?.default_video_selection_mode;
    if (vm === 'all' || vm === 'first' || vm === 'custom') setDefaultVideoMode(vm);
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
      is_pending_strategy_draft: !!r.is_pending_strategy_draft,
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

  const proposalUrl = (shortId: string, targetType?: 'club' | 'agent') =>
    targetType === 'agent'
      ? `${APP_BASE}/agents/${shortId}`
      : `${APP_BASE}/club-proposal/${shortId}`;
  const externalProposalUrl = (shortId: string, targetType?: 'club' | 'agent') =>
    targetType === 'agent'
      ? `${EXTERNAL_APP_BASE}/agents/${shortId}`
      : `${EXTERNAL_APP_BASE}/club-proposal/${shortId}`;

  const copyLink = async (shortId: string, targetType?: 'club' | 'agent') => {
    await navigator.clipboard.writeText(proposalUrl(shortId, targetType));
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

  const approvePending = async (row: OutreachRow) => {
    const { error } = await supabase
      .from("club_outreach_links")
      .update({ is_pending_strategy_draft: false } as any)
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_pending_strategy_draft: false } : r)));
    toast.success("Draft approved — edit and refine when ready");
    setEditRow({ ...row, is_pending_strategy_draft: false });
  };

  const rejectPending = async (row: OutreachRow) => {
    const { error } = await supabase
      .from("club_outreach_links")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    toast.success("Draft rejected");
  };

  const grouped = useMemo(() => {
    const map: Record<OutreachStatus, OutreachRow[]> = { ready: [], draft: [], sent: [] };
    filtered.forEach((r) => { map[r.status]?.push(r) ?? (map.draft.push(r)); });
    return map;
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex w-full sm:w-auto sm:inline-flex overflow-x-auto rounded-lg border border-border bg-muted/30 p-1 gap-1">
        {([
          { v: 'outreach', label: 'Outreach' },
          { v: 'strategy', label: 'Strategy' },
          { v: 'relationships', label: 'Relationships' },
          { v: 'markettables', label: 'Market Tables' },
        ] as { v: 'outreach' | 'strategy' | 'relationships' | 'markettables'; label: string }[]).map((t) => (
          <button
            key={t.v}
            type="button"
            onClick={() => setTopTab(t.v)}
            className={`flex-1 sm:flex-none whitespace-nowrap px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs uppercase tracking-wider rounded-md transition ${
              topTab === t.v ? 'bg-[#cbb96b] text-black font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {topTab === 'markettables' ? (
        <MarketTablesTab />
      ) : topTab === 'relationships' ? (
        <RelationshipsTab />
      ) : topTab === 'strategy' ? (
        <OutreachStrategyTab players={players} onDraftsCreated={() => { setTopTab('outreach'); load(); }} />
      ) : (
      <>
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
                      url={proposalUrl(r.short_id, r.target_type)}
                      externalUrl={externalProposalUrl(r.short_id, r.target_type)}
                      onCopy={() => copyLink(r.short_id, r.target_type)}
                      onEdit={() => setEditRow(r)}
                      onLog={() => setLogRow(r)}
                      onRemove={() => remove(r.id)}
                      onStatusChange={(s) => setStatus(r.id, s)}
                      templates={templates}
                      onShortIdSave={(next) => updateShortId(r.id, r.short_id, next)}
                      onApprovePending={() => approvePending(r)}
                      onRejectPending={() => rejectPending(r)}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {newOpen && (
      <OutreachDialog mode={mode} open={newOpen} onClose={() => setNewOpen(false)} players={players} clubs={clubs} allRows={rows} defaultFit={defaultFit} defaultSeasonDataMode={defaultSeasonDataMode} defaultVideoMode={defaultVideoMode} onClubAdded={(c) => setClubs(prev => [...prev, c].sort((a, b) => a.club_name.localeCompare(b.club_name)))} onSaved={() => { setNewOpen(false); load(); }} />
      )}
      {editRow && (
      <OutreachDialog mode={(editRow.target_type ?? 'club') as OutreachMode} open={!!editRow} onClose={() => setEditRow(null)} players={players} clubs={clubs} allRows={rows} defaultFit={defaultFit} defaultSeasonDataMode={defaultSeasonDataMode} defaultVideoMode={defaultVideoMode} editing={editRow} onClubAdded={(c) => setClubs(prev => [...prev, c].sort((a, b) => a.club_name.localeCompare(b.club_name)))} onSaved={() => { setEditRow(null); load(); }} />
      )}
      {settingsOpen && (
        <SettingsDialog open={settingsOpen} onClose={() => { setSettingsOpen(false); loadTemplates(); loadSettings(); }} players={players} clubs={clubs} />
      )}
      {logRow && (
        <CommunicationsDialog open={!!logRow} onClose={() => setLogRow(null)} outreach={logRow} players={players} />
      )}
      </>
      )}
    </div>
  );
}

function OutreachCard({ row, url, externalUrl, players, onCopy, onEdit, onLog, onRemove, onStatusChange, templates, onShortIdSave, onApprovePending, onRejectPending }: { row: OutreachRow; url: string; externalUrl: string; players: PlayerLite[]; onCopy: () => void; onEdit: () => void; onLog: () => void; onRemove: () => void; onStatusChange: (s: OutreachStatus) => void; templates: QuickTemplate[]; onShortIdSave: (next: string) => Promise<boolean>; onApprovePending?: () => void; onRejectPending?: () => void; }) {
  const playerById = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);
  const names = (row.link_players ?? []).map(lp => playerById.get(lp.player_id)?.name).filter(Boolean) as string[];
  const hasLogs = row.comm_count > 0;
  const [editingUrl, setEditingUrl] = useState(false);
  const [shortIdDraft, setShortIdDraft] = useState(row.short_id);
  useEffect(() => { setShortIdDraft(row.short_id); }, [row.short_id]);
  const firstPlayerName = names[0] ?? "";
  const isAgent = (row.target_type ?? 'club') === 'agent';
  const targetName = isAgent ? (row.agent_name ?? "Agent") : (row.club?.club_name ?? "Unknown club");
  const targetLogo = isAgent ? (row.agent_logo_url ?? null) : (row.club?.image_url ?? null);
  const isPending = !!row.is_pending_strategy_draft;
  const copyTemplate = async (t: QuickTemplate) => {
    const filled = fillTemplate(t.content, {
      club: targetName,
      agent: isAgent ? targetName : "",
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
    <div
      className={
        isPending
          ? "group relative rounded-xl border-2 border-[hsl(28,55%,38%)] bg-[hsl(28,30%,15%)] p-4 hover:border-[hsl(28,65%,48%)] transition-all"
          : "group relative rounded-xl border border-border bg-card p-4 hover:border-[#cbb96b]/60 hover:shadow-[0_10px_40px_-15px_rgba(203,185,107,0.3)] transition-all"
      }
    >
      {isPending && (
        <div className="absolute -top-2 -right-2 flex items-center gap-1.5">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(28,55%,38%)] text-white shadow">
            <HelpCircle className="h-3.5 w-3.5" />
          </span>
        </div>
      )}
      <div className="flex items-start gap-3">
        {targetLogo ? (
          <img src={targetLogo} alt={targetName} className="h-12 w-12 object-contain rounded-md bg-white/5 p-1" />
        ) : (
          <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center text-sm">{targetName?.[0] ?? "?"}</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{targetName}</div>
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
              club: targetName,
              agent: isAgent ? targetName : "",
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
      {isPending && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            size="sm"
            onClick={onApprovePending}
            className="bg-emerald-600 text-white hover:bg-emerald-500"
          >
            <Check className="h-3.5 w-3.5 mr-1" /> Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onRejectPending}
            className="border-rose-500/60 text-rose-300 hover:bg-rose-500/10"
          >
            <X className="h-3.5 w-3.5 mr-1" /> Reject
          </Button>
        </div>
      )}
      <StatusToggle status={row.status} onChange={onStatusChange} />
      <div className="mt-3 grid grid-cols-5 gap-2">
        <Button size="sm" variant="outline" onClick={onCopy} title="Copy link"><Copy className="h-3.5 w-3.5" /></Button>
        <Button
          size="sm"
          variant="outline"
          title="Open link in browser"
          onClick={(e) => {
            e.preventDefault();
            openExternalUrl(externalUrl);
          }}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
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

function OutreachDialog({ open, onClose, players, clubs, allRows, onSaved, onClubAdded, editing, defaultFit, defaultSeasonDataMode, defaultVideoMode, mode = 'club' }: { open: boolean; onClose: () => void; players: PlayerLite[]; clubs: ClubLite[]; allRows: OutreachRow[]; onSaved: () => void; onClubAdded: (c: ClubLite) => void; editing?: OutreachRow; defaultFit?: string; defaultSeasonDataMode?: 'popup' | 'link'; defaultVideoMode?: 'all' | 'first' | 'custom'; mode?: OutreachMode; }) {
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
  const [seasonDataMode, setSeasonDataMode] = useState<'popup' | 'link'>(
    (editing?.season_data_mode as 'popup' | 'link' | null) ?? defaultSeasonDataMode ?? 'popup',
  );
  // Optional season scoping. Pulls from the primary player's named seasons
  // (player_seasons) so the data popup / Form banner only counts matches
  // inside that window. `null` means "all data".
  const [seasonId, setSeasonId] = useState<string | null>(editing?.season_id ?? null);
  const [playerSeasons, setPlayerSeasons] = useState<{ id: string; name: string }[]>([]);
  const [primaryVideos, setPrimaryVideos] = useState<{ id: string; name: string; videoUrl: string }[]>([]);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>(
    Array.isArray(editing?.selected_video_ids) ? (editing!.selected_video_ids as string[]) : [],
  );
  const [loadingPrimaryVideos, setLoadingPrimaryVideos] = useState(false);
  const [altLinkIds, setAltLinkIds] = useState<string[]>(
    Array.isArray(editing?.alternate_profile_link_ids) ? (editing!.alternate_profile_link_ids as string[]) : [],
  );
  const [altBlurb, setAltBlurb] = useState<string>(editing?.alternate_profiles_blurb ?? "");
  const [altQuery, setAltQuery] = useState<string>("");
  const [isMandated, setIsMandated] = useState<boolean>(editing?.is_mandated ?? false);
  const [mandatedAgentName, setMandatedAgentName] = useState<string>(editing?.mandated_agent_name ?? "");
  const [mandatedAgentRole, setMandatedAgentRole] = useState<string>(editing?.mandated_agent_role ?? "");
  const [mandatedAgentPhone, setMandatedAgentPhone] = useState<string>(editing?.mandated_agent_phone ?? "");
  const [mandatedAgentLogoUrl, setMandatedAgentLogoUrl] = useState<string>(editing?.mandated_agent_logo_url ?? "");
  const [mandatedLogoUploading, setMandatedLogoUploading] = useState(false);
  const [mandateProofPath, setMandateProofPath] = useState<string>(editing?.mandate_proof_path ?? "");
  const [mandateProofUploading, setMandateProofUploading] = useState(false);
  const [isSuggestedToAgent, setIsSuggestedToAgent] = useState<boolean>(editing?.is_suggested_to_agent ?? false);
  const [suggestedAgentNote, setSuggestedAgentNote] = useState<string>(editing?.suggested_agent_note ?? "");
  const [keyDetails, setKeyDetails] = useState<KeyDetailItem[]>(
    editing?.key_details ? normaliseKeyDetails(editing.key_details) : DEFAULT_KEY_DETAILS
  );
  const [sectionOrder, setSectionOrder] = useState<ProposalSectionKey[]>(
    editing?.section_order ? normaliseSectionOrder(editing.section_order) : DEFAULT_SECTION_ORDER
  );
  const [entries, setEntries] = useState<LinkPlayerRow[]>(editing?.link_players ?? []);
  const [saving, setSaving] = useState(false);
  const [language, setLanguage] = useState<string>(editing?.language ?? "en");
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
    // Always look up per-player defaults so we can pre-fill position regardless
    // of editing / single-vs-multi state.
    const { data: defaults } = await (supabase as any)
      .from("club_outreach_player_defaults")
      .select("default_fit_recommendation, default_position, default_season_data_mode, default_season_id")
      .eq("player_id", id)
      .maybeSingle();
    const presetPosition: string | null = defaults?.default_position ?? null;
    if (editing) {
      setEntries(prev => [...prev, { player_id: id, position_slot: presetPosition, fit_recommendation: "", sort_order: prev.length }]);
      return;
    }
    // Determine new entries count after adding
    const willBeSingle = entries.length === 0;
    let initialFit = "";
    if (willBeSingle) {
      // Single-player outreach: prefer that player's per-player default
      initialFit = (defaults?.default_fit_recommendation ?? "").trim() || (defaultFit ?? "");
      // Seed the season-data display mode from the player default on the
      // very first add — once a second player joins we leave whatever the
      // user picked alone.
      if (defaults?.default_season_data_mode === 'popup' || defaults?.default_season_data_mode === 'link') {
        setSeasonDataMode(defaults.default_season_data_mode);
      }
      if (defaults?.default_season_id && seasonId === null) {
        setSeasonId(defaults.default_season_id as string);
      }
    } else {
      initialFit = defaultFit ?? "";
    }
    setEntries(prev => {
      const next = [...prev, { player_id: id, position_slot: presetPosition, fit_recommendation: initialFit, sort_order: prev.length }];
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

  // Whenever the primary player changes, fetch their highlights so the staff
  // can pick which ones appear in the proposal carousel.
  const primaryPlayerId = entries[0]?.player_id ?? null;
  useEffect(() => {
    // Load the primary player's named seasons so the staff can scope the
    // proposal's data to one of them. Reset selection when the player
    // changes unless we already pre-seeded it from defaults.
    let cancelled = false;
    if (!primaryPlayerId) {
      setPlayerSeasons([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("player_seasons")
        .select("id, name, sort_order")
        .eq("player_id", primaryPlayerId)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (cancelled) return;
      setPlayerSeasons((data ?? []) as { id: string; name: string }[]);
      // If the currently picked seasonId belongs to a different player,
      // drop it.
      if (seasonId && !(data ?? []).some((s: any) => s.id === seasonId)) {
        setSeasonId(null);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryPlayerId]);

  useEffect(() => {
    let cancelled = false;
    if (!primaryPlayerId) {
      setPrimaryVideos([]);
      return;
    }
    setLoadingPrimaryVideos(true);
    (async () => {
      const { data, error } = await supabase
        .from("players")
        .select("highlights")
        .eq("id", primaryPlayerId)
        .maybeSingle();
      if (cancelled) return;
      setLoadingPrimaryVideos(false);
      if (error) {
        setPrimaryVideos([]);
        return;
      }
      let h: any = (data as any)?.highlights ?? null;
      try { if (typeof h === "string") h = JSON.parse(h); } catch (_) { h = null; }
      let pool: any[] = [];
      if (Array.isArray(h)) pool = h;
      else if (h && typeof h === "object") pool = [...(h.matchHighlights ?? []), ...(h.bestClips ?? [])];
      const list = pool
        .filter((x: any) => x && (x.videoUrl || x.video_url))
        .map((x: any) => ({
          id: String(x.id ?? x.videoUrl ?? x.video_url),
          name: String(x.name ?? "Highlight"),
          videoUrl: String(x.videoUrl ?? x.video_url),
        }));
      setPrimaryVideos(list);
      // Seed selection from per-player default when this is a fresh outreach
      // and the user hasn't yet picked anything for this player.
      if (!editing && selectedVideoIds.length === 0) {
        const { data: defs } = await (supabase as any)
          .from("club_outreach_player_defaults")
          .select("default_selected_video_ids, default_alternate_profile_link_ids, default_alternate_profiles_blurb, default_show_form, default_show_in_numbers, default_show_season_stats, default_show_strengths, default_section_order, default_key_details")
          .eq("player_id", primaryPlayerId)
          .maybeSingle();
        const def = Array.isArray(defs?.default_selected_video_ids) ? defs.default_selected_video_ids : [];
        if (def.length > 0 && !cancelled) {
          setSelectedVideoIds(def);
        } else if (!cancelled) {
          // Fall back to the global default video selection mode.
          if (defaultVideoMode === 'first' && list.length > 0) {
            setSelectedVideoIds([list[0].id]);
          } else if (defaultVideoMode === 'custom') {
            // Custom mode: leave empty as a signal "all", staff picks manually.
            // We intentionally don't pre-tick anything.
            setSelectedVideoIds([]);
          }
          // 'all' → leave [] (renderer treats empty as "show all").
        }
        const altDef = Array.isArray(defs?.default_alternate_profile_link_ids) ? defs.default_alternate_profile_link_ids : [];
        if (altDef.length > 0 && !cancelled && altLinkIds.length === 0) setAltLinkIds(altDef);
        if (defs?.default_alternate_profiles_blurb && !cancelled && !altBlurb) setAltBlurb(defs.default_alternate_profiles_blurb);
        if (!cancelled) {
          if (typeof defs?.default_show_form === 'boolean') setShowForm(defs.default_show_form);
          if (typeof defs?.default_show_in_numbers === 'boolean') setShowInNumbers(defs.default_show_in_numbers);
          if (typeof defs?.default_show_season_stats === 'boolean') setShowSeasonStats(defs.default_show_season_stats);
          if (typeof defs?.default_show_strengths === 'boolean') setShowStrengths(defs.default_show_strengths);
          if (Array.isArray(defs?.default_section_order) && defs.default_section_order.length > 0) {
            setSectionOrder(normaliseSectionOrder(defs.default_section_order));
          }
          if (Array.isArray(defs?.default_key_details) && defs.default_key_details.length > 0) {
            setKeyDetails(normaliseKeyDetails(defs.default_key_details));
          }
        }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryPlayerId]);

  const savePlayerPositionDefault = async (playerId: string, position: string | null) => {
    if (!position) {
      toast.error("Pick a position first, then save it as default");
      return;
    }
    const { error } = await (supabase as any)
      .from("club_outreach_player_defaults")
      .upsert(
        { player_id: playerId, default_position: position, updated_at: new Date().toISOString() },
        { onConflict: "player_id" },
      );
    if (error) {
      toast.error(error.message ?? "Failed to save default");
      return;
    }
    toast.success("Default position saved for this player");
  };

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
        season_data_mode: seasonDataMode,
        season_id: seasonId,
        selected_video_ids: selectedVideoIds,
        alternate_profile_link_ids: altLinkIds,
        alternate_profiles_blurb: altBlurb.trim() || null,
        is_mandated: isMandated,
        key_details: keyDetails,
        section_order: sectionOrder,
        mandated_agent_name: isMandated ? (mandatedAgentName.trim() || null) : null,
        mandated_agent_role: isMandated ? (mandatedAgentRole.trim() || null) : null,
        mandated_agent_phone: isMandated ? (mandatedAgentPhone.trim() || null) : null,
        mandated_agent_logo_url: isMandated ? (mandatedAgentLogoUrl.trim() || null) : null,
        mandate_proof_path: isMandated ? (mandateProofPath.trim() || null) : null,
        is_suggested_to_agent: isMandated ? isSuggestedToAgent : false,
        suggested_agent_note: isMandated && isSuggestedToAgent ? (suggestedAgentNote.trim() || null) : null,
        language,
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

      // Translate (or clear translations if English) so the proposal page renders in the chosen language.
      try {
        const editingShort = editing?.short_id;
        let shortIdForTranslate = editingShort ?? null;
        if (!shortIdForTranslate && linkId) {
          const { data: row } = await supabase
            .from("club_outreach_links")
            .select("short_id")
            .eq("id", linkId)
            .maybeSingle();
          shortIdForTranslate = row?.short_id ?? null;
        }
        if (shortIdForTranslate) {
          if (language === "en") {
            await supabase.functions.invoke("translate-club-outreach", {
              body: { short_id: shortIdForTranslate, language: "en" },
            });
          } else {
            toast.message("Translating proposal…");
            const { error: tErr } = await supabase.functions.invoke("translate-club-outreach", {
              body: { short_id: shortIdForTranslate, language },
            });
            if (tErr) toast.error(`Translation failed: ${tErr.message ?? tErr}`);
            else toast.success("Proposal translated");
          }
        }
      } catch (e: any) {
        toast.error(`Translation failed: ${e?.message ?? e}`);
      }

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
                        <div className="flex items-center gap-1">
                          <div className="w-28">
                            <Select value={e.position_slot ?? ""} onValueChange={(v) => updateEntry(e.player_id, { position_slot: v || null })}>
                              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Position" /></SelectTrigger>
                              <SelectContent>{POSITION_SLOTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-9 px-2 text-[10px] uppercase tracking-wide text-[#C6A332] hover:text-[#C6A332] hover:bg-[#C6A332]/10"
                            title="Save this position as the per-player default for future club outreach links"
                            onClick={() => savePlayerPositionDefault(e.player_id, e.position_slot)}
                          >
                            Save default
                          </Button>
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
              <Label>Proposal language</Label>
              <p className="text-[11px] text-muted-foreground mt-1">All titles, button labels, and the per-player Fit & Recommendation text on this proposal will be translated to the chosen language when you save. English fields stay editable here.</p>
              <Select value={language} onValueChange={(v) => setLanguage(v)}>
                <SelectTrigger className="mt-1.5 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTREACH_LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-[11px] text-muted-foreground -mb-1">
              The blocks below carry the primary player's saved defaults. Open one only if you need to override it for this outreach.
            </p>
            <Accordion type="multiple" className="space-y-2">
            <AccordionItem value="show" className="border border-border rounded-md bg-background/40 px-3">
              <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">Show on proposal</AccordionTrigger>
              <AccordionContent className="pb-3">
              <p className="text-[11px] text-muted-foreground -mt-1 mb-2">Pull these sections through from the player's Stars profile.</p>
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
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="seasonmode" className="border border-border rounded-md bg-background/40 px-3">
              <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">Season data — popup or link</AccordionTrigger>
              <AccordionContent className="pb-3">
              <p className="text-[11px] text-muted-foreground mt-1">
                Popup keeps clubs on the proposal in a wide in-page sheet. Link opens the player's Stars profile in a new tab.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {(['popup', 'link'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSeasonDataMode(mode)}
                    className={`rounded-md border px-3 py-1.5 text-xs capitalize transition-colors ${
                      seasonDataMode === mode
                        ? "border-[#cbb96b] bg-[#cbb96b]/15 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-[#cbb96b]/60"
                    }`}
                  >
                    {mode === 'popup' ? 'In-page popup' : 'Link to Stars profile'}
                  </button>
                ))}
                {entries[0]?.player_id && (
                  <button
                    type="button"
                    onClick={async () => {
                      const pid = entries[0]?.player_id;
                      if (!pid) return;
                      const { error } = await (supabase as any)
                        .from("club_outreach_player_defaults")
                        .upsert(
                          { player_id: pid, default_season_data_mode: seasonDataMode, updated_at: new Date().toISOString() },
                          { onConflict: "player_id" },
                        );
                      if (error) {
                        toast.error(error.message ?? "Failed to save default");
                        return;
                      }
                      toast.success("Default data mode saved for this player");
                    }}
                    className="ml-auto text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    Save as player default
                  </button>
                )}
              </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="season" className="border border-border rounded-md bg-background/40 px-3">
              <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">Season to show</AccordionTrigger>
              <AccordionContent className="pb-3">
              <p className="text-[11px] text-muted-foreground mt-1">
                Scope the data popup and Form banner to one of {playerById.get(primaryPlayerId ?? "")?.name?.split(" ")[0] ?? "this player"}'s named seasons. Leave on "All seasons" to use every match.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="min-w-[220px]">
                  <Select
                    value={seasonId ?? "__all__"}
                    onValueChange={(v) => setSeasonId(v === "__all__" ? null : v)}
                    disabled={!primaryPlayerId}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder={primaryPlayerId ? "All seasons" : "Add a player first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All seasons</SelectItem>
                      {playerSeasons.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {primaryPlayerId && playerSeasons.length === 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    No seasons set up yet — add them in Data → Player Summary.
                  </span>
                )}
                {primaryPlayerId && (
                  <button
                    type="button"
                    onClick={async () => {
                      const { error } = await (supabase as any)
                        .from("club_outreach_player_defaults")
                        .upsert(
                          { player_id: primaryPlayerId, default_season_id: seasonId, updated_at: new Date().toISOString() },
                          { onConflict: "player_id" },
                        );
                      if (error) { toast.error(error.message ?? "Failed to save default"); return; }
                      toast.success("Default season saved for this player");
                    }}
                    className="ml-auto text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    Save as player default
                  </button>
                )}
              </div>
              </AccordionContent>
            </AccordionItem>
            {primaryPlayerId && (
              <AccordionItem value="videos" className="border border-border rounded-md bg-background/40 px-3">
                <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">Videos to include (carousel)</AccordionTrigger>
                <AccordionContent className="pb-3">
                <p className="text-[11px] text-muted-foreground mt-1">
                  Pick which of {playerById.get(primaryPlayerId)?.name?.split(" ")[0] ?? "this player"}'s Stars highlights appear under the hero video. Leave all ticked to show every video. The first ticked plays first.
                </p>
                {loadingPrimaryVideos ? (
                  <div className="mt-2 text-[11px] text-muted-foreground">Loading highlights…</div>
                ) : primaryVideos.length === 0 ? (
                  <div className="mt-2 text-[11px] text-muted-foreground">No highlights uploaded for this player yet.</div>
                ) : (
                  <>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                      {primaryVideos.map((v) => {
                        const allOn = selectedVideoIds.length === 0;
                        const isOn = allOn || selectedVideoIds.includes(v.id);
                        return (
                          <label key={v.id} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs cursor-pointer hover:border-[#cbb96b]/60">
                            <Checkbox
                              checked={isOn}
                              onCheckedChange={(c) => {
                                setSelectedVideoIds((prev) => {
                                  // Promote "all" (empty) into an explicit list before toggling.
                                  const base = prev.length === 0 ? primaryVideos.map((x) => x.id) : prev;
                                  if (c) return Array.from(new Set([...base, v.id]));
                                  return base.filter((id) => id !== v.id);
                                });
                              }}
                            />
                            <span className="truncate">{v.name}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedVideoIds([])}
                        className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      >
                        Show all videos
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const { error } = await (supabase as any)
                            .from("club_outreach_player_defaults")
                            .upsert(
                              { player_id: primaryPlayerId, default_selected_video_ids: selectedVideoIds, updated_at: new Date().toISOString() },
                              { onConflict: "player_id" },
                            );
                          if (error) {
                            toast.error(error.message ?? "Failed to save default");
                            return;
                          }
                          toast.success("Default videos saved for this player");
                        }}
                        className="ml-auto text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      >
                        Save as player default
                      </button>
                    </div>
                  </>
                )}
                </AccordionContent>
              </AccordionItem>
            )}
            <AccordionItem value="alt" className="border border-border rounded-md bg-background/40 px-3">
              <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">Alternate Options (optional)</AccordionTrigger>
              <AccordionContent className="pb-3 space-y-2">
              <p className="text-[11px] text-muted-foreground">
                A wide thin card at the bottom of the proposal where you add extra detail (e.g. free-transfer alternatives, loan options, budget profiles) and optionally link to other player profiles the club can switch to.
              </p>
              <Textarea
                rows={4}
                placeholder="If budget is tight we'd also recommend looking at…"
                value={altBlurb}
                onChange={(e) => setAltBlurb(e.target.value)}
                className="text-sm"
              />
              {/* Linked alternate player profiles. These render as plain
                  clickable links inside the same card on the proposal so the
                  club can switch to a different profile. */}
              <div className="pt-2 space-y-2">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Linked profiles</Label>
                {altLinkIds.length > 0 && (
                  <div className="space-y-1.5">
                    {altLinkIds.map((id, idx) => {
                      const r = allRows.find(x => x.id === id);
                      const pid = r?.link_players?.[0]?.player_id ?? r?.player_id ?? null;
                      const p = pid ? playerById.get(pid) : null;
                      const label = p?.name ?? r?.agent_name ?? r?.club?.club_name ?? r?.short_id ?? "Unknown";
                      const sub = [p?.position, r?.club?.club_name].filter(Boolean).join(" · ");
                      return (
                        <div key={id} className="flex items-center gap-2 rounded border border-border bg-background/60 px-2 py-1.5 text-xs">
                          <span className="flex-1 truncate">
                            <span className="font-medium">{label}</span>
                            {sub && <span className="text-muted-foreground"> — {sub}</span>}
                          </span>
                          <button type="button" disabled={idx === 0} onClick={() => setAltLinkIds(arr => { const n = [...arr]; [n[idx-1], n[idx]] = [n[idx], n[idx-1]]; return n; })} className="text-muted-foreground hover:text-foreground disabled:opacity-30">↑</button>
                          <button type="button" disabled={idx === altLinkIds.length - 1} onClick={() => setAltLinkIds(arr => { const n = [...arr]; [n[idx+1], n[idx]] = [n[idx], n[idx+1]]; return n; })} className="text-muted-foreground hover:text-foreground disabled:opacity-30">↓</button>
                          <button type="button" onClick={() => setAltLinkIds(arr => arr.filter(x => x !== id))} className="text-muted-foreground hover:text-red-400">×</button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <Input
                  value={altQuery}
                  onChange={(e) => setAltQuery(e.target.value)}
                  placeholder="Search other outreach profiles to link…"
                  className="h-8 text-xs"
                />
                {altQuery.trim() && (
                  <div className="max-h-40 overflow-auto rounded border border-border bg-background/40 divide-y divide-border">
                    {allRows
                      .filter(r => r.id !== editing?.id && !altLinkIds.includes(r.id))
                      .map(r => {
                        const pid = r.link_players?.[0]?.player_id ?? r.player_id ?? null;
                        const p = pid ? playerById.get(pid) : null;
                        const label = p?.name ?? r.agent_name ?? r.club?.club_name ?? r.short_id ?? "";
                        const haystack = `${label} ${r.club?.club_name ?? ""}`.toLowerCase();
                        return haystack.includes(altQuery.trim().toLowerCase()) ? { r, p, label } : null;
                      })
                      .filter(Boolean)
                      .slice(0, 20)
                      .map((m: any) => (
                        <button
                          key={m.r.id}
                          type="button"
                          onClick={() => { setAltLinkIds(arr => [...arr, m.r.id]); setAltQuery(""); }}
                          className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent/40 flex items-center gap-2"
                        >
                          <span className="flex-1 truncate">
                            <span className="font-medium">{m.label}</span>
                            {m.r.club?.club_name && <span className="text-muted-foreground"> — {m.r.club.club_name}</span>}
                          </span>
                          <span className="text-[10px] text-muted-foreground">Add</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="keydetails" className="border border-border rounded-md bg-background/40 px-3">
              <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">Key detail tiles</AccordionTrigger>
              <AccordionContent className="pb-3">
                <KeyDetailsBuilder items={keyDetails} onChange={setKeyDetails} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="sectionorder" className="border border-border rounded-md bg-background/40 px-3">
              <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">Section order</AccordionTrigger>
              <AccordionContent className="pb-3">
                <SectionOrderBuilder order={sectionOrder} onChange={setSectionOrder} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="mandate" className="border border-[#cbb96b]/40 rounded-md bg-[#cbb96b]/[0.06] px-3">
              <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">Mandate / suggested-to-agent</AccordionTrigger>
              <AccordionContent className="pb-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={isMandated} onCheckedChange={(c) => setIsMandated(!!c)} />
                <div>
                  <div className="text-xs font-semibold text-foreground">Mark as Mandated</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Use when this player's mandate has been given to another agent / agency. Their name replaces "Rise Football Agency presents" at the top, and a "Mandated by Rise Football Agency" line appears below.
                  </p>
                </div>
              </label>
              {isMandated && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="sm:col-span-2">
                    <Label className="text-[11px]">Mandated agent / agency name</Label>
                    <Input className="mt-1 h-8 text-xs" placeholder="e.g. ProActive Sports Management" value={mandatedAgentName} onChange={(e) => setMandatedAgentName(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[11px]">Contact role (optional)</Label>
                    <Input className="mt-1 h-8 text-xs" placeholder="e.g. Director" value={mandatedAgentRole} onChange={(e) => setMandatedAgentRole(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[11px]">WhatsApp number</Label>
                    <Input className="mt-1 h-8 text-xs" placeholder="+44 7…" value={mandatedAgentPhone} onChange={(e) => setMandatedAgentPhone(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-[11px]">Logo / photo URL (optional)</Label>
                    <div className="flex gap-2 items-center mt-1">
                      <Input className="h-8 text-xs flex-1" placeholder="https://…" value={mandatedAgentLogoUrl} onChange={(e) => setMandatedAgentLogoUrl(e.target.value)} />
                      <label className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded border border-border cursor-pointer hover:bg-muted/40">
                        <Upload className="h-3 w-3" /> {mandatedLogoUploading ? "Uploading…" : "Upload"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            setMandatedLogoUploading(true);
                            try {
                              const ext = f.name.split(".").pop() || "png";
                              const path = `mandated-agent-${Date.now()}.${ext}`;
                              const { error: upErr } = await supabase.storage.from("club-logos").upload(path, f, { cacheControl: "3600", upsert: true });
                              if (upErr) throw upErr;
                              const { data } = supabase.storage.from("club-logos").getPublicUrl(path);
                              setMandatedAgentLogoUrl(data.publicUrl);
                              toast.success("Logo uploaded");
                            } catch (err: any) {
                              toast.error(err.message ?? "Upload failed");
                            } finally {
                              setMandatedLogoUploading(false);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-[11px]">Proof of Mandate document (PDF or image)</Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Replaces the standard Proof of Representation card for this proposal. Upload the signed mandate document granting representation to the agent / agency named above.
                    </p>
                    <div className="flex gap-2 items-center mt-1">
                      <div className="flex-1 text-[11px] text-muted-foreground truncate">
                        {mandateProofPath ? mandateProofPath.split("/").pop() : "No document uploaded yet"}
                      </div>
                      <label className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded border border-border cursor-pointer hover:bg-muted/40">
                        <Upload className="h-3 w-3" /> {mandateProofUploading ? "Uploading…" : mandateProofPath ? "Replace" : "Upload"}
                        <input
                          type="file"
                          accept="application/pdf,image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            setMandateProofUploading(true);
                            try {
                              const ext = f.name.split(".").pop() || "pdf";
                              const path = `mandate-proofs/${Date.now()}-${slugify(f.name.replace(/\.[^.]+$/, ""))}.${ext}`;
                              const { error: upErr } = await supabase.storage.from("proof-of-representation").upload(path, f, { cacheControl: "3600", upsert: true });
                              if (upErr) throw upErr;
                              setMandateProofPath(path);
                              toast.success("Mandate document uploaded");
                            } catch (err: any) {
                              toast.error(err.message ?? "Upload failed");
                            } finally {
                              setMandateProofUploading(false);
                            }
                          }}
                        />
                      </label>
                      {mandateProofPath && (
                        <button type="button" className="text-[11px] text-muted-foreground hover:text-destructive" onClick={() => setMandateProofPath("")}>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="sm:col-span-2 mt-1 rounded-md border border-[#cbb96b]/40 bg-[#cbb96b]/[0.05] p-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox checked={isSuggestedToAgent} onCheckedChange={(c) => setIsSuggestedToAgent(!!c)} />
                      <div>
                        <div className="text-xs font-semibold text-foreground">Send as suggestion to the mandated agent</div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Adds a banner at the top of the proposal explaining this is a preview of what we'd like the mandated agent to send on the player's behalf, with a personalised note from you.
                        </p>
                      </div>
                    </label>
                    {isSuggestedToAgent && (
                      <div className="mt-2">
                        <Label className="text-[11px]">Personalised note to the mandated agent</Label>
                        <Textarea
                          rows={3}
                          className="mt-1 text-xs"
                          placeholder="e.g. Hi David, we think this would land well with Sparta — feel free to tailor the wording before forwarding it on."
                          value={suggestedAgentNote}
                          onChange={(e) => setSuggestedAgentNote(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              </AccordionContent>
            </AccordionItem>
            </Accordion>
            <p className="text-[11px] text-muted-foreground">Club contact details live in <b>Settings → Club contacts</b> and are shared across every outreach for that club.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || (isAgent ? !agentName.trim() : !clubId) || entries.length === 0} className="bg-[#cbb96b] text-black hover:bg-[#cbb96b]/90">
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

const ADDABLE_KEY_DETAIL_KINDS: KeyDetailKind[] = [
  "club",
  "age",
  "nationality",
  "league",
  "position",
  "contract_expiry",
  "status",
  "current_salary",
  "salary_expectations",
  "transfer_fee",
  "contract_expiry_override",
  "height",
  "preferred_foot",
  "custom",
];

function KeyDetailsBuilder({ items, onChange }: { items: KeyDetailItem[]; onChange: (next: KeyDetailItem[]) => void }) {
  const [adding, setAdding] = useState<KeyDetailKind | "">("");

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<KeyDetailItem>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addKind = (kind: KeyDetailKind) => {
    onChange([...items, { kind, label: kind === "custom" ? "" : undefined, value: KEY_DETAIL_HAS_VALUE[kind] ? "" : undefined }]);
    setAdding("");
  };

  return (
    <div>
      <Label>Key details tiles</Label>
      <p className="text-[11px] text-muted-foreground mt-1">
        Tiles shown in the grid above the highlights video. Reorder, remove, or add extras. Empty = the original four defaults (Club, Age, Nationality, League).
      </p>
      <div className="mt-2 space-y-1.5">
        {items.map((it, i) => {
          const hasValue = KEY_DETAIL_HAS_VALUE[it.kind];
          return (
            <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
              <div className="flex flex-col">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="h-4 w-5 inline-flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30">
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="h-4 w-5 inline-flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30">
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#cbb96b] w-32 shrink-0">
                {KEY_DETAIL_LABELS[it.kind]}
              </div>
              {it.kind === "custom" && (
                <Input
                  className="h-8 text-xs w-32"
                  placeholder="Label"
                  value={it.label ?? ""}
                  onChange={(e) => update(i, { label: e.target.value })}
                />
              )}
              {hasValue ? (
                <Input
                  className="h-8 text-xs flex-1"
                  placeholder={it.kind === "custom" ? "Value" : `e.g. ${placeholderFor(it.kind)}`}
                  value={it.value ?? ""}
                  onChange={(e) => update(i, { value: e.target.value })}
                />
              ) : (
                <div className="flex-1 text-[11px] text-muted-foreground">Pulled from player record</div>
              )}
              <button type="button" onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Select value={adding} onValueChange={(v) => addKind(v as KeyDetailKind)}>
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue placeholder="Add tile…" />
          </SelectTrigger>
          <SelectContent>
            {ADDABLE_KEY_DETAIL_KINDS.map((k) => (
              <SelectItem key={k} value={k}>{KEY_DETAIL_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(DEFAULT_KEY_DETAILS)}>
          Reset
        </Button>
      </div>
    </div>
  );
}

function placeholderFor(kind: KeyDetailKind): string {
  switch (kind) {
    case "salary_expectations": return "€1.2M/yr";
    case "transfer_fee": return "€8M";
    case "contract_expiry_override": return "Jun 2027";
    case "height": return "1.86 m";
    case "preferred_foot": return "Right";
    case "status": return "Available (Free)";
    default: return "";
  }
}

function SectionOrderBuilder({ order, onChange }: { order: ProposalSectionKey[]; onChange: (next: ProposalSectionKey[]) => void }) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = order.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div>
      <Label>Section order below the video</Label>
      <p className="text-[11px] text-muted-foreground mt-1">
        Reorder how Fit, the action cards, and the optional stats sections appear after the highlights video. Hidden sections still respect the toggles above.
      </p>
      <div className="mt-2 space-y-1.5">
        {order.map((key, i) => (
          <div key={key} className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-xs">
            <div className="flex flex-col">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="h-4 w-5 inline-flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ArrowUp className="h-3 w-3" />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === order.length - 1} className="h-4 w-5 inline-flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ArrowDown className="h-3 w-3" />
              </button>
            </div>
            <span className="text-muted-foreground w-5">{i + 1}.</span>
            <span className="font-medium text-foreground">{SECTION_LABELS[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsDialog({ open, onClose, players, clubs }: { open: boolean; onClose: () => void; players: PlayerLite[]; clubs: ClubLite[]; }) {
  const [whatsapp, setWhatsapp] = useState("");
  const [agentName, setAgentName] = useState("");
  const [agentImageUrl, setAgentImageUrl] = useState("");
  const [agentUploading, setAgentUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [defaultFit, setDefaultFit] = useState("");
  const [defaultSeasonDataMode, setDefaultSeasonDataMode] = useState<'popup' | 'link'>('popup');
  const [defaultVideoMode, setDefaultVideoMode] = useState<'all' | 'first' | 'custom'>('all');
  const [templates, setTemplates] = useState<QuickTemplate[]>([]);
  const [newTplTitle, setNewTplTitle] = useState("");
  const [newTplContent, setNewTplContent] = useState("");
  const [tplSaving, setTplSaving] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [defaults, setDefaults] = useState<{ stars_url_override: string; highlights_url: string; proof_path: string | null; transfermarkt_url: string }>({ stars_url_override: "", highlights_url: "", proof_path: null, transfermarkt_url: "" });
  const [playerDefaultFit, setPlayerDefaultFit] = useState<string>("");
  const [playerDefaultPosition, setPlayerDefaultPosition] = useState<string>("");
  const [playerDefaultSeasonMode, setPlayerDefaultSeasonMode] = useState<'popup' | 'link' | ''>('');
  const [playerDefaultSeasonId, setPlayerDefaultSeasonId] = useState<string | null>(null);
  const [playerSeasonsForDefaults, setPlayerSeasonsForDefaults] = useState<{ id: string; name: string }[]>([]);
  const [playerDefaultShowForm, setPlayerDefaultShowForm] = useState<boolean>(false);
  const [playerDefaultShowInNumbers, setPlayerDefaultShowInNumbers] = useState<boolean>(false);
  const [playerDefaultShowSeasonStats, setPlayerDefaultShowSeasonStats] = useState<boolean>(false);
  const [playerDefaultShowStrengths, setPlayerDefaultShowStrengths] = useState<boolean>(false);
  const [playerDefaultKeyDetails, setPlayerDefaultKeyDetails] = useState<KeyDetailItem[]>(DEFAULT_KEY_DETAILS);
  const [playerDefaultSectionOrder, setPlayerDefaultSectionOrder] = useState<ProposalSectionKey[]>(DEFAULT_SECTION_ORDER);
  const [playerDefaultVideos, setPlayerDefaultVideos] = useState<{ id: string; name: string }[]>([]);
  const [playerDefaultSelectedVideoIds, setPlayerDefaultSelectedVideoIds] = useState<string[]>([]);
  const [playerDefaultMbmCategory, setPlayerDefaultMbmCategory] = useState<string>("");
  const [playerStatOrders, setPlayerStatOrders] = useState<Record<string, string[]>>({});
  const [playerGameOrder, setPlayerGameOrder] = useState<string[]>([]);
  const [playerSeasonGames, setPlayerSeasonGames] = useState<{ id: string; opponent: string; analysis_date: string }[]>([]);
  const [statOrderSeasonId, setStatOrderSeasonId] = useState<string | null>(null);
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
      const { data } = await (supabase as any).from("club_outreach_settings").select("whatsapp_number, agent_name, agent_image_url, default_fit_recommendation, default_season_data_mode, default_video_selection_mode").eq("id", 1).maybeSingle();
      setWhatsapp(data?.whatsapp_number ?? "");
      setAgentName(data?.agent_name ?? "");
      setAgentImageUrl(data?.agent_image_url ?? "");
      setDefaultFit(data?.default_fit_recommendation ?? "");
      const sm = data?.default_season_data_mode;
      if (sm === 'popup' || sm === 'link') setDefaultSeasonDataMode(sm);
      const vm = data?.default_video_selection_mode;
      if (vm === 'all' || vm === 'first' || vm === 'custom') setDefaultVideoMode(vm);
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
        transfermarkt_url: (data as any)?.transfermarkt_url ?? "",
      });
      setPlayerDefaultFit((data as any)?.default_fit_recommendation ?? "");
      setPlayerDefaultPosition((data as any)?.default_position ?? "");
      const sm = (data as any)?.default_season_data_mode;
      setPlayerDefaultSeasonMode(sm === 'popup' || sm === 'link' ? sm : '');
      setPlayerDefaultSeasonId((data as any)?.default_season_id ?? null);
      setPlayerDefaultShowForm(!!(data as any)?.default_show_form);
      setPlayerDefaultShowInNumbers(!!(data as any)?.default_show_in_numbers);
      setPlayerDefaultShowSeasonStats(!!(data as any)?.default_show_season_stats);
      setPlayerDefaultShowStrengths(!!(data as any)?.default_show_strengths);
      const kd = (data as any)?.default_key_details;
      setPlayerDefaultKeyDetails(Array.isArray(kd) && kd.length > 0 ? normaliseKeyDetails(kd) : DEFAULT_KEY_DETAILS);
      const so = (data as any)?.default_section_order;
      setPlayerDefaultSectionOrder(Array.isArray(so) && so.length > 0 ? normaliseSectionOrder(so) : DEFAULT_SECTION_ORDER);
      const dv = (data as any)?.default_selected_video_ids;
      setPlayerDefaultSelectedVideoIds(Array.isArray(dv) ? dv : []);
      setPlayerDefaultMbmCategory(((data as any)?.default_match_by_match_category as string | null) ?? "");
      const so2 = (data as any)?.match_by_match_stat_orders;
      setPlayerStatOrders(so2 && typeof so2 === "object" && !Array.isArray(so2) ? so2 : {});
      const go = (data as any)?.match_by_match_game_order;
      setPlayerGameOrder(Array.isArray(go) ? go : []);
      setStatOrderSeasonId(null);
      setPlayerSeasonGames([]);
      const { data: seasons } = await supabase
        .from("player_seasons")
        .select("id, name, sort_order")
        .eq("player_id", selectedPlayerId)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      setPlayerSeasonsForDefaults((seasons ?? []) as { id: string; name: string }[]);
      // Load this player's highlights so we can offer the same video picker
      // that lives inside the new-outreach dialog.
      const { data: playerRow } = await supabase
        .from("players")
        .select("highlights")
        .eq("id", selectedPlayerId)
        .maybeSingle();
      let h: any = (playerRow as any)?.highlights ?? null;
      try { if (typeof h === "string") h = JSON.parse(h); } catch (_) { h = null; }
      let pool: any[] = [];
      if (Array.isArray(h)) pool = h;
      else if (h && typeof h === "object") pool = [...(h.matchHighlights ?? []), ...(h.bestClips ?? [])];
      setPlayerDefaultVideos(pool
        .filter((x: any) => x && (x.videoUrl || x.video_url))
        .map((x: any) => ({ id: String(x.id ?? x.videoUrl ?? x.video_url), name: String(x.name ?? "Highlight") })));
    })();
  }, [selectedPlayerId]);

  const saveWhatsapp = async () => {
    const { error } = await (supabase as any).from("club_outreach_settings").upsert({
      id: 1,
      whatsapp_number: whatsapp.trim(),
      agent_name: agentName.trim() || null,
      agent_image_url: agentImageUrl.trim() || null,
      default_fit_recommendation: defaultFit.trim() || null,
      default_season_data_mode: defaultSeasonDataMode,
      default_video_selection_mode: defaultVideoMode,
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
      default_position: playerDefaultPosition.trim() || null,
      default_season_data_mode: playerDefaultSeasonMode || null,
      default_season_id: playerDefaultSeasonId,
      default_show_form: playerDefaultShowForm,
      default_show_in_numbers: playerDefaultShowInNumbers,
      default_show_season_stats: playerDefaultShowSeasonStats,
      default_show_strengths: playerDefaultShowStrengths,
      default_key_details: playerDefaultKeyDetails,
      default_section_order: playerDefaultSectionOrder,
      default_selected_video_ids: playerDefaultSelectedVideoIds,
      default_match_by_match_category: playerDefaultMbmCategory.trim() || null,
      transfermarkt_url: defaults.transfermarkt_url.trim() || null,
      match_by_match_stat_orders: playerStatOrders ?? {},
      match_by_match_game_order: playerGameOrder ?? [],
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
        transfermarkt_url: defaults.transfermarkt_url.trim() || null,
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
              <FileEdit className="h-4 w-4 text-[#cbb96b]" />
              <h3 className="text-sm font-semibold">Proposal auto-defaults</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              What every new outreach starts with before you tweak it. Per-player defaults still override these, and you can change any of it on the individual outreach.
            </p>
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold">Season data display</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">
                  How the Video &amp; Data tile opens. Popup keeps clubs on the proposal in a wide in-page sheet. Link sends them out to the player's Stars page.
                </p>
                <div className="flex flex-wrap gap-2">
                  {([
                    { v: 'popup' as const, label: 'In-page popup' },
                    { v: 'link' as const, label: 'Link to Stars profile' },
                  ]).map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setDefaultSeasonDataMode(opt.v)}
                      className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${defaultSeasonDataMode === opt.v ? 'border-[#cbb96b] bg-[#cbb96b]/15 text-foreground' : 'border-border bg-background text-muted-foreground hover:border-[#cbb96b]/60'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold">Video carousel — what auto-shows</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">
                  Which of the player's Stars highlights pre-fill the hero carousel before you manually pick.
                </p>
                <div className="flex flex-wrap gap-2">
                  {([
                    { v: 'all' as const, label: 'All Stars highlights' },
                    { v: 'first' as const, label: 'First highlight only' },
                    { v: 'custom' as const, label: 'None — pick manually' },
                  ]).map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setDefaultVideoMode(opt.v)}
                      className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${defaultVideoMode === opt.v ? 'border-[#cbb96b] bg-[#cbb96b]/15 text-foreground' : 'border-border bg-background text-muted-foreground hover:border-[#cbb96b]/60'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <Button onClick={saveWhatsapp} className="bg-[#cbb96b] text-black hover:bg-[#cbb96b]/90">Save defaults</Button>
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
                  <Label>Default position slot</Label>
                  <p className="text-[11px] text-muted-foreground mt-1">Auto-fills the position dropdown when this player is added to an outreach.</p>
                  <Select value={playerDefaultPosition || "__none__"} onValueChange={(v) => setPlayerDefaultPosition(v === "__none__" ? "" : v)}>
                    <SelectTrigger className="mt-1.5 h-9 text-xs"><SelectValue placeholder="No default" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No default</SelectItem>
                      {POSITION_SLOTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Default season data display</Label>
                  <p className="text-[11px] text-muted-foreground mt-1">How the Video &amp; Data tile opens for this player by default. Leave on "Use global default" to follow the proposal-wide setting.</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {([
                      { v: '' as const, label: 'Use global default' },
                      { v: 'popup' as const, label: 'In-page popup' },
                      { v: 'link' as const, label: 'Link to Stars profile' },
                    ]).map((opt) => (
                      <button
                        key={opt.v || 'global'}
                        type="button"
                        onClick={() => setPlayerDefaultSeasonMode(opt.v)}
                        className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${playerDefaultSeasonMode === opt.v ? 'border-[#cbb96b] bg-[#cbb96b]/15 text-foreground' : 'border-border bg-background text-muted-foreground hover:border-[#cbb96b]/60'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Default season to show</Label>
                  <p className="text-[11px] text-muted-foreground mt-1">Scope the data popup and Form banner to one of this player's named seasons. Leave on "All seasons" to use every match.</p>
                  <Select
                    value={playerDefaultSeasonId ?? "__all__"}
                    onValueChange={(v) => setPlayerDefaultSeasonId(v === "__all__" ? null : v)}
                  >
                    <SelectTrigger className="mt-1.5 h-9 text-xs"><SelectValue placeholder="All seasons" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All seasons</SelectItem>
                      {playerSeasonsForDefaults.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {playerSeasonsForDefaults.length === 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1">No seasons set up yet — add them in Data → Player Summary.</p>
                  )}
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
                <div>
                  <Label>Default — show on proposal</Label>
                  <p className="text-[11px] text-muted-foreground mt-1">Which sections pre-tick when this player is added to a new outreach.</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {[
                      { v: playerDefaultShowForm, set: setPlayerDefaultShowForm, label: "Form" },
                      { v: playerDefaultShowInNumbers, set: setPlayerDefaultShowInNumbers, label: "In Numbers" },
                      { v: playerDefaultShowSeasonStats, set: setPlayerDefaultShowSeasonStats, label: "Season stats" },
                      { v: playerDefaultShowStrengths, set: setPlayerDefaultShowStrengths, label: "Strengths / Play style" },
                    ].map((opt) => (
                      <label key={opt.label} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs cursor-pointer hover:border-[#cbb96b]/60">
                        <Checkbox checked={opt.v} onCheckedChange={(c) => opt.set(!!c)} />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {playerDefaultVideos.length > 0 && (
                  <div>
                    <Label>Default — videos to include</Label>
                    <p className="text-[11px] text-muted-foreground mt-1">Pre-ticks the highlights carousel. Leave all unticked to show every video.</p>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                      {playerDefaultVideos.map((v) => {
                        const isOn = playerDefaultSelectedVideoIds.includes(v.id);
                        return (
                          <label key={v.id} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs cursor-pointer hover:border-[#cbb96b]/60">
                            <Checkbox
                              checked={isOn}
                              onCheckedChange={(c) => {
                                setPlayerDefaultSelectedVideoIds((prev) => c ? Array.from(new Set([...prev, v.id])) : prev.filter((id) => id !== v.id));
                              }}
                            />
                            <span className="truncate">{v.name}</span>
                          </label>
                        );
                      })}
                    </div>
                    {playerDefaultSelectedVideoIds.length > 0 && (
                      <button type="button" onClick={() => setPlayerDefaultSelectedVideoIds([])} className="mt-2 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                        Clear (show all)
                      </button>
                    )}
                  </div>
                )}
                <div>
                  <Label>Default — key detail tiles</Label>
                  <p className="text-[11px] text-muted-foreground mt-1 mb-2">Pre-fills the Key Details tiles on a new outreach for this player.</p>
                  <KeyDetailsBuilder items={playerDefaultKeyDetails} onChange={setPlayerDefaultKeyDetails} />
                </div>
                <div>
                  <Label>Default — section order</Label>
                  <p className="text-[11px] text-muted-foreground mt-1 mb-2">Pre-fills the proposal section order for this player.</p>
                  <SectionOrderBuilder order={playerDefaultSectionOrder} onChange={setPlayerDefaultSectionOrder} />
                </div>
                <div>
                  <Label>Default — Match by Match category</Label>
                  <p className="text-[11px] text-muted-foreground mt-1 mb-2">Which tab opens first on the proposal's Match by Match table for this player.</p>
                  <Select
                    value={playerDefaultMbmCategory || "__default__"}
                    onValueChange={(v) => setPlayerDefaultMbmCategory(v === "__default__" ? "" : v)}
                  >
                    <SelectTrigger className="max-w-xs"><SelectValue placeholder="Default (Passing)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">Default (Passing)</SelectItem>
                      <SelectItem value="Shooting">Shooting</SelectItem>
                      <SelectItem value="Passing">Passing</SelectItem>
                      <SelectItem value="Possession">Possession</SelectItem>
                      <SelectItem value="Defending">Defending</SelectItem>
                    </SelectContent>
                  </Select>
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