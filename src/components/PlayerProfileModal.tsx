import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, MessageCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import { FormationDisplay } from "@/components/FormationDisplay";
import { useState, useEffect } from "react";

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
  const [currentFormationIndex, setCurrentFormationIndex] = useState(0);

  if (!playerData) return null;

  // Parse bio data
  let bioData: any = {};
  let bioText = '';
  let tacticalFormations: any[] = [];
  let highlights: any[] = [];
  
  if (playerData.bio) {
    try {
      const parsed = JSON.parse(playerData.bio);
      if (typeof parsed === 'object' && parsed !== null) {
        if (parsed.schemeHistory && Array.isArray(parsed.schemeHistory)) {
          tacticalFormations = parsed.schemeHistory.map((scheme: any) => ({
            formation: scheme.formation,
            role: scheme.positions?.[0] || '',
            positions: scheme.positions || [],
            club: scheme.teamName,
            clubLogo: scheme.clubLogo,
            playerImage: scheme.playerImage,
            appearances: scheme.matches,
            matches: scheme.matches
          }));
        } else if (parsed.tacticalFormations) {
          tacticalFormations = parsed.tacticalFormations;
        }
        
        bioData = {
          dateOfBirth: parsed.dateOfBirth,
          currentClub: parsed.currentClub,
          currentClubLogo: parsed.currentClubLogo,
          whatsapp: parsed.whatsapp,
          externalLinks: parsed.externalLinks || [],
          strengthsAndPlayStyle: parsed.strengthsAndPlayStyle || [],
          topStats: parsed.topStats || [],
          seasonStats: parsed.seasonStats || []
        };
        
        bioText = parsed.bio || '';
      }
    } catch (e) {
      console.error('Error parsing bio:', e);
    }
  }
  
  // Parse highlights
  if (playerData.highlights) {
    if (Array.isArray(playerData.highlights)) {
      highlights = playerData.highlights;
    } else if (typeof playerData.highlights === 'object') {
      highlights = (playerData.highlights as any).matchHighlights || [];
    }
  }

  const player = {
    ...playerData,
    ...bioData,
    bio: bioText,
    tacticalFormations,
    highlightsArray: highlights
  };

  // Auto-rotate tactical formations
  useEffect(() => {
    if (tacticalFormations && tacticalFormations.length > 0) {
      const interval = setInterval(() => {
        setCurrentFormationIndex((prev) => 
          (prev + 1) % tacticalFormations.length
        );
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [tacticalFormations]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-background p-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-50 text-foreground hover:text-foreground/80"
        >
          <X className="h-6 w-6" />
        </Button>

        <div className="p-4">
          {/* Player Name, Info, and Contact */}
          <div className="mb-4 relative border-2 border-[hsl(var(--gold))] bg-secondary/20 backdrop-blur-sm rounded-lg overflow-hidden">
            <div className="relative p-4 md:p-5">
              <div className="flex flex-wrap items-center gap-4 md:gap-6 lg:gap-8 mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--gold))]/20 via-[hsl(var(--gold))]/10 to-transparent blur-xl" />
                  <h1 className="relative text-2xl md:text-3xl font-bebas uppercase font-bold text-foreground leading-none tracking-wide whitespace-nowrap">
                    {player.name}
                  </h1>
                </div>
                
                <p className="text-lg md:text-xl text-muted-foreground uppercase tracking-wide font-bebas leading-none whitespace-nowrap">
                  {player.position}
                </p>
                
                {player.dateOfBirth && (
                  <p className="text-lg md:text-xl text-muted-foreground uppercase tracking-wide font-bebas leading-none flex items-center gap-2 whitespace-nowrap">
                    {player.dateOfBirth} <span className="text-muted-foreground/70">({player.age})</span>
                  </p>
                )}
                
                <p className="text-lg md:text-xl text-muted-foreground uppercase tracking-wide font-bebas leading-none flex items-center gap-2 whitespace-nowrap">
                  <img 
                    src={getCountryFlagUrl(player.nationality)} 
                    alt={player.nationality}
                    className="w-6 h-4 object-cover rounded"
                  />
                  {player.nationality}
                </p>
                
                {player.currentClub && (
                  <p className="text-lg md:text-xl text-muted-foreground uppercase tracking-wide font-bebas leading-none flex items-center gap-2 whitespace-nowrap">
                    <img 
                      src={player.currentClubLogo || player.tacticalFormations?.[0]?.clubLogo} 
                      alt={player.currentClub}
                      className="w-6 h-6 md:w-8 md:h-8 object-contain"
                    />
                    {player.currentClub}
                  </p>
                )}
              </div>

              <div className="w-full">
                <Button 
                  asChild
                  size="default"
                  className="btn-shine text-sm md:text-base font-bebas uppercase tracking-wider w-full md:w-auto"
                >
                  <a 
                    href={player.whatsapp ? `https://wa.me/${player.whatsapp.replace(/\+/g, '')}` : "https://wa.me/447508342901"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Enquire About This Player
                  </a>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Formation Display */}
            {tacticalFormations && tacticalFormations.length > 0 && (
              <div className="relative border-2 border-[hsl(var(--gold))] bg-secondary/20 backdrop-blur-sm rounded-lg overflow-hidden p-4">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {tacticalFormations[currentFormationIndex].clubLogo && (
                        <img 
                          src={tacticalFormations[currentFormationIndex].clubLogo}
                          alt={tacticalFormations[currentFormationIndex].club}
                          className="w-8 h-8 object-contain"
                        />
                      )}
                      <h3 className="font-bebas text-xl uppercase tracking-wider text-foreground">
                        {tacticalFormations[currentFormationIndex].club}
                      </h3>
                    </div>
                    <div className="text-sm text-muted-foreground font-bebas uppercase">
                      {tacticalFormations[currentFormationIndex].matches || 0} Matches • {tacticalFormations[currentFormationIndex].formation}
                    </div>
                  </div>
                </div>
                
                <FormationDisplay
                  selectedPositions={tacticalFormations[currentFormationIndex].positions || [tacticalFormations[currentFormationIndex].role]}
                  playerName={player.name}
                  playerImage={tacticalFormations[currentFormationIndex].playerImage || player.image_url}
                  formation={tacticalFormations[currentFormationIndex].formation}
                />
                
                <div className="flex justify-center gap-2 mt-4">
                  {tacticalFormations.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentFormationIndex(index)}
                      className={`w-3 h-3 rounded-full transition-all ${
                        index === currentFormationIndex
                          ? 'bg-[hsl(var(--gold))] scale-125'
                          : 'bg-[hsl(var(--gold))]/30 hover:bg-[hsl(var(--gold))]/50'
                      }`}
                      aria-label={`View formation ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Player Image */}
            <div className="relative border-2 border-[hsl(var(--gold))] bg-secondary/20 backdrop-blur-sm rounded-lg overflow-hidden aspect-[3/4]">
              <img 
                src={player.image_url || player.image}
                alt={player.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Bio Section */}
          {player.bio && (
            <div className="mb-4 p-4 md:p-5 border-2 border-[hsl(var(--gold))] bg-secondary/20 backdrop-blur-sm rounded-lg">
              <h2 className="text-xl md:text-2xl font-bebas uppercase text-foreground mb-3 tracking-wider">Bio</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {player.bio}
              </p>
            </div>
          )}

          {/* Top Stats */}
          {player.topStats && player.topStats.length > 0 && (
            <div className="mb-4 p-4 md:p-5 border-2 border-[hsl(var(--gold))] bg-secondary/20 backdrop-blur-sm rounded-lg">
              <h2 className="text-xl md:text-2xl font-bebas uppercase text-foreground mb-4 tracking-wider">Key Stats</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {player.topStats.map((stat: any, index: number) => (
                  <div key={index} className="text-center">
                    <p className="text-2xl md:text-3xl font-bold text-[hsl(var(--gold))]">{stat.value}</p>
                    <p className="text-xs md:text-sm text-muted-foreground uppercase tracking-wide font-bebas">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths and Play Style */}
          {player.strengthsAndPlayStyle && player.strengthsAndPlayStyle.length > 0 && (
            <div className="mb-4 p-4 md:p-5 border-2 border-[hsl(var(--gold))] bg-secondary/20 backdrop-blur-sm rounded-lg">
              <h2 className="text-xl md:text-2xl font-bebas uppercase text-foreground mb-3 tracking-wider">Strengths & Play Style</h2>
              <ul className="space-y-2">
                {player.strengthsAndPlayStyle.map((item: string, index: number) => (
                  <li key={index} className="text-sm md:text-base text-muted-foreground flex items-start gap-2">
                    <span className="text-[hsl(var(--gold))] mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Season Stats */}
          {player.seasonStats && player.seasonStats.length > 0 && (
            <div className="mb-4 p-4 md:p-5 border-2 border-[hsl(var(--gold))] bg-secondary/20 backdrop-blur-sm rounded-lg">
              <h2 className="text-xl md:text-2xl font-bebas uppercase text-foreground mb-4 tracking-wider">Season Stats</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--gold))]/30">
                      <th className="text-left py-2 px-2 font-bebas text-muted-foreground">Season</th>
                      <th className="text-center py-2 px-2 font-bebas text-muted-foreground">Apps</th>
                      <th className="text-center py-2 px-2 font-bebas text-muted-foreground">Goals</th>
                      <th className="text-center py-2 px-2 font-bebas text-muted-foreground">Assists</th>
                    </tr>
                  </thead>
                  <tbody>
                    {player.seasonStats.map((stat: any, index: number) => (
                      <tr key={index} className="border-b border-[hsl(var(--gold))]/10">
                        <td className="py-2 px-2 text-foreground">{stat.season}</td>
                        <td className="text-center py-2 px-2 text-muted-foreground">{stat.appearances}</td>
                        <td className="text-center py-2 px-2 text-muted-foreground">{stat.goals}</td>
                        <td className="text-center py-2 px-2 text-muted-foreground">{stat.assists}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* External Links */}
          {player.externalLinks && player.externalLinks.length > 0 && (
            <div className="mb-4 p-4 md:p-5 border-2 border-[hsl(var(--gold))] bg-secondary/20 backdrop-blur-sm rounded-lg">
              <h2 className="text-xl md:text-2xl font-bebas uppercase text-foreground mb-3 tracking-wider">Links</h2>
              <div className="flex flex-wrap gap-2">
                {player.externalLinks.map((link: any, index: number) => (
                  <Button
                    key={index}
                    asChild
                    variant="outline"
                    size="sm"
                    className="font-bebas uppercase tracking-wider border-[hsl(var(--gold))]/30"
                  >
                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-3 w-3" />
                      {link.label}
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Highlights */}
          {highlights && highlights.length > 0 && (
            <div className="p-4 md:p-5 border-2 border-[hsl(var(--gold))] bg-secondary/20 backdrop-blur-sm rounded-lg">
              <h2 className="text-xl md:text-2xl font-bebas uppercase text-foreground mb-4 tracking-wider">Match Highlights</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {highlights.map((highlight: any, index: number) => (
                  <div key={index} className="relative rounded-lg overflow-hidden border border-[hsl(var(--gold))]/30">
                    <video
                      controls
                      className="w-full aspect-video"
                      src={highlight.url}
                    >
                      Your browser does not support the video tag.
                    </video>
                    {highlight.title && (
                      <p className="p-2 text-sm text-muted-foreground bg-background/80">
                        {highlight.title}
                      </p>
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
