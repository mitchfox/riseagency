import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RepresentationDialog } from "@/components/RepresentationDialog";
import { useState } from "react";
import blackMarbleSmudged from "@/assets/black-marble-smudged.png";
import introImage from "@/assets/intro-reference.png";

interface IntroModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const IntroModal = ({ open, onOpenChange }: IntroModalProps) => {
  const [showRepresentation, setShowRepresentation] = useState(false);

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
          className="w-[min(90vw,1080px)] max-h-[98vh] p-0 border-primary/20 overflow-y-auto bg-transparent [&>button]:hidden sm:max-w-[1080px]"
        >
          <div className="relative flex flex-col">
            {/* Main Image */}
            <img 
              src={introImage} 
              alt="RISE Football - From Striving to Rising to Thriving" 
              className="w-full h-auto object-contain"
            />
            
            {/* Overlay Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8" style={{ backgroundImage: `url(${blackMarbleSmudged})`, backgroundSize: "cover" }}>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 md:gap-4">
                  <div className="text-center space-y-0.5">
                    <div className="text-lg md:text-2xl font-bebas uppercase tracking-wider text-gray-400">From</div>
                    <div className="text-xl md:text-3xl font-bebas uppercase tracking-wider text-gray-400">Striving</div>
                  </div>
                  <div className="text-center space-y-0.5">
                    <div className="text-lg md:text-2xl font-bebas uppercase tracking-wider text-white">To</div>
                    <div className="text-xl md:text-3xl font-bebas uppercase tracking-wider text-white">Rising</div>
                  </div>
                  <div className="text-center space-y-0.5">
                    <div className="text-lg md:text-2xl font-bebas uppercase tracking-wider text-primary">To</div>
                    <div className="text-xl md:text-3xl font-bebas uppercase tracking-wider text-primary">Thriving</div>
                  </div>
                </div>
                <p className="text-sm md:text-base text-white/90 leading-relaxed max-w-2xl mx-auto">
                  We take pride in scouting across the entirety of professional football in Europe and have guided many Premier League players to success through their development journey.
                </p>
                
                {/* Gold Line Separator */}
                <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent my-6"></div>
                
                {/* Buttons */}
                <div className="flex flex-row gap-3 justify-center items-center">
                  <Button 
                    onClick={handleRequestRepresentation}
                    className="bg-gray-300 text-black hover:bg-gray-400 font-bebas uppercase tracking-wider px-4 md:px-6 py-2 text-xs md:text-sm flex-1 max-w-[180px]"
                  >
                    Request Representation
                  </Button>
                  <Button 
                    onClick={handleEnterSite}
                    className="btn-shine font-bebas uppercase tracking-wider px-4 md:px-6 py-2 text-xs md:text-sm flex-1 max-w-[180px]"
                  >
                    Enter Site
                  </Button>
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
