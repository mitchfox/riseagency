import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface CardDef {
  number: number;
  title: string;
  summary: string;
  body: () => JSX.Element;
}

const CARDS: CardDef[] = [
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