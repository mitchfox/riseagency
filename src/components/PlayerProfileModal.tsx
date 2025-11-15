import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import { FormationDisplay } from "@/components/FormationDisplay";

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

  // Safely parse bio - handle both JSON and plain text
  let parsedBio: any = {};
  if (playerData.bio) {
    try {
      // Try to parse as JSON first
      parsedBio = JSON.parse(playerData.bio);
    } catch {
      // If it fails, treat it as plain text
      parsedBio = { bio: playerData.bio };
    }
  }
  
  const seasonStats = parsedBio.seasonStats || [];
  const strengthsAndPlayStyle = parsedBio.strengthsAndPlayStyle || [];
  const tacticalFormations = parsedBio.tacticalFormations || parsedBio.schemeHistory?.map((scheme: any) => ({
    formation: scheme.formation,
    role: scheme.positions?.[0] || '',
    positions: scheme.positions || [],
    club: scheme.teamName,
    clubLogo: scheme.clubLogo,
    playerImage: scheme.playerImage,
    appearances: scheme.matches,
    matches: scheme.matches
  })) || [];
  const schemeHistory = parsedBio.schemeHistory || [];
  const externalLinks = parsedBio.externalLinks || [];
  const topStats = parsedBio.topStats || [];
  const dateOfBirth = parsedBio.dateOfBirth || null;
  const currentClub = parsedBio.currentClub || playerData.club || '';
  const currentClubLogo = parsedBio.currentClubLogo || playerData.club_logo || '';

  // Safely parse highlights - ensure it's an array
  let highlights: any[] = [];
  if (playerData.highlights) {
    if (Array.isArray(playerData.highlights)) {
      highlights = playerData.highlights;
    } else if (typeof playerData.highlights === 'object') {
      // If it's an object with a matchHighlights array, use that
      highlights = (playerData.highlights as any).matchHighlights || [];
    }
  }

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
              <h2 className="font-bebas text-4xl uppercase tracking-wider text-gold mb-4">
                {playerData.name}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-foreground/80">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Position:</span> {playerData.position}
                </div>
                {dateOfBirth && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Date of Birth:</span> {dateOfBirth} ({playerData.age})
                  </div>
                )}
                {!dateOfBirth && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Age:</span> {playerData.age}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Nationality:</span>
                  <img 
                    src={getCountryFlagUrl(playerData.nationality)} 
                    alt={playerData.nationality}
                    className="w-6 h-4 object-cover rounded"
                  />
                  {playerData.nationality}
                </div>
                {currentClub && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Current Club:</span>
                    {currentClubLogo && (
                      <img 
                        src={currentClubLogo} 
                        alt={currentClub}
                        className="w-6 h-6 object-contain"
                      />
                    )}
                    {currentClub}
                  </div>
                )}
              </div>

              {/* External Links */}
              {externalLinks.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {externalLinks.map((link: any, index: number) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-gold/10 hover:bg-gold/20 border border-gold/30 rounded-lg text-gold text-sm font-medium transition-colors"
                    >
                      {link.label}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              )}
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

          {/* Top Stats */}
          {topStats.length > 0 && (
            <div>
              <h3 className="font-bebas text-2xl uppercase tracking-wider text-gold mb-3">
                Key Statistics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {topStats.map((stat: any, index: number) => (
                  <div key={index} className="bg-muted/50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-gold">{stat.value}</div>
                    <div className="text-sm text-foreground/60 uppercase">{stat.label}</div>
                  </div>
                ))}
              </div>
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

          {/* Tactical Formations */}
          {tacticalFormations.length > 0 && (
            <div>
              <h3 className="font-bebas text-2xl uppercase tracking-wider text-gold mb-3">
                Career History & Formations
              </h3>
              <div className="space-y-4">
                {tacticalFormations.map((formation: any, index: number) => (
                  <div key={index} className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {formation.clubLogo && (
                          <img
                            src={formation.clubLogo}
                            alt={formation.club}
                            className="w-10 h-10 object-contain"
                          />
                        )}
                        <div>
                          <div className="font-semibold text-foreground">{formation.club}</div>
                          <div className="text-sm text-muted-foreground">
                            {formation.formation} - {Array.isArray(formation.positions) ? formation.positions.join(", ") : formation.role}
                          </div>
                        </div>
                      </div>
                      <div className="text-gold font-semibold">{formation.matches || formation.appearances}</div>
                    </div>
                    {formation.playerImage && (
                      <div className="mt-3">
                        <FormationDisplay
                          formation={formation.formation}
                          selectedPositions={Array.isArray(formation.positions) ? formation.positions : [formation.role]}
                          playerImage={formation.playerImage}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Career History */}
          {schemeHistory.length > 0 && tacticalFormations.length === 0 && (
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
          {highlights.length > 0 && (
            <div>
              <h3 className="font-bebas text-2xl uppercase tracking-wider text-gold mb-3">
                Match Highlights
              </h3>
              <div className="grid gap-4">
                {highlights.map((highlight: any, index: number) => (
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
