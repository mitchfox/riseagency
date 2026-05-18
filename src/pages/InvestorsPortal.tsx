import { useEffect, useMemo, useState } from "react";
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
  Network, TrendingUp, LogOut, Search, Plus, Trash2, Lock, Unlock, Star, Eye, Calendar, Target,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import { InvestmentOverview, type OverviewCardData, type OverviewSectionData } from "@/components/investor/InvestmentOverview";
import blackMarble from "@/assets/black-marble-bg.png";
import smudgedMarble from "@/assets/smudged-marble-overlay.png";

type SectionId =
  | "overview" | "investment"
  | "represented" | "mandated" | "previously"
  | "prospects" | "playerdatabase"
  | "contracts"
  | "spending" | "commission"
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
}
interface TaskRow {
  id: string; title: string; description: string | null; category: string | null;
  priority: string | null; completed: boolean; deadline: string | null; created_at: string;
  updated_at: string; last_completed_at: string | null; assigned_to: string[] | null;
  image_url: string | null; display_order: number | null;
  is_recurring: boolean | null; recurrence_label: string | null;
}
interface StaffActivityRow {
  id: string; user_email: string | null; action: string; entity_type: string;
  entity_id: string | null; entity_name: string | null; details: any; created_at: string;
}
interface ProspectRow {
  id: string; name: string; stage: string | null; position: string | null;
  nationality: string | null; date_of_birth: string | null; age: number | null;
  current_club: string | null; profile_image_url: string | null;
  probability_weight: number | null; projected_revenue: number | null;
  revenue_currency: string | null; notes: string | null; last_contact_date: string | null;
  updated_at: string;
}
interface SpendingRow { id: string; spend_date: string; category: string; vendor: string | null; amount_gbp: number; notes: string | null; }

const gbp = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(Number(n));

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

// ---------- Player card (matches staff PlayerList aesthetic) ----------
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

const PlayerCard = ({ p }: { p: PlayerRow }) => {
  const flag = p.nationality ? getCountryFlagUrl(p.nationality) : null;
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
        <div className="text-right space-y-1 shrink-0">
          <ContractBadge end={p.contract_end_date} />
          <div className="text-sm font-bbh text-primary">{gbp(p.expected_commission_annual)}<span className="text-[10px] text-muted-foreground"> /yr</span></div>
        </div>
      </div>
    </Card>
  );
};

const ProspectCard = ({ p }: { p: ProspectRow }) => {
  const flag = p.nationality ? getCountryFlagUrl(p.nationality) : null;
  return (
    <Card className="bg-card/60 border-border/60 p-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border border-primary/20">
          <AvatarImage src={p.profile_image_url || undefined} alt={p.name} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bbh">{p.name?.[0] || "?"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-bbh uppercase text-sm truncate">{p.name}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
            {flag && <img src={flag} alt="" className="w-3 h-2 object-cover rounded-sm" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
            <span>{p.position || "—"}</span>
            {p.age && <span>• {p.age}</span>}
            {p.current_club && <span className="truncate"> • {p.current_club}</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          {p.projected_revenue && <div className="text-xs font-bbh text-primary">{gbp(p.projected_revenue)}</div>}
          {p.probability_weight != null && <div className="text-[10px] text-muted-foreground">{p.probability_weight}%</div>}
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

const Roster = ({ players, status }: { players: PlayerRow[]; status: string }) => {
  const rows = players.filter(p => p.representation_status === status);
  const label = status === "represented" ? "Represented" : status === "mandated" ? "Mandated" : "Previously Mandated";
  return (
    <SectionShell icon={UserCheck} title={`${label} (${rows.length})`}>
      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">No {label.toLowerCase()} players.</div>
      ) : (
        <div className="space-y-2">{rows.map(p => <PlayerCard key={p.id} p={p} />)}</div>
      )}
    </SectionShell>
  );
};

const ContractsView = ({ rows }: { rows: ContractRow[] }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rows.find(r => r.id === selectedId) || rows[0] || null;
  const url = selected ? (selected.completed_pdf_url || selected.locked_file_url || selected.file_url) : null;
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
                  {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Open in new tab</a>}
                </div>
                {url ? (
                  <iframe src={url} className="flex-1 w-full bg-white" title={selected.title} />
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

const TasksView = ({ rows }: { rows: TaskRow[] }) => {
  // Mirror My Tasks: group by priority, then by category. Exclude completed.
  const live = rows.filter(t => !t.completed);
  const priorities = ["urgent", "high", "medium", "low"];
  const byPriority = priorities.map(pr => ({
    priority: pr,
    tasks: live.filter(t => (t.priority || "medium").toLowerCase() === pr).sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999)),
  })).filter(g => g.tasks.length > 0);
  // anything else
  const other = live.filter(t => !priorities.includes((t.priority || "medium").toLowerCase()));
  if (other.length > 0) byPriority.push({ priority: "other", tasks: other });

  const toneFor = (pr: string) =>
    pr === "urgent" ? "border-red-500/60 text-red-300 bg-red-500/10"
    : pr === "high" ? "border-amber-500/60 text-amber-300 bg-amber-500/10"
    : pr === "medium" ? "border-primary/40 text-primary bg-primary/5"
    : "border-border text-muted-foreground bg-muted/20";

  return (
    <SectionShell icon={CheckSquare} title="My Tasks — Live View">
      {live.length === 0 ? (
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

const ActivityFeed = ({ rows }: { rows: StaffActivityRow[] }) => {
  const [limit, setLimit] = useState(80);
  const shown = rows.slice(0, limit);
  const tone: Record<string, string> = {
    created: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
    updated: "border-blue-500/40 text-blue-300 bg-blue-500/10",
    deleted: "border-red-500/40 text-red-300 bg-red-500/10",
  };
  return (
    <SectionShell icon={Activity} title="Activity Feed">
      {shown.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">No activity logged.</div>
      ) : (
        <div className="space-y-1.5">
          {shown.map(e => (
            <div key={e.id} className="flex items-start gap-3 px-3 py-2 rounded border border-border/40 bg-card/40 hover:border-primary/30 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium truncate">{e.user_email || "system"}</span>
                  <Badge variant="outline" className={`text-[10px] ${tone[e.action] || "border-border text-muted-foreground"}`}>{e.action}</Badge>
                  <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">{e.entity_type}</Badge>
                  {e.entity_name && <span className="text-xs text-muted-foreground truncate">{e.entity_name}</span>}
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</span>
            </div>
          ))}
          {limit < rows.length && (
            <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => setLimit(l => l + 80)}>Load more</Button>
          )}
        </div>
      )}
    </SectionShell>
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

const CommissionForecast = ({ players }: { players: PlayerRow[] }) => {
  const live = players.filter(p => p.representation_status === "represented" || p.representation_status === "mandated");
  const total = live.reduce((s, p) => s + Number(p.expected_commission_annual || 0), 0);
  const withSalary = live.filter(p => p.current_salary_annual);
  const totalSalary = withSalary.reduce((s, p) => s + Number(p.current_salary_annual || 0), 0);
  const sorted = [...live].sort((a, b) => Number(b.expected_commission_annual || 0) - Number(a.expected_commission_annual || 0));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat label="Annual Commission" value={gbp(total)} sub={`${live.length} live players`} />
        <Stat label="Aggregate Player Salaries" value={gbp(totalSalary)} sub={`${withSalary.length} with disclosed wages`} />
        <Stat label="12-Month Projection" value={gbp(total)} sub="Based on current contracts" />
      </div>
      <SectionShell icon={TrendingUp} title="Commission Breakdown By Player">
        {sorted.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">No commission data yet. Staff can set this in Players → List Order / edit.</div>
        ) : (
          <div className="space-y-2">{sorted.map(p => <PlayerCard key={p.id} p={p} />)}</div>
        )}
      </SectionShell>
    </div>
  );
};

const Prospects = ({ rows }: { rows: ProspectRow[] }) => {
  const stages = Array.from(new Set(rows.map(r => r.stage || "Unknown")));
  return (
    <SectionShell icon={Target} title={`Prospect Board (${rows.length})`}>
      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">No prospects.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stages.map(s => {
            const list = rows.filter(r => (r.stage || "Unknown") === s);
            return (
              <div key={s} className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] uppercase tracking-widest font-bbh px-2 py-1 rounded border border-primary/40 text-primary bg-primary/5">{s}</span>
                  <span className="text-xs text-muted-foreground">{list.length}</span>
                </div>
                {list.map(p => <ProspectCard key={p.id} p={p} />)}
              </div>
            );
          })}
        </div>
      )}
    </SectionShell>
  );
};

const PlayerDatabase = ({ players }: { players: PlayerRow[] }) => {
  const [q, setQ] = useState("");
  const filtered = players.filter(p => !q ||
    p.name.toLowerCase().includes(q.toLowerCase()) ||
    (p.position || "").toLowerCase().includes(q.toLowerCase()) ||
    (p.club || "").toLowerCase().includes(q.toLowerCase()) ||
    (p.nationality || "").toLowerCase().includes(q.toLowerCase())
  );
  return (
    <SectionShell icon={Network} title={`Player Database (${filtered.length})`} action={
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} className="h-8 w-48" />
      </div>
    }>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {filtered.map(p => <PlayerCard key={p.id} p={p} />)}
      </div>
    </SectionShell>
  );
};

const Overview = ({ players, contracts, tasks, staffActivity, spending, prospects, setActive }: {
  players: PlayerRow[]; contracts: ContractRow[]; tasks: TaskRow[]; staffActivity: StaffActivityRow[];
  spending: SpendingRow[]; prospects: ProspectRow[]; setActive: (s: SectionId) => void;
}) => {
  const represented = players.filter(p => p.representation_status === "represented").length;
  const mandated = players.filter(p => p.representation_status === "mandated").length;
  const commission = players
    .filter(p => p.representation_status === "represented" || p.representation_status === "mandated")
    .reduce((s, p) => s + Number(p.expected_commission_annual || 0), 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlySpend = spending.filter(s => s.spend_date.startsWith(thisMonth)).reduce((s, r) => s + Number(r.amount_gbp), 0);
  const activeTasks = tasks.filter(t => !t.completed).length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => setActive("commission")} className="text-left"><Stat label="Annual Commission" value={gbp(commission)} sub={`${represented + mandated} live players`} /></button>
        <button onClick={() => setActive("represented")} className="text-left"><Stat label="Represented" value={String(represented)} sub="Active mandates" /></button>
        <button onClick={() => setActive("prospects")} className="text-left"><Stat label="Prospects" value={String(prospects.length)} sub="In pipeline" /></button>
        <button onClick={() => setActive("spending")} className="text-left"><Stat label="This Month Spend" value={gbp(monthlySpend)} sub="Running total" /></button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <button onClick={() => setActive("tasks")} className="text-left">
          <SectionShell icon={CheckSquare} title={`Live Tasks (${activeTasks})`}>
            <div className="text-sm text-muted-foreground">Click to view all staff tasks currently in progress.</div>
          </SectionShell>
        </button>
        <button onClick={() => setActive("contracts")} className="text-left">
          <SectionShell icon={FileSignature} title={`Contracts (${contracts.length})`}>
            <div className="text-sm text-muted-foreground">{contracts.filter(c => c.locked_at).length} locked • {contracts.filter(c => c.owner_signed_at && !c.locked_at).length} signed • {contracts.filter(c => !c.owner_signed_at && !c.locked_at).length} draft</div>
          </SectionShell>
        </button>
      </div>
      <SectionShell icon={Activity} title="Recent Activity">
        <div className="space-y-1.5">
          {staffActivity.slice(0, 8).map(e => (
            <div key={e.id} className="flex items-center gap-3 text-sm">
              <span className="text-xs text-muted-foreground w-28 shrink-0">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</span>
              <Badge variant="outline" className="text-[10px]">{e.action}</Badge>
              <span className="text-muted-foreground truncate">{e.entity_type}</span>
              <span className="truncate flex-1">{e.entity_name || "—"}</span>
            </div>
          ))}
          {staffActivity.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">No activity yet.</div>}
        </div>
      </SectionShell>
    </div>
  );
};

// ---------- Main ----------
const InvestorsPortal = () => {
  const { user, token, loading: authLoading, signIn, signOut } = useInvestorSession();
  const [active, setActive] = useState<SectionId>("overview");
  const [expandedCategory, setExpandedCategory] = useState<string | null>("dash");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const [data, setData] = useState<{
    players: PlayerRow[]; contracts: ContractRow[]; tasks: TaskRow[];
    staffActivity: StaffActivityRow[]; prospects: ProspectRow[]; spending: SpendingRow[];
    overviewSections: OverviewSectionData[]; overviewCards: OverviewCardData[];
    isAdmin: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  // Auto-lock on every load/refresh
  useEffect(() => { setUnlocked(false); }, [user?.id]);

  useEffect(() => {
    document.title = "RISE Investor Portal";
    const meta = document.createElement("meta");
    meta.name = "robots"; meta.content = "noindex,nofollow,noarchive";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  useEffect(() => { if (isMobile) setSidebarCollapsed(true); }, [isMobile]);

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

  const handleSignIn = async (u: string, p: string) => { await signIn(u, p); playChime(); };

  if (authLoading) return <div className="min-h-screen bg-background" />;
  if (!user) return <LoginGate onSignIn={handleSignIn} />;

  const handleSectionClick = (sid: SectionId, catId: string) => {
    setActive(sid); setExpandedCategory(catId);
  };

  return (
    <div className="min-h-screen text-foreground relative">
      {/* Black marble background */}
      <div className="fixed inset-0 pointer-events-none -z-10"
        style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.25 }} />

      {/* Header — mirrors staff */}
      <header className={`fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border pwa-safe-top transition-all duration-200 ${headerCollapsed ? "h-10" : ""}`}>
        <div className={`flex items-center ${headerCollapsed ? "h-10" : "h-16"} px-4 relative`}>
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer"
            onClick={() => setHeaderCollapsed(p => !p)}
            title={headerCollapsed ? "Show header" : "Hide header"}
          >
            <img src="/RISEWhite.png" alt="RISE" className={`${headerCollapsed ? "h-6" : "h-9"} w-auto transition-all duration-200`} />
          </div>
          {!headerCollapsed && (
            <>
              <div className="ml-auto flex items-center gap-2">
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

      {/* Layout */}
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar — mirrors staff vertical icon nav */}
        <aside className={`fixed ${headerCollapsed ? "top-10" : isMobile ? "top-14" : "top-16"} left-0 bottom-0 border-r border-border bg-muted/30 backdrop-blur-sm flex flex-col items-start py-4 pb-20 gap-2 overflow-y-auto scrollbar-thin z-10 transition-all duration-300 ${
          sidebarCollapsed ? "w-0 border-0 opacity-0 pointer-events-none" : isMobile ? "w-14" : "w-14 md:w-24"
        }`}>
          {CATEGORIES.map((cat, idx) => {
            const CatIcon = cat.icon;
            const isExpanded = expandedCategory === cat.id;
            const hasActive = cat.sections.some(s => s.id === active);
            const single = cat.sections.length === 1;
            const shouldShow = !expandedCategory || expandedCategory === cat.id;
            if (!shouldShow) return null;
            return (
              <div key={cat.id} className="w-full">
                <button
                  onClick={() => {
                    if (single) { handleSectionClick(cat.sections[0].id, cat.id); }
                    else setExpandedCategory(isExpanded ? null : cat.id);
                  }}
                  className={`group w-full rounded-lg flex flex-col items-center justify-center py-2 md:py-3 px-1 md:px-2 transition-all hover:bg-primary/20 ${
                    hasActive || isExpanded ? "bg-gradient-to-br from-primary/80 to-primary shadow-lg" : ""
                  }`}
                >
                  <CatIcon className={`w-5 h-5 md:w-6 md:h-6 mb-0.5 md:mb-1 ${hasActive || isExpanded ? "text-primary-foreground" : ""}`} />
                  <span className={`text-[6px] sm:text-[7px] leading-tight text-center px-0.5 font-medium uppercase tracking-tight ${hasActive || isExpanded ? "text-primary-foreground" : "text-muted-foreground"}`}>
                    {cat.title.split(" ").map((w, i) => <span key={i} className="block">{w}</span>)}
                  </span>
                </button>
                <AnimatePresence>
                  {isExpanded && !single && (
                    <motion.div className="w-full space-y-1 mt-2 pb-4"
                      initial="hidden" animate="show" exit="hidden"
                      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}>
                      {cat.sections.map(s => {
                        const SIcon = s.icon;
                        const isActive = active === s.id;
                        return (
                          <motion.div key={s.id} variants={{ hidden: { x: -10, opacity: 0 }, show: { x: 0, opacity: 1 } }}>
                            <button onClick={() => handleSectionClick(s.id, cat.id)}
                              className={`group relative w-full rounded-lg flex flex-col items-center justify-center py-1.5 md:py-2 px-1 transition-all ${
                                isActive ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-primary/10"
                              }`}>
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

        {/* Collapse toggle */}
        <button onClick={() => setSidebarCollapsed(c => !c)}
          className={`fixed left-0 top-1/2 -translate-y-1/2 z-20 bg-primary/20 hover:bg-primary/40 text-primary px-1 py-3 rounded-r ${sidebarCollapsed ? "" : isMobile ? "ml-14" : "ml-14 md:ml-24"}`}>
          {sidebarCollapsed ? "›" : "‹"}
        </button>

        {/* Main */}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden relative z-10 transition-all duration-300 ${headerCollapsed ? "pt-14" : "pt-20"} ${
          sidebarCollapsed ? "ml-0" : isMobile ? "ml-14" : "ml-14 md:ml-24"
        } ${isMobile ? "pb-[70px]" : ""}`}>
          <div className="container mx-auto px-3 md:px-6 py-4 md:py-6 font-agrandir">
            {loading && !data ? (
              <div className="text-muted-foreground text-center py-12">Loading...</div>
            ) : !data ? null : (
              <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                {active === "overview" && <Overview players={data.players} contracts={data.contracts} tasks={data.tasks} staffActivity={data.staffActivity} spending={data.spending} prospects={data.prospects} setActive={setActive} />}
                {active === "investment" && (
                  <SectionShell icon={Sparkles} title="Investment Overview" action={
                    data.isAdmin ? (
                      <span className={`text-[10px] uppercase tracking-widest font-bbh px-2 py-1 rounded border ${unlocked ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground"}`}>
                        {unlocked ? "Edit mode" : "Read-only"}
                      </span>
                    ) : undefined
                  }>
                    <InvestmentOverview
                      sections={data.overviewSections}
                      cards={data.overviewCards}
                      unlocked={unlocked && data.isAdmin}
                      token={token}
                      onRefresh={refresh}
                    />
                  </SectionShell>
                )}
                {active === "represented" && <Roster players={data.players} status="represented" />}
                {active === "mandated" && <Roster players={data.players} status="mandated" />}
                {active === "previously" && <Roster players={data.players} status="previously_mandated" />}
                {active === "prospects" && <Prospects rows={data.prospects} />}
                {active === "playerdatabase" && <PlayerDatabase players={data.players} />}
                {active === "contracts" && <ContractsView rows={data.contracts} />}
                {active === "spending" && <Spending rows={data.spending} write={writeOp} />}
                {active === "commission" && <CommissionForecast players={data.players} />}
                {active === "tasks" && <TasksView rows={data.tasks} />}
                {active === "activity" && <ActivityFeed rows={data.staffActivity} />}
              </motion.div>
            )}
          </div>
        </main>
      </div>

      {/* Hidden lock toggle (admin only) — bottom right, semi-hidden */}
      {data?.isAdmin && (
        <button
          onClick={() => setUnlocked(u => !u)}
          title={unlocked ? "Lock edit mode" : "Unlock edit mode"}
          className={`fixed bottom-3 right-3 z-50 p-2 rounded-full border border-border/40 bg-background/60 backdrop-blur transition-opacity ${unlocked ? "opacity-90 border-primary text-primary" : "opacity-20 hover:opacity-100"}`}
        >
          {unlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
        </button>
      )}
      {unlocked && data?.isAdmin && (
        <div className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent z-[60] pointer-events-none" />
      )}
    </div>
  );
};

export default InvestorsPortal;
