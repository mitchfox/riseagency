import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { OPERATING_PROFILE_SECTIONS } from "@/components/portal/operatingProfileQuestions";
import { format } from "date-fns";

export const OperatingProfileViewer = ({ playerId }: { playerId: string }) => {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("player_operating_profile")
      .select("answers, submitted_at")
      .eq("player_id", playerId)
      .maybeSingle();
    setAnswers((data?.answers as any) || {});
    setSubmittedAt(data?.submitted_at || null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [playerId]);

  const reset = async () => {
    if (!confirm("Reset the questionnaire? The player will be asked to fill it out again.")) return;
    const { error } = await (supabase as any)
      .from("player_operating_profile")
      .upsert({ player_id: playerId, answers: {}, submitted_at: null }, { onConflict: "player_id" });
    if (error) { toast.error(error.message); return; }
    toast.success("Questionnaire reset");
    load();
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>;

  const hasAny = Object.keys(answers).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base md:text-lg font-semibold">Player Operating Profile</h3>
          <p className="text-xs text-muted-foreground">
            {submittedAt ? `Submitted ${format(new Date(submittedAt), "PP")}` : hasAny ? "In progress (not submitted)" : "Not yet completed by the player"}
          </p>
        </div>
        {hasAny && <Button variant="outline" size="sm" onClick={reset}>Reset questionnaire</Button>}
      </div>

      {!hasAny && (
        <Card><CardContent className="py-6 text-sm text-muted-foreground">
          The player will see this questionnaire next time they open the portal.
        </CardContent></Card>
      )}

      {hasAny && OPERATING_PROFILE_SECTIONS.map((section) => (
        <Card key={section.id}>
          <CardHeader><CardTitle className="text-sm">{section.title}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {section.questions.map((q) => {
              const v = answers[q.id];
              if (v == null || (Array.isArray(v) && v.length === 0) || v === "") return null;
              return (
                <div key={q.id}>
                  <div className="text-xs text-muted-foreground mb-1">{q.label}</div>
                  {q.type === "rank" && Array.isArray(v) && (
                    <ol className="list-decimal pl-5 space-y-0.5">{v.map((o: string, i: number) => <li key={i}>{o}</li>)}</ol>
                  )}
                  {q.type === "multi" && Array.isArray(v) && (
                    <div className="flex flex-wrap gap-1.5">{v.map((o: string) => <span key={o} className="text-xs rounded-full px-2 py-0.5 bg-muted">{o}</span>)}</div>
                  )}
                  {q.type === "single" && <div>{String(v)}</div>}
                  {q.type === "text" && <div className="whitespace-pre-wrap">{String(v)}</div>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};