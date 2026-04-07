import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Cpu, Database, DollarSign, Zap } from "lucide-react";

interface UsageEntry {
  name: string;
  calls: number;
  estimatedCost: string;
  category: "ai" | "cloud";
}

export const UsageSection = () => {
  const [edgeFunctionUsage, setEdgeFunctionUsage] = useState<Record<string, number>>({});
  const [dbSize, setDbSize] = useState<string>("—");
  const [storageSize, setStorageSize] = useState<string>("—");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        // Fetch edge function invocation counts from analytics
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Count AI-related records as a proxy for usage
        const [
          aiShellRes,
          coachingChatRes,
          analysisRes,
          extractStatsRes,
          translateRes,
        ] = await Promise.all([
          supabase.from("ai_shell_suggestions").select("id", { count: "exact", head: true }),
          supabase.from("coaching_chat_sessions").select("id", { count: "exact", head: true }),
          supabase.from("analyses").select("id", { count: "exact", head: true }),
          supabase.from("performance_report_actions").select("id", { count: "exact", head: true }).not("action_score", "is", null),
          supabase.from("analyses").select("id", { count: "exact", head: true }).not("explanation", "is", null),
        ]);

        setEdgeFunctionUsage({
          "AI Shell Suggestions": aiShellRes.count || 0,
          "Coaching Chat Sessions": coachingChatRes.count || 0,
          "Analyses Created": analysisRes.count || 0,
          "Actions Scored": extractStatsRes.count || 0,
          "AI Translations/Explanations": translateRes.count || 0,
        });

        // Estimate storage from bucket counts
        const buckets = [
          "analysis-videos", "analysis-files", "blog-images",
          "marketing-gallery", "coaching-database", "club-logos",
          "annotation-videos", "dataset-images", "receipt-uploads",
        ];
        let totalFiles = 0;
        for (const bucket of buckets) {
          const { data } = await supabase.storage.from(bucket).list("", { limit: 1000 });
          totalFiles += data?.length || 0;
        }
        setStorageSize(`~${totalFiles} files across ${buckets.length} buckets`);

        // DB size estimate from table counts
        const tables = [
          "players", "analyses", "performance_report_actions", "club_network_contacts",
          "invoices", "fixtures", "coaching_drills", "coaching_exercises",
        ];
        let totalRows = 0;
        for (const table of tables) {
          const { count } = await supabase.from(table as any).select("id", { count: "exact", head: true });
          totalRows += count || 0;
        }
        setDbSize(`~${totalRows.toLocaleString()} rows across core tables`);
      } catch (err) {
        console.error("Usage fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsage();
  }, []);

  const AI_COST_PER_CALL = 0.003; // rough estimate per AI invocation in USD

  const aiFeatures: UsageEntry[] = [
    { name: "AI Shell Suggestions", calls: edgeFunctionUsage["AI Shell Suggestions"] || 0, estimatedCost: "", category: "ai" as const },
    { name: "Coaching Chat (AI)", calls: edgeFunctionUsage["Coaching Chat Sessions"] || 0, estimatedCost: "", category: "ai" as const },
    { name: "AI Translations", calls: edgeFunctionUsage["AI Translations/Explanations"] || 0, estimatedCost: "", category: "ai" as const },
    { name: "Player Stats Extraction", calls: edgeFunctionUsage["Actions Scored"] || 0, estimatedCost: "", category: "ai" as const },
  ].map(f => ({
    ...f,
    estimatedCost: `~$${(f.calls * AI_COST_PER_CALL).toFixed(2)}`,
  }));

  const totalAICalls = aiFeatures.reduce((sum, f) => sum + f.calls, 0);
  const totalAICost = (totalAICalls * AI_COST_PER_CALL).toFixed(2);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold">Usage & Costs</h2>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm">Loading usage data...</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" /> AI Invocations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAICalls.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Est. cost: ~${totalAICost}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" /> Database
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">{dbSize}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-green-500" /> Storage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">{storageSize}</div>
              </CardContent>
            </Card>
          </div>

          {/* AI usage breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> AI Feature Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {aiFeatures.map((feature) => (
                  <div key={feature.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <div className="text-sm font-medium">{feature.name}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm tabular-nums">{feature.calls.toLocaleString()} calls</span>
                      <span className="text-xs text-muted-foreground w-16 text-right">{feature.estimatedCost}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cloud usage info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Cloud Infrastructure</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Cloud usage is billed separately based on instance activity, data transfer and storage. The $25/month free balance covers most standard workloads.</p>
              <p>AI balance ($1/month free) covers Lovable AI model calls used in edge functions. Top up via Settings → Cloud & AI balance if needed.</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
