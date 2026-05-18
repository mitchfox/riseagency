import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useInvestorSession } from "@/hooks/useInvestorSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { format, formatDistanceToNow, differenceInMonths } from "date-fns";
import {
  LayoutDashboard, Sparkles, UserCheck, FileSignature, CheckSquare, Activity, Wallet,
  Network, TrendingUp, LogOut, Search, Plus, Trash2, Lock, Unlock, Calendar, Target,
  ChevronLeft, ChevronRight, ExternalLink, FileText, Pencil, Check, Bell, RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import { InvestmentOverview, type OverviewCardData, type OverviewSectionData } from "@/components/investor/InvestmentOverview";
import { StaffBreadcrumb } from "@/components/staff/StaffBreadcrumb";
import { SectionGridPicker } from "@/components/staff/SectionGridPicker";
import blackMarble from "@/assets/black-marble-bg.png";
import smudgedMarble from "@/assets/smudged-marble-overlay.png";

type SectionId =
  | "overview" | "investment"
  | "represented" | "mandated" | "previously"
  | "prospects" | "playerdatabase"
  | "contracts"
  | "spending" | "commission" | "invoices"
  | "tasks" | "activity";

interface PlayerRow {
  id: string; name: string; representation_status: string | null; position: string | null;
  nationality: string | null; date_of_birth: string | null; image_url: string | null;
  hover_image_url: string | null; club: string | null; club_logo: string | null; league: string | null;
  age: number | null;
  contract_start_date: string | null; contract_end_date: string | null;
  current_salary_annual: number | null; expected_commission_annual: number | null;
  commission_notes: string | null;
}
interface ContractRow {
  id: string; title: string; description: string | null; status: string | null;
  created_at: string; updated_at: string; owner_signed_at: string | null; locked_at: string | null;
  file_url: string | null; locked_file_url: string | null; completed_pdf_url: string | null;
  resolved_file_url: string | null;
}
interface TaskRow {
  id: string; title: string; description: string | null; category: string | null;
  priority: string | null; completed: boolean; deadline: string | null; created_at: string;
  updated_at: string; last_completed_at: string | null; assigned_to: string[] | null;
  image_url: string | null; display_order: number | null;
  is_recurring: boolean | null; recurrence_label: string | null;
  completion_log?: string[] | null;
}
interface StaffActivityRow {
  id: string; user_email: string | null; action: string; entity_type: string;
  entity_id: string | null; entity_name: string | null; details: any; created_at: string;
}
interface NotificationRow {
  id: string; event_type: string; title: string | null; body: string | null;
  event_data: any; created_at: string;
}
interface ProfileRow { id: string; email: string | null; full_name: string | null }
interface ProspectRow {
  id: string; name: string; stage: string | null; position: string | null;
  nationality: string | null; date_of_birth: string | null; age: number | null;
  age_group: 'A' | 'B' | 'C' | 'D' | null;
  current_club: string | null; profile_image_url: string | null;
  probability_weight: number | null; projected_revenue: number | null;
  revenue_currency: string | null; notes: string | null; last_contact_date: string | null;
  priority: 'low' | 'medium' | 'high' | null;
  updated_at: string;
  linked_player_id: string | null;
}
interface SpendingRow { id: string; spend_date: string; category: string; vendor: string | null; amount_gbp: number; notes: string | null; }
interface InvoiceRow {
  id: string; player_id: string; invoice_number: string; invoice_date: string; due_date: string;
  amount: number; currency: string; status: string; amount_paid: number | null;
  billing_month: string | null; description: string | null;
}
interface DbPlayer {
  id: string; player_name: string; position: string | null; age: number | null;
  current_club: string | null; nationality: string | null; date_of_birth: string | null;
  source: 'scouting' | 'youth_outreach' | 'pro_outreach';
  profile_image_url?: string | null; club_logo_url?: string | null;
  report_count: number;
}

const gbp = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(Number(n));
const ccy = (n: number | null | undefined, c: string = "GBP") =>
  n == null ? "—" : new Intl.NumberFormat("en-GB", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(Number(n));

const SPENDING_CATEGORIES = ["tools", "travel", "staff", "misc"];

interface CategoryDef {
  id: string;
  title: string;
  icon: any;
  sections: { id: SectionId; title: string; icon: any }[];
}

const CATEGORIES: CategoryDef[] = [
  { id: "dash", title: "Dashboard", icon: LayoutDashboard, sections: [
    { id: "overview", title: "Overview", icon: LayoutDashboard },
    { id: "investment", title: "Investment", icon: Sparkles },
  ]},
  { id: "roster", title: "Roster", icon: UserCheck, sections: [
    { id: "represented", title: "Represented", icon: UserCheck },
    { id: "mandated", title: "Mandated", icon: UserCheck },
    { id: "previously", title: "Prev. Mandated", icon: UserCheck },
  ]},
  { id: "pipe", title: "Pipeline", icon: Network, sections: [
    { id: "prospects", title: "Prospect Board", icon: Target },
    { id: "playerdatabase", title: "Player Database", icon: Network },
  ]},
  { id: "legal", title: "Legal", icon: FileSignature, sections: [
    { id: "contracts", title: "Contracts", icon: FileSignature },
  ]},
  { id: "fin", title: "Financial", icon: Wallet, sections: [
    { id: "spending", title: "Spending", icon: Wallet },
    { id: "commission", title: "Commission", icon: TrendingUp },
    { id: "invoices", title: "Invoices", icon: FileText },
  ]},
  { id: "act", title: "Activity", icon: Activity, sections: [
    { id: "tasks", title: "My Tasks", icon: CheckSquare },
    { id: "activity", title: "Activity Feed", icon: Activity },
  ]},
];

function playChime() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.18);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    o.start(); o.stop(ctx.currentTime + 0.4);
  } catch { /* noop */ }
}

const LoginGate = ({ onSignIn }: { onSignIn: (u: string, p: string) => Promise<void>; }) => {
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await onSignIn(u.trim(), p); } catch (err: any) { toast.error(err.message || "Login failed"); }
    finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-background">
      <div className="absolute inset-0 opacity-40 pointer-events-none"
        style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background pointer-events-none" />
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md">
        <Card className="border-primary/20 bg-card/80 backdrop-blur-xl p-8 shadow-2xl flex flex-col items-center text-center">
          <img src="/RISEWhite.png" alt="RISE" className="h-12 w-auto object-contain mb-4" />
          <h1 className="text-2xl font-bbh uppercase tracking-wide">Investor Portal</h1>
          <p className="text-sm text-muted-foreground mt-2 mb-6">Restricted access. Authentication required.</p>
          <form onSubmit={submit} className="space-y-4 w-full">
            <div className="space-y-1.5 text-left">
              <Label htmlFor="iu">Username</Label>
              <Input id="iu" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" required className="text-center" />
            </div>
            <div className="space-y-1.5 text-left">
              <Label htmlFor="ip">Password</Label>
              <Input id="ip" type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required className="text-center" />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bbh uppercase tracking-wider">
              {busy ? "Authenticating..." : "Enter Portal"}
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

// ---------- Player card with inline editable commission ----------
const ContractBadge = ({ end }: { end: string | null }) => {
  if (!end) return <span className="text-xs text-muted-foreground">No contract end</span>;
  const months = differenceInMonths(new Date(end), new Date());
  const tone = months < 6 ? "text-red-400 border-red-500/40 bg-red-500/10"
    : months < 12 ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
    : "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
  return <span className={`text-[10px] uppercase tracking-wider font-bbh px-2 py-0.5 rounded border ${tone}`}>
    Exp {format(new Date(end), "MMM yyyy")}
  </span>;
};

const PlayerCard = ({ p, editable, onSave, paidByPlayer }: {
  p: PlayerRow; editable?: boolean; onSave?: (val: number | null) => Promise<void>;
  paidByPlayer?: number;
}) => {
  const flag = p.nationality ? getCountryFlagUrl(p.nationality) : null;
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState<string>(p.expected_commission_annual?.toString() ?? "");
  useEffect(() => { setVal(p.expected_commission_annual?.toString() ?? ""); }, [p.expected_commission_annual]);

  const commit = async () => {
    if (!onSave) return;
    const n = val.trim() === "" ? null : Number(val);
    if (n != null && Number.isNaN(n)) { toast.error("Invalid number"); return; }
    await onSave(n);
    setEdit(false);
  };

  return (
    <Card className="bg-card/60 border-border/60 hover:border-primary/50 transition-colors overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        <Avatar className="h-14 w-14 border-2 border-primary/30">
          <AvatarImage src={p.image_url || undefined} alt={p.name} className="object-cover" />
          <AvatarFallback className="bg-primary/10 text-primary font-bbh">{p.name?.[0] || "?"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bbh uppercase tracking-wide text-base truncate">{p.name}</h3>
            {p.position && <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">{p.position}</Badge>}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            {flag && <img src={flag} alt={p.nationality || ""} className="w-4 h-3 object-cover rounded-sm" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
            <span>{p.nationality || "—"}</span>
            <span>•</span>
            <span>{p.age ?? "—"} yrs</span>
            {p.club && (<>
              <span>•</span>
              {p.club_logo && <img src={p.club_logo} alt={p.club} className="w-4 h-4 object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
              <span className="truncate max-w-[160px]">{p.club}</span>
            </>)}
          </div>
        </div>
        <div className="text-right space-y-1 shrink-0 min-w-[140px]">
          <ContractBadge end={p.contract_end_date} />
          {edit && editable ? (
            <div className="flex items-center gap-1 justify-end">
              <Input
                type="number" value={val} onChange={e => setVal(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEdit(false); setVal(p.expected_commission_annual?.toString() ?? ""); } }}
                onBlur={commit}
                className="h-7 w-24 text-right text-sm font-bbh" autoFocus
                placeholder="0"
              />
              <Button size="icon" variant="ghost" className="h-6 w-6 text-primary" onClick={commit}><Check className="w-3 h-3" /></Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => editable && setEdit(true)}
              className={`text-sm font-bbh text-primary block ml-auto ${editable ? "hover:bg-primary/10 px-1.5 rounded transition-colors" : ""}`}
              title={editable ? "Click to edit annual commission forecast" : undefined}
            >
              {gbp(p.expected_commission_annual)}<span className="text-[10px] text-muted-foreground"> /yr</span>
              {editable && <Pencil className="inline w-2.5 h-2.5 ml-1 opacity-60" />}
            </button>
          )}
          {paidByPlayer != null && paidByPlayer > 0 && (
            <div className="text-[10px] text-emerald-400">{gbp(paidByPlayer)} paid</div>
          )}
        </div>
      </div>
    </Card>
  );
};

// ---------- Marble card header ----------
const MarbleHeader = ({ icon: Icon, title, action }: { icon: any; title: string; action?: React.ReactNode }) => (
  <div className="relative overflow-hidden rounded-t-lg border-b border-border/60">
    <div className="absolute inset-0 opacity-30 pointer-events-none"
      style={{ backgroundImage: `url(${smudgedMarble})`, backgroundSize: "cover", backgroundPosition: "center", mixBlendMode: "overlay" }} />
    <div className="relative px-5 py-3 flex items-center justify-between bg-card/60 backdrop-blur-sm">
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 text-primary" />
        <h2 className="font-bbh uppercase tracking-wide text-sm">{title}</h2>
      </div>
      {action}
    </div>
  </div>
);

const SectionShell = ({ icon, title, children, action }: { icon: any; title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <Card className="bg-card/40 border-border/60 overflow-hidden">
    <MarbleHeader icon={icon} title={title} action={action} />
    <div className="p-5">{children}</div>
  </Card>
);

// ---------- Sections ----------
const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <Card className="bg-card/60 border-border/60 p-5">
    <div className="text-[10px] uppercase tracking-[0.25em] text-primary/70 mb-2 font-bbh">{label}</div>
    <div className="text-3xl font-bbh tracking-wide">{value}</div>
    {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
  </Card>
);

const Roster = ({ players, status, editable, onSaveCommission, invoiceTotalsByPlayer }: {
  players: PlayerRow[]; status: string; editable: boolean;
  onSaveCommission: (id: string, val: number | null) => Promise<void>;
  invoiceTotalsByPlayer: Record<string, number>;
}) => {
  const rows = players.filter(p => p.representation_status === status);
  const label = status === "represented" ? "Represented" : status === "mandated" ? "Mandated" : "Previously Mandated";
  return (
    <SectionShell icon={UserCheck} title={`${label} (${rows.length})`}>
      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">No {label.toLowerCase()} players.</div>
      ) : (
        <div className="space-y-2">{rows.map(p => (
          <PlayerCard key={p.id} p={p} editable={editable} paidByPlayer={invoiceTotalsByPlayer[p.id] || 0}
            onSave={(v) => onSaveCommission(p.id, v)} />
        ))}</div>
      )}
    </SectionShell>
  );
};

const ContractsView = ({ rows }: { rows: ContractRow[] }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rows.find(r => r.id === selectedId) || rows[0] || null;
  const url = selected?.resolved_file_url || null;
  const [loadError, setLoadError] = useState(false);
  useEffect(() => { setLoadError(false); }, [selected?.id]);
  return (
    <SectionShell icon={FileSignature} title={`Contracts (${rows.length})`}>
      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">No contracts yet.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          <div className="space-y-2 lg:max-h-[80vh] lg:overflow-y-auto pr-1">
            {rows.map(c => {
              const signed = !!c.owner_signed_at || !!c.locked_at;
              const isSelected = selected?.id === c.id;
              return (
                <button key={c.id} onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left p-3 rounded border transition-colors ${isSelected ? "border-primary bg-primary/10" : "border-border/60 bg-card/60 hover:border-primary/40"}`}>
                  <div className="flex items-start gap-2">
                    <FileSignature className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bbh uppercase text-sm truncate">{c.title || "Untitled"}</div>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <Badge variant="outline" className={`text-[9px] ${signed ? "border-primary/60 text-primary" : "border-border text-muted-foreground"}`}>
                          {c.locked_at ? <><Lock className="w-2.5 h-2.5 mr-0.5" />Locked</> : signed ? "Signed" : c.status || "Draft"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="rounded border border-border/60 bg-background overflow-hidden flex flex-col min-h-[60vh] lg:min-h-[80vh]">
            {selected ? (
              <>
                <div className="px-4 py-2 border-b border-border/60 flex items-center justify-between bg-card/50">
                  <div className="font-bbh uppercase text-sm truncate">{selected.title}</div>
                  <div className="flex items-center gap-2">
                    {url && (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> Open
                      </a>
                    )}
                  </div>
                </div>
                {url && !loadError ? (
                  <object data={url} type="application/pdf" className="flex-1 w-full bg-white">
                    <iframe src={url} className="w-full h-full border-0 bg-white" title={selected.title} onError={() => setLoadError(true)} />
                  </object>
                ) : url ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6">
                    <FileSignature className="w-10 h-10 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">Your browser cannot preview this PDF inline.</div>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="bg-primary text-primary-foreground"><ExternalLink className="w-3.5 h-3.5 mr-1.5" />Open PDF</Button>
                    </a>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">No PDF available for this contract yet.</div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Select a contract to preview.</div>
            )}
          </div>
        </div>
      )}
    </SectionShell>
  );
};

// ---------- Tasks (live view styled like staff My Tasks) ----------
const TasksView = ({ rows, profiles }: { rows: TaskRow[]; profiles: ProfileRow[] }) => {
  const [activeMember, setActiveMember] = useState<string | "all">("all");
  const live = rows.filter(t => !t.completed);
  const profileMap = new Map(profiles.map(p => [p.id, p]));
  const allMembers = Array.from(new Set(live.flatMap(t => t.assigned_to || []))).map(id => profileMap.get(id)).filter(Boolean) as ProfileRow[];

  const filtered = activeMember === "all" ? live : live.filter(t => t.assigned_to?.includes(activeMember));

  const priorities = ["urgent", "high", "medium", "low"];
  const byPriority = priorities.map(pr => ({
    priority: pr,
    tasks: filtered.filter(t => (t.priority || "medium").toLowerCase() === pr).sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999)),
  })).filter(g => g.tasks.length > 0);
  const other = filtered.filter(t => !priorities.includes((t.priority || "medium").toLowerCase()));
  if (other.length > 0) byPriority.push({ priority: "other", tasks: other });

  const toneFor = (pr: string) =>
    pr === "urgent" ? "border-red-500/60 text-red-300 bg-red-500/10"
    : pr === "high" ? "border-amber-500/60 text-amber-300 bg-amber-500/10"
    : pr === "medium" ? "border-primary/40 text-primary bg-primary/5"
    : "border-border text-muted-foreground bg-muted/20";

  // Weekly completion count per member for leaderboard mini
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
  const memberWeekCount = (id: string) => rows.reduce((s, t) => {
    if (!t.assigned_to?.includes(id)) return s;
    return s + ((t.completion_log || []) as string[]).filter(d => new Date(d) >= weekStart).length;
  }, 0);

  return (
    <SectionShell icon={CheckSquare} title="My Tasks — Live View">
      {/* Staff slider */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-thin">
        <button
          onClick={() => setActiveMember("all")}
          className={`shrink-0 px-3 py-1.5 rounded-xl border-2 text-xs font-medium transition-all ${
            activeMember === "all" ? "border-primary bg-primary/10 text-primary" : "border-border/50 bg-card/30 text-muted-foreground hover:border-border"
          }`}
        >All ({live.length})</button>
        {allMembers.map(m => {
          const memberTasks = live.filter(t => t.assigned_to?.includes(m.id)).length;
          const isActive = activeMember === m.id;
          const week = memberWeekCount(m.id);
          return (
            <button key={m.id} onClick={() => setActiveMember(m.id)}
              className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 text-xs font-medium transition-all ${
                isActive ? "border-primary bg-primary/10 text-primary" : "border-border/50 bg-card/30 text-muted-foreground hover:border-border"
              }`}>
              <span>{(m.full_name || m.email?.split("@")[0] || "?")}</span>
              <span className="text-[10px] opacity-60">{memberTasks}</span>
              {week > 0 && <span className="text-[9px] text-emerald-400">+{week}wk</span>}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">No active tasks.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {byPriority.map(g => (
            <div key={g.priority} className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] uppercase tracking-widest font-bbh px-2 py-1 rounded border ${toneFor(g.priority)}`}>
                  {g.priority}
                </span>
                <span className="text-xs text-muted-foreground">{g.tasks.length}</span>
              </div>
              {g.tasks.map(t => (
                <Card key={t.id} className="bg-card/60 border-border/60 p-3">
                  {t.image_url && <img src={t.image_url} alt="" className="w-full h-24 object-cover rounded mb-2" />}
                  <div className="text-sm font-medium leading-snug">{t.title}</div>
                  {t.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</div>}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {t.category && <Badge variant="outline" className="text-[9px] uppercase">{t.category}</Badge>}
                    {t.deadline && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{format(new Date(t.deadline), "d MMM")}
                      </span>
                    )}
                    {t.is_recurring && <Badge variant="outline" className="text-[9px] border-primary/40 text-primary">{t.recurrence_label || "Recurring"}</Badge>}
                    {(t.assigned_to || []).slice(0, 3).map(uid => {
                      const m = profileMap.get(uid);
                      if (!m) return null;
                      return <Badge key={uid} variant="outline" className="text-[9px] border-border text-muted-foreground">{m.full_name || m.email?.split("@")[0]}</Badge>;
                    })}
                  </div>
                </Card>
              ))}
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
};

// ---------- Activity feed — merges staff activity + task events ----------
interface FeedItem { id: string; ts: string; kind: "task" | "system"; actor: string; action: string; subject: string; entity_type?: string }

const ActivityFeed = ({ rows, taskNotifications, profiles }: {
  rows: StaffActivityRow[]; taskNotifications: NotificationRow[]; profiles: ProfileRow[];
}) => {
  const [limit, setLimit] = useState(80);
  const profileMap = new Map(profiles.map(p => [p.id, p]));
  const emailMap = new Map(profiles.filter(p => p.email).map(p => [p.email!.toLowerCase(), p]));
  const resolveName = (email?: string | null, userId?: string | null, fallback?: string | null) => {
    if (userId) {
      const p = profileMap.get(userId);
      if (p?.full_name) return p.full_name;
    }
    if (email) {
      const p = emailMap.get(email.toLowerCase());
      if (p?.full_name) return p.full_name;
    }
    if (fallback && fallback.includes("@")) {
      const local = fallback.split("@")[0];
      const p = emailMap.get(fallback.toLowerCase());
      if (p?.full_name) return p.full_name;
      return local.replace(/[._-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    }
    return fallback || "Staff";
  };

  const items: FeedItem[] = useMemo(() => {
    const list: FeedItem[] = [];
    rows.forEach(e => {
      list.push({
        id: `a-${e.id}`, ts: e.created_at, kind: "system",
        actor: resolveName(e.user_email, null, e.user_email), action: e.action, subject: e.entity_name || e.entity_type, entity_type: e.entity_type,
      });
    });
    taskNotifications.forEach(n => {
      const data = n.event_data || {};
      const actorName = resolveName(data.user_email, data.user_id, data.user_name);
      const subject = data.task_title || data.title || n.title || n.body || "";
      const action = n.event_type.replace(/^task_/, "").replace(/_/g, " ");
      list.push({ id: `t-${n.id}`, ts: n.created_at, kind: "task", actor: actorName, action, subject, entity_type: "task" });
    });
    return list.sort((a, b) => +new Date(b.ts) - +new Date(a.ts));
  }, [rows, taskNotifications, profiles]);

  const shown = items.slice(0, limit);
  const verbTone: Record<string, string> = {
    created: "text-emerald-400",
    updated: "text-blue-400",
    deleted: "text-red-400",
    completed: "text-emerald-400",
    assigned: "text-primary",
    reminder: "text-amber-400",
  };

  return (
    <SectionShell icon={Activity} title="Activity Feed">
      {shown.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">No activity logged.</div>
      ) : (
        <div className="divide-y divide-border/40">
          {shown.map(e => {
            const verb = e.action.split(" ")[0];
            const verbCls = verbTone[verb] || "text-foreground";
            return (
              <div key={e.id} className="flex items-start gap-3 px-2 py-3 hover:bg-muted/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-snug">
                    <span className="font-semibold">{e.actor}</span>
                    <span className={`font-medium ${verbCls}`}> {e.action}</span>
                    {e.subject && <span className="text-foreground/80"> — {e.subject}</span>}
                  </p>
                  {e.entity_type && (
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">{e.entity_type}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap pt-0.5">{formatDistanceToNow(new Date(e.ts), { addSuffix: true })}</span>
              </div>
            );
          })}
          {limit < items.length && (
            <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => setLimit(l => l + 80)}>Load more</Button>
          )}
        </div>
      )}
    </SectionShell>
  );
};

const InvestorNotificationsDropdown = ({ notifications }: { notifications: NotificationRow[] }) => {
  const recent = [...notifications].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 20);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Notifications">
          <Bell className="h-4 w-4" />
          {recent.length > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          <p className="text-xs text-muted-foreground">Latest staff activity and task updates</p>
        </div>
        <div className="max-h-96 overflow-y-auto scrollbar-thin divide-y divide-border/40">
          {recent.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No recent notifications.</div>
          ) : recent.map((n) => (
            <div key={n.id} className="p-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-2">
                <Activity className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug text-foreground">{n.title || n.event_type.replace(/_/g, " ")}</p>
                  {n.body && <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">{n.body}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const Spending = ({ rows, write }: { rows: SpendingRow[]; write: any }) => {
  const [category, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [spend_date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [cat, setCat] = useState("tools");
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const filtered = useMemo(() => rows.filter(r =>
    (category === "all" || r.category === category) &&
    (!search || (r.vendor || "").toLowerCase().includes(search.toLowerCase()) || (r.notes || "").toLowerCase().includes(search.toLowerCase()))
  ), [rows, category, search]);

  const byCategory = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach(r => { m[r.category] = (m[r.category] || 0) + Number(r.amount_gbp); });
    return Object.entries(m).map(([category, amount]) => ({ category, amount }));
  }, [filtered]);
  const byMonth = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach(r => { const k = r.spend_date.slice(0, 7); m[k] = (m[k] || 0) + Number(r.amount_gbp); });
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b)).map(([month, total]) => ({ month, total }));
  }, [filtered]);
  const total = filtered.reduce((s, r) => s + Number(r.amount_gbp), 0);
  const cats = Array.from(new Set(rows.map(r => r.category)));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Filtered Total" value={gbp(total)} />
        <Stat label="Entries" value={String(filtered.length)} />
        <Stat label="Categories" value={String(byCategory.length)} />
        <Stat label="Avg / Entry" value={gbp(filtered.length ? total / filtered.length : 0)} />
      </div>
      <SectionShell icon={Wallet} title="Spending Tracker" action={
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1" />Add</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Add expense</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date</Label><Input type="date" value={spend_date} onChange={(e) => setDate(e.target.value)} /></div>
                <div><Label>Category</Label>
                  <Select value={cat} onValueChange={setCat}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SPENDING_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Vendor</Label><Input value={vendor} onChange={(e) => setVendor(e.target.value)} /></div>
              <div><Label>Amount (GBP)</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
              <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              <Button className="bg-primary text-primary-foreground" onClick={async () => {
                if (!amount) return;
                await write("insert", "investor_spending", { row: { spend_date, category: cat, vendor, amount_gbp: Number(amount), notes } });
                setVendor(""); setAmount(""); setNotes(""); setAddOpen(false);
              }}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      }>
        <div className="flex flex-wrap gap-2 mb-4">
          <Select value={category} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {cats.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Search vendor or notes..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 min-w-[200px]" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <Card className="bg-card/60 border-border/60 p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-bbh">By category</div>
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={byCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="category" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="bg-card/60 border-border/60 p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-bbh">Monthly trend</div>
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer>
                <LineChart data={byMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
        <div className="rounded border border-border/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground font-bbh">
              <tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Category</th>
                <th className="text-left px-3 py-2">Vendor</th>
                <th className="text-left px-3 py-2">Notes</th>
                <th className="text-right px-3 py-2">Amount</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted-foreground py-6">No matching expenses.</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2 text-muted-foreground">{format(new Date(r.spend_date), "d MMM yyyy")}</td>
                  <td className="px-3 py-2"><Badge variant="outline" className="border-primary/40 text-primary capitalize">{r.category}</Badge></td>
                  <td className="px-3 py-2">{r.vendor || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground max-w-xs truncate">{r.notes || "—"}</td>
                  <td className="px-3 py-2 text-right font-medium">{gbp(Number(r.amount_gbp))}</td>
                  <td className="px-3 py-2"><Button size="icon" variant="ghost" onClick={() => write("delete", "investor_spending", { id: r.id })}><Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionShell>
    </div>
  );
};

// ---------- Commission Forecast linked to invoices ----------
const CommissionForecast = ({ players, invoices, editable, onSaveCommission }: {
  players: PlayerRow[]; invoices: InvoiceRow[]; editable: boolean;
  onSaveCommission: (id: string, val: number | null) => Promise<void>;
}) => {
  const live = players.filter(p => p.representation_status === "represented" || p.representation_status === "mandated");
  const forecast = live.reduce((s, p) => s + Number(p.expected_commission_annual || 0), 0);

  // Invoice totals
  const invoicedTotal = invoices.reduce((s, i) => s + Number(i.amount || 0), 0);
  const paidTotal = invoices.reduce((s, i) => s + Number(i.amount_paid || 0), 0);
  const outstanding = invoicedTotal - paidTotal;
  const last12Cutoff = new Date(); last12Cutoff.setFullYear(last12Cutoff.getFullYear() - 1);
  const last12Paid = invoices.filter(i => new Date(i.invoice_date) >= last12Cutoff).reduce((s, i) => s + Number(i.amount_paid || 0), 0);

  const paidByPlayer: Record<string, number> = {};
  invoices.forEach(i => { paidByPlayer[i.player_id] = (paidByPlayer[i.player_id] || 0) + Number(i.amount_paid || 0); });

  const sorted = [...live].sort((a, b) => Number(b.expected_commission_annual || 0) - Number(a.expected_commission_annual || 0));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Real Revenue (12mo)" value={gbp(last12Paid)} sub={`From ${invoices.length} invoices`} />
        <Stat label="Invoiced (All)" value={gbp(invoicedTotal)} sub={`${gbp(paidTotal)} paid`} />
        <Stat label="Outstanding" value={gbp(outstanding)} sub="Awaiting payment" />
        <Stat label="Forecast / yr" value={gbp(forecast)} sub={`${live.length} live players`} />
      </div>
      <SectionShell icon={TrendingUp} title="Commission Forecast — Editable per player" action={
        editable ? <Badge variant="outline" className="border-primary text-primary text-[10px]">Click figure to edit</Badge> : undefined
      }>
        {sorted.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">No commission data yet.</div>
        ) : (
          <div className="space-y-2">{sorted.map(p => (
            <PlayerCard key={p.id} p={p} editable={editable} paidByPlayer={paidByPlayer[p.id] || 0} onSave={(v) => onSaveCommission(p.id, v)} />
          ))}</div>
        )}
      </SectionShell>
    </div>
  );
};

// ---------- Invoices section ----------
const InvoicesView = ({ rows, players }: { rows: InvoiceRow[]; players: PlayerRow[] }) => {
  const playerMap = new Map(players.map(p => [p.id, p]));
  const sorted = [...rows].sort((a, b) => +new Date(b.invoice_date) - +new Date(a.invoice_date));
  const totalPaid = rows.reduce((s, i) => s + Number(i.amount_paid || 0), 0);
  const totalOwed = rows.reduce((s, i) => s + Number(i.amount || 0), 0) - totalPaid;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat label="Invoices" value={String(rows.length)} />
        <Stat label="Paid (all currencies converted gross)" value={gbp(totalPaid)} />
        <Stat label="Outstanding" value={gbp(totalOwed)} />
      </div>
      <SectionShell icon={FileText} title={`Invoices (${rows.length})`}>
        <div className="rounded border border-border/40 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground font-bbh">
              <tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Number</th>
                <th className="text-left px-3 py-2">Player</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Amount</th>
                <th className="text-right px-3 py-2">Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {sorted.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted-foreground py-6">No invoices.</td></tr>
              ) : sorted.map(i => {
                const player = playerMap.get(i.player_id);
                const outstanding = Number(i.amount) - Number(i.amount_paid || 0);
                const statusTone = i.status === "paid" ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                  : i.status === "overdue" ? "border-red-500/40 text-red-300 bg-red-500/10"
                  : "border-amber-500/40 text-amber-300 bg-amber-500/10";
                return (
                  <tr key={i.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2 text-muted-foreground">{format(new Date(i.invoice_date), "d MMM yyyy")}</td>
                    <td className="px-3 py-2 font-mono text-xs">{i.invoice_number}</td>
                    <td className="px-3 py-2 truncate">{player?.name || "—"}</td>
                    <td className="px-3 py-2"><Badge variant="outline" className={`text-[10px] ${statusTone} capitalize`}>{i.status}</Badge></td>
                    <td className="px-3 py-2 text-right">{ccy(i.amount, i.currency)}</td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-emerald-400">{ccy(i.amount_paid || 0, i.currency)}</span>
                      {outstanding > 0 && <span className="text-[10px] text-muted-foreground block">{ccy(outstanding, i.currency)} due</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionShell>
    </div>
  );
};

// ---------- Prospect Board (staff-style cards with priority colours) ----------
const PRIORITY_COLOR = { high: "hsl(0,70%,50%)", medium: "hsl(43,49%,61%)", low: "hsl(140,50%,50%)", null: "hsl(0,0%,40%)" } as any;
const AGE_GROUP_LABEL = { A: "First Team", B: "U21", C: "U18", D: "U16" } as const;
const STAGE_ORDER = ["scouted", "connected", "rapport_building", "rising", "rise"];
const STAGE_LABEL: Record<string, string> = {
  scouted: "SCOUTED", connected: "CONNECTED", rapport_building: "RAPPORT BUILDING", rising: "RISING", rise: "RISE",
};

const ProspectColumn = ({ stage, items }: { stage: string; items: ProspectRow[] }) => (
  <div className="bg-card/40 border border-border/40 rounded-xl overflow-hidden">
    <div className="px-3 py-2 border-b border-border/40 bg-gradient-to-r from-primary/10 to-transparent">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bbh tracking-widest text-primary">{STAGE_LABEL[stage] || stage.toUpperCase()}</span>
        <span className="text-[10px] text-muted-foreground">{items.length}</span>
      </div>
    </div>
    <div className="p-2 space-y-2 max-h-[70vh] overflow-y-auto">
      {items.map(p => {
        const color = PRIORITY_COLOR[p.priority || "null"];
        const initials = p.name.split(" ").map(n => n[0]).join("").slice(0, 2);
        return (
          <div key={p.id} className="relative rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02] hover:shadow-xl"
               style={{ borderColor: color }}>
            <div className="relative p-3 min-h-[140px] flex flex-col justify-between"
                 style={{ background: "linear-gradient(145deg, hsl(0,0%,14%) 0%, hsl(0,0%,8%) 100%)" }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  {p.position && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>{p.position}</span>
                  )}
                </div>
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} title={p.priority || "no priority"} />
              </div>
              <div className="flex items-center gap-3 my-1">
                <Avatar className="h-14 w-14 border-2 shrink-0 rounded-lg" style={{ borderColor: `${color}66` }}>
                  <AvatarImage src={p.profile_image_url || ""} alt={p.name} className="object-cover object-top" />
                  <AvatarFallback className="text-xs font-bold rounded-lg" style={{ background: `${color}22`, color }}>{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm truncate" style={{ color: "hsl(43,49%,75%)" }}>{p.name}</div>
                  {p.current_club && <div className="text-[10px] text-muted-foreground truncate">{p.current_club}</div>}
                  {p.nationality && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <img src={getCountryFlagUrl(p.nationality)} alt="" className="w-4 h-3 object-cover rounded-sm" loading="lazy" />
                      <span className="text-[10px] text-muted-foreground truncate">{p.nationality}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2">
                  {p.age_group && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-bebas tracking-wider"
                           style={{ color: "hsl(43,49%,61%)", borderColor: "hsl(43,49%,61% / 0.3)" }}>
                      {AGE_GROUP_LABEL[p.age_group]}
                    </Badge>
                  )}
                  {typeof p.age === "number" && p.age > 0 && (
                    <span className="text-[10px] text-muted-foreground">Age {p.age}</span>
                  )}
                </div>
                {p.projected_revenue != null && Number(p.projected_revenue) > 0 && (
                  <span className="text-[10px] font-bbh text-primary">{ccy(Number(p.projected_revenue), p.revenue_currency || "GBP")}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {items.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">No prospects.</div>}
    </div>
  </div>
);

const Prospects = ({ rows }: { rows: ProspectRow[] }) => {
  const byStage = STAGE_ORDER.map(stage => ({ stage, items: rows.filter(r => (r.stage || "scouted") === stage) }));
  return (
    <SectionShell icon={Target} title={`Prospect Board (${rows.length})`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {byStage.map(({ stage, items }) => <ProspectColumn key={stage} stage={stage} items={items} />)}
      </div>
    </SectionShell>
  );
};

// ---------- Full Player Database (scouting + outreach) ----------
const PlayerDatabaseSection = ({ scouting, youth, pro }: { scouting: any[]; youth: any[]; pro: any[] }) => {
  const [q, setQ] = useState("");
  const [src, setSrc] = useState<string>("all");

  const combined: DbPlayer[] = useMemo(() => {
    const map = new Map<string, DbPlayer>();
    scouting.forEach((r: any) => {
      const key = `${(r.player_name || "").trim().toLowerCase()}::${r.date_of_birth || ""}`;
      const existing = map.get(key);
      if (existing) { existing.report_count++; return; }
      map.set(key, {
        id: r.id, player_name: r.player_name, position: r.position, age: r.age,
        current_club: r.current_club, nationality: r.nationality, date_of_birth: r.date_of_birth,
        source: "scouting", profile_image_url: r.profile_image_url, club_logo_url: r.club_logo_url,
        report_count: 1,
      });
    });
    youth.forEach((r: any) => {
      const key = `${(r.player_name || "").trim().toLowerCase()}::${r.date_of_birth || ""}`;
      if (map.has(key)) return;
      map.set(key, {
        id: r.id, player_name: r.player_name, position: r.position, age: r.age,
        current_club: r.current_club, nationality: r.nationality, date_of_birth: r.date_of_birth,
        source: "youth_outreach", profile_image_url: r.profile_image_url || null, club_logo_url: null,
        report_count: 0,
      });
    });
    pro.forEach((r: any) => {
      const key = `${(r.player_name || "").trim().toLowerCase()}::${r.date_of_birth || ""}`;
      if (map.has(key)) return;
      map.set(key, {
        id: r.id, player_name: r.player_name, position: r.position, age: r.age,
        current_club: r.current_club, nationality: r.nationality, date_of_birth: r.date_of_birth,
        source: "pro_outreach", profile_image_url: r.profile_image_url || null, club_logo_url: null,
        report_count: 0,
      });
    });
    return Array.from(map.values());
  }, [scouting, youth, pro]);

  const filtered = combined.filter(p => {
    if (src !== "all" && p.source !== src) return false;
    if (!q) return true;
    const Q = q.toLowerCase();
    return (p.player_name || "").toLowerCase().includes(Q) ||
      (p.current_club || "").toLowerCase().includes(Q) ||
      (p.nationality || "").toLowerCase().includes(Q) ||
      (p.position || "").toLowerCase().includes(Q);
  }).sort((a, b) => (a.player_name || "").localeCompare(b.player_name || ""));

  return (
    <SectionShell icon={Network} title={`Player Database (${filtered.length} of ${combined.length})`} action={
      <div className="flex items-center gap-2">
        <Select value={src} onValueChange={setSrc}>
          <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="scouting">Scouting</SelectItem>
            <SelectItem value="youth_outreach">Youth Outreach</SelectItem>
            <SelectItem value="pro_outreach">Pro Outreach</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} className="h-8 w-48" />
      </div>
    }>
      <div className="rounded border border-border/40 overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground font-bbh">
            <tr>
              <th className="text-left px-3 py-2 w-12"></th>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Nationality</th>
              <th className="text-left px-3 py-2">Position</th>
              <th className="text-left px-3 py-2">Age</th>
              <th className="text-left px-3 py-2">Club</th>
              <th className="text-left px-3 py-2">Source</th>
              <th className="text-right px-3 py-2">Reports</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filtered.slice(0, 500).map(p => (
              <tr key={`${p.source}-${p.id}`} className="hover:bg-muted/20">
                <td className="px-3 py-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={p.profile_image_url || undefined} className="object-cover" />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{(p.player_name || "?")[0]}</AvatarFallback>
                  </Avatar>
                </td>
                <td className="px-3 py-2 font-medium">{p.player_name}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    {p.nationality && <img src={getCountryFlagUrl(p.nationality)} alt="" className="w-4 h-3 rounded-sm" />}
                    <span className="text-xs text-muted-foreground">{p.nationality || "—"}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-xs">{p.position || "—"}</td>
                <td className="px-3 py-2 text-xs">{p.age ?? "—"}</td>
                <td className="px-3 py-2 text-xs truncate max-w-[200px]">{p.current_club || "—"}</td>
                <td className="px-3 py-2">
                  <Badge variant="outline" className="text-[9px] capitalize">{p.source.replace("_", " ")}</Badge>
                </td>
                <td className="px-3 py-2 text-right text-xs">{p.report_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 500 && (
          <div className="text-[10px] text-muted-foreground px-3 py-2 text-center">Showing first 500 of {filtered.length}. Refine search to narrow.</div>
        )}
      </div>
    </SectionShell>
  );
};

const Overview = ({ players, contracts, tasks, staffActivity, taskNotifications, spending, prospects, invoices, profiles, setActive }: {
  players: PlayerRow[]; contracts: ContractRow[]; tasks: TaskRow[]; staffActivity: StaffActivityRow[];
  taskNotifications: NotificationRow[]; spending: SpendingRow[]; prospects: ProspectRow[]; invoices: InvoiceRow[];
  profiles: ProfileRow[]; setActive: (s: SectionId) => void;
}) => {
  const represented = players.filter(p => p.representation_status === "represented").length;
  const mandated = players.filter(p => p.representation_status === "mandated").length;
  const commission = players
    .filter(p => p.representation_status === "represented" || p.representation_status === "mandated")
    .reduce((s, p) => s + Number(p.expected_commission_annual || 0), 0);
  const last12Cutoff = new Date(); last12Cutoff.setFullYear(last12Cutoff.getFullYear() - 1);
  const realRevenue = invoices.filter(i => new Date(i.invoice_date) >= last12Cutoff).reduce((s, i) => s + Number(i.amount_paid || 0), 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlySpend = spending.filter(s => s.spend_date.startsWith(thisMonth)).reduce((s, r) => s + Number(r.amount_gbp), 0);
  const activeTasks = tasks.filter(t => !t.completed).length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => setActive("commission")} className="text-left"><Stat label="Real Revenue (12mo)" value={gbp(realRevenue)} sub={`Forecast: ${gbp(commission)}/yr`} /></button>
        <button onClick={() => setActive("represented")} className="text-left"><Stat label="Represented" value={String(represented)} sub={`${mandated} mandated`} /></button>
        <button onClick={() => setActive("prospects")} className="text-left"><Stat label="Prospects" value={String(prospects.length)} sub="In pipeline" /></button>
        <button onClick={() => setActive("spending")} className="text-left"><Stat label="This Month Spend" value={gbp(monthlySpend)} sub="Running total" /></button>
      </div>
      <ActivityFeed rows={staffActivity.slice(0, 30)} taskNotifications={taskNotifications.slice(0, 50)} profiles={profiles} />
    </div>
  );
};

// ---------- Main ----------
const InvestorsPortal = () => {
  const { user, token, loading: authLoading, signIn, signOut } = useInvestorSession();
  const [active, setActive] = useState<SectionId | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>("dash");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [sectionPickerOpen, setSectionPickerOpen] = useState(false);
  const [openTabs, setOpenTabs] = useState<SectionId[]>(() => {
    try { return JSON.parse(localStorage.getItem("investor_open_tabs") || "[]"); } catch { return []; }
  });
  const isMobile = useIsMobile();
  const [data, setData] = useState<{
    players: PlayerRow[]; contracts: ContractRow[]; tasks: TaskRow[];
    staffActivity: StaffActivityRow[]; prospects: ProspectRow[]; spending: SpendingRow[];
    overviewSections: OverviewSectionData[]; overviewCards: OverviewCardData[];
    invoices: InvoiceRow[]; taskNotifications: NotificationRow[];
    scoutingReports: any[]; outreachYouth: any[]; outreachPro: any[];
    profiles: ProfileRow[];
    isAdmin: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const initialisedSessionRef = useRef(false);

  useEffect(() => { initialisedSessionRef.current = false; setUnlocked(false); }, [user?.id]);

  useEffect(() => {
    document.title = "RISE Investor Portal";
    const meta = document.createElement("meta");
    meta.name = "robots"; meta.content = "noindex,nofollow,noarchive";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  useEffect(() => { if (isMobile) setSidebarCollapsed(true); }, [isMobile]);

  // Default landing: overview, but only once so staff-style category back navigation can leave the active section.
  useEffect(() => {
    if (!token || initialisedSessionRef.current) return;
    initialisedSessionRef.current = true;
    setActive(prev => prev ?? "overview");
    setExpandedCategory(prev => prev ?? "dash");
    setOpenTabs(prev => {
      const next: SectionId[] = prev.includes("overview") ? prev : (["overview", ...prev].slice(0, 12) as SectionId[]);
      localStorage.setItem("investor_open_tabs", JSON.stringify(next));
      return next;
    });
  }, [token]);

  const refresh = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data: d, error } = await supabase.functions.invoke("investor-data", { body: { token } });
      if (error) throw error;
      if ((d as any)?.error) throw new Error((d as any).error);
      const dd = d as any;
      setData({
        players: dd.players || [], contracts: dd.contracts || [], tasks: dd.tasks || [],
        staffActivity: dd.staffActivity || [], prospects: dd.prospects || [], spending: dd.spending || [],
        overviewSections: dd.overviewSections || [],
        overviewCards: (dd.overviewCards || []).map((c: any) => ({
          ...c,
          metrics: Array.isArray(c.metrics) ? c.metrics : [],
          tags: Array.isArray(c.tags) ? c.tags : [],
        })),
        invoices: dd.invoices || [],
        taskNotifications: dd.taskNotifications || [],
        scoutingReports: dd.scoutingReports || [],
        outreachYouth: dd.outreachYouth || [],
        outreachPro: dd.outreachPro || [],
        profiles: dd.profiles || [],
        isAdmin: !!dd.user?.is_admin,
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to load");
    } finally { setLoading(false); }
  };
  useEffect(() => { if (token) refresh(); }, [token]);

  const writeOp = async (op: string, table: string, payload: any) => {
    try {
      const { data: r, error } = await supabase.functions.invoke("investor-write", { body: { token, op, table, ...payload } });
      if (error) throw error;
      if ((r as any)?.error) throw new Error((r as any).error);
      await refresh();
      toast.success("Saved");
    } catch (e: any) { toast.error(e.message || "Save failed"); }
  };

  const saveCommission = async (player_id: string, expected_commission_annual: number | null) => {
    try {
      const { data: r, error } = await supabase.functions.invoke("investor-write", {
        body: { token, action: "updatePlayerCommission", payload: { player_id, expected_commission_annual } },
      });
      if (error) throw error;
      if ((r as any)?.error) throw new Error((r as any).error);
      toast.success("Commission updated");
      await refresh();
    } catch (e: any) { toast.error(e.message || "Save failed"); }
  };

  const handleSignIn = async (u: string, p: string) => { await signIn(u, p); playChime(); };
  const canEdit = unlocked && !!data?.isAdmin;

  const activeCategory = CATEGORIES.find(c => c.sections.some(s => s.id === active));
  const activeSectionDef = activeCategory?.sections.find(s => s.id === active);
  const allSections = CATEGORIES.flatMap(c => c.sections.map(s => ({ ...s, categoryId: c.id })));

  const invoiceTotalsByPlayer = useMemo(() => {
    const m: Record<string, number> = {};
    (data?.invoices || []).forEach(i => { m[i.player_id] = (m[i.player_id] || 0) + Number(i.amount_paid || 0); });
    return m;
  }, [data?.invoices]);

  const handleSectionClick = (sid: SectionId, catId: string) => {
    playChime();
    setActive(sid);
    setExpandedCategory(catId);
    setOpenTabs(prev => {
      const next = prev.includes(sid) ? prev : [...prev, sid].slice(-12);
      localStorage.setItem("investor_open_tabs", JSON.stringify(next));
      return next;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeTab = (sid: SectionId) => {
    setOpenTabs(prev => {
      const next = prev.filter(t => t !== sid);
      localStorage.setItem("investor_open_tabs", JSON.stringify(next));
      if (active === sid) {
        const fallback = next[next.length - 1] || "overview";
        const parent = CATEGORIES.find(c => c.sections.some(s => s.id === fallback));
        setActive(fallback);
        setExpandedCategory(parent?.id || null);
      }
      return next;
    });
  };

  if (authLoading) return <div className="min-h-screen bg-background" />;
  if (!user) return <LoginGate onSignIn={handleSignIn} />;

  return (
    <div className="min-h-screen text-foreground relative">
      {/* Black marble background */}
      <div className="fixed inset-0 pointer-events-none -z-10"
        style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.25 }} />

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border pwa-safe-top transition-all duration-200 ${headerCollapsed ? "h-10" : ""}`}>
        <div className={`flex items-center ${headerCollapsed ? "h-10" : "h-16"} px-4 relative`}>
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer"
            onClick={() => setHeaderCollapsed(prev => !prev)}
            title={headerCollapsed ? "Show header" : "Hide header"}
          >
            <img src="/RISEWhite.png" alt="RISE" className={`${headerCollapsed ? "h-6" : "h-9"} w-auto transition-all duration-200`} />
          </div>

          {!headerCollapsed && (
            <>
              <div className="flex items-center gap-1.5 overflow-hidden min-w-0 mr-4" style={{ maxWidth: "calc(50% - 60px)" }}>
                {(openTabs.length ? openTabs : active ? [active] : []).slice(0, isMobile ? 2 : 3).map((tabId) => {
                  const section = allSections.find(s => s.id === tabId);
                  if (!section) return null;
                  const TabIcon = section.icon;
                  const isActive = active === tabId;
                  return (
                    <button
                      key={tabId}
                      onClick={() => handleSectionClick(tabId, section.categoryId)}
                      className={`group/tab relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all shrink-0 rounded-full border-2 ${
                        isActive
                          ? "border-primary text-primary bg-primary/10"
                          : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/40"
                      }`}
                    >
                      <TabIcon className="w-3.5 h-3.5 shrink-0" />
                      {!isMobile && <span className="truncate max-w-[90px]">{section.title}</span>}
                      {openTabs.length >= 2 && (
                        <span
                          className="ml-0.5 hidden group-hover/tab:inline-flex items-center justify-center h-4 w-4 rounded-full text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={(e) => { e.stopPropagation(); removeTab(tabId); }}
                        >
                          ×
                        </span>
                      )}
                    </button>
                  );
                })}
                <button
                  className="flex items-center justify-center w-7 h-7 rounded-full border border-dashed border-border/50 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/40 shrink-0 transition-colors"
                  onClick={() => setSectionPickerOpen(true)}
                  title="Open new tab"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-auto">
                <Button variant="ghost" size="icon" title="Refresh" onClick={refresh}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                {data && <InvestorNotificationsDropdown notifications={data.taskNotifications} />}
                {data?.isAdmin && (
                  <Button
                    variant={unlocked ? "default" : "outline"}
                    size="sm"
                    className="h-9 shrink-0"
                    onClick={() => setUnlocked(u => !u)}
                    title={unlocked ? "Lock edit mode" : "Unlock edit mode"}
                  >
                    {unlocked ? <Unlock className="h-4 w-4 md:mr-1" /> : <Lock className="h-4 w-4 md:mr-1" />}
                    <span className="hidden md:inline">{unlocked ? "Edit" : "Locked"}</span>
                  </Button>
                )}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full border border-border">
                      <span className="text-xs font-bbh uppercase">{(user.display_name || user.username || "I")[0]}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-48 p-1">
                    <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-muted">
                      <LogOut className="w-4 h-4" />Sign out
                    </button>
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}
        </div>
      </header>

      <Dialog open={sectionPickerOpen} onOpenChange={setSectionPickerOpen}>
        <DialogContent className="overflow-hidden p-0 shadow-lg max-w-5xl w-[92vw] h-[80vh]">
          <SectionGridPicker
            categories={CATEGORIES}
            onSelect={(sectionId, categoryId) => {
              handleSectionClick(sectionId as SectionId, categoryId);
              setSectionPickerOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Layout */}
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar Collapse Toggle Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`fixed ${isMobile ? "top-16" : "top-20"} left-2 z-20 p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border shadow-lg hover:bg-background transition-all duration-300 ${
            sidebarCollapsed ? "opacity-50 hover:opacity-100" : ""
          }`}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        {/* Left Sidebar */}
        <aside className={`fixed ${headerCollapsed ? "top-10" : isMobile ? "top-14" : "top-16"} left-0 bottom-0 border-r border-border bg-muted/30 backdrop-blur-sm flex flex-col items-start py-4 pb-20 gap-2 overflow-y-auto scrollbar-thin z-10 transition-all duration-300 ${
          sidebarCollapsed ? "w-0 border-0 opacity-0 pointer-events-none" : isMobile ? "w-14" : "w-14 md:w-24"
        }`}>
          <button
            onClick={() => setSectionPickerOpen(true)}
            className="group w-full rounded-lg flex flex-col items-center justify-center py-2 md:py-3 px-1 md:px-2 transition-all hover:bg-primary/20"
            title="Search sections"
          >
            <div className="p-1.5 md:p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors border border-primary/20">
              <Search className="w-3 h-3 md:w-4 md:h-4 text-primary" />
            </div>
          </button>

          {CATEGORIES.map((cat, idx) => {
            const CatIcon = cat.icon;
            const isExpanded = expandedCategory === cat.id;
            const hasActive = cat.sections.some(s => s.id === active);
            const isSingleSection = cat.sections.length === 1;
            const shouldShow = !expandedCategory || expandedCategory === cat.id;
            if (!shouldShow) return null;
            return (
              <div key={cat.id} className="w-full">
                <button
                  onClick={() => {
                    if (isSingleSection) {
                      handleSectionClick(cat.sections[0].id, cat.id);
                    } else if (hasActive && isExpanded) {
                      setActive(null);
                      setExpandedCategory(cat.id);
                    } else {
                      setExpandedCategory(isExpanded ? null : cat.id);
                    }
                  }}
                  className={`group relative w-full rounded-lg flex flex-col items-center justify-center py-2 md:py-3 px-1 md:px-2 transition-all hover:bg-primary/20 ${
                    hasActive || isExpanded ? "bg-gradient-to-br from-primary via-primary to-primary shadow-lg" : ""
                  }`}
                >
                  <CatIcon className={`w-5 h-5 md:w-6 md:h-6 mb-0.5 md:mb-1 ${hasActive || isExpanded ? "text-primary-foreground" : ""}`} />
                  <span className={`text-[6px] sm:text-[7px] leading-tight text-center px-0.5 font-medium uppercase tracking-tight ${hasActive || isExpanded ? "text-primary-foreground" : "text-muted-foreground"}`}>
                    {cat.title.split(" ").map((w, i) => <span key={i} className="block">{w}</span>)}
                  </span>
                </button>

                <AnimatePresence>
                  {isExpanded && !isSingleSection && (
                    <motion.div
                      className="w-full space-y-1 mt-2 pb-16"
                      initial="hidden"
                      animate="show"
                      exit="hidden"
                      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
                    >
                      {cat.sections.map(s => {
                        const SIcon = s.icon;
                        const isActive = active === s.id;
                        return (
                          <motion.div key={s.id} variants={{ hidden: { x: -10, opacity: 0 }, show: { x: 0, opacity: 1 } }}>
                            <button
                              onClick={() => handleSectionClick(s.id, cat.id)}
                              className={`group relative w-full rounded-lg flex flex-col items-center justify-center py-1.5 md:py-2 px-1 transition-all ${
                                isActive ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-primary/10"
                              }`}
                            >
                              <SIcon className={`w-4 h-4 md:w-5 md:h-5 mb-0.5 md:mb-1 ${isActive ? "text-primary-foreground" : ""}`} />
                              <span className={`text-[5px] sm:text-[6px] leading-tight text-center px-0.5 font-medium uppercase tracking-tight ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`}>
                                {s.title.split(" ").map((w, i) => <span key={i} className="block">{w}</span>)}
                              </span>
                            </button>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                {idx < CATEGORIES.length - 1 && (
                  <div className="w-full px-2 py-2"><div className="h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" /></div>
                )}
              </div>
            );
          })}
        </aside>

        {/* Main Content Area */}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin relative z-10 transition-all duration-300 ${headerCollapsed ? "pt-14" : "pt-20"} ${
          sidebarCollapsed ? "ml-0" : isMobile ? "ml-14" : "ml-14 md:ml-24"
        } ${isMobile ? "pb-[70px]" : ""}`}>
          <div className="container mx-auto px-3 md:px-6 py-4 md:py-6 font-agrandir">
            {loading && !data ? (
              <div className="text-muted-foreground text-center py-12">Loading...</div>
            ) : !data ? null : active ? (
              <>
                {activeCategory && activeSectionDef && (
                  <StaffBreadcrumb
                    categoryTitle={activeCategory.title}
                    categoryIcon={activeCategory.icon}
                    sectionTitle={activeSectionDef.title}
                    onCategoryClick={() => {
                      setExpandedCategory(activeCategory.id);
                      setActive(null);
                    }}
                  />
                )}
                <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                  {active === "overview" && <Overview players={data.players} contracts={data.contracts} tasks={data.tasks} staffActivity={data.staffActivity} taskNotifications={data.taskNotifications} spending={data.spending} prospects={data.prospects} invoices={data.invoices} profiles={data.profiles} setActive={(section) => {
                    const parent = CATEGORIES.find(c => c.sections.some(s => s.id === section));
                    handleSectionClick(section, parent?.id || "dash");
                  }} />}
                  {active === "investment" && (
                    <SectionShell icon={Sparkles} title="Investment Overview" action={
                      data.isAdmin ? (
                        <span className={`text-[10px] uppercase tracking-widest font-bbh px-2 py-1 rounded border ${unlocked ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground"}`}>
                          {unlocked ? "Edit mode" : "Read-only"}
                        </span>
                      ) : undefined
                    }>
                      <InvestmentOverview sections={data.overviewSections} cards={data.overviewCards} unlocked={canEdit} token={token} onRefresh={refresh} />
                    </SectionShell>
                  )}
                  {active === "represented" && <Roster players={data.players} status="represented" editable={canEdit} onSaveCommission={saveCommission} invoiceTotalsByPlayer={invoiceTotalsByPlayer} />}
                  {active === "mandated" && <Roster players={data.players} status="mandated" editable={canEdit} onSaveCommission={saveCommission} invoiceTotalsByPlayer={invoiceTotalsByPlayer} />}
                  {active === "previously" && <Roster players={data.players} status="previously_mandated" editable={canEdit} onSaveCommission={saveCommission} invoiceTotalsByPlayer={invoiceTotalsByPlayer} />}
                  {active === "prospects" && <Prospects rows={data.prospects} />}
                  {active === "playerdatabase" && <PlayerDatabaseSection scouting={data.scoutingReports} youth={data.outreachYouth} pro={data.outreachPro} />}
                  {active === "contracts" && <ContractsView rows={data.contracts} />}
                  {active === "spending" && <Spending rows={data.spending} write={writeOp} />}
                  {active === "commission" && <CommissionForecast players={data.players} invoices={data.invoices} editable={canEdit} onSaveCommission={saveCommission} />}
                  {active === "invoices" && <InvoicesView rows={data.invoices} players={data.players} />}
                  {active === "tasks" && <TasksView rows={data.tasks} profiles={data.profiles} />}
                  {active === "activity" && <ActivityFeed rows={data.staffActivity} taskNotifications={data.taskNotifications} profiles={data.profiles} />}
                </motion.div>
              </>
            ) : expandedCategory ? (
              (() => {
                const cat = CATEGORIES.find(c => c.id === expandedCategory);
                if (!cat) return null;
                const CatIcon = cat.icon;
                return (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <CatIcon className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold">{cat.title}</h2>
                    </div>
                    <SectionGridPicker
                      categories={[cat]}
                      onSelect={(sectionId, categoryId) => handleSectionClick(sectionId as SectionId, categoryId)}
                    />
                  </>
                );
              })()
            ) : (
              <SectionGridPicker
                categories={CATEGORIES}
                onSelect={(sectionId, categoryId) => handleSectionClick(sectionId as SectionId, categoryId)}
              />
            )}
          </div>
        </main>
      </div>
      {canEdit && (
        <div className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent z-[60] pointer-events-none" />
      )}
    </div>
  );
};

export default InvestorsPortal;
