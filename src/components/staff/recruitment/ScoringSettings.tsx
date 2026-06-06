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
import { DEFAULT_BONUS_WEIGHTS, DEFAULT_WEIGHTS, type BonusWeights, type ScoringWeights } from "@/lib/fitScore";
import { invalidateScoringCaches } from "@/hooks/useRecruitmentScoring";

const POSITION_KEYS = ["GK", "CB", "LB", "RB", "LWB", "RWB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "CF"] as const;
type PositionKey = typeof POSITION_KEYS[number];

const WEIGHT_LABELS: Record<keyof ScoringWeights, { label: string; help: string }> = {
  position: { label: "Position match", help: "Player position equals one of the target's positions." },
  age: { label: "Age fit", help: "Player age sits inside the target's age band (with a soft edge)." },
  nationality: { label: "Nationality", help: "Player nationality is on the target list." },
  club_country: { label: "Club country", help: "Player's club country is on the target list." },
  club_rating: { label: "Club rating", help: "Club rating tier sits inside target band (R1 is highest)." },
  outreach: { label: "Outreach traction", help: "Boost for replies, interest, parent approval; drop for not-interested." },
  ai_nudge: { label: "AI nudge", help: "Optional AI signal from bio, notes, scouting context." },
};

const BONUS_LABELS: Record<keyof BonusWeights, { label: string; help: string; min: number; max: number }> = {
  national_team: { label: "National team player", help: "Points added when the player has been capped by a national side.", min: 0, max: 20 },
  star_of_team: { label: "Star of the team", help: "Stand-out performer or focal player at their club.", min: 0, max: 20 },
  previous_serious_injury: { label: "Previous serious injury", help: "ACL or similar long-term injury history. Typically a deduction.", min: -25, max: 5 },
  top_club: { label: "Top-tier club (R1)", help: "Automatically applied when the player's club is rated R1.", min: 0, max: 20 },
  parent_approval: { label: "Parent approval (youth)", help: "Extra confidence boost when parents have signed off.", min: 0, max: 15 },
  agent_unrepresented: { label: "Unrepresented / family agent", help: "Boost when the player has no agent or is represented by a family member.", min: 0, max: 20 },
  agent_top_agency: { label: "Top-tier agency", help: "Deduction when the player is represented by a major agency (CAA, Wasserman, GestiFute, etc.). Typically negative.", min: -25, max: 5 },
};

export const ScoringSettings = () => {
  const [weights, setWeights] = useState<ScoringWeights>(DEFAULT_WEIGHTS);
  const [bonusWeights, setBonusWeights] = useState<BonusWeights>(DEFAULT_BONUS_WEIGHTS);
  const [positionWeights, setPositionWeights] = useState<Record<string, number>>({});
  const [ageBand, setAgeBand] = useState(2);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [threshold, setThreshold] = useState(60);
  const [adjacencyFactor, setAdjacencyFactor] = useState(0.5);
  const [leagueStrengthWeight, setLeagueStrengthWeight] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("recruitment_scoring_settings")
        .select("weights, bonus_weights, age_sweet_spot_band, ai_nudge_enabled, fit_score_threshold, position_adjacency_factor, league_strength_weight, position_weights")
        .eq("id", "singleton")
        .maybeSingle();
      if (data) {
        setWeights({ ...DEFAULT_WEIGHTS, ...(data.weights || {}) });
        setBonusWeights({ ...DEFAULT_BONUS_WEIGHTS, ...(data.bonus_weights || {}) });
        setPositionWeights((data.position_weights as Record<string, number>) || {});
        setAgeBand(data.age_sweet_spot_band ?? 2);
        setAiEnabled(!!data.ai_nudge_enabled);
        setThreshold(data.fit_score_threshold ?? 60);
        setAdjacencyFactor(Number(data.position_adjacency_factor ?? 0.5));
        setLeagueStrengthWeight(data.league_strength_weight ?? 10);
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
        bonus_weights: bonusWeights,
        position_weights: positionWeights,
        age_sweet_spot_band: ageBand,
        ai_nudge_enabled: aiEnabled,
        fit_score_threshold: threshold,
        position_adjacency_factor: adjacencyFactor,
        league_strength_weight: leagueStrengthWeight,
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
    setBonusWeights(DEFAULT_BONUS_WEIGHTS);
    setPositionWeights({});
    setAgeBand(2);
    setAiEnabled(true);
    setThreshold(60);
    setAdjacencyFactor(0.5);
    setLeagueStrengthWeight(10);
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading scoring settings…</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wide">Fit-score settings</h3>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button size="sm" variant="ghost" onClick={reset} className="flex-1 sm:flex-initial"><RotateCcw className="h-4 w-4 mr-1.5" /> Reset</Button>
          <Button size="sm" onClick={save} disabled={saving} className="flex-1 sm:flex-initial"><Save className="h-4 w-4 mr-1.5" /> Save</Button>
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
            Component weights are scored as a ratio of points achieved against the maximum possible, so the score still caps at 100 regardless of the total here. Aim for 100 for the cleanest balance.
          </p>
        )}
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Universal bonuses</div>
          <Badge variant="outline" className="text-[10px]">Applied on top of ratio score</Badge>
        </div>
        {(Object.keys(BONUS_LABELS) as (keyof BonusWeights)[]).map(key => (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">
                {BONUS_LABELS[key].label}
                <span className="block text-[10px] text-muted-foreground font-normal">{BONUS_LABELS[key].help}</span>
              </Label>
              <Badge variant="outline" className={`text-[10px] ${bonusWeights[key] < 0 ? "border-destructive text-destructive" : ""}`}>{bonusWeights[key] > 0 ? `+${bonusWeights[key]}` : bonusWeights[key]}</Badge>
            </div>
            <Slider
              value={[bonusWeights[key]]}
              min={BONUS_LABELS[key].min}
              max={BONUS_LABELS[key].max}
              step={1}
              onValueChange={(v) => setBonusWeights({ ...bonusWeights, [key]: v[0] })}
            />
          </div>
        ))}
        <p className="text-[11px] text-muted-foreground">Final fit score is always capped at 100, even when bonuses would take it higher.</p>
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
          <div className="space-y-1.5">
            <Label className="text-xs">Position adjacency credit</Label>
            <div className="flex items-center gap-2">
              <Slider value={[Math.round(adjacencyFactor * 100)]} min={0} max={100} step={5} onValueChange={(v) => setAdjacencyFactor(v[0] / 100)} />
              <Badge variant="outline" className="text-[10px] shrink-0">{Math.round(adjacencyFactor * 100)}%</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">Partial position credit for nearby roles (CB↔LB, CDM↔CM, LW↔RW, etc.). 0% = exact match only.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">League strength weight</Label>
            <div className="flex items-center gap-2">
              <Slider value={[leagueStrengthWeight]} min={0} max={25} step={1} onValueChange={(v) => setLeagueStrengthWeight(v[0])} />
              <Badge variant="outline" className="text-[10px] shrink-0">{leagueStrengthWeight}</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">Extra points for top-five leagues (full), tier-2 leagues (60%). 0 disables the multiplier.</p>
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