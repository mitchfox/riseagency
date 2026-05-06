import { useEffect, useMemo, useState } from "react";
import { Brain, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  SPQ_ITEMS,
  calculateSpqScores,
  stenBand,
  stenBandColor,
  stenBandLabel,
  stenToRankOf100,
  SPQ_SCALE_GUIDANCE,
  type SpqGenderNorm,
} from "@/lib/spqScoring";

const ANSWER_LABELS = [
  { value: 0, label: "Never / Almost never" },
  { value: 1, label: "Occasionally" },
  { value: 2, label: "Fairly often" },
  { value: 3, label: "Very often" },
  { value: 4, label: "Nearly always / Always" },
];

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const SpqPublicTest = () => {
  const items = useMemo(() => shuffle(SPQ_ITEMS), []);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<SpqGenderNorm>("men");
  const [ageBand, setAgeBand] = useState("16-20");
  const [step, setStep] = useState<"intro" | "test" | "details" | "results">("intro");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<ReturnType<typeof calculateSpqScores> | null>(null);

  useEffect(() => {
    document.title = "SPQ Sport Performance Questionnaire";
  }, []);

  const answeredCount = Object.keys(answers).length;
  const total = items.length;

  const computeAndSave = async () => {
    setSubmitting(true);
    try {
      const scores = calculateSpqScores(answers, gender);
      setResults(scores);
      // Try to enrich with IP/location via free service.
      let geo: any = {};
      try {
        const r = await fetch("https://ipapi.co/json/");
        if (r.ok) geo = await r.json();
      } catch {}
      await (supabase as any).from("spq_test_submissions").insert({
        submitter_name: name.trim() || null,
        submitter_email: email.trim() || null,
        age_band: ageBand,
        gender_norm: gender,
        responses: answers,
        scale_scores: scores.scaleScores,
        factor_scores: scores.factorScores,
        visitor_ip: geo?.ip || null,
        visitor_country: geo?.country_name || null,
        visitor_city: geo?.city || null,
        visitor_user_agent: navigator.userAgent,
      });
      setStep("results");
    } catch (e: any) {
      toast.error(e?.message || "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "intro") {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <section className="mx-auto max-w-2xl space-y-5 px-4 py-10">
          <div className="flex items-center gap-3">
            <Brain className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-semibold">SPQ Sport Performance Questionnaire</h1>
          </div>
          <Card><CardContent className="space-y-3 p-5 text-sm leading-relaxed">
            <p>You will read {total} statements. For each, choose how true it is for you, from <span className="font-semibold">Never / Almost never</span> through to <span className="font-semibold">Nearly always / Always</span>.</p>
            <p>There are no right or wrong answers. Be honest, work quickly, and trust your first reaction.</p>
            <p>Each statement is marked as <span className="text-emerald-500 font-semibold">positive</span> or <span className="text-rose-500 font-semibold">negative</span> so you know how it is keyed when scored.</p>
          </CardContent></Card>
          <Button size="lg" onClick={() => setStep("test")}>Begin</Button>
        </section>
      </main>
    );
  }

  if (step === "test") {
    const allAnswered = answeredCount === total;
    return (
      <main className="min-h-screen bg-background text-foreground">
        <section className="mx-auto max-w-3xl space-y-4 px-4 py-8">
          <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">SPQ Test</span>
              <span className="text-muted-foreground">{answeredCount}/{total}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${(answeredCount / total) * 100}%` }} />
            </div>
          </div>
          {items.map((it, i) => (
            <Card key={it.item}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-base font-medium">{i + 1}. {it.statement}</p>
                  <span className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-bold ${it.keying === 'p' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'}`}>
                    {it.keying === 'p' ? 'Positive' : 'Negative'}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-5">
                  {ANSWER_LABELS.map(opt => {
                    const sel = answers[it.item] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setAnswers(prev => ({ ...prev, [it.item]: opt.value }))}
                        className={`rounded-md border px-2 py-2 text-xs transition ${sel ? 'border-primary bg-primary/15 text-foreground font-semibold' : 'border-border bg-card hover:border-primary/50'}`}
                      >
                        <div className="text-sm font-bold">{opt.value}</div>
                        <div className="leading-tight">{opt.label}</div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="flex items-center justify-between gap-3 pt-4">
            <span className="text-sm text-muted-foreground">{allAnswered ? 'All answered' : `${total - answeredCount} remaining`}</span>
            <Button disabled={!allAnswered} onClick={() => setStep("details")}>Continue</Button>
          </div>
        </section>
      </main>
    );
  }

  if (step === "details") {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <section className="mx-auto max-w-xl space-y-4 px-4 py-10">
          <h1 className="text-xl font-semibold">A few details to score your results</h1>
          <Card><CardContent className="space-y-3 p-5">
            <div><Label>Your name (optional)</Label><Input value={name} onChange={e => setName(e.target.value)} className="mt-1" /></div>
            <div><Label>Email (optional)</Label><Input value={email} onChange={e => setEmail(e.target.value)} className="mt-1" type="email" /></div>
            <div><Label>Sex (used for scoring norms)</Label>
              <Select value={gender} onValueChange={(v: SpqGenderNorm) => setGender(v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="men">Male</SelectItem><SelectItem value="women">Female</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Age band</Label>
              <Select value={ageBand} onValueChange={setAgeBand}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{["16-20","21-30","31-40","41-50","51-60","over 60"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent></Card>
          <Button size="lg" onClick={computeAndSave} disabled={submitting} className="gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}Get my results
          </Button>
        </section>
      </main>
    );
  }

  // results
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-4xl space-y-5 px-4 py-8">
        <div className="flex items-center gap-3">
          <Brain className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-semibold">{name || 'Your'} SPQ Results</h1>
        </div>
        <Card><CardHeader><CardTitle>Sten profile</CardTitle></CardHeader><CardContent className="space-y-2">
          {results?.scaleScores.map(s => {
            const b = stenBand(s.sten); const c = stenBandColor(b);
            const pct = (s.stenRounded / 10) * 100;
            return (
              <div key={s.scale} className="grid grid-cols-[160px_1fr_70px] items-center gap-3 text-sm">
                <div className="font-medium">{s.scale}</div>
                <div className="relative h-6 rounded border border-border bg-card">
                  <div className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${pct}%`, background: c }} />
                </div>
                <div className="text-right font-bold" style={{ color: c }}>{s.stenRounded.toFixed(1)}</div>
              </div>
            );
          })}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Percentile lineup (1 best of 100)</CardTitle></CardHeader><CardContent className="space-y-2">
          {results?.scaleScores.map(s => {
            const rank = stenToRankOf100(s.sten, s.z);
            const b = stenBand(s.sten); const c = stenBandColor(b);
            return (
              <div key={s.scale} className="grid grid-cols-[160px_1fr_70px_110px] items-center gap-3 text-sm">
                <div className="font-medium">{s.scale}</div>
                <div className="relative h-5 rounded border border-border bg-card">
                  <div className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${rank}%`, background: c }} />
                </div>
                <div className="text-right font-bold" style={{ color: c }}>{rank}/100</div>
                <div className="text-[11px]" style={{ color: c }}>{stenBandLabel(b)}</div>
              </div>
            );
          })}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>What to focus on</CardTitle></CardHeader><CardContent className="space-y-2">
          {results?.scaleScores.map(s => {
            const b = stenBand(s.sten); const c = stenBandColor(b);
            const g = SPQ_SCALE_GUIDANCE[s.scale];
            const advice = !g ? '' : b === 'work-on' ? g.workOn : b === 'improve-on' ? g.improveOn : g.capitaliseOn;
            return (
              <div key={s.scale} className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} /><span className="font-semibold">{s.scale}</span><span className="text-xs text-muted-foreground">{stenBandLabel(b)}</span></div>
                {advice && <p className="mt-1 text-xs text-foreground/85">{advice}</p>}
              </div>
            );
          })}
        </CardContent></Card>
        <p className="text-xs text-muted-foreground">Your responses have been saved. The Rise Football Agency staff team can review them with you on request.</p>
      </section>
    </main>
  );
};

export default SpqPublicTest;