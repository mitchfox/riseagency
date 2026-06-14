import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { PerformanceReportDialog } from "@/components/PerformanceReportDialog";
import { extractAnalysisIdFromSlug } from "@/lib/urlHelpers";
import { supabase } from "@/integrations/supabase/client";
import { ShaderAnimation } from "@/components/ui/shader-animation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Standalone shared performance report page (/performance-report/:slug).
 *
 * To guarantee parity with the in-portal experience, this page renders the
 * same `PerformanceReportDialog` component used inside the portal. The dialog
 * is forced open and closing it returns the visitor to the home page.
 */
const PerformanceReport = () => {
  const { t } = useLanguage();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  // The example Cristiano Ronaldo report is linked from /representation
  // with ?lang=xx so the visitor sees it in the language they were
  // already browsing. URL param wins over the global language context.
  const reportLanguage = searchParams.get("lang") || language || "en";

  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [meta, setMeta] = useState<{ player: string; opponent: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      if (!slug) {
        setNotFound(true);
        setResolving(false);
        return;
      }
      const id = extractAnalysisIdFromSlug(slug);
      if (!id) {
        setNotFound(true);
        setResolving(false);
        return;
      }

      const { data, error } = await supabase
        .from("player_analysis")
        .select("id, opponent, report_type, team_name, player_id, players!player_analysis_player_id_fkey(name)")
        .eq("id", id)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setNotFound(true);
      } else {
        // Deep-link guard: stats updaters can only open reports for assigned players
        try {
          const staffUserId = localStorage.getItem("staff_user_id") || sessionStorage.getItem("staff_user_id");
          if (staffUserId) {
            const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", staffUserId);
            const list = (roles || []).map((r: any) => r.role);
            const onlyStatsUpdater = list.length > 0 && list.every((r: string) => r === "stats_updater");
            if (onlyStatsUpdater) {
              const { data: assignments } = await (supabase as any)
                .from("staff_player_assignments")
                .select("player_id")
                .eq("user_id", staffUserId)
                .eq("role_key", "stats_updater");
              const allowed = new Set(((assignments as any[]) || []).map((a: any) => a.player_id));
              const pid = (data as any).player_id;
              if (!pid || !allowed.has(pid)) {
                setNotFound(true);
                setResolving(false);
                return;
              }
            }
          }
        } catch { /* fall through */ }
        const playerName = (data as any).report_type === "team"
          ? ((data as any).team_name || "Team Report")
          : ((data as any).players?.name || "Player");
        setAnalysisId(data.id);
        setMeta({ player: playerName, opponent: (data as any).opponent || "Match" });
      }
      setResolving(false);
    };

    resolve();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Return to home when the visitor closes the report
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={meta ? `${meta.player} vs ${meta.opponent} — Performance Report` : "Performance Report"}
        description={t('performance_report.rise_football_agency_performance_report', 'RISE Football Agency performance report')}
      />
      <div className="print:hidden">
        {!isMobile && <Header />}
      </div>

      <main className="min-h-[60vh] flex items-center justify-center px-4 py-8">
        {resolving && (
          <div className="relative h-[60vh] w-full overflow-hidden rounded-lg bg-background">
            <ShaderAnimation />
          </div>
        )}
        {!resolving && notFound && (
          <div className="text-center text-muted-foreground py-16">
            <p className="text-lg font-semibold">{t('performance_report.performance_report_not_found', 'Performance report not found')}</p>
            <p className="text-sm mt-2">{t('performance_report.this_link_may_be_invalid_or_the_report_has_been_', 'This link may be invalid or the report has been removed.')}</p>
          </div>
        )}
      </main>

      {!resolving && !notFound && analysisId && (
        <PerformanceReportDialog
          open={true}
          onOpenChange={handleOpenChange}
          analysisId={analysisId}
          languageOverride={reportLanguage}
        />
      )}

      <div className="print:hidden">
        {!isMobile && <Footer />}
      </div>
    </div>
  );
};

export default PerformanceReport;
