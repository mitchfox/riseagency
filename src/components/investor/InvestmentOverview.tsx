import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Pencil, Plus, Trash2, Check, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface OverviewMetric { label: string; value: string; unit?: string }
export interface OverviewCardData {
  id: string;
  section_id: string | null;
  title: string;
  summary: string | null;
  content: string | null;
  metrics: OverviewMetric[];
  tags: string[];
  display_order: number;
}
export interface OverviewSectionData {
  id: string;
  title: string;
  display_order: number;
}

interface Props {
  sections: OverviewSectionData[];
  cards: OverviewCardData[];
  unlocked: boolean;
  token: string | null;
  onRefresh: () => Promise<void> | void;
}

async function callWrite(token: string | null, action: string, payload: any) {
  if (!token) throw new Error("Not authenticated");
  const { data, error } = await supabase.functions.invoke("investor-overview-write", {
    body: { token, action, payload },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
}

const MetricChip = ({ m }: { m: OverviewMetric }) => (
  <div className="flex flex-col items-end px-2.5 py-1 rounded border border-primary/30 bg-primary/5">
    <div className="text-[9px] uppercase tracking-wider text-primary/70 font-bbh leading-none">{m.label}</div>
    <div className="text-sm font-bbh text-primary leading-tight">{m.value}{m.unit ? <span className="text-[10px] text-primary/70 ml-0.5">{m.unit}</span> : null}</div>
  </div>
);

const CardEditor = ({ card, sections, token, onDone, onCancel }: {
  card: Partial<OverviewCardData>;
  sections: OverviewSectionData[];
  token: string | null;
  onDone: () => void;
  onCancel: () => void;
}) => {
  const [title, setTitle] = useState(card.title || "");
  const [summary, setSummary] = useState(card.summary || "");
  const [content, setContent] = useState(card.content || "");
  const [section_id, setSectionId] = useState(card.section_id || sections[0]?.id || "");
  const [metrics, setMetrics] = useState<OverviewMetric[]>(card.metrics || []);
  const [tags, setTags] = useState<string>(((card.tags) || []).join(", "));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!title.trim()) { toast.error("Title required"); return; }
    setBusy(true);
    try {
      await callWrite(token, "upsertCard", {
        id: card.id, section_id, title, summary, content,
        metrics: metrics.filter(m => m.label && m.value),
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        display_order: card.display_order ?? 999,
      });
      toast.success("Saved");
      onDone();
    } catch (e: any) { toast.error(e.message || "Save failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-3 p-4 border border-primary/40 rounded-md bg-primary/5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Card title" />
        <select value={section_id || ""} onChange={e => setSectionId(e.target.value)}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm">
          {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </div>
      <Input value={summary} onChange={e => setSummary(e.target.value)} placeholder="One-line summary (shown collapsed)" />
      <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Full expanded content" rows={5} />
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bbh">KPI Metrics</div>
        {metrics.map((m, i) => (
          <div key={i} className="flex gap-2">
            <Input className="flex-1" value={m.label} onChange={e => { const c = [...metrics]; c[i] = { ...c[i], label: e.target.value }; setMetrics(c); }} placeholder="Label" />
            <Input className="w-32" value={m.value} onChange={e => { const c = [...metrics]; c[i] = { ...c[i], value: e.target.value }; setMetrics(c); }} placeholder="Value" />
            <Input className="w-24" value={m.unit || ""} onChange={e => { const c = [...metrics]; c[i] = { ...c[i], unit: e.target.value }; setMetrics(c); }} placeholder="Unit" />
            <Button size="icon" variant="ghost" onClick={() => setMetrics(metrics.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => setMetrics([...metrics, { label: "", value: "", unit: "" }])}><Plus className="w-3 h-3 mr-1" />Metric</Button>
      </div>
      <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="tags, comma, separated" />
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={busy}><X className="w-4 h-4 mr-1" />Cancel</Button>
        <Button onClick={save} disabled={busy} className="bg-primary text-primary-foreground"><Check className="w-4 h-4 mr-1" />Save</Button>
      </div>
    </div>
  );
};

const OverviewCard = ({ card, idx, unlocked, sections, token, onChanged }: {
  card: OverviewCardData;
  idx: number;
  unlocked: boolean;
  sections: OverviewSectionData[];
  token: string | null;
  onChanged: () => Promise<void> | void;
}) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <CardEditor card={card} sections={sections} token={token}
      onDone={async () => { setEditing(false); await onChanged(); }}
      onCancel={() => setEditing(false)} />;
  }

  const del = async () => {
    if (!confirm(`Delete "${card.title}"?`)) return;
    try { await callWrite(token, "deleteCard", { id: card.id }); toast.success("Deleted"); await onChanged(); }
    catch (e: any) { toast.error(e.message || "Delete failed"); }
  };

  return (
    <motion.div layout initial={false}
      className="relative overflow-hidden rounded-md border border-primary/20 bg-card hover:border-primary/40 transition-colors">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-4 text-left px-4 md:px-5 py-4 hover:bg-primary/5 transition-colors"
      >
        {unlocked && <GripVertical className="w-4 h-4 text-muted-foreground/40 mt-1 shrink-0" />}
        <div className="font-bbh text-2xl md:text-3xl text-primary/60 leading-none w-9 shrink-0 tabular-nums">
          {String(idx + 1).padStart(2, "0")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bbh text-base md:text-lg uppercase tracking-wide text-foreground leading-tight">{card.title}</div>
          {card.summary && <div className="text-sm text-foreground/60 mt-1 leading-snug">{card.summary}</div>}
          {card.metrics?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 md:hidden">
              {card.metrics.map((m, i) => <MetricChip key={i} m={m} />)}
            </div>
          )}
        </div>
        <div className="hidden md:flex flex-wrap gap-2 justify-end max-w-[40%] shrink-0">
          {card.metrics?.map((m, i) => <MetricChip key={i} m={m} />)}
        </div>
        <ChevronDown className={`w-5 h-5 text-primary mt-1 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-primary/10">
            <div className="px-4 md:px-5 py-5 space-y-4">
              {card.content && (
                <div className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{card.content}</div>
              )}
              {card.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {card.tags.map(t => (
                    <span key={t} className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border/50">{t}</span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {unlocked && (
        <div className="absolute top-2 right-2 flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditing(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); del(); }}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      )}
    </motion.div>
  );
};

export const InvestmentOverview = ({ sections, cards, unlocked, token, onRefresh }: Props) => {
  const [adding, setAdding] = useState<string | null>(null); // section_id currently adding to
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");

  const grouped = useMemo(() => {
    return sections.map(sec => ({
      section: sec,
      cards: cards.filter(c => c.section_id === sec.id).sort((a, b) => a.display_order - b.display_order),
    }));
  }, [sections, cards]);

  const orphan = cards.filter(c => !sections.find(s => s.id === c.section_id));

  return (
    <div className="space-y-8">
      {grouped.map(({ section, cards: list }) => (
        <div key={section.id} className="space-y-3">
          <div className="flex items-center justify-between border-b border-primary/20 pb-2">
            <h3 className="font-bbh text-xs uppercase tracking-[0.3em] text-primary/80">{section.title}</h3>
            {unlocked && (
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 text-xs"
                  onClick={async () => {
                    const t = prompt("New section title", section.title); if (!t || t === section.title) return;
                    try { await callWrite(token, "upsertSection", { id: section.id, title: t, display_order: section.display_order }); await onRefresh(); }
                    catch (e: any) { toast.error(e.message); }
                  }}><Pencil className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive"
                  onClick={async () => {
                    if (!confirm(`Delete section "${section.title}" and all its cards?`)) return;
                    try { await callWrite(token, "deleteSection", { id: section.id }); await onRefresh(); }
                    catch (e: any) { toast.error(e.message); }
                  }}><Trash2 className="w-3 h-3" /></Button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {list.map((c, i) => (
              <OverviewCard key={c.id} card={c} idx={i} unlocked={unlocked} sections={sections} token={token} onChanged={onRefresh} />
            ))}
            {adding === section.id && (
              <CardEditor
                card={{ section_id: section.id, metrics: [], tags: [], display_order: (list[list.length - 1]?.display_order ?? 0) + 1 }}
                sections={sections} token={token}
                onDone={async () => { setAdding(null); await onRefresh(); }}
                onCancel={() => setAdding(null)}
              />
            )}
            {unlocked && adding !== section.id && (
              <Button size="sm" variant="outline" className="w-full border-dashed" onClick={() => setAdding(section.id)}>
                <Plus className="w-3.5 h-3.5 mr-1" />Add card to {section.title}
              </Button>
            )}
          </div>
        </div>
      ))}

      {orphan.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bbh text-xs uppercase tracking-[0.3em] text-muted-foreground">Other</h3>
          {orphan.map((c, i) => (
            <OverviewCard key={c.id} card={c} idx={i} unlocked={unlocked} sections={sections} token={token} onChanged={onRefresh} />
          ))}
        </div>
      )}

      {unlocked && (
        <div className="border-t border-primary/10 pt-4">
          {addingSection ? (
            <div className="flex gap-2">
              <Input value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)} placeholder="Section title" autoFocus />
              <Button onClick={async () => {
                if (!newSectionTitle.trim()) return;
                try { await callWrite(token, "upsertSection", { title: newSectionTitle, display_order: (sections[sections.length - 1]?.display_order ?? 0) + 1 }); setNewSectionTitle(""); setAddingSection(false); await onRefresh(); }
                catch (e: any) { toast.error(e.message); }
              }} className="bg-primary text-primary-foreground"><Check className="w-4 h-4" /></Button>
              <Button variant="ghost" onClick={() => { setAddingSection(false); setNewSectionTitle(""); }}><X className="w-4 h-4" /></Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="border-dashed" onClick={() => setAddingSection(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />Add section
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// Legacy default-export shim removed — use named export with props above.

const _LEGACY_UNUSED: any[] = [
  {
    number: 1,
    title: "Vision & Model",
    summary: "A hybrid football agency built on player development and system-driven execution.",
    body: () => (
      <div className="space-y-3 text-sm leading-relaxed text-foreground/80">
        <p>RISE is a football agency and performance hybrid, blending traditional representation with structured player development and proprietary analysis.</p>
        <p>The model is intentionally relationship-led rather than infrastructure-heavy. Growth compounds through clubs, players and decision-makers, not through office footprint.</p>
        <p>Scalability comes from systems that remove repetitive work and let the founder focus on the conversations that move deals forward.</p>
      </div>
    ),
  },
  {
    number: 2,
    title: "Investment Purpose",
    summary: "Capital to unlock full-time execution and scale operations.",
    body: () => (
      <div className="space-y-3 text-sm leading-relaxed text-foreground/80">
        <p>Investment is used to convert founder attention into output. Specifically:</p>
        <ul className="list-disc list-inside space-y-1 text-foreground/70">
          <li>Founder time allocation — living stability to focus full-time on the agency.</li>
          <li>Travel and relationship building across active and target markets.</li>
          <li>Selective staff and support scaling where it removes a bottleneck.</li>
          <li>Tools and systems for data, automation and analysis.</li>
        </ul>
        <p>Overhead is deliberately low. Execution focus is the priority.</p>
      </div>
    ),
  },
  {
    number: 3,
    title: "Operating Model",
    summary: "Capital increases outreach, deals and player acquisition speed.",
    body: () => (
      <div className="space-y-3 text-sm leading-relaxed text-foreground/80">
        <p>Time, not capability, is the constraint. Each additional hour of focused founder time converts directly into:</p>
        <ul className="list-disc list-inside space-y-1 text-foreground/70">
          <li>More club conversations.</li>
          <li>More player outreach.</li>
          <li>More mandates secured.</li>
          <li>More transfer opportunities surfaced.</li>
        </ul>
        <p>Internal systems reduce the manual workload around each interaction, increasing the ratio of execution to admin.</p>
      </div>
    ),
  },
  {
    number: 4,
    title: "Systems & Infrastructure",
    summary: "Automated systems already reduce workload and improve output.",
    body: () => (
      <div className="space-y-3 text-sm leading-relaxed text-foreground/80">
        <p>RISE operates on a custom internal platform combining task logging, player tracking and structured reporting.</p>
        <ul className="list-disc list-inside space-y-1 text-foreground/70">
          <li>Task and activity logging across the whole agency.</li>
          <li>Player tracking with performance reports and recruitment data.</li>
          <li>Integrated tools: Lovable, Wyscout, CRM workflows.</li>
        </ul>
        <p>The goal is to reduce time per player and make the network scalable without proportional headcount.</p>
      </div>
    ),
  },
  {
    number: 5,
    title: "Market Expansion Plan",
    summary: "Expansion across multiple football markets in phases.",
    body: () => (
      <div className="space-y-3 text-sm leading-relaxed text-foreground/80">
        <p>Geographic strategy runs in three stages, aligned to the transfer calendar:</p>
        <ul className="list-disc list-inside space-y-1 text-foreground/70">
          <li>Current market — UK and the existing club network.</li>
          <li>Winter expansion window — selective movement during the January window.</li>
          <li>Summer expansion window — primary push during the highest transfer activity period.</li>
        </ul>
        <p>The plan flexes based on player destinations and the density of live opportunities.</p>
      </div>
    ),
  },
  {
    number: 6,
    title: "Revenue Model",
    summary: "Revenue driven by player deals, mandates and transfers.",
    body: () => (
      <div className="space-y-3 text-sm leading-relaxed text-foreground/80">
        <p>Revenue comes from three layers that compound as the network grows:</p>
        <ul className="list-disc list-inside space-y-1 text-foreground/70">
          <li>Representation deals — example value of around £7,200 per player per year.</li>
          <li>Mandates and transfer commissions on completed moves.</li>
          <li>Sponsorship and endorsement upside on top players.</li>
        </ul>
        <p>Each new relationship feeds the next — the more deals close, the more inbound demand follows.</p>
      </div>
    ),
  },
  {
    number: 7,
    title: "Use of Funds Breakdown",
    summary: "Lean capital allocation focused on execution.",
    body: () => (
      <div className="space-y-3 text-sm leading-relaxed text-foreground/80">
        <p>Indicative allocation of investor capital:</p>
        <ul className="list-disc list-inside space-y-1 text-foreground/70">
          <li>Founder support — around £1,000 per month equivalent.</li>
          <li>Debt and financial stabilisation where applicable.</li>
          <li>Travel and networking across target markets.</li>
          <li>Tools — Wyscout, Lovable, CRM and automation.</li>
          <li>Staff and support scaling at clear bottlenecks.</li>
        </ul>
        <p>No office. Minimal fixed costs. Capital is spent where it produces output.</p>
      </div>
    ),
  },
  {
    number: 8,
    title: "Transparency & Investor Reporting",
    summary: "Full visibility into operations and spending.",
    body: () => (
      <div className="space-y-3 text-sm leading-relaxed text-foreground/80">
        <p>This portal is the reporting system. Each month, investors can see:</p>
        <ul className="list-disc list-inside space-y-1 text-foreground/70">
          <li>Spend tracking with category and trend breakdowns.</li>
          <li>Activity logs across outreach, analysis, travel and admin.</li>
          <li>Player pipeline updates by status.</li>
          <li>Deals and outcomes as they progress.</li>
        </ul>
        <p>Progress is visible in real time. There is no separation between what the agency sees and what the investor sees.</p>
      </div>
    ),
  },
  {
    number: 9,
    title: "Return Logic & Repayment",
    summary: "Capital repaid through revenue share until target return achieved.",
    body: () => (
      <div className="space-y-3 text-sm leading-relaxed text-foreground/80">
        <p>The repayment model is conceptually a revenue share rather than fixed debt:</p>
        <ul className="list-disc list-inside space-y-1 text-foreground/70">
          <li>An agreed percentage of agency revenue is allocated to the investor.</li>
          <li>Repayment continues until the agreed multiple on capital is reached.</li>
          <li>Specifics are confirmed in the underlying agreement.</li>
        </ul>
        <p>The structure is aligned by design — the investor benefits directly from agency growth.</p>
      </div>
    ),
  },
];

export const InvestmentOverview = () => {
  const [open, setOpen] = useState<number | null>(1);

  return (
    <div className="space-y-3">
      {CARDS.map((card) => {
        const isOpen = open === card.number;
        return (
          <motion.div
            key={card.number}
            layout
            initial={false}
            className="relative overflow-hidden rounded-sm border border-primary/20 bg-card"
          >
            <button
              onClick={() => setOpen(isOpen ? null : card.number)}
              className="w-full flex items-start gap-5 text-left px-6 py-5 hover:bg-primary/5 transition-colors"
            >
              <div className="font-bbh text-3xl text-primary/70 leading-none w-10 shrink-0">
                {String(card.number).padStart(2, "0")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bbh text-lg uppercase tracking-wide text-foreground">{card.title}</div>
                <div className="text-sm text-foreground/60 mt-1">{card.summary}</div>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-primary mt-1 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden border-t border-primary/10"
                >
                  <div className="px-6 py-5 pl-[60px]">{card.body()}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
};