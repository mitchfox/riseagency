import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, ArrowRight } from "lucide-react";
import { toast } from "sonner";

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

  // Parse improvement strings like "goals: 2 → 4" or "R90: 6.50 → 7.20"
  const parsedImprovements = improvements.map((imp) => {
    const arrowMatch = imp.match(/^(.+?):\s*(.+?)\s*→\s*(.+)$/);
    if (arrowMatch) {
      const label = arrowMatch[1].trim();
      const from = arrowMatch[2].trim();
      const to = arrowMatch[3].trim();
      const fromNum = parseFloat(from);
      const toNum = parseFloat(to);
      const pctChange = fromNum > 0 ? Math.round(((toNum - fromNum) / fromNum) * 100) : null;
      return { label, from, to, pctChange };
    }
    // Fallback for percentage strings like "+15% goals"
    return { label: imp, from: null, to: null, pctChange: null };
  });

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
        scale: 2,
      });
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
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle>Improvement Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overview Card */}
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
                <div className="mt-6 flex items-end gap-4">
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wider">R90 Score</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-white/50 text-lg">{Number(r90_previous).toFixed(2)}</span>
                      <ArrowRight className="h-4 w-4 text-emerald-400" />
                      <span className="text-emerald-400 text-2xl font-bold">{Number(r90_current).toFixed(2)}</span>
                    </div>
                  </div>
                  {r90Change && (
                    <span className="text-emerald-400 text-sm font-semibold bg-emerald-400/10 px-2 py-0.5 rounded">
                      +{r90Change}%
                    </span>
                  )}
                </div>
              )}

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

          {/* Detail Card */}
          <div className="relative">
            <div
              ref={detailRef}
              className="bg-black rounded-xl p-6 md:p-8 text-white"
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">
                  {player_name} — Improvements Breakdown
                </span>
              </div>

              <div className="space-y-3">
                {parsedImprovements.map((imp, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3 border border-white/10"
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
