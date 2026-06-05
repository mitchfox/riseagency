import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sliders, RotateCcw, Save } from "lucide-react";
import { DEFAULT_WEIGHTS, type ScoringWeights } from "@/lib/fitScore";
import { invalidateScoringCaches } from "@/hooks/useRecruitmentScoring";

const WEIGHT_LABELS: Record<keyof ScoringWeights, { label: string; help: string }> = {
  position: { label: "Position match", help: "Player position equals one of the target's positions." },
  age: { label: "Age fit", help: "Player age sits inside the target's age band (with a soft edge)." },
  nationality: { label: "Nationality", help: "Player nationality is on the target list." },
  club_country: { label: "Club country", help: "Player's club country is on the target list." },
  club_rating: { label: "Club rating", help: "Club rating tier sits inside target band (R1 is highest)." },
  outreach: { label: "Outreach traction", help: "Boost for replies, interest, parent approval; drop for not-interested." },
  ai_nudge: { label: "AI nudge", help: "Optional AI signal from bio, notes, scouting context." },
};

export const ScoringSettings = () => {
  const [weights, setWeights] = useState<ScoringWeights>(DEFAULT_WEIGHTS);
  const [ageBand, setAgeBand] = useState(2);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [threshold, setThreshold] = useState(60);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("recruitment_scoring_settings")
        .select("weights, age_sweet_spot_band, ai_nudge_enabled, fit_score_threshold")
        .eq("id", "singleton")
        .maybeSingle();
      if (data) {
        setWeights({ ...DEFAULT_WEIGHTS, ...(data.weights || {}) });
        setAgeBand(data.age_sweet_spot_band ?? 2);
        setAiEnabled(!!data.ai_nudge_enabled);
        setThreshold(data.fit_score_threshold ?? 60);
      }
      setLoading(false);
    })();
  }, []);

  const total = Object.values(weights).reduce((s, v) => s + v, 0);

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("recruitment_scoring_settings")
      .update({
        weights,
        age_sweet_spot_band: ageBand,
        ai_nudge_enabled: aiEnabled,
        fit_score_threshold: threshold,
      })
      .eq("id", "singleton");
    if (error) {
      toast.error("Save failed", { description: error.message });
    } else {
      invalidateScoringCaches();
      toast.success("Scoring settings saved");
    }
    setSaving(false);
  };

  const reset = () => {
    setWeights(DEFAULT_WEIGHTS);
    setAgeBand(2);
    setAiEnabled(true);
    setThreshold(60);
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading scoring settings…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wide">Fit-score settings</h3>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={reset}><RotateCcw className="h-4 w-4 mr-1.5" /> Reset</Button>
          <Button size="sm" onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1.5" /> Save</Button>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Component weights</div>
          <Badge variant={total === 100 ? "default" : "outline"} className={total === 100 ? "bg-primary text-primary-foreground" : ""}>
            Total: {total} / 100
          </Badge>
        </div>
        {(Object.keys(WEIGHT_LABELS) as (keyof ScoringWeights)[]).map(key => (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">
                {WEIGHT_LABELS[key].label}
                <span className="block text-[10px] text-muted-foreground font-normal">{WEIGHT_LABELS[key].help}</span>
              </Label>
              <Badge variant="outline" className="text-[10px]">{weights[key]}</Badge>
            </div>
            <Slider
              value={[weights[key]]}
              min={0}
              max={40}
              step={1}
              onValueChange={(v) => setWeights({ ...weights, [key]: v[0] })}
            />
          </div>
        ))}
        {total !== 100 && (
          <p className="text-[11px] text-amber-500">
            Weights are normalised to 100 at scoring time; aim for 100 for predictable totals.
          </p>
        )}
      </Card>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Age sweet-spot band (years)</Label>
            <Input type="number" min={0} max={5} value={ageBand} onChange={e => setAgeBand(parseInt(e.target.value) || 0)} />
            <p className="text-[11px] text-muted-foreground">A player this many years outside the band still scores partial age points.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">"Strong match" threshold</Label>
            <Input type="number" min={0} max={100} value={threshold} onChange={e => setThreshold(parseInt(e.target.value) || 0)} />
            <p className="text-[11px] text-muted-foreground">Scores above this highlight in green across recruitment views.</p>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            <div className="text-sm font-medium">AI nudge</div>
            <p className="text-[11px] text-muted-foreground">Adds up to {weights.ai_nudge} points from bio + notes + scouting context.</p>
          </div>
          <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
        </div>
      </Card>
    </div>
  );
};