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
  direction?: "right" | "left";
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export const LateralFilter = ({
  label,
  options,
  selectedValues,
  onToggle,
  onClear,
  direction = "right",
  isExpanded: controlledExpanded,
  onExpandedChange,
}: LateralFilterProps) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  
  const handleToggle = () => {
    const newValue = !isExpanded;
    if (onExpandedChange) {
      onExpandedChange(newValue);
    } else {
      setInternalExpanded(newValue);
    }
  };

  return (
    <div className={cn("inline-flex items-center gap-1", direction === "left" && "flex-row-reverse")}>
      {/* Filter trigger button */}
      <button
        onClick={handleToggle}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 font-bebas uppercase tracking-wider transition-all duration-300 border text-sm",
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
            isExpanded && "rotate-180",
            direction === "left" && "rotate-180"
          )}
        />
      </button>

      {/* Expanded options */}
      <div
        className={cn(
          "flex items-center gap-1 overflow-hidden transition-all duration-300",
          isExpanded ? "max-w-[2000px] opacity-100" : "max-w-0 opacity-0",
          direction === "right" ? "ml-1" : "mr-1 flex-row-reverse"
        )}
      >
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.value);
          return (
            <button
              key={option.value}
              onClick={() => onToggle(option.value)}
              className={cn(
                "px-2 py-1 font-bebas uppercase tracking-wider text-xs transition-all duration-200 border whitespace-nowrap",
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
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            title="Clear selection"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
};