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
        className="group relative flex items-center gap-4 p-4 bg-card border border-border rounded-lg overflow-hidden transition-all duration-300 hover:border-primary/50"
      >
        {/* Hover glow effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-slide-glow" />
        </div>

        {/* Player Image */}
        <div className="relative w-24 h-32 flex-shrink-0 rounded overflow-hidden">
          <img
            src={player.image}
            alt={player.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Player Info */}
        <div className="flex-1 relative z-10">
          <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
            {player.name}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{player.position}</p>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
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
      className="group relative block bg-card border border-border rounded-lg overflow-hidden transition-all duration-300 hover:border-primary/50"
    >
      {/* Hover glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/10 to-transparent animate-slide-glow" />
      </div>

      {/* Player Image */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={player.image}
          alt={player.name}
          className="w-full h-full object-cover"
        />
        {/* Number badge */}
        <div className="absolute top-4 right-4 w-12 h-12 bg-primary/90 backdrop-blur-sm rounded-full flex items-center justify-center">
          <span className="text-lg font-bold text-primary-foreground">
            {player.number}
          </span>
        </div>
      </div>

      {/* Player Info */}
      <div className="p-4 relative z-10">
        <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
          {player.name}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{player.position}</p>
        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
          <span>Age {player.age}</span>
          <span>•</span>
          <span>{player.nationality}</span>
        </div>
      </div>
    </Link>
  );
};
