import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { players } from "@/data/players";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, MessageCircle, ExternalLink, Video, ChevronLeft, ChevronRight } from "lucide-react";
import { FormationDisplay } from "@/components/FormationDisplay";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { parsePlayerBio, parsePlayerHighlights } from "@/lib/playerDataParser";
import { LazyVideo } from "@/components/LazyVideo";
import { HighlightedMatchDisplay } from "@/components/HighlightedMatchDisplay";
import { PlayerStickyHeader } from "@/components/PlayerStickyHeader";
import blackMarbleBg from "@/assets/black-marble-menu.png";

const PlayerDetail = () => {
  const { playername } = useParams<{ playername: string }>();
  const navigate = useNavigate();
  const [currentFormationIndex, setCurrentFormationIndex] = useState(0);
  const [currentVideoType, setCurrentVideoType] = useState<'season' | number>(0);
  const [dbHighlights, setDbHighlights] = useState<any[]>([]);
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bioDialogOpen, setBioDialogOpen] = useState(false);
  const [isPlayerInfoSticky, setIsPlayerInfoSticky] = useState(false);
  const [showPlayerStickyHeader, setShowPlayerStickyHeader] = useState(false);
  const [performanceReports, setPerformanceReports] = useState<any[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerInfoSentinelRef = useRef<HTMLDivElement>(null);
  
  // Check if opened in modal
  const isModal = new URLSearchParams(window.location.search).get('modal') === 'true';
  
  // Fetch player from database
  useEffect(() => {
    if (playername) {
      const fetchPlayer = async () => {
        try {
          // Convert slug back to searchable format (replace hyphens with spaces)
          const searchName = playername.replace(/-/g, ' ');
          
          const { data, error } = await supabase
            .from('players')
            .select('*')
            .ilike('name', searchName)
            .single();
          
          if (error) throw error;
          
          if (data) {
            // Fetch player stats
            const { data: statsData } = await supabase
              .from('player_stats')
              .select('*')
              .eq('player_id', data.id)
              .single();
            
            // Fetch performance reports
            const { data: analysisData } = await supabase
              .from('player_analysis')
              .select('*')
              .eq('player_id', data.id)
              .order('analysis_date', { ascending: false });
            
            setPerformanceReports(analysisData || []);
            
            // Use optimized parsers
            const bioData = parsePlayerBio(data.bio);
            const highlights = parsePlayerHighlights(data.highlights);
            
            // Extract bio text
            let bioText = '';
            if (data.bio) {
              try {
                const parsed = JSON.parse(data.bio);
                bioText = parsed.bio || parsed.text || '';
                // Handle nested bio
                if (bioText && bioText.startsWith('{')) {
                  const innerBio = JSON.parse(bioText);
                  bioText = innerBio.text || innerBio.bio || bioText;
                }
              } catch {
                bioText = typeof data.bio === 'string' ? data.bio : '';
              }
            }
            
            setPlayer({
              ...data,
              ...bioData,
              bio: bioText,
              highlightsArray: highlights,
              links: (Array.isArray(data.links) && data.links.length > 0) ? data.links : (bioData.externalLinks || []),
              stats: statsData ? {
                goals: statsData.goals || 0,
                assists: statsData.assists || 0,
                matches: statsData.matches || 0,
                minutes: statsData.minutes || 0,
                cleanSheets: statsData.clean_sheets,
                saves: statsData.saves
              } : {}
            });
            setDbHighlights(highlights);
          }
        } catch (error) {
          console.error("Error fetching player:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchPlayer();
    }
  }, [playername]);

  // Scroll-based sticky behavior for player info and headers
  useEffect(() => {
    const handleScroll = () => {
      if (!playerInfoSentinelRef.current) return;
      const rect = playerInfoSentinelRef.current.getBoundingClientRect();
      const headerOffset = 80; // approximate combined height of headers
      const headerFadeOffset = headerOffset + 50; // player sticky header comes in 50px later
      
      setIsPlayerInfoSticky(rect.top <= headerOffset);
      setShowPlayerStickyHeader(rect.top <= -50); // 50px extra scroll before showing
    };

    // Run once on mount to set initial state
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true } as AddEventListenerOptions);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-rotate tactical formations every 5 seconds
  useEffect(() => {
    if (player?.tacticalFormations && player.tacticalFormations.length > 0) {
      const interval = setInterval(() => {
        setCurrentFormationIndex((prev) => 
          (prev + 1) % player.tacticalFormations!.length
        );
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [player]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {!isModal && <Header />}
        <div className="flex-shrink-0 text-center py-16">
          <h1 className="text-2xl font-bold text-foreground">Loading player...</h1>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-shrink-0 text-center py-8">
        <h1 className="text-4xl font-bold text-foreground mb-4">Player Not Found</h1>
        <Button onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Directory
        </Button>
      </div>
    </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{player.name} | RISE Football Agency</title>
        {player.representation_status !== 'represented' && (
          <meta name="robots" content="noindex, nofollow" />
        )}
      </Helmet>
      
      {!isModal && <Header shouldFade={isPlayerInfoSticky} />}
      
      {/* Sticky Player Header - Shows when scrolling */}
      {!isModal && player && (
        <PlayerStickyHeader 
          playerName={player.name}
          whatsapp={player.whatsapp}
          isVisible={showPlayerStickyHeader}
        />
      )}
      
      <ErrorBoundary>
        <div className={`min-h-screen bg-background ${!isModal ? 'pt-16' : ''} overflow-x-hidden`}>
          
          <main className="container mx-auto px-4 py-2 touch-pan-y">
          {/* Back Button */}
          {!isModal && (
            <div className="mb-2">
              <Button
                onClick={() => navigate("/stars")}
                variant="outline"
                size="sm"
                className="group font-bebas uppercase tracking-wider border-primary/30 bg-background/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                Back to Stars
              </Button>
            </div>
          )}

          {/* Sentinel element to trigger sticky behavior */}
          <div ref={playerInfoSentinelRef} className="h-px" />

          {/* Player Name, Info, and Contact - Full width */}
          <div 
            className={`mb-1 relative border-2 border-[hsl(var(--gold))] backdrop-blur-sm rounded-lg overflow-hidden transition-all duration-300 ${
              isPlayerInfoSticky 
                ? 'sticky top-0 z-[100] shadow-xl bg-secondary/95' 
                : 'bg-secondary/20'
            }`}
          >
            <div className="relative p-4 md:p-5">
              {/* Info Row - Wraps when needed */}
              <div className="flex flex-wrap items-center gap-4 md:gap-6 lg:gap-8">
                {/* Player Name with Golden Gloss */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--gold))]/20 via-[hsl(var(--gold))]/10 to-transparent blur-xl" />
                  <h1 className="relative text-2xl md:text-3xl font-bebas uppercase font-bold text-foreground leading-none tracking-wide whitespace-nowrap">
                    {player.name}
                  </h1>
                </div>
                
                <p className="text-lg md:text-xl text-muted-foreground uppercase tracking-wide font-bebas leading-none whitespace-nowrap">
                  {player.position}
                </p>
                
                <p className="text-lg md:text-xl text-muted-foreground uppercase tracking-wide font-bebas leading-none flex items-center gap-2 whitespace-nowrap">
                  {player.dateOfBirth} <span className="text-muted-foreground/70">({player.age})</span>
                </p>
                
                <p className="text-lg md:text-xl text-muted-foreground uppercase tracking-wide font-bebas leading-none flex items-center gap-2 whitespace-nowrap">
                  <img 
                    src={getCountryFlagUrl(player.nationality)} 
                    alt={player.nationality}
                    className="w-6 h-4 object-cover rounded"
                  />
                  {player.nationality}
                </p>
                
                <p className="text-lg md:text-xl text-muted-foreground uppercase tracking-wide font-bebas leading-none flex items-center gap-2 whitespace-nowrap">
                  <img 
                    src={player.currentClubLogo || player.tacticalFormations?.[0]?.clubLogo} 
                    alt={player.currentClub}
                    className="w-6 h-6 md:w-8 md:h-8 object-contain"
                  />
                  {player.currentClub}
                </p>
              </div>
            </div>
          </div>

          {/* Highlights Video - Full Width 16:9 with Club Logo Overlays */}
          <div className="mb-8">
            <div className="relative aspect-video bg-secondary/30 rounded-lg overflow-hidden border-4 md:border-[6px] border-[hsl(var(--gold))]">
              {dbHighlights.length > 0 && typeof currentVideoType === 'number' && dbHighlights[currentVideoType]?.videoUrl ? (
                <>
                  <LazyVideo 
                    ref={videoRef}
                    key={dbHighlights[currentVideoType].videoUrl}
                    className="w-full h-full object-contain bg-black"
                    controls
                    playsInline
                    preload="metadata"
                    loop={false}
                    src={dbHighlights[currentVideoType].videoUrl}
                    onError={(e) => {
                      console.error('Video error:', e);
                      console.log('Video URL:', dbHighlights[currentVideoType].videoUrl);
                    }}
                    onLoadStart={() => console.log('Video loading started')}
                    onLoadedData={() => {
                      console.log('Video loaded successfully');
                    }}
                    onEnded={() => {
                      console.log('Video ended, current index:', currentVideoType, 'total videos:', dbHighlights.length);
                      // Auto-play next video when current one ends
                      if (typeof currentVideoType === 'number') {
                        const nextIndex = currentVideoType + 1;
                        if (nextIndex < dbHighlights.length) {
                          console.log('Moving to next video:', nextIndex);
                          setCurrentVideoType(nextIndex);
                        } else {
                          console.log('Last video finished, looping to first');
                          setCurrentVideoType(0);
                        }
                      }
                    }}
                  >
                    Your browser does not support the video tag.
                  </LazyVideo>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4">
                  <Video className="w-12 h-12 md:w-16 md:h-16 text-primary" />
                  <p className="text-foreground/60 font-bebas text-lg md:text-xl uppercase tracking-wider text-center">
                    {dbHighlights.length > 0 && typeof currentVideoType === 'number' && dbHighlights[currentVideoType]?.name
                      ? dbHighlights[currentVideoType].name
                      : 'Highlights'}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Coming Soon
                  </p>
                </div>
              )}
              
              {/* Club Logo Overlays - Top - Show database highlights with horizontal scroll */}
              {dbHighlights.length > 0 && (
                <div className="absolute bottom-[23px] md:bottom-[39px] left-1/2 -translate-x-1/2 z-10 w-full px-2 pointer-events-none">
                  <div className="relative flex items-center justify-center gap-2">
                    {dbHighlights.length > 10 && (
                      <button
                        onClick={() => {
                          const container = document.getElementById('club-logos-container');
                          if (container) {
                            container.scrollBy({ left: -200, behavior: 'smooth' });
                          }
                        }}
                        className="pointer-events-auto flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--gold))]/20 hover:bg-[hsl(var(--gold))]/30 border border-[hsl(var(--gold))]/40 flex items-center justify-center text-foreground transition-colors"
                        aria-label="Scroll left"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                    )}
                    <div 
                      id="club-logos-container"
                      className="flex gap-1 md:gap-2 overflow-x-auto scrollbar-hide scroll-smooth max-w-[calc(100%-80px)] pointer-events-auto"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      {dbHighlights.map((highlight, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentVideoType(index)}
                          className={`flex-shrink-0 w-6 h-6 md:w-10 md:h-10 rounded border transition-all overflow-hidden bg-background/90 backdrop-blur-sm ${
                            currentVideoType === index
                              ? 'border-[hsl(var(--gold))] scale-110'
                              : 'border-[hsl(var(--gold))]/20 hover:border-[hsl(var(--gold))]/50'
                          }`}
                          title={highlight.name || `Highlight ${index + 1}`}
                        >
                          {(highlight.logoUrl || highlight.clubLogo) && (
                            <img 
                              src={highlight.logoUrl || highlight.clubLogo} 
                              alt={highlight.name || `Highlight ${index + 1}`}
                              className="w-full h-full object-contain p-0.5"
                              loading="lazy"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                    {dbHighlights.length > 10 && (
                      <button
                        onClick={() => {
                          const container = document.getElementById('club-logos-container');
                          if (container) {
                            container.scrollBy({ left: 200, behavior: 'smooth' });
                          }
                        }}
                        className="pointer-events-auto flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--gold))]/20 hover:bg-[hsl(var(--gold))]/30 border border-[hsl(var(--gold))]/40 flex items-center justify-center text-foreground transition-colors"
                        aria-label="Scroll right"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Recent Match Highlights Overlay - Left of Club Logos */}
              {dbHighlights.length > 0 && (
                <div className="hidden lg:block absolute bottom-[23px] md:bottom-[39px] left-4 z-20 bg-[hsl(var(--gold))]/20 backdrop-blur-sm px-3 py-1.5 rounded-md border border-[hsl(var(--gold))]/40">
                  <p className="text-foreground font-bebas uppercase tracking-wider text-sm md:text-base whitespace-nowrap">
                    RECENT MATCHES
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Biography Section */}
          <div className="mb-12">
            <h2 className="text-3xl font-bebas text-primary uppercase tracking-widest mb-4 flex items-center gap-3">
              <span className="w-12 h-1 bg-primary"></span>
              Biography
              <span className="flex-1 h-1 bg-primary/20"></span>
            </h2>
            <div className="flex gap-6 items-stretch">
              {/* Player Image - Matches text height */}
              <div className="relative overflow-hidden w-48 rounded-lg flex-shrink-0 self-start">
                <img
                  src={player.image_url}
                  alt={player.name}
                  className="w-full h-full object-cover min-h-[300px]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
              </div>

              {/* Bio - With line breaks preserved and read more */}
              <div className="flex-1">
                <p className="text-foreground/80 leading-relaxed text-base whitespace-pre-line line-clamp-[12]">
                  {player.bio}
                </p>
                {player.bio && player.bio.length > 500 && (
                  <button
                    onClick={() => setBioDialogOpen(true)}
                    className="mt-4 text-primary hover:text-primary/80 font-bebas uppercase text-sm tracking-wider transition-colors"
                  >
                    Read More
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Biography Dialog */}
          <Dialog open={bioDialogOpen} onOpenChange={setBioDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bebas uppercase tracking-wider text-primary">
                  {player.name} - Biography
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                <p className="text-foreground/80 leading-relaxed text-base whitespace-pre-line">
                  {player.bio}
                </p>
              </div>
            </DialogContent>
          </Dialog>

          {/* External Links Section */}
          {player.links && player.links.length > 0 && (
            <div className="mb-12">
              <h2 className="text-sm font-bebas text-primary uppercase tracking-widest mb-4 text-lg">
                External Links
              </h2>
              <div className="flex flex-wrap gap-3">
                {player.links.map((link: any, index: number) => (
                  <Button
                    key={index}
                    asChild
                    variant="outline"
                    className="font-bebas uppercase tracking-wider border-primary/30 hover:bg-primary hover:text-primary-foreground"
                  >
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {link.label}
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Season Stats */}
          {player.seasonStats && player.seasonStats.length > 0 && (
            <div className="mb-12">
              <h2 className="text-3xl font-bebas text-primary uppercase tracking-widest mb-6 flex items-center gap-3">
                <span className="w-12 h-1 bg-primary"></span>
                Season Stats
                <span className="flex-1 h-1 bg-primary/20"></span>
              </h2>
              <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
                {player.seasonStats.map((stat: any, idx: number) => (
                  <div 
                    key={idx} 
                    className="group relative overflow-hidden rounded-xl border-2 border-[hsl(var(--gold))]/30 bg-gradient-to-br from-secondary/40 via-secondary/30 to-secondary/20 backdrop-blur-sm p-8 transition-all duration-300 hover:border-[hsl(var(--gold))]/60 hover:shadow-[0_0_30px_rgba(212,175,55,0.2)]"
                  >
                    {/* Animated background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--gold))]/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* Shine effect */}
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/10 to-transparent" />
                    
                    <div className="relative text-center">
                      <div className="text-6xl md:text-7xl font-bebas text-transparent bg-clip-text bg-gradient-to-br from-[hsl(var(--gold))] via-primary to-[hsl(var(--gold))]/70 mb-3 leading-none tracking-tight drop-shadow-[0_2px_10px_rgba(212,175,55,0.3)]">
                        {stat.value || "0"}
                      </div>
                      <div className="text-sm md:text-base text-foreground/90 uppercase tracking-[0.2em] font-bold font-bebas">
                        {stat.header}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths, In Numbers, Scheme History Grid */}
          <div className="grid lg:grid-cols-2 gap-8 mb-12">

            {/* Left Column: Strengths & In Numbers */}
            <div className="space-y-8">
              {/* Strengths & Play Style */}
              {player.strengthsAndPlayStyle && player.strengthsAndPlayStyle.length > 0 && (
                <div>
                  <h2 className="text-sm font-bebas text-primary uppercase tracking-widest mb-4 text-lg">
                    Strengths & Play Style
                  </h2>
                  <div className="bg-secondary/30 backdrop-blur-sm p-6 rounded-lg">
                    <ul className="space-y-3">
                      {player.strengthsAndPlayStyle.map((strength, index) => (
                        <li key={index} className="flex items-start gap-3 text-foreground/90">
                          <span className="text-primary mt-1">•</span>
                          <span className="leading-relaxed">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* In Numbers - Always show even if empty */}
              <div>
                <h2 className="text-sm font-bebas text-primary uppercase tracking-widest mb-4 text-lg">
                  In Numbers
                </h2>
                <div className="bg-secondary/30 backdrop-blur-sm p-6 rounded-lg space-y-6">
                  {player.topStats && player.topStats.length > 0 ? (
                    player.topStats.map((stat, index) => (
                      <div key={index} className="space-y-3">
                        <div className="flex items-start gap-4">
                          {/* Icon/Graphic */}
                          <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                            {stat.icon === 'shield' ? (
                              <svg className="w-10 h-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                              </svg>
                            ) : stat.icon === 'target' ? (
                              <svg className="w-10 h-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <circle cx="12" cy="12" r="6"/>
                                <circle cx="12" cy="12" r="2"/>
                              </svg>
                            ) : stat.icon === 'muscle' ? (
                              <svg className="w-12 h-12 text-primary" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
                              </svg>
                            ) : stat.icon === '1v1' ? (
                              <div className="text-primary font-black text-2xl tracking-tighter">1v1</div>
                            ) : stat.icon === 'zap' ? (
                              <svg className="w-10 h-10 text-primary" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/>
                              </svg>
                            ) : stat.icon === 'trophy' ? (
                              <svg className="w-10 h-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                                <path d="M6 9v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9"/>
                                <path d="M6 9h12"/>
                              </svg>
                            ) : (
                              <svg className="w-10 h-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="3"/>
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                              </svg>
                            )}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-3 mb-2">
                              <span className="text-5xl font-bebas text-primary leading-none">
                                {stat.value}
                              </span>
                              {stat.value === '#1' && (
                                <span className="text-lg font-bebas text-primary/80 uppercase">
                                  IN LEAGUE
                                </span>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground uppercase tracking-wider block mb-2">
                              {stat.label}
                            </span>
                            {stat.description && (
                              <p className="text-sm text-foreground/70 leading-relaxed">
                                {stat.description}
                              </p>
                            )}
                          </div>
                        </div>
                        {index < player.topStats.length - 1 && (
                          <div className="h-px bg-border/50 mt-4" />
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No stats data available yet
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Scheme History */}
            {player.tacticalFormations && player.tacticalFormations.length > 0 && (
              <div>
                <h2 className="text-sm font-bebas text-primary uppercase tracking-widest mb-4 text-lg">
                  Scheme History
                </h2>
                <div className="bg-secondary/30 backdrop-blur-sm p-6 rounded-lg">
                  {/* Club Info with Logo */}
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <img 
                      src={player.tacticalFormations[currentFormationIndex].clubLogo} 
                      alt={player.tacticalFormations[currentFormationIndex].club}
                      className="w-16 h-16 object-contain transition-all duration-500"
                    />
                    <div className="text-center">
                      <div className="text-2xl font-bebas text-foreground uppercase tracking-wider transition-all duration-500">
                        {player.tacticalFormations[currentFormationIndex].club}
                      </div>
                      <div className="text-sm text-muted-foreground uppercase tracking-widest font-semibold transition-all duration-500">
                        {player.tacticalFormations[currentFormationIndex].club === player.currentClub 
                          ? 'CURRENT CLUB'
                          : `${player.tacticalFormations[currentFormationIndex].appearances || player.tacticalFormations[currentFormationIndex].matches || 0} Matches`
                        } • {player.tacticalFormations[currentFormationIndex].formation}
                      </div>
                    </div>
                  </div>
                  
                  {/* Formation Visual Below */}
                  <FormationDisplay 
                    selectedPositions={
                      (player.tacticalFormations[currentFormationIndex].positions && 
                       player.tacticalFormations[currentFormationIndex].positions.length > 0)
                        ? player.tacticalFormations[currentFormationIndex].positions 
                        : [player.tacticalFormations[currentFormationIndex].role]
                    } 
                    playerName={player.name} 
                    playerImage={player.tacticalFormations[currentFormationIndex].playerImage || player.image_url}
                    formation={player.tacticalFormations[currentFormationIndex].formation}
                  />
                </div>
                <div className="flex justify-center gap-2 mt-4">
                  {player.tacticalFormations.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentFormationIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentFormationIndex 
                          ? 'bg-primary w-6' 
                          : 'bg-primary/30'
                      }`}
                      aria-label={`Go to formation ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Highlighted Match Section - Only for represented/mandated players visible on stars page */}
          {player.highlighted_match && player.visible_on_stars_page && (
            <HighlightedMatchDisplay 
              highlightedMatch={player.highlighted_match}
              onVideoPlayChange={(isPlaying) => {
                if (isPlaying && videoRef.current) {
                  videoRef.current.pause();
                }
              }}
            />
          )}

          {/* Performance Reports Section */}
          {player.visible_on_stars_page && performanceReports.length > 0 && (
            <div className="mb-12">
              <h2 className="text-3xl font-bebas text-primary uppercase tracking-widest mb-6 flex items-center gap-3">
                <span className="w-12 h-1 bg-primary"></span>
                Performance Reports
                <span className="flex-1 h-1 bg-primary/20"></span>
              </h2>
              <div className="space-y-6">
                {performanceReports.map((report) => {
                  const stats = typeof report.striker_stats === 'string' 
                    ? JSON.parse(report.striker_stats) 
                    : report.striker_stats || {};
                  
                  const highlightedMatch = {
                    analysis_id: report.id,
                    home_team: "",
                    home_team_logo: "",
                    away_team: report.opponent || "",
                    away_team_logo: "",
                    score: report.result || "",
                    show_score: true,
                    minutes_played: report.minutes_played || 0,
                    match_date: report.analysis_date || "",
                    competition: "",
                    selected_stats: Object.keys(stats).slice(0, 4), // Show first 4 stats
                    stats: stats,
                    video_url: report.video_url || "",
                    full_match_url: "",
                    r90_report_url: report.pdf_url || "",
                  };

                  return (
                    <HighlightedMatchDisplay 
                      key={report.id}
                      highlightedMatch={highlightedMatch}
                      onVideoPlayChange={(isPlaying) => {
                        if (isPlaying && videoRef.current) {
                          videoRef.current.pause();
                        }
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* News Section */}
          {player.news && player.news.length > 0 && (
            <div className="mb-16">
              <h2 className="text-sm font-bebas text-primary uppercase tracking-widest mb-6 text-lg">
                Latest News
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {player.news.map((article, index) => (
                  <a
                    key={index}
                    href={article.link || "#"}
                    className="group bg-secondary/30 backdrop-blur-sm rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 transition-all hover:scale-[1.02]"
                  >
                    {article.image && (
                      <div className="aspect-video w-full overflow-hidden">
                        <img
                          src={article.image}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-6 space-y-3">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">
                        {article.date}
                      </div>
                      <h3 className="text-xl font-bebas uppercase text-foreground leading-tight group-hover:text-primary transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {article.summary}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

        {/* Contact Section */}
        <section className="py-16 px-4 bg-secondary/20 border-t border-primary/10 -mx-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-4xl font-bebas text-center uppercase tracking-wider text-foreground mb-12">
              Get In <span className="text-primary">Touch</span>
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Clubs/Agents */}
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-bebas uppercase tracking-wider text-primary">
                  Clubs & Agents
                </h3>
                <p className="text-sm text-muted-foreground">
                  Interested in signing this player? Let's discuss opportunities.
                </p>
                <Button 
                  asChild
                  size="lg"
                  className="w-full font-bebas uppercase tracking-wider"
                >
                  <a href="https://wa.me/447508342901" target="_blank" rel="noopener noreferrer">
                    Enquire About This Player
                  </a>
                </Button>
              </div>

              {/* Media */}
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-bebas uppercase tracking-wider text-primary">
                  Media
                </h3>
                <p className="text-sm text-muted-foreground">
                  Press inquiries and interview requests welcome.
                </p>
                <Button 
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full font-bebas uppercase tracking-wider"
                >
                  <a href="mailto:kuda.butawo@risefootballagency.com?subject=Media%20Inquiry">
                    Contact
                  </a>
                </Button>
              </div>

              {/* Sponsors */}
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-bebas uppercase tracking-wider text-primary">
                  Sponsors
                </h3>
                <p className="text-sm text-muted-foreground">
                  Explore partnership and sponsorship opportunities.
                </p>
                <Button 
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full font-bebas uppercase tracking-wider"
                >
                  <a href="https://wa.me/447446365438" target="_blank" rel="noopener noreferrer">
                    Reach Out
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      </div>
      </ErrorBoundary>
    </>
  );
};

export default PlayerDetail;
