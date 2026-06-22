import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Target, CheckCircle2, ListChecks, Star, Activity, CalendarDays } from "lucide-react";

type Starter = {
  position: string;
  abbr: string;
  name: string;
  userIds: string[];
  role: string;
  responsibilities: string[];
  floorGeneral?: boolean;
  // SVG positions on a half-court (viewBox 0 0 600 560)
  x: number;
  y: number;
};

const STARTERS: Starter[] = [
  {
    position: "Point Guard",
    abbr: "PG",
    name: "Jolon",
    userIds: ["ba2a30f2-3f0e-4267-ab04-ce74ac751aa4"],
    role: "Floor general. Sets the agency's direction and orchestrates every play.",
    responsibilities: [
      "Set weekly priorities and call the plays",
      "Unblock teammates and decide the agency's pace",
      "Own client-facing strategy and high-leverage decisions",
      "Read the floor — spot opportunities before anyone else",
    ],
    floorGeneral: true,
    x: 300,
    y: 470,
  },
  {
    position: "Shooting Guard",
    abbr: "SG",
    name: "Sandra",
    userIds: ["d4f0e437-5193-4c6a-b8ee-24376496062d"],
    role: "Scoring threat. Converts opportunities into visible wins.",
    responsibilities: [
      "Close outreach and follow-ups with conviction",
      "Drive marketing output and brand presence",
      "Hit the open shots — turn warm leads into placements",
      "Keep our cadence relentless, never let possessions waste",
    ],
    x: 120,
    y: 350,
  },
  {
    position: "Small Forward",
    abbr: "SF",
    name: "Anthony",
    userIds: ["95b6eece-4a7c-4ef2-a61e-d89574b79aa3"],
    role: "Versatile wing. Bridges analysis, scouting and player development.",
    responsibilities: [
      "Build and deliver player performance reports",
      "Lead scouting depth across markets and age groups",
      "Cover both ends — quality control on coaching and data",
      "Translate insight into actionable next steps",
    ],
    floorGeneral: true,
    x: 480,
    y: 350,
  },
  {
    position: "Power Forward",
    abbr: "PF",
    name: "Mutsa",
    userIds: ["a68c3599-d780-4f03-9d4e-3c63a5b9ce63"],
    role: "Workhorse. Wins the contested possessions on recruitment and outreach.",
    responsibilities: [
      "Grind club outreach pipelines and follow through",
      "Own the network — contacts, relationships, intros",
      "Box out competition on prospect tracking",
      "Convert opportunities into signed momentum",
    ],
    x: 200,
    y: 220,
  },
  {
    position: "Centre",
    abbr: "C",
    name: "Kuda",
    userIds: ["c0af9c15-400b-4c68-95a8-a0419565015a"],
    role: "Anchor. Keeps the foundation — admin, finance and data — solid.",
    responsibilities: [
      "Protect the rim — invoices, contracts, compliance",
      "Rebound the misses — clean up data, fix what slips",
      "Set screens for the rest of the team to score",
      "Reliable presence everyone can play through",
    ],
    floorGeneral: true,
    x: 400,
    y: 220,
  },
];

interface TaskRow {
  id: string;
  title: string;
  category: string | null;
  completed: boolean;
  assigned_to: string[] | null;
  last_completed_at: string | null;
  completion_log: string[] | null;
}

interface VisionRow {
  id: string;
  category: string;
  vision_statement: string | null;
  actionable_plans: string[] | null;
}

const assignedToStarter = (assigned: string[] | null, s: Starter): boolean => {
  if (!assigned || assigned.length === 0) return false;
  const lowerFirst = s.name.toLowerCase();
  return assigned.some(a => {
    if (!a) return false;
    if (s.userIds.includes(a)) return true;
    return a.toLowerCase().includes(lowerFirst);
  });
};

// Box-score classification. Each rule = (regex, stat key, points).
// Highest-priority match wins (first hit).
type BoxStat = "PTS" | "AST" | "REB" | "STL" | "BLK" | "TO";
const BOX_RULES: { re: RegExp; stat: BoxStat; pts: number; label: string }[] = [
  // Points — direct agency progress
  { re: /payment received|invoice paid|received payment/i, stat: "PTS", pts: 80, label: "Payment received" },
  { re: /signed|closed (deal|client)|contract signed|deal closed/i, stat: "PTS", pts: 50, label: "Closed paid client" },
  { re: /testimonial|referral received/i, stat: "PTS", pts: 20, label: "Testimonial / referral" },
  { re: /delivered|deliverable|report sent|highlight (sent|delivered)/i, stat: "PTS", pts: 15, label: "Deliverable completed" },
  { re: /booked? (call|meeting)|qualified call|meeting held/i, stat: "PTS", pts: 12, label: "Booked qualified call" },
  { re: /proposal|offer sent|representation offer/i, stat: "PTS", pts: 10, label: "Proposal sent" },
  { re: /publish|posted|content posted|blog|article|reel|tiktok|story|stories/i, stat: "PTS", pts: 8, label: "Content published" },
  { re: /landing page|deck|portfolio|improve offer/i, stat: "PTS", pts: 8, label: "Asset improved" },
  { re: /recruit|database|add player|player.+(added|image|details)|shortlist/i, stat: "PTS", pts: 7, label: "Recruitment input" },
  { re: /outreach|cold (message|email|dm)|send (message|email)|birthday/i, stat: "PTS", pts: 6, label: "Outreach sent" },
  { re: /like|follow|engage|comment/i, stat: "PTS", pts: 5, label: "Engagement action" },

  // Assists — created future scoring chances
  { re: /intro(duction)?|connected|opened door/i, stat: "AST", pts: 8, label: "Intro / connection" },
  { re: /lead list|prospect list|shortlist built/i, stat: "AST", pts: 6, label: "Lead list created" },
  { re: /partner(ship)?|collab/i, stat: "AST", pts: 7, label: "Partner conversation" },
  { re: /helpful idea|shared idea|sent insight/i, stat: "AST", pts: 5, label: "Idea shared" },

  // Rebounds — follow-ups and recoveries
  { re: /unpaid|chase invoice|chase payment/i, stat: "REB", pts: 6, label: "Chased payment" },
  { re: /follow.?up|chase|revive|reopen/i, stat: "REB", pts: 5, label: "Follow-up / revival" },
  { re: /fix(ed)? (task|issue|bug)|cleanup|clean up/i, stat: "REB", pts: 5, label: "Recovered a miss" },

  // Steals — captured opportunities
  { re: /decision.?maker|found contact|sourced contact/i, stat: "STL", pts: 6, label: "Found decision-maker" },
  { re: /spotted|noticed (lead|opportunity)|opportunistic/i, stat: "STL", pts: 5, label: "Spotted opportunity" },
  { re: /trend|timely post|jumped on/i, stat: "STL", pts: 5, label: "Caught a trend" },

  // Blocks — prevented problems
  { re: /scope|clarif|prevent|template|checklist/i, stat: "BLK", pts: 5, label: "Prevented an issue" },
  { re: /said no|declined|killed (idea|task)/i, stat: "BLK", pts: 4, label: "Said no to drag" },

  // Turnovers — wasted chances
  { re: /missed|forgot|late reply|dropped/i, stat: "TO", pts: 4, label: "Turnover" },
];

const BOX_KEYS: BoxStat[] = ["PTS", "AST", "REB", "STL", "BLK", "TO"];
const BOX_META: Record<BoxStat, { label: string; meaning: string; tone: string }> = {
  PTS: { label: "PTS", meaning: "Direct agency progress", tone: "text-primary" },
  AST: { label: "AST", meaning: "Future scoring chances created", tone: "text-blue-400" },
  REB: { label: "REB", meaning: "Follow-ups and recoveries", tone: "text-emerald-400" },
  STL: { label: "STL", meaning: "Opportunities captured", tone: "text-yellow-400" },
  BLK: { label: "BLK", meaning: "Problems prevented", tone: "text-purple-400" },
  TO:  { label: "TO",  meaning: "Wasted chances", tone: "text-red-400" },
};

function classifyTask(t: TaskRow): { stat: BoxStat; pts: number; label: string } | null {
  const hay = `${t.title || ""} ${t.category || ""}`;
  for (const rule of BOX_RULES) {
    if (rule.re.test(hay)) return { stat: rule.stat, pts: rule.pts, label: rule.label };
  }
  // Default: any completed action is worth a base 6 PTS.
  return { stat: "PTS", pts: 6, label: "Action completed" };
}

type BoxLine = { PTS: number; AST: number; REB: number; STL: number; BLK: number; TO: number; plusMinus: number };
function emptyBox(): BoxLine { return { PTS: 0, AST: 0, REB: 0, STL: 0, BLK: 0, TO: 0, plusMinus: 0 }; }
function withPM(b: BoxLine): BoxLine { return { ...b, plusMinus: b.PTS + b.AST + b.REB + b.STL + b.BLK - b.TO }; }

function performanceTier(pts: number): { label: string; tone: string } {
  if (pts >= 120) return { label: "MVP — career night", tone: "text-primary" };
  if (pts >= 100) return { label: "Big win — playoff form", tone: "text-primary" };
  if (pts >= 80)  return { label: "Close loss — stay in the game", tone: "text-yellow-400" };
  if (pts >= 50)  return { label: "Off night — lost the game", tone: "text-blue-400" };
  return { label: "Blown out — reset needed", tone: "text-muted-foreground" };
}

// ----- Week / season helpers -----
const SEASON_START = new Date(Date.UTC(2026, 5, 22)); // Mon 22 Jun 2026
const MS_WEEK = 7 * 24 * 60 * 60 * 1000;
const WIN_THRESHOLD = 120;

function startOfWeekUTC(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay(); // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7;  // back to Monday
  x.setUTCDate(x.getUTCDate() - diff);
  return x;
}
function weekIndex(d: Date): number {
  return Math.floor((startOfWeekUTC(d).getTime() - SEASON_START.getTime()) / MS_WEEK);
}
function weekLabel(idx: number): { start: string; end: string } {
  const start = new Date(SEASON_START.getTime() + idx * MS_WEEK);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return { start: fmt(start), end: fmt(end) };
}

export const TeamPerformance = () => {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [vision, setVision] = useState<VisionRow[]>([]);
  const [open, setOpen] = useState<Starter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [t, v] = await Promise.all([
        supabase.from("staff_tasks").select("id, title, category, completed, assigned_to, last_completed_at, completion_log"),
        supabase.from("vision_board").select("id, category, vision_statement, actionable_plans").order("display_order", { ascending: true }),
      ]);
      setTasks((t.data as TaskRow[]) || []);
      setVision((v.data as VisionRow[]) || []);
      setLoading(false);
    })();
  }, []);

  // ------------------------------------------------------------
  // Build the season log: every completion event (one per
  // completion_log timestamp, plus last_completed_at fallback)
  // is a "play". Each play has a date, starter and box-score
  // contribution. We then bucket plays into weekly games.
  // ------------------------------------------------------------
  type Play = { date: Date; weekIdx: number; starterName: string | null; stat: BoxStat; pts: number; category: string };

  const plays = useMemo<Play[]>(() => {
    const out: Play[] = [];
    tasks.forEach(t => {
      const c = classifyTask(t);
      if (!c) return;
      const matchedStarter = STARTERS.find(s => assignedToStarter(t.assigned_to, s)) || null;
      const category = (t.category || "Uncategorised").trim() || "Uncategorised";

      const stamps = new Set<string>();
      (t.completion_log || []).forEach(raw => {
        if (!raw) return;
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return;
        stamps.add(d.toISOString());
      });
      // If no log entries but the task is marked complete, count it once.
      if (stamps.size === 0 && t.completed && t.last_completed_at) {
        const d = new Date(t.last_completed_at);
        if (!Number.isNaN(d.getTime())) stamps.add(d.toISOString());
      }

      stamps.forEach(iso => {
        const d = new Date(iso);
        out.push({
          date: d,
          weekIdx: weekIndex(d),
          starterName: matchedStarter ? matchedStarter.name : null,
          stat: c.stat,
          pts: c.pts,
          category,
        });
      });
    });
    return out;
  }, [tasks]);

  const currentWeekIdx = weekIndex(new Date());

  // Per-week team box line
  const weeklyBoxes = useMemo(() => {
    const map = new Map<number, BoxLine>();
    plays.forEach(p => {
      if (!map.has(p.weekIdx)) map.set(p.weekIdx, emptyBox());
      map.get(p.weekIdx)![p.stat] += p.pts;
    });
    const out = new Map<number, BoxLine>();
    map.forEach((v, k) => out.set(k, withPM(v)));
    return out;
  }, [plays]);

  // Per-week per-starter line
  const weeklyByStarter = useMemo(() => {
    const m = new Map<string, Map<number, BoxLine>>();
    STARTERS.forEach(s => m.set(s.name, new Map()));
    plays.forEach(p => {
      if (!p.starterName) return;
      const inner = m.get(p.starterName)!;
      if (!inner.has(p.weekIdx)) inner.set(p.weekIdx, emptyBox());
      inner.get(p.weekIdx)![p.stat] += p.pts;
    });
    const finalised = new Map<string, Map<number, BoxLine>>();
    m.forEach((inner, name) => {
      const f = new Map<number, BoxLine>();
      inner.forEach((v, k) => f.set(k, withPM(v)));
      finalised.set(name, f);
    });
    return finalised;
  }, [plays]);

  // Current-week box (the live game)
  const boxScore = useMemo(() => {
    const team = weeklyBoxes.get(currentWeekIdx) || withPM(emptyBox());
    const perStarter = new Map<string, BoxLine>();
    STARTERS.forEach(s => {
      perStarter.set(s.name, weeklyByStarter.get(s.name)?.get(currentWeekIdx) || withPM(emptyBox()));
    });
    const attempts = plays.filter(p => p.weekIdx === currentWeekIdx).length;
    const made = plays.filter(p => p.weekIdx === currentWeekIdx && p.stat === "PTS" && p.pts >= 8).length;
    const fgPct = attempts ? Math.round((made / attempts) * 100) : 0;
    return { team, perStarter, attempts, fgPct };
  }, [weeklyBoxes, weeklyByStarter, currentWeekIdx, plays]);

  // Season averages per starter (PPG/APG/RPG over weeks they have appeared in)
  type AvgLine = { games: number; ppg: number; apg: number; rpg: number; spg: number; bpg: number; topg: number; pmpg: number; totalPts: number };
  const seasonAverages = useMemo(() => {
    const out = new Map<string, AvgLine>();
    STARTERS.forEach(s => {
      const weeks = weeklyByStarter.get(s.name) || new Map<number, BoxLine>();
      const lines = Array.from(weeks.values());
      const g = lines.length || 0;
      const sum = (k: BoxStat) => lines.reduce((a, l) => a + l[k], 0);
      const pm = lines.reduce((a, l) => a + l.plusMinus, 0);
      out.set(s.name, {
        games: g,
        ppg: g ? +(sum("PTS") / g).toFixed(1) : 0,
        apg: g ? +(sum("AST") / g).toFixed(1) : 0,
        rpg: g ? +(sum("REB") / g).toFixed(1) : 0,
        spg: g ? +(sum("STL") / g).toFixed(1) : 0,
        bpg: g ? +(sum("BLK") / g).toFixed(1) : 0,
        topg: g ? +(sum("TO") / g).toFixed(1) : 0,
        pmpg: g ? +(pm / g).toFixed(1) : 0,
        totalPts: sum("PTS"),
      });
    });
    return out;
  }, [weeklyByStarter]);

  // Team season averages
  const teamAverages = useMemo<AvgLine>(() => {
    const lines = Array.from(weeklyBoxes.values());
    const g = lines.length;
    const sum = (k: BoxStat) => lines.reduce((a, l) => a + l[k], 0);
    const pm = lines.reduce((a, l) => a + l.plusMinus, 0);
    return {
      games: g,
      ppg: g ? +(sum("PTS") / g).toFixed(1) : 0,
      apg: g ? +(sum("AST") / g).toFixed(1) : 0,
      rpg: g ? +(sum("REB") / g).toFixed(1) : 0,
      spg: g ? +(sum("STL") / g).toFixed(1) : 0,
      bpg: g ? +(sum("BLK") / g).toFixed(1) : 0,
      topg: g ? +(sum("TO") / g).toFixed(1) : 0,
      pmpg: g ? +(pm / g).toFixed(1) : 0,
      totalPts: sum("PTS"),
    };
  }, [weeklyBoxes]);

  // 52-game fixture list starting week of 22 Jun 2026
  const fixtures = useMemo(() => {
    return Array.from({ length: 52 }, (_, i) => {
      const line = weeklyBoxes.get(i) || withPM(emptyBox());
      const { start, end } = weekLabel(i);
      let result: "W" | "L" | "—" = "—";
      if (i < currentWeekIdx) result = line.PTS >= WIN_THRESHOLD ? "W" : "L";
      else if (i === currentWeekIdx) result = line.PTS >= WIN_THRESHOLD ? "W" : "—";
      return { i, start, end, line, result, isCurrent: i === currentWeekIdx, isPast: i < currentWeekIdx };
    });
  }, [weeklyBoxes, currentWeekIdx]);

  // Leaderboard (this week's PTS, fall back to season total)
  const leaderboard = useMemo(() => {
    return STARTERS.map(s => {
      const wk = boxScore.perStarter.get(s.name)!;
      const avg = seasonAverages.get(s.name)!;
      return { starter: s, weekPts: wk.PTS, seasonPts: avg.totalPts, avg };
    }).sort((a, b) => b.weekPts - a.weekPts || b.seasonPts - a.seasonPts);
  }, [boxScore, seasonAverages]);
  const topWeekPts = leaderboard[0]?.weekPts || 0;

  // Per-starter category breakdown (for dialog)
  const categoriesByStarter = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    STARTERS.forEach(s => m.set(s.name, new Map()));
    plays.forEach(p => {
      if (!p.starterName) return;
      const inner = m.get(p.starterName)!;
      inner.set(p.category, (inner.get(p.category) || 0) + 1);
    });
    const out = new Map<string, [string, number][]>();
    m.forEach((inner, name) => {
      out.set(name, Array.from(inner.entries()).sort((a, b) => b[1] - a[1]));
    });
    return out;
  }, [plays]);

  const wins = fixtures.filter(f => f.result === "W").length;
  const losses = fixtures.filter(f => f.result === "L").length;

  const activeAvg = open ? seasonAverages.get(open.name) : null;
  const activeBox = open ? boxScore.perStarter.get(open.name) : null;
  const activeCategories = open ? (categoriesByStarter.get(open.name) || []) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Team Performance</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5"><Trophy className="h-3 w-3" /> Starting 5</Badge>
          <Badge variant="outline" className="gap-1.5 border-primary/40 text-primary">
            {wins}W · {losses}L
          </Badge>
        </div>
      </div>

      {/* Basketball court */}
      <Card className="p-4 sm:p-6 bg-gradient-to-b from-amber-950/30 to-amber-900/10 border-primary/20">
        <div className="relative w-full">
          <svg viewBox="0 0 600 560" className="w-full h-auto select-none" role="img" aria-label="Starting five basketball court">
            {/* Court floor */}
            <defs>
              <linearGradient id="court" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a16207" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#78350f" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <rect x="20" y="20" width="560" height="520" rx="8" fill="url(#court)" stroke="hsl(var(--primary))" strokeWidth="3" />
            {/* Half-court line at top (baseline below) */}
            <line x1="20" y1="20" x2="580" y2="20" stroke="hsl(var(--primary))" strokeWidth="2" />
            {/* Key (paint) */}
            <rect x="230" y="20" width="140" height="200" fill="hsl(var(--primary) / 0.08)" stroke="hsl(var(--primary))" strokeWidth="2" />
            {/* Free-throw circle */}
            <circle cx="300" cy="220" r="60" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
            {/* Backboard + rim */}
            <line x1="260" y1="40" x2="340" y2="40" stroke="hsl(var(--primary))" strokeWidth="3" />
            <circle cx="300" cy="55" r="12" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
            {/* Three-point arc */}
            <path d="M 80 20 L 80 180 A 220 220 0 0 0 520 180 L 520 20" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
            {/* Centre circle (at bottom — half-court) */}
            <circle cx="300" cy="540" r="60" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
            <line x1="20" y1="540" x2="580" y2="540" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="6 6" opacity="0.5" />

            {/* Players */}
            {STARTERS.map((s) => {
              const avg = seasonAverages.get(s.name)!;
              const wk = boxScore.perStarter.get(s.name)!;
              const isLeader = topWeekPts > 0 && wk.PTS === topWeekPts;
              return (
                <g key={s.name} className="cursor-pointer" onClick={() => setOpen(s)}>
                  <circle cx={s.x} cy={s.y} r="40" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="3" />
                  {isLeader && (
                    <circle cx={s.x} cy={s.y} r="46" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" opacity="0.5">
                      <animate attributeName="r" values="42;50;42" dur="2.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2.5s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <text x={s.x} y={s.y - 4} textAnchor="middle" fontSize="14" fontWeight="700" fill="hsl(var(--primary))">{s.abbr}</text>
                  <text x={s.x} y={s.y + 14} textAnchor="middle" fontSize="13" fontWeight="600" fill="hsl(var(--foreground))">{s.name}</text>
                  {s.floorGeneral && (
                    <g>
                      <rect x={s.x - 38} y={s.y + 48} width="76" height="16" rx="8" fill="hsl(var(--primary) / 0.18)" stroke="hsl(var(--primary))" strokeWidth="1" />
                      <text x={s.x} y={s.y + 59} textAnchor="middle" fontSize="9" fontWeight="700" fill="hsl(var(--primary))" letterSpacing="0.5">FLOOR GENERAL</text>
                    </g>
                  )}
                  <text x={s.x} y={s.y + (s.floorGeneral ? 80 : 60)} textAnchor="middle" fontSize="11" fill="hsl(var(--muted-foreground))">
                    {avg.ppg.toFixed(1)} PPG · {avg.apg.toFixed(1)} APG · {avg.rpg.toFixed(1)} RPG
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </Card>

      {/* Weekly Box Score */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Weekly Box Score</h3>
            <Badge variant="outline" className="text-[10px]">
              {weekLabel(currentWeekIdx).start} – {weekLabel(currentWeekIdx).end} · vs. The Market
            </Badge>
            <Badge
              variant="outline"
              className={`text-[10px] gap-1 ${boxScore.team.PTS >= WIN_THRESHOLD ? "border-primary/60 text-primary" : "border-red-400/40 text-red-400"}`}
              title={`Win at ${WIN_THRESHOLD}+ PTS`}
            >
              {boxScore.team.PTS >= WIN_THRESHOLD ? "W" : "L pace"} · target {WIN_THRESHOLD}
            </Badge>
          </div>
          <div className={`text-xs font-semibold ${performanceTier(boxScore.team.PTS).tone}`}>
            {performanceTier(boxScore.team.PTS).label}
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 mb-4">
          {BOX_KEYS.map(k => (
            <div key={k} className="p-2.5 rounded-md bg-muted/40 text-center" title={BOX_META[k].meaning}>
              <div className={`text-xl font-bold tabular-nums ${BOX_META[k].tone}`}>{boxScore.team[k]}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{BOX_META[k].label}</div>
            </div>
          ))}
          <div className="p-2.5 rounded-md bg-primary/10 text-center" title="Points + Assists + Rebounds + Steals + Blocks − Turnovers">
            <div className="text-xl font-bold tabular-nums text-primary">
              {boxScore.team.plusMinus >= 0 ? "+" : ""}{boxScore.team.plusMinus}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">+/−</div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mb-3">
          FG%: {boxScore.fgPct}% from {boxScore.attempts} scoring attempts · Win line at {WIN_THRESHOLD} PTS
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border">
                <th className="text-left font-medium py-2">Starter</th>
                {BOX_KEYS.map(k => (
                  <th key={k} className="text-right font-medium py-2 px-2">{k}</th>
                ))}
                <th className="text-right font-medium py-2 px-2">+/−</th>
              </tr>
            </thead>
            <tbody>
              {STARTERS.map(s => {
                const line = boxScore.perStarter.get(s.name)!;
                return (
                  <tr key={s.name} className="border-b border-border/40 last:border-0">
                    <td className="py-2">
                      <button onClick={() => setOpen(s)} className="text-left hover:text-primary transition-colors">
                        <span className="font-medium text-foreground">{s.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-1.5">{s.abbr}</span>
                        {s.floorGeneral && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wide text-primary">
                            <Star className="h-2.5 w-2.5 fill-primary" /> FG
                          </span>
                        )}
                      </button>
                    </td>
                    {BOX_KEYS.map(k => (
                      <td key={k} className="text-right tabular-nums py-2 px-2 text-foreground">{line[k]}</td>
                    ))}
                    <td className={`text-right tabular-nums py-2 px-2 font-semibold ${line.plusMinus >= 0 ? "text-primary" : "text-red-400"}`}>
                      {line.plusMinus >= 0 ? "+" : ""}{line.plusMinus}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3 text-[11px] text-muted-foreground">
          {BOX_KEYS.map(k => (
            <div key={k} className="flex gap-1.5">
              <span className={`font-semibold ${BOX_META[k].tone}`}>{k}</span>
              <span>{BOX_META[k].meaning}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Season tabs — schedule, averages, advanced, scoring rules */}
      <Card className="p-4 sm:p-6">
        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full">
            <TabsTrigger value="schedule"><CalendarDays className="h-3.5 w-3.5 mr-1.5" />Schedule</TabsTrigger>
            <TabsTrigger value="averages">Season Averages</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="rules">Scoring</TabsTrigger>
          </TabsList>

          {/* Fixture list */}
          <TabsContent value="schedule" className="mt-4">
            <div className="text-xs text-muted-foreground mb-3">
              52-game season. Each game = one calendar week. A win is {WIN_THRESHOLD}+ team PTS, anything less is a loss.
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border">
                    <th className="text-left font-medium py-2 px-2">#</th>
                    <th className="text-left font-medium py-2 px-2">Game week</th>
                    <th className="text-right font-medium py-2 px-2">PTS</th>
                    <th className="text-right font-medium py-2 px-2">+/−</th>
                    <th className="text-right font-medium py-2 px-2">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {fixtures.map(f => (
                    <tr
                      key={f.i}
                      className={`border-b border-border/30 last:border-0 ${f.isCurrent ? "bg-primary/5" : ""}`}
                    >
                      <td className="py-1.5 px-2 text-[11px] text-muted-foreground tabular-nums">{f.i + 1}</td>
                      <td className="py-1.5 px-2">
                        <span className="text-foreground">{f.start} – {f.end}</span>
                        {f.isCurrent && (
                          <Badge variant="outline" className="ml-2 text-[9px] border-primary/40 text-primary">Live</Badge>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-right tabular-nums text-foreground">
                        {f.isPast || f.isCurrent ? f.line.PTS : "—"}
                      </td>
                      <td className={`py-1.5 px-2 text-right tabular-nums ${f.line.plusMinus >= 0 ? "text-primary" : "text-red-400"}`}>
                        {f.isPast || f.isCurrent ? `${f.line.plusMinus >= 0 ? "+" : ""}${f.line.plusMinus}` : "—"}
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        {f.result === "W" && <span className="font-bold text-primary">W</span>}
                        {f.result === "L" && <span className="font-bold text-red-400">L</span>}
                        {f.result === "—" && <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Season averages */}
          <TabsContent value="averages" className="mt-4">
            <div className="text-xs text-muted-foreground mb-3">
              Per-game averages across {teamAverages.games} game{teamAverages.games === 1 ? "" : "s"} played.
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border">
                    <th className="text-left font-medium py-2 px-2">Starter</th>
                    <th className="text-right font-medium py-2 px-2">GP</th>
                    <th className="text-right font-medium py-2 px-2">PPG</th>
                    <th className="text-right font-medium py-2 px-2">APG</th>
                    <th className="text-right font-medium py-2 px-2">RPG</th>
                    <th className="text-right font-medium py-2 px-2">SPG</th>
                    <th className="text-right font-medium py-2 px-2">BPG</th>
                    <th className="text-right font-medium py-2 px-2">TO</th>
                    <th className="text-right font-medium py-2 px-2">+/−</th>
                  </tr>
                </thead>
                <tbody>
                  {STARTERS.map(s => {
                    const a = seasonAverages.get(s.name)!;
                    return (
                      <tr key={s.name} className="border-b border-border/30 last:border-0">
                        <td className="py-2 px-2">
                          <button onClick={() => setOpen(s)} className="text-left hover:text-primary">
                            <span className="font-medium text-foreground">{s.name}</span>
                            <span className="text-[10px] text-muted-foreground ml-1.5">{s.abbr}</span>
                            {s.floorGeneral && <Star className="inline h-2.5 w-2.5 ml-1 fill-primary text-primary" />}
                          </button>
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">{a.games}</td>
                        <td className="py-2 px-2 text-right tabular-nums font-semibold text-foreground">{a.ppg}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-foreground">{a.apg}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-foreground">{a.rpg}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-foreground">{a.spg}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-foreground">{a.bpg}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-foreground">{a.topg}</td>
                        <td className={`py-2 px-2 text-right tabular-nums font-semibold ${a.pmpg >= 0 ? "text-primary" : "text-red-400"}`}>
                          {a.pmpg >= 0 ? "+" : ""}{a.pmpg}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t border-border/60">
                    <td className="py-2 px-2 font-semibold text-foreground">Team</td>
                    <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">{teamAverages.games}</td>
                    <td className="py-2 px-2 text-right tabular-nums font-semibold text-primary">{teamAverages.ppg}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-foreground">{teamAverages.apg}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-foreground">{teamAverages.rpg}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-foreground">{teamAverages.spg}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-foreground">{teamAverages.bpg}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-foreground">{teamAverages.topg}</td>
                    <td className={`py-2 px-2 text-right tabular-nums font-semibold ${teamAverages.pmpg >= 0 ? "text-primary" : "text-red-400"}`}>
                      {teamAverages.pmpg >= 0 ? "+" : ""}{teamAverages.pmpg}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Advanced metrics */}
          <TabsContent value="advanced" className="mt-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {STARTERS.map(s => {
                const a = seasonAverages.get(s.name)!;
                const usageDenom = teamAverages.ppg * (a.games || 1);
                const usage = usageDenom ? Math.round((a.ppg / teamAverages.ppg) * 100) : 0;
                const astTo = a.topg > 0 ? +(a.apg / a.topg).toFixed(2) : a.apg;
                const efficiency = +(a.ppg + a.apg * 1.5 + a.rpg + a.spg * 2 + a.bpg * 2 - a.topg * 2).toFixed(1);
                return (
                  <div key={s.name} className="p-3 rounded-md border border-border bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-foreground">{s.name}</div>
                      <span className="text-[10px] text-muted-foreground">{s.abbr}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      <div className="text-muted-foreground">Usage %</div>
                      <div className="text-right tabular-nums text-foreground">{usage}%</div>
                      <div className="text-muted-foreground">AST / TO</div>
                      <div className="text-right tabular-nums text-foreground">{astTo}</div>
                      <div className="text-muted-foreground">Efficiency</div>
                      <div className="text-right tabular-nums text-foreground">{efficiency}</div>
                      <div className="text-muted-foreground">Season total PTS</div>
                      <div className="text-right tabular-nums text-foreground">{a.totalPts}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              Usage = share of team PPG · AST/TO = creation vs waste · Efficiency = PTS + 1.5·AST + REB + 2·STL + 2·BLK − 2·TO.
            </p>
          </TabsContent>

          {/* Scoring rules */}
          <TabsContent value="rules" className="mt-4">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-foreground mb-2">How the box score works</h4>
                <ul className="space-y-1.5 text-muted-foreground text-xs">
                  <li><span className="font-semibold text-primary">PTS</span> — direct agency progress (closed clients, payments, content shipped).</li>
                  <li><span className="font-semibold text-blue-400">AST</span> — created future opportunity (intros, lead lists, partnerships).</li>
                  <li><span className="font-semibold text-emerald-400">REB</span> — follow-ups and recoveries (chases, revivals, fixes).</li>
                  <li><span className="font-semibold text-yellow-400">STL</span> — captured opportunities (decision-makers, trends, openings).</li>
                  <li><span className="font-semibold text-purple-400">BLK</span> — problems prevented (templates, said-no, scope clarity).</li>
                  <li><span className="font-semibold text-red-400">TO</span> — wasted chances (dropped balls, missed deadlines).</li>
                  <li><span className="font-semibold text-primary">+/−</span> — total momentum (PTS + AST + REB + STL + BLK − TO).</li>
                  <li className="pt-1">A <strong>win</strong> is {WIN_THRESHOLD}+ team PTS in a week. Anything less is a loss.</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Action values</h4>
                <div className="max-h-80 overflow-y-auto pr-2">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border">
                        <th className="text-left font-medium py-1.5">Action</th>
                        <th className="text-center font-medium py-1.5">Stat</th>
                        <th className="text-right font-medium py-1.5">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {BOX_RULES.map((r, i) => (
                        <tr key={i} className="border-b border-border/30">
                          <td className="py-1.5 text-foreground">{r.label}</td>
                          <td className={`py-1.5 text-center font-semibold ${BOX_META[r.stat].tone}`}>{r.stat}</td>
                          <td className="py-1.5 text-right tabular-nums text-foreground">{r.pts}</td>
                        </tr>
                      ))}
                      <tr>
                        <td className="py-1.5 text-muted-foreground italic">Any other completed action</td>
                        <td className="py-1.5 text-center font-semibold text-primary">PTS</td>
                        <td className="py-1.5 text-right tabular-nums text-foreground">6</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Leaderboard */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Weekly Scoring Leaders</h3>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((row, idx) => {
              const pct = WIN_THRESHOLD ? Math.min(100, Math.round((row.weekPts / WIN_THRESHOLD) * 100)) : 0;
              return (
              <button
                key={row.starter.name}
                onClick={() => setOpen(row.starter)}
                className="w-full text-left flex items-center gap-3 p-3 rounded-md bg-muted/40 hover:bg-muted transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-sm">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground truncate">
                      {row.starter.name} <span className="text-xs text-muted-foreground">· {row.starter.position}</span>
                      {row.starter.floorGeneral && (
                        <Badge variant="outline" className="ml-2 text-[9px] gap-0.5 border-primary/40 text-primary">
                          <Star className="h-2.5 w-2.5 fill-primary" /> Floor General
                        </Badge>
                      )}
                    </span>
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {row.weekPts} PTS <span className="text-[10px] font-normal text-muted-foreground">· {row.avg.ppg} PPG</span>
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Progress value={pct} className="h-1.5 flex-1" />
                    <span className="text-[11px] text-muted-foreground tabular-nums w-12 text-right">{pct}% of W</span>
                  </div>
                </div>
              </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Team strategy from vision board */}
      {vision.length > 0 && (
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Team Strategy & Ideas</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {vision.map(v => (
              <div key={v.id} className="p-3 rounded-md border border-border bg-muted/30">
                <div className="text-xs uppercase tracking-wide text-primary font-semibold mb-1">{v.category}</div>
                {v.vision_statement && (
                  <p className="text-sm text-foreground mb-2">{v.vision_statement}</p>
                )}
                {v.actionable_plans && v.actionable_plans.length > 0 && (
                  <ul className="space-y-1">
                    {v.actionable_plans.slice(0, 4).map((p, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <CheckCircle2 className="h-3 w-3 mt-0.5 text-primary/70 flex-shrink-0" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Player role dialog */}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl">
          {open && activeAvg && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-2xl">
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/15 text-primary font-bold">
                    {open.abbr}
                  </span>
                  <div>
                    <div>{open.name}</div>
                    <div className="text-sm font-normal text-muted-foreground">{open.position}</div>
                    {open.floorGeneral && (
                      <Badge variant="outline" className="mt-1 text-[10px] gap-0.5 border-primary/40 text-primary">
                        <Star className="h-3 w-3 fill-primary" /> Floor General · extra responsibilities
                      </Badge>
                    )}
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5">
                <p className="text-base text-foreground">{open.role}</p>

                {activeBox && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-primary" /> Weekly box score
                    </h4>
                    <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                      {BOX_KEYS.map(k => (
                        <div key={k} className="p-2 rounded-md bg-muted/40 text-center" title={BOX_META[k].meaning}>
                          <div className={`text-lg font-bold tabular-nums ${BOX_META[k].tone}`}>{activeBox[k]}</div>
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{BOX_META[k].label}</div>
                        </div>
                      ))}
                      <div className="p-2 rounded-md bg-primary/10 text-center">
                        <div className="text-lg font-bold tabular-nums text-primary">
                          {activeBox.plusMinus >= 0 ? "+" : ""}{activeBox.plusMinus}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">+/−</div>
                      </div>
                    </div>
                    <div className={`mt-2 text-xs font-semibold ${performanceTier(activeBox.PTS).tone}`}>
                      {performanceTier(activeBox.PTS).label}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <ListChecks className="h-4 w-4 text-primary" /> What we need from this position
                  </h4>
                  <ul className="space-y-1.5">
                    {open.responsibilities.map((r, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-primary">▸</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-md bg-muted/50 text-center">
                    <div className="text-2xl font-bold text-foreground tabular-nums">{activeAvg.ppg}</div>
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wide">PPG</div>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50 text-center">
                    <div className="text-2xl font-bold text-foreground tabular-nums">{activeAvg.games}</div>
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Games played</div>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50 text-center">
                    <div className={`text-2xl font-bold tabular-nums ${activeAvg.pmpg >= 0 ? "text-primary" : "text-red-400"}`}>
                      {activeAvg.pmpg >= 0 ? "+" : ""}{activeAvg.pmpg}
                    </div>
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wide">+/− per game</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Types of task completed</h4>
                  {activeCategories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No completed tasks yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {(() => {
                        const totalCount = activeCategories.reduce((a, [, n]) => a + n, 0) || 1;
                        return activeCategories.map(([cat, count]) => {
                          const pct = Math.round((count / totalCount) * 100);
                        return (
                          <div key={cat}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-foreground">{cat}</span>
                              <span className="text-muted-foreground tabular-nums">{count} ({pct}%)</span>
                            </div>
                            <Progress value={pct} className="h-1.5" />
                          </div>
                        );
                        });
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamPerformance;