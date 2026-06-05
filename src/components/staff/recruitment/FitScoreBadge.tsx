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
    const r = computeFitScore(player, targets, settings.weights, settings.age_sweet_spot_band, scope);
    return { total: r.total, reasons: r.reasons, target_name: r.target_name };
  }, [player, targets, settings, scope, cachedScore, cachedBreakdown]);

  const total = computed.total;
  const colour = total >= 80
    ? "text-primary border-primary bg-primary/10"
    : total >= 60
      ? "text-emerald-500 border-emerald-500/60 bg-emerald-500/10"
      : total >= 40
        ? "text-amber-500 border-amber-500/60 bg-amber-500/10"
        : "text-muted-foreground border-border bg-muted/40";

  const dim = size === "md" ? "h-9 w-9 text-xs" : "h-7 w-7 text-[10px]";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex items-center justify-center rounded-full border-2 font-semibold leading-none shrink-0",
            dim,
            colour,
            className,
          )}
          aria-label={`Fit score ${total}`}
        >
          {total}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 bg-popover" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-semibold">Fit score</div>
            <div className={cn("text-2xl font-bold", colour.split(" ")[0])}>{total}</div>
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