import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { Brain, Download, Link2, Loader2, Save, Sparkles, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PlayerCombobox } from "@/components/staff/PlayerCombobox";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";
import {
  buildSpqReportPrompt,
  calculateSpqScores,
  parseSpqAnswers,
  stenBand,
  stenBandColor,
  stenBandLabel,
  stenToRankOf100,
  SPQ_SCALE_GUIDANCE,
  type SpqGenderNorm,
  type SpqScaleScore,
} from "@/lib/spqScoring";
import { CoachingDatabase } from "@/components/staff/CoachingDatabase";
import { MarkdownContent } from "@/utils/markdownRenderer";
import { SpqSubmissionsTab } from "./SpqSubmissionsTab";

// Tiny inline person silhouette icon for the scale-bands marker.
const PersonMarker = ({ color }: { color: string }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <circle cx="12" cy="6" r="3.5" fill={color} />
    <path d="M4 22c0-4.4 3.6-8 8-8s8 3.6 8 8" fill={color} />
  </svg>
);

type PlayerOption = { id: string; name: string; position?: string | null; image_url?: string | null; representation_status?: string | null };

type SavedReport = {
  id: string;
  player_name: string;
  gender_norm: string;
  age_band: string | null;
  share_slug: string;
  created_at: string;
};

const formatSten = (n: number) => n.toFixed(1);

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const makeLocalReport = (playerName: string, scores: SpqScaleScore[]) => {
  const strongest = [...scores].sort((a, b) => b.sten - a.sten).slice(0, 4);
  const focus = [...scores].sort((a, b) => a.sten - b.sten).slice(0, 4);
  return `${playerName}'s SPQ profile shows strongest current markers in ${strongest.map(s => `${s.scale} (${formatSten(s.stenRounded)})`).join(", ")}. The main coaching focus areas are ${focus.map(s => `${s.scale} (${formatSten(s.stenRounded)})`).join(", ")}. Use the low areas as practical development themes rather than fixed labels, checking them against match behaviour, training consistency and player feedback.`;
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
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [savedOpen, setSavedOpen] = useState(false);
  const visualOneRef = useRef<HTMLDivElement>(null);
  const visualTwoRef = useRef<HTMLDivElement>(null);
  const visualThreeRef = useRef<HTMLDivElement>(null);

  const loadSaved = async () => {
    const { data } = await (supabase as any)
      .from("psychology_spq_reports")
      .select("id, player_name, gender_norm, age_band, share_slug, created_at")
      .order("created_at", { ascending: false });
    setSavedReports(data || []);
  };

  useEffect(() => {
    void supabase.from("players").select("id, name, position, image_url, representation_status").order("name").then(({ data }) => setPlayers(data || []));
    void loadSaved();
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
      body: { prompt: buildSpqReportPrompt(playerName, scaleScores) },
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
      a.download = `${safeName}.png`;
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
      const visualThreeUrl = await captureVisual(visualThreeRef.current, `${playerName}-spq-bands`, true);
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
        visual_three_url: visualThreeUrl,
      }).select("share_slug").single();
      if (error) throw error;
      const url = `${window.location.origin}/spq-report/${data.share_slug}`;
      setShareUrl(url);
      await navigator.clipboard?.writeText(url).catch(() => undefined);
      toast.success("SPQ report saved and share URL copied");
      void loadSaved();
      setSavedOpen(true);
    } catch (error: any) {
      toast.error(error?.message || "Failed to save SPQ report");
    } finally {
      setSaving(false);
    }
  };

  const deleteSaved = async (id: string) => {
    const { error } = await (supabase as any).from("psychology_spq_reports").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("SPQ report deleted");
    void loadSaved();
  };

  // Matrix coordinates (0-10 each axis)
  const acFactor = factorScores.find(f => f.factor === "Achievement and Competitiveness");
  const crFactor = factorScores.find(f => f.factor === "Confidence and Resilience");
  const matrixX = crFactor ? Math.max(0, Math.min(10, crFactor.averageSten)) : 5.5;
  const matrixY = acFactor ? Math.max(0, Math.min(10, acFactor.averageSten)) : 5.5;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Brain className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Psychology</h2>
      </div>
      <Tabs defaultValue="spq">
        <TabsList>
          <TabsTrigger value="spq">SPQ</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
        </TabsList>
        <TabsContent value="sessions" className="space-y-4">
          <CoachingDatabase initialTable="psychological_sessions" />
        </TabsContent>
        <TabsContent value="submissions" className="space-y-4">
          <SpqSubmissionsTab />
        </TabsContent>
        <TabsContent value="spq" className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label>Assign to player</Label><PlayerCombobox players={players} value={playerId} onChange={setPlayerId} allValue="none" allLabel="No assigned player" className="mt-1" /></div>
                  <div><Label>Report name</Label><Input value={playerName} onChange={e => setPlayerName(e.target.value)} className="mt-1" placeholder="Player name" /></div>
                  <div><Label>Norm table</Label><Select value={genderNorm} onValueChange={(v: SpqGenderNorm) => setGenderNorm(v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="men">Men</SelectItem><SelectItem value="women">Women</SelectItem></SelectContent></Select></div>
                  <div><Label>Age band</Label><Select value={ageBand} onValueChange={setAgeBand}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["16-20","21-30","31-40","41-50","51-60","over 60"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <Textarea value={pastedAnswers} onChange={e => setPastedAnswers(e.target.value)} rows={12} spellCheck lang="en-GB" placeholder="Paste the SPQ answers here. Example: 22 I push myself to the limit 3" />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Matched {answeredCount}/168 answers, scoring the 120 SPQ core items used here.</span>
                  <Button onClick={generateReport} size="sm" className="gap-2"><Sparkles className="h-4 w-4" />Generate report</Button>
                </div>
                <Textarea value={reportText} onChange={e => setReportText(e.target.value)} rows={7} spellCheck lang="en-GB" placeholder="Generated report text" />
                {reportText && (
                  <Card className="bg-background">
                    <CardContent className="p-4 text-sm leading-relaxed">
                      <MarkdownContent content={reportText} />
                    </CardContent>
                  </Card>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={saveReport} disabled={saving} className="gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save share report</Button>
                  {shareUrl && <Button variant="outline" onClick={() => navigator.clipboard.writeText(shareUrl)} className="gap-2"><Link2 className="h-4 w-4" />Copy URL</Button>}
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ background: stenBandColor("work-on") }} />Work On (≤3.5)</span>
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ background: stenBandColor("improve-on") }} />Improve On (3.6–7.5)</span>
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ background: stenBandColor("capitalise-on") }} />Capitalise On (≥7.6)</span>
                </div>
              </div>

              {/* Visuals — stacked on separate rows so each renders large/high quality */}
              <div className="space-y-6">
                {/* Sten Profile */}
                <Card ref={visualOneRef} className="bg-background">
                  <CardHeader><CardTitle>{playerName || "Player"} SPQ Sten Profile</CardTitle></CardHeader>
                  <CardContent className="space-y-2.5">
                    {/* Axis */}
                    <div className="grid grid-cols-[200px_1fr_60px] items-center gap-3 text-[11px] text-muted-foreground">
                      <div />
                      <div className="relative h-6">
                        <span className="absolute left-0 -translate-x-3 text-foreground font-bold">&lt;</span>
                        <span className="absolute right-0 translate-x-3 text-foreground font-bold">&gt;</span>
                        {Array.from({ length: 11 }, (_, i) => i).map(n => (
                          <div key={n} className="absolute -translate-x-1/2 text-center" style={{ left: `${(n / 10) * 100}%` }}>{n}</div>
                        ))}
                      </div>
                      <div className="text-right font-semibold">Sten</div>
                    </div>
                    {scaleScores.map(score => {
                      const band = stenBand(score.sten);
                      const colour = stenBandColor(band);
                      const pct = (score.stenRounded / 10) * 100;
                      const lowPct = (score.confidenceLow / 10) * 100;
                      const highPct = (score.confidenceHigh / 10) * 100;
                      const rank = stenToRankOf100(score.sten, score.z);
                      return (
                        <div key={score.scale} className="grid grid-cols-[200px_1fr_60px] items-center gap-3 text-sm">
                          <div className="font-medium">{score.scale}</div>
                          <div className="relative h-8 rounded border border-border bg-card">
                            {Array.from({ length: 9 }, (_, i) => i + 1).map(n => (
                              <div key={n} className="absolute top-0 bottom-0 w-px bg-border/40" style={{ left: `${(n / 10) * 100}%` }} />
                            ))}
                            <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full" style={{ left: `${lowPct}%`, width: `${Math.max(0, highPct - lowPct)}%`, background: colour, opacity: 0.35 }} />
                            <div className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background" style={{ left: `${pct}%`, background: colour }} />
                          </div>
                          <div className="text-right font-semibold" style={{ color: colour }}>{ordinal(rank)}</div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Matrix */}
                <Card ref={visualTwoRef} className="bg-background">
                  <CardHeader><CardTitle>SPQ Matrix</CardTitle></CardHeader>
                  <CardContent>
                    <div className="mx-auto max-w-[640px]">
                      <div className="grid grid-cols-[40px_1fr] gap-3">
                        <div className="flex items-center justify-center">
                          {/* Y-axis label rotated so it reads bottom→top, ending with arrow at the top */}
                          <div className="text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                            Achievement and Competitiveness →
                          </div>
                        </div>
                        <div>
                          <div className="relative aspect-square w-full border-2 border-foreground">
                          {/* 10x10 grid */}
                          <div className="absolute inset-0 grid grid-cols-10 grid-rows-10">
                            {Array.from({ length: 100 }, (_, i) => {
                              const col = i % 10; const row = Math.floor(i / 10);
                              // top-left is high AC / low CR (work zone), top-right capitalise, etc.
                              const isHighAC = row < 5;
                              const isHighCR = col >= 5;
                              const tint = isHighAC && isHighCR ? "rgba(58,165,100,0.10)" : !isHighAC && !isHighCR ? "rgba(209,67,67,0.10)" : "rgba(224,168,38,0.06)";
                              return <div key={i} className="border border-border/40" style={{ background: tint }} />;
                            })}
                          </div>
                          {/* Quadrant midlines */}
                          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-foreground/60" />
                          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-foreground/60" />
                          {/* Axis tick labels */}
                          {Array.from({ length: 11 }, (_, i) => i).map(n => (
                            <div key={`x${n}`} className="absolute -bottom-5 -translate-x-1/2 text-[10px] text-muted-foreground" style={{ left: `${(n / 10) * 100}%` }}>{n}</div>
                          ))}
                          {Array.from({ length: 11 }, (_, i) => i).map(n => (
                            <div key={`y${n}`} className="absolute -left-5 -translate-y-1/2 text-[10px] text-muted-foreground" style={{ top: `${100 - (n / 10) * 100}%` }}>{n}</div>
                          ))}
                          {/* Player marker */}
                          <div className="absolute" style={{ left: `${(matrixX / 10) * 100}%`, top: `${100 - (matrixY / 10) * 100}%`, transform: "translate(-50%, -50%)" }}>
                            <PersonMarker color="hsl(var(--primary))" />
                          </div>
                          </div>
                          <div className="mt-6 text-center text-xs font-bold uppercase tracking-wider">Confidence and Resilience →</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => captureVisual(visualOneRef.current, `${playerName || 'player'}-spq-sten`)} className="gap-2"><Download className="h-4 w-4" />Download Sten Profile</Button>
                  <Button variant="outline" size="sm" onClick={() => captureVisual(visualTwoRef.current, `${playerName || 'player'}-spq-matrix`)} className="gap-2"><Download className="h-4 w-4" />Download Matrix</Button>
                </div>

                {/* Scale bands as percentile lineup (1 best of 100 → 100 worst of 100) */}
                <Card ref={visualThreeRef} className="bg-background">
                  <CardHeader>
                    <CardTitle className="text-base">{playerName || "Player"} SPQ Scale Bands</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    {/* Top scale: 100th worst on the LEFT → 1st best on the RIGHT */}
                    <div className="grid grid-cols-[200px_1fr_70px_110px] items-center gap-3 text-[11px] text-muted-foreground">
                      <div className="text-right font-semibold text-foreground">← Worst in 100</div>
                      <div className="relative h-4">
                        {Array.from({ length: 11 }, (_, i) => i * 10).map(t => {
                          const rankAtTick = t === 0 ? 100 : 100 - t; // left=100, right=1
                          return (
                            <span key={t} className="absolute -translate-x-1/2" style={{ left: `${t}%` }}>{rankAtTick === 0 ? 1 : rankAtTick}</span>
                          );
                        })}
                      </div>
                      <div className="text-left font-semibold text-foreground">Best in 100 →</div>
                      <div />
                    </div>
                    {scaleScores.map(s => {
                      const rank = stenToRankOf100(s.sten, s.z);
                      const b = stenBand(s.sten);
                      const c = stenBandColor(b);
                      // Reverse: rank 1 (best) sits on the right.
                      const leftPct = 100 - rank;
                      return (
                        <div key={s.scale} className="grid grid-cols-[200px_1fr_70px_110px] items-center gap-3 text-sm">
                          <div className="font-medium">{s.scale}</div>
                          <div className="relative h-7 rounded border border-border bg-card overflow-visible">
                            {/* tick marks every 10 */}
                            {Array.from({ length: 11 }, (_, i) => i * 10).map(t => (
                              <div key={t} className="absolute top-0 bottom-0 w-px bg-border/40" style={{ left: `${t}%` }} />
                            ))}
                            <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${leftPct}%` }} title={`${ordinal(rank)} of 100`}>
                              <PersonMarker color={c} />
                            </div>
                          </div>
                          <div className="text-right font-bold" style={{ color: c }}>{ordinal(rank)}</div>
                          <div className="text-[11px]" style={{ color: c }}>{stenBandLabel(b)}</div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Areas to work on — guidance from SPQ manual */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Areas to focus on</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {scaleScores.map(s => {
                      const b = stenBand(s.sten);
                      const c = stenBandColor(b);
                      const guidance = SPQ_SCALE_GUIDANCE[s.scale];
                      const advice = !guidance ? "" : b === 'work-on' ? guidance.workOn : b === 'improve-on' ? guidance.improveOn : guidance.capitaliseOn;
                      return (
                        <div key={s.scale} className="rounded-md border border-border p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
                              <span className="font-semibold">{s.scale}</span>
                              <span className="text-xs text-muted-foreground">{stenBandLabel(b)} · {ordinal(stenToRankOf100(s.sten, s.z))} of 100</span>
                            </div>
                          </div>
                          {advice && <p className="mt-1 text-xs text-foreground/85">{advice}</p>}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => captureVisual(visualThreeRef.current, `${playerName || 'player'}-spq-bands`)} className="gap-2"><Download className="h-4 w-4" />Download Scale Bands</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prominent Save CTA at the end of the SPQ */}
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm">
                <div className="font-semibold">Finished? Save this SPQ.</div>
                <div className="text-muted-foreground text-xs">
                  {playerId && playerId !== "none"
                    ? "It will appear in this player's Athlete Centre, Player Management and Player Portal Psychology sections."
                    : "Assign a player above so it appears in their Athlete Centre, Player Management and Player Portal."}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveReport} disabled={saving} size="lg" className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save to Saved SPQs
                </Button>
                {shareUrl && (
                  <Button variant="outline" size="lg" onClick={() => navigator.clipboard.writeText(shareUrl)} className="gap-2">
                    <Link2 className="h-4 w-4" />Copy share URL
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Saved reports */}
          <Card>
            <Collapsible open={savedOpen} onOpenChange={setSavedOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex w-full items-center justify-between p-4 text-left">
                  <div className="flex items-center gap-2">
                    {savedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-semibold">Saved SPQ reports</span>
                    <span className="text-xs text-muted-foreground">({savedReports.length})</span>
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {savedReports.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No saved reports yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-xs text-muted-foreground">
                          <tr><th className="py-2">Player</th><th>Norm</th><th>Age band</th><th>Date</th><th className="text-right">Actions</th></tr>
                        </thead>
                        <tbody>
                          {savedReports.map(r => (
                            <tr key={r.id} className="border-t border-border">
                              <td className="py-2 font-medium">{r.player_name}</td>
                              <td className="capitalize">{r.gender_norm}</td>
                              <td>{r.age_band || "—"}</td>
                              <td>{new Date(r.created_at).toLocaleDateString("en-GB")}</td>
                              <td className="flex justify-end gap-1 py-1">
                                <Button size="sm" variant="outline" className="gap-1" onClick={() => { const u = `${window.location.origin}/spq-report/${r.share_slug}`; navigator.clipboard.writeText(u); toast.success("Share URL copied"); }}><Link2 className="h-3 w-3" />Copy</Button>
                                <Button size="sm" variant="outline" asChild><a href={`/spq-report/${r.share_slug}`} target="_blank" rel="noreferrer">Open</a></Button>
                                <Button size="sm" variant="ghost" onClick={() => deleteSaved(r.id)}><Trash2 className="h-3 w-3" /></Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
