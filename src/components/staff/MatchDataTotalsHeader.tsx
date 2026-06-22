import { useMemo } from "react";
import { computeStatAverage, formatStat, isPercentageMetric, getStatValue } from "@/lib/statAggregation";
import { effectiveR90, effectiveMinutes } from "@/lib/r90";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface Props {
  analyses: any[];
}

const PRETTY_OVERRIDES: Record<string, string> = {
  xg: "xG",
  xa: "xA",
  npxg: "npxG",
  xgchain: "xGChain",
  xt: "xT",
  gk: "GK",
  pct: "%",
  pass: "Pass",
  per90: "/90",
};

function prettifyKey(key: string): string {
  const cleaned = key.replace(/_per90$/i, "").replace(/_pct$/i, " %").replace(/_/g, " ");
  const words = cleaned.split(/\s+/).filter(Boolean).map((w) => {
    const low = w.toLowerCase();
    if (PRETTY_OVERRIDES[low]) return PRETTY_OVERRIDES[low];
    if (/^[A-Z]{2,}$/.test(w)) return w; // keep acronyms
    return low.charAt(0).toUpperCase() + low.slice(1);
  });
  let label = words.join(" ");
  if (/_per90$/i.test(key)) label += " /90";
  return label;
}

function isNumericValue(v: any): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

const CATEGORY_ORDER = [
  "Attacking",
  "Chance Creation",
  "Passing & Possession",
  "Defending",
  "Goalkeeping",
  "Duels & Physical",
  "Discipline",
  "Other",
] as const;
type StatCategory = typeof CATEGORY_ORDER[number];

function categoriseStatKey(key: string): StatCategory {
  const k = key.toLowerCase();
  if (/(goal|shot|xg|npxg|conversion|finish|sot|on_target|shots_on)/.test(k) && !/conce|saved_against|gk_/.test(k)) {
    return "Attacking";
  }
  if (/(assist|xa|key_pass|chance|cross|through_ball|xgchain|xt\b|big_chance)/.test(k)) {
    return "Chance Creation";
  }
  if (/(pass|possession|touches|carry|carries|progressive|dribble|turnover)/.test(k)) {
    return "Passing & Possession";
  }
  if (/(tackle|interception|clearance|block|recover|press|defensive|ball_won)/.test(k)) {
    return "Defending";
  }
  if (/(save|gk_|keeper|claim|punch|sweep|goals_conce)/.test(k)) {
    return "Goalkeeping";
  }
  if (/(duel|aerial|header|tackle_won|fouled|sprint|distance|hsr|speed)/.test(k)) {
    return "Duels & Physical";
  }
  if (/(card|yellow|red|foul|offside)/.test(k)) {
    return "Discipline";
  }
  return "Other";
}

/**
 * Sub-bucket a key inside its category so we can show clear sub-headings
 * (e.g. Attacking → Goals / Shots / Finishing). Order returned by
 * SUB_ORDER drives render order; "Other" always renders last within its
 * category.
 */
function subCategoriseStatKey(category: StatCategory, key: string): string {
  const k = key.toLowerCase();
  switch (category) {
    case "Attacking":
      if (/conversion|finish|xg_per_shot/.test(k)) return "Finishing";
      if (/sot|on_target|shots_on/.test(k)) return "Shots on target";
      if (/shot/.test(k)) return "Shots";
      if (/xg|npxg/.test(k)) return "Expected goals";
      if (/goal/.test(k)) return "Goals";
      return "Other";
    case "Chance Creation":
      if (/assist/.test(k)) return "Assists";
      if (/xa/.test(k)) return "Expected assists";
      if (/key_pass/.test(k)) return "Key passes";
      if (/cross/.test(k)) return "Crosses";
      if (/through_ball/.test(k)) return "Through balls";
      if (/big_chance|chance/.test(k)) return "Chances created";
      if (/xgchain|xt\b/.test(k)) return "Build-up value";
      return "Other";
    case "Passing & Possession":
      if (/long_pass|long_ball/.test(k)) return "Long passing";
      if (/short_pass/.test(k)) return "Short passing";
      if (/forward_pass|progressive_pass/.test(k)) return "Forward / progressive passing";
      if (/pass.*acc|pass.*pct|pass.*%/.test(k)) return "Pass accuracy";
      if (/pass/.test(k)) return "Passing volume";
      if (/dribble/.test(k)) return "Dribbles & carries";
      if (/carry|carries|progressive_run/.test(k)) return "Carries";
      if (/touches/.test(k)) return "Touches";
      if (/possession/.test(k)) return "Possession";
      if (/turnover/.test(k)) return "Turnovers";
      return "Other";
    case "Defending":
      if (/tackle/.test(k)) return "Tackles";
      if (/interception/.test(k)) return "Interceptions";
      if (/clearance/.test(k)) return "Clearances";
      if (/block/.test(k)) return "Blocks";
      if (/recover|ball_won/.test(k)) return "Ball recoveries";
      if (/press/.test(k)) return "Pressing";
      return "Other";
    case "Goalkeeping":
      if (/save/.test(k)) return "Saves";
      if (/goals_conce/.test(k)) return "Goals conceded";
      if (/claim|punch/.test(k)) return "Crosses & claims";
      if (/sweep/.test(k)) return "Sweeping";
      if (/keeper|gk_/.test(k)) return "Distribution";
      return "Other";
    case "Duels & Physical":
      if (/aerial/.test(k)) return "Aerial duels";
      if (/duel/.test(k)) return "Ground duels";
      if (/sprint/.test(k)) return "Sprints";
      if (/hsr/.test(k)) return "High-speed running";
      if (/distance/.test(k)) return "Distance covered";
      if (/speed/.test(k)) return "Top speed";
      if (/fouled/.test(k)) return "Fouls won";
      return "Other";
    case "Discipline":
      if (/yellow/.test(k)) return "Yellow cards";
      if (/red/.test(k)) return "Red cards";
      if (/foul/.test(k)) return "Fouls";
      if (/offside/.test(k)) return "Offsides";
      return "Other";
    default:
      return "Other";
  }
}

export const MatchDataTotalsHeader = ({ analyses }: Props) => {
  // Discover every numeric stat key appearing across the loaded analyses.
  const allStatKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const a of analyses) {
      const fs = (a?.fixture_stats || {}) as Record<string, any>;
      const ss = (a?.striker_stats || {}) as Record<string, any>;
      for (const k of Object.keys(fs)) if (isNumericValue(Number(fs[k]))) keys.add(k);
      for (const k of Object.keys(ss)) {
        if (k === "stats_order") continue;
        if (isNumericValue(Number(ss[k]))) keys.add(k);
      }
    }
    return Array.from(keys).sort((a, b) => prettifyKey(a).localeCompare(prettifyKey(b)));
  }, [analyses]);

  const totals = useMemo(() => {
    const matches = analyses.length;
    let minutes = 0;
    const r90s: number[] = [];
    for (const a of analyses) {
      const m = effectiveMinutes(a);
      if (m != null) minutes += m;
      const r = effectiveR90(a);
      if (r != null) r90s.push(r);
    }
    const r90Avg = r90s.length ? r90s.reduce((s, v) => s + v, 0) / r90s.length : null;

    // Raw count totals — sum across matches, treating null as 0.
    const sumKey = (key: string) =>
      analyses.reduce((s, a) => {
        const v = getStatValue(a, key);
        return s + (isNumericValue(v as number) ? (v as number) : 0);
      }, 0);

    return {
      matches,
      minutes,
      r90Avg,
      goals: sumKey("goals_per90"),
      assists: sumKey("assists_per90"),
      shots: sumKey("total_shots_per90"),
      keyPasses: sumKey("key_passes_per90"),
    };
  }, [analyses]);

  // ----- Advanced statistical modelling -----
  // Build per-match series for every numeric key, in chronological order
  // (oldest -> newest) so trend slopes read naturally.
  const series = useMemo(() => {
    const sorted = [...analyses].sort((a, b) => {
      const da = new Date(a?.analysis_date || 0).getTime();
      const db = new Date(b?.analysis_date || 0).getTime();
      return da - db;
    });
    const map: Record<string, { values: (number | null)[]; present: number[] }> = {};
    for (const key of allStatKeys) {
      const values = sorted.map((a) => {
        const v = getStatValue(a, key);
        return isNumericValue(v as number) ? (v as number) : null;
      });
      const present = values.filter((v): v is number => v != null);
      map[key] = { values, present };
    }
    const r90Series = sorted.map((a) => effectiveR90(a));
    return { sorted, map, r90Series };
  }, [analyses, allStatKeys]);

  const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;
  const std = (xs: number[]) => {
    if (xs.length < 2) return 0;
    const m = mean(xs);
    return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1));
  };
  // Slope of linear regression of y on time index (per match). Positive
  // = improving, negative = declining.
  const slope = (ys: number[]) => {
    const n = ys.length;
    if (n < 3) return 0;
    const xs = ys.map((_, i) => i);
    const mx = mean(xs);
    const my = mean(ys);
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - mx) * (ys[i] - my);
      den += (xs[i] - mx) ** 2;
    }
    return den === 0 ? 0 : num / den;
  };
  // Pearson correlation between two equal-length series, using only
  // indices where both are present.
  const corr = (a: (number | null)[], b: (number | null)[]) => {
    const pairs: [number, number][] = [];
    for (let i = 0; i < a.length; i++) {
      if (a[i] != null && b[i] != null) pairs.push([a[i] as number, b[i] as number]);
    }
    if (pairs.length < 4) return null;
    const xs = pairs.map((p) => p[0]);
    const ys = pairs.map((p) => p[1]);
    const mx = mean(xs);
    const my = mean(ys);
    let num = 0;
    let dx = 0;
    let dy = 0;
    for (let i = 0; i < pairs.length; i++) {
      num += (xs[i] - mx) * (ys[i] - my);
      dx += (xs[i] - mx) ** 2;
      dy += (ys[i] - my) ** 2;
    }
    const den = Math.sqrt(dx * dy);
    return den === 0 ? null : num / den;
  };

  // Per-key advanced metrics (mean, std, CV, trend, recent vs earlier).
  const advanced = useMemo(() => {
    const out: Record<string, {
      mean: number;
      std: number;
      cv: number; // coefficient of variation
      slope: number;
      trendPct: number; // recent-half vs earlier-half % change
      best: number;
      worst: number;
      n: number;
    }> = {};
    for (const key of allStatKeys) {
      const present = series.map[key].present;
      if (present.length < 2) continue;
      const m = mean(present);
      const s = std(present);
      const sl = slope(present);
      const half = Math.floor(present.length / 2);
      const earlier = present.slice(0, half);
      const recent = present.slice(present.length - half);
      const eMean = earlier.length ? mean(earlier) : 0;
      const rMean = recent.length ? mean(recent) : 0;
      const trendPct = eMean === 0 ? 0 : ((rMean - eMean) / Math.abs(eMean)) * 100;
      out[key] = {
        mean: m,
        std: s,
        cv: m === 0 ? 0 : (s / Math.abs(m)) * 100,
        slope: sl,
        trendPct,
        best: Math.max(...present),
        worst: Math.min(...present),
        n: present.length,
      };
    }
    return out;
  }, [allStatKeys, series]);

  // Correlate every key with R90 to surface what actually moves the
  // performance score for this player. Only show strong, well-evidenced
  // links.
  const r90Drivers = useMemo(() => {
    const items: { key: string; r: number; n: number }[] = [];
    for (const key of allStatKeys) {
      const r = corr(series.map[key].values, series.r90Series);
      if (r == null) continue;
      const n = series.map[key].present.filter((_, i) => series.r90Series[i] != null).length;
      if (n < 4) continue;
      if (Math.abs(r) < 0.4) continue;
      items.push({ key, r, n });
    }
    return items.sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, 12);
  }, [allStatKeys, series]);

  // Most/least consistent stats by coefficient of variation (lower CV =
  // more consistent), restricted to keys with enough data and a non-zero
  // mean.
  const consistency = useMemo(() => {
    const rows = Object.entries(advanced)
      .filter(([, v]) => v.n >= 4 && v.mean !== 0)
      .map(([key, v]) => ({ key, ...v }));
    const sorted = [...rows].sort((a, b) => a.cv - b.cv);
    return {
      mostConsistent: sorted.slice(0, 6),
      mostVolatile: sorted.slice(-6).reverse(),
    };
  }, [advanced]);

  // Strongest non-trivial pairwise correlations between stats. We sample
  // top keys (by presence count) to keep this tractable.
  const statPairCorrs = useMemo(() => {
    const topKeys = [...allStatKeys]
      .filter((k) => series.map[k].present.length >= 4)
      .sort((a, b) => series.map[b].present.length - series.map[a].present.length)
      .slice(0, 30);
    const seen = new Set<string>();
    const pairs: { a: string; b: string; r: number }[] = [];
    for (let i = 0; i < topKeys.length; i++) {
      for (let j = i + 1; j < topKeys.length; j++) {
        const a = topKeys[i];
        const b = topKeys[j];
        const key = a + "|" + b;
        if (seen.has(key)) continue;
        seen.add(key);
        const r = corr(series.map[a].values, series.map[b].values);
        if (r == null) continue;
        if (Math.abs(r) < 0.6) continue;
        pairs.push({ a, b, r });
      }
    }
    return pairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, 12);
  }, [allStatKeys, series]);

  if (analyses.length === 0) return null;

  const grouped: Record<StatCategory, string[]> = {
    "Attacking": [],
    "Chance Creation": [],
    "Passing & Possession": [],
    "Defending": [],
    "Goalkeeping": [],
    "Duels & Physical": [],
    "Discipline": [],
    "Other": [],
  };
  for (const key of allStatKeys) {
    grouped[categoriseStatKey(key)].push(key);
  }

  const totalCards: { label: string; value: string }[] = [
    { label: "Matches", value: String(totals.matches) },
    { label: "Minutes", value: totals.minutes ? String(totals.minutes) : "—" },
    { label: "R90 (avg)", value: totals.r90Avg != null ? totals.r90Avg.toFixed(2) : "—" },
    { label: "Goals", value: totals.goals ? String(Math.round(totals.goals)) : "—" },
    { label: "Assists", value: totals.assists ? String(Math.round(totals.assists)) : "—" },
    { label: "Shots", value: totals.shots ? String(Math.round(totals.shots)) : "—" },
    { label: "Key passes", value: totals.keyPasses ? String(Math.round(totals.keyPasses)) : "—" },
  ];

  const Section = ({
    title,
    count,
    children,
    defaultOpen = false,
  }: {
    title: string;
    count?: string | number;
    children: React.ReactNode;
    defaultOpen?: boolean;
  }) => (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md border border-border/60 bg-background/30 px-3 py-2 hover:bg-background/50 transition">
        <div className="flex items-center gap-2">
          <span className="h-[3px] w-6 bg-[#EBC773]/70" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/90">
            {title}
          </span>
          {count != null && (
            <span className="text-[10px] text-muted-foreground">{count}</span>
          )}
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">{children}</CollapsibleContent>
    </Collapsible>
  );

  const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`;
  const corrLabel = (r: number) => {
    const a = Math.abs(r);
    const strength = a >= 0.8 ? "very strong" : a >= 0.6 ? "strong" : "moderate";
    return `${r >= 0 ? "+" : "−"}${a.toFixed(2)} ${strength}`;
  };

  // ----- Visual helpers (inline SVG) -----
  const RISE_GOLD = "#EBC773";
  const POS = "#34d399";
  const NEG = "#fb7185";

  const Sparkline = ({
    values,
    width = 96,
    height = 24,
    fill = true,
  }: {
    values: (number | null)[];
    width?: number;
    height?: number;
    fill?: boolean;
  }) => {
    const nums = values.filter((v): v is number => v != null);
    if (nums.length < 2) {
      return (
        <svg width={width} height={height} className="opacity-40">
          <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="currentColor" strokeWidth={1} strokeDasharray="2 3" />
        </svg>
      );
    }
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const range = max - min || 1;
    const step = values.length > 1 ? width / (values.length - 1) : width;
    const pts = values
      .map((v, i) => (v == null ? null : [i * step, height - ((v - min) / range) * (height - 2) - 1] as [number, number]))
      .filter((p): p is [number, number] => p != null);
    const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    const areaD = `${pathD} L${pts[pts.length - 1][0].toFixed(1)},${height} L${pts[0][0].toFixed(1)},${height} Z`;
    const last = pts[pts.length - 1];
    const first = pts[0];
    const color = last[1] <= first[1] ? POS : NEG;
    return (
      <svg width={width} height={height} className="overflow-visible">
        {fill && <path d={areaD} fill={color} opacity={0.12} />}
        <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={last[0]} cy={last[1]} r={2} fill={color} />
      </svg>
    );
  };

  const CorrBar = ({ r, width = 120, height = 8 }: { r: number; width?: number; height?: number }) => {
    const mid = width / 2;
    const w = Math.min(1, Math.abs(r)) * (width / 2 - 2);
    const color = r >= 0 ? POS : NEG;
    return (
      <svg width={width} height={height} className="overflow-visible">
        <rect x={0} y={height / 2 - 1} width={width} height={2} fill="currentColor" opacity={0.18} />
        <rect x={r >= 0 ? mid : mid - w} y={0} width={w} height={height} rx={2} fill={color} />
        <rect x={mid - 0.5} y={-2} width={1} height={height + 4} fill="currentColor" opacity={0.45} />
      </svg>
    );
  };

  const ConsistencyStrip = ({
    values,
    width = 150,
    height = 30,
  }: {
    values: (number | null)[];
    width?: number;
    height?: number;
  }) => {
    const nums = values.filter((v): v is number => v != null);
    if (nums.length < 2) return null;
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const range = max - min || 1;
    const m = mean(nums);
    const s = std(nums);
    const yFor = (v: number) => height - ((v - min) / range) * (height - 6) - 3;
    const yMean = yFor(m);
    const yLow = yFor(Math.max(min, m - s));
    const yHigh = yFor(Math.min(max, m + s));
    const step = values.length > 1 ? width / (values.length - 1) : width;
    return (
      <svg width={width} height={height} className="overflow-visible">
        <rect x={0} y={yHigh} width={width} height={Math.max(1, yLow - yHigh)} fill={RISE_GOLD} opacity={0.14} />
        <line x1={0} y1={yMean} x2={width} y2={yMean} stroke={RISE_GOLD} strokeWidth={1} strokeDasharray="3 3" />
        {values.map((v, i) => (v == null ? null : <circle key={i} cx={i * step} cy={yFor(v)} r={2} fill="currentColor" opacity={0.85} />))}
      </svg>
    );
  };

  const MiniScatter = ({
    xs,
    ys,
    width = 140,
    height = 56,
  }: {
    xs: (number | null)[];
    ys: (number | null)[];
    width?: number;
    height?: number;
  }) => {
    const pairs: [number, number][] = [];
    for (let i = 0; i < xs.length; i++) {
      if (xs[i] != null && ys[i] != null) pairs.push([xs[i] as number, ys[i] as number]);
    }
    if (pairs.length < 3) return null;
    const xVals = pairs.map((p) => p[0]);
    const yVals = pairs.map((p) => p[1]);
    const minX = Math.min(...xVals);
    const maxX = Math.max(...xVals);
    const minY = Math.min(...yVals);
    const maxY = Math.max(...yVals);
    const rX = maxX - minX || 1;
    const rY = maxY - minY || 1;
    const px = (v: number) => 4 + ((v - minX) / rX) * (width - 8);
    const py = (v: number) => height - 4 - ((v - minY) / rY) * (height - 8);
    const mx = mean(xVals);
    const my = mean(yVals);
    let num = 0;
    let den = 0;
    for (const [x, y] of pairs) {
      num += (x - mx) * (y - my);
      den += (x - mx) ** 2;
    }
    const slopeXY = den === 0 ? 0 : num / den;
    const intercept = my - slopeXY * mx;
    const lineColor = slopeXY >= 0 ? POS : NEG;
    return (
      <svg width={width} height={height} className="overflow-visible">
        <rect x={0} y={0} width={width} height={height} fill="currentColor" opacity={0.05} rx={3} />
        <line x1={px(minX)} y1={py(slopeXY * minX + intercept)} x2={px(maxX)} y2={py(slopeXY * maxX + intercept)} stroke={lineColor} strokeWidth={1.2} opacity={0.85} />
        {pairs.map(([x, y], i) => (
          <circle key={i} cx={px(x)} cy={py(y)} r={1.8} fill={RISE_GOLD} opacity={0.9} />
        ))}
      </svg>
    );
  };

  return (
    <div className="rounded-lg border-2 border-[#EBC773]/60 bg-card p-4 space-y-4">
      <div>
        <h4 className="text-[11px] uppercase tracking-[0.18em] text-[#EBC773] mb-2">Totals</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {totalCards.map((c) => (
            <div
              key={c.label}
              className="rounded-md border border-[#EBC773]/40 bg-background/40 px-3 py-2"
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</div>
              <div className="text-lg font-semibold text-foreground">{c.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Advanced statistical modelling — collapsed by default. */}
      <div className="space-y-2">
        <h4 className="text-[11px] uppercase tracking-[0.18em] text-[#EBC773]">
          Advanced insights
        </h4>

        <Section title="R90 drivers" count={r90Drivers.length}>
          {r90Drivers.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1">
              Not enough overlapping data yet to link individual stats to R90.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {r90Drivers.map((d) => (
                <div key={d.key} className="rounded-md border border-border/60 bg-background/40 px-2.5 py-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-foreground/90 truncate" title={prettifyKey(d.key)}>{prettifyKey(d.key)}</span>
                    <span className={"text-[10px] tabular-nums font-semibold " + (d.r >= 0 ? "text-emerald-400" : "text-rose-400")}>{(d.r >= 0 ? "+" : "−") + Math.abs(d.r).toFixed(2)}</span>
                  </div>
                  <div className="text-muted-foreground"><CorrBar r={d.r} /></div>
                  <div className="text-muted-foreground/80"><MiniScatter xs={series.map[d.key].values} ys={series.r90Series} height={48} /></div>
                  <div className="text-[10px] text-muted-foreground/80">n={d.n} · {Math.abs(d.r) >= 0.8 ? "very strong" : Math.abs(d.r) >= 0.6 ? "strong" : "moderate"} link to R90</div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-2 px-1">
            Each card plots the stat (x) against R90 (y) match-by-match. The bar shows direction and strength; an up-sloping regression line means the stat lifts R90.
          </p>
        </Section>

        <Section title="Form trends" count={Object.keys(advanced).length}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.entries(advanced)
              .filter(([, v]) => Math.abs(v.trendPct) >= 15 && v.n >= 4)
              .sort((a, b) => Math.abs(b[1].trendPct) - Math.abs(a[1].trendPct))
              .slice(0, 18)
              .map(([key, v]) => (
                <div key={key} className="rounded-md border border-border/60 bg-background/40 px-2.5 py-2 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-foreground/90 truncate" title={prettifyKey(key)}>{prettifyKey(key)}</span>
                    <span className={"text-[10px] tabular-nums font-semibold " + (v.trendPct >= 0 ? "text-emerald-400" : "text-rose-400")}>{fmtPct(v.trendPct)}</span>
                  </div>
                  <div className="text-muted-foreground"><Sparkline values={series.map[key].values} width={150} height={28} /></div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 tabular-nums">
                    <span>avg {v.mean.toFixed(2)}</span>
                    <span>peak {v.best.toFixed(2)}</span>
                  </div>
                </div>
              ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 px-1">
            Recent half of the window compared to the earlier half. Useful for spotting what's heating up or cooling off.
          </p>
        </Section>

        <Section title="Consistency" count={consistency.mostConsistent.length + consistency.mostVolatile.length}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Most consistent</div>
              <div className="space-y-1">
                {consistency.mostConsistent.map((row) => (
                  <div key={row.key} className="rounded border border-border/60 bg-background/40 px-2 py-1.5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] truncate" title={prettifyKey(row.key)}>{prettifyKey(row.key)}</span>
                      <span className="text-[10px] tabular-nums text-foreground/80">±{row.std.toFixed(2)} <span className="text-muted-foreground">({row.cv.toFixed(0)}% CV)</span></span>
                    </div>
                    <div className="text-muted-foreground"><ConsistencyStrip values={series.map[row.key].values} /></div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Most volatile</div>
              <div className="space-y-1">
                {consistency.mostVolatile.map((row) => (
                  <div key={row.key} className="rounded border border-border/60 bg-background/40 px-2 py-1.5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] truncate" title={prettifyKey(row.key)}>{prettifyKey(row.key)}</span>
                      <span className="text-[10px] tabular-nums text-foreground/80">±{row.std.toFixed(2)} <span className="text-muted-foreground">({row.cv.toFixed(0)}% CV)</span></span>
                    </div>
                    <div className="text-muted-foreground"><ConsistencyStrip values={series.map[row.key].values} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 px-1">
            Gold band = ±1σ around the mean, dashed line = mean. Dots are individual matches — tight clusters are the reliable floor, wide spreads are fixable swings.
          </p>
        </Section>

        <Section title="Stat interactions" count={statPairCorrs.length}>
          {statPairCorrs.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1">No strong pairwise links surfaced in this window.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {statPairCorrs.map((p) => (
                <div key={p.a + p.b} className="rounded-md border border-border/60 bg-background/40 px-2.5 py-2 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[11px] text-foreground/90 truncate" title={prettifyKey(p.a)}>{prettifyKey(p.a)}</div>
                      <div className="text-[10px] text-muted-foreground truncate" title={prettifyKey(p.b)}>vs {prettifyKey(p.b)}</div>
                    </div>
                    <span className={"text-[10px] tabular-nums font-semibold shrink-0 " + (p.r >= 0 ? "text-emerald-400" : "text-rose-400")}>{(p.r >= 0 ? "+" : "−") + Math.abs(p.r).toFixed(2)}</span>
                  </div>
                  <div className="text-muted-foreground/80"><MiniScatter xs={series.map[p.a].values} ys={series.map[p.b].values} width={160} height={60} /></div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-2 px-1">
            Each scatter plots two stats match-by-match with a best-fit line. Up-sloping = they rise together, down-sloping = they trade off.
          </p>
        </Section>
      </div>

      {allStatKeys.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-[11px] uppercase tracking-[0.18em] text-[#EBC773]">
            Season averages by category
          </h4>
          {CATEGORY_ORDER.filter((cat) => grouped[cat].length > 0).map((cat) => {
            // Build sub-buckets, preserving insertion order so common buckets
            // (e.g. Goals, Shots) appear before catch-all "Other".
            const subBuckets: Record<string, string[]> = {};
            for (const key of grouped[cat]) {
              const sub = subCategoriseStatKey(cat, key);
              if (!subBuckets[sub]) subBuckets[sub] = [];
              subBuckets[sub].push(key);
            }
            const subNames = Object.keys(subBuckets).sort((a, b) => {
              if (a === "Other") return 1;
              if (b === "Other") return -1;
              return a.localeCompare(b);
            });
            return (
              <Section key={cat} title={cat} count={grouped[cat].length}>
                <div className="space-y-2.5">
                  {subNames.map((sub) => (
                    <div key={sub} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="h-px flex-1 bg-border/60" />
                        <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          {sub}
                        </span>
                        <span className="h-px flex-1 bg-border/60" />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
                        {subBuckets[sub].map((key) => {
                          const avg = computeStatAverage(analyses, key);
                          const suffix = isPercentageMetric(key) ? "%" : "";
                          const display = avg == null ? "—" : `${formatStat(key, avg, true)}${suffix}`;
                          const seriesValues = series.map[key]?.values || [];
                          return (
                            <div
                              key={key}
                              className="rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5 space-y-1"
                            >
                              <div className="text-[10px] text-muted-foreground truncate" title={prettifyKey(key)}>
                                {prettifyKey(key)}
                              </div>
                              <div className="flex items-end justify-between gap-2">
                                <div className="text-sm font-semibold text-foreground tabular-nums">{display}</div>
                                <div className="text-muted-foreground/70">
                                  <Sparkline values={seriesValues} width={56} height={18} fill={false} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            );
          })}
        </div>
      )}
    </div>
  );
};