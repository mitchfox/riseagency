import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  } | null;
}

const PlayerProfileModal = ({ open, onOpenChange, playerData }: PlayerProfileModalProps) => {
  if (!playerData) return null;

  const parsedBio = playerData.bio ? JSON.parse(playerData.bio) : {};
  const seasonStats = parsedBio.seasonStats || [];
  const strengthsAndPlayStyle = parsedBio.strengthsAndPlayStyle || [];
  const tacticalFormations = parsedBio.tacticalFormations || [];
  const schemeHistory = parsedBio.schemeHistory || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="font-bebas text-3xl uppercase tracking-wider text-gold flex items-center justify-between">
            Player Profile
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-gold hover:text-gold/80"
            >
              <X className="h-6 w-6" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <img
              src={playerData.image_url}
              alt={playerData.name}
              className="w-48 h-48 object-cover rounded-lg"
            />
            <div className="flex-1">
              <h2 className="font-bebas text-4xl uppercase tracking-wider text-gold mb-2">
                {playerData.name}
              </h2>
              <div className="grid grid-cols-2 gap-4 text-foreground/80">
                <div>
                  <span className="font-semibold">Position:</span> {playerData.position}
                </div>
                <div>
                  <span className="font-semibold">Age:</span> {playerData.age}
                </div>
                <div>
                  <span className="font-semibold">Nationality:</span> {playerData.nationality}
                </div>
                {parsedBio.currentClub && (
                  <div>
                    <span className="font-semibold">Current Club:</span> {parsedBio.currentClub}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {parsedBio.bio && (
            <div>
              <h3 className="font-bebas text-2xl uppercase tracking-wider text-gold mb-3">
                Biography
              </h3>
              <p className="text-foreground/80 leading-relaxed">{parsedBio.bio}</p>
            </div>
          )}

          {/* Season Stats */}
          {seasonStats.length > 0 && (
            <div>
              <h3 className="font-bebas text-2xl uppercase tracking-wider text-gold mb-3">
                Season Statistics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {seasonStats.map((stat: any, index: number) => (
                  <div key={index} className="bg-muted/50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-gold">{stat.value}</div>
                    <div className="text-sm text-foreground/60 uppercase">{stat.header}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          {strengthsAndPlayStyle.length > 0 && (
            <div>
              <h3 className="font-bebas text-2xl uppercase tracking-wider text-gold mb-3">
                Strengths & Play Style
              </h3>
              <ul className="space-y-2">
                {strengthsAndPlayStyle.map((strength: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-foreground/80">
                    <span className="text-gold">•</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Career History */}
          {schemeHistory.length > 0 && (
            <div>
              <h3 className="font-bebas text-2xl uppercase tracking-wider text-gold mb-3">
                Career History
              </h3>
              <div className="space-y-3">
                {schemeHistory.map((club: any, index: number) => (
                  <div key={index} className="flex items-center gap-4 bg-muted/50 p-4 rounded-lg">
                    {club.clubLogo && (
                      <img
                        src={club.clubLogo}
                        alt={club.teamName}
                        className="w-12 h-12 object-contain"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">{club.teamName}</div>
                      <div className="text-sm text-foreground/60">
                        {club.formation} - {club.positions?.join(", ")}
                      </div>
                    </div>
                    <div className="text-gold font-semibold">{club.matches}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Highlights */}
          {playerData.highlights && playerData.highlights.length > 0 && (
            <div>
              <h3 className="font-bebas text-2xl uppercase tracking-wider text-gold mb-3">
                Match Highlights
              </h3>
              <div className="grid gap-4">
                {playerData.highlights.map((highlight: any, index: number) => (
                  <div key={index} className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      {highlight.clubLogo && (
                        <img
                          src={highlight.clubLogo}
                          alt={highlight.name}
                          className="w-8 h-8 object-contain"
                        />
                      )}
                      <span className="font-semibold text-foreground">{highlight.name}</span>
                    </div>
                    {highlight.videoUrl && (
                      <video
                        controls
                        className="w-full rounded-lg"
                        src={highlight.videoUrl}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerProfileModal;
