import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Brain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { MarkdownContent } from "@/utils/markdownRenderer";

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// Convert sten (1..10, higher = better) to a rank-out-of-100 (1 = best).
const stenToRank = (sten: number): number => {
  const z = (sten - 5.5) / 2;
  // standard normal CDF
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-z * z / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const cdf = z >= 0 ? 1 - p : p;
  const fromTop = 1 - cdf;
  return Math.max(1, Math.min(100, Math.round(fromTop * 99) + 1));
};

type Report = {
  player_name: string;
  gender_norm: string;
  age_band: string | null;
  scale_scores: Array<{ scale: string; raw: number; stenRounded: number; factor: string }>;
  factor_scores: Array<{ factor: string; averageSten: number; lowHigh: string }>;
  report_summary: string | null;
  visual_one_url: string | null;
  visual_two_url: string | null;
  visual_three_url: string | null;
  created_at: string;
};

const SharedSpqReport = () => {
  const { slug } = useParams();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    void (supabase as any).rpc("get_shared_spq_report", { _share_slug: slug }).then(({ data }: any) => {
      setReport(Array.isArray(data) ? data[0] : data);
      setLoading(false);
    });
  }, [slug]);

  if (loading) return <div className="min-h-screen bg-background" />;
  if (!report) return <div className="min-h-screen bg-background p-6 text-foreground">SPQ report unavailable.</div>;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">{report.player_name} SPQ Report</h1>
            <p className="text-sm text-muted-foreground">{report.gender_norm} norms{report.age_band ? `, ${report.age_band}` : ""}</p>
          </div>
        </div>
        {report.report_summary && (
          <Card><CardContent className="p-5 text-sm leading-relaxed">
            <MarkdownContent content={report.report_summary} />
          </CardContent></Card>
        )}
        <Card>
          <CardHeader><CardTitle>Scale scores</CardTitle></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(report.scale_scores || []).map(score => {
              const rank = stenToRank(score.stenRounded ?? 5.5);
              return (
                <div key={score.scale} className="rounded-md border border-border bg-card p-3">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{score.scale}</span>
                    <span className="text-primary font-bold">{ordinal(rank)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">out of 100</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
        {/* Stacked, full-width visuals so they read large */}
        <div className="space-y-4">
          {report.visual_one_url && <img src={report.visual_one_url} alt="SPQ sten profile" className="block w-full rounded-md border border-border" />}
          {report.visual_two_url && <img src={report.visual_two_url} alt="SPQ matrix" className="block w-full rounded-md border border-border" />}
          {report.visual_three_url && <img src={report.visual_three_url} alt="SPQ scale bands" className="block w-full rounded-md border border-border" />}
        </div>
      </section>
    </main>
  );
};

export default SharedSpqReport;
