import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileEdit, EyeOff, Radio, ChevronDown } from "lucide-react";

export type VisibilityStatus = "draft" | "hidden" | "live";

interface VisibilityStatusButtonProps {
  value: VisibilityStatus;
  onChange: (status: VisibilityStatus) => void;
  placeholderRawScore?: string;
  placeholderMinutes?: string;
  onPlaceholderRawScoreChange?: (val: string) => void;
  onPlaceholderMinutesChange?: (val: string) => void;
}

const STATUS_CONFIG: Record<VisibilityStatus, { label: string; icon: typeof FileEdit; description: string; className: string }> = {
  draft: {
    label: "Draft",
    icon: FileEdit,
    description: "Player sees a blurred preview, not legible",
    className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  hidden: {
    label: "Hidden",
    icon: EyeOff,
    description: "Only R90 score visible, rest locked",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  live: {
    label: "Live",
    icon: Radio,
    description: "Fully visible to the player",
    className: "bg-green-500/20 text-green-400 border-green-500/30",
  },
};

export const VisibilityStatusButton = ({
  value,
  onChange,
  placeholderRawScore,
  placeholderMinutes,
  onPlaceholderRawScoreChange,
  onPlaceholderMinutesChange,
}: VisibilityStatusButtonProps) => {
  const [open, setOpen] = useState(false);
  const config = STATUS_CONFIG[value];
  const Icon = config.icon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-1.5 border ${config.className} h-8`}
        >
          <Icon className="w-3.5 h-3.5" />
          {config.label}
          <ChevronDown className="w-3 h-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="end">
        <div className="space-y-1">
          {(Object.entries(STATUS_CONFIG) as [VisibilityStatus, typeof config][]).map(([key, cfg]) => {
            const StatusIcon = cfg.icon;
            const isActive = value === key;
            return (
              <button
                key={key}
                onClick={() => {
                  onChange(key);
                  if (key !== "hidden") setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-md flex items-start gap-2.5 transition-colors ${
                  isActive ? "bg-accent" : "hover:bg-accent/50"
                }`}
              >
                <StatusIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <div className={`text-sm font-medium ${isActive ? "text-primary" : ""}`}>{cfg.label}</div>
                  <div className="text-xs text-muted-foreground">{cfg.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        {value === "hidden" && (
          <div className="border-t mt-2 pt-2 space-y-2 px-1">
            <p className="text-xs text-muted-foreground">Placeholder values (shown to player):</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Raw Score</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 12.5"
                  value={placeholderRawScore || ""}
                  onChange={(e) => onPlaceholderRawScoreChange?.(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Minutes</Label>
                <Input
                  type="number"
                  placeholder="e.g. 90"
                  value={placeholderMinutes || ""}
                  onChange={(e) => onPlaceholderMinutesChange?.(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
            </div>
            {placeholderRawScore && placeholderMinutes && parseInt(placeholderMinutes) > 0 && (
              <p className="text-xs text-muted-foreground">
                R90 = {((parseFloat(placeholderRawScore) / parseInt(placeholderMinutes)) * 90).toFixed(2)}
              </p>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export const getVisibilityBadgeConfig = (status: VisibilityStatus) => STATUS_CONFIG[status];
