import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, ArrowRight, Trophy, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, ReferenceLine, Rectangle } from "recharts";
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, addDays } from "date-fns";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getR90Grade } from "@/lib/gradeCalculations";
import { PerformanceReportDialog } from "@/components/PerformanceReportDialog";

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
}

interface HubProps {
  programs: PlayerProgram[];
  analyses: PlayerAnalysis[];
  playerData: any;
  dailyAphorism?: any;
  onNavigateToAnalysis: () => void;
  onNavigateToForm?: () => void;
  onNavigateToSession?: (sessionKey: string) => void;
}

export const Hub = ({ programs, analyses, playerData, dailyAphorism, onNavigateToAnalysis, onNavigateToForm, onNavigateToSession }: HubProps) => {
  const [marketingImages, setMarketingImages] = React.useState<string[]>([]);
  const [imagesPreloaded, setImagesPreloaded] = React.useState(false);
  const hasAnimated = React.useRef(false);
  const chartRef = React.useRef<HTMLDivElement>(null);
  const [tooltipVisible, setTooltipVisible] = React.useState(true);
  const [reportDialogOpen, setReportDialogOpen] = React.useState(false);
  const [selectedReportId, setSelectedReportId] = React.useState<string | null>(null);
  
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
            <div className="text-xs text-white/60">Minutes Played: {data.minutesPlayed}</div>
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
              {stats.xGChain_per90 !== undefined && (
                <div className="text-xs text-white/70">xGChain: {stats.xGChain_per90.toFixed(2)}</div>
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
        </div>
      </div>
    );
  };
  
  // Fetch marketing gallery images for this player
  React.useEffect(() => {
    const fetchMarketingImages = async () => {
      if (!playerData?.name) {
        console.log('No player name available');
        setImagesPreloaded(true); // Allow carousel to check other sources
        return;
      }
      
      console.log('Fetching marketing images for player:', playerData?.id, playerData?.name);
      
      // Fetch images filtered by this specific player's ID
      const { data: images, error } = await supabase
        .from('marketing_gallery')
        .select('file_url')
        .eq('category', 'players')
        .eq('file_type', 'image')
        .eq('player_id', playerData.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching player images:', error, error.message, error.details);
        setImagesPreloaded(true); // Still allow carousel to show
        return;
      }
      
      console.log('Player images from DB:', images?.length, 'URLs:', images?.map(i => i.file_url));
      const imageUrls = images?.map(img => img.file_url) || [];
      
      if (imageUrls.length === 0) {
        console.log('No images to preload');
        setImagesPreloaded(true);
        return;
      }
      
      // Set images immediately so they're available
      setMarketingImages(imageUrls);
      
      // Priority load: Load first 4 images immediately, then show carousel
      const priorityCount = Math.min(4, imageUrls.length);
      const priorityImages = imageUrls.slice(0, priorityCount);
      const remainingImages = imageUrls.slice(priorityCount);
      
      console.log('Priority loading first', priorityCount, 'images');
      
      // Load priority images first
      Promise.all(
        priorityImages.map(url => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              console.log('Priority loaded:', url);
              resolve(url);
            };
            img.onerror = (err) => {
              console.error('Failed to load priority image:', url, err);
              resolve(url); // Resolve anyway to not block
            };
            img.src = url;
          });
        })
      ).then(() => {
        console.log('Priority images loaded, showing carousel');
        setImagesPreloaded(true); // Show carousel now
        
        // Load remaining images in background
        if (remainingImages.length > 0) {
          console.log('Background loading remaining', remainingImages.length, 'images');
          remainingImages.forEach(url => {
            const img = new Image();
            img.onload = () => console.log('Background loaded:', url);
            img.onerror = (err) => console.error('Failed to load background image:', url, err);
            img.src = url;
          });
        }
      }).catch(err => {
        console.error('Error loading priority images:', err);
        setImagesPreloaded(true); // Show anyway
      });
    };
    
    fetchMarketingImages();
  }, [playerData?.name, playerData?.id]);
  
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
    .filter(a => a.r90_score != null)
    .sort((a, b) => new Date(a.analysis_date).getTime() - new Date(b.analysis_date).getTime())
    .slice(-5)
    .map(a => ({
      opponent: a.opponent || "Unknown",
      score: a.r90_score,
      result: a.result || "",
      displayLabel: `${a.opponent || "Unknown"}${a.result ? ` (${a.result})` : ""}`,
      analysisId: a.id,
      minutesPlayed: a.minutes_played,
      strikerStats: a.striker_stats
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

  // Extract video thumbnails from highlights and marketing gallery images
  const videoThumbnails = React.useMemo(() => {
    const thumbnails: string[] = [];
    
    // Add marketing gallery images first
    thumbnails.push(...marketingImages);
    
    if (playerData?.highlights) {
      Object.values(playerData.highlights).forEach((highlight: any) => {
        if (highlight?.clips && Array.isArray(highlight.clips)) {
          highlight.clips.forEach((clip: any) => {
            if (clip?.videoUrl) {
              // Generate thumbnail URL from video URL
              const videoUrl = clip.videoUrl;
              // If it's a Supabase storage URL, we can try to get a frame
              thumbnails.push(videoUrl);
            }
          });
        }
      });
    }
    
    // Filter out videos - only keep images
    const imageOnly = thumbnails.filter(url => !(url.includes('supabase') && url.includes('videos')));
    
    // No fallback - only show 21:9 marketing gallery images
    
    console.log('Image thumbnails generated:', imageOnly.length, imageOnly);
    return imageOnly;
  }, [playerData, marketingImages]);

  return (
    <>
      <div className="space-y-0 mb-0">
        {/* Schedule Card - Full Width */}
        <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-0 border-b-0 z-30">
          <CardHeader marble className="py-2">
            <div className="flex items-center justify-between container mx-auto px-4 pr-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <CardTitle className="font-heading tracking-tight ml-[9px] mt-[1px]">Schedule</CardTitle>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                className="flex items-center justify-center gap-1 text-sm text-primary hover:text-black hover:bg-primary h-10"
              >
                See All
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
                    <div className="text-sm md:text-2xl font-bold mb-1">{format(new Date(), 'd')}<sup className="text-[8px] md:text-sm">th</sup></div>
                    <div className="text-[8px] md:text-sm font-medium italic">
                      <span className="md:hidden">Today</span>
                      <span className="hidden md:inline">Today</span>
                    </div>
                  </div>
                </div>
              
                {/* Day Cells - Rolling 7 days from today */}
                {rolling7Days.map((dayInfo, index) => {
                  const sessionValue = currentSchedule[dayInfo.dayName] || '';
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
                      className="relative p-2 md:p-4 rounded-lg transition-all flex flex-col items-center justify-center min-h-[60px] md:min-h-[80px] disabled:cursor-default"
                      style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                        cursor: isClickableSession ? 'pointer' : 'default',
                      }}
                    >
                      <div className="text-[8px] md:text-xs font-medium mb-1 opacity-70 uppercase">
                        {dayInfo.displayDay}
                      </div>
                      <div className="text-[10px] md:text-sm font-bold mb-1">
                        {dayInfo.displayDate}
                      </div>
                      {clubLogoUrl && (
                        <img 
                          src={clubLogoUrl} 
                          alt={`${dayInfo.dayName} opponent`}
                          className="w-4 h-4 md:w-6 md:h-6 object-contain mb-1"
                        />
                      )}
                      <div className="text-[10px] md:text-sm font-bold text-center">
                        {sessionValue || '-'}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active program schedule</p>
            )}
          </CardContent>
        </Card>

        {/* Video/Image Carousel - Full Width - Always visible */}
        <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-[2px] border-b-[hsl(43,49%,61%)] z-25 !mt-0 !mb-[13px]">
          <CardContent className="p-0 overflow-hidden">
            {!imagesPreloaded || videoThumbnails.length === 0 ? (
              // Loading skeleton - shown while images load
              <div className="infinite-scroll-container">
                <div className="infinite-scroll-content" style={{ animationPlayState: 'paused' }}>
                  {[1, 2, 3].map((index) => (
                    <div key={index} className="inline-block px-2">
                      <div 
                        className="relative bg-muted animate-pulse" 
                        style={{ aspectRatio: '21/9', width: '85vw' }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
                          Loading...
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Actual images - shown when loaded
              <div className="infinite-scroll-container">
                <div className="infinite-scroll-content">
                  {[...videoThumbnails, ...videoThumbnails].map((thumbnail, index) => (
                    <div key={index} className="inline-block px-2">
                      <div className="relative" style={{ aspectRatio: '21/9', width: '85vw' }}>
                        <img
                          src={thumbnail}
                          alt={`Player content ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* R90 Performance Chart & Recent Analysis Combined - Full Width */}
        <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-0 border-t-[2px] border-t-[hsl(43,49%,61%)] z-20 overflow-visible">
          <CardHeader marble className="py-2">
            <div className="flex items-center justify-between container mx-auto px-4 pr-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                <CardTitle className="font-heading tracking-tight ml-[9px] mt-[1px]">Form</CardTitle>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onNavigateToForm || onNavigateToAnalysis}
                className="flex items-center justify-center gap-1 text-sm text-primary hover:text-black hover:bg-primary h-10"
              >
                See All
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
                              {value}
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
              <p className="text-sm text-muted-foreground">No performance data yet</p>
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
                  <CardTitle className="font-heading tracking-tight ml-[9px]">Performance</CardTitle>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={onNavigateToAnalysis}
                  className="flex items-center justify-center gap-1 text-sm text-primary hover:text-black hover:bg-primary h-10"
                >
                  See All
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
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{analysis.opponent}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(analysis.analysis_date), "MMM dd, yyyy")}
                        </div>
                      </div>
                      {analysis.r90_score != null && (
                        <div 
                          className="px-3 py-1 rounded text-white text-sm font-bold mt-[3px] -ml-1 mr-2 border-2 border-transparent hover:border-[hsl(var(--gold))] transition-colors duration-200"
                          style={{ backgroundColor: getR90Color(analysis.r90_score) }}
                        >
                          R90: {analysis.r90_score}
                        </div>
                      )}
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
      />

      {/* Gold Separator Line */}
      {dailyAphorism && (
        <div className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw]">
          <div className="border-t-2 border-gold"></div>
        </div>
      )}

      {/* Daily Aphorism */}
      {dailyAphorism && (
        <div className="px-4 md:px-0 mt-[10px]">
          <Card className="relative overflow-hidden border-gold bg-gold/30">
            <CardContent className="relative py-3 px-3 text-center space-y-3">
              <div className="bg-black/90 backdrop-blur-sm p-3 rounded-lg inline-block">
                <p className="text-base md:text-xl font-bold text-gold leading-relaxed tracking-wide">
                  {dailyAphorism.featured_text}
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
                    {dailyAphorism.body_text}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};
