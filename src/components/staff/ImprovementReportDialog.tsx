import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList } from "recharts";

interface ImprovementReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: {
    player_name: string;
    opponent: string;
    improvements: string[];
    r90_current?: number;
    r90_previous?: number;
    analysis_id?: string;
  } | null;
}

export const ImprovementReportDialog = ({ open, onOpenChange, data }: ImprovementReportDialogProps) => {
  const overviewRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState<string | null>(null);

  if (!data) return null;

  const { player_name, opponent, improvements, r90_current, r90_previous } = data;

  const parsedImprovements = improvements.map((imp) => {
    const arrowMatch = imp.match(/^(.+?):\s*(.+?)\s*→\s*(.+)$/);
    if (arrowMatch) {
      const label = arrowMatch[1].trim();
      const from = arrowMatch[2].trim();
      const to = arrowMatch[3].trim();
      const fromNum = parseFloat(from);
      const toNum = parseFloat(to);
      const pctChange = fromNum > 0 ? Math.round(((toNum - fromNum) / fromNum) * 100) : null;
      return { label, from, to, fromNum, toNum, pctChange };
    }
    return { label: imp, from: null, to: null, fromNum: 0, toNum: 0, pctChange: null };
  });

  const chartData = parsedImprovements
    .filter(imp => imp.from !== null && imp.to !== null && !isNaN(imp.fromNum) && !isNaN(imp.toNum))
    .slice(0, 12)
    .map(imp => ({
      name: imp.label.length > 18 ? imp.label.substring(0, 16) + "…" : imp.label,
      previous: imp.fromNum,
      current: imp.toNum,
      pctChange: imp.pctChange,
    }));

  const r90Change = r90_previous && r90_current
    ? ((r90_current - r90_previous) / r90_previous * 100).toFixed(1)
    : null;

  const saveGraphic = async (ref: React.RefObject<HTMLDivElement | null>, filename: string) => {
    if (!ref.current) return;
    setSaving(filename);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const originalBg = ref.current.style.backgroundColor;
      ref.current.style.backgroundColor = "#000000";
      const canvas = await html2canvas(ref.current, {
        background: "#000000",
        useCORS: true,
      } as any);
      ref.current.style.backgroundColor = originalBg;
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Graphic saved");
    } catch {
      toast.error("Failed to save graphic");
    } finally {
      setSaving(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle>Improvement Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overview Card with R90 visual */}
          <div className="relative">
            <div
              ref={overviewRef}
              className="bg-black rounded-xl p-6 md:p-8 text-white"
            >
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">
                  Improvement Report
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mt-2">{player_name}</h2>
              <p className="text-sm text-white/60 mt-1">vs {opponent}</p>

              {r90_previous != null && r90_current != null && (
                <div className="mt-6">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-3">R90 Score Progression</p>
                  <div className="flex items-end gap-6">
                    <div className="flex items-center gap-4">
                      {/* Previous score bar */}
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className="w-16 rounded-t-md bg-white/20 transition-all"
                          style={{ height: `${Math.max(20, Math.min(Number(r90_previous) * 30, 120))}px` }}
                        />
                        <span className="text-white/50 text-sm">{Number(r90_previous).toFixed(2)}</span>
                        <span className="text-[10px] text-white/30">Previous</span>
                      </div>
                      <ArrowRight className="h-5 w-5 text-emerald-400 mb-6" />
                      {/* Current score bar */}
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className="w-16 rounded-t-md bg-emerald-500 transition-all"
                          style={{ height: `${Math.max(20, Math.min(Number(r90_current) * 30, 120))}px` }}
                        />
                        <span className="text-emerald-400 text-2xl font-bold">{Number(r90_current).toFixed(2)}</span>
                        <span className="text-[10px] text-emerald-400/60">Current</span>
                      </div>
                    </div>
                    {r90Change && (
                      <div className="mb-6">
                        <span className="text-emerald-400 text-lg font-bold bg-emerald-400/10 px-3 py-1 rounded-lg">
                          +{r90Change}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Summary stats */}
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <p className="text-[10px] text-white/40 uppercase">Improvements</p>
                  <p className="text-xl font-bold text-emerald-400">{improvements.length}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <p className="text-[10px] text-white/40 uppercase">Avg. Change</p>
                  <p className="text-xl font-bold text-emerald-400">
                    {parsedImprovements.filter(i => i.pctChange != null).length > 0
                      ? `+${Math.round(parsedImprovements.filter(i => i.pctChange != null).reduce((s, i) => s + (i.pctChange || 0), 0) / parsedImprovements.filter(i => i.pctChange != null).length)}%`
                      : "—"}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <p className="text-[10px] text-white/40 uppercase">Categories</p>
                  <p className="text-xl font-bold text-emerald-400">
                    {new Set(parsedImprovements.map(i => {
                      const l = i.label.toLowerCase();
                      if (l.includes('xg') || l.includes('goal') || l.includes('shot')) return 'Shooting';
                      if (l.includes('pass') || l.includes('xa') || l.includes('assist') || l.includes('cross')) return 'Passing';
                      if (l.includes('dribble') || l.includes('carry') || l.includes('touch')) return 'Possession';
                      if (l.includes('tackle') || l.includes('intercept') || l.includes('aerial') || l.includes('duel') || l.includes('clearance')) return 'Defending';
                      return 'Other';
                    })).size}
                  </p>
                </div>
              </div>

              <div className="mt-6 text-xs text-white/30">Rise Agency</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2 z-10"
              disabled={saving === "overview"}
              onClick={() => saveGraphic(overviewRef, `${player_name}_improvement_overview`)}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Save
            </Button>
          </div>

          {/* Chart comparison */}
          {chartData.length > 0 && (
            <div className="bg-black rounded-xl p-6 text-white">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">
                  Before & After Comparison
                </span>
              </div>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-white/20" />
                  <span className="text-[10px] text-white/50">Previous</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <span className="text-[10px] text-white/50">Current</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 35)}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={130}
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
                    axisLine={false}
                  />
                  <Bar dataKey="previous" fill="rgba(255,255,255,0.15)" radius={[0, 3, 3, 0]} barSize={14} />
                  <Bar dataKey="current" radius={[0, 3, 3, 0]} barSize={14}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill="#10b981" />
                    ))}
                    <LabelList
                      dataKey="pctChange"
                      position="right"
                      formatter={(v: number | null) => v != null && v > 0 ? `+${v}%` : ''}
                      style={{ fill: '#10b981', fontSize: 9, fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Detail Card */}
          <div className="relative">
            <div
              ref={detailRef}
              className="bg-black rounded-xl p-6 md:p-8 text-white"
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">
                  {player_name} — Full Breakdown
                </span>
              </div>

              <div className="space-y-2">
                {parsedImprovements.map((imp, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-2.5 border border-white/10"
                  >
                    <span className="text-sm font-medium capitalize">{imp.label}</span>
                    <div className="flex items-center gap-3">
                      {imp.from && imp.to ? (
                        <>
                          <span className="text-white/50 text-sm">{imp.from}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400 text-sm font-bold">{imp.to}</span>
                          {imp.pctChange != null && imp.pctChange > 0 && (
                            <span className="text-[10px] bg-emerald-400/10 text-emerald-400 px-1.5 py-0.5 rounded font-semibold">
                              +{imp.pctChange}%
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-emerald-400 text-sm">{imp.label}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-xs text-white/30">Rise Agency</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2 z-10"
              disabled={saving === "detail"}
              onClick={() => saveGraphic(detailRef, `${player_name}_improvements_detail`)}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};