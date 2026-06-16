import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useVideoPreloader } from "@/hooks/useVideoPreloader";
import { players } from "@/data/players";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, MessageCircle, ExternalLink, Video, ChevronLeft, ChevronRight, Play, BarChart3 } from "lucide-react";
import hudlLogo from "@/assets/wyscout-logo.png";
import { FormationDisplay } from "@/components/FormationDisplay";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { parsePlayerBio, parsePlayerHighlights } from "@/lib/playerDataParser";
import { LazyVideo } from "@/components/LazyVideo";
import { HighlightedMatchDisplay } from "@/components/HighlightedMatchDisplay";
import { PlayerStickyHeader } from "@/components/PlayerStickyHeader";
import blackMarbleBg from "@/assets/black-marble-menu.png";
import { createPerformanceReportSlug } from "@/lib/urlHelpers";
import { HoverText } from "@/components/HoverText";
import { PerformanceReportDialog } from "@/components/PerformanceReportDialog";
import { usePlayerTranslations, usePlayerProfileLabel, useTranslatedCountry, seasonStatTranslations, schemeHistoryLabels, inNumbersStatTranslations } from "@/hooks/usePlayerTranslations";
import { useLanguage } from "@/contexts/LanguageContext";
import { AnalysisDataTab } from "@/components/portal/AnalysisDataTab";
import { PlayerFormBanner } from "@/components/PlayerFormBanner";
import { PageLoading } from "@/components/LoadingSpinner";
import { ClippedActionsPlayer } from "@/components/ClippedActionsPlayer";
import { normaliseActionKey } from "@/components/staff/PlayerHudlVisibilityTab";
import { toTitleCase } from "@/lib/titleCase";
import { heroCropStyle } from "@/lib/videoCropUtils";

// Language column map for translation API responses
const languageColumnMap: Record<string, string> = {
  'en': 'english', 'es': 'spanish', 'pt': 'portuguese', 'fr': 'french',
  'de': 'german', 'it': 'italian', 'pl': 'polish', 'cs': 'czech',
  'ru': 'russian', 'tr': 'turkish', 'hr': 'croatian', 'no': 'norwegian',
};

const PlayerDetail = () => {
  const { playername } = useParams<{ playername: string }>();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [currentFormationIndex, setCurrentFormationIndex] = useState(0);
  const [currentVideoType, setCurrentVideoType] = useState<'season' | number>(0);
  const [dbHighlights, setDbHighlights] = useState<any[]>([]);
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bioDialogOpen, setBioDialogOpen] = useState(false);
  const [isPlayerInfoSticky, setIsPlayerInfoSticky] = useState(false);
  const [showPlayerStickyHeader, setShowPlayerStickyHeader] = useState(false);
  const [performanceReports, setPerformanceReports] = useState<any[]>([]);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [translatedStatDescriptions, setTranslatedStatDescriptions] = useState<Record<number, string>>({});
  const [topVideoActions, setTopVideoActions] = useState<any[]>([]);
  const [hudlVisibility, setHudlVisibility] = useState<Record<string, { visible: boolean; sort_order: number }> | null>(null);
  const [hudlCategoryConfig, setHudlCategoryConfig] = useState<Record<string, { visible: boolean; sort_order: number }> | null>(null);
  const [videoClipModalUrl, setVideoClipModalUrl] = useState<string | null>(null);
  const [videoClipPlaylist, setVideoClipPlaylist] = useState<string[]>([]);
  const [videoClipPlaylistIndex, setVideoClipPlaylistIndex] = useState(0);
  const [hudlPlayerOpen, setHudlPlayerOpen] = useState(false);
  const [hudlPlayerClips, setHudlPlayerClips] = useState<any[]>([]);
  const [hudlPlayerTitle, setHudlPlayerTitle] = useState<string>('');
  const [seasonReportOpen, setSeasonReportOpen] = useState(false);
  const [isTranslatingDescriptions, setIsTranslatingDescriptions] = useState(false);
  const [carouselStart, setCarouselStart] = useState(0);
  const [mobileVisibleRows, setMobileVisibleRows] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Pause the Stars highlight video whenever a clip player / modal opens
  useEffect(() => {
    if (hudlPlayerOpen || videoClipModalUrl) {
      try { videoRef.current?.pause(); } catch {}
    }
  }, [hudlPlayerOpen, videoClipModalUrl]);
  
  const playerInfoSentinelRef = useRef<HTMLDivElement>(null);

  // Translation hooks
  const { translatedContent, isTranslating } = usePlayerTranslations({
    bio: player?.bio || '',
    position: player?.position || '',
    playerId: player?.id,
    strengths: player?.strengthsAndPlayStyle || [],
  });
  
  // Translated country name
  const translatedCountry = useTranslatedCountry(player?.nationality || '');
  
  // Translate "In Numbers" stat descriptions using BATCH translation
  useEffect(() => {
    const translateDescriptions = async () => {
      if (language === 'en' || !player?.topStats || player.topStats.length === 0) {
        setTranslatedStatDescriptions({});
        return;
      }
      
      setIsTranslatingDescriptions(true);
      const translations: Record<number, string> = {};
      const targetLang = languageColumnMap[language];
      const textsToTranslate: { index: number; text: string }[] = [];
      
      // Check cache for each stat and collect uncached ones
      for (let i = 0; i < player.topStats.length; i++) {
        const stat = player.topStats[i];
        if (!stat.description) continue;
        
        const cacheKey = `stat_desc_v2_${player.id}_${i}_${language}`;
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            translations[i] = cached;
            continue;
          }
        } catch (e) {}
        
        textsToTranslate.push({ index: i, text: stat.description });
      }
      
      // If all were cached, we're done
      if (textsToTranslate.length === 0) {
        setTranslatedStatDescriptions(translations);
        setIsTranslatingDescriptions(false);
        return;
      }
      
      // Batch translate all uncached descriptions in ONE API call
      try {
        const { data, error } = await supabase.functions.invoke('ai-translate-batch', {
          body: { texts: textsToTranslate.map(t => t.text) }
        });
        
        if (!error && data?.translations) {
          data.translations.forEach((translation: Record<string, string>, i: number) => {
            const originalIndex = textsToTranslate[i].index;
            const translatedText = translation[targetLang];
            if (translatedText) {
              translations[originalIndex] = translatedText;
              // Cache each translation
              try {
                localStorage.setItem(`stat_desc_v2_${player.id}_${originalIndex}_${language}`, translatedText);
              } catch (e) {}
            }
          });
        }
      } catch (e) {
        console.error('Failed to batch translate stat descriptions:', e);
      }
      
      setTranslatedStatDescriptions(translations);
      setIsTranslatingDescriptions(false);
    };
    
    translateDescriptions();
  }, [language, player?.id, player?.topStats]);
  
  // Helper to get translated stat description
  const getTranslatedStatDescription = useCallback((index: number, originalDescription: string): string => {
    if (language === 'en') return originalDescription;
    return translatedStatDescriptions[index] || originalDescription;
  }, [language, translatedStatDescriptions]);
  
  // Helper function to translate season stat headers
  const getTranslatedStatHeader = (header: string): string => {
    const trimmedHeader = header?.trim();
    if (language === 'en' || !trimmedHeader) return trimmedHeader || header;
    return seasonStatTranslations[trimmedHeader]?.[language] || trimmedHeader;
  };
  
  // Helper function to translate scheme history labels
  const getSchemeLabel = (labelOrCount: string | number): string => {
    if (typeof labelOrCount === 'string') {
      const upper = labelOrCount.toUpperCase().trim();
      if (upper === 'CURRENT CLUB') {
        return language === 'en' ? 'CURRENT CLUB' : (schemeHistoryLabels['CURRENT CLUB']?.[language] || 'CURRENT CLUB');
      }
      // Return the string as-is if not a known label
      return upper;
    }
    // It's a number - format as "X MATCHES"
    const matchesWord = language === 'en' ? 'MATCHES' : (schemeHistoryLabels['MATCHES']?.[language] || 'MATCHES');
    return `${labelOrCount} ${matchesWord}`;
  };
  
  // Helper function to translate "In Numbers" stat labels (case-insensitive)
  const getTranslatedInNumbersStat = (label: string): string => {
    if (language === 'en' || !label) return label;
    
    // Try exact match first
    if (inNumbersStatTranslations[label]?.[language]) {
      return inNumbersStatTranslations[label][language];
    }
    
    // Try uppercase match
    const upperLabel = label.toUpperCase();
    if (inNumbersStatTranslations[upperLabel]?.[language]) {
      return inNumbersStatTranslations[upperLabel][language];
    }
    
    // Try title case match
    const titleCase = label.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    if (inNumbersStatTranslations[titleCase]?.[language]) {
      return inNumbersStatTranslations[titleCase][language];
    }
    
    // Try case-insensitive search through all keys
    const lowerLabel = label.toLowerCase().trim();
    for (const key of Object.keys(inNumbersStatTranslations)) {
      if (key.toLowerCase() === lowerLabel) {
        return inNumbersStatTranslations[key][language] || label;
      }
    }
    
    return label;
  };
  
  // Helper function to get translated "IN LEAGUE" text
  const getInLeagueText = (): string => {
    if (language === 'en') return 'IN LEAGUE';
    return inNumbersStatTranslations['IN LEAGUE']?.[language] || 'IN LEAGUE';
  };
  
  // Label translations
  const biographyLabel = usePlayerProfileLabel('biography');
  const readMoreLabel = usePlayerProfileLabel('readMore');
  const externalLinksLabel = usePlayerProfileLabel('externalLinks');
  const inNumbersLabel = usePlayerProfileLabel('inNumbers');
  const seasonStatsLabel = usePlayerProfileLabel('seasonStats');
  const strengthsLabel = usePlayerProfileLabel('strengths');
  const schemeHistoryLabel = usePlayerProfileLabel('schemeHistory');
  const recentMatchesLabel = usePlayerProfileLabel('recentMatches');
  const backToStarsLabel = usePlayerProfileLabel('backToStars');
  const enquirePlayerLabel = usePlayerProfileLabel('enquirePlayer');
  const loadingPlayerLabel = usePlayerProfileLabel('loadingPlayer');
  const playerNotFoundLabel = usePlayerProfileLabel('playerNotFound');
  const backToDirectoryLabel = usePlayerProfileLabel('backToDirectory');
  const highlightsLabel = usePlayerProfileLabel('highlights');
  const comingSoonLabel = usePlayerProfileLabel('comingSoon');
  const strengthsPlayStyleLabel = usePlayerProfileLabel('strengthsPlayStyle');
  const getInTouchLabel = usePlayerProfileLabel('getInTouch');
  const clubsAgentsLabel = usePlayerProfileLabel('clubsAgents');
  const interestedInSigningLabel = usePlayerProfileLabel('interestedInSigning');
  const mediaLabel = usePlayerProfileLabel('media');
  const pressInquiriesLabel = usePlayerProfileLabel('pressInquiries');
  const contactLabel = usePlayerProfileLabel('contact');
  const sponsorsLabel = usePlayerProfileLabel('sponsors');
  const sponsorOpportunitiesLabel = usePlayerProfileLabel('sponsorOpportunities');
  const reachOutLabel = usePlayerProfileLabel('reachOut');
  const seeMoreLabel = usePlayerProfileLabel('seeMore');
  const noStatsAvailableLabel = usePlayerProfileLabel('noStatsAvailable');
  const viewFullSeasonReportLabel = usePlayerProfileLabel('viewFullSeasonReport');

  // Debug: Log the current language
  console.log('PlayerDetail - Current language:', language);
  console.log('PlayerDetail - Back to Stars label:', backToStarsLabel);
  console.log('PlayerDetail - Biography label:', biographyLabel);
  
  // Extract video URLs for preloading
  const videoUrls = useMemo(() => 
    dbHighlights.map(h => h.videoUrl).filter(Boolean), 
    [dbHighlights]
  );
  
  // Setup video preloader
  const { preloadNextVideos } = useVideoPreloader({
    videos: videoUrls,
    preloadCount: 3,
    enabled: dbHighlights.length > 1
  });

  const highlightedAnalysis = player && player.highlighted_match
    ? performanceReports.find((report) => {
        // First try to match by analysis_id
        if (player.highlighted_match.analysis_id && report.id === player.highlighted_match.analysis_id) {
          return true;
        }
        // Fallback: opponent + date match. Two fixtures vs the same
        // opponent on different dates must not collapse onto each other.
        if (!report.opponent) return false;
        const reportOpponent = report.opponent.toLowerCase().trim();
        const highlightOpponent = String(player.highlighted_match.away_team || "").toLowerCase().trim();
        if (reportOpponent !== highlightOpponent) return false;
        const reportDate = String((report as any).analysis_date || "").slice(0, 10);
        const highlightDate = String(player.highlighted_match.match_date || "").slice(0, 10);
        if (!reportDate || !highlightDate) return false;
        return reportDate === highlightDate;
      })
    : null;
  
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

            // Fetch staff-defined Hudl clip + category visibility (if any)
            try {
              const { data: visRows } = await (supabase as any)
                .from("player_hudl_visibility")
                .select("clip_video_url, visible, sort_order, playlist_id, playlist_key")
                .eq("player_id", data.id);
              if (visRows && visRows.length > 0) {
                // Per-category clip visibility, keyed as `${categoryKey}::${url}`.
                // A clip hidden in one category must NOT hide the same clip in another visible category.
                const clipMap: Record<string, { visible: boolean; sort_order: number }> = {};
                const catMap: Record<string, { visible: boolean; sort_order: number }> = {};
                visRows.forEach((r: any) => {
                  const catKey = r.playlist_key || (r.playlist_id ? normaliseActionKey(r.playlist_id) : null);
                  if (r.clip_video_url && catKey) {
                    clipMap[`${catKey}::${r.clip_video_url}`] = { visible: !!r.visible, sort_order: r.sort_order ?? 0 };
                  } else if (catKey) {
                    catMap[catKey] = { visible: !!r.visible, sort_order: r.sort_order ?? 0 };
                  }
                });
                setHudlVisibility(clipMap);
                setHudlCategoryConfig(catMap);
              } else {
                setHudlVisibility(null);
                setHudlCategoryConfig(null);
              }
            } catch {
              setHudlVisibility(null);
              setHudlCategoryConfig(null);
            }
            
            // Fetch ALL clipped actions with positive R90 across all reports
            if (analysisData && analysisData.length > 0) {
              const analysisIds = analysisData.map((a: any) => a.id);
              const analysisLogoMap: Record<string, string | null> = {};
              analysisData.forEach((a: any) => {
                analysisLogoMap[a.id] = a.club_logo_url || null;
              });
              const allActions: any[] = [];
              const pageSize = 1000;
              let from = 0;
              while (true) {
                const { data: pageData, error } = await supabase
                  .from('performance_report_actions')
                  .select('id, action_type, action_score, video_url, minute, analysis_id, action_number, action_description, notes, clip_start, clip_end')
                  .in('analysis_id', analysisIds)
                  .not('video_url', 'is', null)
                  .gt('action_score', 0)
                  .order('action_score', { ascending: false })
                  .range(from, from + pageSize - 1);
                if (error) break;
                const chunk = pageData || [];
                allActions.push(...chunk);
                if (chunk.length < pageSize) break;
                from += pageSize;
              }

              if (allActions.length > 0) {
                const topActions: any[] = [];
                // Best Actions category
                allActions.filter((a: any) => (a.action_score || 0) >= 0.05).forEach((a: any) => {
                  topActions.push({ ...a, clip_logo_url: analysisLogoMap[a.analysis_id] || null, categoryKey: 'best_actions', categoryLabel: 'Best Actions' });
                });
                // Per-action-type categories (normalised + merged)
                allActions.forEach((a: any) => {
                  const parts = a.action_type?.includes(',')
                    ? a.action_type.split(',').map((t: string) => t.trim()).filter(Boolean)
                    : [a.action_type || 'Other'];
                  parts.forEach((rawType: string) => {
                    const key = normaliseActionKey(rawType || 'other');
                    const label = toTitleCase(rawType);
                    topActions.push({ ...a, clip_logo_url: analysisLogoMap[a.analysis_id] || null, categoryKey: key, categoryLabel: label });
                  });
                });
                setTopVideoActions(topActions);
              }
            }
            
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
    return <PageLoading />;
  }

  if (!player) {
    return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <div className="flex-shrink-0 text-center py-8">
        <h1 className="text-4xl font-bold text-foreground mb-4">{playerNotFoundLabel}</h1>
        <Button onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {backToDirectoryLabel}
        </Button>
      </div>
    </div>
    );
  }

  // Map player names to their custom OG images
  const getPlayerOgImage = (playerName: string): string => {
    const ogImages: Record<string, string> = {
      'tyrese omotoye': '/og-tyrese-omotoye.png',
      'michael vit mulligan': '/og-michael-vit-mulligan.png',
    };
    return ogImages[playerName.toLowerCase()] || player.image_url || '/og-preview-home.png';
  };

  const ogImage = getPlayerOgImage(player.name);
  // Use main domain for SEO
  const mainDomain = 'https://risefootballagency.com';
  const fullOgImage = ogImage.startsWith('http') ? ogImage : `${mainDomain}${ogImage}`;

  // Generate rich meta description with player details
  const metaDescription = `${player.name} - ${player.position} from ${player.nationality}${player.currentClub ? ` currently at ${player.currentClub}` : ''}. Professional footballer represented by RISE Football Agency. Contact us for transfer enquiries.`;
  
  // Generate Schema.org structured data for the player
  const playerSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": player.name,
    "jobTitle": `Professional Football Player - ${player.position}`,
    "nationality": {
      "@type": "Country",
      "name": player.nationality
    },
    "image": player.image_url || fullOgImage,
    "url": `${mainDomain}/stars/${playername}`,
    "description": metaDescription,
    ...(player.currentClub && {
      "memberOf": {
        "@type": "SportsTeam",
        "name": player.currentClub
      }
    }),
    ...(player.dateOfBirth && {
      "birthDate": player.dateOfBirth
    }),
    ...(player.links && Array.isArray(player.links) && player.links.length > 0 && {
      "sameAs": player.links
        .filter((link: any) => link.url && link.url !== '#')
        .map((link: any) => link.url)
    }),
    "knowsAbout": ["Football", "Soccer", player.position],
    "worksFor": {
      "@type": "Organization",
      "name": "RISE Football Agency",
      "url": mainDomain
    }
  };

  return (
    <>
      <Helmet>
        <title>{player.name} | {player.position}  {t('player_detail.rise_football_agency', '| RISE Football Agency')}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={`${mainDomain}/stars/${playername}`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={`${player.name} | ${player.position} | RISE Football Agency`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={fullOgImage} />
        <meta property="og:url" content={`${mainDomain}/stars/${playername}`} />
        <meta property="og:type" content="profile" />
        <meta property="og:site_name" content="RISE Football Agency" />
        <meta property="profile:first_name" content={player.name.split(' ')[0]} />
        <meta property="profile:last_name" content={player.name.split(' ').slice(1).join(' ')} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@risefootball" />
        <meta name="twitter:title" content={`${player.name} | ${player.position} | RISE Football Agency`} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={fullOgImage} />
        
        {/* Schema.org JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify(playerSchema)}
        </script>
        
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
            <div className="mb-2 flex flex-wrap gap-2">
              {player.visible_on_stars_page && (
                <Button
                  onClick={() => navigate("/stars")}
                  variant="outline"
                  size="sm"
                  className="group font-bebas uppercase tracking-wider border-primary/30 bg-background/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground btn-shine"
                >
                  <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                  <HoverText text={backToStarsLabel} />
                </Button>
              )}
              <Button 
                asChild
                size="sm"
                className="btn-shine font-bebas uppercase tracking-wider"
              >
                <a 
                  href={player?.whatsapp ? `https://wa.me/${player.whatsapp.replace(/\+/g, '')}` : "https://wa.me/447508342901"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  <HoverText text={enquirePlayerLabel} />
                </a>
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
                  {translatedContent.position}
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
                  {translatedCountry}
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
            {player.id && <PlayerFormBanner playerId={player.id} />}
            <div
              className="relative aspect-video bg-secondary/30 rounded-lg overflow-hidden border-4 md:border-[6px] border-[hsl(var(--gold))]"
              onMouseLeave={() => { try { videoRef.current?.pause(); } catch {} }}
            >
               {dbHighlights.length > 0 && typeof currentVideoType === 'number' && dbHighlights[currentVideoType]?.videoUrl ? (
                 <>
               <LazyVideo 
                      ref={videoRef}
                      key={dbHighlights[currentVideoType].videoUrl}
                      className="w-full h-full object-contain"
                      controls
                      playsInline
                      preload="auto"
                      loop={false}
                      autoPlayOnVisible
                      loadImmediately={currentVideoType === 0}
                      src={dbHighlights[currentVideoType].videoUrl}
                      style={heroCropStyle(dbHighlights[currentVideoType].videoUrl)}
                     onError={(e) => {
                      console.error('Video error:', e);
                      console.log('Video URL:', dbHighlights[currentVideoType].videoUrl);
                    }}
                    onLoadStart={() => console.log('Video loading started')}
                    onLoadedData={() => {
                      console.log('Video loaded successfully');
                    }}
                    onCanPlay={() => {
                      // When video is ready, preload next videos
                      if (typeof currentVideoType === 'number') {
                        preloadNextVideos(currentVideoType);
                      }
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
                    
                    {t('player_detail.your_browser_does_not_support_the_video_tag', 'Your browser does not support the video tag.')}
                  </LazyVideo>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4">
                  <Video className="w-12 h-12 md:w-16 md:h-16 text-primary" />
                  <p className="text-foreground/60 font-bebas text-lg md:text-xl uppercase tracking-wider text-center">
                    {dbHighlights.length > 0 && typeof currentVideoType === 'number' && dbHighlights[currentVideoType]?.name
                      ? dbHighlights[currentVideoType].name
                      : highlightsLabel}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {comingSoonLabel}
                  </p>
                </div>
              )}
              
              {/* Club Logo Overlays - Show database highlights with horizontal scroll (desktop only over video) */}
              {dbHighlights.length > 0 && (() => {
                const PAGE = 12;
                const total = dbHighlights.length;
                const useCarousel = total > PAGE;
                const start = useCarousel ? ((carouselStart % total) + total) % total : 0;
                const visible = useCarousel
                  ? Array.from({ length: PAGE }, (_, i) => ({
                      highlight: dbHighlights[(start + i) % total],
                      index: (start + i) % total,
                    }))
                  : dbHighlights.map((highlight, index) => ({ highlight, index }));
                return (
                  <div className="hidden md:block absolute bottom-[39px] left-1/2 -translate-x-1/2 z-10 w-full px-2 pointer-events-none">
                    <div className="relative flex items-center justify-center gap-2">
                      {useCarousel && (
                        <button
                          onClick={() => setCarouselStart(s => s - PAGE)}
                          className="pointer-events-auto flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--gold))]/20 hover:bg-[hsl(var(--gold))]/30 border border-[hsl(var(--gold))]/40 flex items-center justify-center text-foreground transition-colors"
                          aria-label={t('player_detail.previous_logos', 'Previous logos')}
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                      )}
                      <div className="flex gap-1 md:gap-2 pointer-events-auto">
                        {visible.map(({ highlight, index }) => (
                          <button
                            key={`${index}-${highlight.videoUrl}`}
                            onClick={() => setCurrentVideoType(index)}
                            className={`relative flex-shrink-0 w-6 h-6 md:w-10 md:h-10 rounded border transition-all overflow-hidden bg-background/90 backdrop-blur-sm ${
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
                                loading="eager"
                              />
                            )}
                            {(highlight.venue === 'H' || highlight.venue === 'A') && (
                              <span className="absolute bottom-0 right-0 leading-none text-[8px] md:text-[9px] font-bebas font-bold text-[hsl(var(--gold))] bg-black/70 px-[2px] rounded-tl">
                                {highlight.venue}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                      {useCarousel && (
                        <button
                          onClick={() => setCarouselStart(s => s + PAGE)}
                          className="pointer-events-auto flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--gold))]/20 hover:bg-[hsl(var(--gold))]/30 border border-[hsl(var(--gold))]/40 flex items-center justify-center text-foreground transition-colors"
                          aria-label={t('player_detail.next_logos', 'Next logos')}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
              
              {/* Recent Match Highlights Overlay - Left of Club Logos */}
              {dbHighlights.length > 0 && (
                <div className="hidden lg:block absolute bottom-[23px] md:bottom-[39px] left-4 z-20 bg-[hsl(var(--gold))]/20 backdrop-blur-sm px-3 py-1.5 rounded-md border border-[hsl(var(--gold))]/40">
                  <p className="text-foreground font-bebas uppercase tracking-wider text-sm md:text-base whitespace-nowrap">
                    {recentMatchesLabel.toUpperCase()}
                  </p>
                </div>
              )}
            </div>
            {/* Mobile club logo selector - rendered below video so native controls aren't covered */}
            {dbHighlights.length > 0 && (() => {
              const PER_ROW = 8;
              const visibleCount = Math.min(dbHighlights.length, PER_ROW * mobileVisibleRows);
              const remaining = dbHighlights.length - visibleCount;
              return (
                <div className="md:hidden mt-2">
                  <div className="grid grid-cols-8 gap-1.5">
                    {dbHighlights.slice(0, visibleCount).map((highlight, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentVideoType(index)}
                        className={`relative aspect-square rounded border transition-all overflow-hidden bg-background/90 ${
                          currentVideoType === index
                            ? 'border-[hsl(var(--gold))] scale-110'
                            : 'border-[hsl(var(--gold))]/30'
                        }`}
                        title={highlight.name || `Highlight ${index + 1}`}
                      >
                        {(highlight.logoUrl || highlight.clubLogo) && (
                          <img
                            src={highlight.logoUrl || highlight.clubLogo}
                            alt={highlight.name || `Highlight ${index + 1}`}
                            className="w-full h-full object-contain p-0.5"
                            loading="eager"
                          />
                        )}
                        {(highlight.venue === 'H' || highlight.venue === 'A') && (
                          <span className="absolute bottom-0 right-0 leading-none text-[8px] font-bebas font-bold text-[hsl(var(--gold))] bg-black/70 px-[2px] rounded-tl">
                            {highlight.venue}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  {remaining > 0 && (
                    <button
                      onClick={() => setMobileVisibleRows(r => r + 1)}
                      className="mt-2 w-full text-xs font-bebas uppercase tracking-wider text-[hsl(var(--gold))] border border-[hsl(var(--gold))]/40 rounded py-1.5 hover:bg-[hsl(var(--gold))]/10"
                    >
                      {seeMoreLabel} ({remaining})
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Video Report Action Categories - Below highlights */}
          {topVideoActions.length > 0 && (() => {
            // Group by normalised categoryKey
            const groups = new Map<string, { label: string; actions: any[] }>();
            topVideoActions.forEach((a: any) => {
              if (!a.video_url) return;
              const key = a.categoryKey || 'other';
              const label = a.categoryLabel || key;
              if (!groups.has(key)) groups.set(key, { label, actions: [] });
              const g = groups.get(key)!;
              if (!g.actions.some((x: any) => x.video_url === a.video_url)) g.actions.push(a);
            });

            // Default OFF: only show categories the staff has explicitly turned on.
            // Clip visibility is per-category (`${catKey}::${url}`).
            const visibleEntries = Array.from(groups.entries())
              .filter(([k]) => hudlCategoryConfig?.[k]?.visible === true)
              .map(([k, v]) => ({
                key: k,
                label: v.label,
                actions: v.actions
                  .filter((a: any) => {
                    if (!hudlVisibility) return true;
                    return hudlVisibility[`${k}::${a.video_url}`]?.visible !== false;
                  })
                  .map((a: any) => ({ ...a, _order: hudlVisibility?.[`${k}::${a.video_url}`]?.sort_order ?? 0 }))
                  .sort((a: any, b: any) => a._order - b._order),
              }))
              .filter(v => v.actions.length > 0);

            visibleEntries.sort((a, b) => {
              const ao = hudlCategoryConfig?.[a.key]?.sort_order ?? 999;
              const bo = hudlCategoryConfig?.[b.key]?.sort_order ?? 999;
              return ao - bo;
            });

            if (visibleEntries.length === 0) return null;

            return (
              <div className="mb-6 w-full">
                <div className="flex flex-col items-center gap-2 md:flex-row md:items-start md:gap-3 w-full">
                  <img src={hudlLogo} alt={t('player_detail.wyscout', 'Wyscout')} className="h-5 opacity-60 md:mt-1.5" />
                  <div className="flex flex-wrap justify-center md:justify-start gap-2 flex-1">
                    {visibleEntries.map(({ key, label, actions }) => (
                      <button
                        key={key}
                        onClick={() => {
                          const clips = actions.map((a: any, i: number) => ({
                            id: a.id,
                            action_number: a.action_number ?? i + 1,
                            action_type: (a.action_type || label).split(',')[0].trim(),
                            action_description: a.action_description || '',
                            video_url: a.video_url,
                            minute: a.minute ?? 0,
                            notes: a.notes,
                            clip_start: a.clip_start,
                            clip_end: a.clip_end,
                            clip_logo_url: a.clip_logo_url || null,
                          }));
                          setHudlPlayerClips(clips);
                          setHudlPlayerTitle(label);
                          setHudlPlayerOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-secondary/30 hover:bg-primary/10 hover:border-primary/40 transition-colors text-sm"
                      >
                        <Play className="h-3 w-3 text-primary" />
                        <span className="font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Hudl playlist player — same UX as staff video reports */}
          <ClippedActionsPlayer
            open={hudlPlayerOpen}
            onOpenChange={setHudlPlayerOpen}
            clips={hudlPlayerClips}
            title={hudlPlayerTitle}
            playerId={player?.id}
          />

          {/* Video Clip Playback Modal - supports playlist navigation */}
          <Dialog open={!!videoClipModalUrl} onOpenChange={() => { setVideoClipModalUrl(null); setVideoClipPlaylist([]); setVideoClipPlaylistIndex(0); }}>
            <DialogContent className="max-w-[90vw] w-full p-0 overflow-hidden bg-black border-none">
              {videoClipModalUrl && (
                <div className="relative">
                   <video 
                    key={videoClipModalUrl}
                    src={videoClipModalUrl} 
                    className="w-full max-h-[80vh] object-contain" 
                    autoPlay 
                    controls 
                    playsInline
                    preload="auto"
                    onCanPlay={(e) => {
                      e.currentTarget.play().catch(() => {});
                    }}
                    onEnded={() => {
                      if (videoClipPlaylist.length > 1 && videoClipPlaylistIndex < videoClipPlaylist.length - 1) {
                        const nextIdx = videoClipPlaylistIndex + 1;
                        setVideoClipPlaylistIndex(nextIdx);
                        setVideoClipModalUrl(videoClipPlaylist[nextIdx]);
                      }
                    }}
                  />
                  {videoClipPlaylist.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/70 backdrop-blur-sm rounded-full px-4 py-2">
                      <button 
                        onClick={() => {
                          if (videoClipPlaylistIndex > 0) {
                            const prevIdx = videoClipPlaylistIndex - 1;
                            setVideoClipPlaylistIndex(prevIdx);
                            setVideoClipModalUrl(videoClipPlaylist[prevIdx]);
                          }
                        }}
                        disabled={videoClipPlaylistIndex === 0}
                        className="text-white disabled:opacity-30"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <span className="text-white text-sm font-medium">
                        {videoClipPlaylistIndex + 1} / {videoClipPlaylist.length}
                      </span>
                      <button 
                        onClick={() => {
                          if (videoClipPlaylistIndex < videoClipPlaylist.length - 1) {
                            const nextIdx = videoClipPlaylistIndex + 1;
                            setVideoClipPlaylistIndex(nextIdx);
                            setVideoClipModalUrl(videoClipPlaylist[nextIdx]);
                          }
                        }}
                        disabled={videoClipPlaylistIndex >= videoClipPlaylist.length - 1}
                        className="text-white disabled:opacity-30"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Biography Section */}
          <div className="mb-12">
            <h2 className="text-3xl font-bebas text-primary uppercase tracking-widest mb-4 flex items-center gap-3">
              <span className="w-12 h-1 bg-primary"></span>
              {biographyLabel}
              <span className="flex-1 h-1 bg-primary/20"></span>
            </h2>
            <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:items-stretch">
              {/* Player Image - full width on mobile, fixed width on desktop */}
               <div className="relative overflow-hidden w-full md:w-48 rounded-lg flex-shrink-0 self-start">
                 <img
                   src={player.image_url}
                   alt={player.name}
                   className="w-full md:h-full object-cover max-h-[280px] md:max-h-none md:min-h-[300px]"
                 />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
              </div>

              {/* Bio - With line breaks preserved and read more */}
              <div className="flex-1">
                <p className={`text-foreground/80 leading-relaxed text-base whitespace-pre-line line-clamp-[12] transition-opacity duration-300 ${isTranslating ? 'opacity-80' : 'opacity-100'}`}>
                  {translatedContent.bio}
                </p>
                {player.bio && player.bio.length > 500 && (
                  <button
                    onClick={() => setBioDialogOpen(true)}
                    className="mt-4 text-primary hover:text-primary/80 font-bebas uppercase text-sm tracking-wider transition-colors"
                  >
                    {readMoreLabel}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Biography Dialog */}
          <Dialog open={bioDialogOpen} onOpenChange={setBioDialogOpen}>
            <DialogContent className="w-[100vw] sm:w-[95vw] max-w-4xl max-h-[90dvh] overflow-y-auto pt-12 p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bebas uppercase tracking-wider text-primary">
                  {player.name} - {biographyLabel}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                <p className={`text-foreground/80 leading-relaxed text-base whitespace-pre-line transition-opacity duration-300 ${isTranslating ? 'opacity-80' : 'opacity-100'}`}>
                  {translatedContent.bio}
                </p>
              </div>
            </DialogContent>
          </Dialog>

          {/* External Links Section */}
          {player.links && player.links.length > 0 && (
            <div className="mb-12">
              <h2 className="text-sm font-bebas text-primary uppercase tracking-widest mb-4 text-lg">
                {externalLinksLabel}
              </h2>
              <div className="flex flex-wrap gap-3">
                {player.links.map((link: any, index: number) => (
                  <Button
                    key={index}
                    asChild
                    variant="outline"
                    className="btn-shine font-bebas uppercase tracking-wider border-primary/30 hover:bg-primary hover:text-primary-foreground"
                  >
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <HoverText text={link.label} />
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Flexible layout for mobile ordering */}
          <div className="flex flex-col gap-8 mb-12">
            
            {/* In Numbers - First on mobile */}
            <div className="order-1 lg:hidden">
              <h2 className="text-2xl md:text-3xl font-bebas text-primary uppercase tracking-widest mb-6 flex items-center gap-3">
                <span className="w-8 h-1 bg-primary"></span>
                {inNumbersLabel}
              </h2>
              <div className="bg-secondary/30 backdrop-blur-sm p-6 rounded-lg space-y-6">
                {player.topStats && player.topStats.length > 0 ? (
                  player.topStats.map((stat, index) => (
                    <div key={index} className="space-y-3">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                          {stat.icon === 'shield' ? (
                            <svg className="w-10 h-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                          ) : stat.icon === 'target' ? (
                            <svg className="w-10 h-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
                            </svg>
                          ) : stat.icon === 'muscle' ? (
                            <svg className="w-12 h-12 text-primary" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
                            </svg>
                          ) : stat.icon === '1v1' ? (
                            <div className="text-primary font-black text-2xl tracking-tighter">{t('player_detail.1v1', '1v1')}</div>
                          ) : stat.icon === 'zap' ? (
                            <svg className="w-10 h-10 text-primary" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/>
                            </svg>
                          ) : stat.icon === 'trophy' ? (
                            <svg className="w-10 h-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                              <path d="M6 9v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9"/><path d="M6 9h12"/>
                            </svg>
                          ) : (
                            <svg className="w-10 h-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="3"/>
                              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-3 mb-2">
                            <span className="text-5xl font-bebas text-primary leading-none">{stat.value}</span>
                            {stat.value === '#1' && <span className="text-lg font-bebas text-primary/80 uppercase">{getInLeagueText()}</span>}
                          </div>
                          <span className="text-sm text-muted-foreground uppercase tracking-wider block mb-2">{getTranslatedInNumbersStat(stat.label)}</span>
                          {stat.description && <p className="text-sm text-foreground/70 leading-relaxed">{getTranslatedStatDescription(index, stat.description)}</p>}
                        </div>
                      </div>
                      {index < player.topStats.length - 1 && <div className="h-px bg-border/50 mt-4" />}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">{noStatsAvailableLabel}</p>
                )}
              </div>
            </div>

            {/* Season Stats - Second on mobile, First on desktop */}
            {player.seasonStats && player.seasonStats.length > 0 && (
              <div className="order-2 lg:order-1">
                <h2 className="text-3xl font-bebas text-primary uppercase tracking-widest mb-6 flex items-center gap-3">
                  <span className="w-12 h-1 bg-primary"></span>
                  {seasonStatsLabel}
                  <span className="flex-1 h-1 bg-primary/20"></span>
                  {performanceReports.length > 0 && (
                    <Button
                      onClick={() => setSeasonReportOpen(true)}
                      variant="outline"
                      size="sm"
                      className="ml-2 gap-1.5 font-bebas uppercase tracking-wider border-primary/40 hover:bg-primary hover:text-primary-foreground"
                    >
                      <BarChart3 className="h-3.5 w-3.5" /> {viewFullSeasonReportLabel}
                    </Button>
                  )}
                </h2>
                <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
                  {player.seasonStats.map((stat: any, idx: number) => (
                    <div 
                      key={idx} 
                      className="group relative overflow-hidden rounded-xl border-2 border-[hsl(var(--gold))]/30 bg-gradient-to-br from-secondary/40 via-secondary/30 to-secondary/20 backdrop-blur-sm p-8 transition-all duration-300 hover:border-[hsl(var(--gold))]/60 hover:shadow-[0_0_30px_rgba(212,175,55,0.2)]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--gold))]/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/10 to-transparent" />
                      <div className="relative text-center">
                        <div className="text-6xl md:text-7xl font-bebas text-transparent bg-clip-text bg-gradient-to-br from-[hsl(var(--gold))] via-primary to-[hsl(var(--gold))]/70 mb-3 leading-none tracking-tight drop-shadow-[0_2px_10px_rgba(212,175,55,0.3)]">
                          {stat.value || "0"}
                        </div>
                        <div className="text-sm md:text-base text-foreground/90 uppercase tracking-[0.2em] font-bold font-bebas">
                          {getTranslatedStatHeader(stat.header)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Desktop: 2-column grid with In Numbers + Strengths on left, Scheme History on right */}
            <div className="hidden lg:grid lg:grid-cols-2 gap-8 order-2">
              {/* Left Column: In Numbers + Strengths */}
              <div className="space-y-8">
                {/* In Numbers */}
                <div>
                  <h2 className="text-2xl md:text-3xl font-bebas text-primary uppercase tracking-widest mb-6 flex items-center gap-3">
                    <span className="w-8 h-1 bg-primary"></span>
                    {inNumbersLabel}
                  </h2>
                  <div className="bg-secondary/30 backdrop-blur-sm p-6 rounded-lg space-y-6">
                    {player.topStats && player.topStats.length > 0 ? (
                      player.topStats.map((stat, index) => (
                        <div key={index} className="space-y-3">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                              {stat.icon === 'shield' ? (
                                <svg className="w-10 h-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                </svg>
                              ) : stat.icon === 'target' ? (
                                <svg className="w-10 h-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
                                </svg>
                              ) : stat.icon === 'muscle' ? (
                                <svg className="w-12 h-12 text-primary" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
                                </svg>
                              ) : stat.icon === '1v1' ? (
                                <div className="text-primary font-black text-2xl tracking-tighter">{t('player_detail.1v1_2', '1v1')}</div>
                              ) : stat.icon === 'zap' ? (
                                <svg className="w-10 h-10 text-primary" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/>
                                </svg>
                              ) : stat.icon === 'trophy' ? (
                                <svg className="w-10 h-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                                  <path d="M6 9v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9"/><path d="M6 9h12"/>
                                </svg>
                              ) : (
                                <svg className="w-10 h-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="3"/>
                                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-3 mb-2">
                                <span className="text-5xl font-bebas text-primary leading-none">{stat.value}</span>
                                {stat.value === '#1' && <span className="text-lg font-bebas text-primary/80 uppercase">{getInLeagueText()}</span>}
                              </div>
                              <span className="text-sm text-muted-foreground uppercase tracking-wider block mb-2">{getTranslatedInNumbersStat(stat.label)}</span>
                              {stat.description && <p className="text-sm text-foreground/70 leading-relaxed">{getTranslatedStatDescription(index, stat.description)}</p>}
                            </div>
                          </div>
                          {index < player.topStats.length - 1 && <div className="h-px bg-border/50 mt-4" />}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">{noStatsAvailableLabel}</p>
                    )}
                  </div>
                </div>

                {/* Strengths & Play Style - Desktop only in left column */}
                {player.strengthsAndPlayStyle && player.strengthsAndPlayStyle.length > 0 && (
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bebas text-primary uppercase tracking-widest mb-6 flex items-center gap-3">
                      <span className="w-8 h-1 bg-primary"></span>
                      {strengthsPlayStyleLabel}
                    </h2>
                    <div className="group relative overflow-hidden rounded-xl border-2 border-[hsl(var(--gold))]/30 bg-gradient-to-br from-secondary/40 via-secondary/30 to-secondary/20 backdrop-blur-sm p-8 transition-all duration-300 hover:border-[hsl(var(--gold))]/60 hover:shadow-[0_0_30px_rgba(212,175,55,0.15)]">
                      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--gold))]/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/10 to-transparent" />
                      <ul className="relative space-y-4">
                        {(translatedContent.strengths.length > 0 ? translatedContent.strengths : player.strengthsAndPlayStyle).map((strength, index) => (
                          <li key={index} className="flex items-start gap-4 group/item">
                            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-gradient-to-br from-[hsl(var(--gold))] to-primary mt-2 group-hover/item:scale-125 transition-transform duration-300 shadow-[0_0_8px_rgba(212,175,55,0.5)]"></span>
                            <span className="leading-relaxed text-foreground/90 group-hover/item:text-foreground transition-colors duration-300">{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Scheme History */}
              {player.tacticalFormations && player.tacticalFormations.length > 0 && (
                <div>
                  <h2 className="text-2xl md:text-3xl font-bebas text-primary uppercase tracking-widest mb-6 flex items-center gap-3">
                    <span className="w-8 h-1 bg-primary"></span>
                    {schemeHistoryLabel}
                  </h2>
                  <div className="bg-secondary/30 backdrop-blur-sm p-6 rounded-lg">
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
                          {(() => {
                            const formation = player.tacticalFormations[currentFormationIndex];
                            const isCurrentClub = formation.club === player.club || formation.club === player.currentClub;
                            
                            // If current club, show "CURRENT CLUB" translated
                            if (isCurrentClub) {
                              return `${getSchemeLabel('CURRENT CLUB')} • ${formation.formation}`;
                            }
                            
                            // Otherwise show match count if available
                            const matchValue = formation.appearances || formation.matches;
                            const isNumeric = typeof matchValue === 'number' || (typeof matchValue === 'string' && !isNaN(Number(matchValue)) && matchValue !== '');
                            
                            let labelText = '';
                            if (isNumeric) labelText = getSchemeLabel(Number(matchValue));
                            else if (matchValue) labelText = getSchemeLabel(String(matchValue));
                            
                            return labelText ? `${labelText} • ${formation.formation}` : formation.formation;
                          })()}
                        </div>
                      </div>
                    </div>
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
                          index === currentFormationIndex ? 'bg-primary w-6' : 'bg-primary/30'
                        }`}
                        aria-label={`Go to formation ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Strengths & Play Style - Third on mobile only (hidden on lg where it's in grid above) */}
            {player.strengthsAndPlayStyle && player.strengthsAndPlayStyle.length > 0 && (
              <div className="order-3 lg:hidden">
                <h2 className="text-2xl md:text-3xl font-bebas text-primary uppercase tracking-widest mb-6 flex items-center gap-3">
                  <span className="w-8 h-1 bg-primary"></span>
                  {strengthsPlayStyleLabel}
                </h2>
                <div className="group relative overflow-hidden rounded-xl border-2 border-[hsl(var(--gold))]/30 bg-gradient-to-br from-secondary/40 via-secondary/30 to-secondary/20 backdrop-blur-sm p-8 transition-all duration-300 hover:border-[hsl(var(--gold))]/60 hover:shadow-[0_0_30px_rgba(212,175,55,0.15)]">
                  <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--gold))]/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/10 to-transparent" />
                  <ul className="relative space-y-4">
                    {(translatedContent.strengths.length > 0 ? translatedContent.strengths : player.strengthsAndPlayStyle).map((strength, index) => (
                      <li key={index} className="flex items-start gap-4 group/item">
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-gradient-to-br from-[hsl(var(--gold))] to-primary mt-2 group-hover/item:scale-125 transition-transform duration-300 shadow-[0_0_8px_rgba(212,175,55,0.5)]"></span>
                        <span className="leading-relaxed text-foreground/90 group-hover/item:text-foreground transition-colors duration-300">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Scheme History - Fourth on mobile only (hidden on lg where it's in grid above) */}
            {player.tacticalFormations && player.tacticalFormations.length > 0 && (
              <div className="order-4 lg:hidden">
                <h2 className="text-2xl md:text-3xl font-bebas text-primary uppercase tracking-widest mb-6 flex items-center gap-3">
                  <span className="w-8 h-1 bg-primary"></span>
                  {schemeHistoryLabel}
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
                        {(() => {
                          const formation = player.tacticalFormations[currentFormationIndex];
                          const isCurrentClub = formation.club === player.club || formation.club === player.currentClub;
                          
                          // If current club, show "CURRENT CLUB" translated
                          if (isCurrentClub) {
                            return `${getSchemeLabel('CURRENT CLUB')} • ${formation.formation}`;
                          }
                          
                          // Otherwise show match count if available
                          const matchValue = formation.appearances || formation.matches;
                          const isNumeric = typeof matchValue === 'number' || (typeof matchValue === 'string' && !isNaN(Number(matchValue)) && matchValue !== '');
                          
                          let labelText = '';
                          if (isNumeric) labelText = getSchemeLabel(Number(matchValue));
                          else if (matchValue) labelText = getSchemeLabel(String(matchValue));
                          
                          return labelText ? `${labelText} • ${formation.formation}` : formation.formation;
                        })()}
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
              highlightedMatch={{
                ...player.highlighted_match,
                player_image_url: player.image_url,
                analysis_id: highlightedAnalysis?.id,
                r90_report_url: highlightedAnalysis
                  ? createPerformanceReportSlug(
                      player.name,
                      highlightedAnalysis.opponent || "opposition",
                      highlightedAnalysis.id
                    )
                  : player.highlighted_match.r90_report_url || "",
              }}
              onVideoPlayChange={(isPlaying) => {
                if (isPlaying && videoRef.current) {
                  videoRef.current.pause();
                }
              }}
              onViewReport={(analysisId) => {
                setSelectedReportId(analysisId);
                setReportDialogOpen(true);
              }}
            />
          )}
          
          {/* Season Report Dialog - Shows the season data table */}
          <Dialog open={seasonReportOpen} onOpenChange={setSeasonReportOpen}>
            <DialogContent className="max-w-[100vw] sm:max-w-5xl w-full max-h-[90dvh] overflow-y-auto p-3 sm:p-6 pt-12 sm:pt-12">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bebas uppercase tracking-wider text-primary">
                  {player?.name}  {t('player_detail.season_performance_report', '- Season Performance Report')}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-2 overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                {performanceReports.length > 0 ? (
                  <AnalysisDataTab
                    analyses={performanceReports.map((r: any) => ({
                      id: r.id,
                      analysis_date: r.analysis_date,
                      r90_score: r.r90_score,
                      minutes_played: r.minutes_played,
                      opponent: r.opponent,
                      result: r.result,
                      striker_stats: r.striker_stats,
                      fixture_stats: r.fixture_stats,
                      visibility_status: r.visibility_status,
                      placeholder_raw_score: r.placeholder_raw_score,
                      placeholder_minutes: r.placeholder_minutes,
                      season_final: r.season_final,
                    }))}
                    playerData={player}
                    embedded
                  />
                ) : (
                  <p className="text-center text-muted-foreground py-8">{t('player_detail.no_match_reports_available', 'No match reports available')}</p>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Performance Report Dialog */}
          <PerformanceReportDialog 
            open={reportDialogOpen} 
            onOpenChange={setReportDialogOpen}
            analysisId={selectedReportId}
          />


          {/* News Section */}
          {player.news && player.news.length > 0 && (
            <div className="mb-16">
              <h2 className="text-sm font-bebas text-primary uppercase tracking-widest mb-6 text-lg">
                
                {t('player_detail.latest_news', 'Latest News')}
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
              {getInTouchLabel}
            </h2>
            <div className="grid md:grid-cols-3 gap-3 md:gap-8">
              {/* Clubs/Agents */}
              <div className="text-center space-y-2 md:space-y-4">
                <h3 className="text-2xl font-bebas uppercase tracking-wider text-primary">
                  {clubsAgentsLabel}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {interestedInSigningLabel}
                </p>
                <Button 
                  asChild
                  size="lg"
                  className="w-full font-bebas uppercase tracking-wider btn-shine"
                >
                  <a href="https://wa.me/447508342901" target="_blank" rel="noopener noreferrer">
                    <HoverText text={enquirePlayerLabel} />
                  </a>
                </Button>
              </div>

              {/* Media */}
              <div className="text-center space-y-2 md:space-y-4">
                <h3 className="text-2xl font-bebas uppercase tracking-wider text-primary">
                  {mediaLabel}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {pressInquiriesLabel}
                </p>
                <Button 
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full font-bebas uppercase tracking-wider btn-shine"
                >
                  <a href="mailto:kuda.butawo@risefootballagency.com?subject=Media%20Inquiry">
                    <HoverText text={contactLabel} />
                  </a>
                </Button>
              </div>

              {/* Sponsors */}
              <div className="text-center space-y-2 md:space-y-4">
                <h3 className="text-2xl font-bebas uppercase tracking-wider text-primary">
                  {sponsorsLabel}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {sponsorOpportunitiesLabel}
                </p>
                <Button 
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full font-bebas uppercase tracking-wider btn-shine"
                >
                  <a href="https://wa.me/447446365438" target="_blank" rel="noopener noreferrer">
                    <HoverText text={reachOutLabel} />
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
