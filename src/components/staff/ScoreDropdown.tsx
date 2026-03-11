import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ScoreDropdownProps {
  value: string | number;
  onChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
}

// Cache scores globally so we only fetch once per session
let cachedScores: { value: string; label: string; count: number }[] | null = null;
let fetchPromise: Promise<void> | null = null;

async function loadCommonScores() {
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
        // Round to avoid floating point noise, keep up to 5 decimals
        const key = String(parseFloat(Number(row.action_score).toFixed(5)));
        freq[key] = (freq[key] || 0) + 1;
      });
      if (data.length < PAGE) keepGoing = false;
      from += PAGE;
    }

    cachedScores = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([val, count]) => ({
        value: val,
        label: val,
        count,
      }));
  })();

  await fetchPromise;
}

export const ScoreDropdown = ({ value, onChange, className = "", inputClassName = "", disabled = false }: ScoreDropdownProps) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scores, setScores] = useState<{ value: string; label: string; count: number }[]>(cachedScores || []);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCommonScores().then(() => {
      if (cachedScores) setScores(cachedScores);
    });
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="number"
          step="0.00001"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
          placeholder="Score"
          disabled={disabled}
          className={`pr-6 ${inputClassName}`}
        />
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
      {dropdownOpen && scores.length > 0 && (
        <div className="absolute z-50 mt-1 w-36 max-h-48 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {scores.map((score) => (
            <button
              key={score.value}
              type="button"
              className={`w-full text-left px-2 py-1.5 text-xs font-mono rounded hover:bg-accent flex justify-between items-center ${
                String(value) === score.value ? 'bg-primary/20 text-primary font-semibold' : ''
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(score.value);
                setDropdownOpen(false);
              }}
            >
              <span>{score.label}</span>
              <span className="text-[10px] text-muted-foreground ml-2">×{score.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
