import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RepresentationDialog } from "@/components/RepresentationDialog";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import blackMarbleSmudged from "@/assets/black-marble-smudged.png";
import introImage from "@/assets/intro-modal-background.png";
import riseLogo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { getCountryFlagUrl } from "@/lib/countryFlags";

interface IntroModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const IntroModal = ({ open, onOpenChange }: IntroModalProps) => {
  const [showRepresentation, setShowRepresentation] = useState(false);
  const [newsIndex, setNewsIndex] = useState(0);
  const [starIndex, setStarIndex] = useState(0);
  const [starPlayers, setStarPlayers] = useState<any[]>([]);
  const [newsItems, setNewsItems] = useState<any[]>([]);
  const navigate = useNavigate();

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
    }, 5000);

    const starInterval = setInterval(() => {
      setStarIndex(prev => (prev + 1) % starPlayers.length);
    }, 5000);

    return () => {
      clearInterval(newsInterval);
      clearInterval(starInterval);
    };
  }, [starPlayers.length, newsItems.length]);

  const handleDialogChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Mark as seen whenever the modal is closed
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
              className="absolute top-2 right-2 w-32 h-auto object-contain sm:top-4 sm:right-4 sm:w-32"
            />
            
            {/* Overlay Content - Top Left, using all black space */}
            <div className="absolute top-[6px] left-3 right-[35%] pr-3 space-y-1 sm:top-[9px] sm:left-6 sm:pr-6 sm:space-y-1.5">
              <p id="intro-modal-description" className="text-[11px] text-white leading-tight sm:text-sm sm:leading-relaxed">
                We scout across the entirety of professional football in Europe and have guided many Premier League players to success through their development journey to RISE through the game and realise potential.
              </p>
              
              {/* Buttons */}
              <div className="flex flex-col gap-1 sm:gap-1.5">
                <Button 
                  onClick={handleRequestRepresentation}
                  className="bg-gray-300 text-black hover:bg-gray-400 font-bebas uppercase tracking-wider px-2 py-0.5 text-xs w-[160px] border-0 h-5 sm:px-4 sm:text-base sm:w-[240px] sm:h-auto"
                >
                  Request Representation
                </Button>
                <Button 
                  onClick={handleEnterSite}
                  className="btn-shine font-bebas uppercase tracking-wider px-2 py-0.5 text-xs w-[160px] h-5 sm:px-4 sm:text-base sm:w-[240px] sm:h-auto"
                >
                  Enter Site
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
                className="absolute right-3 bottom-3 w-[140px] bg-black/70 backdrop-blur-sm border border-white rounded-lg overflow-hidden cursor-pointer hover:bg-black/80 transition-all sm:right-6 sm:bottom-6 sm:w-[220px] sm:border-2"
              >
                <img 
                  src={newsItems[newsIndex]?.image_url} 
                  alt="Latest News" 
                  className="w-full h-24 object-cover transition-opacity duration-500 sm:h-32" 
                />
                <div className="p-1.5 sm:p-3">
                  <h3 className="text-white font-bebas text-[10px] uppercase tracking-wider mb-0.5 sm:text-base sm:mb-1">Latest News</h3>
                  <p className="text-white/80 text-[8px] line-clamp-2 sm:text-xs">{newsItems[newsIndex]?.title}</p>
                </div>
              </div>
            )}

            {/* Our Stars Slider - Bottom Left */}
            {starPlayers.length > 0 && (
              <div 
                onClick={() => {
                  handleDialogChange(false);
                  navigate("/stars");
                }}
                className="absolute left-3 bottom-3 w-[140px] cursor-pointer hover:scale-[1.02] transition-transform sm:left-6 sm:bottom-6 sm:w-[220px]"
              >
                <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden group border border-[#B8A574] sm:border-2">
                  {/* Player Image with Dark Overlay */}
                  <img 
                    src={starPlayers[starIndex]?.image_url} 
                    alt={starPlayers[starIndex]?.name}
                    className="w-full h-full object-cover transition-opacity duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
                
                  {/* Age - Top Left */}
                  <div className="absolute top-2 left-2 flex flex-col items-center min-w-[30px] sm:top-4 sm:left-4 sm:min-w-[60px]">
                    <div className="text-xl font-bold text-white font-bebas leading-none text-center sm:text-4xl">{starPlayers[starIndex]?.age}</div>
                    <div className="text-[6px] text-white/80 uppercase tracking-wider mt-0.5 text-center sm:text-[9px]">Age</div>
                  </div>
                  
                  {/* Nationality Flag - Top Right */}
                  <div className="absolute top-2 right-2 flex flex-col items-center min-w-[30px] sm:top-4 sm:right-4 sm:min-w-[60px]">
                    {(() => {
                      const nat = starPlayers[starIndex]?.nationality;
                      if (!nat) return null;
                      // Handle "Cape Verdean" -> "Cape Verde" mapping
                      const normalizedNat = nat === 'Cape Verdean' ? 'Cape Verde' : nat;
                      const flagUrl = getCountryFlagUrl(normalizedNat);
                      return (
                        <img 
                          src={flagUrl} 
                          alt={`${normalizedNat} flag`}
                          className="w-6 h-4 object-contain mb-0.5 sm:w-10 sm:h-8"
                        />
                      );
                    })()}
                    <div className="text-[6px] text-white/80 uppercase tracking-wider text-center sm:text-[9px]">Nationality</div>
                  </div>
                  
                  {/* Position - Bottom Left */}
                  <div className="absolute bottom-8 left-2 flex flex-col items-center min-w-[30px] sm:bottom-16 sm:left-4 sm:min-w-[60px]">
                    <div className="text-lg font-bold text-white font-bebas leading-none text-center sm:text-3xl">{starPlayers[starIndex]?.position}</div>
                    <div className="text-[6px] text-white/80 uppercase tracking-wider mt-0.5 text-center sm:text-[9px]">Position</div>
                  </div>
                  
                  {/* Club Logo - Bottom Right */}
                  {(() => {
                    try {
                      const bio = JSON.parse(starPlayers[starIndex]?.bio || '{}');
                      const clubLogo = bio.tacticalFormations?.[0]?.clubLogo;
                      return clubLogo ? (
                        <div className="absolute bottom-8 right-2 flex flex-col items-center min-w-[30px] sm:bottom-16 sm:right-4 sm:min-w-[60px]">
                          <img src={clubLogo} alt="Club" className="w-6 h-6 object-contain mb-0.5 sm:w-12 sm:h-12" />
                          <div className="text-[6px] text-white/80 uppercase tracking-wider text-center sm:text-[9px]">Club</div>
                        </div>
                      ) : null;
                    } catch {
                      return null;
                    }
                  })()}
                  
                  {/* Our Stars Button */}
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-3">
                    <div className="bg-[#B8A574] text-black font-bebas uppercase tracking-wider text-[10px] py-1.5 px-2 text-center rounded sm:text-sm sm:py-2.5 sm:px-4">
                      OUR STARS
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <RepresentationDialog open={showRepresentation} onOpenChange={setShowRepresentation} />
    </>
  );
};
