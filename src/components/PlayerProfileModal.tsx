import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCountryFlagUrl } from "@/lib/countryFlags";

interface PlayerProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerData: {
    name: string;
    position: string;
    age: number;
    nationality: string;
    image_url: string;
    bio: string;
    highlights: any[];
    club?: string;
    club_logo?: string;
  } | null;
}

const PlayerProfileModal = ({ open, onOpenChange, playerData }: PlayerProfileModalProps) => {
  if (!playerData) return null;

  const currentClub = playerData.club || '';
  const currentClubLogo = playerData.club_logo || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="font-bebas text-3xl uppercase tracking-wider text-primary flex items-center justify-between">
            Player Profile
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-primary hover:text-primary/80"
            >
              <X className="h-6 w-6" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Player Card - Same style as Stars page */}
          <div className="relative">
            <img
              src={playerData.image_url}
              alt={playerData.name}
              className="w-full h-96 object-cover"
            />
            
            {/* Position badge - top right */}
            <div className="absolute top-4 right-4">
              <span className="text-2xl text-primary tracking-wider font-bebas">
                {playerData.position}
              </span>
            </div>

            {/* Player info overlay - bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/90 to-transparent p-6">
              <h2 className="text-4xl font-bebas uppercase text-foreground tracking-wider mb-2">
                {playerData.name}
              </h2>
              
              <div className="flex items-center gap-6 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <img 
                    src={getCountryFlagUrl(playerData.nationality)} 
                    alt={playerData.nationality}
                    className="w-6 h-4 object-cover"
                  />
                  <span className="text-sm uppercase tracking-wide font-bbh">
                    {playerData.nationality}
                  </span>
                </div>
                
                <span className="text-sm uppercase tracking-wide font-bbh">
                  Age {playerData.age}
                </span>

                {currentClub && (
                  <div className="flex items-center gap-2">
                    {currentClubLogo && (
                      <img 
                        src={currentClubLogo} 
                        alt={currentClub}
                        className="w-6 h-6 object-contain"
                      />
                    )}
                    <span className="text-sm uppercase tracking-wide font-bbh">
                      {currentClub}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerProfileModal;
