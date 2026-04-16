import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, CheckCircle2, Loader2, Package } from "lucide-react";

interface FFFPackage {
  id: string;
  player_id: string;
  package_size: number;
  started_at: string;
  notes: string | null;
}

interface FFFCompletion {
  id: string;
  package_id: string;
  analysis_id: string | null;
  performance_report_id: string | null;
  fixture_id: string | null;
  completed_at: string;
}

interface Props {
  playerId: string | null | undefined;
  representationStatus?: string | null;
  /** Pass either an analysis_id, performance_report_id or fixture_id when marking */
  currentAnalysisId?: string | null;
  currentPerformanceReportId?: string | null;
  currentFixtureId?: string | null;
}

export const FFFPackageHeader = ({
  playerId,
  representationStatus,
  currentAnalysisId,
  currentPerformanceReportId,
  currentFixtureId,
}: Props) => {
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<FFFPackage[]>([]);
  const [completions, setCompletions] = useState<FFFCompletion[]>([]);
  const [adding, setAdding] = useState(false);

  const isFFF = representationStatus === "fuel_for_football";

  const load = async () => {
    if (!playerId) return;
    setLoading(true);
    const [{ data: pkgs }, { data: comps }] = await Promise.all([
      supabase
        .from("fff_packages")
        .select("*")
        .eq("player_id", playerId)
        .order("started_at", { ascending: false }),
      supabase
        .from("fff_package_completions")
        .select("*"),
    ]);
    setPackages((pkgs || []) as FFFPackage[]);
    setCompletions((comps || []) as FFFCompletion[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isFFF && playerId) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, isFFF]);

  if (!isFFF || !playerId) return null;
  if (loading) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading Fuel For Football package...
      </div>
    );
  }

  const currentPackage = packages[0] || null;
  const packageCompletions = currentPackage
    ? completions.filter((c) => c.package_id === currentPackage.id)
    : [];
  const completedCount = packageCompletions.length;
  const total = currentPackage?.package_size || 5;
  const progressPct = currentPackage ? Math.min(100, (completedCount / total) * 100) : 0;

  const alreadyMarked = packageCompletions.some((c) => {
    if (currentAnalysisId && c.analysis_id === currentAnalysisId) return true;
    if (currentPerformanceReportId && c.performance_report_id === currentPerformanceReportId) return true;
    if (currentFixtureId && c.fixture_id === currentFixtureId) return true;
    return false;
  });

  const handleStartPackage = async () => {
    setAdding(true);
    const { data, error } = await supabase
      .from("fff_packages")
      .insert({ player_id: playerId, package_size: 5 })
      .select()
      .single();
    if (error) toast.error("Failed to start new package");
    else {
      toast.success("New Fuel For Football package started");
      setPackages((prev) => [data as FFFPackage, ...prev]);
    }
    setAdding(false);
  };

  const handleMarkGame = async () => {
    if (!currentPackage) {
      toast.error("Start a package first");
      return;
    }
    if (alreadyMarked) {
      toast.info("This game already counts towards the package");
      return;
    }
    const { data: userRes } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("fff_package_completions")
      .insert({
        package_id: currentPackage.id,
        analysis_id: currentAnalysisId || null,
        performance_report_id: currentPerformanceReportId || null,
        fixture_id: currentFixtureId || null,
        completed_by: userRes.user?.id || null,
      })
      .select()
      .single();
    if (error) toast.error("Failed to mark game");
    else {
      toast.success("Game added to package");
      setCompletions((prev) => [...prev, data as FFFCompletion]);
    }
  };

  return (
    <div className="rounded-xl border border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center border border-primary/40">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Fuel For Football</p>
            <p className="text-sm font-bold">
              {currentPackage ? (
                <>Package progress: {completedCount} / {total} completed</>
              ) : (
                "No active package"
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentPackage && (currentAnalysisId || currentPerformanceReportId || currentFixtureId) && (
            <Button
              size="sm"
              variant={alreadyMarked ? "outline" : "default"}
              onClick={handleMarkGame}
              disabled={alreadyMarked || completedCount >= total}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {alreadyMarked ? "Counted" : "Mark this game"}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleStartPackage}
            disabled={adding}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            {packages.length === 0 ? "Start package" : "New package"}
          </Button>
        </div>
      </div>
      {currentPackage && (
        <>
          <Progress value={progressPct} className="h-2" />
          {packageCompletions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {packageCompletions.map((c, i) => (
                <Badge key={c.id} variant="outline" className="text-[10px] gap-1 bg-primary/5">
                  Game {i + 1}
                  {c.analysis_id ? " · Analysis" : c.performance_report_id ? " · Report" : c.fixture_id ? " · Fixture" : ""}
                </Badge>
              ))}
            </div>
          )}
          {packages.length > 1 && (
            <p className="text-[10px] text-muted-foreground">
              {packages.length} total packages on record
            </p>
          )}
        </>
      )}
    </div>
  );
};
