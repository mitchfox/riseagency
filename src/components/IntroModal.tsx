import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RepresentationDialog } from "@/components/RepresentationDialog";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import blackMarbleSmudged from "@/assets/black-marble-smudged.png";
import introImage from "@/assets/intro-modal-new.png";

interface IntroModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const IntroModal = ({ open, onOpenChange }: IntroModalProps) => {
  const [showRepresentation, setShowRepresentation] = useState(false);
  const [newsIndex, setNewsIndex] = useState(0);
  const [starIndex, setStarIndex] = useState(0);
  const navigate = useNavigate();

  const newsItems = [
    { image: "/news/mikie-mulligan-assist.png", title: "Michael Mulligan Assist" },
    { image: "/news/salah-de-bruyne-fit.png", title: "Salah & De Bruyne Fit" },
    { image: "/news/sandra-cape-verde-callup.png", title: "Sandra Cape Verde Callup" },
  ];

  const starPlayers = [
    { image: "/players/michael-mulligan.png", name: "Michael Mulligan" },
    { image: "/players/tyrese-omotoye.png", name: "Tyrese Omotoye" },
    { image: "/players/jaroslav-svoboda.jpg", name: "Jaroslav Svoboda" },
  ];

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
  }, []);

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
          className="max-w-lg w-full p-0 border-primary/20 bg-transparent [&>button]:hidden overflow-hidden"
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
            <div className="absolute top-6 left-6 right-[35%] pr-6 space-y-1.5">
              <p id="intro-modal-description" className="text-sm text-white leading-relaxed">
                We scout across the entirety of professional football in Europe and have guided many Premier League players to success through their development journey to RISE through the game and realise potential.
              </p>
              
              {/* Buttons */}
              <div className="flex flex-col gap-1.5">
                <Button 
                  onClick={handleRequestRepresentation}
                  className="bg-gray-300 text-black hover:bg-gray-400 font-bebas uppercase tracking-wider px-4 py-1.5 text-[10px] w-full"
                >
                  Request Representation
                </Button>
                <Button 
                  onClick={handleEnterSite}
                  className="btn-shine font-bebas uppercase tracking-wider px-4 py-1.5 text-[10px] w-full"
                >
                  Enter Site
                </Button>
              </div>
            </div>

            {/* News Slider - Middle Left */}
            <div 
              onClick={() => {
                handleDialogChange(false);
                navigate("/news");
              }}
              className="absolute left-6 top-[250px] w-[220px] bg-black/70 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden cursor-pointer hover:bg-black/80 transition-all"
            >
              <img 
                src={newsItems[newsIndex].image} 
                alt="Latest News" 
                className="w-full h-32 object-cover transition-opacity duration-500" 
              />
              <div className="p-3">
                <h3 className="text-white font-bebas text-base uppercase tracking-wider mb-1">Latest News</h3>
                <p className="text-white/80 text-xs">{newsItems[newsIndex].title}</p>
              </div>
            </div>

            {/* Our Stars Slider - Bottom Left */}
            <div 
              onClick={() => {
                handleDialogChange(false);
                navigate("/stars");
              }}
              className="absolute left-6 bottom-6 w-[220px] bg-black/70 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden cursor-pointer hover:bg-black/80 transition-all"
            >
              <img 
                src={starPlayers[starIndex].image} 
                alt="Our Stars" 
                className="w-full h-32 object-cover transition-opacity duration-500" 
              />
              <div className="p-3">
                <h3 className="text-white font-bebas text-base uppercase tracking-wider mb-1">Our Stars</h3>
                <p className="text-white/80 text-xs">{starPlayers[starIndex].name}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <RepresentationDialog open={showRepresentation} onOpenChange={setShowRepresentation} />
    </>
  );
};
