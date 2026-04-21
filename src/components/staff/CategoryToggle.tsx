import { Label } from "@/components/ui/label";

export type ReportCategory = "match" | "training" | "highlights";

interface CategoryToggleProps {
  value: ReportCategory;
  onChange: (value: ReportCategory) => void;
  className?: string;
}

const OPTIONS: { value: ReportCategory; label: string }[] = [
  { value: "match", label: "Match" },
  { value: "training", label: "Training" },
  { value: "highlights", label: "Highlights" },
];

/**
 * Match / Training / Highlights toggle replicated from the analysis editor so
 * performance (data) reports can be tagged the same way.
 */
export const CategoryToggle = ({ value, onChange, className }: CategoryToggleProps) => {
  const current = value || "match";
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Label className="text-sm font-medium whitespace-nowrap">Type</Label>
      <div className="inline-flex rounded-md border bg-muted/30 p-0.5">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1 text-xs rounded-sm transition-colors ${
              current === opt.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};