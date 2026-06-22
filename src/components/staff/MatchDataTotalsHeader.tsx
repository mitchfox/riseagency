import { useMemo } from "react";
import { computeStatAverage, formatStat, isPercentageMetric, getStatValue } from "@/lib/statAggregation";
import { effectiveR90, effectiveMinutes } from "@/lib/r90";

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

  return (
    <div className="rounded-lg border-2 border-[#C6A332]/60 bg-card p-4 space-y-4">
      <div>
        <h4 className="text-[11px] uppercase tracking-[0.18em] text-[#C6A332] mb-2">Totals</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {totalCards.map((c) => (
            <div
              key={c.label}
              className="rounded-md border border-[#C6A332]/40 bg-background/40 px-3 py-2"
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</div>
              <div className="text-lg font-semibold text-foreground">{c.value}</div>
            </div>
          ))}
        </div>
      </div>
      {allStatKeys.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-[11px] uppercase tracking-[0.18em] text-[#C6A332]">
            Season averages by category
          </h4>
          {CATEGORY_ORDER.filter((cat) => grouped[cat].length > 0).map((cat) => (
            <div key={cat} className="rounded-md border border-border/60 bg-background/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="h-[3px] w-6 bg-[#C6A332]/70" />
                <h5 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/90">
                  {cat}
                </h5>
                <span className="text-[10px] text-muted-foreground ml-1">
                  {grouped[cat].length}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
                {grouped[cat].map((key) => {
                  const avg = computeStatAverage(analyses, key);
                  const suffix = isPercentageMetric(key) ? "%" : "";
                  const display = avg == null ? "—" : `${formatStat(key, avg, true)}${suffix}`;
                  return (
                    <div
                      key={key}
                      className="rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5"
                    >
                      <div className="text-[10px] text-muted-foreground truncate" title={prettifyKey(key)}>
                        {prettifyKey(key)}
                      </div>
                      <div className="text-sm font-semibold text-foreground tabular-nums">{display}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};