import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Check } from "lucide-react";
import { toast } from "sonner";
import { OPERATING_PROFILE_SECTIONS, Question } from "./operatingProfileQuestions";

interface Props {
  playerId: string | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}

type Answers = Record<string, any>;

const RankInput = ({ q, value, onChange }: { q: Question; value: string[]; onChange: (v: string[]) => void }) => {
  const list = value && value.length === q.options!.length ? value : [...q.options!];
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const copy = [...list];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  };
  return (
    <ol className="space-y-1.5">
      {list.map((opt, i) => (
        <li key={opt} className="flex items-center gap-2 rounded-lg border border-border bg-card/40 px-3 py-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(43,49%,61%)]/15 text-[hsl(43,49%,61%)] text-xs font-semibold">
            {i + 1}
          </span>
          <span className="flex-1 text-sm">{opt}</span>
          <button type="button" onClick={() => move(i, -1)} aria-label="Move up" className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === 0}>
            <ArrowUp className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => move(i, 1)} aria-label="Move down" className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === list.length - 1}>
            <ArrowDown className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ol>
  );
};

const MultiInput = ({ q, value, onChange }: { q: Question; value: string[]; onChange: (v: string[]) => void }) => {
  const set = new Set(value || []);
  const toggle = (opt: string) => {
    const next = new Set(set);
    if (next.has(opt)) next.delete(opt);
    else {
      if (q.maxSelect && next.size >= q.maxSelect) return;
      next.add(opt);
    }
    onChange(Array.from(next));
  };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {q.options!.map((opt) => {
        const checked = set.has(opt);
        return (
          <label key={opt} className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm transition ${checked ? "border-[hsl(43,49%,61%)] bg-[hsl(43,49%,61%)]/10" : "border-border bg-card/40"}`}>
            <Checkbox checked={checked} onCheckedChange={() => toggle(opt)} />
            <span>{opt}</span>
          </label>
        );
      })}
      {q.maxSelect && (
        <div className="col-span-full text-xs text-muted-foreground">Choose up to {q.maxSelect}.</div>
      )}
    </div>
  );
};

export const OperatingProfileDialog = ({ playerId, open, onOpenChange, onSubmitted }: Props) => {
  const [answers, setAnswers] = useState<Answers>({});
  const [stepIdx, setStepIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || !playerId) return;
    (async () => {
      const { data } = await supabase
        .from("player_operating_profile")
        .select("answers, submitted_at")
        .eq("player_id", playerId)
        .maybeSingle();
      setAnswers((data?.answers as Answers) || {});
      setLoaded(true);
    })();
  }, [open, playerId]);

  const sections = OPERATING_PROFILE_SECTIONS;
  const current = sections[stepIdx];
  const progress = Math.round(((stepIdx + 1) / sections.length) * 100);

  const setAnswer = (qid: string, v: any) => setAnswers((a) => ({ ...a, [qid]: v }));

  const persist = async (submit: boolean) => {
    if (!playerId) return;
    setSaving(true);
    try {
      const payload: any = {
        player_id: playerId,
        answers,
      };
      if (submit) payload.submitted_at = new Date().toISOString();
      const { error } = await (supabase as any)
        .from("player_operating_profile")
        .upsert(payload, { onConflict: "player_id" });
      if (error) throw error;
      if (submit) {
        toast.success("Profile saved. Thank you.");
        onSubmitted?.();
        onOpenChange(false);
      } else {
        toast.success("Progress saved");
      }
    } catch (e: any) {
      toast.error(e?.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const renderQuestion = (q: Question) => {
    if (q.type === "text") {
      return (
        <Textarea
          value={answers[q.id] || ""}
          onChange={(e) => setAnswer(q.id, e.target.value)}
          placeholder="Write as much or as little as you'd like..."
          rows={3}
        />
      );
    }
    if (q.type === "single") {
      return (
        <RadioGroup value={answers[q.id] || ""} onValueChange={(v) => setAnswer(q.id, v)}>
          {q.options!.map((opt) => (
            <div key={opt} className="flex items-center gap-2">
              <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
              <Label htmlFor={`${q.id}-${opt}`} className="cursor-pointer">{opt}</Label>
            </div>
          ))}
        </RadioGroup>
      );
    }
    if (q.type === "multi") {
      return <MultiInput q={q} value={answers[q.id] || []} onChange={(v) => setAnswer(q.id, v)} />;
    }
    return <RankInput q={q} value={answers[q.id] || []} onChange={(v) => setAnswer(q.id, v)} />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Player Operating Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Section {stepIdx + 1} of {sections.length} — {current.title}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
            <div className="h-full bg-[hsl(43,49%,61%)] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="space-y-6 py-2">
          {loaded && current.questions.map((q) => (
            <div key={q.id} className="space-y-2">
              <div className="text-sm font-medium leading-snug">{q.label}</div>
              {renderQuestion(q)}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
          <Button type="button" variant="ghost" onClick={() => persist(false)} disabled={saving}>
            Save &amp; continue later
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setStepIdx((i) => Math.max(0, i - 1))} disabled={stepIdx === 0}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            {stepIdx < sections.length - 1 ? (
              <Button type="button" onClick={() => setStepIdx((i) => Math.min(sections.length - 1, i + 1))}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button type="button" onClick={() => persist(true)} disabled={saving} className="bg-[hsl(43,49%,61%)] text-black hover:bg-[hsl(43,49%,55%)]">
                <Check className="h-4 w-4 mr-1" /> Submit
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};