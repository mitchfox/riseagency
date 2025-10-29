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
  const [currentSlide, setCurrentSlide] = useState<"news" | "stars">("news");
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => prev === "news" ? "stars" : "news");
    }, 5000);

    return () => clearInterval(interval);
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

  const handleSlideClick = () => {
    handleDialogChange(false);
    navigate(currentSlide === "news" ? "/news" : "/stars");
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
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={handleRequestRepresentation}
                  className="bg-gray-300 text-black hover:bg-gray-400 font-bebas uppercase tracking-wider px-6 py-2.5 text-sm w-full"
                >
                  Request Representation
                </Button>
                <Button 
                  onClick={handleEnterSite}
                  className="btn-shine font-bebas uppercase tracking-wider px-6 py-2.5 text-sm w-full"
                >
                  Enter Site
                </Button>
              </div>
            </div>

            {/* Slideshow Section - Left Side */}
            <div 
              onClick={handleSlideClick}
              className="absolute left-6 top-[280px] w-[180px] bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg p-3 cursor-pointer hover:bg-black/70 transition-colors"
            >
              <div className={`${currentSlide === "news" ? "animate-fade-in" : "animate-fade-out"} ${currentSlide === "news" ? "block" : "hidden"}`}>
                <h3 className="text-white font-bebas text-sm uppercase tracking-wider mb-2">Latest News</h3>
                <div className="space-y-1.5">
                  <p className="text-white/80 text-xs leading-tight">Transfer updates & player achievements</p>
                </div>
              </div>
              
              <div className={`${currentSlide === "stars" ? "animate-fade-in" : "animate-fade-out"} ${currentSlide === "stars" ? "block" : "hidden"}`}>
                <h3 className="text-white font-bebas text-sm uppercase tracking-wider mb-2">Our Stars</h3>
                <div className="space-y-1.5">
                  <p className="text-white/80 text-xs leading-tight">Featured talent & success stories</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <RepresentationDialog open={showRepresentation} onOpenChange={setShowRepresentation} />
    </>
  );
};
