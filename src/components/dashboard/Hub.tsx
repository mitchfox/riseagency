import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, ArrowRight, Trophy } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, addDays } from "date-fns";
import { Link } from "react-router-dom";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import Fade from "embla-carousel-fade";
import { supabase } from "@/integrations/supabase/client";
import { getR90Grade } from "@/lib/gradeCalculations";

interface PlayerProgram {
  id: string;
  program_name: string;
  weekly_schedules: any;
  is_current: boolean;
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
  onNavigateToAnalysis: () => void;
  onNavigateToForm?: () => void;
  onNavigateToSession?: (sessionKey: string) => void;
}

export const Hub = ({ programs, analyses, playerData, onNavigateToAnalysis, onNavigateToForm, onNavigateToSession }: HubProps) => {
  const [marketingImages, setMarketingImages] = React.useState<string[]>([]);
  
  // Fetch marketing gallery images for this player
  React.useEffect(() => {
    const fetchMarketingImages = async () => {
      if (!playerData?.name) return;
      
      const { data, error } = await supabase
        .from('marketing_gallery')
        .select('file_url')
        .eq('category', 'players')
        .eq('file_type', 'image')
        .ilike('title', `%${playerData.name}%`)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        console.log('Marketing images fetched:', data);
        setMarketingImages(data.map(img => img.file_url));
      } else if (error) {
        console.error('Error fetching marketing images:', error);
      }
    };
    
    fetchMarketingImages();
  }, [playerData?.name]);
  
  // Get current program schedule
  const currentProgram = programs.find(p => p.is_current);
  
  // Find the schedule for the current week
  const currentSchedule = React.useMemo(() => {
    if (!currentProgram?.weekly_schedules) return null;
    
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const currentWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
    
    // Find schedule where week_start_date is within current week
    const matchingSchedule = currentProgram.weekly_schedules.find((schedule: any) => {
      if (!schedule.week_start_date) return false;
      try {
        const weekStart = parseISO(schedule.week_start_date);
        return isWithinInterval(weekStart, { start: currentWeekStart, end: currentWeekEnd });
      } catch {
        return false;
      }
    });
    
    // Fall back to first schedule if no match found
    return matchingSchedule || currentProgram.weekly_schedules[0] || null;
  }, [currentProgram]);

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
    .slice(-8)
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

  // Get latest 3 analyses
  const recentAnalyses = analyses
    .sort((a, b) => new Date(b.analysis_date).getTime() - new Date(a.analysis_date).getTime())
    .slice(0, 3);

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
    
    // Fallback to player image if no video thumbnails
    if (thumbnails.length === 0 && playerData?.image_url) {
      thumbnails.push(playerData.image_url);
    }
    
    console.log('Video thumbnails generated:', thumbnails.length, thumbnails);
    return thumbnails;
  }, [playerData, marketingImages]);

  const autoplayPlugin = React.useRef(
    Autoplay({ 
      delay: 15000, 
      stopOnInteraction: false, 
      stopOnMouseEnter: false,
      stopOnFocusIn: false
    })
  );
  
  const fadePlugin = React.useRef(Fade());

  return (
    <>
      <div className="space-y-0 mb-[28px]">
        {/* Schedule Card - Full Width */}
        <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0 z-30">
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
                {/* Week Cell */}
                <div 
                  className="p-2 md:p-4 flex flex-col items-center justify-center rounded-lg"
                  style={{ 
                    backgroundColor: currentSchedule.week_start_date && (() => {
                      const weekStart = parseISO(currentSchedule.week_start_date);
                      const today = new Date();
                      const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
                      const currentWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
                      const isCurrentWeek = isWithinInterval(weekStart, { start: currentWeekStart, end: currentWeekEnd });
                      return isCurrentWeek ? 'hsl(43, 49%, 61%)' : 'hsl(0, 0%, 95%)';
                    })() || 'hsl(0, 0%, 95%)',
                    color: 'hsl(0, 0%, 0%)'
                  }}
                >
                  {currentSchedule.week_start_date ? (() => {
                    const date = parseISO(currentSchedule.week_start_date);
                    const day = format(date, 'd');
                    const suffix = day.endsWith('1') && day !== '11' ? 'st' :
                                  day.endsWith('2') && day !== '12' ? 'nd' :
                                  day.endsWith('3') && day !== '13' ? 'rd' : 'th';
                    return (
                      <div className="text-center">
                        <div className="text-sm md:text-2xl font-bold mb-1">{day}<sup className="text-[8px] md:text-sm">{suffix}</sup></div>
                        <div className="text-[8px] md:text-sm font-medium italic">
                          <span className="md:hidden">{format(date, 'MMM')}</span>
                          <span className="hidden md:inline">{format(date, 'MMMM')}</span>
                        </div>
                      </div>
                    );
                  })() : <span className="text-xs md:text-sm">{currentSchedule.week || 'W'}</span>}
                </div>
              
                {/* Day Cells */}
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                  const sessionValue = currentSchedule[day] || '';
                  const colors = sessionValue ? getSessionColor(sessionValue) : { bg: 'hsl(0, 0%, 10%)', text: 'hsl(0, 0%, 100%)', hover: 'hsl(0, 0%, 15%)' };
                  const weekDates = getWeekDates(currentSchedule.week_start_date);
                  const dayDate = weekDates ? weekDates[day as keyof typeof weekDates] : null;
                  const dayImageKey = `${day}Image`;
                  const clubLogoUrl = currentSchedule[dayImageKey];
                  
                  // Check if it's a clickable session (A-H)
                  const isClickableSession = sessionValue && /^[A-H]$/i.test(sessionValue);
                  
                  return (
                    <button
                      key={day}
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
                        {day.slice(0, 3)}
                      </div>
                      {dayDate && (
                        <div className="text-[10px] md:text-sm font-bold mb-1">
                          {format(dayDate, 'd')}
                        </div>
                      )}
                      {clubLogoUrl && (
                        <img 
                          src={clubLogoUrl} 
                          alt={`${day} opponent`}
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

        {/* Video/Image Carousel - Full Width */}
        {videoThumbnails.length > 0 && (
          <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-[2px] border-b-[hsl(43,49%,61%)] z-25 !mt-0 !mb-[13px]">
              <CardContent className="p-0 overflow-hidden">
              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                }}
                plugins={[autoplayPlugin.current, fadePlugin.current]}
                className="w-full"
              >
                <CarouselContent>
                  {videoThumbnails.map((thumbnail, index) => (
                    <CarouselItem key={index}>
                      <div className="relative w-full -mt-2" style={{ aspectRatio: '21/9' }}>
                        {thumbnail.includes('supabase') && thumbnail.includes('videos') ? (
                          <video
                            src={thumbnail}
                            className="w-full h-full object-cover"
                            autoPlay
                            muted
                            loop
                            playsInline
                          />
                        ) : (
                          <img
                            src={thumbnail}
                            alt={`Player content ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </CardContent>
          </Card>
        )}

        {/* R90 Performance Chart & Recent Analysis Combined - Full Width */}
        <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0 z-20 overflow-visible">
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
          <CardContent className="pb-6">
            {chartData.length > 0 ? (
              <div className="w-full mt-[60px]" style={{ height: '152px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="opponent"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      height={160}
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
                      width={40}
                    />
                    <Tooltip 
                      labelFormatter={() => ""}
                      separator=""
                      contentStyle={{
                        backgroundColor: "#000000",
                        border: "2px solid hsl(43, 49%, 61%)",
                        borderRadius: "8px",
                        padding: "12px",
                        color: "#ffffff"
                      }}
                      itemStyle={{
                        color: "#ffffff"
                      }}
                      formatter={(value: any, name: any, props: any) => {
                        const data = props.payload;
                        const stats = data.strikerStats;
                        return [
                          <div key="tooltip" className="space-y-2 min-w-[200px]">
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
                          </div>,
                          ""
                        ];
                      }}
                      cursor={{ fill: 'hsl(var(--accent))', opacity: 0.3 }}
                    />
                    <Bar 
                      dataKey="score" 
                      radius={[8, 8, 0, 0]}
                      className="cursor-pointer"
                      onClick={(data: any) => {
                        if (data && data.analysisId) {
                          window.location.href = `/performance-report/match-${data.analysisId}`;
                        }
                      }}
                    >
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={getR90Color(entry.score)}
                          className="hover:opacity-80 transition-opacity"
                        />
                      ))}
                      <LabelList 
                        dataKey="score" 
                        position="top" 
                        offset={8}
                        style={{ fontSize: '14px', fill: 'hsl(var(--foreground))', fontWeight: '700' }}
                        formatter={(value: number) => getR90Grade(value).grade}
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
            <CardContent className="container mx-auto px-4 pt-3 pb-4">
              <div className="space-y-3">
                {recentAnalyses.map((analysis) => (
                  <Link
                    key={analysis.id}
                    to={`/performance-report/match-${analysis.id}`}
                    className="block border-l-2 border-primary pl-3 py-2 hover:bg-accent/5 transition-colors bg-[url('/smudged-marble-header.png')] bg-cover bg-center bg-no-repeat rounded"
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
                          className="px-3 py-1 rounded text-black text-sm font-bold mt-[3px] -ml-1 mr-2"
                          style={{ backgroundColor: getR90Color(analysis.r90_score) }}
                        >
                          R90: {analysis.r90_score}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};
