import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, differenceInDays, startOfYear, endOfYear, isWithinInterval, isSameDay } from "date-fns";

interface Program {
  id: string;
  program_name: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
}

interface SPSTimelineProps {
  programs: Program[];
  playerName: string;
}

const COLORS = [
  "hsl(var(--primary))",
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export const SPSTimeline = ({ programs, playerName }: SPSTimelineProps) => {
  const now = new Date();
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
  const totalDays = differenceInDays(yearEnd, yearStart) + 1;

  const programBars = useMemo(() => {
    return programs
      .filter(p => p.start_date && p.end_date)
      .map((p, i) => {
        const start = new Date(p.start_date!);
        const end = new Date(p.end_date!);
        const clampedStart = start < yearStart ? yearStart : start;
        const clampedEnd = end > yearEnd ? yearEnd : end;
        const leftPct = (differenceInDays(clampedStart, yearStart) / totalDays) * 100;
        const widthPct = ((differenceInDays(clampedEnd, clampedStart) + 1) / totalDays) * 100;
        return {
          ...p,
          start,
          end,
          leftPct: Math.max(0, leftPct),
          widthPct: Math.min(100 - leftPct, widthPct),
          color: COLORS[i % COLORS.length],
        };
      });
  }, [programs, yearStart, yearEnd, totalDays]);

  const todayPct = (differenceInDays(now, yearStart) / totalDays) * 100;

  if (programs.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No programmes with dates set for {playerName}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Programme Timeline — {now.getFullYear()}</h4>
      
      {/* Month headers */}
      <div className="relative">
        <div className="flex border-b border-border">
          {months.map((month) => {
            const monthStart = startOfMonth(month);
            const monthEnd = endOfMonth(month);
            const leftPct = (differenceInDays(monthStart, yearStart) / totalDays) * 100;
            const widthPct = ((differenceInDays(monthEnd, monthStart) + 1) / totalDays) * 100;
            return (
              <div
                key={month.toISOString()}
                className="text-[10px] text-muted-foreground text-center border-r border-border/50 py-1"
                style={{ width: `${widthPct}%` }}
              >
                {format(month, "MMM")}
              </div>
            );
          })}
        </div>

        {/* Programme bars */}
        <div className="relative mt-1" style={{ minHeight: `${programBars.length * 32 + 8}px` }}>
          {programBars.map((bar, i) => (
            <div
              key={bar.id}
              className="absolute h-6 rounded-md flex items-center px-2 text-[10px] font-medium text-white truncate transition-all"
              style={{
                left: `${bar.leftPct}%`,
                width: `${Math.max(bar.widthPct, 1)}%`,
                top: `${i * 32}px`,
                backgroundColor: bar.color,
                opacity: bar.is_current ? 1 : 0.6,
                border: bar.is_current ? '2px solid white' : 'none',
              }}
              title={`${bar.program_name}: ${format(bar.start, "dd MMM")} — ${format(bar.end, "dd MMM")}`}
            >
              {bar.program_name}
            </div>
          ))}

          {/* Today marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
            style={{ left: `${todayPct}%` }}
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-red-500 whitespace-nowrap">
              Today
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2">
        {programBars.map((bar) => (
          <div key={bar.id} className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: bar.color, opacity: bar.is_current ? 1 : 0.6 }} />
            <span className={bar.is_current ? "font-semibold" : "text-muted-foreground"}>
              {bar.program_name}
              {bar.is_current && " (Current)"}
            </span>
            <span className="text-muted-foreground">
              {format(bar.start, "dd MMM")} — {format(bar.end, "dd MMM")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
