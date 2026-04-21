import { Label } from "@/components/ui/label";

export type ReportCategory = "match" | "training";

interface CategoryToggleProps {
  value: ReportCategory;
  onChange: (value: ReportCategory) => void;
  className?: string;
}

/**
 * Match / Training toggle replicated from the analysis editor so
 * performance (data) reports can be tagged the same way.
 */
export const CategoryToggle = ({ value, onChange, className }: CategoryToggleProps) => {
  const current = value || "match";
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Label className="text-sm font-medium whitespace-nowrap">Type</Label>
      <div className="inline-flex rounded-md border bg-muted/30 p-0.5">
        <button
          type="button"
          onClick={() => onChange("match")}
          className={`px-3 py-1 text-xs rounded-sm transition-colors ${
            current === "match"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Match
        </button>
        <button
          type="button"
          onClick={() => onChange("training")}
          className={`px-3 py-1 text-xs rounded-sm transition-colors ${
            current === "training"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Training
        </button>
      </div>
    </div>
  );
};