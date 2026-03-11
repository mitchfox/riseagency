import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { ChevronDown } from "lucide-react";

// Common R90 action scores ordered by frequency of use
const COMMON_SCORES = [
  { value: "0.08", label: "0.08" },
  { value: "0.06", label: "0.06" },
  { value: "0.04", label: "0.04" },
  { value: "0.1", label: "0.10" },
  { value: "0.12", label: "0.12" },
  { value: "0.15", label: "0.15" },
  { value: "0.03", label: "0.03" },
  { value: "0.02", label: "0.02" },
  { value: "0.05", label: "0.05" },
  { value: "0.2", label: "0.20" },
  { value: "0.25", label: "0.25" },
  { value: "0.3", label: "0.30" },
  { value: "0.01", label: "0.01" },
  { value: "-0.04", label: "-0.04" },
  { value: "-0.06", label: "-0.06" },
  { value: "-0.08", label: "-0.08" },
  { value: "-0.1", label: "-0.10" },
  { value: "-0.02", label: "-0.02" },
  { value: "0.5", label: "0.50" },
  { value: "1", label: "1.00" },
];

interface ScoreDropdownProps {
  value: string | number;
  onChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
}

export const ScoreDropdown = ({ value, onChange, className = "", inputClassName = "", disabled = false }: ScoreDropdownProps) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      {dropdownOpen && (
        <div className="absolute z-50 mt-1 w-32 max-h-48 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {COMMON_SCORES.map((score) => (
            <button
              key={score.value}
              type="button"
              className={`w-full text-left px-2 py-1.5 text-xs font-mono rounded hover:bg-accent ${
                String(value) === score.value ? 'bg-primary/20 text-primary font-semibold' : ''
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(score.value);
                setDropdownOpen(false);
              }}
            >
              {score.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
