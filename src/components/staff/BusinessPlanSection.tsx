import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, Unlock, Loader2, Briefcase } from "lucide-react";
import { toast } from "sonner";

const PASSWORD = "Jolon";
const SESSION_KEY = "business_plan_unlocked";

type Field = {
  key:
    | "executive_summary"
    | "business_description"
    | "markets"
    | "swot_strengths"
    | "swot_weaknesses"
    | "swot_opportunities"
    | "swot_threats"
    | "management_personnel"
    | "products_services"
    | "marketing"
    | "financial_plan";
  label: string;
  description: string;
  rows?: number;
};

type Section = {
  number: number;
  title: string;
  intro: string;
  fields: Field[];
};

const SECTIONS: Section[] = [
  {
    number: 1,
    title: "Executive Summary",
    intro:
      "An overview of the entire business. Cover the five Ws (who, what, why, when, where) and the mission statement. Why was the business started, where should it be in future, and how will it get there?",
    fields: [
      { key: "executive_summary", label: "Executive Summary", description: "Mission, vision and overarching summary.", rows: 10 },
    ],
  },
  {
    number: 2,
    title: "Description of the Business",
    intro: "Goals and the customers you will serve. Products and services on offer and how they address customer needs and wants.",
    fields: [
      { key: "business_description", label: "Business Description", description: "Goals, customers, products and services.", rows: 10 },
    ],
  },
  {
    number: 3,
    title: "Markets",
    intro: "How well do you know the market? Who is the typical buyer, what is their income level, and does the business show signs of disruptive innovation? What can you do differently and better than what has come before?",
    fields: [
      { key: "markets", label: "Market Research", description: "Target market, buyer profile, market size and competitor learnings.", rows: 10 },
    ],
  },
  {
    number: 4,
    title: "SWOT Analysis",
    intro: "Honest, objective assessment. Strengths and weaknesses are internal and within your control. Opportunities and threats are external.",
    fields: [
      { key: "swot_strengths", label: "Strengths", description: "Internal positives within your control.", rows: 6 },
      { key: "swot_weaknesses", label: "Weaknesses", description: "Internal negatives that need improving.", rows: 6 },
      { key: "swot_opportunities", label: "Opportunities", description: "External positives that could benefit the business.", rows: 6 },
      { key: "swot_threats", label: "Threats", description: "External negatives beyond your control.", rows: 6 },
    ],
  },
  {
    number: 5,
    title: "Management Team and Personnel",
    intro: "Who runs the business, who the directors are, the skills of the management team, the chain of command and the chosen UK business structure (Limited Company, Partnership, Limited Liability Partnership).",
    fields: [
      { key: "management_personnel", label: "Management and Personnel", description: "Roles, responsibilities, structure and hiring plan.", rows: 10 },
    ],
  },
  {
    number: 6,
    title: "Products or Services Offered",
    intro: "What will be produced and how it will be sold. How the offer meets a market need, how repeat custom is built, suppliers relied upon, and intellectual property considerations.",
    fields: [
      { key: "products_services", label: "Products and Services", description: "Offer detail, suppliers and IP.", rows: 10 },
    ],
  },
  {
    number: 7,
    title: "Marketing",
    intro: "Branding, key messages, target market reach, market share targets and budget.",
    fields: [
      { key: "marketing", label: "Marketing Plan", description: "Brand, messaging, channels and budget.", rows: 10 },
    ],
  },
  {
    number: 8,
    title: "Financial Plan",
    intro: "Start-up costs, financial projections, funding and investor pitches. Make sure projected income outweighs the cost of getting going.",
    fields: [
      { key: "financial_plan", label: "Financial Plan", description: "Start-up costs, projections and funding.", rows: 12 },
    ],
  },
];

type Row = {
  id: string;
  executive_summary: string | null;
  business_description: string | null;
  markets: string | null;
  swot_strengths: string | null;
  swot_weaknesses: string | null;
  swot_opportunities: string | null;
  swot_threats: string | null;
  management_personnel: string | null;
  products_services: string | null;
  marketing: string | null;
  financial_plan: string | null;
};

export const BusinessPlanSection = () => {
  const initiallyUnlocked = typeof window !== "undefined" && sessionStorage.getItem(SESSION_KEY) === "1";
  const [unlocked, setUnlocked] = useState(initiallyUnlocked);
  const [passwordInput, setPasswordInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [row, setRow] = useState<Row | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!unlocked) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("business_plan")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast.error("Failed to load business plan");
        setLoading(false);
        return;
      }
      if (!data) {
        const { data: created, error: insertErr } = await supabase
          .from("business_plan")
          .insert({})
          .select("*")
          .single();
        if (insertErr) {
          toast.error("Failed to create business plan");
          setLoading(false);
          return;
        }
        setRow(created as Row);
        setDraft(toDraft(created as Row));
      } else {
        setRow(data as Row);
        setDraft(toDraft(data as Row));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [unlocked]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setUnlocked(true);
      setPasswordInput("");
    } else {
      toast.error("Incorrect password");
    }
  };

  const handleLock = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setUnlocked(false);
    setRow(null);
    setDraft({});
  };

  const handleBlurSave = async (field: Field["key"]) => {
    if (!row) return;
    const next = draft[field] ?? "";
    if ((row[field] ?? "") === next) return;
    setSaving(field);
    const { error } = await supabase
      .from("business_plan")
      .update({ [field]: next })
      .eq("id", row.id);
    setSaving(null);
    if (error) {
      toast.error("Failed to save");
      return;
    }
    setRow({ ...row, [field]: next });
  };

  if (!unlocked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md border-2 border-risegold/40 bg-card/80">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-risegold/10">
              <Lock className="h-6 w-6 text-risegold" />
            </div>
            <CardTitle className="font-bebas text-2xl uppercase tracking-wider">
              Business Plan
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              This section is password protected.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUnlock} className="space-y-3">
              <div>
                <Label htmlFor="bp-password" className="text-xs uppercase tracking-wider">
                  Password
                </Label>
                <Input
                  id="bp-password"
                  type="password"
                  autoFocus
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button type="submit" className="w-full bg-risegold text-black hover:bg-risegold/90">
                <Unlock className="mr-2 h-4 w-4" />
                Unlock
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bebas text-3xl uppercase tracking-wider text-foreground">
            Business Plan
          </h2>
          <p className="text-sm text-muted-foreground">
            The eight-part business plan. Changes save when you click outside a field.
          </p>
        </div>
        <Button variant="outline" onClick={handleLock} className="gap-2">
          <Lock className="h-4 w-4" />
          Lock
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading business plan…
        </div>
      )}

      {!loading && row && (
        <div className="space-y-6">
          {SECTIONS.map((section) => (
            <Card key={section.number} className="border-2 border-border/60 bg-card/60">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-risegold/15 font-bebas text-lg text-risegold">
                    {section.number}
                  </div>
                  <div>
                    <CardTitle className="font-bebas text-xl uppercase tracking-wider">
                      {section.title}
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{section.intro}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {section.fields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`bp-${field.key}`} className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                        {field.label}
                      </Label>
                      {saving === field.key && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Saving…
                        </span>
                      )}
                    </div>
                    {field.description && (
                      <p className="text-xs text-muted-foreground">{field.description}</p>
                    )}
                    <Textarea
                      id={`bp-${field.key}`}
                      rows={field.rows ?? 8}
                      value={draft[field.key] ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                      onBlur={() => handleBlurSave(field.key)}
                      placeholder="Type your response here…"
                      className="resize-y"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

function toDraft(row: Row): Record<string, string> {
  return {
    executive_summary: row.executive_summary ?? "",
    business_description: row.business_description ?? "",
    markets: row.markets ?? "",
    swot_strengths: row.swot_strengths ?? "",
    swot_weaknesses: row.swot_weaknesses ?? "",
    swot_opportunities: row.swot_opportunities ?? "",
    swot_threats: row.swot_threats ?? "",
    management_personnel: row.management_personnel ?? "",
    products_services: row.products_services ?? "",
    marketing: row.marketing ?? "",
    financial_plan: row.financial_plan ?? "",
  };
}

export default BusinessPlanSection;