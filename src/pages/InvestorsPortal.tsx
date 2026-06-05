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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format, formatDistanceToNow, differenceInMonths } from "date-fns";
import {
  LayoutDashboard, Sparkles, UserCheck, FileSignature, CheckSquare, Activity, Wallet,
  Network, TrendingUp, LogOut, Search, Plus, Trash2, Lock, Unlock, Calendar, Target,
  ChevronLeft, ChevronRight, ExternalLink, FileText, Pencil, Check, Bell, RefreshCw,
  Building2, Users, Film, PlayCircle, X, Star, Briefcase, UserCircle, Clock, ListOrdered,
  CalendarRange, Camera, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import { findClubRating, findClubCountry } from "@/lib/clubNameUtils";
import { InvestmentOverview, type OverviewCardData, type OverviewSectionData } from "@/components/investor/InvestmentOverview";
import { CapacityPlanner } from "@/components/investor/CapacityPlanner";
import { ExecutiveSupport } from "@/components/investor/ExecutiveSupport";
import { OpsBoard, type OpsCategory, type OpsItem } from "@/components/investor/OpsBoard";
import { BusinessPlanSection } from "@/components/staff/BusinessPlanSection";
import { InvestorHighlineLog } from "@/components/investor/InvestorHighlineLog";
import { sortPlayersByRepresentation } from "@/lib/playerSorting";
import { StaffBreadcrumb } from "@/components/staff/StaffBreadcrumb";
import { SectionGridPicker } from "@/components/staff/SectionGridPicker";
import ClubNetworkManagement from "@/components/staff/ClubNetworkManagement";
import { PerformanceReportDialog } from "@/components/PerformanceReportDialog";
import blackMarble from "@/assets/black-marble-bg.png";
import smudgedMarble from "@/assets/smudged-marble-overlay.png";

type SectionId =
  | "overview" | "investment"
  | "represented" | "mandated" | "previously"
  | "prospects" | "playerdatabase"
  | "contracts" | "projections"
  | "spending" | "commission" | "invoices" | "forecast" | "salaryCap"
  | "tasks" | "activity"
  | "outreach" | "clubnetwork"
  | "timeManagement" | "priorities" | "capacity"
  | "execNotes" | "execScripts" | "execWorkflow"
  | "businessPlan" | "timeline";

interface TimelineRow {
  id: string;
  kind: "event" | "income" | "expense" | "transfer_window" | "investment" | "deal";
  title: string;
  start_date: string;
  end_date: string | null;
  amount_gbp: number | null;
  notes: string | null;
  goal: string | null;
  created_at?: string;
  updated_at?: string;
}

interface PlayerRow {
  id: string; name: string; representation_status: string | null; position: string | null;
  nationality: string | null; date_of_birth: string | null; image_url: string | null;
  hover_image_url: string | null; club: string | null; club_logo: string | null; league: string | null;
  age: number | null;
  contract_start_date: string | null; contract_end_date: string | null;
  current_salary_annual: number | null; expected_commission_annual: number | null;
  potential_commission_annual: number | null;
  commission_notes: string | null;
  salary_cap_overrides: any | null;
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
interface SpendingRowExt extends SpendingRow { is_personal?: boolean | null; bank_transaction_id?: string | null }
interface ClubContactRow {
  id: string; name: string; club_name: string | null; position: string | null;
  country: string | null; city: string | null; image_url: string | null;
  is_favourite: boolean; contact_strength: number | null; tags: string[] | null;
  last_contacted_at: string | null; updated_at: string;
}
interface PlayerAnalysisRow {
  id: string; player_id: string; fixture_id?: string | null; analysis_writer_id?: string | null;
  analysis_date: string; opponent: string | null;
  result: string | null; r90_score: number | null; minutes_played: number | null;
  pdf_url: string | null; video_url: string | null; visibility_status: string;
  category: string; club_logo_url: string | null; opposition_color?: string | null; updated_at: string;
}
interface MatchAnalysisLink {
  id: string; title: string | null; analysis_type: "pre-match" | "post-match" | string | null;
  match_date: string | null; home_team: string | null; away_team: string | null;
  home_team_bg_color?: string | null; away_team_bg_color?: string | null;
}
interface FixtureFeedItem {
  id: string; sort_date: string; match_date: string | null; title: string; subtitle: string;
  players: { id: string; name: string; image_url: string | null }[];
  reports: PlayerAnalysisRow[]; pre_match: MatchAnalysisLink[]; post_match: MatchAnalysisLink[]; colour: string | null;
}
interface BankConnectionRow { id: string; bank_name: string | null; account_label: string | null; last_synced_at: string | null; status: string; created_at: string }
interface BankTxnRow {
  id: string; connection_id: string; provider_transaction_id: string | null;
  txn_date: string; description: string | null; merchant: string | null;
  category: string | null; amount_gbp: number; status: string; raw?: any;
}
interface InvoiceRow {
  id: string; player_id: string; invoice_number: string; invoice_date: string; due_date: string;
  amount: number; currency: string; status: string; amount_paid: number | null;
  billing_month: string | null; description: string | null;
}
interface ProjectionPlayerRow { player_id?: string | null; custom_name?: string | null; income_gbp: number | null; notes?: string | null; }
interface ProjectionExtraRow { label: string; income_gbp: number | null; notes?: string | null; }
interface ProjectionRow {
  id: string; name: string; scenario: string; notes: string | null;
  player_rows: ProjectionPlayerRow[]; extra_income_rows: ProjectionExtraRow[];
  extra_income_gbp: number; costs_gbp: number;
  display_order: number; created_at: string; updated_at: string;
}
interface ForecastRow {
  id: string;
  kind: "revenue" | "spend" | "extra_income" | "extra_expense";
  month: string; // 'YYYY-MM-DD' first of month
  label: string | null;
  amount_gbp: number;
  notes: string | null;
}
interface ForecastSettingsRow {
  id: string;
  planned_monthly_spend_gbp: number;
}
interface StaffMember { id: string; email: string | null; full_name: string | null; roles: string[]; }
interface BusinessPlanRow {
  id: string;
  executive_summary: string | null; business_description: string | null; markets: string | null;
  swot_strengths: string | null; swot_weaknesses: string | null; swot_opportunities: string | null;
  swot_threats: string | null; management_personnel: string | null; products_services: string | null;
  marketing: string | null; financial_plan: string | null;
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

// Chart-axis money formatter: handles small/large/negative values cleanly.
const gbpAxis = (v: number) => {
  if (v == null || Number.isNaN(v)) return "";
  const n = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (n >= 1_000_000) return `${sign}£${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}m`;
  if (n >= 1_000) return `${sign}£${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return `${sign}£${Math.round(n)}`;
};

const SPENDING_CATEGORIES_DEFAULT = ["tools", "travel", "staff", "misc"];
const SPENDING_CATEGORIES_LS_KEY = "investorsSpendingCategories.v1";
const SPENDING_START_DATE = new Date("2026-06-01T00:00:00Z");
const loadCustomCategories = (): string[] => {
  try {
    const raw = localStorage.getItem(SPENDING_CATEGORIES_LS_KEY);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter(x => typeof x === "string") : [];
  } catch { return []; }
};
const saveCustomCategories = (list: string[]) => {
  try { localStorage.setItem(SPENDING_CATEGORIES_LS_KEY, JSON.stringify(list)); } catch {}
};
// Back-compat constant used elsewhere
const SPENDING_CATEGORIES = SPENDING_CATEGORIES_DEFAULT;

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
    { id: "businessPlan", title: "Business Plan", icon: Briefcase },
    { id: "timeline", title: "Timeline", icon: CalendarRange },
  ]},
  { id: "act", title: "Activity", icon: Activity, sections: [
    { id: "tasks", title: "All Tasks", icon: CheckSquare },
    { id: "activity", title: "Activity Feed", icon: Activity },
  ]},
  { id: "ops", title: "Operations", icon: Clock, sections: [
    { id: "timeManagement", title: "Time Management", icon: Clock },
    { id: "priorities", title: "Priorities", icon: ListOrdered },
    { id: "capacity", title: "Capacity", icon: Activity },
  ]},
  { id: "exec", title: "Executive Support", icon: Sparkles, sections: [
    { id: "execNotes", title: "Thought Wall", icon: Sparkles },
    { id: "execScripts", title: "Scripts", icon: FileText },
    { id: "execWorkflow", title: "Workflow", icon: Network },
  ]},
  { id: "roster", title: "Roster", icon: UserCheck, sections: [
    { id: "represented", title: "Represented", icon: UserCheck },
    { id: "mandated", title: "Mandated", icon: UserCheck },
    { id: "previously", title: "Prev. Mandated", icon: UserCheck },
  ]},
  { id: "pipe", title: "Pipeline", icon: Network, sections: [
    { id: "prospects", title: "Prospect Board", icon: Target },
    { id: "playerdatabase", title: "Player Database", icon: Network },
    { id: "outreach", title: "Player Outreach", icon: Users },
  ]},
  { id: "fin", title: "Financial", icon: Wallet, sections: [
    { id: "spending", title: "Spending", icon: Wallet },
    { id: "commission", title: "Commission", icon: TrendingUp },
    { id: "invoices", title: "Invoices", icon: FileText },
    { id: "forecast", title: "Forecast", icon: TrendingUp },
    { id: "projections", title: "Projections", icon: Target },
    { id: "salaryCap", title: "Commission Cap", icon: Target },
  ]},
  { id: "net", title: "Network", icon: Building2, sections: [
    { id: "clubnetwork", title: "Club Network", icon: Building2 },
  ]},
  { id: "legal", title: "Legal", icon: FileSignature, sections: [
    { id: "contracts", title: "Contracts", icon: FileSignature },
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
const InlineMoneyCell = ({ value, editable, onSave }: { value: number | null; editable: boolean; onSave: (v: number | null) => Promise<void> | void }) => {
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(value?.toString() ?? "");
  useEffect(() => { setVal(value?.toString() ?? ""); }, [value]);
  const commit = async () => {
    const trimmed = val.trim();
    const n = trimmed === "" ? null : Number(trimmed);
    if (n != null && Number.isNaN(n)) { toast.error("Invalid number"); return; }
    if (n !== (value ?? null)) await onSave(n);
    setEdit(false);
  };
  if (edit && editable) {
    return (
      <Input type="number" value={val} autoFocus onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") { setEdit(false); setVal(value?.toString() ?? ""); } }}
        onBlur={commit} className="h-7 w-24 text-right text-xs ml-auto" placeholder="0" />
    );
  }
  return (
    <button type="button" onClick={() => editable && setEdit(true)}
      className={`tabular-nums ${editable ? "hover:bg-primary/10 px-1 rounded transition-colors" : "cursor-default"} ${value == null ? "text-muted-foreground" : ""}`}
      title={editable ? "Click to edit" : undefined}>
      {value == null ? "—" : gbp(value)}
    </button>
  );
};

const EditableTextField = ({ value, editable, onSave, multiline = false, placeholder }: {
  value: string | null | undefined; editable: boolean; onSave: (v: string) => Promise<void> | void;
  multiline?: boolean; placeholder?: string;
}) => {
  const [val, setVal] = useState(value || "");
  useEffect(() => { setVal(value || ""); }, [value]);
  const commit = async () => {
    if (val !== (value || "")) await onSave(val);
  };
  if (multiline) {
    return <Textarea value={val} disabled={!editable} placeholder={placeholder} onChange={e => setVal(e.target.value)} onBlur={commit} />;
  }
  return <Input value={val} disabled={!editable} placeholder={placeholder} onChange={e => setVal(e.target.value)} onBlur={commit} />;
};

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
            <h3 className="font-semibold text-base truncate text-foreground">{p.name}</h3>
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
  <div className="relative overflow-hidden rounded-t-lg border-b border-primary/30">
    <div className="absolute inset-0 pointer-events-none"
      style={{ backgroundImage: `url(${smudgedMarble})`, backgroundSize: "cover", backgroundPosition: "center" }} />
    <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/30 via-transparent to-black/50" />
    <div className="relative px-3 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <Icon className="w-4 h-4 text-primary drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] shrink-0" />
        <h2 className="text-sm font-semibold tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] break-words">{title}</h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  </div>
);

const SectionShell = ({ icon, title, children, action }: { icon: any; title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <Card className="bg-card/80 border-border/60 overflow-hidden backdrop-blur-sm">
    <MarbleHeader icon={icon} title={title} action={action} />
    <div className="p-3 sm:p-5">{children}</div>
  </Card>
);

// ---------- Sections ----------
const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <Card className="bg-card/60 border-border/60 p-5">
    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">{label}</div>
    <div className="text-2xl font-semibold tracking-tight text-foreground">{value}</div>
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
  return (
    <SectionShell icon={FileSignature} title={`Contracts (${rows.length})`}>
      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">No contracts yet.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map(c => {
            const signed = !!c.owner_signed_at || !!c.locked_at;
            const url = c.resolved_file_url || null;
            return (
              <Card key={c.id} className="bg-card/60 border-border/60 hover:border-primary/40 transition-colors p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-primary/10 text-primary shrink-0">
                    <FileSignature className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground truncate">{c.title || "Untitled contract"}</div>
                    {c.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] ${signed ? "border-primary/60 text-primary" : "border-border text-muted-foreground"}`}>
                        {c.locked_at ? <><Lock className="w-2.5 h-2.5 mr-0.5" />Locked</> : signed ? "Signed" : (c.status || "Draft")}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">Updated {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      {url ? (
                        <>
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="h-8">
                              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />Open
                            </Button>
                          </a>
                          <a href={url} download>
                            <Button size="sm" variant="ghost" className="h-8">
                              <FileText className="w-3.5 h-3.5 mr-1.5" />Download
                            </Button>
                          </a>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">No file attached yet.</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
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
    <SectionShell icon={CheckSquare} title="All Tasks — Live View">
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

const Spending = ({ rows, write, token, onRefresh }: { rows: SpendingRowExt[]; write: any; token: string | null; onRefresh: () => Promise<void> }) => {
  const [category, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [spend_date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [cat, setCat] = useState("tools");
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [scope, setScope] = useState<"business" | "personal">("business");
  const [isPersonalNew, setIsPersonalNew] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [bankBusy, setBankBusy] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsedItems, setParsedItems] = useState<Array<{ spend_date: string; category: string; vendor: string; amount: string; notes: string }>>([]);
  const [savingAll, setSavingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Custom categories (persisted to localStorage, merged with defaults + categories already used in DB rows)
  const [customCats, setCustomCats] = useState<string[]>(() => loadCustomCategories());
  const [manageCatsOpen, setManageCatsOpen] = useState(false);
  const [newCatInput, setNewCatInput] = useState("");
  const [renamingCat, setRenamingCat] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Edit-row dialog state
  const [editingRow, setEditingRow] = useState<SpendingRowExt | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editCat, setEditCat] = useState("");
  const [editVendor, setEditVendor] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPersonal, setEditPersonal] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // Categories shown in selects: defaults + custom + any category already present in DB rows.
  const categories = useMemo(() => {
    const present = rows.map(r => (r.category || "").toLowerCase()).filter(Boolean);
    const merged = Array.from(new Set([
      ...SPENDING_CATEGORIES_DEFAULT,
      ...customCats.map(c => c.toLowerCase()),
      ...present,
    ]));
    return merged.sort();
  }, [customCats, rows]);

  const openEdit = (r: SpendingRowExt) => {
    setEditingRow(r);
    setEditDate(r.spend_date.slice(0, 10));
    setEditCat(r.category);
    setEditVendor(r.vendor || "");
    setEditAmount(String(r.amount_gbp ?? ""));
    setEditNotes(r.notes || "");
    setEditPersonal(!!r.is_personal);
  };
  const saveEdit = async () => {
    if (!editingRow) return;
    if (!editAmount || isNaN(Number(editAmount))) { toast.error("Enter a valid amount"); return; }
    setEditSaving(true);
    try {
      await write("update", "investor_spending", {
        id: editingRow.id,
        patch: {
          spend_date: editDate,
          category: editCat,
          vendor: editVendor,
          amount_gbp: Number(editAmount),
          notes: editNotes,
          is_personal: editPersonal,
        },
      });
      toast.success("Expense updated");
      setEditingRow(null);
      await onRefresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update");
    } finally {
      setEditSaving(false);
    }
  };

  const addCustomCategory = () => {
    const v = newCatInput.trim().toLowerCase();
    if (!v) return;
    if (categories.includes(v)) { toast.info("Category already exists"); setNewCatInput(""); return; }
    const next = Array.from(new Set([...customCats, v]));
    setCustomCats(next); saveCustomCategories(next); setNewCatInput("");
  };
  const removeCustomCategory = (c: string) => {
    if (SPENDING_CATEGORIES_DEFAULT.includes(c)) { toast.error("Default categories cannot be removed"); return; }
    const next = customCats.filter(x => x !== c);
    setCustomCats(next); saveCustomCategories(next);
  };
  const commitRename = async (oldName: string) => {
    const v = renameValue.trim().toLowerCase();
    if (!v || v === oldName) { setRenamingCat(null); return; }
    if (categories.includes(v)) { toast.error("That category already exists"); return; }
    try {
      // Re-tag every row currently using oldName for this scope
      const affected = rows.filter(r => r.category === oldName);
      for (const r of affected) {
        await write("update", "investor_spending", { id: r.id, patch: { category: v } });
      }
      const nextCustom = customCats.includes(oldName)
        ? Array.from(new Set([...customCats.filter(x => x !== oldName), v]))
        : Array.from(new Set([...customCats, v]));
      setCustomCats(nextCustom); saveCustomCategories(nextCustom);
      setRenamingCat(null); setRenameValue("");
      toast.success(`Renamed to ${v} (${affected.length} entries updated)`);
      await onRefresh();
    } catch (e: any) {
      toast.error(e?.message || "Rename failed");
    }
  };

  const handleReceiptUpload = async (file: File) => {
    if (!file) return;
    setParsing(true);
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("parse-receipt-image", {
        body: { imageBase64: dataUrl },
      });
      if (error) throw error;
      const parsed: any = (data as any)?.parsed || {};
      const raw: any[] = Array.isArray(parsed?.items)
        ? parsed.items
        : (parsed && (parsed.amount || parsed.item || parsed.vendor)) ? [parsed] : [];
      if (raw.length === 0) {
        toast.error("Could not read any items from that image");
        return;
      }
      const allowed = categories;
      const mapped = raw.map((it: any) => {
        const c = String(it?.category || "").toLowerCase();
        return {
          spend_date: it?.date && /^\d{4}-\d{2}-\d{2}$/.test(it.date) ? it.date : new Date().toISOString().slice(0, 10),
          category: allowed.includes(c) ? c : "misc",
          vendor: String(it?.vendor || it?.location || "").slice(0, 120),
          amount: it?.amount != null ? String(it.amount) : "",
          notes: [it?.item, it?.location, it?.time ? `at ${it.time}` : null].filter(Boolean).join(" — "),
        };
      });
      setParsedItems(mapped);
      toast.success(`Found ${mapped.length} item${mapped.length === 1 ? "" : "s"}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to parse image");
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const saveParsedItems = async () => {
    const valid = parsedItems.filter(p => p.amount && !isNaN(Number(p.amount)));
    if (valid.length === 0) { toast.error("Add an amount to at least one row"); return; }
    setSavingAll(true);
    try {
      for (const p of valid) {
        await write("insert", "investor_spending", { row: {
          spend_date: p.spend_date,
          category: p.category,
          vendor: p.vendor,
          amount_gbp: Number(p.amount),
          notes: p.notes,
          is_personal: isPersonalNew,
        }});
      }
      toast.success(`Saved ${valid.length} expense${valid.length === 1 ? "" : "s"}`);
      setParsedItems([]);
      setAddOpen(false);
      await onRefresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSavingAll(false);
    }
  };

  const scoped = useMemo(
    () => rows.filter(r => (scope === "personal" ? !!r.is_personal : !r.is_personal)),
    [rows, scope]
  );

  const filtered = useMemo(() => scoped.filter(r =>
    (category === "all" || r.category === category) &&
    (!search || (r.vendor || "").toLowerCase().includes(search.toLowerCase()) || (r.notes || "").toLowerCase().includes(search.toLowerCase()))
  ), [scoped, category, search]);

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
  const cats = Array.from(new Set(scoped.map(r => r.category)));
  const businessTotal = rows.filter(r => !r.is_personal).reduce((s, r) => s + Number(r.amount_gbp), 0);
  const personalTotal = rows.filter(r => !!r.is_personal).reduce((s, r) => s + Number(r.amount_gbp), 0);

  const callBank = async (action: string, body?: any) => {
    setBankBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("truelayer-bank", {
        body: { action, token, ...(body || {}) },
      });
      if (error) throw error;
      return data;
    } finally { setBankBusy(false); }
  };

  const linkBank = async () => {
    try {
      const res = await callBank("link");
      if (res?.url) window.location.href = res.url;
      else toast.error("Could not start bank connection");
    } catch (e: any) { toast.error(e.message || "TrueLayer link failed"); }
  };
  const syncBank = async () => {
    try {
      await callBank("sync");
      toast.success("Bank synced");
      await onRefresh();
    } catch (e: any) { toast.error(e.message || "Sync failed"); }
  };

  return (
    <div className="space-y-4">
      <Tabs value={scope} onValueChange={(v) => setScope(v as any)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="business">Business ({gbp(businessTotal)})</TabsTrigger>
            <TabsTrigger value="personal">Personal ({gbp(personalTotal)})</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setConnectOpen(true)}>
              <Building2 className="w-3.5 h-3.5 mr-1" />Bank accounts
            </Button>
            <Button variant="outline" size="sm" onClick={() => setManageCatsOpen(true)}>
              <Pencil className="w-3.5 h-3.5 mr-1" />Categories
            </Button>
          </div>
        </div>
      </Tabs>

      {(() => {
        // Daily average uses ALL-TIME total for the current scope, from 1 June 2026 to today (inclusive).
        const scopeAllTimeTotal = (scope === "personal" ? personalTotal : businessTotal);
        const today = new Date();
        const msPerDay = 1000 * 60 * 60 * 24;
        const daysElapsed = Math.max(1, Math.floor((today.getTime() - SPENDING_START_DATE.getTime()) / msPerDay) + 1);
        const dailyAvg = scopeAllTimeTotal / daysElapsed;
        return (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat label={`Filtered Total (${scope})`} value={gbp(total)} />
            <Stat label="Entries" value={String(filtered.length)} />
            <Stat label="Categories" value={String(byCategory.length)} />
            <Stat label="Avg / Entry" value={gbp(filtered.length ? total / filtered.length : 0)} />
            <Stat label="Avg / Day (since 1 Jun 2026)" value={gbp(dailyAvg)} sub={`${daysElapsed} day${daysElapsed === 1 ? "" : "s"}`} />
          </div>
        );
      })()}
      <SectionShell icon={Wallet} title={`Spending Tracker — ${scope === "personal" ? "Personal" : "Business"}`} action={
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1" />Add</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add expense</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReceiptUpload(f); }}
              />
              <div className="rounded-md border border-dashed border-border/60 p-3 flex flex-wrap items-center gap-2 bg-muted/20">
                <Button type="button" size="sm" variant="outline" disabled={parsing} onClick={() => fileInputRef.current?.click()}>
                  {parsing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Camera className="w-4 h-4 mr-1" />}
                  {parsing ? "Reading…" : "Upload receipt / screenshot"}
                </Button>
                <span className="text-xs text-muted-foreground">One image can contain multiple items — we'll detect each and let you review before saving.</span>
              </div>

              {parsedItems.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-bbh">Detected items ({parsedItems.length})</div>
                  <div className="space-y-2">
                    {parsedItems.map((p, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-end rounded border border-border/40 p-2 bg-card/40">
                        <div className="col-span-12 sm:col-span-3"><Label className="text-xs">Date</Label>
                          <Input type="date" value={p.spend_date} onChange={e => setParsedItems(items => items.map((it, i) => i === idx ? { ...it, spend_date: e.target.value } : it))} />
                        </div>
                        <div className="col-span-6 sm:col-span-2"><Label className="text-xs">Category</Label>
                          <Select value={p.category} onValueChange={(v) => setParsedItems(items => items.map((it, i) => i === idx ? { ...it, category: v } : it))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-6 sm:col-span-3"><Label className="text-xs">Vendor</Label>
                          <Input value={p.vendor} onChange={e => setParsedItems(items => items.map((it, i) => i === idx ? { ...it, vendor: e.target.value } : it))} />
                        </div>
                        <div className="col-span-8 sm:col-span-2"><Label className="text-xs">Amount £</Label>
                          <Input type="number" step="0.01" value={p.amount} onChange={e => setParsedItems(items => items.map((it, i) => i === idx ? { ...it, amount: e.target.value } : it))} />
                        </div>
                        <div className="col-span-4 sm:col-span-1 flex items-end justify-end">
                          <Button size="icon" variant="ghost" onClick={() => setParsedItems(items => items.filter((_, i) => i !== idx))}>
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                        <div className="col-span-12"><Label className="text-xs">Notes</Label>
                          <Input value={p.notes} onChange={e => setParsedItems(items => items.map((it, i) => i === idx ? { ...it, notes: e.target.value } : it))} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input type="checkbox" checked={isPersonalNew} onChange={e => setIsPersonalNew(e.target.checked)} />
                    Mark all as personal spending
                  </label>
                  <div className="flex gap-2">
                    <Button className="bg-primary text-primary-foreground" disabled={savingAll} onClick={saveParsedItems}>
                      {savingAll ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                      Save {parsedItems.length} item{parsedItems.length === 1 ? "" : "s"}
                    </Button>
                    <Button variant="outline" onClick={() => setParsedItems([])}>Discard</Button>
                  </div>
                </div>
              ) : (
              <>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date</Label><Input type="date" value={spend_date} onChange={(e) => setDate(e.target.value)} /></div>
                <div><Label>Category</Label>
                  <Select value={cat} onValueChange={setCat}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Vendor</Label><Input value={vendor} onChange={(e) => setVendor(e.target.value)} /></div>
              <div><Label>Amount (GBP)</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
              <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={isPersonalNew} onChange={e => setIsPersonalNew(e.target.checked)} />
                Mark as personal spending
              </label>
              <Button className="bg-primary text-primary-foreground" onClick={async () => {
                if (!amount) return;
                await write("insert", "investor_spending", { row: { spend_date, category: cat, vendor, amount_gbp: Number(amount), notes, is_personal: isPersonalNew } });
                setVendor(""); setAmount(""); setNotes(""); setIsPersonalNew(false); setAddOpen(false);
              }}>Save</Button>
              </>
              )}
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
                  <td className="px-3 py-2 flex items-center justify-end gap-1">
                    <Button size="icon" variant="ghost" title={r.is_personal ? "Move to Business" : "Move to Personal"}
                      onClick={async () => { await write("update", "investor_spending", { id: r.id, patch: { is_personal: !r.is_personal } }); await onRefresh(); }}>
                      {r.is_personal ? <Briefcase className="w-4 h-4 text-muted-foreground" /> : <UserCircle className="w-4 h-4 text-muted-foreground" />}
                    </Button>
                    <Button size="icon" variant="ghost" title="Edit" onClick={() => openEdit(r)}>
                      <Pencil className="w-4 h-4 text-muted-foreground hover:text-primary" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => write("delete", "investor_spending", { id: r.id })}><Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionShell>

      <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Connect bank accounts</DialogTitle>
            <DialogDescription>
              Link UK high-street banks (Barclays, NatWest, HSBC etc.) via Open Banking. Transactions sync into the
              spending tracker for you to approve or reject.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex flex-wrap gap-2">
              <Button onClick={linkBank} disabled={bankBusy} className="bg-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-1" />Connect a bank account
              </Button>
              <Button variant="outline" onClick={syncBank} disabled={bankBusy}>
                <RefreshCw className="w-4 h-4 mr-1" />Sync transactions
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Once linked, new transactions appear here for review. Approving a transaction moves it into Spending under
              the selected scope.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit expense dialog */}
      <Dialog open={!!editingRow} onOpenChange={(o) => { if (!o) setEditingRow(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit expense</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} /></div>
              <div><Label>Category</Label>
                <Select value={editCat} onValueChange={setEditCat}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Vendor</Label><Input value={editVendor} onChange={(e) => setEditVendor(e.target.value)} /></div>
            <div><Label>Amount (GBP)</Label><Input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} /></div>
            <div><Label>Notes</Label><Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} /></div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={editPersonal} onChange={e => setEditPersonal(e.target.checked)} />
              Personal spending
            </label>
            <div className="flex gap-2">
              <Button className="bg-primary text-primary-foreground" disabled={editSaving} onClick={saveEdit}>
                {editSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                Save changes
              </Button>
              <Button variant="outline" onClick={() => setEditingRow(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage categories dialog */}
      <Dialog open={manageCatsOpen} onOpenChange={setManageCatsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage categories</DialogTitle>
            <DialogDescription>
              Add new categories or rename existing ones. Renaming re-tags every existing entry in that category.
              The four default categories (tools, travel, staff, misc) cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="New category name (lowercase)"
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addCustomCategory(); }}
              />
              <Button onClick={addCustomCategory} className="bg-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-1" />Add
              </Button>
            </div>
            <div className="rounded border border-border/40 divide-y divide-border/40 max-h-[50vh] overflow-y-auto">
              {categories.map(c => {
                const isDefault = SPENDING_CATEGORIES_DEFAULT.includes(c);
                const count = rows.filter(r => r.category === c).length;
                return (
                  <div key={c} className="flex items-center gap-2 px-3 py-2">
                    {renamingCat === c ? (
                      <>
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") commitRename(c); if (e.key === "Escape") setRenamingCat(null); }}
                          autoFocus
                          className="h-8"
                        />
                        <Button size="sm" onClick={() => commitRename(c)}><Check className="w-4 h-4" /></Button>
                        <Button size="sm" variant="outline" onClick={() => setRenamingCat(null)}><X className="w-4 h-4" /></Button>
                      </>
                    ) : (
                      <>
                        <Badge variant="outline" className="border-primary/40 text-primary capitalize">{c}</Badge>
                        {isDefault && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">default</span>}
                        <span className="text-xs text-muted-foreground ml-auto">{count} entr{count === 1 ? "y" : "ies"}</span>
                        <Button size="icon" variant="ghost" title="Rename" onClick={() => { setRenamingCat(c); setRenameValue(c); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title={isDefault ? "Default categories can't be removed" : "Remove from list"}
                          disabled={isDefault}
                          onClick={() => removeCustomCategory(c)}
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Removing a custom category from this list does not delete or re-tag any entries already saved under it.
              The category will still appear in the list automatically until those entries are re-categorised or deleted.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ---------- Commission Forecast linked to invoices ----------
const CommissionForecast = ({ players, invoices, editable, onSaveCommission }: {
  players: PlayerRow[]; invoices: InvoiceRow[]; editable: boolean;
  onSaveCommission: (id: string, val: number | null) => Promise<void>;
}) => {
  const live = players.filter(p =>
    p.representation_status === "represented" ||
    p.representation_status === "fuel_for_football" ||
    p.representation_status === "mandated" ||
    p.representation_status === "previously_mandated",
  );
  const forecast = live.reduce((s, p) => s + Number(p.expected_commission_annual || 0), 0);
  const potential = live.reduce((s, p) => s + Number(p.potential_commission_annual || 0), 0);

  // Invoice totals
  const invoicedTotal = invoices.reduce((s, i) => s + Number(i.amount || 0), 0);
  const paidTotal = invoices.reduce((s, i) => s + Number(i.amount_paid || 0), 0);
  const outstanding = invoicedTotal - paidTotal;
  const last12Cutoff = new Date(); last12Cutoff.setFullYear(last12Cutoff.getFullYear() - 1);
  const last12Paid = invoices.filter(i => new Date(i.invoice_date) >= last12Cutoff).reduce((s, i) => s + Number(i.amount_paid || 0), 0);

  const paidByPlayer: Record<string, number> = {};
  invoices.forEach(i => { paidByPlayer[i.player_id] = (paidByPlayer[i.player_id] || 0) + Number(i.amount_paid || 0); });

  const sorted = sortPlayersByRepresentation(live);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Real Revenue (12mo)" value={gbp(last12Paid)} sub={`From ${invoices.length} invoices`} />
        <Stat label="Invoiced (All)" value={gbp(invoicedTotal)} sub={`${gbp(paidTotal)} paid`} />
        <Stat label="Forecast / yr" value={gbp(forecast)} sub={`${live.length} live players · guaranteed-style`} />
        <Stat label="Potential / yr" value={gbp(potential)} sub="Mandate upside (not guaranteed)" />
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

// ---------- Forecast: Expected (projection-based, editable) + Real (actual 12mo) ----------

// 19 months: 1 June 2026 → 31 December 2027
const FORECAST_MONTHS: { key: string; label: string }[] = (() => {
  const out: { key: string; label: string }[] = [];
  for (let i = 0; i < 19; i++) {
    const d = new Date(2026, 5 + i, 1); // June = month index 5
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    out.push({ key, label: format(d, "MMM yy") });
  }
  return out;
})();

const InlineMonthAmountCell = ({ value, editable, onSave }: { value: number; editable: boolean; onSave: (v: number) => void | Promise<void> }) => {
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(String(value || 0));
  useEffect(() => { setVal(String(value || 0)); }, [value]);
  const commit = async () => {
    const next = Number(val);
    if (!Number.isNaN(next) && next !== Number(value || 0)) await onSave(next);
    setEdit(false);
  };
  if (edit && editable) {
    return (
      <Input type="number" value={val} autoFocus onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } if (e.key === "Escape") { setEdit(false); setVal(String(value || 0)); } }}
        onFocus={e => e.currentTarget.select()}
        onBlur={commit} className="h-7 w-[110px] text-[11px] text-right tabular-nums" />
    );
  }
  return (
    <button type="button" onClick={() => editable && setEdit(true)}
      className={`text-[11px] tabular-nums ${editable ? "hover:bg-primary/10 px-1 rounded transition-colors" : "cursor-default"}`}>
      {gbp(Number(value || 0))}
    </button>
  );
};

const Forecast = ({ spending, invoices, projections, forecast, forecastSettings, editable, write }: {
  spending: SpendingRowExt[]; invoices: InvoiceRow[];
  projections: ProjectionRow[]; forecast: ForecastRow[]; forecastSettings: ForecastSettingsRow | null;
  editable: boolean;
  write: (op: string, table: string, payload: any) => Promise<void>;
}) => {
  const [tab, setTab] = useState("expected");

  // ----- Expected source: prefer "expected" scenario projection, fall back to first -----
  const expectedProjection = useMemo(() => {
    return projections.find(p => p.scenario === "expected") || projections[0] || null;
  }, [projections]);

  const projectionRevenue = useMemo(() => {
    if (!expectedProjection) return 0;
    const pr = (expectedProjection.player_rows || []).reduce((s, r) => s + Number(r.income_gbp || 0), 0);
    const ex = (expectedProjection.extra_income_rows || []).reduce((s, r) => s + Number(r.income_gbp || 0), 0);
    return pr + ex + Number(expectedProjection.extra_income_gbp || 0);
  }, [expectedProjection]);

  const plannedMonthlySpend = Number(forecastSettings?.planned_monthly_spend_gbp || 0);
  const evenMonthlyRevenue = projectionRevenue / FORECAST_MONTHS.length;

  // Index forecast rows by kind + month
  const overrideMap = useMemo(() => {
    const map = new Map<string, ForecastRow>();
    forecast.forEach(f => {
      if (f.kind === "revenue" || f.kind === "spend") {
        map.set(`${f.kind}::${f.month.slice(0, 10)}`, f);
      }
    });
    return map;
  }, [forecast]);

  const extraIncomes = forecast.filter(f => f.kind === "extra_income");
  const extraExpenses = forecast.filter(f => f.kind === "extra_expense");

  const getMonthAmount = (kind: "revenue" | "spend", monthKey: string): number => {
    const ov = overrideMap.get(`${kind}::${monthKey}`);
    if (ov) return Number(ov.amount_gbp || 0);
    return kind === "revenue" ? evenMonthlyRevenue : plannedMonthlySpend;
  };

  const upsertMonth = async (kind: "revenue" | "spend", monthKey: string, amount: number) => {
    const ov = overrideMap.get(`${kind}::${monthKey}`);
    if (ov) {
      await write("update", "investor_forecast", { id: ov.id, patch: { amount_gbp: amount } });
    } else {
      await write("insert", "investor_forecast", { row: { kind, month: monthKey, amount_gbp: amount } });
    }
  };

  const addExtraLine = async (kind: "extra_income" | "extra_expense") => {
    await write("insert", "investor_forecast", {
      row: { kind, month: FORECAST_MONTHS[0].key, label: kind === "extra_income" ? "Extra income" : "Extra expense", amount_gbp: 0 },
    });
  };

  // Compute totals + cumulative net for chart
  const monthlySeries = useMemo(() => {
    return FORECAST_MONTHS.map(m => {
      const rev = getMonthAmount("revenue", m.key)
        + extraIncomes.filter(e => e.month.slice(0, 10) === m.key).reduce((s, e) => s + Number(e.amount_gbp || 0), 0);
      const spend = getMonthAmount("spend", m.key)
        + extraExpenses.filter(e => e.month.slice(0, 10) === m.key).reduce((s, e) => s + Number(e.amount_gbp || 0), 0);
      return { key: m.key, label: m.label, revenue: rev, spend, net: rev - spend };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrideMap, extraIncomes, extraExpenses, evenMonthlyRevenue, plannedMonthlySpend]);

  const cumulative = useMemo(() => {
    let c = 0;
    return monthlySeries.map(m => { c += m.net; return { label: m.label, cumulative: Math.round(c) }; });
  }, [monthlySeries]);

  const totalRev = monthlySeries.reduce((s, m) => s + m.revenue, 0);
  const totalSpend = monthlySeries.reduce((s, m) => s + m.spend, 0);

  // ----- Real (existing actual behaviour) -----
  const realMonths = useMemo(() => {
    const out: any[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      out.push({ key, label: format(d, "MMM yy"), spend: 0, revenue: 0, net: 0 });
    }
    const idx = new Map(out.map((m, i) => [m.key, i]));
    spending.forEach(s => { const k = s.spend_date.slice(0, 7); const i = idx.get(k); if (i != null) out[i].spend += Number(s.amount_gbp || 0); });
    invoices.forEach(inv => { const k = (inv.invoice_date || "").slice(0, 7); const i = idx.get(k); if (i != null) out[i].revenue += Number(inv.amount_paid || 0); });
    out.forEach(m => { m.net = m.revenue - m.spend; });
    return out;
  }, [spending, invoices]);
  const realSpend12 = realMonths.reduce((s, m) => s + m.spend, 0);
  const realRev12 = realMonths.reduce((s, m) => s + m.revenue, 0);

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="expected">Expected</TabsTrigger>
          <TabsTrigger value="real">Real</TabsTrigger>
        </TabsList>

        <TabsContent value="expected" className="mt-4 space-y-4">
          <div className="text-xs text-muted-foreground border border-border/40 rounded-md px-3 py-2 bg-muted/20">
            Forecast window: <span className="text-foreground font-medium">1 June 2026 → 31 December 2027</span> (19 months).
            Revenue baseline comes from the {expectedProjection ? <>"{expectedProjection.name}" projection</> : "projections section"} (split evenly across months unless overridden).
            Spend baseline comes from the planned monthly investment below.
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Projected revenue" value={gbp(totalRev)} sub={`${expectedProjection ? expectedProjection.name : "no projection"}`} />
            <Stat label="Projected spend" value={gbp(totalSpend)} sub={`${gbp(plannedMonthlySpend)}/mo baseline`} />
            <Stat label="Net" value={gbp(totalRev - totalSpend)} />
            <Stat label="Months" value={String(FORECAST_MONTHS.length)} sub="Jun 26 – Dec 27" />
          </div>

          <SectionShell icon={TrendingUp} title="Planned monthly investment">
            <div className="flex items-center gap-3">
              <Label className="text-xs">Baseline spend / month</Label>
              <InlineMoneyCell
                value={plannedMonthlySpend}
                editable={editable}
                onSave={async (v) => {
                  if (forecastSettings) {
                    await write("update", "investor_forecast_settings", { id: forecastSettings.id, patch: { planned_monthly_spend_gbp: Number(v || 0) } });
                  } else {
                    await write("insert", "investor_forecast_settings", { row: { planned_monthly_spend_gbp: Number(v || 0) } });
                  }
                }}
              />
              <span className="text-xs text-muted-foreground">Applied to every month in the window unless overridden in the spend table.</span>
            </div>
          </SectionShell>

          <SectionShell icon={TrendingUp} title="Monthly revenue & spend (editable)">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="bg-muted/30 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2 sticky left-0 bg-muted/30">Type</th>
                    {FORECAST_MONTHS.map(m => <th key={m.key} className="text-right px-2 py-2">{m.label}</th>)}
                    <th className="text-right px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  <tr>
                    <td className="px-3 py-2 font-medium sticky left-0 bg-card">Revenue</td>
                    {FORECAST_MONTHS.map(m => (
                      <td key={m.key} className="px-2 py-2 text-right">
                        <InlineMonthAmountCell value={getMonthAmount("revenue", m.key)} editable={editable} onSave={(v) => upsertMonth("revenue", m.key, v)} />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{gbp(monthlySeries.reduce((s, m) => s + Number(getMonthAmount("revenue", m.key)), 0))}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium sticky left-0 bg-card">Spend</td>
                    {FORECAST_MONTHS.map(m => (
                      <td key={m.key} className="px-2 py-2 text-right">
                        <InlineMonthAmountCell value={getMonthAmount("spend", m.key)} editable={editable} onSave={(v) => upsertMonth("spend", m.key, v)} />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{gbp(monthlySeries.reduce((s, m) => s + Number(getMonthAmount("spend", m.key)), 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </SectionShell>

          <SectionShell icon={Plus} title="Extra income (one-off lines)" action={editable ? <Button size="sm" onClick={() => addExtraLine("extra_income")}><Plus className="w-4 h-4 mr-1" />Add</Button> : undefined}>
            <ExtraLinesTable rows={extraIncomes} editable={editable} write={write} />
          </SectionShell>
          <SectionShell icon={Plus} title="Extra expenses (one-off lines)" action={editable ? <Button size="sm" onClick={() => addExtraLine("extra_expense")}><Plus className="w-4 h-4 mr-1" />Add</Button> : undefined}>
            <ExtraLinesTable rows={extraExpenses} editable={editable} write={write} />
          </SectionShell>

          <SectionShell icon={TrendingUp} title="Cumulative net position">
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={cumulative}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => gbpAxis(Number(v))} width={70} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} formatter={(v: any) => gbp(Number(v))} />
                  <Line type="monotone" dataKey="cumulative" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionShell>
        </TabsContent>

        <TabsContent value="real" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Stat label="Spend (last 12mo)" value={gbp(realSpend12)} sub={`Avg ${gbp(realSpend12 / 12)}/mo`} />
            <Stat label="Revenue (last 12mo)" value={gbp(realRev12)} sub={`Avg ${gbp(realRev12 / 12)}/mo`} />
            <Stat label="Net" value={gbp(realRev12 - realSpend12)} />
          </div>

          <SectionShell icon={TrendingUp} title="Monthly spend vs revenue — last 12 months (actual)">
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={realMonths}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => gbpAxis(Number(v))} width={70} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} formatter={(v: any) => gbp(Number(v))} />
                  <Bar dataKey="spend" name="Spend" fill="hsl(0, 70%, 50%)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionShell>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const ExtraLinesTable = ({ rows, editable, write }: {
  rows: ForecastRow[]; editable: boolean;
  write: (op: string, table: string, payload: any) => Promise<void>;
}) => {
  if (rows.length === 0) return <div className="text-center py-4 text-xs text-muted-foreground">No lines yet.</div>;
  return (
    <div className="overflow-x-auto rounded border border-border/40">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted/30 text-xs text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2">Label</th>
            <th className="text-left px-3 py-2">Month</th>
            <th className="text-right px-3 py-2">Amount</th>
            <th className="text-left px-3 py-2">Notes</th>
            <th />
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {rows.map(r => (
            <tr key={r.id}>
              <td className="px-3 py-2">
                <EditableTextField value={r.label || ""} editable={editable} onSave={v => write("update", "investor_forecast", { id: r.id, patch: { label: v } })} />
              </td>
              <td className="px-3 py-2">
                <Select value={r.month.slice(0, 10)} disabled={!editable} onValueChange={v => write("update", "investor_forecast", { id: r.id, patch: { month: v } })}>
                  <SelectTrigger className="h-7 w-[120px] text-[11px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{FORECAST_MONTHS.map(m => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </td>
              <td className="px-3 py-2 text-right">
                <InlineMoneyCell value={Number(r.amount_gbp || 0)} editable={editable} onSave={v => write("update", "investor_forecast", { id: r.id, patch: { amount_gbp: Number(v || 0) } })} />
              </td>
              <td className="px-3 py-2">
                <EditableTextField value={r.notes || ""} editable={editable} onSave={v => write("update", "investor_forecast", { id: r.id, patch: { notes: v } })} />
              </td>
              <td className="px-3 py-2 text-right">
                {editable && <Button size="icon" variant="ghost" onClick={() => write("delete", "investor_forecast", { id: r.id })}><Trash2 className="w-4 h-4" /></Button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ---------- Inline editable cells for Salary Cap ----------
const getDateUrgencyClass = (value: string | null): string => {
  if (!value) return "";
  const days = Math.floor((new Date(value).getTime() - Date.now()) / 86400000);
  if (days < 0) return "text-destructive font-semibold";
  if (days <= 30) return "text-destructive font-semibold";
  if (days <= 90) return "text-amber-500 font-semibold";
  return "";
};
const InlineDateCell = ({ value, editable, onSave }: { value: string | null; editable: boolean; onSave: (v: string | null) => Promise<void> | void }) => {
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(value ?? "");
  useEffect(() => { setVal(value ?? ""); }, [value]);
  const commit = async () => {
    const next = val.trim() === "" ? null : val.trim();
    if (next !== (value ?? null)) await onSave(next);
    setEdit(false);
  };
  if (edit && editable) {
    return (
      <Input type="date" value={val || ""} autoFocus onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") { setEdit(false); setVal(value ?? ""); } }}
        onBlur={commit} className="h-7 w-[140px] text-[11px]" />
    );
  }
  const urgency = getDateUrgencyClass(value);
  return (
    <button type="button" onClick={() => editable && setEdit(true)}
      className={`text-[11px] tabular-nums ${editable ? "hover:bg-primary/10 px-1 rounded transition-colors" : "cursor-default"} ${value == null ? "text-muted-foreground" : urgency}`}
      title={editable ? "Click to edit · red <30d · amber <90d" : undefined}>
      {value ? format(new Date(value), "d MMM yyyy") : "—"}
    </button>
  );
};

const SeasonOverrideCell = ({
  computed, override, editable, onSave,
}: {
  computed: number; override: number | null | undefined; editable: boolean;
  onSave: (v: number | null) => Promise<void> | void;
}) => {
  const [edit, setEdit] = useState(false);
  const display = override != null ? override : computed;
  const [val, setVal] = useState(display.toString());
  useEffect(() => { setVal(display.toString()); }, [display]);
  const commit = async () => {
    const trimmed = val.trim();
    if (trimmed === "") { if (override != null) await onSave(null); setEdit(false); return; }
    const n = Number(trimmed);
    if (Number.isNaN(n)) { toast.error("Invalid number"); return; }
    if (n !== (override ?? computed)) await onSave(n);
    setEdit(false);
  };
  if (edit && editable) {
    return (
      <Input type="number" value={val} autoFocus onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") { setEdit(false); setVal(display.toString()); } }}
        onBlur={commit} className="h-7 w-24 text-right text-xs ml-auto" placeholder="0" />
    );
  }
  return (
    <span className="inline-flex items-center gap-1 justify-end">
      <button type="button" onClick={() => editable && setEdit(true)}
        className={`tabular-nums ${editable ? "hover:bg-primary/10 px-1 rounded transition-colors" : "cursor-default"} ${override != null ? "text-primary font-semibold" : ""}`}
        title={editable ? (override != null ? "Override — click to edit, blank to reset" : "Click to override") : undefined}>
        {gbp(display)}
      </button>
      {editable && override != null && (
        <button type="button" onClick={() => onSave(null)} className="text-muted-foreground hover:text-foreground"
          title="Clear override (revert to formula)">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
};

// ---------- Salary Cap: season-by-season income by represented player ----------
const SalaryCap = ({ players, invoices, editable, onSave }: {
  players: PlayerRow[]; invoices: InvoiceRow[];
  editable: boolean;
  onSave: (id: string, patch: {
    current_salary_annual?: number | null;
    expected_commission_annual?: number | null;
    potential_commission_annual?: number | null;
    contract_start_date?: string | null;
    contract_end_date?: string | null;
    salary_cap_overrides?: any;
  }) => Promise<void>;
}) => {
  const [mode, setMode] = useState<"guaranteed" | "expected" | "potential">("guaranteed");
  const live = useMemo(
    () => sortPlayersByRepresentation(players.filter(p =>
      p.representation_status === "represented" ||
      p.representation_status === "fuel_for_football" ||
      p.representation_status === "mandated" ||
      p.representation_status === "previously_mandated",
    )),
    [players],
  );

  // Build current + next 4 seasons (Jul–Jun UK football seasons).
  const seasons = useMemo(() => {
    const now = new Date();
    const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    return Array.from({ length: 5 }, (_, i) => {
      const y = startYear + i;
      return { key: `${y}/${(y + 1).toString().slice(-2)}`, start: new Date(y, 6, 1), end: new Date(y + 1, 5, 30) };
    });
  }, []);

  // Per-player expected commission for a given season.
  // Guaranteed: only counts seasons fully inside the player's contract window.
  // Expected: assumes the player stays with us indefinitely and includes broader assumed income.
  const rowsFor = (p: PlayerRow) => seasons.map(s => {
    const annualExpected = Number(p.expected_commission_annual || 0);
    const annualPotential = Number(p.potential_commission_annual || 0);
    const contractStart = p.contract_start_date ? new Date(p.contract_start_date) : null;
    const contractEnd = p.contract_end_date ? new Date(p.contract_end_date) : null;
    let guaranteed = 0;
    if (annualExpected > 0 && contractEnd) {
      // Proportion of season covered by contract window.
      const wStart = contractStart && contractStart > s.start ? contractStart : s.start;
      const wEnd = contractEnd < s.end ? contractEnd : s.end;
      const days = Math.max(0, (wEnd.getTime() - wStart.getTime()) / 86400000);
      const seasonDays = (s.end.getTime() - s.start.getTime()) / 86400000;
      guaranteed = annualExpected * (days / seasonDays);
    }
    const expected = annualExpected * 1.15; // broader assumption: 15% upside (renewals, bonuses, image rights)
    const potential = annualPotential; // raw potential (mandate / pipeline upside)
    const ov = (p.salary_cap_overrides && typeof p.salary_cap_overrides === "object" ? p.salary_cap_overrides[s.key] : null) || null;
    return {
      season: s.key,
      guaranteed: Math.max(0, Math.round(guaranteed)),
      expected: Math.max(0, Math.round(expected)),
      potential: Math.max(0, Math.round(potential)),
      override: ov as { guaranteed?: number; expected?: number; potential?: number } | null,
    };
  });

  const totals = seasons.map(s => {
    let guaranteed = 0, expected = 0, potential = 0;
    live.forEach(p => {
      const r = rowsFor(p).find(x => x.season === s.key)!;
      const og = r.override?.guaranteed; const oe = r.override?.expected; const op = r.override?.potential;
      guaranteed += og != null ? og : r.guaranteed;
      expected += oe != null ? oe : r.expected;
      potential += op != null ? op : r.potential;
    });
    return { season: s.key, guaranteed, expected, potential };
  });

  const pick = (t: { guaranteed: number; expected: number; potential: number }) =>
    mode === "guaranteed" ? t.guaranteed : mode === "expected" ? t.expected : t.potential;
  const grandTotal = totals.reduce((s, t) => s + pick(t), 0);
  const maxVal = Math.max(1, ...totals.map(pick));

  const saveSeasonOverride = async (p: PlayerRow, seasonKey: string, mode: "guaranteed" | "expected" | "potential", value: number | null) => {
    const current = (p.salary_cap_overrides && typeof p.salary_cap_overrides === "object" ? { ...p.salary_cap_overrides } : {}) as Record<string, any>;
    const seasonCur = { ...(current[seasonKey] || {}) };
    if (value == null) delete seasonCur[mode];
    else seasonCur[mode] = value;
    if (Object.keys(seasonCur).length === 0) delete current[seasonKey];
    else current[seasonKey] = seasonCur;
    await onSave(p.id, { salary_cap_overrides: current });
  };

  // Group rows by representation_status to render dividers.
  const groupedRows: { status: string; label: string; players: PlayerRow[] }[] = [];
  const statusOrder: { key: string; label: string }[] = [
    { key: "represented", label: "Represented" },
    { key: "fuel_for_football", label: "Fuel For Football" },
    { key: "mandated", label: "Mandated" },
    { key: "previously_mandated", label: "Previously Mandated" },
  ];
  statusOrder.forEach(s => {
    const ps = live.filter(p => p.representation_status === s.key);
    if (ps.length) groupedRows.push({ status: s.key, label: s.label, players: ps });
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 flex-1">
          <Stat label="Live players" value={String(live.length)} />
          <Stat label={`5-season ${mode}`} value={gbp(grandTotal)} />
          <Stat label="Per-season average" value={gbp(Math.round(grandTotal / 5))} />
        </div>
        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList>
            <TabsTrigger value="guaranteed">Guaranteed</TabsTrigger>
            <TabsTrigger value="expected">Expected</TabsTrigger>
            <TabsTrigger value="potential">Potential</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <SectionShell icon={Target} title={`Commission cap — ${mode === "guaranteed" ? "contract-locked income" : mode === "expected" ? "expected income (assumes retention + upside)" : "potential income (mandate upside, not guaranteed)"}`}
        action={editable ? <Badge variant="outline" className="border-primary text-primary text-[10px]">Click any figure or date to edit</Badge> : undefined}
      >
        <div className="grid grid-cols-5 gap-2 mb-4">
          {totals.map(t => {
            const v = pick(t);
            const pct = Math.round((v / maxVal) * 100);
            return (
              <div key={t.season} className="flex flex-col">
                <div className="text-[10px] text-muted-foreground mb-1">{t.season}</div>
                <div className="relative h-32 bg-muted/30 rounded-md overflow-hidden border border-border/40">
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/80 to-primary/40 transition-all"
                    style={{ height: `${pct}%` }} />
                  <div className="absolute inset-x-0 bottom-1 text-center text-[10px] font-semibold text-primary-foreground mix-blend-difference">
                    {gbp(v)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="rounded border border-border/40 overflow-x-auto">
          <table className="w-full text-sm min-w-[1080px]">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Player</th>
                <th className="text-left px-3 py-2">Contract</th>
                <th className="text-right px-3 py-2">Salary / yr</th>
                <th className="text-right px-3 py-2">Commission / yr</th>
                <th className="text-right px-3 py-2">Potential / yr</th>
                {seasons.map(s => <th key={s.key} className="text-right px-3 py-2">{s.key}</th>)}
                <th className="text-right px-3 py-2">5-yr total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {live.length === 0 ? (
                <tr><td colSpan={seasons.length + 6} className="text-center text-muted-foreground py-6">No live players.</td></tr>
              ) : groupedRows.flatMap(group => [
                (
                  <tr key={`group-${group.status}`} className="bg-muted/20">
                    <td colSpan={seasons.length + 6} className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-primary font-bbh">
                      {group.label} · {group.players.length}
                    </td>
                  </tr>
                ),
                ...group.players.map(p => {
                const r = rowsFor(p);
                const total = r.reduce((s, x) => {
                  const ov = x.override ? (x.override as any)[mode] : null;
                  return s + (ov != null ? ov : pick(x));
                }, 0);
                return (
                  <tr key={p.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7"><AvatarImage src={p.image_url || undefined} /><AvatarFallback className="text-[10px]">{p.name[0]}</AvatarFallback></Avatar>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{p.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{p.club || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] uppercase tracking-widest text-muted-foreground/70 w-16 shrink-0">Rep. exp.</span>
                          <InlineDateCell value={p.contract_start_date} editable={editable}
                            onSave={(v) => onSave(p.id, { contract_start_date: v })} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] uppercase tracking-widest text-muted-foreground/70 w-16 shrink-0">Contract</span>
                          <InlineDateCell value={p.contract_end_date} editable={editable}
                            onSave={(v) => onSave(p.id, { contract_end_date: v })} />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums">
                      <InlineMoneyCell value={p.current_salary_annual} editable={editable}
                        onSave={(v) => onSave(p.id, { current_salary_annual: v })} />
                    </td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums">
                      <InlineMoneyCell value={p.expected_commission_annual} editable={editable}
                        onSave={(v) => onSave(p.id, { expected_commission_annual: v })} />
                    </td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums">
                      <InlineMoneyCell value={p.potential_commission_annual} editable={editable}
                        onSave={(v) => onSave(p.id, { potential_commission_annual: v })} />
                    </td>
                    {r.map(x => (
                      <td key={x.season} className="px-3 py-2 text-right text-xs tabular-nums">
                        <SeasonOverrideCell
                          computed={pick(x)}
                          override={x.override ? (x.override as any)[mode] ?? null : null}
                          editable={editable}
                          onSave={(v) => saveSeasonOverride(p, x.season, mode, v)}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-semibold text-primary tabular-nums">{gbp(total)}</td>
                  </tr>
                );
              }),
              ])}
            </tbody>
            <tfoot className="bg-muted/20 font-semibold">
              <tr>
                <td className="px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">Total</td>
                <td colSpan={4} />
                {totals.map(t => <td key={t.season} className="px-3 py-2 text-right text-xs tabular-nums">{gbp(pick(t))}</td>)}
                <td className="px-3 py-2 text-right text-primary tabular-nums">{gbp(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Guaranteed counts only the contracted portion of each season. Expected assumes the player stays with us beyond contract end and includes a 15% broader-income uplift (renewals, bonuses, image rights). Potential reflects mandate upside that isn't guaranteed yet. Click any per-season cell to override the formula for that season and tab; the gold value indicates an override. Click the X to revert.
        </p>
      </SectionShell>
    </div>
  );
};

// ---------- Projections: editable scenario planning ----------
const Projections = ({ projections, players, editable, write }: {
  projections: ProjectionRow[]; players: PlayerRow[]; editable: boolean;
  write: (op: string, table: string, payload: any) => Promise<void>;
}) => {
  const [activeId, setActiveId] = useState<string | null>(projections[0]?.id || null);
  useEffect(() => { if (!activeId && projections[0]) setActiveId(projections[0].id); }, [activeId, projections]);
  const active = projections.find(p => p.id === activeId) || projections[0] || null;
  const playerMap = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);
  const availablePlayers = players.filter(p => ["represented", "fuel_for_football", "mandated", "previously_mandated"].includes(p.representation_status || ""));
  const rows = Array.isArray(active?.player_rows) ? active!.player_rows : [];
  const extraRows = Array.isArray(active?.extra_income_rows) ? active!.extra_income_rows : [];
  const playerIncome = rows.reduce((s, r) => s + Number(r.income_gbp || 0), 0);
  const extraRowsIncome = extraRows.reduce((s, r) => s + Number(r.income_gbp || 0), 0);
  const legacyExtra = Number(active?.extra_income_gbp || 0);
  const total = playerIncome + extraRowsIncome + legacyExtra;
  const updateProjection = (patch: Partial<ProjectionRow>) => active && write("update", "investor_projections", { id: active.id, patch });
  const updateRows = (nextRows: ProjectionPlayerRow[]) => updateProjection({ player_rows: nextRows });
  const updateExtraRows = (nextRows: ProjectionExtraRow[]) => updateProjection({ extra_income_rows: nextRows });
  const addProjection = () => write("insert", "investor_projections", {
    row: { name: "New projection", scenario: "expected", player_rows: [], extra_income_rows: [], display_order: projections.length },
  });
  const addPlayer = (playerId: string) => {
    if (!active || !playerId || rows.some(r => r.player_id === playerId)) return;
    const p = playerMap.get(playerId);
    updateRows([...rows, { player_id: playerId, custom_name: null, income_gbp: p?.expected_commission_annual ?? 0, notes: "" }]);
  };
  const addCustomPlayer = () => {
    if (!active) return;
    updateRows([...rows, { player_id: null, custom_name: "New player", income_gbp: 0, notes: "" }]);
  };
  const addExtraIncome = () => {
    if (!active) return;
    updateExtraRows([...extraRows, { label: "Club Mandate", income_gbp: 0, notes: "" }]);
  };
  return (
    <SectionShell icon={Target} title="Projections" action={editable ? <Button size="sm" onClick={addProjection} className="bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1" />Add projection</Button> : undefined}>
      <div className="mb-3 text-xs text-muted-foreground border border-border/40 rounded-md px-3 py-2 bg-muted/20">
        Projection window: <span className="text-foreground font-medium">1 June 2026 → 31 December 2027</span> (19 months)
      </div>
      {projections.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">No projections yet.</div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {projections.map(p => (
              <Button key={p.id} size="sm" variant={p.id === active?.id ? "default" : "outline"} onClick={() => setActiveId(p.id)}>
                {p.name}
              </Button>
            ))}
          </div>
          {active && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Stat label="Player income" value={gbp(playerIncome)} />
                <Stat label="Extra income" value={gbp(extraRowsIncome + legacyExtra)} />
                <Stat label="Projected revenue" value={gbp(total)} />
              </div>
              <div className="grid md:grid-cols-[1.2fr_0.8fr] gap-3">
                <Card className="bg-card/60 border-border/60 p-4 space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div><Label>Name</Label><EditableTextField value={active.name} editable={editable} onSave={v => updateProjection({ name: v || "Untitled projection" })} /></div>
                    <div><Label>Scenario</Label><Select value={active.scenario} disabled={!editable} onValueChange={v => updateProjection({ scenario: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="badly">Badly</SelectItem><SelectItem value="expected">Expected</SelectItem><SelectItem value="better">Better than expected</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="grid md:grid-cols-1 gap-3">
                    <div><Label>Misc. extra income</Label><InlineMoneyCell value={active.extra_income_gbp} editable={editable} onSave={(v) => updateProjection({ extra_income_gbp: v || 0 })} /></div>
                  </div>
                  <div><Label>Notes</Label><EditableTextField value={active.notes} editable={editable} multiline onSave={v => updateProjection({ notes: v })} /></div>
                </Card>
                <Card className="bg-card/60 border-border/60 p-4 space-y-3">
                  <Label>Add represented player</Label>
                  <Select disabled={!editable} onValueChange={addPlayer} value=""><SelectTrigger><SelectValue placeholder="Select player" /></SelectTrigger><SelectContent>{availablePlayers.filter(p => !rows.some(r => r.player_id === p.id)).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
                  {editable && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={addCustomPlayer}><Plus className="w-3.5 h-3.5 mr-1" />Custom player</Button>
                      <Button size="sm" variant="outline" onClick={addExtraIncome}><Plus className="w-3.5 h-3.5 mr-1" />Non-player income</Button>
                    </div>
                  )}
                  {editable && <Button variant="destructive" size="sm" onClick={() => active && write("delete", "investor_projections", { id: active.id })}><Trash2 className="w-4 h-4 mr-1" />Delete projection</Button>}
                </Card>
              </div>
              <div className="rounded border border-border/40 overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-muted/30 text-xs text-muted-foreground"><tr><th className="text-left px-3 py-2">Player</th><th className="text-left px-3 py-2">Status</th><th className="text-right px-3 py-2">Income</th><th className="text-left px-3 py-2">Notes</th><th /></tr></thead>
                  <tbody className="divide-y divide-border/40">
                    {rows.length === 0 && extraRows.length === 0 ? <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">No rows in this projection.</td></tr> : (
                      <>
                        {rows.map((row, idx) => {
                          const p = row.player_id ? playerMap.get(row.player_id) : null;
                          const isCustom = !row.player_id;
                          const displayName = p?.name || row.custom_name || "Custom player";
                          return (
                            <tr key={`pr-${idx}`}>
                              <td className="px-3 py-2 font-medium">
                                {isCustom
                                  ? <EditableTextField value={row.custom_name || ""} editable={editable} onSave={v => updateRows(rows.map((r, i) => i === idx ? { ...r, custom_name: v || "Custom player" } : r))} />
                                  : displayName}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{isCustom ? "Custom" : ((p?.representation_status || "—").replace(/_/g, " "))}</td>
                              <td className="px-3 py-2 text-right"><InlineMoneyCell value={row.income_gbp} editable={editable} onSave={(v) => updateRows(rows.map((r, i) => i === idx ? { ...r, income_gbp: v } : r))} /></td>
                              <td className="px-3 py-2"><EditableTextField value={row.notes || ""} editable={editable} onSave={v => updateRows(rows.map((r, i) => i === idx ? { ...r, notes: v } : r))} /></td>
                              <td className="px-3 py-2 text-right">{editable && <Button size="icon" variant="ghost" onClick={() => updateRows(rows.filter((_, i) => i !== idx))}><Trash2 className="w-4 h-4" /></Button>}</td>
                            </tr>
                          );
                        })}
                        {extraRows.map((row, idx) => (
                          <tr key={`ex-${idx}`} className="bg-muted/10">
                            <td className="px-3 py-2 font-medium">
                              <EditableTextField value={row.label || ""} editable={editable} onSave={v => updateExtraRows(extraRows.map((r, i) => i === idx ? { ...r, label: v || "Income" } : r))} />
                            </td>
                            <td className="px-3 py-2 text-muted-foreground italic">Non-player income</td>
                            <td className="px-3 py-2 text-right"><InlineMoneyCell value={row.income_gbp} editable={editable} onSave={(v) => updateExtraRows(extraRows.map((r, i) => i === idx ? { ...r, income_gbp: v } : r))} /></td>
                            <td className="px-3 py-2"><EditableTextField value={row.notes || ""} editable={editable} onSave={v => updateExtraRows(extraRows.map((r, i) => i === idx ? { ...r, notes: v } : r))} /></td>
                            <td className="px-3 py-2 text-right">{editable && <Button size="icon" variant="ghost" onClick={() => updateExtraRows(extraRows.filter((_, i) => i !== idx))}><Trash2 className="w-4 h-4" /></Button>}</td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </SectionShell>
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
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [ageMin, setAgeMin] = useState<string>("");
  const [ageMax, setAgeMax] = useState<string>("");
  const [clubRatings, setClubRatings] = useState<Array<{ club_name: string; first_team_rating: string; academy_rating: string }>>([]);
  const [clubLogosByName, setClubLogosByName] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data: ratings } = await (supabase as any).from("club_ratings").select("club_name, first_team_rating, academy_rating");
      setClubRatings((ratings as any) || []);
      // Build a logo lookup from any rows that already carry a club_logo_url (scouting reports)
      const m: Record<string, string> = {};
      [...scouting, ...youth, ...pro].forEach((r: any) => {
        const name = (r?.current_club || "").trim().toLowerCase();
        if (name && r?.club_logo_url) m[name] = m[name] || r.club_logo_url;
      });
      setClubLogosByName(m);
    })();
  }, [scouting, youth, pro]);

  const logoFor = (clubName: string | null, fallback: string | null) => {
    if (fallback) return fallback;
    if (!clubName) return null;
    return clubLogosByName[clubName.trim().toLowerCase()] || null;
  };

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

  const allPositions = useMemo(() => Array.from(new Set(combined.map(p => p.position).filter(Boolean))).sort() as string[], [combined]);

  const filtered = combined.filter(p => {
    if (src !== "all" && p.source !== src) return false;
    if (positionFilter !== "all" && p.position !== positionFilter) return false;
    if (ageMin && Number(p.age || 0) < Number(ageMin)) return false;
    if (ageMax && Number(p.age || 0) > Number(ageMax)) return false;
    if (ratingFilter !== "all") {
      const rating = findClubRating(p.current_club, clubRatings, p.source === "youth_outreach");
      if (rating !== ratingFilter) return false;
    }
    if (!q) return true;
    const Q = q.toLowerCase();
    return (p.player_name || "").toLowerCase().includes(Q) ||
      (p.current_club || "").toLowerCase().includes(Q) ||
      (p.nationality || "").toLowerCase().includes(Q) ||
      (p.position || "").toLowerCase().includes(Q);
  }).sort((a, b) => (a.player_name || "").localeCompare(b.player_name || ""));

  const ratingColours: Record<string, string> = {
    R1: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    R2: "bg-green-500/20 text-green-300 border-green-500/40",
    R3: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    R4: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    R5: "bg-red-500/20 text-red-300 border-red-500/40",
  };

  return (
    <SectionShell icon={Network} title={`Player Database (${filtered.length} of ${combined.length})`} action={
      <div className="flex flex-wrap items-center gap-2">
        <Select value={src} onValueChange={setSrc}>
          <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="scouting">Scouting</SelectItem>
            <SelectItem value="youth_outreach">Youth Outreach</SelectItem>
            <SelectItem value="pro_outreach">Pro Outreach</SelectItem>
          </SelectContent>
        </Select>
        <Select value={positionFilter} onValueChange={setPositionFilter}>
          <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue placeholder="Position" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All positions</SelectItem>
            {allPositions.map(pos => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue placeholder="Club tier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tiers</SelectItem>
            {["R1","R2","R3","R4","R5"].map(r => <SelectItem key={r} value={r}>{r} club</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Min age" value={ageMin} onChange={e => setAgeMin(e.target.value.replace(/[^0-9]/g, ""))} className="h-8 w-[70px] text-xs" />
        <Input placeholder="Max age" value={ageMax} onChange={e => setAgeMax(e.target.value.replace(/[^0-9]/g, ""))} className="h-8 w-[70px] text-xs" />
        <Input placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} className="h-8 w-44" />
      </div>
    }>
      <div className="rounded border border-border/40 overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground font-bbh">
            <tr>
              <th className="text-left px-3 py-2 w-12"></th>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Nationality</th>
              <th className="text-left px-3 py-2">Position</th>
              <th className="text-left px-3 py-2">Age</th>
              <th className="text-left px-3 py-2">Club</th>
              <th className="text-left px-3 py-2">Tier</th>
              <th className="text-left px-3 py-2">Source</th>
              <th className="text-right px-3 py-2">Reports</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filtered.slice(0, 500).map(p => {
              const rating = findClubRating(p.current_club, clubRatings, p.source === "youth_outreach");
              const logo = logoFor(p.current_club, p.club_logo_url || null);
              return (
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
                <td className="px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0 max-w-[220px]">
                    {logo ? (
                      <img src={logo} alt="" className="h-5 w-5 object-contain shrink-0" loading="lazy" />
                    ) : (
                      <div className="h-5 w-5 rounded bg-muted/40 shrink-0" />
                    )}
                    <span className="truncate">{p.current_club || "—"}</span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  {rating ? (
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${ratingColours[rating] || ""}`}>{rating}</Badge>
                  ) : <span className="text-[10px] text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2">
                  <Badge variant="outline" className="text-[9px] capitalize">{p.source.replace("_", " ")}</Badge>
                </td>
                <td className="px-3 py-2 text-right text-xs">{p.report_count}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length > 500 && (
          <div className="text-[10px] text-muted-foreground px-3 py-2 text-center">Showing first 500 of {filtered.length}. Refine search to narrow.</div>
        )}
      </div>
    </SectionShell>
  );
};

const Overview = ({ players, contracts, tasks, staffActivity, taskNotifications, spending, prospects, invoices, profiles, playerAnalyses, matchAnalyses, setActive }: {
  players: PlayerRow[]; contracts: ContractRow[]; tasks: TaskRow[]; staffActivity: StaffActivityRow[];
  taskNotifications: NotificationRow[]; spending: SpendingRow[]; prospects: ProspectRow[]; invoices: InvoiceRow[];
  profiles: ProfileRow[]; playerAnalyses: PlayerAnalysisRow[]; matchAnalyses: any[]; setActive: (s: SectionId) => void;
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
  const playerById = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);
  const fixtures = useMemo(() => buildFixtureFeed(playerAnalyses || [], matchAnalyses || [], playerById), [playerAnalyses, matchAnalyses, playerById]);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => setActive("commission")} className="text-left"><Stat label="Real Revenue (12mo)" value={gbp(realRevenue)} sub={`Forecast: ${gbp(commission)}/yr`} /></button>
        <button onClick={() => setActive("represented")} className="text-left"><Stat label="Represented" value={String(represented)} sub={`${mandated} mandated`} /></button>
        <button onClick={() => setActive("prospects")} className="text-left"><Stat label="Prospects" value={String(prospects.length)} sub="In pipeline" /></button>
        <button onClick={() => setActive("spending")} className="text-left"><Stat label="This Month Spend" value={gbp(monthlySpend)} sub="Running total" /></button>
      </div>
      <PlayerFeed fixtures={fixtures} />
      <ActivityFeed rows={staffActivity.slice(0, 30)} taskNotifications={taskNotifications.slice(0, 50)} profiles={profiles} />
    </div>
  );
};

const normaliseFixtureKey = (value: string | null | undefined) => (value || "").trim().toLowerCase();

const isUsableHexColour = (value: string | null | undefined) => /^#[0-9a-f]{6}$/i.test((value || "").trim());

const buildFixtureFeed = (reports: PlayerAnalysisRow[], taggedRows: any[], playerById: Map<string, PlayerRow>): FixtureFeedItem[] => {
  const map = new Map<string, FixtureFeedItem>();
  const ensure = (key: string, date: string | null, title: string, subtitle: string) => {
    const existing = map.get(key);
    if (existing) return existing;
    const item: FixtureFeedItem = { id: key, sort_date: date || new Date(0).toISOString(), match_date: date, title, subtitle, players: [], reports: [], pre_match: [], post_match: [], colour: null };
    map.set(key, item);
    return item;
  };

  reports.filter(r => r.visibility_status === "live" || r.visibility_status === "clipped").forEach((report) => {
    const player = playerById.get(report.player_id);
    const date = report.analysis_date || report.updated_at;
    const key = report.fixture_id || `report:${normaliseFixtureKey(date)}:${normaliseFixtureKey(report.opponent)}:${report.player_id}`;
    const item = ensure(key, date, report.opponent ? `vs ${report.opponent}` : "Fixture", [report.result, date ? format(new Date(date), "d MMM yyyy") : null].filter(Boolean).join(" · "));
    item.reports.push(report);
    if (!item.colour && isUsableHexColour(report.opposition_color)) item.colour = report.opposition_color!.trim();
    if (player && !item.players.some(p => p.id === player.id)) item.players.push({ id: player.id, name: player.name, image_url: player.image_url });
  });

  taggedRows.forEach((row: any) => {
    const a = row.analyses;
    if (!a || (a.analysis_type !== "pre-match" && a.analysis_type !== "post-match")) return;
    const player = playerById.get(row.player_id);
    const title = [a.home_team, a.away_team].filter(Boolean).join(" vs ") || a.title || "Fixture";
    const key = a.fixture_id || `analysis:${normaliseFixtureKey(a.match_date)}:${normaliseFixtureKey(a.home_team)}:${normaliseFixtureKey(a.away_team)}`;
    const item = ensure(key, a.match_date || row.created_at, title, a.match_date ? format(new Date(a.match_date), "d MMM yyyy") : "Match analysis");
    const link: MatchAnalysisLink = { id: a.id, title: a.title, analysis_type: a.analysis_type, match_date: a.match_date, home_team: a.home_team, away_team: a.away_team, home_team_bg_color: a.home_team_bg_color, away_team_bg_color: a.away_team_bg_color };
    const target = a.analysis_type === "pre-match" ? item.pre_match : item.post_match;
    if (!target.some(existing => existing.id === link.id)) target.push(link);
    if (!item.colour && isUsableHexColour(a.home_team_bg_color)) item.colour = a.home_team_bg_color.trim();
    if (!item.colour && isUsableHexColour(a.away_team_bg_color)) item.colour = a.away_team_bg_color.trim();
    if (player && !item.players.some(p => p.id === player.id)) item.players.push({ id: player.id, name: player.name, image_url: player.image_url });
  });

  return [...map.values()].sort((a, b) => +new Date(b.sort_date) - +new Date(a.sort_date));
};

// ---------- Player Feed: fixture rows with report, clips, pre-match and post-match ----------
const PlayerFeed = ({ fixtures }: { fixtures: FixtureFeedItem[] }) => {
  const [activeVideo, setActiveVideo] = useState<{ url: string; title: string } | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const visibleFixtures = expanded ? fixtures : fixtures.slice(0, 5);
  if (fixtures.length === 0) return null;
  return (
    <SectionShell icon={Film} title="Player Feed">
      <div className="space-y-2">
        {visibleFixtures.map((fixture) => {
          const hasLive = fixture.reports.some(r => r.visibility_status === "live");
          const stripColour = fixture.colour || (hasLive ? "hsl(var(--primary))" : "hsl(var(--border))");
          const clubLogo = fixture.reports.find(r => r.club_logo_url)?.club_logo_url || null;
          return (
          <Card key={fixture.id} className="relative bg-card/60 border-border/60 p-3 pt-5 hover:border-primary/40 transition-colors overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2" style={{ backgroundColor: stripColour }} />
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1 flex items-start gap-3">
                {clubLogo ? (
                  <img src={clubLogo} alt="" className="h-10 w-10 object-contain shrink-0 mt-0.5" loading="lazy" />
                ) : (
                  <div className="h-10 w-10 rounded bg-muted/40 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm md:text-base text-foreground truncate">{fixture.title}</h3>
                    {fixture.reports.map(r => <Badge key={r.id} variant="outline" className={`text-[10px] ${r.visibility_status === "clipped" ? "border-amber-500/40 text-amber-300" : "border-emerald-500/40 text-emerald-300"}`}>{r.visibility_status === "clipped" ? "Clipped" : "Live"}</Badge>)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{fixture.subtitle || "Fixture"}</div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {fixture.players.slice(0, 4).map(p => (
                      <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/35 px-2 py-1 text-[11px] text-muted-foreground">
                        <Avatar className="h-4 w-4"><AvatarImage src={p.image_url || undefined} /><AvatarFallback className="text-[8px]">{p.name[0]}</AvatarFallback></Avatar>
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                {fixture.reports.map(report => (
                  <Button key={`open-${report.id}`} size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setSelectedReportId(report.id); setReportOpen(true); }}>
                    <FileText className="w-3 h-3 mr-1" />See report
                  </Button>
                ))}
                {fixture.reports.map(report => (
                  <Button key={`watch-${report.id}`} size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setSelectedReportId(report.id); setReportOpen(true); }}>
                    <PlayCircle className="w-3 h-3 mr-1" />Watch
                  </Button>
                ))}
                {fixture.pre_match.map(a => <Button key={a.id} size="sm" variant="outline" className="h-8 text-xs" onClick={() => window.open(`/analysis/${a.id}`, "_blank")}><FileText className="w-3 h-3 mr-1" />Pre-match</Button>)}
                {fixture.post_match.map(a => <Button key={a.id} size="sm" variant="outline" className="h-8 text-xs" onClick={() => window.open(`/analysis/${a.id}`, "_blank")}><FileText className="w-3 h-3 mr-1" />Post-match</Button>)}
              </div>
            </div>
          </Card>
          );
        })}
        {fixtures.length > 5 && <Button variant="outline" className="w-full h-9" onClick={() => setExpanded(v => !v)}>{expanded ? "Show less" : `See more (${fixtures.length - 5})`}</Button>}
      </div>

      <Dialog open={!!activeVideo} onOpenChange={(o) => { if (!o) setActiveVideo(null); }}>
        <DialogContent className="max-w-5xl w-[92vw] p-0 overflow-hidden bg-black">
          <DialogHeader className="px-4 py-2 border-b border-border/40">
            <DialogTitle className="text-sm">{activeVideo?.title}</DialogTitle>
          </DialogHeader>
          {activeVideo && (
            <video src={activeVideo.url} controls autoPlay className="w-full max-h-[75vh] bg-black" />
          )}
        </DialogContent>
      </Dialog>
      <PerformanceReportDialog open={reportOpen} onOpenChange={setReportOpen} analysisId={selectedReportId} isPortalView={false} />
    </SectionShell>
  );
};

// ---------- Outreach (read-only view of youth + pro outreach) ----------
const OutreachView = ({ youth, pro }: { youth: any[]; pro: any[] }) => {
  const [tab, setTab] = useState<"youth" | "pro">("youth");
  const rows = tab === "youth" ? youth : pro;
  const [clubRatings, setClubRatings] = useState<Array<{ club_name: string; first_team_rating: string; academy_rating: string }>>([]);
  const [clubLogosByName, setClubLogosByName] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data: ratings } = await (supabase as any).from("club_ratings").select("club_name, first_team_rating, academy_rating");
      setClubRatings((ratings as any) || []);
      const { data: clubs } = await (supabase as any).from("clubs").select("name, logo_url");
      const m: Record<string, string> = {};
      (clubs as any[] || []).forEach((c: any) => {
        if (c?.name && c?.logo_url) m[c.name.trim().toLowerCase()] = c.logo_url;
      });
      [...youth, ...pro].forEach((r: any) => {
        const name = (r?.current_club || r?.club || "").trim().toLowerCase();
        if (name && r?.club_logo_url) m[name] = m[name] || r.club_logo_url;
      });
      setClubLogosByName(m);
    })();
  }, [youth, pro]);

  const logoFor = (clubName: string | null) => {
    if (!clubName) return null;
    return clubLogosByName[clubName.trim().toLowerCase()] || null;
  };

  const ratingColours: Record<string, string> = {
    R1: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    R2: "bg-green-500/20 text-green-300 border-green-500/40",
    R3: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    R4: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    R5: "bg-red-500/20 text-red-300 border-red-500/40",
  };

  return (
    <SectionShell icon={Users} title={`Player Outreach (${youth.length + pro.length})`}>
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="youth">Youth ({youth.length})</TabsTrigger>
          <TabsTrigger value="pro">Pro ({pro.length})</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">No outreach entries.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rows.slice(0, 300).map((r: any) => {
                const clubName = r.current_club || r.club || null;
                const logo = logoFor(clubName);
                const rating = findClubRating(clubName, clubRatings, tab === "youth");
                return (
                  <Card key={r.id} className="bg-card/60 border-border/60 p-3 hover:border-primary/40 transition-colors">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12 border border-border">
                        <AvatarImage src={r.profile_image_url || undefined} className="object-cover" />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">{(r.player_name || r.name || "?")[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="font-semibold text-sm truncate">{r.player_name || r.name || "—"}</div>
                          {rating && <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${ratingColours[rating] || ""}`}>{rating}</Badge>}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                          {r.nationality && <img src={getCountryFlagUrl(r.nationality)} alt="" className="w-4 h-3 rounded-sm object-cover" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
                          <span>{r.nationality || "—"}</span>
                          <span>•</span>
                          <span>{r.position || "—"}</span>
                          <span>•</span>
                          <span>{r.age ?? "—"} yrs</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 min-w-0">
                          {logo ? (
                            <img src={logo} alt="" className="h-5 w-5 object-contain shrink-0" loading="lazy" />
                          ) : (
                            <div className="h-5 w-5 rounded bg-muted/40 shrink-0" />
                          )}
                          <span className="text-xs text-foreground/80 truncate">{clubName || "—"}</span>
                        </div>
                        <div className="mt-2">
                          <Badge variant="outline" className="text-[10px]">{r.status || r.stage || "Active"}</Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </SectionShell>
  );
};

// ---------- Club Network (read-only) ----------
const ClubNetworkView = ({ rows }: { rows: ClubContactRow[] }) => {
  const [q, setQ] = useState("");
  const filtered = rows.filter(r => {
    if (!q) return true;
    const Q = q.toLowerCase();
    return (r.name || "").toLowerCase().includes(Q) ||
      (r.club_name || "").toLowerCase().includes(Q) ||
      (r.country || "").toLowerCase().includes(Q) ||
      (r.position || "").toLowerCase().includes(Q);
  });
  return (
    <SectionShell icon={Building2} title={`Club Network (${filtered.length})`} action={
      <Input placeholder="Search contacts..." value={q} onChange={e => setQ(e.target.value)} className="h-8 w-56" />
    }>
      {filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">No contacts.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.slice(0, 300).map(c => (
            <Card key={c.id} className="bg-card/60 border-border/60 p-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 border border-border">
                  <AvatarImage src={c.image_url || undefined} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">{(c.name || "?")[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <div className="font-semibold text-sm truncate">{c.name}</div>
                    {c.is_favourite && <Star className="w-3 h-3 text-primary fill-primary" />}
                  </div>
                  {c.position && <div className="text-xs text-muted-foreground truncate">{c.position}</div>}
                  {c.club_name && <div className="text-xs text-foreground/80 truncate">{c.club_name}</div>}
                  <div className="text-[10px] text-muted-foreground mt-1 truncate">
                    {[c.city, c.country].filter(Boolean).join(", ") || "—"}
                  </div>
                  {c.tags && c.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {c.tags.slice(0, 3).map(t => (
                        <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground border border-border/40">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </SectionShell>
  );
};

// ---------- Timeline ----------
const INVESTOR_SHARE = 0.5;
const TIMELINE_KINDS: {
  value: TimelineRow["kind"];
  label: string;
  dot: string;          // tailwind bg for the node dot
  ring: string;         // tailwind ring colour
  badge: string;        // chip background
  band?: string;        // optional full-height band background (for ranges)
}[] = [
  { value: "event",           label: "Milestone",       dot: "bg-foreground",      ring: "ring-foreground/30",  badge: "bg-muted/60 text-foreground border-border/60" },
  { value: "investment",      label: "Investment In",   dot: "bg-sky-400",         ring: "ring-sky-400/40",     badge: "bg-sky-500/15 text-sky-200 border-sky-500/40" },
  { value: "expense",         label: "Expense",         dot: "bg-rose-400",        ring: "ring-rose-400/40",    badge: "bg-rose-500/15 text-rose-200 border-rose-500/40" },
  { value: "income",          label: "Income",          dot: "bg-emerald-400",     ring: "ring-emerald-400/40", badge: "bg-emerald-500/15 text-emerald-200 border-emerald-500/40" },
  { value: "deal",            label: "Deal Completed",  dot: "bg-primary",         ring: "ring-primary/50",     badge: "bg-primary/20 text-primary border-primary/50" },
  { value: "transfer_window", label: "Transfer Window", dot: "bg-primary/70",      ring: "ring-primary/30",     badge: "bg-primary/10 text-primary border-primary/40", band: "bg-primary/5 border-x border-primary/20" },
];
const kindMeta = (k: string) => TIMELINE_KINDS.find(x => x.value === k) || TIMELINE_KINDS[0];

// Investor net delta for a row (positive = recouped to investor, negative = invested by investor)
const investorDelta = (r: TimelineRow): number => {
  if (!r.amount_gbp) return 0;
  if (r.kind === "investment") return -Number(r.amount_gbp);
  if (r.kind === "income" || r.kind === "deal") return Number(r.amount_gbp) * INVESTOR_SHARE;
  return 0;
};

const Timeline = ({ rows, editable, token, onChange }: {
  rows: TimelineRow[];
  editable: boolean;
  token: string;
  onChange: (next: TimelineRow[]) => void;
}) => {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{ kind: TimelineRow["kind"]; title: string; start_date: string; end_date: string; amount_gbp: string; notes: string; goal: string }>(
    { kind: "event", title: "", start_date: format(new Date(), "yyyy-MM-dd"), end_date: "", amount_gbp: "", notes: "", goal: "" }
  );
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<TimelineRow | null>(null);
  const [zoom, setZoom] = useState(3); // px per day
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrubX, setScrubX] = useState<number | null>(null);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [rows]
  );

  // Compute date range with sensible padding around today
  const { rangeStart, rangeEnd, totalDays, months } = useMemo(() => {
    const today = new Date();
    let min = new Date(today); min.setDate(min.getDate() - 60);
    let max = new Date(today); max.setDate(max.getDate() + 180);
    for (const r of sorted) {
      const s = new Date(r.start_date);
      const e = r.end_date ? new Date(r.end_date) : s;
      if (s < min) min = s;
      if (e > max) max = e;
    }
    // snap to month start/end + 1 month pad
    const start = new Date(min.getFullYear(), min.getMonth() - 1, 1);
    const end = new Date(max.getFullYear(), max.getMonth() + 2, 1);
    const total = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
    const ms: { date: Date; days: number }[] = [];
    let cur = new Date(start);
    while (cur < end) {
      const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      ms.push({ date: new Date(cur), days: Math.round((next.getTime() - cur.getTime()) / 86400000) });
      cur = next;
    }
    return { rangeStart: start, rangeEnd: end, totalDays: total, months: ms };
  }, [sorted]);

  const dayToX = (d: Date) => Math.round((d.getTime() - rangeStart.getTime()) / 86400000) * zoom;
  const xToDate = (x: number) => new Date(rangeStart.getTime() + (x / zoom) * 86400000);
  const width = totalDays * zoom;

  // Cumulative investor net balance series (one point per event with a delta)
  const series = useMemo(() => {
    let cum = 0;
    const points: { x: number; y: number; date: string; delta: number; title: string }[] = [];
    for (const r of sorted) {
      const d = investorDelta(r);
      if (d === 0) continue;
      cum += d;
      points.push({ x: dayToX(new Date(r.start_date)), y: cum, date: r.start_date, delta: d, title: r.title });
    }
    return points;
  }, [sorted, zoom, rangeStart]);

  // Totals up to a given cut-off date (null = whole timeline)
  const computeTotals = (cutoff: Date | null) => {
    let invested = 0;     // all investor outlay (planned + actual)
    let recouped = 0;     // investor 50% share already received
    let expectedGross = 0; // TOTAL gross of all income/deal entries (not just 50%)
    for (const r of sorted) {
      const d = new Date(r.start_date);
      const within = !cutoff || d <= cutoff;
      const amt = Number(r.amount_gbp || 0);
      if (r.kind === "investment" && within) invested += amt;
      if ((r.kind === "income" || r.kind === "deal") && within) recouped += amt * INVESTOR_SHARE;
      if (r.kind === "income" || r.kind === "deal") expectedGross += amt;
    }
    return { invested, recouped, expected: expectedGross, net: invested - recouped };
  };
  const totals = useMemo(() => computeTotals(null), [sorted]);
  const scrubDate = scrubX != null ? xToDate(scrubX) : null;
  const scrubTotals = useMemo(() => scrubDate ? computeTotals(scrubDate) : null, [scrubDate, sorted]);

  // One lane per entry — never overlap, regardless of date proximity or kind.
  const laneHeight = 32;
  const placed = useMemo(() => {
    return sorted
      .filter(r => r.kind !== "transfer_window")
      .map((r, i) => ({ row: r, x: dayToX(new Date(r.start_date)), lane: i }));
  }, [sorted, zoom, rangeStart]);
  const laneCount = Math.max(4, placed.length);

  const windows = sorted.filter(r => r.kind === "transfer_window");
  const todayX = dayToX(new Date());

  // Path for cumulative line
  const seriesPath = useMemo(() => {
    if (series.length === 0) return "";
    const maxAbs = Math.max(1, ...series.map(p => Math.abs(p.y)));
    const h = 80;
    const mid = h / 2;
    const pts = [{ x: 0, y: 0 }, ...series, { x: width, y: series[series.length - 1].y }];
    return pts.map((p, i) => {
      const y = mid - (p.y / maxAbs) * (mid - 6);
      return `${i === 0 ? "M" : "L"} ${p.x} ${y}`;
    }).join(" ");
  }, [series, width]);

  const invoke = async (op: "insert" | "update" | "delete", body: any) => {
    const { data: r, error } = await supabase.functions.invoke("investor-write", {
      body: { token, op, table: "investor_timeline", ...body },
    });
    if (error) throw error;
    if ((r as any)?.error) throw new Error((r as any).error);
    return (r as any)?.data;
  };

  const handleAdd = async () => {
    if (!draft.title.trim() || !draft.start_date) { toast.error("Title and start date required"); return; }
    setBusy(true);
    try {
      const row: any = {
        kind: draft.kind,
        title: draft.title.trim(),
        start_date: draft.start_date,
        end_date: draft.kind === "transfer_window" && draft.end_date ? draft.end_date : null,
        amount_gbp: draft.amount_gbp === "" ? null : Number(draft.amount_gbp),
        notes: draft.notes.trim() || null,
        goal: draft.goal.trim() || null,
      };
      const saved = await invoke("insert", { row });
      if (saved) onChange([...rows, saved as TimelineRow]);
      setDraft({ kind: "event", title: "", start_date: format(new Date(), "yyyy-MM-dd"), end_date: "", amount_gbp: "", notes: "", goal: "" });
      setAdding(false);
      toast.success("Added");
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally { setBusy(false); }
  };

  const handlePatch = async (id: string, patch: Partial<TimelineRow>) => {
    try {
      const saved = await invoke("update", { id, row: patch });
      onChange(rows.map(r => r.id === id ? { ...r, ...(saved || patch) } : r));
      setSelected(s => s && s.id === id ? { ...s, ...(saved || patch) } : s);
    } catch (e: any) { toast.error(e.message || "Save failed"); }
  };

  const handleDelete = async (id: string) => {
    try {
      await invoke("delete", { id });
      onChange(rows.filter(r => r.id !== id));
      setSelected(s => s && s.id === id ? null : s);
    } catch (e: any) { toast.error(e.message || "Delete failed"); }
  };

  const scrollToToday = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: Math.max(0, todayX - el.clientWidth / 3), behavior: "smooth" });
  };

  useEffect(() => { scrollToToday(); /* eslint-disable-next-line */ }, []);

  // Drag-to-scroll
  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    let isDown = false, startX = 0, startScroll = 0;
    const down = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-node]")) return;
      isDown = true; startX = e.pageX; startScroll = el.scrollLeft;
      el.style.cursor = "grabbing";
    };
    const move = (e: MouseEvent) => { if (!isDown) return; el.scrollLeft = startScroll - (e.pageX - startX); };
    const up = () => { isDown = false; el.style.cursor = "grab"; };
    el.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { el.removeEventListener("mousedown", down); window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);

  const kpiCard = (label: string, value: string, tone: string) => (
    <div className={`rounded-lg border px-3 py-2 ${tone}`}>
      <div className="text-[10px] uppercase tracking-widest opacity-70 font-bbh">{label}</div>
      <div className="text-sm font-bold font-mono mt-0.5">{value}</div>
    </div>
  );

  return (
    <SectionShell icon={CalendarRange} title={`Timeline (${rows.length})`} action={
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => setZoom(z => Math.max(1, z - 1))}>−</Button>
        <span className="text-xs text-muted-foreground font-mono w-10 text-center">{zoom}px/d</span>
        <Button size="sm" variant="ghost" onClick={() => setZoom(z => Math.min(12, z + 1))}>+</Button>
        <Button size="sm" variant="ghost" onClick={scrollToToday}>Today</Button>
        {editable && (
          <Button size="sm" variant={adding ? "secondary" : "default"} onClick={() => setAdding(a => !a)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> {adding ? "Cancel" : "Add entry"}
          </Button>
        )}
      </div>
    }>
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {kpiCard(
          scrubDate ? `Invested by ${format(scrubDate, "d MMM yyyy")}` : "Invested by you",
          gbp((scrubTotals ?? totals).invested),
          "bg-sky-500/10 border-sky-500/30 text-sky-100",
        )}
        {kpiCard(
          scrubDate ? "Recouped so far" : "Recouped (off expected)",
          `${gbp((scrubTotals ?? totals).recouped)}${totals.expected > 0 ? ` / ${gbp(totals.expected * INVESTOR_SHARE)}` : ""}`,
          "bg-emerald-500/10 border-emerald-500/30 text-emerald-100",
        )}
        {kpiCard("Expected (gross total)", gbp(totals.expected), "bg-primary/10 border-primary/30 text-primary")}
        {kpiCard(
          "Net position (owed)",
          (() => { const n = (scrubTotals ?? totals).net; return `${n >= 0 ? "" : "+"}${gbp(Math.abs(n))}`; })(),
          (scrubTotals ?? totals).net <= 0 ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-100" : "bg-rose-500/10 border-rose-500/30 text-rose-100",
        )}
      </div>

      {adding && editable && (
        <Card className="bg-card/60 border-border/60 p-3 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            <Select value={draft.kind} onValueChange={(v: any) => setDraft(d => ({ ...d, kind: v }))}>
              <SelectTrigger className="h-9 md:col-span-1"><SelectValue /></SelectTrigger>
              <SelectContent>{TIMELINE_KINDS.map(k => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
            </Select>
            <Input className="h-9 md:col-span-2" placeholder="Title" value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} />
            <Input className="h-9" type="date" value={draft.start_date} onChange={e => setDraft(d => ({ ...d, start_date: e.target.value }))} />
            {draft.kind === "transfer_window" ? (
              <Input className="h-9" type="date" placeholder="End" value={draft.end_date} onChange={e => setDraft(d => ({ ...d, end_date: e.target.value }))} />
            ) : (
              <Input className="h-9" type="number" placeholder={draft.kind === "investment" ? "£ invested" : draft.kind === "income" || draft.kind === "deal" ? "£ gross (you get 50%)" : "£ amount (optional)"} value={draft.amount_gbp} onChange={e => setDraft(d => ({ ...d, amount_gbp: e.target.value }))} />
            )}
            <Button size="sm" disabled={busy} onClick={handleAdd}>Save</Button>
          </div>
          <Input className="h-9 mt-2" placeholder="Notes (optional)" value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
          <Input className="h-9 mt-2" placeholder="Goal / what should be completed by this point (optional)" value={draft.goal} onChange={e => setDraft(d => ({ ...d, goal: e.target.value }))} />
          {(draft.kind === "income" || draft.kind === "deal") && draft.amount_gbp && !isNaN(Number(draft.amount_gbp)) && (
            <div className="text-xs text-emerald-300 mt-2 font-mono">
              Your share (50%): {gbp(Number(draft.amount_gbp) * INVESTOR_SHARE)}
            </div>
          )}
        </Card>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mb-3 text-[11px] text-muted-foreground">
        {TIMELINE_KINDS.map(k => (
          <div key={k.value} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${k.dot}`} />
            <span>{k.label}</span>
          </div>
        ))}
        <span className="ml-auto opacity-60">Drag to pan · click any node for details</span>
      </div>

      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-12 border border-dashed border-border/40 rounded-lg">
          No entries yet. Add a milestone, investment, deal, or transfer window to begin the journey.
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="relative overflow-x-auto overflow-y-hidden rounded-lg border border-border/40 bg-gradient-to-b from-background/40 to-background/80 select-none"
          style={{ cursor: "grab" }}
        >
          <div
            ref={trackRef}
            className="relative"
            style={{ width: `${width}px`, height: `${laneCount * laneHeight + 200}px` }}
            onMouseMove={(e) => {
              const rect = trackRef.current?.getBoundingClientRect();
              if (!rect) return;
              const x = e.clientX - rect.left;
              if (x >= 0 && x <= width) setScrubX(x);
            }}
            onMouseLeave={() => setScrubX(null)}
          >
            {/* Month grid */}
            {months.map((m, i) => {
              const x = dayToX(m.date);
              const isQuarter = m.date.getMonth() % 3 === 0;
              return (
                <div key={i} className="absolute top-0 bottom-0" style={{ left: `${x}px`, width: `${m.days * zoom}px` }}>
                  <div className={`absolute top-0 bottom-0 left-0 border-l ${isQuarter ? "border-border/40" : "border-border/15"}`} />
                  <div className={`absolute top-1 left-1 text-[10px] font-bbh uppercase tracking-widest ${isQuarter ? "text-foreground/70" : "text-muted-foreground/50"}`}>
                    {format(m.date, m.date.getMonth() === 0 ? "MMM yyyy" : "MMM")}
                  </div>
                </div>
              );
            })}

            {/* Transfer window bands — full-height translucent backgrounds for the date range */}
            {windows.map(r => {
              const x1 = dayToX(new Date(r.start_date));
              const x2 = dayToX(new Date(r.end_date || r.start_date));
              return (
                <button
                  key={r.id}
                  data-node
                  onClick={() => setSelected(r)}
                  className="absolute top-0 bottom-0 bg-primary/10 hover:bg-primary/20 border-x border-primary/30 transition-colors group"
                  style={{ left: `${x1}px`, width: `${Math.max(2, x2 - x1)}px` }}
                  title={r.title}
                >
                  <div className="absolute top-5 left-1 right-1 text-[10px] font-bbh uppercase tracking-widest text-primary/90 truncate text-left pointer-events-none">
                    {r.title} · Transfer window
                  </div>
                </button>
              );
            })}

            {/* Today marker */}
            {todayX >= 0 && todayX <= width && (
              <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `${todayX}px` }}>
                <div className="absolute top-0 bottom-0 w-px bg-primary/80" />
                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-widest">
                  Today
                </div>
              </div>
            )}

            {/* Scrubber — vertical line + date bubble follows the cursor */}
            {scrubX != null && (
              <div className="absolute top-0 bottom-0 pointer-events-none z-20" style={{ left: `${scrubX}px` }}>
                <div className="absolute top-0 bottom-0 w-px bg-foreground/60" />
                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-foreground text-background text-[10px] font-bold uppercase tracking-widest font-mono whitespace-nowrap">
                  {scrubDate ? format(scrubDate, "d MMM yyyy") : ""}
                </div>
              </div>
            )}

            {/* Event nodes */}
            {placed.map(({ row: r, x, lane }) => {
              const m = kindMeta(r.kind);
              const delta = investorDelta(r);
              const top = 28 + lane * laneHeight;
              return (
                <button
                  key={r.id}
                  data-node
                  onClick={() => setSelected(r)}
                  className="absolute group flex items-center gap-1.5 hover:z-30 z-10"
                  style={{ left: `${x}px`, top: `${top}px`, transform: "translateX(-6px)" }}
                >
                  <div className={`w-3 h-3 rounded-full ${m.dot} ring-4 ${m.ring} shadow-md group-hover:scale-125 transition-transform`} />
                  <div className={`px-2 py-0.5 rounded border text-[10px] whitespace-nowrap ${m.badge} max-w-[200px] truncate font-medium`}>
                    {r.title}
                    {delta !== 0 && (
                      <span className="ml-1 font-mono opacity-90">
                        {delta > 0 ? "+" : "−"}{gbp(Math.abs(delta))}
                      </span>
                    )}
                    {r.goal && (
                      <span className="ml-1 opacity-60 italic">· {r.goal}</span>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Cumulative net balance chart */}
            {series.length > 0 && (
              <div className="absolute left-0 right-0 bottom-0" style={{ width: `${width}px`, height: "120px" }}>
                <div className="absolute top-0 left-2 text-[10px] uppercase tracking-widest text-muted-foreground font-bbh">
                  Your cumulative net position (50% share)
                </div>
                <svg width={width} height={120} className="block">
                  <line x1={0} y1={56} x2={width} y2={56} stroke="hsl(var(--border))" strokeDasharray="2,4" />
                  {seriesPath && (
                    <>
                      <path d={`${seriesPath} L ${width} 56 L 0 56 Z`} fill="hsl(var(--primary) / 0.12)" />
                      <path d={seriesPath} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </>
                  )}
                  {series.map((p, i) => {
                    const maxAbs = Math.max(1, ...series.map(s => Math.abs(s.y)));
                    const y = 40 - (p.y / maxAbs) * 34;
                    return <circle key={i} cx={p.x} cy={y} r={3} fill={p.delta > 0 ? "hsl(142 70% 50%)" : "hsl(200 90% 60%)"} stroke="hsl(var(--background))" strokeWidth={1.5} />;
                  })}
                </svg>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail / edit dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (() => {
            const m = kindMeta(selected.kind);
            const delta = investorDelta(selected);
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${m.dot}`} />
                    <Badge variant="outline" className={m.badge}>{m.label}</Badge>
                  </div>
                  <DialogTitle className="text-xl">{selected.title}</DialogTitle>
                  <DialogDescription>
                    {format(new Date(selected.start_date), "EEEE, d MMMM yyyy")}
                    {selected.end_date && ` → ${format(new Date(selected.end_date), "d MMMM yyyy")}`}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  {selected.amount_gbp != null && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md border border-border/50 p-3">
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Gross amount</div>
                        <div className="text-lg font-bold font-mono">{gbp(selected.amount_gbp)}</div>
                      </div>
                      {delta !== 0 && (
                        <div className={`rounded-md border p-3 ${delta > 0 ? "border-emerald-500/40 bg-emerald-500/5" : "border-sky-500/40 bg-sky-500/5"}`}>
                          <div className="text-[10px] uppercase tracking-widest opacity-70">
                            {delta > 0 ? "Your payout (50%)" : "Your outlay"}
                          </div>
                          <div className="text-lg font-bold font-mono">
                            {delta > 0 ? "+" : "−"}{gbp(Math.abs(delta))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {editable ? (
                    <>
                      <div>
                        <Label className="text-xs text-muted-foreground">Title</Label>
                        <Input defaultValue={selected.title}
                          onBlur={e => { if (e.target.value !== selected.title) handlePatch(selected.id, { title: e.target.value }); }} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Kind</Label>
                          <Select value={selected.kind} onValueChange={(v: any) => handlePatch(selected.id, { kind: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{TIMELINE_KINDS.map(k => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Amount (£)</Label>
                          <Input type="number" defaultValue={selected.amount_gbp ?? ""}
                            onBlur={e => {
                              const v = e.target.value === "" ? null : Number(e.target.value);
                              if (v !== selected.amount_gbp) handlePatch(selected.id, { amount_gbp: v });
                            }} />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Start</Label>
                          <Input type="date" defaultValue={selected.start_date}
                            onBlur={e => { if (e.target.value !== selected.start_date) handlePatch(selected.id, { start_date: e.target.value }); }} />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">End (optional)</Label>
                          <Input type="date" defaultValue={selected.end_date ?? ""}
                            onBlur={e => { const v = e.target.value || null; if (v !== selected.end_date) handlePatch(selected.id, { end_date: v }); }} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Notes</Label>
                        <Textarea defaultValue={selected.notes ?? ""}
                          onBlur={e => { const v = e.target.value || null; if (v !== selected.notes) handlePatch(selected.id, { notes: v }); }} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Goal / what should be completed by this point</Label>
                        <Textarea defaultValue={selected.goal ?? ""}
                          onBlur={e => { const v = e.target.value || null; if (v !== selected.goal) handlePatch(selected.id, { goal: v }); }} />
                      </div>
                      <div className="flex justify-end">
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(selected.id)}>
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      {selected.goal && (
                        <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                          <div className="text-[10px] uppercase tracking-widest text-primary/80 mb-1">Goal by this point</div>
                          <div className="text-sm whitespace-pre-wrap">{selected.goal}</div>
                        </div>
                      )}
                      {selected.notes && (
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.notes}</div>
                      )}
                    </>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </SectionShell>
  );
};

// ---------- Main ----------
const InvestorsPortal = () => {
  const { user, token, loading: authLoading, signIn, signOut } = useInvestorSession();
  const [active, setActive] = useState<SectionId | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [sectionPickerOpen, setSectionPickerOpen] = useState(false);
  const [tabOverflowOpen, setTabOverflowOpen] = useState(false);
  const [openTabs, setOpenTabs] = useState<SectionId[]>(() => {
    try { return JSON.parse(localStorage.getItem("investor_open_tabs") || "[]"); } catch { return []; }
  });
  const isMobile = useIsMobile();
  const [data, setData] = useState<{
    players: PlayerRow[]; contracts: ContractRow[]; tasks: TaskRow[];
    staffActivity: StaffActivityRow[]; prospects: ProspectRow[]; spending: SpendingRow[];
    overviewSections: OverviewSectionData[]; overviewCards: OverviewCardData[];
    invoices: InvoiceRow[]; taskNotifications: NotificationRow[];
    projections: ProjectionRow[];
    scoutingReports: any[]; outreachYouth: any[]; outreachPro: any[];
    profiles: ProfileRow[];
    isAdmin: boolean;
    clubContacts: ClubContactRow[];
    playerAnalyses: PlayerAnalysisRow[];
    matchAnalyses: any[];
    timeCategories: OpsCategory[];
    timeItems: OpsItem[];
    priorityCategories: OpsCategory[];
    priorityItems: OpsItem[];
    businessPlan: BusinessPlanRow | null;
    staffMembers: StaffMember[];
    forecast: ForecastRow[];
    forecastSettings: ForecastSettingsRow | null;
    timeline: TimelineRow[];
    updates: { id: string; title: string; body: string | null; achieved_on: string; author_label: string | null; created_at: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const initialisedSessionRef = useRef(false);
  const refreshSeqRef = useRef(0);
  const refreshInFlightRef = useRef(false);
  const refreshPendingRef = useRef(false);

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
    // Default: leave sidebar showing all categories rather than auto-expanding Dashboard.
    setOpenTabs(prev => {
      const next: SectionId[] = prev.includes("overview") ? prev : (["overview", ...prev].slice(0, 12) as SectionId[]);
      localStorage.setItem("investor_open_tabs", JSON.stringify(next));
      return next;
    });
  }, [token]);

  const refresh = async () => {
    if (!token) return;
    if (refreshInFlightRef.current) {
      // Queue a follow-up refresh so writes that finish during an in-flight load still re-fetch
      refreshPendingRef.current = true;
      return;
    }
    const seq = ++refreshSeqRef.current;
    refreshInFlightRef.current = true;
    setLoading(true);
    try {
      const { data: d, error } = await supabase.functions.invoke("investor-data", { body: { token } });
      if (seq !== refreshSeqRef.current) return; // a newer refresh has started, drop this result
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
        projections: (dd.projections || []).map((p: any) => ({
          ...p,
          player_rows: Array.isArray(p.player_rows) ? p.player_rows : [],
          extra_income_rows: Array.isArray(p.extra_income_rows) ? p.extra_income_rows : [],
        })),
        scoutingReports: dd.scoutingReports || [],
        outreachYouth: dd.outreachYouth || [],
        outreachPro: dd.outreachPro || [],
        profiles: dd.profiles || [],
        isAdmin: !!dd.user?.is_admin,
        clubContacts: dd.clubContacts || [],
        playerAnalyses: dd.playerAnalyses || [],
        matchAnalyses: dd.matchAnalyses || [],
        timeCategories: dd.timeCategories || [],
        timeItems: (dd.timeItems || []).map((i: any) => ({ ...i, highlights: Array.isArray(i.highlights) ? i.highlights : [] })),
        priorityCategories: dd.priorityCategories || [],
        priorityItems: (dd.priorityItems || []).map((i: any) => ({ ...i, highlights: Array.isArray(i.highlights) ? i.highlights : [] })),
        businessPlan: dd.businessPlan || null,
        staffMembers: dd.staffMembers || [],
        forecast: dd.forecast || [],
        forecastSettings: dd.forecastSettings || null,
        timeline: dd.timeline || [],
        updates: dd.updates || [],
      });
    } catch (e: any) {
      if (seq === refreshSeqRef.current) toast.error(e.message || "Failed to load");
    } finally {
      refreshInFlightRef.current = false;
      if (seq === refreshSeqRef.current) setLoading(false);
      if (refreshPendingRef.current) {
        refreshPendingRef.current = false;
        // fire-and-forget; do not await inside finally
        setTimeout(() => { refresh(); }, 0);
      }
    }
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

  const savePlayerFinance = async (
    player_id: string,
    patch: {
      expected_commission_annual?: number | null;
      potential_commission_annual?: number | null;
      current_salary_annual?: number | null;
      contract_start_date?: string | null;
      contract_end_date?: string | null;
      salary_cap_overrides?: any;
    },
  ) => {
    try {
      const { data: r, error } = await supabase.functions.invoke("investor-write", {
        body: { token, action: "updatePlayerCommission", payload: { player_id, ...patch } },
      });
      if (error) throw error;
      if ((r as any)?.error) throw new Error((r as any).error);
      toast.success("Saved");
      await refresh();
    } catch (e: any) { toast.error(e.message || "Save failed"); }
  };
  const saveCommission = (player_id: string, expected_commission_annual: number | null) =>
    savePlayerFinance(player_id, { expected_commission_annual });

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
    setActive(sid);
    setExpandedCategory(catId);
    setOpenTabs(prev => {
      const next = prev.includes(sid) ? prev : [...prev, sid].slice(-12);
      localStorage.setItem("investor_open_tabs", JSON.stringify(next));
      return next;
    });
    window.scrollTo({ top: 0 });
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
    <div className="min-h-screen text-foreground relative bg-black">
      {/* Subtle vignette over black — marble lives on the card headers instead */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-gradient-to-b from-black via-black to-zinc-950" />

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
                {(() => {
                  const displayTabs = openTabs.length ? openTabs : (active ? [active] : []);
                  const MAX_VISIBLE = isMobile ? 2 : 3;
                  const visible = displayTabs.slice(0, MAX_VISIBLE);
                  const overflow = displayTabs.slice(MAX_VISIBLE);
                  return (
                    <>
                      {visible.map((tabId) => {
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
                      {overflow.length > 0 && (
                        <button
                          onClick={() => setTabOverflowOpen(true)}
                          className="flex items-center px-2.5 py-1.5 text-xs font-medium rounded-full border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/40 shrink-0"
                          title={`${overflow.length} more open tabs`}
                        >
                          +{overflow.length}
                        </button>
                      )}
                    </>
                  );
                })()}
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
        <DialogContent className="p-0 shadow-lg max-w-[98vw] md:max-w-[90vw] w-full h-[85vh] max-h-[90vh] overflow-hidden">
          <VisuallyHidden>
            <DialogTitle>Open a section</DialogTitle>
            <DialogDescription>Pick a section to open in a new tab.</DialogDescription>
          </VisuallyHidden>
          <SectionGridPicker
            categories={CATEGORIES}
            onSelect={(sectionId, categoryId) => {
              handleSectionClick(sectionId as SectionId, categoryId);
              setSectionPickerOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={tabOverflowOpen} onOpenChange={setTabOverflowOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Open tabs</DialogTitle>
            <DialogDescription>Switch to or close any open tab.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {openTabs.map((tId) => {
              const s = allSections.find(x => x.id === tId);
              if (!s) return null;
              const TIcon = s.icon;
              const isActive = active === tId;
              return (
                <div key={tId} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/50"}`}>
                  <TIcon className="w-4 h-4 shrink-0" />
                  <button
                    className="text-sm flex-1 truncate text-left"
                    onClick={() => { handleSectionClick(tId, s.categoryId); setTabOverflowOpen(false); }}
                  >
                    {s.title}
                  </button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeTab(tId)}>
                    <span className="text-xs">×</span>
                  </Button>
                </div>
              );
            })}
          </div>
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
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isSingleSection) {
                      // Toggle single-section categories: clicking again clears them so all categories reappear.
                      if (hasActive) {
                        setExpandedCategory(null);
                        setActive(null);
                      } else {
                        handleSectionClick(cat.sections[0].id, cat.id);
                      }
                    } else {
                      // Toggle: if already expanded, collapse back to category overview.
                      // Also clear the active section so all categories reappear cleanly.
                      if (isExpanded) {
                        setExpandedCategory(null);
                        if (hasActive) setActive(null);
                      } else {
                        setExpandedCategory(cat.id);
                      }
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

                {isExpanded && !isSingleSection && (
                  <div className="w-full space-y-1 mt-2 pb-16">
                    {cat.sections.map(s => {
                        const SIcon = s.icon;
                        const isActive = active === s.id;
                        return (
                          <button
                            key={s.id}
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
                        );
                    })}
                  </div>
                )}

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
          <div className="container mx-auto px-3 md:px-6 py-4 md:py-6 font-sans normal-case tracking-normal">
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
                <div key={active}>
                  {active === "overview" && <Overview players={data.players} contracts={data.contracts} tasks={data.tasks} staffActivity={data.staffActivity} taskNotifications={data.taskNotifications} spending={data.spending} prospects={data.prospects} invoices={data.invoices} profiles={data.profiles} playerAnalyses={data.playerAnalyses || []} matchAnalyses={data.matchAnalyses || []} projections={data.projections || []} forecast={data.forecast || []} forecastSettings={data.forecastSettings || null} updates={data.updates || []} token={token} unlocked={unlocked} onRefresh={refresh} setActive={(section) => {
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
                  {active === "spending" && <Spending rows={data.spending} write={writeOp} token={token} onRefresh={refresh} />}
                  {active === "commission" && <CommissionForecast players={data.players} invoices={data.invoices} editable={canEdit} onSaveCommission={saveCommission} />}
                  {active === "invoices" && <InvoicesView rows={data.invoices} players={data.players} />}
                  {active === "forecast" && <Forecast spending={data.spending as SpendingRowExt[]} invoices={data.invoices} projections={data.projections} forecast={data.forecast} forecastSettings={data.forecastSettings} editable={canEdit} write={writeOp} />}
                  {active === "projections" && <Projections projections={data.projections} players={data.players} editable={canEdit} write={writeOp} />}
                  {active === "salaryCap" && <SalaryCap players={data.players} invoices={data.invoices} editable={canEdit} onSave={savePlayerFinance} />}
                  {active === "tasks" && <TasksView rows={data.tasks} profiles={data.profiles} />}
                  {active === "activity" && <ActivityFeed rows={data.staffActivity} taskNotifications={data.taskNotifications} profiles={data.profiles} />}
                  {active === "outreach" && <OutreachView youth={data.outreachYouth} pro={data.outreachPro} />}
                  {active === "clubnetwork" && <ClubNetworkView rows={data.clubContacts} />}
                  {active === "timeline" && (
                    <Timeline
                      rows={data.timeline}
                      editable={canEdit}
                      token={token}
                      onChange={(next) => setData(d => d ? { ...d, timeline: next } : d)}
                    />
                  )}
                  {active === "timeManagement" && (
                    <SectionShell icon={Clock} title="Time Management" action={
                      data.isAdmin ? (
                        <span className={`text-[10px] uppercase tracking-widest font-bbh px-2 py-1 rounded border ${unlocked ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground"}`}>
                          {unlocked ? "Edit mode" : "Read-only"}
                        </span>
                      ) : undefined
                    }>
                      <OpsBoard
                        kind="time"
                        categories={data.timeCategories}
                        items={data.timeItems}
                        staffTasks={(data.tasks || []).map(t => ({ id: t.id, title: t.title, description: t.description, category: t.category }))}
                        unlocked={canEdit}
                        token={token}
                        onRefresh={refresh}
                      />
                    </SectionShell>
                  )}
                  {active === "priorities" && (
                    <SectionShell icon={ListOrdered} title="Priorities" action={
                      data.isAdmin ? (
                        <span className={`text-[10px] uppercase tracking-widest font-bbh px-2 py-1 rounded border ${unlocked ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground"}`}>
                          {unlocked ? "Edit mode" : "Read-only"}
                        </span>
                      ) : undefined
                    }>
                      <OpsBoard
                        kind="priority"
                        categories={data.priorityCategories}
                        items={data.priorityItems}
                        staffTasks={(data.tasks || []).map(t => ({ id: t.id, title: t.title, description: t.description, category: t.category }))}
                        unlocked={canEdit}
                        token={token}
                        reorderable
                        defaultCategorySuggestions={["Daily", "Weekly", "Monthly", "Seasonal"]}
                        onRefresh={refresh}
                      />
                    </SectionShell>
                  )}
                  {active === "capacity" && (
                    <SectionShell icon={Activity} title="Capacity">
                      <CapacityPlanner unlocked={canEdit} token={token} onChange={refresh} staffMembers={data.staffMembers} />
                    </SectionShell>
                  )}
                  {active === "execNotes" && (
                    <SectionShell icon={Sparkles} title="Thought Wall">
                      <ExecutiveSupport kind="note" token={token} isAdmin={!!data.isAdmin} unlocked={canEdit} />
                    </SectionShell>
                  )}
                  {active === "execScripts" && (
                    <SectionShell icon={FileText} title="Scripts">
                      <ExecutiveSupport kind="script" token={token} isAdmin={!!data.isAdmin} unlocked={canEdit} />
                    </SectionShell>
                  )}
                  {active === "execWorkflow" && (
                    <SectionShell icon={Network} title="Workflow">
                      <ExecutiveSupport kind="workflow" token={token} isAdmin={!!data.isAdmin} unlocked={canEdit} staffTasks={data.tasks} />
                    </SectionShell>
                  )}
                  {active === "businessPlan" && (
                    <SectionShell icon={Briefcase} title="Business Plan">
                      <BusinessPlanSection investor={{
                        initial: data.businessPlan,
                        token,
                        canEdit,
                        onSaved: refresh,
                      }} />
                    </SectionShell>
                  )}
                </div>
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
      {data?.isAdmin && (
        <button
          onClick={() => setUnlocked(u => !u)}
          title={unlocked ? "Lock edit mode" : "Unlock edit mode"}
          className={`fixed bottom-3 right-3 z-[55] h-8 w-8 rounded-full flex items-center justify-center border backdrop-blur-md transition-opacity ${
            unlocked
              ? "bg-primary/20 border-primary/50 text-primary opacity-90 hover:opacity-100"
              : "bg-background/40 border-border/40 text-muted-foreground opacity-30 hover:opacity-90"
          }`}
        >
          {unlocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
};

export default InvestorsPortal;
