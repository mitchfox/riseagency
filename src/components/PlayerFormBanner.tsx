import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FORM_STAT_OPTIONS } from "@/components/staff/PlayerFormConfigTab";

interface Props { playerId: string; }

type StatItem = { key: string; mode: 'auto' | 'manual'; value: string };

const isPct = (k: string) => k.endsWith("_pct") || k.endsWith("%");

const num = (row: any, key: string): number | null => {
  const fs = row.fixture_stats || {};
  const ss = row.striker_stats || {};
  const v = fs[key] ?? ss[key] ?? row[key];
  if (v == null) return null;
  if (typeof v === "number") return v;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

const sumOrAvg = (rows: any[], key: string, mode: 'sum' | 'avg') => {
  const vals = rows.map(r => num(r, key)).filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  const total = vals.reduce((s, v) => s + v, 0);
  return mode === 'sum' ? total : total / vals.length;
};

const fmt = (v: number | null, key: string) => {
  if (v == null) return "—";
  if (isPct(key)) return `${Math.round(v)}%`;
  return v % 1 === 0 ? v.toString() : v.toFixed(2);
};

// Counting stats summed across the window; rate/percentage stats averaged
const SUM_KEYS = new Set(["goals", "assists", "xg", "xa"]);

export const PlayerFormBanner = ({ playerId }: Props) => {
  const [config, setConfig] = useState<{ window_size: number; stats: StatItem[] } | null>(null);
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
      const items: StatItem[] = cfg.stats
        .map((it: any) =>
          typeof it === 'string'
            ? { key: it, mode: 'auto' as const, value: '' }
            : { key: it.key, mode: (it.mode === 'manual' ? 'manual' : 'auto') as 'auto' | 'manual', value: it.value != null ? String(it.value) : '' }
        )
        .filter((it: StatItem) => FORM_STAT_OPTIONS.some(o => o.key === it.key));
      setConfig({ window_size: cfg.window_size || 5, stats: items });

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

  if (!config || config.stats.length === 0) return null;

  const items = config.stats.map((s) => {
    const opt = FORM_STAT_OPTIONS.find(o => o.key === s.key);
    if (!opt) return null;
    let value: number | null = null;
    if (s.mode === 'manual') {
      const trimmed = (s.value ?? '').trim();
      if (trimmed !== '') {
        const n = parseFloat(trimmed);
        value = isNaN(n) ? null : n;
      }
    } else {
      const aggMode = SUM_KEYS.has(s.key) ? 'sum' : 'avg';
      value = rows.length > 0 ? sumOrAvg(rows, s.key, aggMode) : null;
    }
    return { key: s.key, label: opt.label, value };
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
