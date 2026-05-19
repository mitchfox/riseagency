import React, { useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronsUpDown } from "lucide-react";

/**
 * Minute input that:
 *   - Renders as mm.ss snapped to 5-second steps (00, 05, 10, ..., 55)
 *   - Wheel up/down on desktop = +/- 5 seconds
 *   - Vertical touch drag on mobile = +/- 5 seconds per ~8px
 *   - Click-to-edit still works as a normal text input; blur snaps + reformats
 */

const STEP_SECONDS = 5;
const PIXELS_PER_STEP = 8;

const parseMmSs = (raw: string | null | undefined): number | null => {
  if (raw === null || raw === undefined) return null;
  const str = String(raw).trim();
  if (!str) return null;
  const parts = str.split(".");
  const mins = parseInt(parts[0] || "0", 10);
  const secs = parseInt((parts[1] || "0").padEnd(2, "0").slice(0, 2), 10);
  if (isNaN(mins) && isNaN(secs)) return null;
  return (isNaN(mins) ? 0 : mins) * 60 + (isNaN(secs) ? 0 : secs);
};

const secondsToMmSs = (total: number): string => {
  const t = Math.max(0, Math.round(total));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}.${s.toString().padStart(2, "0")}`;
};

const snapToStep = (totalSeconds: number): number => {
  return Math.round(totalSeconds / STEP_SECONDS) * STEP_SECONDS;
};

export const snapMinuteString = (raw: string | null | undefined): string => {
  const t = parseMmSs(raw);
  if (t === null) return "";
  return secondsToMmSs(snapToStep(t));
};

interface FlywheelMinuteInputProps {
  value: string;
  onChange: (next: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export const FlywheelMinuteInput: React.FC<FlywheelMinuteInputProps> = ({
  value,
  onChange,
  onBlur,
  placeholder,
  className,
  ariaLabel,
  disabled,
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartSeconds = useRef<number>(0);

  const adjustBy = useCallback(
    (deltaSteps: number) => {
      const current = parseMmSs(value) ?? 0;
      const snapped = snapToStep(current);
      const next = Math.max(0, snapped + deltaSteps * STEP_SECONDS);
      onChange(secondsToMmSs(next));
    },
    [value, onChange],
  );

  // Wheel handler — attached natively so we can call preventDefault on a non-passive listener
  useEffect(() => {
    const el = ref.current;
    if (!el || disabled) return;
    const handler = (e: WheelEvent) => {
      // Only act when focused or hovered
      const isHover = el.matches(":hover");
      const isFocus = document.activeElement === el;
      if (!isHover && !isFocus) return;
      e.preventDefault();
      const step = e.deltaY > 0 ? -1 : 1; // wheel up = +5s
      adjustBy(step);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [adjustBy, disabled]);

  const handleTouchStart = (e: React.TouchEvent<HTMLInputElement>) => {
    if (disabled) return;
    touchStartY.current = e.touches[0].clientY;
    const current = parseMmSs(value) ?? 0;
    touchStartSeconds.current = snapToStep(current);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLInputElement>) => {
    if (disabled || touchStartY.current === null) return;
    const dy = touchStartY.current - e.touches[0].clientY;
    const steps = Math.trunc(dy / PIXELS_PER_STEP);
    if (steps === 0) return;
    e.preventDefault();
    const next = Math.max(0, touchStartSeconds.current + steps * STEP_SECONDS);
    onChange(secondsToMmSs(next));
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

  const handleBlur = () => {
    if (value) onChange(snapMinuteString(value));
    onBlur?.();
  };

  return (
    <div className="relative inline-block w-full">
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        placeholder={placeholder}
        aria-label={ariaLabel || "Minute"}
        title="Scroll / drag to adjust in 5s steps, or click to type"
        disabled={disabled}
        className={cn(
          "touch-none select-none cursor-ns-resize pr-6 border-primary/40 focus-visible:ring-primary/40",
          className,
        )}
        style={{ touchAction: "none" }}
      />
      <ChevronsUpDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-primary/60" />
    </div>
  );
};

export default FlywheelMinuteInput;