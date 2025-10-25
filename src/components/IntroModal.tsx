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
          className="w-[min(90vw,1080px)] max-h-[90vh] p-0 border-primary/20 overflow-hidden bg-transparent [&>button]:hidden"
        >
          <div className="relative">
            {/* Main Image */}
            <img 
              src={introImage} 
              alt="RISE Football - From Striving to Rising to Thriving" 
              className="w-full h-auto"
            />
            
            {/* Overlay Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8" style={{ backgroundImage: `url(${blackMarbleSmudged})`, backgroundSize: "cover" }}>
              <div className="text-center space-y-4">
                <h2 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider text-white">
                  From Striving. To Rising. To Thriving.
                </h2>
                <p className="text-sm md:text-base text-white/90 leading-relaxed max-w-xl mx-auto">
                  We have worked with many <span className="text-primary font-semibold">Premier League players</span> throughout their development journey.
                </p>
                
                {/* Gold Line Separator */}
                <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent my-6"></div>
                
                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                  <Button 
                    variant="outline"
                    onClick={handleRequestRepresentation}
                    className="font-bebas uppercase tracking-wider px-6 py-2 border-primary/50 text-white hover:bg-white/10 hover:border-white/70 backdrop-blur-sm"
                  >
                    Request Representation
                  </Button>
                  <Button 
                    onClick={handleEnterSite}
                    className="btn-shine font-bebas uppercase tracking-wider px-6 py-2"
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
