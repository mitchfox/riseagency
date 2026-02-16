import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Inbox, ArrowRight, FileText, Trophy, Video, BarChart3, Dumbbell, Eye, Bell } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createAnalysisSlug } from "@/lib/urlHelpers";

interface FeedItem {
  id: string;
  type: "report" | "analysis" | "highlight" | "programme" | "comparison";
  title: string;
  subtitle: string;
  description?: string;
  timestamp: string;
  linkLabel?: string;
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

const STORAGE_KEY = "newsfeed_read_items";

const getReadItems = (): Set<string> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

const markAsRead = (id: string) => {
  const read = getReadItems();
  read.add(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...read]));
};

export const NewsFeed = ({ playerId, playerName, onNavigateToAnalysis, onNavigateToForm, onOpenReport }: NewsFeedProps) => {
  const navigate = useNavigate();
  const [items, setItems] = React.useState<FeedItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [readItems, setReadItems] = React.useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = React.useState<FeedItem | null>(null);

  React.useEffect(() => {
    setReadItems(getReadItems());
  }, []);

  // Auto-select first unread item
  React.useEffect(() => {
    if (items.length > 0 && !selectedItem) {
      const firstUnread = items.find(item => !readItems.has(item.id));
      if (firstUnread) {
        setSelectedItem(firstUnread);
        markAsRead(firstUnread.id);
        setReadItems(prev => new Set([...prev, firstUnread.id]));
      } else {
        setSelectedItem(items[0]);
      }
    }
  }, [items]);

  React.useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true);
      const feed: FeedItem[] = [];

      try {
        const { data: reports } = await supabase
          .from("player_analysis")
          .select("id, analysis_date, opponent, r90_score, performance_overview, minutes_played")
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
            description: r.performance_overview || `Match performance rated at R90 ${r.r90_score}. ${r.minutes_played ? `${r.minutes_played} minutes played.` : ''}`,
            timestamp: r.analysis_date,
            linkLabel: "Open Report",
            onClick: () => onOpenReport?.(r.id),
          });
        });

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
            description: `You've been tagged in a ${typeLabel.toLowerCase()} analysis for ${a.home_team || ''} vs ${a.away_team || ''}.`,
            timestamp: t.created_at,
            linkLabel: "View Analysis",
            onClick: () => {
              const slug = createAnalysisSlug(a.home_team || '', a.away_team || '', a.id);
              navigate(slug);
            },
          });
        });

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
            description: `A new highlight reel "${h.name}" has been created for you.`,
            timestamp: h.created_at,
            linkLabel: "View Highlights",
          });
        });

        feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setItems(feed.slice(0, 5));
      } catch (err) {
        console.error("Error fetching news feed:", err);
      } finally {
        setLoading(false);
      }
    };

    if (playerId) fetchFeed();
  }, [playerId]);

  if (!loading && items.length === 0) return null;

  const unreadCount = items.filter(item => !readItems.has(item.id)).length;

  const handleSelectItem = (item: FeedItem) => {
    setSelectedItem(item);
    if (!readItems.has(item.id)) {
      markAsRead(item.id);
      setReadItems(prev => new Set([...prev, item.id]));
    }
  };

  return (
    <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-primary border-b-0">
      <CardHeader marble className="py-2">
        <div className="flex items-center justify-between container mx-auto px-4 pr-6">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            <CardTitle className="font-heading tracking-tight ml-[9px] mt-[1px]">Inbox</CardTitle>
            {unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
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
          <div className="flex gap-0 min-h-[200px]">
            {/* Left side - item list */}
            <div className="w-2/5 border-r border-border pr-3 space-y-0.5 overflow-y-auto max-h-[280px]">
              {items.map((item, idx) => {
                const isRead = readItems.has(item.id);
                const isSelected = selectedItem?.id === item.id;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <button
                      onClick={() => handleSelectItem(item)}
                      className={`w-full flex items-start gap-2 p-2 rounded-lg text-left transition-all ${
                        isSelected
                          ? "bg-primary/10 border border-primary/30"
                          : isRead
                          ? "opacity-45 hover:opacity-70 hover:bg-accent/5"
                          : "hover:bg-accent/10"
                      }`}
                    >
                      <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${COLOUR_MAP[item.type] || "bg-muted text-muted-foreground"}`}>
                        {ICON_MAP[item.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {!isRead && (
                            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                          <p className="text-xs font-medium truncate">{item.title}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </div>

            {/* Right side - detail preview */}
            <div className="w-3/5 pl-4">
              <AnimatePresence mode="wait">
                {selectedItem ? (
                  <motion.div
                    key={selectedItem.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${COLOUR_MAP[selectedItem.type] || "bg-muted text-muted-foreground"}`}>
                        {ICON_MAP[selectedItem.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold">{selectedItem.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{selectedItem.subtitle}</p>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground/80 leading-relaxed">
                      {selectedItem.description || selectedItem.subtitle}
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(selectedItem.timestamp), "d MMM yyyy 'at' HH:mm")}
                      </span>
                    </div>

                    {selectedItem.onClick && (
                      <Button
                        size="sm"
                        onClick={selectedItem.onClick}
                        className="mt-2"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        {selectedItem.linkLabel || "View"}
                      </Button>
                    )}
                  </motion.div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    <p>Select an item to preview</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
