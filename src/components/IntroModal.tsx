import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RepresentationDialog } from "@/components/RepresentationDialog";
import { useState } from "react";
import blackMarbleSmudged from "@/assets/black-marble-smudged.png";
import introImage from "@/assets/intro-modal-new.png";

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
          className="w-[1080px] h-[1300px] max-w-[90vw] max-h-[90vh] p-0 border-primary/20 bg-transparent [&>button]:hidden overflow-hidden"
          aria-describedby="intro-modal-description"
        >
          <div className="relative w-full h-full">
            {/* Main Image - Fixed dimensions, no stretching */}
            <img 
              src={introImage} 
              alt="RISE Football - From Striving to Rising to Thriving" 
              className="w-full h-full object-cover"
            />
            
            {/* Overlay Content - Top Left */}
            <div className="absolute top-8 left-8 right-8 max-w-md">
              <p id="intro-modal-description" className="text-sm text-white/90 leading-relaxed mb-4">
                We scout across the entirety of professional football in Europe and have guided many Premier League players to success through their development journey to RISE through the game and realise potential.
              </p>
              
              {/* Buttons */}
              <div className="flex flex-row gap-3">
                <Button 
                  onClick={handleRequestRepresentation}
                  className="bg-gray-300 text-black hover:bg-gray-400 font-bebas uppercase tracking-wider px-4 py-2 text-xs"
                >
                  Request Representation
                </Button>
                <Button 
                  onClick={handleEnterSite}
                  className="btn-shine font-bebas uppercase tracking-wider px-4 py-2 text-xs"
                >
                  Enter Site
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <RepresentationDialog open={showRepresentation} onOpenChange={setShowRepresentation} />
    </>
  );
};
