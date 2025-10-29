import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RepresentationDialog } from "@/components/RepresentationDialog";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import blackMarbleSmudged from "@/assets/black-marble-smudged.png";
import introImage from "@/assets/intro-modal-new.png";
import { supabase } from "@/integrations/supabase/client";

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
        .neq('category', 'Between the Lines')
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
          className="max-w-lg w-full p-0 border-0 bg-transparent [&>button]:hidden overflow-hidden"
          aria-describedby="intro-modal-description"
        >
          <div className="relative w-full">
            {/* Main Image - Natural size, no stretching */}
            <img 
              src={introImage} 
              alt="RISE Football - From Striving to Rising to Thriving" 
              className="w-full h-auto object-contain"
            />
            
            {/* Overlay Content - Top Left, using all black space */}
            <div className="absolute top-[9px] left-6 right-[35%] pr-6 space-y-1.5">
              <p id="intro-modal-description" className="text-sm text-white leading-relaxed">
                We scout across the entirety of professional football in Europe and have guided many Premier League players to success through their development journey to RISE through the game and realise potential.
              </p>
              
              {/* Buttons */}
              <div className="flex flex-col gap-1.5">
                <Button 
                  onClick={handleRequestRepresentation}
                  className="bg-gray-300 text-black hover:bg-gray-400 font-bebas uppercase tracking-wider px-4 py-0 text-base w-[240px] border-0"
                >
                  Request Representation
                </Button>
                <Button 
                  onClick={handleEnterSite}
                  className="btn-shine font-bebas uppercase tracking-wider px-4 py-0 text-base w-[240px]"
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
                className="absolute right-6 bottom-6 w-[220px] bg-black/70 backdrop-blur-sm border-2 border-white rounded-lg overflow-hidden cursor-pointer hover:bg-black/80 transition-all"
              >
                <img 
                  src={newsItems[newsIndex]?.image_url} 
                  alt="Latest News" 
                  className="w-full h-32 object-cover transition-opacity duration-500" 
                />
                <div className="p-3">
                  <h3 className="text-white font-bebas text-base uppercase tracking-wider mb-1">Latest News</h3>
                  <p className="text-white/80 text-xs">{newsItems[newsIndex]?.title}</p>
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
                className="absolute left-6 bottom-6 w-[220px] cursor-pointer hover:scale-[1.02] transition-transform"
              >
                <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden group border-2 border-[#B8A574]">
                  {/* Player Image with Dark Overlay */}
                  <img 
                    src={starPlayers[starIndex]?.image_url} 
                    alt={starPlayers[starIndex]?.name}
                    className="w-full h-full object-cover transition-opacity duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
                
                  {/* Age - Top Left */}
                  <div className="absolute top-4 left-4">
                    <div className="text-4xl font-bold text-white font-bebas leading-none">{starPlayers[starIndex]?.age}</div>
                    <div className="text-[9px] text-white/80 uppercase tracking-wider mt-0.5">Age</div>
                  </div>
                  
                  {/* Nationality - Top Right */}
                  <div className="absolute top-4 right-4 text-right">
                    <div className="text-4xl leading-none mb-0.5">{starPlayers[starIndex]?.nationality}</div>
                    <div className="text-[9px] text-white/80 uppercase tracking-wider">Nationality</div>
                  </div>
                  
                  {/* Position - Bottom Left */}
                  <div className="absolute bottom-16 left-4">
                    <div className="text-3xl font-bold text-white font-bebas leading-none">{starPlayers[starIndex]?.position}</div>
                    <div className="text-[9px] text-white/80 uppercase tracking-wider mt-0.5">Position</div>
                  </div>
                  
                  {/* Our Stars Button */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="bg-[#B8A574] text-black font-bebas uppercase tracking-wider text-sm py-2.5 px-4 text-center rounded">
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
