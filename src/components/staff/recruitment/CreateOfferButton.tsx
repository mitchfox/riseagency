import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link2, Loader2 } from "lucide-react";

const slugify = (name: string) =>
  (name || "").toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

export interface OutreachSourceData {
  name: string;
  position?: string | null;
  nationality?: string | null;
  club?: string | null;
  date_of_birth?: string | null;
  age?: number | null;
  email?: string | null;
}

interface Props {
  source: OutreachSourceData;
  size?: "sm" | "default";
  variant?: "outline" | "default" | "ghost" | "secondary";
  label?: string;
  onCreated?: (slug: string, playerId: string) => void;
  className?: string;
}

export const CreateOfferButton = ({ source, size = "sm", variant = "outline", label = "Create offer link", onCreated, className }: Props) => {
  const [busy, setBusy] = useState(false);

  const run = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!source.name?.trim()) {
      toast.error("No player name to build an offer link");
      return;
    }
    setBusy(true);
    try {
      // 1. Look up player by case-insensitive name match
      const { data: existing } = await (supabase as any)
        .from("players")
        .select("id, name, has_representation_offer")
        .ilike("name", source.name.trim())
        .limit(1)
        .maybeSingle();

      let playerId: string;
      const slug = slugify(source.name);

      if (existing?.id) {
        playerId = existing.id;
        if (!existing.has_representation_offer) {
          await (supabase as any).from("players").update({ has_representation_offer: true }).eq("id", playerId);
        }
      } else {
        // 2. Create new prospect player row
        const insertPayload: any = {
          name: source.name.trim(),
          position: (source.position || "Other") as string,
          nationality: (source.nationality || "Unknown") as string,
          club: source.club || null,
          date_of_birth: source.date_of_birth || null,
          email: source.email || null,
          representation_status: "prospect",
          has_representation_offer: true,
        };
        const { data: created, error: insErr } = await (supabase as any)
          .from("players")
          .insert(insertPayload)
          .select("id")
          .single();
        if (insErr || !created) {
          toast.error("Could not create player record");
          setBusy(false);
          return;
        }
        playerId = created.id;
      }

      const url = `${window.location.origin}/risewithus/${slug}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Offer link copied", {
          description: url,
          action: { label: "Open", onClick: () => window.open(url, "_blank", "noopener,noreferrer") },
        });
      } catch {
        toast.success("Offer link ready", { description: url });
      }
      onCreated?.(slug, playerId);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button type="button" size={size} variant={variant} className={className} onClick={run} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Link2 className="h-4 w-4 mr-1.5" />}
      {label}
    </Button>
  );
};