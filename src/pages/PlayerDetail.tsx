import { useParams, useNavigate } from "react-router-dom";
import { players } from "@/data/players";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const PlayerDetail = () => {
  const { playername } = useParams<{ playername: string }>();
  const navigate = useNavigate();
  
  const player = players.find((p) => p.id === playername);

  if (!player) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">Player Not Found</h1>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Directory
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Back Button */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="group hover:bg-secondary"
          >
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            All Players
          </Button>
        </div>
      </div>

      {/* Player Profile */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Player Image */}
          <div className="relative">
            <div className="relative rounded-lg overflow-hidden aspect-[3/4] bg-gradient-to-br from-primary/20 to-transparent">
              <img
                src={player.image}
                alt={player.name}
                className="w-full h-full object-cover"
              />
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            </div>
          </div>

          {/* Player Info */}
          <div className="space-y-8">
            {/* Name and Position */}
            <div>
              <div className="inline-block px-4 py-1 bg-primary/10 border border-primary/30 rounded-full mb-4">
                <span className="text-sm font-medium text-primary">
                  #{player.number}
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-4 leading-tight">
                {player.name}
              </h1>
              <p className="text-xl text-muted-foreground mb-6">
                {player.position} • Age {player.age} • {player.nationality}
              </p>
            </div>

            {/* Bio */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                About
              </h2>
              <p className="text-foreground/90 leading-relaxed">
                {player.bio}
              </p>
            </div>

            {/* Stats */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
                Season Stats
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {player.stats.goals !== undefined && (
                  <div className="text-center p-4 bg-card border border-border rounded-lg">
                    <div className="text-3xl font-bold text-primary mb-1">
                      {player.stats.goals}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                      Goals
                    </div>
                  </div>
                )}
                {player.stats.assists !== undefined && (
                  <div className="text-center p-4 bg-card border border-border rounded-lg">
                    <div className="text-3xl font-bold text-primary mb-1">
                      {player.stats.assists}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                      Assists
                    </div>
                  </div>
                )}
                {player.stats.cleanSheets !== undefined && (
                  <div className="text-center p-4 bg-card border border-border rounded-lg">
                    <div className="text-3xl font-bold text-primary mb-1">
                      {player.stats.cleanSheets}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                      Clean Sheets
                    </div>
                  </div>
                )}
                {player.stats.saves !== undefined && (
                  <div className="text-center p-4 bg-card border border-border rounded-lg">
                    <div className="text-3xl font-bold text-primary mb-1">
                      {player.stats.saves}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                      Saves
                    </div>
                  </div>
                )}
                <div className="text-center p-4 bg-card border border-border rounded-lg">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {player.stats.matches}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">
                    Matches
                  </div>
                </div>
                <div className="text-center p-4 bg-card border border-border rounded-lg">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {player.stats.minutes}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">
                    Minutes
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PlayerDetail;
