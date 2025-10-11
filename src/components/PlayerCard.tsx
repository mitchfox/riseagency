import { Link } from "react-router-dom";
import { Player } from "@/data/players";
import { useEffect, useRef, useState } from "react";

interface PlayerCardProps {
  player: Player;
  viewMode?: "grid" | "list";
}

export const PlayerCard = ({ player, viewMode = "grid" }: PlayerCardProps) => {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [isInView, setIsInView] = useState(false);

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
        to={`/players/${player.id}`}
        className="group relative flex items-center gap-8 p-8 overflow-hidden transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {/* Hover and focus glow effect - desktop only */}
        <div className="absolute inset-0 opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-slide-glow" />
        </div>

        {/* Player Image */}
        <div className="relative w-32 h-40 flex-shrink-0 overflow-hidden">
          <img
            src={player.image}
            alt={player.name}
            className={`w-full h-full object-cover transition-all duration-700 ${
              isInView ? "grayscale-0" : "grayscale"
            } md:grayscale md:group-hover:grayscale-0`}
          />
          {/* Position badge - top right */}
          <div className="absolute top-3 right-3">
            <span className="text-xl font-bebas text-primary tracking-wider">
              {player.position}
            </span>
          </div>
        </div>

        {/* Player Info */}
        <div className="flex-1 relative z-10">
          <h3 className="text-3xl font-bebas uppercase text-foreground tracking-wider">
            {player.name}
          </h3>
          <div className="flex gap-6 mt-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <span>#{player.number}</span>
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
      to={`/players/${player.id}`}
      className="group relative block overflow-hidden transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* Hover and focus glow effect - desktop only */}
      <div className="absolute inset-0 opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100 transition-opacity duration-500 pointer-events-none z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent animate-slide-glow" />
      </div>

      {/* Player Image */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={player.image}
          alt={player.name}
          className={`w-full h-full object-cover transition-all duration-700 ${
            isInView ? "grayscale-0" : "grayscale"
          } md:grayscale md:group-hover:grayscale-0`}
        />
        {/* Position badge - top right */}
        <div className="absolute top-4 right-4">
          <span className="text-2xl font-bebas text-primary tracking-wider">
            {player.position}
          </span>
        </div>
      </div>

      {/* Player Info */}
      <div className="py-4 relative z-10">
        <h3 className="text-3xl font-bebas uppercase text-foreground tracking-wider">
          {player.name}
        </h3>
        <div className="flex gap-4 mt-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <span>Age {player.age}</span>
          <span>•</span>
          <span>{player.nationality}</span>
        </div>
      </div>
    </Link>
  );
};
