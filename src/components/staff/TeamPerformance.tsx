import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target, CheckCircle2, ListChecks } from "lucide-react";

type Starter = {
  position: string;
  abbr: string;
  name: string;
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

const nameMatches = (assigned: string[] | null, first: string) => {
  if (!assigned || assigned.length === 0) return false;
  const lower = first.toLowerCase();
  return assigned.some(a => (a || "").toLowerCase().includes(lower));
};

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

  const stats = useMemo(() => {
    return STARTERS.map(s => {
      const mine = tasks.filter(t => nameMatches(t.assigned_to, s.name));
      const done = mine.filter(t => t.completed).length;
      const total = mine.length;
      const byCategory = new Map<string, number>();
      mine.filter(t => t.completed).forEach(t => {
        const k = (t.category || "Uncategorised").trim() || "Uncategorised";
        byCategory.set(k, (byCategory.get(k) || 0) + 1);
      });
      return {
        starter: s,
        done,
        total,
        rate: total ? Math.round((done / total) * 100) : 0,
        categories: Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]),
      };
    });
  }, [tasks]);

  const leaderboard = useMemo(() => [...stats].sort((a, b) => b.done - a.done), [stats]);
  const topDone = leaderboard[0]?.done || 0;

  const activeStat = open ? stats.find(s => s.starter.name === open.name) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Team Performance</h2>
          <p className="text-sm text-muted-foreground">Our starting five — click a player to see their role and how they're performing.</p>
        </div>
        <Badge variant="outline" className="gap-1.5"><Trophy className="h-3 w-3" /> Starting 5</Badge>
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
              const st = stats.find(x => x.starter.name === s.name);
              const isLeader = st && topDone > 0 && st.done === topDone;
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
                  <text x={s.x} y={s.y + 60} textAnchor="middle" fontSize="11" fill="hsl(var(--muted-foreground))">
                    {st ? `${st.done}/${st.total} done` : ""}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </Card>

      {/* Leaderboard */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Task Leaderboard</h3>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((row, idx) => (
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
                    </span>
                    <span className="text-sm font-semibold text-foreground tabular-nums">{row.done} done</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Progress value={row.rate} className="h-1.5 flex-1" />
                    <span className="text-[11px] text-muted-foreground tabular-nums w-10 text-right">{row.rate}%</span>
                  </div>
                </div>
              </button>
            ))}
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
          {open && activeStat && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-2xl">
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/15 text-primary font-bold">
                    {open.abbr}
                  </span>
                  <div>
                    <div>{open.name}</div>
                    <div className="text-sm font-normal text-muted-foreground">{open.position}</div>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5">
                <p className="text-base text-foreground">{open.role}</p>

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
                    <div className="text-2xl font-bold text-foreground tabular-nums">{activeStat.done}</div>
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Completed</div>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50 text-center">
                    <div className="text-2xl font-bold text-foreground tabular-nums">{activeStat.total}</div>
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Assigned</div>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50 text-center">
                    <div className="text-2xl font-bold text-foreground tabular-nums">{activeStat.rate}%</div>
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Completion</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Types of task completed</h4>
                  {activeStat.categories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No completed tasks yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {activeStat.categories.map(([cat, count]) => {
                        const pct = Math.round((count / activeStat.done) * 100);
                        return (
                          <div key={cat}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-foreground">{cat}</span>
                              <span className="text-muted-foreground tabular-nums">{count} ({pct}%)</span>
                            </div>
                            <Progress value={pct} className="h-1.5" />
                          </div>
                        );
                      })}
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