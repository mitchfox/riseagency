import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import { ArrowRight } from "lucide-react";

interface PlayerCardProps {
  player: any; // Changed from Player to any since we're using database structure
  viewMode?: "grid" | "list";
}

// Convert player name to URL slug
const createPlayerSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .trim()
    .replace(/\s+/g, '-'); // Replace spaces with hyphens
};

export const PlayerCard = ({ player, viewMode = "grid" }: PlayerCardProps) => {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [isInView, setIsInView] = useState(false);
  const playerSlug = createPlayerSlug(player.name);

  // Extract club info from player data
  const getClubInfo = () => {
    let currentClub = player.currentClub || "";
    let clubLogo = player.clubLogo || "";
    
    // Fallback to tactical formations if clubLogo not directly available
    if (!clubLogo && player.tacticalFormations && player.tacticalFormations[0]?.clubLogo) {
      clubLogo = player.tacticalFormations[0].clubLogo;
    }

    return { currentClub, clubLogo };
  };

  const { currentClub, clubLogo } = getClubInfo();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.5 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  if (viewMode === "list") {
    return (
      <Link
        ref={cardRef}
        to={`/stars/${playerSlug}`}
        className="group relative flex items-center gap-8 p-8 overflow-hidden transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {/* Hover and focus glow effect - desktop only */}
        <div className="absolute inset-0 opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-slide-glow" />
        </div>

        {/* Player Image - Larger */}
        <div className="relative w-48 h-64 flex-shrink-0 overflow-hidden">
          <img
            src={player.image_url || player.image}
            alt={player.name}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
              isInView ? "grayscale-0" : "grayscale"
            } md:grayscale md:group-hover:grayscale-0 ${
              player.hover_image_url ? 'md:group-hover:opacity-0' : ''
            }`}
          />
          {player.hover_image_url && (
            <img
              src={player.hover_image_url}
              alt={`${player.name} hover`}
              className="absolute inset-0 w-full h-full object-cover transition-all duration-700 opacity-0 md:group-hover:opacity-100"
            />
          )}
        {/* Position badge - top right, smaller on mobile */}
        <div className="absolute top-3 right-3">
          <span className="text-base md:text-xl text-primary tracking-wider" style={{ fontFamily: "'BBH Sans Bartle', 'Bebas Neue', sans-serif" }}>
            {player.position}
          </span>
        </div>
        </div>

        {/* Player Info */}
        <div className="flex-1 relative z-10">
          <h3 className="text-3xl font-bebas uppercase text-foreground tracking-wider">
            {player.name}
          </h3>
          <div className="flex gap-6 mt-3 text-sm font-bbh text-muted-foreground uppercase tracking-wide">
            <span>Age {player.age}</span>
            <span>{player.nationality}</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      ref={cardRef}
      to={`/stars/${playerSlug}`}
      className="group relative block overflow-hidden transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* Hover and focus glow effect - desktop only */}
      <div className="absolute inset-0 opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100 transition-opacity duration-500 pointer-events-none z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent animate-slide-glow" />
      </div>

      {/* Player Image */}
      <div className="relative aspect-[3/4] overflow-hidden">
        {/* Background Layer - base image */}
        <img
          src={player.image_url || player.image}
          alt={player.name}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 z-0 ${
            isInView ? "grayscale-0" : "grayscale"
          } md:grayscale md:group-hover:grayscale-0 ${
            player.hover_image_url ? 'md:group-hover:opacity-0' : ''
          }`}
        />
        
        {/* Hover Layer - transparent background image (shown on hover) */}
        {player.hover_image_url && (
          <img
            src={player.hover_image_url}
            alt={`${player.name} hover`}
            className="absolute inset-0 w-full h-full object-cover transition-all duration-700 z-10 opacity-0 md:group-hover:opacity-100"
          />
        )}
        {/* Position badge - top right, smaller on mobile */}
        <div className="absolute top-4 right-4 z-5">
          <span className="text-xl md:text-3xl text-primary tracking-wider" style={{ fontFamily: "'BBH Sans Bartle', 'Bebas Neue', sans-serif" }}>
            {player.position}
          </span>
        </div>

        {/* Hover Overlay - Key Info */}
        <div className="absolute inset-0 bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-6 z-10">
          {/* Top Section */}
          <div className="grid grid-cols-2 gap-4">
            {/* Age */}
            <div>
              <div className="text-5xl font-bebas text-primary mb-1">{player.age}</div>
              <div className="text-sm font-bebas uppercase text-white tracking-wider">Age</div>
            </div>
            
            {/* Nationality */}
            <div className="text-right">
              <div className="flex items-center justify-end gap-2 mb-1">
                <img 
                  src={getCountryFlagUrl(player.nationality)} 
                  alt={player.nationality}
                  className="w-8 h-6 object-cover rounded"
                />
                <span className="text-5xl font-bebas text-primary">
                  {player.nationality.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="text-sm font-bebas uppercase text-white tracking-wider">Nationality</div>
            </div>
          </div>

          {/* Bottom Section */}
          <div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Position */}
              <div>
                <div className="text-5xl font-bebas text-primary mb-1">{player.position}</div>
                <div className="text-sm font-bebas uppercase text-white tracking-wider">Position</div>
              </div>
              
              {/* Club */}
              <div className="flex flex-col items-center transition-transform duration-300 group-hover:translate-x-[30px]">
                <div className="mb-1">
                  {clubLogo && (
                    <img 
                      src={clubLogo} 
                      alt={currentClub}
                      className="h-12 w-12 object-contain"
                    />
                  )}
                  {!clubLogo && currentClub && (
                    <div className="text-3xl font-bebas text-primary">
                      {currentClub.substring(0, 3).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="text-sm font-bebas uppercase text-white tracking-wider">Club</div>
              </div>
            </div>

            {/* Profile Button */}
            <div className="bg-primary rounded-md py-3 px-4 flex items-center justify-center gap-2 transition-all hover:brightness-110">
              <span className="font-bebas uppercase tracking-wider text-black">Player Profile</span>
              <ArrowRight className="w-5 h-5 text-black" />
            </div>
          </div>
        </div>
      </div>

      {/* Player Info */}
      <div className="py-4 relative z-10">
        <h3 className="text-3xl font-bebas uppercase text-foreground tracking-wider">
          {player.name}
        </h3>
        <div className="flex justify-between items-center gap-4 mt-2">
          <div className="flex gap-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Age {player.age}</span>
            <span>•</span>
            <span>{player.nationality}</span>
          </div>
          {(clubLogo || currentClub) && (
            <div className="flex items-center gap-2">
              {clubLogo && (
                <img 
                  src={clubLogo} 
                  alt={currentClub}
                  className="h-6 w-6 object-contain"
                />
              )}
              {currentClub && (
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {currentClub}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};
