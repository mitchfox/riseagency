import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calculator, ClipboardPaste, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PERCalculatorDialogProps {
  onResult: (per: string) => void;
}

const STAT_WEIGHTS = {
  goals: 10.0,
  xG: 4.0,
  xGOT: 2.0,
  keyPasses: 1.5,
  xA: 3.0,
  accurateCrosses: 0.7,
  accuratePasses: 0.1,
  shotsOnTarget: 0.8,
  shotsBlocked: 0.3,
  carries: 0.2,
  possessionLost: -0.8,
  clearances: 0.5,
  blockedShots: 0.7,
  recoveries: 0.4,
};

const POSITION_BASELINES: Record<string, number> = {
  striker: 18.0,
  attacking_midfielder: 17.0,
  central_midfielder: 15.0,
  defensive_midfielder: 14.0,
  winger: 16.0,
  full_back: 14.5,
  centre_back: 13.0,
};

const STAT_LABELS: Record<string, string> = {
  goals: "Goals",
  xG: "xG",
  xGOT: "xGOT",
  keyPasses: "Key Passes",
  xA: "xA",
  accurateCrosses: "Accurate Crosses",
  accuratePasses: "Accurate Passes",
  shotsOnTarget: "Shots on Target",
  shotsBlocked: "Shots Blocked",
  carries: "Carries",
  possessionLost: "Possession Lost",
  clearances: "Clearances",
  blockedShots: "Blocked Shots",
  recoveries: "Recoveries",
};

type StatKey = keyof typeof STAT_WEIGHTS;

const DEFAULT_STATS: Record<StatKey, string> = {
  goals: "", xG: "", xGOT: "", keyPasses: "", xA: "",
  accurateCrosses: "", accuratePasses: "", shotsOnTarget: "",
  shotsBlocked: "", carries: "", possessionLost: "",
  clearances: "", blockedShots: "", recoveries: "",
};

// Parse pasted SofaScore-style data
const parsePastedData = (text: string): { minutes: string; stats: Record<StatKey, string> } | null => {
  const stats = { ...DEFAULT_STATS };
  let minutes = "";

  // Normalise the text
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  const flat = lines.join(" | ");

  // Map of sofascore label patterns to our stat keys
  const patterns: [RegExp, StatKey | "minutes"][] = [
    [/minutes\s*(?:played)?\s*[:\-]?\s*(\d+)/i, "minutes"],
    [/goals?\s*[:\-]?\s*(\d+)/i, "goals"],
    [/expected\s*goals?\s*\(xG\)\s*[:\-]?\s*([\d.]+)/i, "xG"],
    [/xG\s*[:\-]?\s*([\d.]+)/i, "xG"],
    [/xGOT\s*[:\-]?\s*([\d.]+)/i, "xGOT"],
    [/expected\s*goals?\s*on\s*target\s*[:\-]?\s*([\d.]+)/i, "xGOT"],
    [/key\s*pass(?:es)?\s*[:\-]?\s*(\d+)/i, "keyPasses"],
    [/xA\s*[:\-]?\s*([\d.]+)/i, "xA"],
    [/expected\s*assists?\s*[:\-]?\s*([\d.]+)/i, "xA"],
    [/accurate\s*cross(?:es)?\s*[:\-]?\s*(\d+)/i, "accurateCrosses"],
    [/accurate\s*pass(?:es)?\s*[:\-]?\s*(\d+)/i, "accuratePasses"],
    [/shots?\s*on\s*target\s*[:\-]?\s*(\d+)/i, "shotsOnTarget"],
    [/shots?\s*blocked\s*[:\-]?\s*(\d+)/i, "shotsBlocked"],
    [/carries?\s*[:\-]?\s*(\d+)/i, "carries"],
    [/possession\s*lost\s*[:\-]?\s*(\d+)/i, "possessionLost"],
    [/clearances?\s*[:\-]?\s*(\d+)/i, "clearances"],
    [/blocked\s*shots?\s*[:\-]?\s*(\d+)/i, "blockedShots"],
    [/recover(?:y|ies)\s*[:\-]?\s*(\d+)/i, "recoveries"],
  ];

  let matched = 0;
  for (const [regex, key] of patterns) {
    const m = flat.match(regex);
    if (m) {
      if (key === "minutes") {
        minutes = m[1];
      } else {
        stats[key] = m[1];
      }
      matched++;
    }
  }

  // Also try simple "Label Value" line-by-line
  for (const line of lines) {
    const parts = line.split(/\t+|\s{2,}/);
    if (parts.length >= 2) {
      const label = parts[0].trim().toLowerCase();
      const val = parts[parts.length - 1].trim();
      if (/^\d+(\.\d+)?$/.test(val)) {
        if (label.includes("minutes")) { minutes = val; matched++; }
        else if (label === "goals" || label === "goal") { stats.goals = stats.goals || val; matched++; }
        else if (label.includes("xg") && label.includes("on target")) { stats.xGOT = stats.xGOT || val; matched++; }
        else if (label === "xg" || label === "expected goals") { stats.xG = stats.xG || val; matched++; }
        else if (label.includes("key pass")) { stats.keyPasses = stats.keyPasses || val; matched++; }
        else if (label === "xa" || label === "expected assists") { stats.xA = stats.xA || val; matched++; }
        else if (label.includes("accurate cross")) { stats.accurateCrosses = stats.accurateCrosses || val; matched++; }
        else if (label.includes("accurate pass")) { stats.accuratePasses = stats.accuratePasses || val; matched++; }
        else if (label.includes("shots on target") || label.includes("shot on target")) { stats.shotsOnTarget = stats.shotsOnTarget || val; matched++; }
        else if (label.includes("shots blocked") || label.includes("shot blocked")) { stats.shotsBlocked = stats.shotsBlocked || val; matched++; }
        else if (label.includes("carries") || label === "carry") { stats.carries = stats.carries || val; matched++; }
        else if (label.includes("possession lost")) { stats.possessionLost = stats.possessionLost || val; matched++; }
        else if (label.includes("clearance")) { stats.clearances = stats.clearances || val; matched++; }
        else if (label.includes("blocked shot")) { stats.blockedShots = stats.blockedShots || val; matched++; }
        else if (label.includes("recover")) { stats.recoveries = stats.recoveries || val; matched++; }
      }
    }
  }

  return matched > 0 ? { minutes, stats } : null;
};

export const PERCalculatorDialog = ({ onResult }: PERCalculatorDialogProps) => {
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState("");
  const [position, setPosition] = useState("central_midfielder");
  const [stats, setStats] = useState<Record<StatKey, string>>({ ...DEFAULT_STATS });
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const { toast } = useToast();

  const updateStat = (key: StatKey, val: string) => {
    setStats(prev => ({ ...prev, [key]: val }));
  };

  const calculate = () => {
    const mins = parseFloat(minutes);
    if (!mins || mins <= 0) {
      toast({ title: "Minutes required", description: "Enter the minutes played.", variant: "destructive" });
      return;
    }

    let rawScore = 0;
    for (const [key, weight] of Object.entries(STAT_WEIGHTS)) {
      const val = parseFloat(stats[key as StatKey] || "0");
      rawScore += val * weight;
    }

    const per90 = (rawScore / mins) * 90;
    const baseline = POSITION_BASELINES[position] || 15.0;
    const leagueAdjusted = per90 / baseline;

    onResult(leagueAdjusted.toFixed(2));
    toast({
      title: "PER calculated",
      description: `Raw: ${rawScore.toFixed(2)} | Per 90: ${per90.toFixed(2)} | League-Adjusted: ${leagueAdjusted.toFixed(2)}`,
    });
    setOpen(false);
  };

  const handlePaste = () => {
    const result = parsePastedData(pasteText);
    if (result) {
      if (result.minutes) setMinutes(result.minutes);
      setStats(prev => {
        const merged = { ...prev };
        for (const [k, v] of Object.entries(result.stats)) {
          if (v) merged[k as StatKey] = v;
        }
        return merged;
      });
      setShowPaste(false);
      setPasteText("");
      toast({ title: "Data parsed", description: "Stats filled from pasted data. Check and adjust if needed." });
    } else {
      toast({ title: "Could not parse", description: "Paste the raw SofaScore stats text and try again.", variant: "destructive" });
    }
  };

  const reset = () => {
    setMinutes("");
    setStats({ ...DEFAULT_STATS });
    setPasteText("");
    setShowPaste(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors"
          title="Calculate PER"
        >
          <Calculator className="w-3.5 h-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            PER Calculator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Paste section */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPaste(!showPaste)}
              className="gap-1.5"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              Paste SofaScore Data
            </Button>
            <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
          </div>

          {showPaste && (
            <div className="space-y-2">
              <Textarea
                placeholder="Paste the raw SofaScore stats here..."
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                className="min-h-[100px] text-xs font-mono"
              />
              <Button size="sm" onClick={handlePaste} disabled={!pasteText.trim()}>
                Parse & Fill
              </Button>
            </div>
          )}

          {/* Core inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Minutes Played *</Label>
              <Input
                type="number"
                placeholder="e.g. 78"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Position</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="striker">Striker (18.0)</SelectItem>
                  <SelectItem value="attacking_midfielder">Attacking Mid (17.0)</SelectItem>
                  <SelectItem value="winger">Winger (16.0)</SelectItem>
                  <SelectItem value="central_midfielder">Central Mid (15.0)</SelectItem>
                  <SelectItem value="defensive_midfielder">Defensive Mid (14.0)</SelectItem>
                  <SelectItem value="full_back">Full-Back (14.5)</SelectItem>
                  <SelectItem value="centre_back">Centre-Back (13.0)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stat inputs */}
          <div className="grid grid-cols-3 gap-x-3 gap-y-2">
            {(Object.keys(STAT_WEIGHTS) as StatKey[]).map((key) => (
              <div key={key}>
                <Label className="text-xs flex items-center gap-1">
                  {STAT_LABELS[key]}
                  <span className="text-muted-foreground">
                    ({STAT_WEIGHTS[key] > 0 ? "+" : ""}{STAT_WEIGHTS[key]})
                  </span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={stats[key]}
                  onChange={(e) => updateStat(key, e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
            ))}
          </div>

          {/* Live preview */}
          {minutes && parseFloat(minutes) > 0 && (
            <div className="bg-accent/30 rounded-lg p-3 space-y-1">
              {(() => {
                const mins = parseFloat(minutes);
                let rawScore = 0;
                for (const [key, weight] of Object.entries(STAT_WEIGHTS)) {
                  rawScore += parseFloat(stats[key as StatKey] || "0") * weight;
                }
                const per90 = (rawScore / mins) * 90;
                const baseline = POSITION_BASELINES[position] || 15.0;
                const adjusted = per90 / baseline;
                const pct = ((adjusted - 1) * 100);

                return (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Raw Score</span>
                      <span className="font-mono font-medium">{rawScore.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Per 90</span>
                      <span className="font-mono font-medium">{per90.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span>League-Adjusted PER</span>
                      <span className="font-mono text-primary">{adjusted.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground pt-1">
                      {pct >= 0 ? `${pct.toFixed(0)}% above` : `${Math.abs(pct).toFixed(0)}% below`} average for position (baseline {baseline})
                    </p>
                  </>
                );
              })()}
            </div>
          )}

          <Button onClick={calculate} className="w-full">
            Use This PER Value
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
