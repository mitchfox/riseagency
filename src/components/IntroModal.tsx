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
                  className="bg-gray-300 text-black hover:bg-gray-400 font-bebas uppercase tracking-wider px-5 py-2 text-xs w-full"
                >
                  Request Representation
                </Button>
                <Button 
                  onClick={handleEnterSite}
                  className="btn-shine font-bebas uppercase tracking-wider px-5 py-2 text-xs w-full"
                >
                  Enter Site
                </Button>
              </div>
            </div>

            {/* News Section - Bottom Left */}
            <div 
              onClick={() => {
                handleDialogChange(false);
                navigate("/news");
              }}
              className={`absolute left-6 bottom-6 w-[220px] bg-black/70 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden cursor-pointer hover:bg-black/80 transition-all ${currentSlide === "news" ? "animate-fade-in opacity-100" : "opacity-0 pointer-events-none"}`}
            >
              <img src="/news/mikie-mulligan-assist.png" alt="Latest News" className="w-full h-32 object-cover" />
              <div className="p-3">
                <h3 className="text-white font-bebas text-base uppercase tracking-wider mb-1">Latest News</h3>
                <p className="text-white/80 text-xs">Michael Mulligan Assist</p>
              </div>
            </div>

            {/* Our Stars Section - Bottom Left */}
            <div 
              onClick={() => {
                handleDialogChange(false);
                navigate("/stars");
              }}
              className={`absolute left-6 bottom-6 w-[220px] bg-black/70 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden cursor-pointer hover:bg-black/80 transition-all ${currentSlide === "stars" ? "animate-fade-in opacity-100" : "opacity-0 pointer-events-none"}`}
            >
              <img src="/players/michael-mulligan.png" alt="Our Stars" className="w-full h-32 object-cover" />
              <div className="p-3">
                <h3 className="text-white font-bebas text-base uppercase tracking-wider mb-1">Our Stars</h3>
                <p className="text-white/80 text-xs">Michael Mulligan</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <RepresentationDialog open={showRepresentation} onOpenChange={setShowRepresentation} />
    </>
  );
};
