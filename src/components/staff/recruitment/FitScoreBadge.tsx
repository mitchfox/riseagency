import { useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { computeFitScore, type PlayerLike } from "@/lib/fitScore";
import { useRecruitmentTargets, useScoringSettings } from "@/hooks/useRecruitmentScoring";
import { cn } from "@/lib/utils";

interface Props {
  player: PlayerLike;
  scope?: "youth" | "pro";
  size?: "sm" | "md";
  className?: string;
  /** Pre-computed cached score; falls back to live deterministic if absent. */
  cachedScore?: number | null;
  cachedBreakdown?: { reasons?: string[]; target_name?: string | null } | null;
}

export const FitScoreBadge = ({ player, scope, size = "sm", className, cachedScore, cachedBreakdown }: Props) => {
  const { targets } = useRecruitmentTargets();
  const { settings } = useScoringSettings();

  const computed = useMemo(() => {
    if (typeof cachedScore === "number" && cachedScore > 0 && cachedBreakdown) {
      return {
        total: cachedScore,
        reasons: cachedBreakdown.reasons || [],
        target_name: cachedBreakdown.target_name ?? null,
      };
    }
    const r = computeFitScore(player, targets, settings.weights, settings.age_sweet_spot_band, scope, settings.bonus_weights);
    return { total: r.total, reasons: r.reasons, target_name: r.target_name };
  }, [player, targets, settings, scope, cachedScore, cachedBreakdown]);

  const total = Math.max(0, Math.min(100, Math.round(computed.total)));

  // Colour ramp: red (0) → orange (25) → yellow (50) → green (75) → green→gold (85) → rise gold (100)
  // Returns HSL string interpolated between stops.
  const stops: Array<[number, [number, number, number]]> = [
    [0,   [0,   85, 50]],   // red
    [25,  [20,  90, 52]],   // red-orange
    [50,  [50,  90, 52]],   // yellow
    [75,  [130, 70, 42]],   // green
    [85,  [85,  65, 45]],   // yellow-green
    [100, [45,  62, 42]],   // rise gold (~ #C6A332)
  ];
  let h = 0, s = 0, l = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (total >= t0 && total <= t1) {
      const f = (total - t0) / (t1 - t0 || 1);
      h = c0[0] + (c1[0] - c0[0]) * f;
      s = c0[1] + (c1[1] - c0[1]) * f;
      l = c0[2] + (c1[2] - c0[2]) * f;
      break;
    }
  }
  const colourHsl = `hsl(${h.toFixed(0)}, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`;
  const tintHsl = `hsl(${h.toFixed(0)}, ${s.toFixed(0)}%, ${Math.min(l + 12, 65).toFixed(0)}%)`;

  const dim = size === "md" ? "h-9 w-9 text-xs" : "h-7 w-7 text-[10px]";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex items-center justify-center rounded-full font-bold leading-none shrink-0 text-white shadow-sm",
            dim,
            className,
          )}
          style={{
            background: `radial-gradient(circle at 30% 30%, ${tintHsl}, ${colourHsl} 75%)`,
            border: `2px solid ${colourHsl}`,
            textShadow: "0 1px 1px rgba(0,0,0,0.45)",
          }}
          aria-label={`Fit score ${total}`}
        >
          {total}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 bg-popover" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-semibold">Fit score</div>
            <div className="text-2xl font-bold" style={{ color: colourHsl }}>{total}</div>
          </div>
          {computed.target_name && (
            <div className="text-xs text-muted-foreground">Best target: <span className="text-foreground font-medium">{computed.target_name}</span></div>
          )}
          <ul className="space-y-1 pt-1 border-t border-border">
            {computed.reasons.slice(0, 6).map((r, i) => (
              <li key={i} className="text-xs text-muted-foreground">{r}</li>
            ))}
            {computed.reasons.length === 0 && (
              <li className="text-xs text-muted-foreground italic">No target match.</li>
            )}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
};