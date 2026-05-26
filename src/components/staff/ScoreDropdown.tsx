import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ChevronDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ScoreDropdownProps {
  value: string | number;
  onChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  /** Open dropdown upwards instead of downwards */
  dropUp?: boolean;
}

// Cache all scores globally so we only fetch once per session
let cachedScores: { value: string; count: number }[] | null = null;
let fetchPromise: Promise<void> | null = null;

async function loadAllScores() {
  if (cachedScores) return;
  if (fetchPromise) { await fetchPromise; return; }

  fetchPromise = (async () => {
    const freq: Record<string, number> = {};
    const PAGE = 1000;
    let from = 0;
    let keepGoing = true;

    while (keepGoing) {
      const { data, error } = await supabase
        .from("performance_report_actions")
        .select("action_score")
        .not("action_score", "is", null)
        .range(from, from + PAGE - 1);
      if (error || !data) break;
      data.forEach((row: any) => {
        if (row.action_score == null) return;
        const key = String(parseFloat(Number(row.action_score).toFixed(5)));
        freq[key] = (freq[key] || 0) + 1;
      });
      if (data.length < PAGE) keepGoing = false;
      from += PAGE;
    }

    cachedScores = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([val, count]) => ({ value: val, count }));
  })();

  await fetchPromise;
}

export const ScoreDropdown = ({ value, onChange, className = "", inputClassName = "", disabled = false, dropUp = false }: ScoreDropdownProps) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [allScores, setAllScores] = useState<{ value: string; count: number }[]>(cachedScores || []);
  const [localValue, setLocalValue] = useState(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  const applyNegativePrefix = () => {
    const stripped = String(localValue ?? "").replace(/-/g, "");
    const next = stripped ? `-${stripped}` : "-";
    setLocalValue(next);
    if (next !== "-" && next !== String(value ?? "")) onChange(next);
  };

  useEffect(() => {
    setLocalValue(String(value ?? ""));
  }, [value]);

  useEffect(() => {
    loadAllScores().then(() => {
      if (cachedScores) setAllScores(cachedScores);
    });
  }, []);

  // Filter scores based on current input value
  const inputStr = localValue.trim();
  const filtered = inputStr
    ? allScores.filter((s) => s.value.startsWith(inputStr) || s.value.startsWith(inputStr.replace(/^-?0?\.?/, "")))
    : allScores;

  // Show filtered list, cap at 30 for performance
  const displayScores = filtered.slice(0, 30);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={localValue}
          onChange={(e) => {
            // Allow digits, dots, minus sign, and empty
            const v = e.target.value;
            if (v === '' || v === '-' || v === '-.' || /^-?\d*\.?\d*$/.test(v)) {
              setLocalValue(v);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === '-' || e.key === 'Subtract') {
              e.preventDefault();
              applyNegativePrefix();
            }
          }}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => { if (localValue !== String(value ?? "")) onChange(localValue); setTimeout(() => setDropdownOpen(false), 200); }}
          placeholder="Score"
          disabled={disabled}
          className={`pr-6 ${inputClassName}`}
        />
        <button
          type="button"
          className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          title="Make negative"
          onMouseDown={(e) => { e.preventDefault(); applyNegativePrefix(); inputRef.current?.focus(); }}
        >
          <Minus className="h-3 w-3" />
        </button>
        <button
          type="button"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onMouseDown={(e) => {
            e.preventDefault();
            setDropdownOpen(!dropdownOpen);
            inputRef.current?.focus();
          }}
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
      {dropdownOpen && displayScores.length > 0 && (
        <div
          className={`absolute z-50 w-36 max-h-48 overflow-y-auto rounded-md border bg-popover p-1 shadow-md ${
            dropUp ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {displayScores.map((score) => (
            <button
              key={score.value}
              type="button"
              className={`w-full text-left px-2 py-1.5 text-xs font-mono rounded hover:bg-accent flex justify-between items-center ${
                String(value) === score.value ? 'bg-primary/20 text-primary font-semibold' : ''
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                setLocalValue(score.value);
                onChange(score.value);
                setDropdownOpen(false);
              }}
            >
              <span>{score.value}</span>
              <span className="text-[10px] text-muted-foreground ml-2">×{score.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
