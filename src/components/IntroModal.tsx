import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RepresentationDialog } from "@/components/RepresentationDialog";
import { useState } from "react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import blackMarbleSmudged from "@/assets/black-marble-smudged.png";
import omotoyeJourney from "@/assets/omotoye-journey.jpg";
import trophySilhouette from "@/assets/player-trophy-silhouette.jpg";
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
          className="max-w-2xl p-0 border-primary/20 overflow-hidden bg-transparent [&>button]:hidden"
        >
          <Carousel className="w-full">
            <CarouselContent>
              {/* Slide 1: Striving - Journey Image 1 with Request Representation */}
              <CarouselItem>
                <div className="relative overflow-hidden">
                  <img 
                    src={omotoyeJourney} 
                    alt="From striving" 
                    className="w-full h-auto"
                  />
                  <div className="absolute top-3 left-0 right-0 flex justify-center px-3">
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={handleRequestRepresentation}
                      className="text-xs font-bebas uppercase tracking-wider px-3 py-2 border-primary/50 text-white hover:bg-primary/20 backdrop-blur-sm"
                    >
                      Request Representation
                    </Button>
                  </div>
                  <div className="absolute bottom-8 left-0 right-0 flex justify-center px-3">
                    <h3 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                      From Striving
                    </h3>
                  </div>
                </div>
              </CarouselItem>

              {/* Slide 2: Rising - Journey Image 2 with RISE Logo */}
              <CarouselItem>
                <div className="relative overflow-hidden">
                  <img 
                    src={omotoyeJourney} 
                    alt="To rising" 
                    className="w-full h-auto"
                  />
                  <div className="absolute top-3 left-0 right-0 flex justify-center px-3">
                    <img 
                      src={logo} 
                      alt="RISE Football" 
                      className="h-12 md:h-16"
                    />
                  </div>
                  <div className="absolute bottom-8 left-0 right-0 flex justify-center px-3">
                    <h3 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                      To Rising
                    </h3>
                  </div>
                </div>
              </CarouselItem>

              {/* Slide 3: Thriving - Trophy Silhouette with Enter Site */}
              <CarouselItem>
                <div className="relative overflow-hidden">
                  <img 
                    src={trophySilhouette} 
                    alt="To thriving" 
                    className="w-full h-auto"
                  />
                  <div className="absolute top-3 left-0 right-0 flex justify-center px-3">
                    <Button 
                      size="sm" 
                      onClick={handleEnterSite}
                      className="btn-shine text-xs font-bebas uppercase tracking-wider px-3 py-2"
                    >
                      Enter Site
                    </Button>
                  </div>
                  <div className="absolute bottom-8 left-0 right-0 flex justify-center px-3">
                    <h3 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                      To Thriving
                    </h3>
                  </div>
                </div>
              </CarouselItem>
            </CarouselContent>
          </Carousel>

          {/* Text Content */}
          <div className="p-4 md:p-6" style={{ backgroundImage: `url(${blackMarbleSmudged})`, backgroundSize: "cover" }}>
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
