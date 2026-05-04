import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { Brain, Download, Link2, Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PlayerCombobox } from "@/components/staff/PlayerCombobox";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";
import { buildSpqReportPrompt, calculateSpqScores, parseSpqAnswers, SPQ_FACTORS, type SpqGenderNorm, type SpqScaleScore } from "@/lib/spqScoring";

type PlayerOption = { id: string; name: string; position?: string | null; image_url?: string | null; representation_status?: string | null };

const stenBandClass = (sten: number) => {
  if (sten >= 8) return "bg-primary text-primary-foreground";
  if (sten >= 6) return "bg-accent text-accent-foreground";
  if (sten >= 4) return "bg-muted text-foreground";
  return "bg-destructive text-destructive-foreground";
};

const makeLocalReport = (playerName: string, scores: SpqScaleScore[]) => {
  const strongest = [...scores].sort((a, b) => b.sten - a.sten).slice(0, 4);
  const focus = [...scores].sort((a, b) => a.sten - b.sten).slice(0, 4);
  return `${playerName}'s SPQ profile shows strongest current markers in ${strongest.map(s => `${s.scale} (${s.stenRounded})`).join(", ")}. The main coaching focus areas are ${focus.map(s => `${s.scale} (${s.stenRounded})`).join(", ")}. Use the low areas as practical development themes rather than fixed labels, checking them against match behaviour, training consistency and player feedback.`;
};

export const PsychologySection = () => {
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [playerId, setPlayerId] = useState("none");
  const [playerName, setPlayerName] = useState("");
  const [genderNorm, setGenderNorm] = useState<SpqGenderNorm>("men");
  const [ageBand, setAgeBand] = useState("16-20");
  const [pastedAnswers, setPastedAnswers] = useState("");
  const [reportText, setReportText] = useState("");
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const visualOneRef = useRef<HTMLDivElement>(null);
  const visualTwoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void supabase.from("players").select("id, name, position, image_url, representation_status").order("name").then(({ data }) => setPlayers(data || []));
  }, []);

  useEffect(() => {
    const selected = players.find(p => p.id === playerId);
    if (selected) setPlayerName(selected.name);
  }, [playerId, players]);

  const parsedAnswers = useMemo(() => parseSpqAnswers(pastedAnswers), [pastedAnswers]);
  const { scaleScores, factorScores } = useMemo(() => calculateSpqScores(parsedAnswers, genderNorm), [parsedAnswers, genderNorm]);
  const answeredCount = Object.keys(parsedAnswers).length;

  const generateReport = async () => {
    if (!playerName.trim()) return toast.error("Add a player name first");
    const fallback = makeLocalReport(playerName, scaleScores);
    setReportText(fallback);
    const { data, error } = await invokeEdgeFunction<{ response: string }>("generate-ai-response", {
      body: { prompt: buildSpqReportPrompt(playerName, scaleScores) }
    });
    if (!error && data?.response) setReportText(data.response);
  };

  const captureVisual = async (node: HTMLDivElement | null, name: string, upload = false) => {
    if (!node) return null;
    const canvas = await html2canvas(node, { backgroundColor: "#0f0f0f", scale: 2, useCORS: true });
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.95));
    if (!blob) return null;
    const safeName = name.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
    if (!upload) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
      return null;
    }
    const path = `spq-visuals/${safeName}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("analysis-files").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (error) throw error;
    return supabase.storage.from("analysis-files").getPublicUrl(path).data.publicUrl;
  };

  const saveReport = async () => {
    if (!playerName.trim()) return toast.error("Add a player name first");
    setSaving(true);
    try {
      const visualOneUrl = await captureVisual(visualOneRef.current, `${playerName}-spq-sten`, true);
      const visualTwoUrl = await captureVisual(visualTwoRef.current, `${playerName}-spq-matrix`, true);
      const { data, error } = await (supabase as any).from("psychology_spq_reports").insert({
        player_id: playerId === "none" ? null : playerId,
        player_name: playerName.trim(),
        gender_norm: genderNorm,
        age_band: ageBand,
        pasted_answers: pastedAnswers,
        parsed_answers: parsedAnswers,
        scale_scores: scaleScores,
        factor_scores: factorScores,
        report_summary: reportText || makeLocalReport(playerName, scaleScores),
        recommendations: reportText || null,
        visual_one_url: visualOneUrl,
        visual_two_url: visualTwoUrl,
      }).select("share_slug").single();
      if (error) throw error;
      const url = `${window.location.origin}/spq-report/${data.share_slug}`;
      setShareUrl(url);
      await navigator.clipboard?.writeText(url).catch(() => undefined);
      toast.success("SPQ report saved and share URL copied");
    } catch (error: any) {
      toast.error(error?.message || "Failed to save SPQ report");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Brain className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Psychology</h2>
      </div>
      <Tabs defaultValue="spq">
        <TabsList><TabsTrigger value="spq">SPQ</TabsTrigger></TabsList>
        <TabsContent value="spq" className="space-y-4">
          <Card><CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_1.4fr]">
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Assign to player</Label><PlayerCombobox players={players} value={playerId} onChange={setPlayerId} allValue="none" allLabel="No assigned player" className="mt-1" /></div>
                <div><Label>Report name</Label><Input value={playerName} onChange={e => setPlayerName(e.target.value)} className="mt-1" placeholder="Player name" /></div>
                <div><Label>Norm table</Label><Select value={genderNorm} onValueChange={(v: SpqGenderNorm) => setGenderNorm(v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="men">Men</SelectItem><SelectItem value="women">Women</SelectItem></SelectContent></Select></div>
                <div><Label>Age band</Label><Select value={ageBand} onValueChange={setAgeBand}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["16-20","21-30","31-40","41-50","51-60","over 60"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <Textarea value={pastedAnswers} onChange={e => setPastedAnswers(e.target.value)} rows={12} spellCheck lang="en-GB" placeholder="Paste the SPQ answers here. Example: 22 I push myself to the limit 3" />
              <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-muted-foreground">Matched {answeredCount}/168 answers, scoring the 120 SPQ core items used here.</span><Button onClick={generateReport} size="sm" className="gap-2"><Sparkles className="h-4 w-4" />Generate report</Button></div>
              <Textarea value={reportText} onChange={e => setReportText(e.target.value)} rows={7} spellCheck lang="en-GB" placeholder="Generated report text" />
              <div className="flex flex-wrap gap-2"><Button onClick={saveReport} disabled={saving} className="gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save share report</Button>{shareUrl && <Button variant="outline" onClick={() => navigator.clipboard.writeText(shareUrl)} className="gap-2"><Link2 className="h-4 w-4" />Copy URL</Button>}</div>
            </div>
            <div className="space-y-4 overflow-x-auto">
              <Card ref={visualOneRef} className="min-w-[760px] bg-background"><CardHeader><CardTitle>{playerName || "Player"} SPQ Sten Profile</CardTitle></CardHeader><CardContent className="space-y-2">
                {scaleScores.map(score => <div key={score.scale} className="grid grid-cols-[150px_repeat(10,1fr)] items-center gap-1 text-xs"><div className="font-medium">{score.scale}</div>{Array.from({ length: 10 }, (_, i) => i + 1).map(n => <div key={n} className={`h-7 border border-border/70 text-center leading-7 ${n === score.stenRounded ? stenBandClass(n) : n >= score.confidenceLow && n <= score.confidenceHigh ? "bg-muted" : "bg-card"}`}>{n === score.stenRounded ? "•" : n >= score.confidenceLow && n <= score.confidenceHigh ? "…" : ""}</div>)}</div>)}
              </CardContent></Card>
              <Card ref={visualTwoRef} className="min-w-[520px] bg-background"><CardHeader><CardTitle>SPQ Matrix</CardTitle></CardHeader><CardContent><div className="grid grid-cols-[160px_1fr_1fr] border border-border text-center"><div className="row-span-2 flex items-center justify-center border-r border-border p-4 font-semibold">Achievement and competitiveness</div><div className="border-b border-r border-border p-4 font-semibold">Low</div><div className="border-b border-border p-4 font-semibold">High</div><div className="relative col-span-2 grid grid-cols-2 border-b border-border"><div className="min-h-32 bg-muted/60" /><div className="min-h-32 bg-primary/30" />{factorScores.map(f => <div key={f.factor} className="absolute text-2xl font-black" style={{ left: f.factor.startsWith('Achievement') ? '40%' : '58%', top: '42%' }}>×</div>)}</div><div className="col-start-2 col-span-2 p-4 font-semibold">Confidence and resilience</div></div></CardContent></Card>
              <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => captureVisual(visualOneRef.current, `${playerName || 'player'}-spq-sten`)} className="gap-2"><Download className="h-4 w-4" />Download visual 1</Button><Button variant="outline" size="sm" onClick={() => captureVisual(visualTwoRef.current, `${playerName || 'player'}-spq-matrix`)} className="gap-2"><Download className="h-4 w-4" />Download visual 2</Button></div>
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
