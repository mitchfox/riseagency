import { Star } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Tbl = "player_outreach_youth" | "player_outreach_pro" | "players";

interface Props {
  id: string;
  table: Tbl;
  initial: boolean;
  size?: number;
  className?: string;
  onChange?: (next: boolean) => void;
}

/**
 * Shared filled/hollow gold-star toggle for the recruitment shortlist.
 */
export const StarToggle = ({ id, table, initial, size = 16, className, onChange }: Props) => {
  const [starred, setStarred] = useState<boolean>(initial);
  const [busy, setBusy] = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (busy) return;
    const next = !starred;
    setStarred(next);
    setBusy(true);
    const { error } = await (supabase.from(table) as any)
      .update({ is_starred: next, starred_at: next ? new Date().toISOString() : null })
      .eq("id", id);
    setBusy(false);
    if (error) {
      setStarred(!next);
      toast.error("Could not update shortlist", { description: error.message });
      return;
    }
    onChange?.(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={starred ? "Remove from shortlist" : "Add to shortlist"}
      className={cn("inline-flex items-center justify-center hover:scale-110 transition-transform", className)}
      aria-pressed={starred}
    >
      <Star
        size={size}
        className={cn(starred ? "text-primary" : "text-muted-foreground/50 hover:text-primary/70")}
        fill={starred ? "currentColor" : "none"}
      />
    </button>
  );
};