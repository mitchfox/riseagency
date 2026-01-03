import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LazyImage } from "@/components/LazyImage";
import { useTranslatedBio } from "@/hooks/usePlayerTranslations";
import { Skeleton } from "@/components/ui/skeleton";

interface PlayerCardProps {
  player: any; // Changed from Player to any since we're using database structure
  viewMode?: "grid" | "list";
  disableProfileLink?: boolean;
  isStarsPage?: boolean; // Stars page shows "View Profile" on hover instead of "Declare Interest"
}

// Convert player name to URL slug
const createPlayerSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .trim()
    .replace(/\s+/g, '-'); // Replace spaces with hyphens
};

export const PlayerCard = ({ player, viewMode = "grid", disableProfileLink = false, isStarsPage = false }: PlayerCardProps) => {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const playerSlug = createPlayerSlug(player.name);
  const { t } = useLanguage();

  // Extract club info from player data - use correct database field names
  const currentClub = player.club || player.currentClub || "";
  const clubLogo = player.club_logo || player.clubLogo || "";
  const currentLeague = player.league || "";
  
  // Get translated position abbreviation
  const positionKey = player.position?.toUpperCase() || '';
  const translatedPosition = t(`positions.${positionKey}`, positionKey);

  // Parse bio for display and extract DOB (needed for both views now for translation)
  let bioText = "";
  let dateOfBirth = "";
  if (player.bio) {
    try {
      const parsed = JSON.parse(player.bio);
      if (typeof parsed === 'object' && parsed !== null) {
        bioText = parsed.bio || parsed.overview || parsed.description || "";
        dateOfBirth = parsed.dateOfBirth || parsed.dob || "";
      }
    } catch {
      bioText = typeof player.bio === 'string' ? player.bio : "";
    }
  }

  // Translate bio for list view
  const { translatedBio, isLoading: isBioLoading } = useTranslatedBio(bioText, player.id);

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
    // Format DOB with age
    const dobDisplay = dateOfBirth ? `${dateOfBirth} (${player.age})` : `Age ${player.age}`;

    const listClassName = `group relative flex items-start gap-8 p-8 overflow-hidden transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary hover:bg-card border-b border-border last:border-b-0 hover:!border-primary hover:!border-4 ${disableProfileLink ? '' : 'cursor-pointer'}`;

    const listContent = (
      <>
        {/* Player Image */}
        <div className="relative w-32 h-44 flex-shrink-0 overflow-hidden rounded-lg shadow-lg">
          <LazyImage
            src={player.image_url || `/lovable-uploads/${player.name.toLowerCase().replace(/\s+/g, '-')}.png`}
            alt={player.name}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
              isInView ? "grayscale-0" : "grayscale"
            } md:grayscale md:group-hover:grayscale-0`}
          />
        </div>

        {/* Player Info */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <div>
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="text-4xl font-bebas uppercase text-foreground tracking-wider group-hover:text-primary transition-colors leading-none">
                {player.name}
              </h3>
              {/* Club Info */}
              {(clubLogo || currentClub) && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {clubLogo && (
                    <img 
                      src={clubLogo} 
                      alt={currentClub}
                      className="h-8 w-8 object-contain"
                    />
                  )}
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {currentClub}
                    </span>
                    {currentLeague && (
                      <span className="text-xs text-muted-foreground/70">
                        {currentLeague}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              <span>{translatedPosition}</span>
              <span>•</span>
              <span>{dobDisplay}</span>
              <span>•</span>
              <span>{player.nationality}</span>
            </div>

            {/* Bio Text - exactly 3 lines with ellipsis */}
            {translatedBio ? (
              <p className={`text-sm text-muted-foreground leading-relaxed line-clamp-3 transition-opacity duration-300 ${isBioLoading ? 'opacity-70' : 'opacity-100'}`}>
                {translatedBio}
              </p>
            ) : null}
          </div>
        </div>
      </>
    );

    if (disableProfileLink) {
      return (
        <div ref={cardRef as any} className={listClassName}>
          {listContent}
        </div>
      );
    }

    return (
      <Link ref={cardRef} to={`/stars/${playerSlug}`} className={listClassName}>
        {listContent}
      </Link>
    );
  }

  // WhatsApp link for Declare Interest - always send to Rise Football Agency
  const whatsappMessage = encodeURIComponent(`Hey, I'm interested in ${player.name}`);
  const whatsappLink = `https://wa.me/447508342901?text=${whatsappMessage}`;

  const gridClassName = "group relative block overflow-hidden transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary";

  const gridContent = (
    <>
      {/* Hover and focus glow effect - desktop and mobile */}
      <div className={`absolute inset-0 transition-opacity duration-500 pointer-events-none z-10 ${
        isTouched ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100'
      }`}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent animate-slide-glow" />
      </div>

      {/* Player Image */}
      <div className="relative aspect-[3/4] overflow-hidden">
        {/* Background Layer - base image */}
        <LazyImage
          src={player.image_url || `/lovable-uploads/${player.name.toLowerCase().replace(/\s+/g, '-')}.png`}
          alt={player.name}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 z-0 ${
            isInView ? "grayscale-0" : "grayscale"
          } md:grayscale ${isTouched || 'md:group-hover:grayscale-0'} ${
            player.hover_image_url ? (isTouched ? 'opacity-0' : 'md:group-hover:opacity-0') : ''
          }`}
        />
        
        {/* Position badge - top right, smaller on mobile */}
        <div className="absolute top-4 right-4 z-[5]">
          <span className="text-xl md:text-3xl text-primary tracking-wider" style={{ fontFamily: "'BBH Sans Bartle', 'Bebas Neue', sans-serif" }}>
            {translatedPosition}
          </span>
        </div>

        {/* Hover Background - Black shade */}
        <div className={`absolute inset-0 bg-black/90 transition-opacity duration-300 z-10 ${
          isTouched ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`} />
        
        {/* Hover Layer - transparent background image (shown on hover) */}
        {player.hover_image_url && (
          <LazyImage
            src={player.hover_image_url}
            alt={`${player.name} hover`}
            disableLoadingTransition
            className={`absolute inset-0 w-full h-full object-cover object-bottom transition-all duration-700 z-20 ${
              isTouched ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'
            }`}
          />
        )}

        {/* Hover Overlay - Key Info (in front of everything) */}
        <div className={`absolute inset-0 transition-opacity duration-300 flex flex-col justify-between p-6 z-30 ${
          isTouched ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          {/* Top Section - Age (left) and Nationality (right) */}
          <div className="flex justify-between items-start">
            {/* Age - Top Left */}
            <div className="flex flex-col items-center">
              <div className="h-12 flex items-center">
                <span className="text-5xl font-bebas text-primary translate-y-[3px]">{player.age}</span>
              </div>
              <div className="text-sm font-bebas uppercase text-white tracking-wider mt-1">{t('player_card.age_label', 'Age')}</div>
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
              <div className="text-sm font-bebas uppercase text-white tracking-wider mt-1">{t('player_card.nationality_label', 'Nationality')}</div>
            </div>
          </div>

          {/* Bottom Section */}
          <div>
            {/* Position (left) and Club (right) */}
            <div className="flex justify-between mb-6">
              {/* Position - Bottom Left */}
              <div className="flex flex-col items-center">
                <div className="text-5xl font-bebas text-primary mb-1 translate-y-1.5">{translatedPosition}</div>
                <div className="text-sm font-bebas uppercase text-white tracking-wider">{t('player_card.position_label', 'Position')}</div>
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
                <div className="text-sm font-bebas uppercase text-white tracking-wider">{t('player_card.club_label', 'Club')}</div>
              </div>
            </div>

            {/* Stars page: View Profile link | Players list: Declare Interest */}
            {isStarsPage ? (
              <Link 
                to={`/stars/${playerSlug}`}
                onClick={(e) => e.stopPropagation()}
                className="bg-primary rounded-md py-3 px-4 flex items-center justify-center gap-2 transition-all hover:brightness-110"
              >
                <span className="font-bebas uppercase tracking-wider text-black">{t('player_card.view_profile', 'View Profile')}</span>
                <ArrowRight className="w-5 h-5 text-black" />
              </Link>
            ) : (
              <a 
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="bg-primary rounded-md py-3 px-4 flex items-center justify-center gap-2 transition-all hover:brightness-110"
              >
                <span className="font-bebas uppercase tracking-wider text-black">{t('player_card.declare_interest', 'Declare Interest')}</span>
                <ArrowRight className="w-5 h-5 text-black" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Player Info */}
      <div className="py-4 relative z-10">
        <h3 className="text-3xl font-bebas uppercase text-foreground tracking-wider">
          {player.name}
        </h3>
        {(clubLogo || currentClub) && (
          <div className="flex items-center gap-3 mt-3">
            {clubLogo && (
              <img 
                src={clubLogo} 
                alt={currentClub}
                className="h-10 w-10 object-contain flex-shrink-0"
              />
            )}
            {currentClub && (
              <div className="flex flex-col leading-tight">
                <span className="text-base font-semibold text-foreground">{currentClub}</span>
                {currentLeague && (
                  <span className="text-sm text-muted-foreground">{currentLeague}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );

  // Grid view no longer links to profile - just shows card with declare interest
  return (
    <div
      ref={cardRef as any}
      className={gridClassName}
      onTouchStart={() => setIsTouched(true)}
      onTouchEnd={() => setTimeout(() => setIsTouched(false), 300)}
    >
      {gridContent}
    </div>
  );
};
