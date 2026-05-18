import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useInvestorSession } from "@/hooks/useInvestorSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  LayoutDashboard, Activity, Wallet, Users, Briefcase, NotebookPen,
  LogOut, Plus, Trash2,
} from "lucide-react";
import { ShaderAnimation } from "@/components/ui/shader-animation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend,
} from "recharts";

type SectionId = "overview" | "activity" | "spending" | "pipeline" | "deals" | "notes";

interface ActivityRow { id: string; occurred_at: string; person: string; category: string; description: string; source: string; }
interface SpendingRow { id: string; spend_date: string; category: string; vendor: string | null; amount_gbp: number; notes: string | null; source: string; }
interface PipelineRow { id: string; name: string; age_group: string | null; country: string | null; status: string; notes: string | null; expected_value_gbp: number | null; }
interface DealRow { id: string; title: string; stage: string; counterparty: string | null; timeline_notes: any[]; value_gbp: number | null; updated_at: string; }
interface NoteRow { id: string; title: string; body: string; kind: string; created_at: string; }

const ACTIVITY_CATEGORIES = ["outreach", "analysis", "admin", "travel", "deal", "communication"];
const SPENDING_CATEGORIES = ["tools", "travel", "staff", "misc"];
const PIPELINE_STATUS = ["lead", "contact", "mandate", "active", "deal_in_progress"];
const DEAL_STAGES = ["initial", "negotiation", "agreement", "closed", "lost"];
const NOTE_KINDS = ["founder", "reflection", "decision"];

const gbp = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);

function playChime() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
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

const LoginGate = ({ onSignIn }: {
  onSignIn: (u: string, p: string) => Promise<void>;
}) => {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try { await onSignIn(u.trim(), p); } catch (err: any) { toast.error(err.message || "Login failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center p-6">
      <div className="absolute inset-0 opacity-60"><ShaderAnimation /></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-black/90 pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="border-white/10 bg-black/70 backdrop-blur-xl p-8 shadow-2xl flex flex-col items-center text-center">
          <img src="/RISEWhite.png" alt="RISE" className="h-12 w-auto object-contain mb-4" />
          <h1 className="text-2xl font-semibold text-white">Investor Portal</h1>
          <p className="text-sm text-white/60 mt-2 mb-6">Restricted access. Authentication required.</p>
          <form onSubmit={submit} className="space-y-4 w-full">
            <div className="space-y-1.5 text-left">
              <Label htmlFor="iu" className="text-white/80">Username</Label>
              <Input id="iu" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" required
                className="bg-white/5 border-white/10 text-white text-center" />
            </div>
            <div className="space-y-1.5 text-left">
              <Label htmlFor="ip" className="text-white/80">Password</Label>
              <Input id="ip" type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required
                className="bg-white/5 border-white/10 text-white text-center" />
            </div>
            <Button
              type="submit"
              disabled={busy}
              style={{ backgroundColor: "#C6A332", color: "#000" }}
              className="w-full hover:opacity-90 font-semibold"
            >
              {busy ? "Authenticating..." : "Enter portal"}
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

const Sidebar = ({ active, setActive, onSignOut, displayName }: {
  active: SectionId; setActive: (s: SectionId) => void; onSignOut: () => void; displayName: string;
}) => {
  const items: Array<{ id: SectionId; label: string; icon: any }> = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "activity", label: "Activity Log", icon: Activity },
    { id: "spending", label: "Spending", icon: Wallet },
    { id: "pipeline", label: "Player Pipeline", icon: Users },
    { id: "deals", label: "Deals", icon: Briefcase },
    { id: "notes", label: "System Notes", icon: NotebookPen },
  ];
  return (
    <aside className="w-60 shrink-0 border-r border-white/5 bg-black/40 flex flex-col">
      <div className="p-6 border-b border-white/5">
        <div className="text-[10px] uppercase tracking-[0.3em] text-[#C6A332]">RISE</div>
        <div className="text-sm font-semibold text-white mt-1">Investor Portal</div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.id;
          return (
            <button key={it.id} onClick={() => setActive(it.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive ? "bg-[#C6A332]/15 text-[#C6A332]" : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}>
              <Icon className="w-4 h-4" />{it.label}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/5">
        <div className="text-xs text-white/40 px-3 mb-2 truncate">{displayName}</div>
        <Button variant="ghost" size="sm" className="w-full justify-start text-white/60 hover:text-white" onClick={onSignOut}>
          <LogOut className="w-4 h-4 mr-2" /> Sign out
        </Button>
      </div>
    </aside>
  );
};

const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <Card className="bg-white/[0.03] border-white/5 p-5">
    <div className="text-xs uppercase tracking-wider text-white/40 mb-2">{label}</div>
    <div className="text-2xl font-semibold text-white">{value}</div>
    {sub && <div className="text-xs text-white/40 mt-1">{sub}</div>}
  </Card>
);

const InvestorsPortal = () => {
  const { user, token, loading: authLoading, signIn, signOut } = useInvestorSession();
  const [transitioning, setTransitioning] = useState(false);
  const [active, setActive] = useState<SectionId>("overview");
  const [data, setData] = useState<{
    activity: ActivityRow[]; spending: SpendingRow[]; pipeline: PipelineRow[]; deals: DealRow[]; notes: NoteRow[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "RISE Investor Portal";
    const meta = document.createElement("meta");
    meta.name = "robots"; meta.content = "noindex,nofollow,noarchive";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  const refresh = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data: d, error } = await supabase.functions.invoke("investor-data", { body: { token } });
      if (error) throw error;
      if ((d as any)?.error) throw new Error((d as any).error);
      const dd = d as any;
      setData({ activity: dd.activity, spending: dd.spending, pipeline: dd.pipeline, deals: dd.deals, notes: dd.notes });
    } catch (e: any) {
      toast.error(e.message || "Failed to load");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (token) refresh(); }, [token]);

  const handleSignIn = async (u: string, p: string) => {
    await signIn(u, p);
    playChime();
    setTransitioning(true);
    setTimeout(() => setTransitioning(false), 1400);
  };

  const writeOp = async (op: "insert" | "update" | "delete", table: string, payload: any) => {
    try {
      const { data: r, error } = await supabase.functions.invoke("investor-write", {
        body: { token, op, table, ...payload },
      });
      if (error) throw error;
      if ((r as any)?.error) throw new Error((r as any).error);
      await refresh();
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  };

  if (authLoading) return <div className="min-h-screen bg-black" />;

  if (!user) return <LoginGate onSignIn={handleSignIn} />;

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <AnimatePresence>
        {transitioning && (
          <motion.div
            initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
            className="fixed inset-0 z-50 bg-black"
          >
            <div className="absolute inset-0 opacity-80"><ShaderAnimation /></div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex h-screen overflow-hidden">
        <Sidebar active={active} setActive={setActive} onSignOut={signOut} displayName={user.display_name} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-8 py-8">
            <motion.div key={active} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              {!data ? (
                <div className="text-white/40">{loading ? "Loading..." : "No data"}</div>
              ) : active === "overview" ? (
                <OverviewSection data={data} />
              ) : active === "activity" ? (
                <ActivitySection rows={data.activity} write={writeOp} />
              ) : active === "spending" ? (
                <SpendingSection rows={data.spending} write={writeOp} />
              ) : active === "pipeline" ? (
                <PipelineSection rows={data.pipeline} write={writeOp} />
              ) : active === "deals" ? (
                <DealsSection rows={data.deals} write={writeOp} />
              ) : (
                <NotesSection rows={data.notes} write={writeOp} />
              )}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
};

const SectionHeader = ({ title, action }: { title: string; action?: React.ReactNode }) => (
  <div className="flex items-end justify-between mb-6">
    <div>
      <div className="text-xs uppercase tracking-[0.3em] text-[#C6A332]">RISE</div>
      <h1 className="text-2xl font-semibold mt-1">{title}</h1>
    </div>
    {action}
  </div>
);

const OverviewSection = ({ data }: { data: any }) => {
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const monthlySpend = (data.spending as SpendingRow[])
    .filter((s) => s.spend_date.startsWith(thisMonth))
    .reduce((sum, s) => sum + Number(s.amount_gbp), 0);
  const activePlayers = (data.pipeline as PipelineRow[]).filter((p) => p.status === "active" || p.status === "mandate").length;
  const activeMandates = (data.pipeline as PipelineRow[]).filter((p) => p.status === "mandate").length;
  const recentActivity = (data.activity as ActivityRow[]).slice(0, 5);

  return (
    <div>
      <SectionHeader title="Overview" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Stat label="This month" value={gbp(monthlySpend)} sub="Total spend" />
        <Stat label="Active players" value={String(activePlayers)} />
        <Stat label="Mandates" value={String(activeMandates)} />
        <Stat label="Pipeline" value={String(data.pipeline.length)} sub="Total tracked" />
      </div>
      <Card className="bg-white/[0.03] border-white/5 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60 mb-4">Recent activity</h2>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-white/40">No activity logged yet.</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((a) => (
              <div key={a.id} className="flex items-start gap-4 text-sm">
                <div className="text-white/40 w-24 shrink-0">{format(new Date(a.occurred_at), "d MMM HH:mm")}</div>
                <Badge variant="outline" className="border-[#C6A332]/40 text-[#C6A332]">{a.category}</Badge>
                <div className="text-white/70 flex-1">{a.description}</div>
                <div className="text-white/40 text-xs">{a.person}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

const AddDialog = ({ trigger, title, children }: { trigger: React.ReactNode; title: string; children: (close: () => void) => React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-[#0f0f0f] border-white/10 text-white max-w-2xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        {children(() => setOpen(false))}
      </DialogContent>
    </Dialog>
  );
};

const ActivitySection = ({ rows, write }: { rows: ActivityRow[]; write: any }) => {
  const [person, setPerson] = useState("");
  const [category, setCategory] = useState("outreach");
  const [description, setDescription] = useState("");

  return (
    <div>
      <SectionHeader title="Activity Log" action={
        <AddDialog title="Log activity" trigger={
          <Button className="bg-[#C6A332] hover:bg-[#b09028] text-black"><Plus className="w-4 h-4 mr-1" /> Log</Button>
        }>{(close) => (
          <div className="space-y-3">
            <div><Label>Person</Label><Input value={person} onChange={(e) => setPerson(e.target.value)} className="bg-white/5 border-white/10" /></div>
            <div><Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>{ACTIVITY_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white/5 border-white/10" /></div>
            <Button className="bg-[#C6A332] text-black" onClick={async () => {
              if (!person || !description) return;
              await write("insert", "investor_activity_log", { row: { person, category, description, occurred_at: new Date().toISOString() } });
              setPerson(""); setDescription(""); close();
            }}>Save</Button>
          </div>
        )}</AddDialog>
      } />
      <Card className="bg-white/[0.03] border-white/5">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-white/40">No activity logged yet.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {rows.map((a) => (
              <div key={a.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                <div className="text-white/40 w-28 shrink-0">{format(new Date(a.occurred_at), "d MMM yyyy HH:mm")}</div>
                <Badge variant="outline" className="border-[#C6A332]/40 text-[#C6A332] capitalize">{a.category}</Badge>
                <div className="text-white/80 flex-1">{a.description}</div>
                <div className="text-white/40 w-32 text-right truncate">{a.person}</div>
                <Button size="icon" variant="ghost" onClick={() => write("delete", "investor_activity_log", { id: a.id })}>
                  <Trash2 className="w-4 h-4 text-white/30 hover:text-red-400" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

const SpendingSection = ({ rows, write }: { rows: SpendingRow[]; write: any }) => {
  const [spend_date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("tools");
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const byCategory = useMemo(() => {
    const m: Record<string, number> = {};
    rows.forEach((r) => { m[r.category] = (m[r.category] || 0) + Number(r.amount_gbp); });
    return Object.entries(m).map(([category, amount]) => ({ category, amount }));
  }, [rows]);

  const byMonth = useMemo(() => {
    const m: Record<string, number> = {};
    rows.forEach((r) => {
      const k = r.spend_date.slice(0, 7);
      m[k] = (m[k] || 0) + Number(r.amount_gbp);
    });
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b)).map(([month, total]) => ({ month, total }));
  }, [rows]);

  const total = rows.reduce((s, r) => s + Number(r.amount_gbp), 0);

  return (
    <div>
      <SectionHeader title="Spending Tracker" action={
        <AddDialog title="Add expense" trigger={
          <Button className="bg-[#C6A332] hover:bg-[#b09028] text-black"><Plus className="w-4 h-4 mr-1" /> Add</Button>
        }>{(close) => (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={spend_date} onChange={(e) => setDate(e.target.value)} className="bg-white/5 border-white/10" /></div>
              <div><Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>{SPENDING_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Vendor</Label><Input value={vendor} onChange={(e) => setVendor(e.target.value)} className="bg-white/5 border-white/10" /></div>
            <div><Label>Amount (GBP)</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-white/5 border-white/10" /></div>
            <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-white/5 border-white/10" /></div>
            <Button className="bg-[#C6A332] text-black" onClick={async () => {
              if (!amount) return;
              await write("insert", "investor_spending", { row: { spend_date, category, vendor, amount_gbp: Number(amount), notes } });
              setVendor(""); setAmount(""); setNotes(""); close();
            }}>Save</Button>
          </div>
        )}</AddDialog>
      } />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Stat label="Total" value={gbp(total)} />
        <Stat label="Entries" value={String(rows.length)} />
        <Stat label="Categories" value={String(byCategory.length)} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="bg-white/[0.03] border-white/5 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/60 mb-4">By category</h3>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={byCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="category" stroke="#ffffff60" />
                <YAxis stroke="#ffffff60" />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #ffffff20" }} />
                <Bar dataKey="amount" fill="#C6A332" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="bg-white/[0.03] border-white/5 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/60 mb-4">Monthly trend</h3>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="month" stroke="#ffffff60" />
                <YAxis stroke="#ffffff60" />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #ffffff20" }} />
                <Line type="monotone" dataKey="total" stroke="#C6A332" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card className="bg-white/[0.03] border-white/5">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-white/40">No expenses recorded.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                <div className="text-white/40 w-24 shrink-0">{format(new Date(r.spend_date), "d MMM yyyy")}</div>
                <Badge variant="outline" className="border-[#C6A332]/40 text-[#C6A332] capitalize">{r.category}</Badge>
                <div className="text-white/80 flex-1 truncate">{r.vendor || "—"}{r.notes ? <span className="text-white/40"> • {r.notes}</span> : null}</div>
                <div className="text-white font-medium w-24 text-right">{gbp(Number(r.amount_gbp))}</div>
                <Button size="icon" variant="ghost" onClick={() => write("delete", "investor_spending", { id: r.id })}>
                  <Trash2 className="w-4 h-4 text-white/30 hover:text-red-400" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

const PipelineSection = ({ rows, write }: { rows: PipelineRow[]; write: any }) => {
  const [name, setName] = useState("");
  const [age_group, setAge] = useState("");
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState("lead");
  const [notes, setNotes] = useState("");
  const [val, setVal] = useState("");

  return (
    <div>
      <SectionHeader title="Player Pipeline" action={
        <AddDialog title="Add player" trigger={
          <Button className="bg-[#C6A332] hover:bg-[#b09028] text-black"><Plus className="w-4 h-4 mr-1" /> Add</Button>
        }>{(close) => (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/10" /></div>
              <div><Label>Age group</Label><Input value={age_group} onChange={(e) => setAge(e.target.value)} className="bg-white/5 border-white/10" placeholder="e.g. U18" /></div>
              <div><Label>Country/region</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} className="bg-white/5 border-white/10" /></div>
              <div><Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>{PIPELINE_STATUS.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Expected value (GBP, optional)</Label><Input type="number" value={val} onChange={(e) => setVal(e.target.value)} className="bg-white/5 border-white/10" /></div>
            <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-white/5 border-white/10" /></div>
            <Button className="bg-[#C6A332] text-black" onClick={async () => {
              if (!name) return;
              await write("insert", "investor_pipeline", { row: {
                name, age_group: age_group || null, country: country || null, status, notes: notes || null,
                expected_value_gbp: val ? Number(val) : null,
              } });
              setName(""); setAge(""); setCountry(""); setStatus("lead"); setNotes(""); setVal(""); close();
            }}>Save</Button>
          </div>
        )}</AddDialog>
      } />
      <Card className="bg-white/[0.03] border-white/5 overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-white/40">No players in pipeline.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-white/50 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Age</th>
                <th className="px-5 py-3 text-left">Country</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-right">Expected</th>
                <th className="px-5 py-3 text-left">Notes</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3 font-medium">{p.name}</td>
                  <td className="px-5 py-3 text-white/60">{p.age_group || "—"}</td>
                  <td className="px-5 py-3 text-white/60">{p.country || "—"}</td>
                  <td className="px-5 py-3"><Badge variant="outline" className="border-[#C6A332]/40 text-[#C6A332] capitalize">{p.status.replace(/_/g, " ")}</Badge></td>
                  <td className="px-5 py-3 text-right text-white/80">{gbp(p.expected_value_gbp)}</td>
                  <td className="px-5 py-3 text-white/50 max-w-xs truncate">{p.notes || "—"}</td>
                  <td className="px-5 py-3"><Button size="icon" variant="ghost" onClick={() => write("delete", "investor_pipeline", { id: p.id })}>
                    <Trash2 className="w-4 h-4 text-white/30 hover:text-red-400" />
                  </Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};

const DealsSection = ({ rows, write }: { rows: DealRow[]; write: any }) => {
  const [title, setTitle] = useState("");
  const [stage, setStage] = useState("initial");
  const [counterparty, setCp] = useState("");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");

  return (
    <div>
      <SectionHeader title="Deals & Opportunities" action={
        <AddDialog title="Add deal" trigger={
          <Button className="bg-[#C6A332] hover:bg-[#b09028] text-black"><Plus className="w-4 h-4 mr-1" /> Add</Button>
        }>{(close) => (
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white/5 border-white/10" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Stage</Label>
                <Select value={stage} onValueChange={setStage}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>{DEAL_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Counterparty</Label><Input value={counterparty} onChange={(e) => setCp(e.target.value)} className="bg-white/5 border-white/10" /></div>
            </div>
            <div><Label>Value (GBP)</Label><Input type="number" value={value} onChange={(e) => setValue(e.target.value)} className="bg-white/5 border-white/10" /></div>
            <div><Label>First note</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} className="bg-white/5 border-white/10" /></div>
            <Button className="bg-[#C6A332] text-black" onClick={async () => {
              if (!title) return;
              const timeline = note ? [{ at: new Date().toISOString(), note }] : [];
              await write("insert", "investor_deals", { row: { title, stage, counterparty: counterparty || null, value_gbp: value ? Number(value) : null, timeline_notes: timeline } });
              setTitle(""); setCp(""); setValue(""); setNote(""); close();
            }}>Save</Button>
          </div>
        )}</AddDialog>
      } />
      {rows.length === 0 ? (
        <Card className="bg-white/[0.03] border-white/5 p-8 text-center text-white/40">No deals in progress.</Card>
      ) : (
        <div className="space-y-3">
          {rows.map((d) => (
            <Card key={d.id} className="bg-white/[0.03] border-white/5 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{d.title}</h3>
                    <Badge variant="outline" className="border-[#C6A332]/40 text-[#C6A332] capitalize">{d.stage}</Badge>
                  </div>
                  <div className="text-sm text-white/50 mt-1">
                    {d.counterparty || "—"}{d.value_gbp ? ` • ${gbp(Number(d.value_gbp))}` : ""}
                  </div>
                  {Array.isArray(d.timeline_notes) && d.timeline_notes.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm text-white/70">
                      {d.timeline_notes.map((t: any, i: number) => (
                        <li key={i}>
                          <span className="text-white/40">{t.at ? format(new Date(t.at), "d MMM") : ""} · </span>
                          {t.note}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Button size="icon" variant="ghost" onClick={() => write("delete", "investor_deals", { id: d.id })}>
                  <Trash2 className="w-4 h-4 text-white/30 hover:text-red-400" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const NotesSection = ({ rows, write }: { rows: NoteRow[]; write: any }) => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState("founder");

  return (
    <div>
      <SectionHeader title="System Notes & Strategy" action={
        <AddDialog title="Add note" trigger={
          <Button className="bg-[#C6A332] hover:bg-[#b09028] text-black"><Plus className="w-4 h-4 mr-1" /> Add</Button>
        }>{(close) => (
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white/5 border-white/10" /></div>
            <div><Label>Type</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>{NOTE_KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Body</Label><Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} className="bg-white/5 border-white/10" /></div>
            <Button className="bg-[#C6A332] text-black" onClick={async () => {
              if (!title || !body) return;
              await write("insert", "investor_notes", { row: { title, body, kind } });
              setTitle(""); setBody(""); setKind("founder"); close();
            }}>Save</Button>
          </div>
        )}</AddDialog>
      } />
      {rows.length === 0 ? (
        <Card className="bg-white/[0.03] border-white/5 p-8 text-center text-white/40">No notes yet.</Card>
      ) : (
        <div className="space-y-3">
          {rows.map((n) => (
            <Card key={n.id} className="bg-white/[0.03] border-white/5 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold">{n.title}</h3>
                    <Badge variant="outline" className="border-[#C6A332]/40 text-[#C6A332] capitalize">{n.kind}</Badge>
                    <span className="text-xs text-white/40">{format(new Date(n.created_at), "d MMM yyyy")}</span>
                  </div>
                  <p className="mt-2 text-sm text-white/70 whitespace-pre-wrap">{n.body}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => write("delete", "investor_notes", { id: n.id })}>
                  <Trash2 className="w-4 h-4 text-white/30 hover:text-red-400" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default InvestorsPortal;