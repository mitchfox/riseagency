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
      <div className="bg-background">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="group hover:bg-secondary uppercase tracking-wider font-semibold"
          >
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            All Players
          </Button>
        </div>
      </div>

      {/* Player Profile */}
      <main className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Player Image */}
          <div className="relative">
            <div className="relative overflow-hidden aspect-[3/4]">
              <img
                src={player.image}
                alt={player.name}
                className="w-full h-full object-cover"
              />
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            </div>
          </div>

          {/* Player Info */}
          <div className="space-y-10">
            {/* Name and Position */}
            <div>
              <div className="inline-block px-5 py-2 bg-primary mb-6">
                <span className="text-xl font-bebas text-primary-foreground tracking-wider">
                  #{player.number}
                </span>
              </div>
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-bebas uppercase text-foreground mb-4 leading-none tracking-wide">
                {player.name}
              </h1>
              <p className="text-lg text-primary uppercase tracking-widest">
                {player.position} • Age {player.age} • {player.nationality}
              </p>
            </div>

            {/* Bio */}
            <div>
              <h2 className="text-sm font-bebas text-primary uppercase tracking-widest mb-4 text-lg">
                About
              </h2>
              <p className="text-foreground/80 leading-relaxed">
                {player.bio}
              </p>
            </div>

            {/* Stats */}
            <div>
              <h2 className="text-sm font-bebas text-primary uppercase tracking-widest mb-8 text-lg">
                Season Stats
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {player.stats.goals !== undefined && (
                  <div className="text-center p-6 bg-background">
                    <div className="text-5xl font-bebas text-primary mb-2">
                      {player.stats.goals}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                      Goals
                    </div>
                  </div>
                )}
                {player.stats.assists !== undefined && (
                  <div className="text-center p-6 bg-background">
                    <div className="text-5xl font-bebas text-primary mb-2">
                      {player.stats.assists}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                      Assists
                    </div>
                  </div>
                )}
                {player.stats.cleanSheets !== undefined && (
                  <div className="text-center p-6 bg-background">
                    <div className="text-5xl font-bebas text-primary mb-2">
                      {player.stats.cleanSheets}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                      Clean Sheets
                    </div>
                  </div>
                )}
                {player.stats.saves !== undefined && (
                  <div className="text-center p-6 bg-background">
                    <div className="text-5xl font-bebas text-primary mb-2">
                      {player.stats.saves}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                      Saves
                    </div>
                  </div>
                )}
                <div className="text-center p-6 bg-background">
                  <div className="text-5xl font-bebas text-primary mb-2">
                    {player.stats.matches}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                    Matches
                  </div>
                </div>
                <div className="text-center p-6 bg-background">
                  <div className="text-5xl font-bebas text-primary mb-2">
                    {player.stats.minutes}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
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
