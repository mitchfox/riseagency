import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RepresentationDialog } from "@/components/RepresentationDialog";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import introImage from "@/assets/intro-modal-background.png";
import riseLogo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import { useLanguage } from "@/contexts/LanguageContext";
interface IntroModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const IntroModal = ({ open, onOpenChange }: IntroModalProps) => {
  const { t } = useLanguage();
  const [showRepresentation, setShowRepresentation] = useState(false);
  const [newsIndex, setNewsIndex] = useState(0);
  const [starIndex, setStarIndex] = useState(0);
  const [starPlayers, setStarPlayers] = useState<any[]>([]);
  const [newsItems, setNewsItems] = useState<any[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const navigate = useNavigate();

  // Preload background image first
  useEffect(() => {
    const img = new Image();
    img.src = introImage;
    img.onload = () => setImageLoaded(true);
  }, []);

  useEffect(() => {
    const fetchStarPlayers = async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('visible_on_stars_page', true)
        .limit(3);
      
      if (data && !error && data.length > 0) {
        setStarPlayers(data);
      }
    };

    const fetchNews = async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('published', true)
        .eq('category', 'PLAYER NEWS')
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (data && !error && data.length > 0) {
        setNewsItems(data);
      }
    };

    fetchStarPlayers();
    fetchNews();
  }, []);

  useEffect(() => {
    const newsInterval = setInterval(() => {
      setNewsIndex(prev => (prev + 1) % newsItems.length);
    }, 6000);

    const starInterval = setInterval(() => {
      setStarIndex(prev => (prev + 1) % starPlayers.length);
    }, 6000);

    return () => {
      clearInterval(newsInterval);
      clearInterval(starInterval);
    };
  }, [starPlayers.length, newsItems.length]);

  const handleDialogChange = (newOpen: boolean) => {
    if (!newOpen) {
      localStorage.setItem("intro-modal-seen", "true");
    }
    onOpenChange(newOpen);
  };

  const handleEnterSite = () => {
    handleDialogChange(false);
  };

  const handleRequestRepresentation = () => {
    handleDialogChange(false);
    setShowRepresentation(true);
  };


  return (
    <>
      {imageLoaded && (
        <Dialog open={open} onOpenChange={handleDialogChange}>
          <DialogContent 
            className="max-w-lg w-full p-0 border-0 bg-transparent [&>button]:hidden overflow-hidden sm:max-w-lg max-w-[95vw]"
            aria-describedby="intro-modal-description"
          >
            <div className="relative w-full">
              {/* Main Image - Natural size, no stretching */}
              <img 
                src={introImage} 
                alt="RISE Football - From Striving to Rising to Thriving" 
                className="w-full h-auto object-contain"
              />
            
            {/* RISE Logo - Top Right Corner */}
            <img 
              src={riseLogo} 
              alt="RISE Football" 
              className="absolute top-2 right-2 w-32 h-auto object-contain sm:top-[30px] sm:right-[32px]"
            />
            
            {/* Overlay Content - Top Left, using all black space */}
            <div className="absolute top-[8px] left-3 right-[35%] pr-3 space-y-1.5 sm:top-[9px] sm:left-6 sm:right-[calc(35%-5px)] sm:pr-6 sm:space-y-1.5">
              <p id="intro-modal-description" className="text-[11px] text-white leading-tight sm:text-sm sm:leading-relaxed">
                {t("intro.description", "At RISE, we scout across the entirety of professional football in Europe and have guided many Premier League players to success through their development journey to RISE through the game and Realise Potential.")}
              </p>
              
              {/* Buttons */}
              <div className="flex flex-col gap-1.5 sm:gap-1.5 sm:mt-1">
                <Button 
                  onClick={handleRequestRepresentation}
                  hoverEffect
                  className="bg-gray-300 text-black hover:bg-gray-400 font-bebas uppercase tracking-wider px-3 py-1.5 text-xs w-[180px] border-0 h-7 sm:px-4 sm:py-2 sm:text-base sm:w-full sm:h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  {t("intro.request_representation", "Request Representation")}
                </Button>
                <Button 
                  onClick={handleEnterSite}
                  hoverEffect
                  className="btn-shine font-bebas uppercase tracking-wider px-3 py-1.5 text-xs w-[180px] h-7 sm:px-4 sm:py-2 sm:text-base sm:w-full sm:h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  {t("intro.enter_site", "Enter Site")}
                </Button>
              </div>
            </div>

            {/* News Slider - Bottom Right */}
            {newsItems.length > 0 && (
              <div 
                onClick={() => {
                  handleDialogChange(false);
                  navigate("/news");
                }}
                className="absolute right-3 bottom-3 w-[140px] bg-black/70 backdrop-blur-sm border border-white rounded-lg overflow-hidden cursor-pointer hover:bg-black/80 sm:right-6 sm:bottom-6 sm:w-[220px] sm:border-2"
              >
                <div className="relative w-full aspect-square sm:h-32 sm:aspect-auto">
                  {newsItems.map((item, index) => (
                    <img 
                      key={item.id}
                      src={item.image_url} 
                      alt="Latest News" 
                      className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
                      style={{ opacity: index === newsIndex ? 1 : 0 }}
                    />
                  ))}
                </div>
                <div className="relative p-1.5 sm:p-3">
                  {newsItems.map((item, index) => (
                    <div 
                      key={`news-text-${item.id}`}
                      className="transition-opacity duration-1000 ease-in-out"
                      style={{ 
                        opacity: index === newsIndex ? 1 : 0,
                        position: index === newsIndex ? 'relative' : 'absolute',
                        visibility: index === newsIndex ? 'visible' : 'hidden'
                      }}
                    >
                      <h3 className="text-white font-bebas text-[10px] uppercase tracking-wider mb-0.5 sm:text-base sm:mb-1">{t("intro.latest_news", "Latest News")}</h3>
                      <p className="text-white/80 text-[8px] line-clamp-2 sm:text-xs">{item.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Our Stars Slider - Bottom Left */}
            {starPlayers.length > 0 && (
              <div 
                className="absolute left-3 bottom-3 w-[180px] sm:left-6 sm:bottom-6 sm:w-[220px]"
              >
                <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden group border border-[#B8A574] sm:border-2">
                  {/* Player Images with Dark Overlay - All rendered with opacity transitions */}
                  {starPlayers.map((player, index) => (
                    <div
                      key={player.id}
                      className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
                      style={{ opacity: index === starIndex ? 1 : 0 }}
                    >
                      <img 
                        src={player.image_url} 
                        alt={player.name}
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
                    </div>
                  ))}
                
                  {/* Age - Top Left */}
                  <div className="absolute top-2 left-2 flex flex-col items-center min-w-[30px] sm:top-4 sm:left-4 sm:min-w-[60px]">
                    {starPlayers.map((player, index) => (
                      <div
                        key={`age-${player.id}`}
                        className="transition-opacity duration-1000 ease-in-out"
                        style={{ 
                          opacity: index === starIndex ? 1 : 0,
                          position: index === starIndex ? 'relative' : 'absolute',
                          visibility: index === starIndex ? 'visible' : 'hidden'
                        }}
                      >
                        <div className="text-xl font-bold text-white font-bebas leading-none text-center sm:text-4xl">{player.age}</div>
                        <div className="text-[6px] text-white/80 uppercase tracking-wider mt-0.5 text-center sm:text-[9px]">{t("intro.age", "Age")}</div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Nationality Flag - Top Right */}
                  <div className="absolute top-2 right-2 flex flex-col items-center min-w-[30px] sm:top-4 sm:right-4 sm:min-w-[60px]">
                    {starPlayers.map((player, index) => {
                      const nat = player.nationality;
                      if (!nat) return null;
                      const normalizedNat = nat === 'Cape Verdean' ? 'Cape Verde' : nat;
                      const flagUrl = getCountryFlagUrl(normalizedNat);
                      return (
                        <div
                          key={`nat-${player.id}`}
                          className="flex flex-col items-center transition-opacity duration-1000 ease-in-out"
                          style={{ 
                            opacity: index === starIndex ? 1 : 0,
                            position: index === starIndex ? 'relative' : 'absolute',
                            visibility: index === starIndex ? 'visible' : 'hidden'
                          }}
                        >
                          <img 
                            src={flagUrl} 
                            alt={`${normalizedNat} flag`}
                            className="w-6 h-4 object-contain mb-0.5 sm:w-10 sm:h-8 sm:mb-1"
                          />
                          <div className="text-[6px] text-white/80 uppercase tracking-wider text-center sm:text-[9px]">{t("intro.nationality", "Nationality")}</div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Position - Bottom Left */}
                  <div className="absolute bottom-2 left-2 flex flex-col items-center min-w-[30px] sm:bottom-4 sm:left-4 sm:min-w-[60px]">
                    {starPlayers.map((player, index) => (
                      <div
                        key={`pos-${player.id}`}
                        className="transition-opacity duration-1000 ease-in-out"
                        style={{ 
                          opacity: index === starIndex ? 1 : 0,
                          position: index === starIndex ? 'relative' : 'absolute',
                          visibility: index === starIndex ? 'visible' : 'hidden'
                        }}
                      >
                        <div className="text-lg font-bold text-white font-bebas leading-none text-center sm:text-3xl">{player.position}</div>
                        <div className="text-[6px] text-white/80 uppercase tracking-wider mt-0.5 text-center sm:text-[9px]">{t("intro.position", "Position")}</div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Club Logo - Bottom Right */}
                  <div className="absolute bottom-2 right-2 flex flex-col items-center min-w-[30px] sm:bottom-4 sm:right-4 sm:min-w-[60px]">
                    {starPlayers.map((player, index) => {
                      const clubLogo = player.club_logo;
                      return clubLogo ? (
                        <div
                          key={`club-${player.id}`}
                          className="flex flex-col items-center transition-opacity duration-1000 ease-in-out"
                          style={{ 
                            opacity: index === starIndex ? 1 : 0,
                            position: index === starIndex ? 'relative' : 'absolute',
                            visibility: index === starIndex ? 'visible' : 'hidden'
                          }}
                        >
                          <img src={clubLogo} alt="Club" className="w-6 h-6 object-contain mb-0.5 sm:w-12 sm:h-12 sm:mb-1" />
                          <div className="text-[6px] text-white/80 uppercase tracking-wider text-center sm:text-[9px]">{t("intro.club", "Club")}</div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      )}

      <RepresentationDialog open={showRepresentation} onOpenChange={setShowRepresentation} />
    </>
  );
};
