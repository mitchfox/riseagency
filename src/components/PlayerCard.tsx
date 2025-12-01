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

  // Extract club info from player data - use correct database field names
  const currentClub = player.club || player.currentClub || "";
  const clubLogo = player.club_logo || player.clubLogo || "";

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
    // Parse bio for display
    let bioText = "";
    if (player.bio) {
      try {
        const parsed = JSON.parse(player.bio);
        if (typeof parsed === 'object' && parsed !== null) {
          bioText = parsed.overview || parsed.description || "";
        }
      } catch {
        bioText = typeof player.bio === 'string' ? player.bio : "";
      }
    }
    // Truncate bio
    const truncatedBio = bioText.length > 150 ? bioText.substring(0, 150) + "..." : bioText;

    return (
      <Link
        ref={cardRef}
        to={`/stars/${playerSlug}`}
        className="group relative flex items-center gap-6 p-6 overflow-hidden transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary hover:bg-primary/5"
      >
        {/* Player Image */}
        <div className="relative w-24 h-32 flex-shrink-0 overflow-hidden rounded-lg">
          <img
            src={player.image_url || player.image}
            alt={player.name}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
              isInView ? "grayscale-0" : "grayscale"
            } md:grayscale md:group-hover:grayscale-0`}
          />
          {/* Position badge */}
          <div className="absolute top-2 right-2">
            <span className="text-sm text-primary tracking-wider font-bebas bg-black/60 px-1.5 py-0.5 rounded">
              {player.position}
            </span>
          </div>
        </div>

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-2xl font-bebas uppercase text-foreground tracking-wider group-hover:text-primary transition-colors">
              {player.name}
            </h3>
            {/* Club Logo */}
            {clubLogo && (
              <img 
                src={clubLogo} 
                alt={currentClub}
                className="h-6 w-6 object-contain"
              />
            )}
          </div>
          
          <div className="flex gap-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            <span>Age {player.age}</span>
            <span>•</span>
            <span>{player.nationality}</span>
            {currentClub && (
              <>
                <span>•</span>
                <span>{currentClub}</span>
              </>
            )}
          </div>

          {/* Bio Text */}
          {truncatedBio && (
            <p className="text-sm text-muted-foreground line-clamp-2 max-w-2xl">
              {truncatedBio}
            </p>
          )}
        </div>

        {/* View Profile Button */}
        <div className="flex-shrink-0">
          <div className="bg-primary rounded-md py-2 px-4 flex items-center gap-2 transition-all group-hover:brightness-110">
            <span className="font-bebas uppercase tracking-wider text-black text-sm">View Profile</span>
            <ArrowRight className="w-4 h-4 text-black" />
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
        
        {/* Position badge - top right, smaller on mobile */}
        <div className="absolute top-4 right-4 z-[5]">
          <span className="text-xl md:text-3xl text-primary tracking-wider" style={{ fontFamily: "'BBH Sans Bartle', 'Bebas Neue', sans-serif" }}>
            {player.position}
          </span>
        </div>

        {/* Hover Background - Black shade */}
        <div className="absolute inset-0 bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />
        
        {/* Hover Layer - transparent background image (shown on hover) */}
        {player.hover_image_url && (
          <img
            src={player.hover_image_url}
            alt={`${player.name} hover`}
            className="absolute inset-0 w-full h-full object-cover transition-all duration-700 z-20 opacity-0 md:group-hover:opacity-100"
          />
        )}

        {/* Hover Overlay - Key Info (in front of everything) */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-6 z-30">
          {/* Top Section - Age (left) and Nationality (right) */}
          <div className="flex justify-between items-start">
            {/* Age - Top Left */}
            <div className="flex flex-col items-center">
              <div className="h-12 flex items-center">
                <span className="text-5xl font-bebas text-primary translate-y-[3px]">{player.age}</span>
              </div>
              <div className="text-sm font-bebas uppercase text-white tracking-wider mt-1">Age</div>
            </div>
            
            {/* Nationality - Top Right */}
            <div className="flex flex-col items-center">
              <div className="h-12 flex items-center">
                <img 
                  src={getCountryFlagUrl(player.nationality)} 
                  alt={player.nationality}
                  className="w-14 h-10 object-cover rounded"
                />
              </div>
              <div className="text-sm font-bebas uppercase text-white tracking-wider mt-1">Nationality</div>
            </div>
          </div>

          {/* Bottom Section */}
          <div>
            {/* Position (left) and Club (right) */}
            <div className="flex justify-between mb-6">
              {/* Position - Bottom Left */}
              <div className="flex flex-col items-center">
                <div className="text-5xl font-bebas text-primary mb-1 translate-y-1.5">{player.position}</div>
                <div className="text-sm font-bebas uppercase text-white tracking-wider">Position</div>
              </div>
              
              {/* Club - Bottom Right */}
              <div className="flex flex-col items-center">
                {clubLogo ? (
                  <img 
                    src={clubLogo} 
                    alt={currentClub}
                    className="h-12 w-12 object-contain mb-1"
                  />
                ) : currentClub ? (
                  <div className="text-3xl font-bebas text-primary mb-1">
                    {currentClub.substring(0, 3).toUpperCase()}
                  </div>
                ) : (
                  <div className="h-12 mb-1" />
                )}
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
