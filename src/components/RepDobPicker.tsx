import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Sleek date-of-birth picker for /representation. Three vertical dial
 * columns (day / month / year) the user drags to spin. Defaults to
 * 01 / 01 / 2000. A small circular gold button to the right confirms.
 *
 * Returns the value as ISO yyyy-mm-dd via onConfirm.
 */

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const MONTH_KEYS = [
  "jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec",
] as const;
const MONTH_FALLBACKS = [
  "JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC",
] as const;
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR - 1939 }, (_, i) => 1940 + i); // 1940..now

const ITEM_HEIGHT = 36; // px

interface DialProps<T extends number | string> {
  values: T[];
  index: number;
  onChange: (i: number) => void;
  format?: (v: T) => string;
  ariaLabel: string;
}

function Dial<T extends number | string>({ values, index, onChange, format, ariaLabel }: DialProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; startIndex: number; pointerId: number | null }>({
    startY: 0, startIndex: 0, pointerId: null,
  });
  const [liveOffset, setLiveOffset] = useState(0);

  const clamp = (i: number) => Math.max(0, Math.min(values.length - 1, i));

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={ariaLabel}
      tabIndex={0}
      className="relative h-[108px] w-full select-none touch-none overflow-hidden rounded-xl border border-primary/25 bg-black/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      onWheel={(e) => {
        e.preventDefault();
        const dir = e.deltaY > 0 ? 1 : -1;
        onChange(clamp(index + dir));
      }}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        drag.current = { startY: e.clientY, startIndex: index, pointerId: e.pointerId };
      }}
      onPointerMove={(e) => {
        if (drag.current.pointerId !== e.pointerId) return;
        const dy = e.clientY - drag.current.startY;
        setLiveOffset(dy);
        const steps = Math.round(-dy / ITEM_HEIGHT);
        const next = clamp(drag.current.startIndex + steps);
        if (next !== index) onChange(next);
      }}
      onPointerUp={(e) => {
        drag.current.pointerId = null;
        setLiveOffset(0);
      }}
      onPointerCancel={() => {
        drag.current.pointerId = null;
        setLiveOffset(0);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") { e.preventDefault(); onChange(clamp(index - 1)); }
        if (e.key === "ArrowDown") { e.preventDefault(); onChange(clamp(index + 1)); }
      }}
    >
      {/* highlight band */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-9 -translate-y-1/2 border-y border-primary/40 bg-primary/5" />
      {/* fades */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black to-transparent" />

      <motion.ul
        animate={{ y: -index * ITEM_HEIGHT + 36 + liveOffset }}
        transition={
          drag.current.pointerId !== null
            ? { duration: 0 }
            : { type: "spring", stiffness: 320, damping: 28 }
        }
        className="absolute inset-x-0 top-0 m-0 list-none p-0"
      >
        {values.map((v, i) => {
          const dist = Math.abs(i - index);
          const opacity = dist === 0 ? 1 : dist === 1 ? 0.55 : 0.22;
          const isCenter = dist === 0;
          return (
            <li
              key={String(v)}
              style={{ height: ITEM_HEIGHT, opacity }}
              className={`flex items-center justify-center font-bebas text-lg uppercase tracking-[0.16em] ${
                isCenter ? "text-primary" : "text-foreground/80"
              }`}
            >
              {format ? format(v) : String(v)}
            </li>
          );
        })}
      </motion.ul>
    </div>
  );
}

interface Props {
  /** Called when the user confirms with the gold button. */
  onConfirm: (iso: string) => void;
}

export const RepDobPicker = ({ onConfirm }: Props) => {
  const { t } = useLanguage();
  const monthLabels = MONTH_KEYS.map((k, i) =>
    t(`representation.month_${k}`, MONTH_FALLBACKS[i])
  );
  // Default 01 / 01 / 2000.
  const [day, setDay]     = useState<number>(0);                                  // index of 1
  const [month, setMonth] = useState<number>(0);                                  // index of JAN
  const [year, setYear]   = useState<number>(YEARS.indexOf(2000));

  // Clamp day if month/year change makes it invalid.
  useEffect(() => {
    const yr = YEARS[year];
    const mo = month + 1;
    const maxDay = new Date(yr, mo, 0).getDate();
    if (day > maxDay - 1) setDay(maxDay - 1);
  }, [month, year, day]);

  const submit = () => {
    const yr = YEARS[year];
    const mo = String(month + 1).padStart(2, "0");
    const dd = String(day + 1).padStart(2, "0");
    onConfirm(`${yr}-${mo}-${dd}`);
  };

  return (
    <div className="flex w-full items-center gap-3">
      <div className="grid flex-1 grid-cols-3 gap-2">
        <Dial ariaLabel="Day" values={DAYS} index={day} onChange={setDay} />
        <Dial ariaLabel="Month" values={monthLabels} index={month} onChange={setMonth} />
        <Dial ariaLabel="Year" values={YEARS} index={year} onChange={setYear} />
      </div>
      <button
        type="button"
        onClick={submit}
        aria-label="Confirm date of birth"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_4px_18px_hsl(var(--gold)/0.45)] transition-transform hover:scale-105 active:scale-95"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
};

export default RepDobPicker;