import { Link } from "react-router-dom";
import { Player } from "@/data/players";

interface PlayerCardProps {
  player: Player;
  viewMode?: "grid" | "list";
}

export const PlayerCard = ({ player, viewMode = "grid" }: PlayerCardProps) => {
  if (viewMode === "list") {
    return (
      <Link
        to={`/players/${player.id}`}
        className="group relative flex items-center gap-6 p-6 bg-card overflow-hidden transition-all duration-300"
      >
        {/* Hover glow effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-slide-glow" />
        </div>

        {/* Player Image */}
        <div className="relative w-28 h-36 flex-shrink-0 overflow-hidden">
          <img
            src={player.image}
            alt={player.name}
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
          />
        </div>

        {/* Player Info */}
        <div className="flex-1 relative z-10">
          <h3 className="text-2xl font-bebas uppercase text-foreground group-hover:text-primary transition-colors tracking-wider">
            {player.name}
          </h3>
          <p className="text-sm text-primary uppercase tracking-wide mt-1">{player.position}</p>
          <div className="flex gap-6 mt-3 text-xs text-muted-foreground uppercase tracking-wide">
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
      to={`/players/${player.id}`}
      className="group relative block bg-card overflow-hidden transition-all duration-300"
    >
      {/* Hover glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent animate-slide-glow" />
      </div>

      {/* Player Image */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={player.image}
          alt={player.name}
          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
        />
        {/* Number badge */}
        <div className="absolute top-4 right-4 w-14 h-14 bg-primary flex items-center justify-center">
          <span className="text-2xl font-bebas text-primary-foreground">
            {player.number}
          </span>
        </div>
      </div>

      {/* Player Info */}
      <div className="p-5 relative z-10">
        <h3 className="text-2xl font-bebas uppercase text-foreground group-hover:text-primary transition-colors tracking-wider">
          {player.name}
        </h3>
        <p className="text-sm text-primary uppercase tracking-wide mt-1">{player.position}</p>
        <div className="flex gap-4 mt-2 text-xs text-muted-foreground uppercase tracking-wide">
          <span>Age {player.age}</span>
          <span>•</span>
          <span>{player.nationality}</span>
        </div>
      </div>
    </Link>
  );
};
