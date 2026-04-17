import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { PerformanceReportDialog } from "@/components/PerformanceReportDialog";
import { extractAnalysisIdFromSlug } from "@/lib/urlHelpers";
import { supabase } from "@/integrations/supabase/client";

/**
 * Standalone shared performance report page (/performance-report/:slug).
 *
 * To guarantee parity with the in-portal experience, this page renders the
 * same `PerformanceReportDialog` component used inside the portal. The dialog
 * is forced open and closing it returns the visitor to the home page.
 */
const PerformanceReport = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

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
        .from("performance_analyses")
        .select("id, player_name, opponent")
        .eq("id", id)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setNotFound(true);
      } else {
        setAnalysisId(data.id);
        setMeta({ player: data.player_name || "Player", opponent: data.opponent || "Match" });
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
        description="RISE Football Agency performance report"
      />
      <div className="print:hidden">
        <Header />
      </div>

      <main className="min-h-[60vh] flex items-center justify-center px-4 py-8">
        {resolving && <LoadingSpinner />}
        {!resolving && notFound && (
          <div className="text-center text-muted-foreground py-16">
            <p className="text-lg font-semibold">Performance report not found</p>
            <p className="text-sm mt-2">This link may be invalid or the report has been removed.</p>
          </div>
        )}
      </main>

      {!resolving && !notFound && analysisId && (
        <PerformanceReportDialog
          open={true}
          onOpenChange={handleOpenChange}
          analysisId={analysisId}
        />
      )}

      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
};

export default PerformanceReport;
