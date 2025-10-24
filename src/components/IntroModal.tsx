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

  const handleEnterSite = () => {
    onOpenChange(false);
    localStorage.setItem("intro-modal-seen", "true");
  };

  const handleRequestRepresentation = () => {
    onOpenChange(false);
    localStorage.setItem("intro-modal-seen", "true");
    setShowRepresentation(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="max-w-3xl p-0 border-primary/20 overflow-hidden bg-transparent"
          style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: "cover" }}
        >
          <div className="relative p-8 md:p-12 space-y-8">
            {/* Logo/Icon */}
            <div className="flex justify-center">
              <img 
                src={riseStarIcon} 
                alt="RISE Football" 
                className="w-24 h-24 object-contain"
              />
            </div>

            {/* Heading */}
            <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider text-white">
                Welcome to <span className="text-primary">RISE Football</span>
              </h2>
              <p className="text-lg md:text-xl text-white/90 leading-relaxed max-w-2xl mx-auto">
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
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <p className="text-white text-sm md:text-base font-bebas uppercase tracking-wider text-center">
                  From Grassroots → Premier League
                </p>
              </div>
            </div>

            {/* Key Points */}
            <div className="space-y-4 text-white/80 text-center max-w-xl mx-auto">
              <p className="text-base md:text-lg">
                We have worked with many <span className="text-primary font-semibold">Premier League players</span> throughout their development.
              </p>
              <p className="text-base md:text-lg italic">
                If you're a professional player or youth academy player in Europe, the chances are we have already scouted you.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button 
                size="lg" 
                onClick={handleEnterSite}
                className="btn-shine text-xl font-bebas uppercase tracking-wider px-8 py-6 w-full sm:w-auto"
              >
                Enter Site
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={handleRequestRepresentation}
                className="text-xl font-bebas uppercase tracking-wider px-8 py-6 border-primary/50 text-white hover:bg-primary/20 w-full sm:w-auto"
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
