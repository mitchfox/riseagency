import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RepresentationDialog } from "@/components/RepresentationDialog";
import { useState } from "react";
import blackMarble from "@/assets/black-marble-bg.png";
import riseStarIcon from "@/assets/rise-star-icon.png";
import omotoyeJourney from "@/assets/omotoye-journey.jpg";

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
          className="max-w-xl p-0 border-primary/20 overflow-hidden bg-transparent"
          style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: "cover" }}
        >
          <div className="relative p-6 md:p-8 space-y-6">
            {/* Logo/Icon */}
            <div className="flex justify-center">
              <img 
                src={riseStarIcon} 
                alt="RISE Football" 
                className="w-16 h-16 object-contain"
              />
            </div>

            {/* Heading */}
            <div className="text-center space-y-3">
              <h2 className="text-3xl md:text-4xl font-bebas uppercase tracking-wider text-white">
                Welcome to <span className="text-primary">RISE Football</span>
              </h2>
              <p className="text-base md:text-lg text-white/90 leading-relaxed">
                We train the best young players and guide them to the top with individualised training and career guidance.
              </p>
            </div>

            {/* Journey Graphic */}
            <div className="relative overflow-hidden rounded-lg border border-primary/30">
              <img 
                src={omotoyeJourney} 
                alt="Player journey from youth to professional" 
                className="w-full h-auto"
              />
            </div>

            {/* Key Points */}
            <div className="space-y-3 text-white/80 text-center">
              <p className="text-sm md:text-base">
                We have worked with many <span className="text-primary font-semibold">Premier League players</span> throughout their development.
              </p>
              <p className="text-sm md:text-base italic">
                If you're a professional player or youth academy player in Europe, the chances are we have already scouted you.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
              <Button 
                size="default" 
                onClick={handleEnterSite}
                className="btn-shine text-lg font-bebas uppercase tracking-wider px-6 py-5 w-full sm:w-auto"
              >
                Enter Site
              </Button>
              <Button 
                size="default"
                variant="outline"
                onClick={handleRequestRepresentation}
                className="text-lg font-bebas uppercase tracking-wider px-6 py-5 border-primary/50 text-white hover:bg-primary/20 w-full sm:w-auto"
              >
                Request Representation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <RepresentationDialog open={showRepresentation} onOpenChange={setShowRepresentation} />
    </>
  );
};
