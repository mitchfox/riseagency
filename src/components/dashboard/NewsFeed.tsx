import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Inbox, ArrowRight, FileText, Trophy, Video, BarChart3, Dumbbell } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface FeedItem {
  id: string;
  type: "report" | "analysis" | "highlight" | "programme" | "comparison";
  title: string;
  subtitle: string;
  timestamp: string;
  onClick?: () => void;
}

interface NewsFeedProps {
  playerId: string;
  playerName: string;
  onNavigateToAnalysis?: () => void;
  onNavigateToForm?: () => void;
  onOpenReport?: (id: string) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  report: <FileText className="h-4 w-4" />,
  analysis: <Trophy className="h-4 w-4" />,
  highlight: <Video className="h-4 w-4" />,
  programme: <Dumbbell className="h-4 w-4" />,
  comparison: <BarChart3 className="h-4 w-4" />,
};

const COLOUR_MAP: Record<string, string> = {
  report: "bg-blue-500/15 text-blue-500",
  analysis: "bg-primary/15 text-primary",
  highlight: "bg-purple-500/15 text-purple-500",
  programme: "bg-green-500/15 text-green-500",
  comparison: "bg-orange-500/15 text-orange-500",
};

export const NewsFeed = ({ playerId, playerName, onNavigateToAnalysis, onNavigateToForm, onOpenReport }: NewsFeedProps) => {
  const [items, setItems] = React.useState<FeedItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true);
      const feed: FeedItem[] = [];

      try {
        // Fetch recent performance reports
        const { data: reports } = await supabase
          .from("player_analysis")
          .select("id, analysis_date, opponent, r90_score")
          .eq("player_id", playerId)
          .not("r90_score", "is", null)
          .order("analysis_date", { ascending: false })
          .limit(5);

        reports?.forEach(r => {
          feed.push({
            id: `report-${r.id}`,
            type: "report",
            title: `Performance Report: ${r.opponent || "Match"}`,
            subtitle: `R90: ${r.r90_score} — ${format(new Date(r.analysis_date), "d MMM yyyy")}`,
            timestamp: r.analysis_date,
            onClick: () => onOpenReport?.(r.id),
          });
        });

        // Fetch recent tagged analyses (pre/post match)
        const { data: tags } = await supabase
          .from("analysis_player_tags")
          .select("analysis_id, created_at, analyses(id, title, analysis_type, home_team, away_team)")
          .eq("player_id", playerId)
          .order("created_at", { ascending: false })
          .limit(5);

        tags?.forEach(t => {
          const a = (t as any).analyses;
          if (!a) return;
          const typeLabel = a.analysis_type === "pre-match" ? "Pre-Match" : a.analysis_type === "post-match" ? "Post-Match" : a.analysis_type;
          feed.push({
            id: `analysis-${a.id}`,
            type: "analysis",
            title: `${typeLabel}: ${a.home_team || ""} vs ${a.away_team || ""}`,
            subtitle: a.title || "New analysis available",
            timestamp: t.created_at,
          });
        });

        // Fetch recent highlight projects
        const { data: highlights } = await supabase
          .from("highlight_projects")
          .select("id, name, created_at")
          .eq("player_id", playerId)
          .order("created_at", { ascending: false })
          .limit(3);

        highlights?.forEach(h => {
          feed.push({
            id: `highlight-${h.id}`,
            type: "highlight",
            title: `New Highlight Reel`,
            subtitle: h.name,
            timestamp: h.created_at,
          });
        });

        // Sort by timestamp descending and take top 8
        feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setItems(feed.slice(0, 8));
      } catch (err) {
        console.error("Error fetching news feed:", err);
      } finally {
        setLoading(false);
      }
    };

    if (playerId) fetchFeed();
  }, [playerId]);

  if (!loading && items.length === 0) return null;

  return (
    <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-primary border-b-0">
      <CardHeader marble className="py-2">
        <div className="flex items-center justify-between container mx-auto px-4 pr-6">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            <CardTitle className="font-heading tracking-tight ml-[9px] mt-[1px]">Updates</CardTitle>
          </div>
          {onNavigateToAnalysis && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateToAnalysis}
              className="flex items-center gap-1 text-sm text-primary hover:text-black hover:bg-primary h-10"
            >
              See All
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="container mx-auto px-4 pt-2 pb-3">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-1">
              {items.map((item, idx) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={item.onClick}
                  disabled={!item.onClick}
                  className="w-full flex items-start gap-3 p-2.5 rounded-lg text-left hover:bg-accent/10 transition-colors disabled:cursor-default group"
                >
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${COLOUR_MAP[item.type] || "bg-muted text-muted-foreground"}`}>
                    {ICON_MAP[item.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                  </span>
                </motion.button>
              ))}
            </div>
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
};
