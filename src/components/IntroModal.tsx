import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RepresentationDialog } from "@/components/RepresentationDialog";
import { useState } from "react";
import blackMarble from "@/assets/black-marble-bg.png";
import riseStarIcon from "@/assets/rise-star-icon.png";
import omotoyeJourney from "@/assets/omotoye-journey.jpg";
import logo from "@/assets/logo.png";

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
          className="max-w-md p-0 border-primary/20 overflow-hidden bg-transparent"
        >
          {/* Journey Graphic with Overlayed Buttons */}
          <div className="relative overflow-hidden">
            <img 
              src={omotoyeJourney} 
              alt="Player journey from youth to professional" 
              className="w-full h-auto"
            />
            
            {/* Overlayed CTAs - Top Corners */}
            <div className="absolute top-3 left-3 right-3 flex justify-between items-start gap-2">
              <Button 
                size="sm"
                variant="outline"
                onClick={handleRequestRepresentation}
                className="text-xs font-bebas uppercase tracking-wider px-3 py-2 border-primary/50 text-white hover:bg-primary/20 backdrop-blur-sm flex-1"
              >
                Request Representation
              </Button>
              <Button 
                size="sm" 
                onClick={handleEnterSite}
                className="btn-shine text-xs font-bebas uppercase tracking-wider px-3 py-2 flex-1"
              >
                Enter Site
              </Button>
            </div>
          </div>

          {/* Text Content */}
          <div className="p-4 md:p-6" style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: "cover" }}>
            <div className="text-center space-y-3">
              <img 
                src={logo} 
                alt="RISE Football" 
                className="h-12 md:h-16 mx-auto mb-2"
              />
              <h2 className="text-xl md:text-2xl font-bebas uppercase tracking-wider text-white">
                Welcome to <span className="text-primary">RISE Football</span>
              </h2>
              <p className="text-xs md:text-sm text-white/90 leading-snug">
                We have worked with many <span className="text-primary font-semibold">Premier League players</span> throughout their development.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <RepresentationDialog open={showRepresentation} onOpenChange={setShowRepresentation} />
    </>
  );
};
