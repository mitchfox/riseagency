import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useRecruitmentTargets } from "@/hooks/useRecruitmentScoring";

interface Template {
  id: string;
  title: string;
  message_content: string;
  category: string | null;
  target_id: string | null;
  position_tags: string[] | null;
  scope: string | null;
}

interface Props {
  playerName: string;
  position?: string | null;
  club?: string | null;
  age?: number | null;
  offerSlug?: string | null;
  scope?: "youth" | "pro";
  /** Hint of best-fit target — if provided, used to pick default template */
  preferredTargetId?: string | null;
  compact?: boolean;
}

let cached: Template[] | null = null;

const fillMerge = (tpl: string, vars: Record<string, string>): string =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);

/**
 * Mirror ClubOutreachManager.applyOutreachLink — if a template was copied
 * from a previous player it'll still contain that player's URL hard-coded.
 * Rewrite any Rise/Lovable URL to the current player's offer link so the
 * recipient always lands on the right invitation.
 */
const applyOfferLink = (text: string, url: string): string => {
  if (!url) return text;
  return text.replace(/https?:\/\/\S*(?:risefootballagency\.com|lovable\.app|lovableproject\.com)\S*/gi, url);
};

export const TemplatePickerInline = ({ playerName, position, club, age, offerSlug, scope, preferredTargetId, compact }: Props) => {
  const { targets } = useRecruitmentTargets();
  const [templates, setTemplates] = useState<Template[]>(cached || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (cached) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("whatsapp_quick_messages")
        .select("id,title,message_content,category,target_id,position_tags,scope");
      cached = (data as any) || [];
      setTemplates(cached);
    })();
  }, []);

  // Find target's default template if preferredTargetId is set
  const defaultTemplateId = useMemo(() => {
    if (selectedId) return selectedId;
    if (preferredTargetId) {
      const t = targets.find(x => x.id === preferredTargetId) as any;
      if (t?.default_whatsapp_template_id) return t.default_whatsapp_template_id as string;
      // fallback: template tagged with this target
      const tagged = templates.find(tp => tp.target_id === preferredTargetId);
      if (tagged) return tagged.id;
    }
    // position match
    if (position) {
      const posMatch = templates.find(tp => (tp.position_tags || []).map(p => p.toUpperCase()).includes(position.toUpperCase()));
      if (posMatch) return posMatch.id;
    }
    // scope match
    if (scope) {
      const scopeMatch = templates.find(tp => tp.scope === scope);
      if (scopeMatch) return scopeMatch.id;
    }
    return templates[0]?.id ?? null;
  }, [selectedId, preferredTargetId, position, scope, templates, targets]);

  const current = templates.find(t => t.id === defaultTemplateId) || null;

  const filled = useMemo(() => {
    if (!current) return "";
    const offerLink = offerSlug ? `https://risefootballagency.com/risewithus/${offerSlug}` : "";
    const merged = fillMerge(current.message_content, {
      name: playerName,
      first_name: playerName.split(" ")[0] || playerName,
      position: position || "",
      club: club || "",
      age: age != null ? String(age) : "",
      offer_link: offerLink,
    });
    return applyOfferLink(merged, offerLink);
  }, [current, playerName, position, club, age, offerSlug]);

  const copy = async () => {
    if (!filled) {
      toast.error("No template available");
      return;
    }
    try {
      await navigator.clipboard.writeText(filled);
      toast.success("Template copied", { description: current?.title });
    } catch {
      toast.error("Clipboard unavailable");
    }
  };

  if (templates.length === 0) return null;

  if (compact) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); copy(); }} title={current?.title || "Copy template"}>
        <MessageSquare className="h-3.5 w-3.5 mr-1" />
        Copy template
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={defaultTemplateId ?? undefined} onValueChange={setSelectedId}>
        <SelectTrigger className="h-8 text-xs flex-1 min-w-0">
          <SelectValue placeholder="Choose template" />
        </SelectTrigger>
        <SelectContent>
          {templates.map(t => (
            <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); copy(); }} title="Copy filled template">
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};