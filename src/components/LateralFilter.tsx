import { useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterOption {
  label: string;
  value: string;
}

interface LateralFilterProps {
  label: string;
  options: FilterOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  onClear?: () => void;
}

export const LateralFilter = ({
  label,
  options,
  selectedValues,
  onToggle,
  onClear,
}: LateralFilterProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Filter trigger button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 font-bebas uppercase tracking-wider transition-all duration-300 border",
          isExpanded
            ? "bg-primary text-black border-primary"
            : "bg-transparent text-foreground border-primary/30 hover:border-primary/60"
        )}
      >
        <span>{label}</span>
        {selectedValues.length > 0 && (
          <span className={cn(
            "rounded-full px-2 py-0.5 text-xs",
            isExpanded ? "bg-black/20 text-black" : "bg-primary text-black"
          )}>
            {selectedValues.length}
          </span>
        )}
        <ChevronRight
          className={cn(
            "h-4 w-4 transition-transform duration-300",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {/* Expanded options */}
      <div
        className={cn(
          "flex items-center gap-2 flex-wrap overflow-hidden transition-all duration-300",
          isExpanded ? "max-w-[2000px] opacity-100" : "max-w-0 opacity-0"
        )}
      >
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.value);
          return (
            <button
              key={option.value}
              onClick={() => onToggle(option.value)}
              className={cn(
                "px-3 py-1.5 font-bebas uppercase tracking-wider text-sm transition-all duration-200 border whitespace-nowrap",
                isSelected
                  ? "bg-primary text-black border-primary"
                  : "bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          );
        })}

        {/* Clear selection button */}
        {selectedValues.length > 0 && onClear && (
          <button
            onClick={onClear}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            title="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};