import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FORM_STAT_OPTIONS } from "@/components/staff/PlayerFormConfigTab";

interface Props { playerId: string; }

const STAT_DERIVERS: Record<string, (rows: any[]) => number | null> = {
  goals: rows => sum(rows, "goals"),
  assists: rows => sum(rows, "assists"),
  passes_per_game: rows => avg(rows, "passes_completed"),
  pass_pct: rows => pct(rows, "passes_completed", "passes_attempted"),
  dribbles_per_game: rows => avg(rows, "dribbles_completed"),
  dribble_pct: rows => pct(rows, "dribbles_completed", "dribbles_attempted"),
  shots_per_game: rows => avg(rows, "shots"),
  shots_on_target_pct: rows => pct(rows, "shots_on_target", "shots"),
  tackles_per_game: rows => avg(rows, "tackles"),
  interceptions_per_game: rows => avg(rows, "interceptions"),
  duels_won_pct: rows => pct(rows, "duels_won", "duels_total"),
  aerial_duels_won_pct: rows => pct(rows, "aerial_duels_won", "aerial_duels_total"),
  minutes_per_game: rows => avg(rows, "minutes_played"),
};

const isPct = (k: string) => k.endsWith("_pct");

const num = (row: any, key: string): number | null => {
  const fs = row.fixture_stats || {};
  const ss = row.striker_stats || {};
  const v = fs[key] ?? ss[key] ?? row[key];
  return typeof v === "number" ? v : v != null && !isNaN(parseFloat(v)) ? parseFloat(v) : null;
};
const sum = (rows: any[], key: string) => {
  const vals = rows.map(r => num(r, key)).filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  return vals.reduce((s, v) => s + v, 0);
};
const avg = (rows: any[], key: string) => {
  const total = sum(rows, key);
  if (total == null) return null;
  return total / rows.length;
};
const pct = (rows: any[], successKey: string, totalKey: string) => {
  const s = sum(rows, successKey);
  const t = sum(rows, totalKey);
  if (s == null || t == null || t === 0) return null;
  return (s / t) * 100;
};

const fmt = (v: number | null, key: string) => {
  if (v == null) return "—";
  if (isPct(key)) return `${Math.round(v)}%`;
  return v % 1 === 0 ? v.toString() : v.toFixed(1);
};

export const PlayerFormBanner = ({ playerId }: Props) => {
  const [config, setConfig] = useState<{ window_size: number; stats: string[] } | null>(null);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;
    (async () => {
      const { data: cfg } = await (supabase as any)
        .from("player_form_config")
        .select("window_size, stats")
        .eq("player_id", playerId)
        .maybeSingle();
      if (cancelled || !cfg || !Array.isArray(cfg.stats) || cfg.stats.length === 0) return;
      setConfig({ window_size: cfg.window_size || 5, stats: cfg.stats });

      const { data: analyses } = await supabase
        .from("player_analysis")
        .select("analysis_date, striker_stats, fixture_stats, minutes_played")
        .eq("player_id", playerId)
        .order("analysis_date", { ascending: false })
        .limit(cfg.window_size || 5);
      if (!cancelled && analyses) setRows(analyses);
    })();
    return () => { cancelled = true; };
  }, [playerId]);

  if (!config || rows.length === 0) return null;

  const items = config.stats.map((key) => {
    const opt = FORM_STAT_OPTIONS.find(o => o.key === key);
    if (!opt) return null;
    const deriver = STAT_DERIVERS[key];
    const value = deriver ? deriver(rows) : null;
    return { key, label: opt.label, value };
  }).filter(Boolean) as { key: string; label: string; value: number | null }[];

  if (items.length === 0) return null;

  return (
    <div className="mb-4 -mx-4 overflow-x-auto px-4">
      <div className="flex min-w-max items-stretch gap-2 rounded-md border border-primary/20 bg-secondary/30 p-2">
        <div className="flex items-center px-2 text-[10px] font-bebas uppercase tracking-widest text-primary">Form · Last {config.window_size}</div>
        {items.map(item => (
          <div key={item.key} className="flex flex-col items-center justify-center rounded bg-background/40 px-3 py-1.5 min-w-[78px]">
            <span className="font-bebas text-xl text-primary leading-none">{fmt(item.value, item.key)}</span>
            <span className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground text-center leading-tight">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerFormBanner;