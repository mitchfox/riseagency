import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useEffect, useRef, useMemo } from "react";
import { HoverText } from "@/components/HoverText";
import { usePlayerProfileLabel, performanceStatTranslations } from "@/hooks/usePlayerTranslations";
import { useLanguage } from "@/contexts/LanguageContext";

interface HighlightedMatchProps {
  highlightedMatch: {
    home_team: string;
    home_team_logo: string;
    away_team: string;
    away_team_logo: string;
    score: string;
    show_score: boolean;
    minutes_played: number;
    match_date: string;
    competition: string;
    selected_stats: string[];
    stats: Record<string, any>;
    video_url: string;
    full_match_url: string;
    r90_report_url: string;
    player_image_url?: string;
    analysis_id?: string;
  };
  onVideoPlayChange?: (isPlaying: boolean) => void;
  onViewReport?: (analysisId: string) => void;
}

const STAT_LABELS: Record<string, string> = {
  goals: "Goals",
  assists: "Assists",
  xG_adj: "xG",
  xA_adj: "xA",
  progressive_passes_adj: "Prog Passes",
  regains_adj: "Regains",
  turnovers_adj: "Turnovers",
  duels_won_adj: "Duels Won",
  aerial_duels_won_adj: "Aerial Duels",
  xGChain: "xG Chain",
  interceptions: "Interceptions",
  crossing_movement_xC: "Crossing xC",
  movement_in_behind_xC: "In Behind xC",
  movement_to_feet_xC: "To Feet xC",
  triple_threat_xC: "Triple Threat xC",
  tackles: "Tackles",
  passes_completed: "Passes",
  shots: "Shots",
  shots_on_target: "On Target",
};

export const HighlightedMatchDisplay = ({ highlightedMatch, onVideoPlayChange, onViewReport }: HighlightedMatchProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  
  // Get translated labels
  const highlightedPerformanceLabel = usePlayerProfileLabel('highlightedPerformance');
  const performanceMetricsLabel = usePlayerProfileLabel('performanceMetrics');
  const readActionReportLabel = usePlayerProfileLabel('readActionReport');
  const watchFullMatchLabel = usePlayerProfileLabel('watchFullMatch');

  // Translate stat labels based on language
  const getTranslatedStatLabel = useMemo(() => {
    return (statKey: string): string => {
      const englishLabel = STAT_LABELS[statKey] || statKey;
      if (language === 'en') return englishLabel;
      return performanceStatTranslations[englishLabel]?.[language] || englishLabel;
    };
  }, [language]);

  const formatStatValue = (value: any): string => {
    if (typeof value === 'number') {
      return value % 1 === 0 ? value.toString() : value.toFixed(1);
    }
    return value?.toString() || "0";
  };

  // Early autoplay once ~10 seconds are buffered
  useEffect(() => {
    if (!videoRef.current || !containerRef.current) return;

    const video = videoRef.current;
    let hasStartedPlaying = false;
    let isVisible = false;

    const tryAutoplay = () => {
      if (hasStartedPlaying || !isVisible) return;
      
      // Check if we have enough buffered data (at least 10 seconds or end of video)
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(0);
        const duration = video.duration || Infinity;
        
        // Start playing if we have 10+ seconds buffered or the whole video
        if (bufferedEnd >= 10 || bufferedEnd >= duration) {
          hasStartedPlaying = true;
          video.play().catch(() => {
            // Autoplay failed, user interaction required
          });
          onVideoPlayChange?.(true);
        }
      }
    };

    const handleProgress = () => tryAutoplay();
    const handleCanPlay = () => tryAutoplay();

    video.addEventListener('progress', handleProgress);
    video.addEventListener('canplay', handleCanPlay);

    // Intersection Observer for visibility-based play/pause
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
          if (entry.isIntersecting) {
            tryAutoplay();
          } else if (video) {
            video.pause();
            onVideoPlayChange?.(false);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [onVideoPlayChange]);

  return (
    <div ref={containerRef} className="mb-10">
      <h2 className="text-3xl font-bebas text-primary uppercase tracking-widest mb-4 flex items-center gap-3">
        <span className="w-12 h-1 bg-primary"></span>
        {highlightedPerformanceLabel}
        <span className="flex-1 h-1 bg-primary/20"></span>
      </h2>
      
      <div className="relative border-2 border-primary/20 rounded-xl overflow-hidden bg-gradient-to-br from-background via-secondary/5 to-background shadow-2xl">
        {/* Decorative Corner Accents */}
        <div className="absolute top-0 left-0 w-20 h-20 border-t-4 border-l-4 border-primary/30 rounded-tl-xl"></div>
        <div className="absolute top-0 right-0 w-20 h-20 border-t-4 border-r-4 border-primary/30 rounded-tr-xl"></div>
        <div className="absolute bottom-0 left-0 w-20 h-20 border-b-4 border-l-4 border-primary/30 rounded-bl-xl"></div>
        <div className="absolute bottom-0 right-0 w-20 h-20 border-b-4 border-r-4 border-primary/30 rounded-br-xl"></div>

        {/* Match Header */}
        <div className="relative bg-gradient-to-r from-secondary/40 via-secondary/30 to-secondary/40 backdrop-blur-sm p-5">
          <div className="flex flex-col items-center gap-3">
            {/* Opposition Display */}
            <div className="flex items-center gap-3">
              {highlightedMatch.away_team_logo && (
                <div className="w-16 h-16 rounded-full bg-background/80 backdrop-blur-sm p-2.5 border-2 border-primary/20 shadow-lg">
                  <img 
                    src={highlightedMatch.away_team_logo} 
                    alt={highlightedMatch.away_team}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div className="text-center">
                <div className="text-4xl font-bebas text-foreground uppercase tracking-wider flex items-center gap-3">
                  <span className="text-primary/60">VS</span>
                  <span>{highlightedMatch.away_team || "Opposition"}</span>
                </div>
                {highlightedMatch.show_score && highlightedMatch.score && (
                  <div className="text-xl font-bebas text-primary mt-1">
                    {highlightedMatch.score}
                  </div>
                )}
              </div>
            </div>

            {/* Match Info */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground uppercase tracking-widest font-semibold">
              {highlightedMatch.competition && (
                <>
                  <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                    {highlightedMatch.competition}
                  </span>
                  <span className="text-primary/40">•</span>
                </>
              )}
              <span>{new Date(highlightedMatch.match_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span className="text-primary/40">•</span>
              <span>{highlightedMatch.minutes_played} mins</span>
            </div>
          </div>
        </div>

        {/* Key Stats */}
        {highlightedMatch.selected_stats && highlightedMatch.selected_stats.length > 0 && (
          <div className="bg-gradient-to-br from-background/50 via-background to-background/50 p-5 border-y border-primary/10">
            <h3 className="text-lg font-bebas text-primary uppercase tracking-widest mb-4 text-center">{performanceMetricsLabel}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {highlightedMatch.selected_stats.map((statKey) => (
                <div key={statKey} className="relative group">
                  <div className="bg-gradient-to-br from-secondary/30 to-secondary/10 backdrop-blur-sm rounded-lg p-4 border border-primary/10 hover:border-primary/30 transition-all hover:shadow-lg hover:scale-105">
                    <div className="text-4xl font-bebas text-primary mb-1 text-center">
                      {formatStatValue(highlightedMatch.stats[statKey])}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider text-center font-semibold">
                      {getTranslatedStatLabel(statKey)}
                    </div>
                  </div>
                  {/* Subtle glow effect on hover */}
                  <div className="absolute inset-0 bg-primary/5 rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {(highlightedMatch.full_match_url || highlightedMatch.analysis_id) && (
          <div className="bg-gradient-to-r from-secondary/20 via-secondary/10 to-secondary/20 p-5 border-y border-primary/10">
            <div className="flex flex-wrap gap-3 justify-center">
              {highlightedMatch.analysis_id && onViewReport && (
                <Button
                  onClick={() => onViewReport(highlightedMatch.analysis_id!)}
                  size="lg"
                  className="btn-shine font-bebas uppercase tracking-wider text-base bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all"
                >
                  <ExternalLink className="h-5 w-5 mr-2" />
                  <HoverText text={readActionReportLabel} />
                </Button>
              )}
              {highlightedMatch.full_match_url && (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="btn-shine font-bebas uppercase tracking-wider text-base border-primary/40 text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                >
                  <a 
                    href={highlightedMatch.full_match_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-5 w-5" />
                    <HoverText text={watchFullMatchLabel} />
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Video */}
        {highlightedMatch.video_url && (
           <div className="bg-black p-5">
             <div className="aspect-video w-full rounded-lg overflow-hidden shadow-2xl border-2 border-primary/20">
               <video 
                 ref={videoRef}
                 src={`${highlightedMatch.video_url}#t=0.001`}
                 controls
                 className="w-full h-full"
                 playsInline
                 preload="auto"
               >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};