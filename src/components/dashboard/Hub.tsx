import * as React from "react";
import { t } from "@/lib/portalTranslations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, ArrowRight, Trophy, X, FileText, Eye, Play } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, ReferenceLine, Rectangle } from "recharts";
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, addDays } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getR90Grade } from "@/lib/gradeCalculations";
import { PerformanceReportDialog } from "@/components/PerformanceReportDialog";
import { MatchClipPlayer } from "@/components/staff/analysis/MatchClipPlayer";
import { createAnalysisSlug } from "@/lib/urlHelpers";
import { QuickStatsComparison } from "./QuickStatsComparison";
import { NewsFeed } from "./NewsFeed";
import { ParallaxHero } from "@/components/portal/ParallaxHero";
import { LongTermVisionSection } from "@/components/portal/LongTermVisionSection";
import { checkAndFireConfetti } from "@/lib/confetti";
import { useAutoTranslateStrings } from "@/hooks/useAutoTranslateStrings";
import { formatDate } from "@/lib/dateLocale";
import { groupBySeason } from "@/lib/seasons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Helper: fetches next fixture for player's club and renders ParallaxHero with countdown
const ParallaxHeroWithFixture = ({ playerData, marketingImages, imageFocalPoints, portalLanguage }: { playerData: any; marketingImages: string[]; imageFocalPoints: string[]; portalLanguage?: string | null }) => {
  const [nextFixture, setNextFixture] = React.useState<{ home_team: string; away_team: string; match_date: string; match_time?: string | null; venue?: string } | null>(null);
  const [preMatchAnalysis, setPreMatchAnalysis] = React.useState<{ id: string; home_team: string; away_team: string } | null>(null);

  React.useEffect(() => {
    const getFixtureKickoff = (fixture: { match_date: string; match_time?: string | null }) => {
      const [year, month, day] = fixture.match_date.split("-").map(Number);
      const timeValue = fixture.match_time && fixture.match_time.trim() ? fixture.match_time : null;
      if (!timeValue) return null;
      const [kickoffHours, kickoffMins] = timeValue.split(":").map(Number);
      return new Date(year, (month || 1) - 1, day || 1, kickoffHours || 0, kickoffMins || 0, 0, 0);
    };

    const fetchNext = async () => {
      const playerId = playerData?.id;
      const club = playerData?.current_club;
      const nowDate = new Date();
      const today = nowDate.toISOString().split("T")[0];

      let fixtureData: any = null;

      // Try player_fixtures first (most reliable)
      if (playerId) {
        const { data: pfData } = await supabase
          .from("player_fixtures")
          .select("fixture:fixtures(id, match_date, match_time, home_team, away_team, venue)")
          .eq("player_id", playerId)
          .order("fixture(match_date)", { ascending: true });

        if (pfData && pfData.length > 0) {
          const upcoming = pfData
            .map((pf: any) => pf.fixture)
            .filter((f: any) => f && getFixtureKickoff(f) > nowDate)
            .sort((a: any, b: any) => getFixtureKickoff(a).getTime() - getFixtureKickoff(b).getTime());

          if (upcoming.length > 0) {
            fixtureData = upcoming[0];
          }
        }
      }

      // Fallback: match by club name
      if (!fixtureData && club) {
        const { data } = await supabase
          .from("fixtures")
          .select("id, match_date, match_time, home_team, away_team, venue")
          .gte("match_date", today)
          .or(`home_team.ilike.%${club}%,away_team.ilike.%${club}%`)
          .order("match_date", { ascending: true })
          .order("match_time", { ascending: true })
          .limit(30);

        fixtureData = (data || []).find((fixture: any) => getFixtureKickoff(fixture) > nowDate) || null;
      }

      if (!fixtureData) {
        setNextFixture(null);
        setPreMatchAnalysis(null);
        return;
      }

      setNextFixture(fixtureData);

      // Fetch pre-match analysis linked to this fixture
      const { data: preMatch } = await supabase
        .from("analyses")
        .select("id, home_team, away_team")
        .eq("analysis_type", "pre-match")
        .neq("category", "training")
        .eq("fixture_id", fixtureData.id)
        .limit(1);

      if (preMatch && preMatch.length > 0) {
        setPreMatchAnalysis({
          id: preMatch[0].id,
          home_team: preMatch[0].home_team || "",
          away_team: preMatch[0].away_team || "",
        });
      } else {
        setPreMatchAnalysis(null);
      }
    };

    fetchNext();
    const refreshTimer = setInterval(fetchNext, 30000);
    return () => clearInterval(refreshTimer);
  }, [playerData?.id, playerData?.current_club]);

  const imageUrls = React.useMemo(() => {
    const urls: string[] = [];
    if (marketingImages.length > 0) urls.push(...marketingImages);
    else if (playerData?.image_url) urls.push(playerData.image_url);
    return urls;
  }, [marketingImages, playerData?.image_url]);

  return (
    <ParallaxHero
      imageUrl={imageUrls[0] || null}
      imageUrls={imageUrls}
      imageFocalPoints={imageFocalPoints}
      playerName={playerData?.name || "Player"}
      clubName={playerData?.current_club}
      position={playerData?.position}
      portalLanguage={portalLanguage}
      nextFixture={nextFixture}
      preMatchAnalysis={preMatchAnalysis}
    />
  );
};

interface PlayerProgram {
  id: string;
  program_name: string;
  weekly_schedules: any;
  is_current: boolean;
  created_at?: string;
  updated_at?: string;
}

interface PlayerAnalysis {
  id: string;
  analysis_date: string;
  opponent: string;
  r90_score: number;
  result: string;
  minutes_played?: number;
  striker_stats?: any;
  fixture_id?: string;
  analysis_writer_id?: string | null;
  analysis_writer_data?: any;
  tagged_analyses?: any[];
  visibility_status?: string;
  placeholder_raw_score?: number | null;
  placeholder_minutes?: number | null;
  placeholder_per?: number | null;
  placeholder_sr?: number | null;
  video_url?: string | null;
  season_final?: boolean | null;
}

interface HubProps {
  programs: PlayerProgram[];
  analyses: PlayerAnalysis[];
  playerData: any;
  dailyAphorism?: any;
  portalSettings?: any;
  portalLanguage?: string | null;
  onNavigateToAnalysis: () => void;
  onNavigateToComparisons?: () => void;
  onNavigateToForm?: () => void;
  onNavigateToSession?: (sessionKey: string) => void;
  onNavigateToSchedule?: () => void;
}

export const Hub = ({ programs, analyses, playerData, dailyAphorism, portalSettings, portalLanguage, onNavigateToAnalysis, onNavigateToComparisons, onNavigateToForm, onNavigateToSession, onNavigateToSchedule }: HubProps) => {
  // Translate aphorism text on the fly for non-English portals
  const aphorismStrings = React.useMemo(
    () => [dailyAphorism?.featured_text, dailyAphorism?.body_text, dailyAphorism?.author].filter(Boolean) as string[],
    [dailyAphorism?.featured_text, dailyAphorism?.body_text, dailyAphorism?.author]
  );
  const { translate: trAphorism } = useAutoTranslateStrings(aphorismStrings, portalLanguage);
  const navigate = useNavigate();
  const [clippedAnalysis, setClippedAnalysis] = React.useState<PlayerAnalysis | null>(null);

  const isPlayableReport = React.useCallback((analysis: PlayerAnalysis) => {
    const status = String(analysis.visibility_status || "").toLowerCase();
    return (status === "live" || status === "clipped") && !String(analysis.id || "").startsWith("fixture-");
  }, []);

  const handleClipsClick = React.useCallback((analysis: PlayerAnalysis) => {
    if (!isPlayableReport(analysis)) return;
    setClippedAnalysis(analysis);
  }, [isPlayableReport]);

  const getEffectiveR90 = (a: PlayerAnalysis): number | null => {
    const isDraft = String(a.visibility_status || "").toLowerCase() === "draft";
    const isClipped = String(a.visibility_status || "").toLowerCase() === "clipped";
    if (isDraft || isClipped) return null; // Draft/Clipped reports show "?" not a score
    const isHidden = String(a.visibility_status || "").toLowerCase() === "hidden";
    if (isHidden && a.placeholder_raw_score != null && (a.placeholder_minutes ?? 0) > 0) {
      return (a.placeholder_raw_score / a.placeholder_minutes!) * 90;
    }
    return a.r90_score;
  };

  const [marketingImages, setMarketingImages] = React.useState<string[]>([]);
  const [imageFocalPoints, setImageFocalPoints] = React.useState<string[]>([]);
  const [imagesPreloaded, setImagesPreloaded] = React.useState(false);
  const hasAnimated = React.useRef(false);
  const chartRef = React.useRef<HTMLDivElement>(null);
  const [tooltipVisible, setTooltipVisible] = React.useState(true);
  const [reportDialogOpen, setReportDialogOpen] = React.useState(false);
  const [selectedReportId, setSelectedReportId] = React.useState<string | null>(null);
  const [postMatchAnalyses, setPostMatchAnalyses] = React.useState<Map<string, { id: string; homeTeam: string; awayTeam: string }>>(new Map());
  const confettiFired = React.useRef(false);
  const [selectedSeasonId, setSelectedSeasonId] = React.useState<string>("__current__");

  const seasons = React.useMemo(
    () => groupBySeason(analyses.filter(a => !String(a.id || "").startsWith("fixture-"))),
    [analyses]
  );
  const activeSeason = React.useMemo(
    () => seasons.find(s => s.id === selectedSeasonId) || seasons[0] || null,
    [seasons, selectedSeasonId]
  );
  const seasonScopedAnalyses = React.useMemo<PlayerAnalysis[]>(
    () => (activeSeason ? (activeSeason.analyses as PlayerAnalysis[]) : analyses),
    [activeSeason, analyses]
  );

  // Fire confetti on personal best R90
  React.useEffect(() => {
    if (confettiFired.current || analyses.length < 2) return;
    const sorted = [...analyses].sort((a, b) => new Date(b.analysis_date).getTime() - new Date(a.analysis_date).getTime());
    const latest = sorted[0];
    const latestR90 = getEffectiveR90(latest);
    const previousBest = Math.max(...sorted.slice(1).map(a => getEffectiveR90(a) ?? 0));
    if (latestR90 != null && checkAndFireConfetti(latestR90, previousBest)) {
      confettiFired.current = true;
    }
  }, [analyses]);

  // Fetch post-match analyses linked to fixtures
  React.useEffect(() => {
    const fetchPostMatchAnalyses = async () => {
      const { data } = await supabase
        .from('analyses')
        .select('id, fixture_id, home_team, away_team')
        .eq('analysis_type', 'post-match')
        .neq('category', 'training')
        .not('fixture_id', 'is', null);
      
      if (data) {
        const map = new Map<string, { id: string; homeTeam: string; awayTeam: string }>();
        data.forEach(a => {
          if (a.fixture_id) {
            map.set(a.fixture_id, { id: a.id, homeTeam: a.home_team || '', awayTeam: a.away_team || '' });
          }
        });
        setPostMatchAnalyses(map);
      }
    };
    fetchPostMatchAnalyses();
  }, []);
  // Custom Tooltip Component with close button
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length || !tooltipVisible) return null;
    
    const data = payload[0].payload;
    const stats = data.strikerStats;
    
    return (
      <div 
        className="relative bg-black border-2 border-[hsl(43,49%,61%)] rounded-lg p-3 text-white min-w-[200px]"
        style={{ pointerEvents: 'auto' }}
      >
        <button
          onClick={() => setTooltipVisible(false)}
          className="absolute top-2 right-2 text-white/60 hover:text-white transition-colors"
          aria-label="Close tooltip"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="space-y-2 pr-6">
          <div className="font-bold text-white text-base mb-1">{data.result} {data.opponent}</div>
          {data.minutesPlayed && (
            <div className="text-xs text-white/60">{t(portalLanguage, "minutes_played")}: {data.minutesPlayed}</div>
          )}
          {stats && (
            <div className="space-y-1 pt-2 border-t border-white/20">
              <div className="text-xs font-semibold text-white/80">Advanced Stats (per 90):</div>
              {stats.xG_adj_per90 !== undefined && (
                <div className="text-xs text-white/70">xG (adj): {stats.xG_adj_per90.toFixed(2)}</div>
              )}
              {stats.xA_adj_per90 !== undefined && (
                <div className="text-xs text-white/70">xA (adj): {stats.xA_adj_per90.toFixed(2)}</div>
              )}
              {stats.regains_adj_per90 !== undefined && (
                <div className="text-xs text-white/70">Regains (adj): {stats.regains_adj_per90.toFixed(2)}</div>
              )}
              {stats.interceptions_per90 !== undefined && (
                <div className="text-xs text-white/70">Interceptions: {stats.interceptions_per90.toFixed(2)}</div>
              )}
              {stats.progressive_passes_adj_per90 !== undefined && (
                <div className="text-xs text-white/70">Progressive Passes (adj): {stats.progressive_passes_adj_per90.toFixed(2)}</div>
              )}
              {stats.turnovers_adj_per90 !== undefined && (
                <div className="text-xs text-white/70">Turnovers (adj): {stats.turnovers_adj_per90.toFixed(2)}</div>
              )}
              {stats.movement_in_behind_xC_per90 !== undefined && (
                <div className="text-xs text-white/70">Movement In Behind xC: {stats.movement_in_behind_xC_per90.toFixed(2)}</div>
              )}
              {stats.movement_to_feet_xC_per90 !== undefined && (
                <div className="text-xs text-white/70">Movement To Feet xC: {stats.movement_to_feet_xC_per90.toFixed(2)}</div>
              )}
              {stats.crossing_movement_xC_per90 !== undefined && (
                <div className="text-xs text-white/70">Crossing Movement xC: {stats.crossing_movement_xC_per90.toFixed(2)}</div>
              )}
            </div>
          )}
          {(data.per != null || data.sr != null) && (
            <div className="space-y-1 pt-2 border-t border-white/20">
              {data.per != null && (
                <div className="text-xs text-white/70">PER: {Number(data.per).toFixed(2)}</div>
              )}
              {data.sr != null && (
                <div className="text-xs text-white/70">SR: {Number(data.sr).toFixed(1)}</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Fetch hero images - prefer portal settings hero_images, fallback to marketing_gallery
  React.useEffect(() => {
    const fetchMarketingImages = async () => {
      // If portal settings have hero images, use those instead of marketing_gallery
      if (portalSettings?.hero_images && portalSettings.hero_images.length > 0) {
        console.log('Using portal settings hero images:', portalSettings.hero_images.length);
        setMarketingImages(portalSettings.hero_images);
        setImageFocalPoints(portalSettings.hero_focal_points || portalSettings.hero_images.map(() => 'center center'));
        
        // Preload
        Promise.all(
          portalSettings.hero_images.slice(0, 4).map((url: string) => {
            return new Promise((resolve) => {
              const img = new Image();
              img.onload = () => resolve(url);
              img.onerror = () => resolve(url);
              img.src = url;
            });
          })
        ).then(() => setImagesPreloaded(true));
        return;
      }

      if (!playerData?.name) {
        setImagesPreloaded(true);
        return;
      }
      
      // Fallback: Fetch images from marketing_gallery
      const { data: images, error } = await supabase
        .from('marketing_gallery')
        .select('file_url, focal_point')
        .eq('file_type', 'image')
        .eq('player_id', playerData.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching player images:', error);
        setImagesPreloaded(true);
        return;
      }
      
      const imageUrls = (images || []).map(img => img.file_url).filter(Boolean);
      const focalPoints = (images || []).map(img => img.focal_point || 'center center');
      
      if (imageUrls.length === 0) {
        setImagesPreloaded(true);
        return;
      }
      
      setMarketingImages(imageUrls);
      setImageFocalPoints(focalPoints);
      
      const priorityCount = Math.min(4, imageUrls.length);
      Promise.all(
        imageUrls.slice(0, priorityCount).map(url => {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(url);
            img.onerror = () => resolve(url);
            img.src = url;
          });
        })
      ).then(() => {
        setImagesPreloaded(true);
        const remaining = imageUrls.slice(priorityCount);
        remaining.forEach(url => {
          const img = new Image();
          img.src = url;
        });
      }).catch(() => setImagesPreloaded(true));
    };
    
    fetchMarketingImages();
  }, [playerData?.name, playerData?.id, portalSettings?.hero_images]);
  
  // Set hasAnimated to true after initial animation completes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      hasAnimated.current = true;
    }, 2000);
    return () => clearTimeout(timer);
  }, []);
  
  // Get current program schedule
  const currentProgram = programs.find(p => p.is_current);
  
  // Find the schedule for a rolling 7-day period starting from today
  const currentSchedule = React.useMemo(() => {
    if (!currentProgram?.weekly_schedules) return null;
    
    const today = new Date();
    
    // Find the schedule that applies to today by checking if today falls within any week
    const matchingSchedule = currentProgram.weekly_schedules.find((schedule: any) => {
      if (!schedule.week_start_date) return false;
      try {
        const weekStart = parseISO(schedule.week_start_date);
        const weekEnd = addDays(weekStart, 6);
        return isWithinInterval(today, { start: weekStart, end: weekEnd });
      } catch {
        return false;
      }
    });
    
    // Fall back to first schedule if no match found
    return matchingSchedule || currentProgram.weekly_schedules[0] || null;
  }, [currentProgram]);
  
  // Create a rolling 7-day array starting from today
  const rolling7Days = React.useMemo(() => {
    const today = new Date();
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(today, i);
      // Get the day name (monday, tuesday, etc.) for mapping to schedule
      const dayName = format(date, 'EEEE').toLowerCase();
      days.push({
        date,
        dayName,
        displayDay: format(date, 'EEE').toUpperCase(), // MON, TUE, etc.
        displayDate: format(date, 'd'),
        isToday: i === 0
      });
    }
    
    return days;
  }, []);

  // Session color mapping
  const getSessionColor = (sessionKey: string) => {
    const key = sessionKey.toUpperCase();
    const colorMap: Record<string, { bg: string; text: string; hover: string }> = {
      'A': { bg: 'hsl(220, 70%, 35%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(220, 70%, 45%)' },
      'B': { bg: 'hsl(140, 50%, 30%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(140, 50%, 40%)' },
      'C': { bg: 'hsl(0, 50%, 35%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(0, 50%, 45%)' },
      'D': { bg: 'hsl(45, 70%, 45%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(45, 70%, 55%)' },
      'E': { bg: 'hsl(70, 20%, 40%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(70, 20%, 50%)' },
      'F': { bg: 'hsl(270, 60%, 40%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(270, 60%, 50%)' },
      'G': { bg: 'hsl(190, 70%, 45%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(190, 70%, 55%)' },
      'H': { bg: 'hsl(30, 80%, 45%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(30, 80%, 55%)' },
      'REST': { bg: 'hsl(0, 0%, 20%)', text: 'hsl(0, 0%, 100%)', hover: 'hsl(0, 0%, 30%)' },
      'MATCH': { bg: 'hsl(43, 49%, 61%)', text: 'hsl(0, 0%, 0%)', hover: 'hsl(43, 49%, 71%)' },
    };
    return colorMap[key] || { bg: 'hsl(0, 0%, 10%)', text: 'hsl(0, 0%, 100%)', hover: 'hsl(0, 0%, 15%)' };
  };

  const getWeekDates = (weekStartDate: string | null) => {
    if (!weekStartDate) return null;
    
    try {
      const startDate = parseISO(weekStartDate);
      return {
        monday: startDate,
        tuesday: addDays(startDate, 1),
        wednesday: addDays(startDate, 2),
        thursday: addDays(startDate, 3),
        friday: addDays(startDate, 4),
        saturday: addDays(startDate, 5),
        sunday: addDays(startDate, 6),
      };
    } catch (error) {
      console.error('Error parsing week start date:', error);
      return null;
    }
  };

  // Prepare R90 chart data - showing opponent and result
  const chartData = analyses
    .filter(a => getEffectiveR90(a) != null)
    .sort((a, b) => new Date(a.analysis_date).getTime() - new Date(b.analysis_date).getTime())
    .slice(-5)
    .map(a => ({
      opponent: a.opponent || "Unknown",
      score: getEffectiveR90(a)!,
      result: a.result || "",
      displayLabel: `${a.opponent || "Unknown"}${a.result ? ` (${a.result})` : ""}`,
      analysisId: a.id,
      minutesPlayed: a.minutes_played,
      strikerStats: a.striker_stats,
      per: (a as any).placeholder_per as number | null,
      sr: (a as any).placeholder_sr as number | null,
    }));

  // Calculate max Y-axis value
  const maxScore = chartData.length > 0 
    ? Math.ceil(Math.max(...chartData.map(d => d.score)))
    : 4;

  // Calculate average score for reference line
  const averageScore = chartData.length > 0
    ? chartData.reduce((sum, d) => sum + d.score, 0) / chartData.length
    : 0;

  // Function to get R90 color based on score - matches Performance Analysis colors
  const getR90Color = (score: number) => {
    if (score < 0) return "hsl(0, 93%, 12%)"; // red-950: Dark red for negative
    if (score >= 0 && score < 0.2) return "hsl(0, 84%, 60%)"; // red-600: Red
    if (score >= 0.2 && score < 0.4) return "hsl(0, 91%, 71%)"; // red-400: Light red
    if (score >= 0.4 && score < 0.6) return "hsl(25, 95%, 37%)"; // orange-700: Orange-brown
    if (score >= 0.6 && score < 0.8) return "hsl(25, 95%, 53%)"; // orange-500: Yellow-orange
    if (score >= 0.8 && score < 1.0) return "hsl(48, 96%, 53%)"; // yellow-400: Yellow
    if (score >= 1.0 && score < 1.4) return "hsl(82, 84%, 67%)"; // lime-400: Light Green
    if (score >= 1.4 && score < 1.8) return "hsl(142, 76%, 36%)"; // green-500: Green
    if (score >= 1.8 && score < 2.5) return "hsl(142, 72%, 29%)"; // green-700: Dark green
    return "hsl(43, 49%, 61%)"; // gold: RISE gold for 2.5+
  };

  // Get latest 5 analyses
  const recentAnalyses = analyses
    .sort((a, b) => new Date(b.analysis_date).getTime() - new Date(a.analysis_date).getTime())
    .slice(0, 5);

  return (
    <>
      {/* Parallax Hero Header with countdown overlay */}
      {(playerData?.image_url || marketingImages.length > 0) && (
        <ParallaxHeroWithFixture
          playerData={playerData}
          marketingImages={marketingImages}
          imageFocalPoints={imageFocalPoints}
          portalLanguage={portalLanguage}
        />
      )}

      <div className="space-y-0 mb-0">
        {/* Gold line above schedule */}
        <div className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw]">
          <div className="border-t-2 border-primary"></div>
        </div>

        {/* Schedule Card - Full Width */}
        <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-0 border-b-0 z-30">
          <CardHeader marble className="py-2">
            <div className="flex items-center justify-between container mx-auto px-4 pr-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <CardTitle className="font-heading tracking-tight ml-[9px] mt-[1px]">{t(portalLanguage, "schedule")}</CardTitle>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onNavigateToSchedule}
                className="flex items-center justify-center gap-1 text-sm text-primary hover:text-black hover:bg-primary h-10"
              >
                {t(portalLanguage, "view_all")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="container mx-auto px-4 pt-3 pb-3">
            {currentSchedule ? (
              <div className="grid grid-cols-8 gap-1 md:gap-2">
                {/* Today Cell */}
                <div 
                  className="p-2 md:p-4 flex flex-col items-center justify-center rounded-lg bg-[hsl(43,49%,61%)] text-black"
                >
                  <div className="text-center">
                    <div className="text-sm md:text-2xl font-bold mb-1">{format(new Date(), 'd')}</div>
                    <div className="text-[8px] md:text-sm font-medium italic">
                      <span className="md:hidden">{t(portalLanguage, "today")}</span>
                      <span className="hidden md:inline">{t(portalLanguage, "today")}</span>
                    </div>
                  </div>
                </div>
              
                {/* Day Cells - Rolling 7 days from today */}
                {rolling7Days.map((dayInfo, index) => {
                  const sessionValue = currentSchedule[dayInfo.dayName] || '';
                  const teamSessionValue = currentSchedule[`${dayInfo.dayName}Team`] || '';
                  const colors = sessionValue ? getSessionColor(sessionValue) : { bg: 'hsl(0, 0%, 10%)', text: 'hsl(0, 0%, 100%)', hover: 'hsl(0, 0%, 15%)' };
                  const dayImageKey = `${dayInfo.dayName}Image`;
                  const clubLogoUrl = currentSchedule[dayImageKey];
                  
                  // Check if it's a clickable session (A-H)
                  const isClickableSession = sessionValue && /^[A-H]$/i.test(sessionValue);
                  
                  return (
                    <button
                      key={index}
                      onClick={() => isClickableSession && onNavigateToSession?.(sessionValue.toUpperCase())}
                      disabled={!isClickableSession}
                      className="relative rounded-lg transition-all flex flex-col min-h-[80px] md:min-h-[100px] disabled:cursor-default overflow-hidden"
                      style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                        cursor: isClickableSession ? 'pointer' : 'default',
                      }}
                    >
                      {/* Top 1/4 - Date */}
                      <div className="h-1/4 flex items-center justify-center px-1 bg-black/20">
                        <div className="text-[8px] md:text-xs font-bold leading-tight">
                          {dayInfo.displayDay} {dayInfo.displayDate}
                        </div>
                      </div>
                      
                      {/* Middle 2/4 - Regular session content */}
                      <div className="h-2/4 flex flex-col items-center justify-center">
                        {clubLogoUrl ? (
                          <img 
                            src={clubLogoUrl} 
                            alt={`${dayInfo.dayName} session`}
                            className="w-6 h-6 md:w-8 md:h-8 object-contain"
                          />
                        ) : sessionValue ? (
                          <div className="text-base md:text-lg font-bold text-center">
                            {sessionValue.toUpperCase()}
                          </div>
                        ) : !teamSessionValue ? (
                          <div className="text-base md:text-lg font-bold text-center opacity-50">-</div>
                        ) : null}
                      </div>
                      
                      {/* Bottom 1/4 - Team training */}
                      <div className="h-1/4 flex items-center justify-center bg-black/30 px-1">
                        {teamSessionValue && (
                          <div className="text-[6px] md:text-[8px] font-bold text-center truncate w-full" style={{ color: 'hsl(45, 100%, 80%)' }}>
                            {teamSessionValue}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t(portalLanguage, "no_active_program_schedule")}</p>
            )}
          </CardContent>
        </Card>

        {/* News Feed / Inbox - directly below schedule */}
        {playerData?.id && (
          <NewsFeed
            playerId={playerData.id}
            playerName={playerData.name || "Player"}
            portalLanguage={portalLanguage}
            onNavigateToAnalysis={onNavigateToAnalysis}
            onOpenReport={(id) => {
              setSelectedReportId(id);
              setReportDialogOpen(true);
            }}
          />
        )}

        {/* R90 Performance Chart & Recent Analysis Combined - Full Width */}
        <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-0 border-t-[2px] border-t-[hsl(43,49%,61%)] z-20 overflow-visible">
          <CardHeader marble className="py-2">
            <div className="flex items-center justify-between container mx-auto px-4 pr-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                <CardTitle className="font-heading tracking-tight ml-[9px] mt-[1px]">{t(portalLanguage, "form")}</CardTitle>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onNavigateToForm || onNavigateToAnalysis}
                className="flex items-center justify-center gap-1 text-sm text-primary hover:text-black hover:bg-primary h-10"
              >
                {t(portalLanguage, "view_all")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 pb-0">
            {chartData.length > 0 ? (
              <div ref={chartRef} className="w-full" style={{ height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 40, bottom: 0, left: 0, right: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="opponent"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      height={60}
                      interval={0}
                      tick={(props) => {
                        const { x, y, payload } = props;
                        const data = chartData.find(d => d.opponent === payload.value);
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text 
                              x={0} 
                              y={0} 
                              dy={16} 
                              textAnchor="middle" 
                              fill="white"
                              fontSize={12}
                              fontWeight="bold"
                            >
                              {data?.result || ''}
                            </text>
                          </g>
                        );
                      }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      domain={[0, maxScore]}
                      ticks={Array.from({ length: maxScore + 1 }, (_, i) => i)}
                      width={30}
                    />
                    <Tooltip 
                      content={<CustomTooltip />}
                      cursor={{ fill: 'hsl(var(--accent))', opacity: 0.3 }}
                      wrapperStyle={{ pointerEvents: 'auto' }}
                    />
                    <defs>
                      {chartData.map((entry, index) => {
                        const baseColor = getR90Color(entry.score);
                        // Parse HSL color to manipulate it
                        const hslMatch = baseColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
                        if (hslMatch) {
                          const [, h, s, l] = hslMatch;
                          const lightness = parseInt(l);
                          return (
                            <linearGradient key={`gradient-${index}`} id={`barGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={`hsl(${h}, ${s}%, ${Math.min(lightness + 20, 90)}%)`} />
                              <stop offset="25%" stopColor={`hsl(${h}, ${s}%, ${Math.min(lightness + 10, 85)}%)`} />
                              <stop offset="75%" stopColor={baseColor} />
                              <stop offset="100%" stopColor={`hsl(${h}, ${s}%, ${Math.max(lightness - 15, 5)}%)`} />
                            </linearGradient>
                          );
                        }
                        return null;
                      })}
                    </defs>
                    <Bar
                      dataKey="score" 
                      radius={[8, 8, 0, 0]}
                      isAnimationActive={false}
                      animationBegin={0}
                      animationDuration={1400}
                      animationEasing="ease-in-out"
                      onMouseEnter={() => setTooltipVisible(true)}
                      background={(props: any) => {
                        const { x, y, width, height } = props;
                        // Calculate the Y position for the average line
                        const chartHeight = height;
                        const yScale = chartHeight / maxScore;
                        const lineY = y + chartHeight - (averageScore * yScale);
                        
                        return (
                          <g>
                            <line
                              x1={x}
                              y1={lineY}
                              x2={x + width}
                              y2={lineY}
                              stroke="hsl(43, 49%, 61%)"
                              strokeWidth={1.5}
                              strokeDasharray="4 4"
                              opacity={0.6}
                            />
                          </g>
                        );
                      }}
                    >
                      {chartData.map((entry, index) => {
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={`url(#barGradient-${index})`}
                            style={{
                              animation: !hasAnimated.current ? `barSlideUp 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.25}s both` : 'none',
                              filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2))'
                            }}
                          />
                        );
                      })}
                      <LabelList 
                        dataKey="score" 
                        position="center"
                        content={(props: any) => {
                          const { x, y, width, height, value, index } = props;
                          if (!x || !y || !width || !height || value === undefined) return null;
                          const delay = index * 0.25;
                          const display = typeof value === "number" ? value.toFixed(2) : value;
                          return (
                            <text
                              x={x + width / 2}
                              y={y + height / 2}
                              fill="#ffffff"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontSize="16"
                              fontWeight="700"
                              style={{
                                opacity: 1,
                                animation: !hasAnimated.current ? `labelFadeIn 0.6s ease-out ${delay + 0.8}s forwards` : 'none'
                              }}
                            >
                              {display}
                            </text>
                          );
                        }}
                      />
                      <LabelList 
                        dataKey="score" 
                        position="top"
                        content={(props: any) => {
                          const { x, y, width, value, index } = props;
                          if (!x || y === undefined || !width || value === undefined) return null;
                          const delay = index * 0.25;
                          const gradeInfo = getR90Grade(value);
                          return (
                            <text
                              x={x + width / 2}
                              y={y - 5}
                              fill={gradeInfo.color}
                              textAnchor="middle"
                              dominantBaseline="baseline"
                              fontSize="18"
                              fontWeight="700"
                              style={{
                                opacity: 1,
                                animation: !hasAnimated.current ? `labelFadeIn 0.6s ease-out ${delay + 0.8}s forwards` : 'none'
                              }}
                            >
                              {gradeInfo.grade}
                            </text>
                          );
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t(portalLanguage, "no_data_available")}</p>
            )}
          </CardContent>
        </Card>

        {/* Performance Section - Recent Fixtures - Full Width */}
        {recentAnalyses.length > 0 && (
          <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0 z-10">
            <CardHeader marble className="py-2">
              <div className="flex items-center justify-between container mx-auto px-4 pr-6">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 mt-[1px]" />
                  <CardTitle className="font-heading tracking-tight ml-[9px]">{t(portalLanguage, "performance")}</CardTitle>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={onNavigateToAnalysis}
                  className="flex items-center justify-center gap-1 text-sm text-primary hover:text-black hover:bg-primary h-10"
                >
                  {t(portalLanguage, "view_all")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="container mx-auto px-4 pt-3 pb-2">
              <div className="space-y-3">
                {recentAnalyses.map((analysis) => (
                  <button
                    key={analysis.id}
                    onClick={() => {
                      setSelectedReportId(analysis.id);
                      setReportDialogOpen(true);
                    }}
                    className="w-full text-left block border-l-2 border-primary pl-3 pt-0 pb-2 hover:bg-accent/5 transition-colors rounded"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{analysis.opponent}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(new Date(analysis.analysis_date), portalLanguage, { month: "short", day: "2-digit", year: "numeric" })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Pre-match analysis button from tagged data */}
                        {(() => {
                          const preMatch = (analysis as any).analysis_writer_data?.analysis_type === 'pre-match' 
                            ? (analysis as any).analysis_writer_data 
                            : (analysis as any).tagged_analyses?.find((ta: any) => ta.analysis_type === 'pre-match');
                          if (!preMatch) return null;
                          return (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-0 h-8 w-auto px-2 bg-black text-white border border-white hover:bg-primary hover:text-black rounded font-bold text-[10px] flex items-center gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                const slug = createAnalysisSlug(preMatch.home_team || '', preMatch.away_team || '', preMatch.id);
                                navigate(slug);
                              }}
                              title="View Pre-Match Analysis"
                            >
                              <Eye className="h-3 w-3" />
                              PRE
                            </Button>
                          );
                        })()}
                        {/* Post-match analysis button - from fixture link or tagged data */}
                        {(() => {
                          // Check fixture-linked post-match first
                          if (postMatchAnalyses.has((analysis as any).fixture_id)) {
                            const postMatch = postMatchAnalyses.get((analysis as any).fixture_id)!;
                            return (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-0 h-8 w-auto px-2 bg-black text-white border border-white hover:bg-primary hover:text-black rounded font-bold text-[10px] flex items-center gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const slug = createAnalysisSlug(postMatch.homeTeam, postMatch.awayTeam, postMatch.id);
                                  navigate(slug);
                                }}
                                title="View Post-Match Analysis"
                              >
                                 <Eye className="h-3 w-3" />
                                 {t(portalLanguage, "post_match_short")}
                               </Button>
                            );
                          }
                          // Check tagged post-match
                          const postMatch = (analysis as any).analysis_writer_data?.analysis_type === 'post-match'
                            ? (analysis as any).analysis_writer_data
                            : (analysis as any).tagged_analyses?.find((ta: any) => ta.analysis_type === 'post-match');
                          if (!postMatch) return null;
                          return (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-0 h-8 w-auto px-2 bg-black text-white border border-white hover:bg-primary hover:text-black rounded font-bold text-[10px] flex items-center gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                const slug = createAnalysisSlug(postMatch.home_team || '', postMatch.away_team || '', postMatch.id);
                                navigate(slug);
                              }}
                              title="View Post-Match Analysis"
                            >
                               <Eye className="h-3 w-3" />
                               {t(portalLanguage, "post_match_short")}
                             </Button>
                          );
                        })()}
                        {/* Full Game Clips button */}
                        {isPlayableReport(analysis) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-8 w-8 bg-black text-[hsl(43,49%,61%)] border border-[hsl(43,49%,61%)] hover:bg-[hsl(43,49%,61%)] hover:text-black rounded flex items-center justify-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClipsClick(analysis);
                            }}
                            title="Watch Full Game Clips"
                          >
                            <Play className="h-4 w-4 fill-current" />
                          </Button>
                        )}
                        {(() => {
                          const isDraft = String(analysis.visibility_status || "").toLowerCase() === "draft";
                          const isClipped = String(analysis.visibility_status || "").toLowerCase() === "clipped";
                          const effectiveR90 = getEffectiveR90(analysis);
                          if (isDraft) {
                            return (
                              <div className="px-3 py-1 rounded text-white/60 text-sm font-bold bg-zinc-700 border-2 border-zinc-600">
                                R90: ?
                              </div>
                            );
                          }
                          if (isClipped) {
                            return (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleClipsClick(analysis); }}
                                className="px-3 py-1 rounded text-white/60 text-sm font-bold bg-zinc-700 border-2 border-zinc-600 hover:border-primary/60 transition-colors cursor-pointer"
                                title="Click to view clips"
                              >
                                R90: ?
                              </button>
                            );
                          }
                          return effectiveR90 != null ? (
                            <button 
                              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!isPlayableReport(analysis)) return;
                setSelectedReportId(analysis.id);
                setReportDialogOpen(true);
              }}
                              className="px-3 py-1 rounded text-white text-sm font-bold border-2 border-transparent hover:border-[hsl(var(--gold))] transition-colors duration-200 disabled:pointer-events-none"
                              style={{ backgroundColor: getR90Color(effectiveR90) }}
                              disabled={!isPlayableReport(analysis)}
                            >
                              R90: {effectiveR90.toFixed(2)}
                            </button>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Performance Report Dialog */}
      <PerformanceReportDialog 
        open={reportDialogOpen} 
        onOpenChange={setReportDialogOpen}
        analysisId={selectedReportId}
        isPortalView={true}
      />

      {/* News Feed moved to below schedule */}

      {/* Quick Stats Comparison - Penultimate section */}
      {playerData?.id && (
        <QuickStatsComparison
          playerId={playerData.id}
          playerName={playerData.name || "You"}
          playerPosition={playerData.position || "CF"}
          analyses={analyses}
          onSeeAll={onNavigateToComparisons || onNavigateToAnalysis}
          portalLanguage={portalLanguage}
        />
      )}

      {/* Long-Term Vision - sits between Comparisons and the Daily Aphorism */}
      <LongTermVisionSection
        skillset={portalSettings?.vision_skillset}
        per90Targets={portalSettings?.vision_per90_targets}
        roadmap={portalSettings?.vision_roadmap}
        playersToWatch={portalSettings?.vision_players_to_watch}
      />

      {/* Gold Separator Line */}
      {dailyAphorism && (portalSettings?.show_aphorisms !== false) && (
        <div className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw]">
          <div className="border-t-2 border-gold"></div>
        </div>
      )}

      {/* Daily Aphorism - respects portal settings */}
      {dailyAphorism && (portalSettings?.show_aphorisms !== false) && (
        <div className="px-4 md:px-0 mt-[10px]">
          <Card className="relative overflow-hidden border-gold bg-gold/30">
            <CardContent className="relative py-3 px-3 text-center space-y-3">
              <div className="bg-black/90 backdrop-blur-sm p-3 rounded-lg inline-block">
                 <p className="text-[10px] uppercase tracking-wide text-gold/80 mb-2">{t(portalLanguage, "aphorism_of_the_day")}</p>
                 <p className="text-base md:text-xl font-bold text-gold leading-relaxed tracking-wide">
                   {trAphorism(dailyAphorism.featured_text)}
                 </p>
              </div>
              {dailyAphorism.author && (
                <div className="bg-black/90 backdrop-blur-sm px-4 py-2 rounded-lg inline-block">
                  <p className="text-xs md:text-sm text-gold/80 italic font-medium">
                    — {dailyAphorism.author}
                  </p>
                </div>
              )}
              {dailyAphorism.body_text && (
                <div className="bg-black/90 backdrop-blur-sm p-3 rounded-lg max-w-2xl mx-auto">
                  <p className="text-sm md:text-base text-white/90 leading-relaxed">
                    {trAphorism(dailyAphorism.body_text)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {clippedAnalysis && (
        <MatchClipPlayer
          analysisId={clippedAnalysis.id}
          playerName={playerData?.name || "Player"}
          opponent={clippedAnalysis.opponent || "Unknown"}
          onClose={() => setClippedAnalysis(null)}
          enableAnnotations={false}
          playerId={playerData?.id || null}
        />
      )}
    </>
  );
};
