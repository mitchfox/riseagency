import { useState, useMemo } from "react";
import { PlayerCard } from "@/components/PlayerCard";
import { Header } from "@/components/Header";
import { players } from "@/data/players";
import { Grid, List, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormationDisplay } from "@/components/FormationDisplay";

const PlayerDirectory = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [selectedAge, setSelectedAge] = useState<string>("all");

  // Get unique positions
  const positions = useMemo(() => {
    const uniquePositions = [...new Set(players.map(p => p.position))];
    return uniquePositions.sort();
  }, []);

  // Filter players
  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      const positionMatch = selectedPosition === "all" || player.position === selectedPosition;
      
      let ageMatch = true;
      if (selectedAge === "young") {
        ageMatch = player.age < 24;
      } else if (selectedAge === "prime") {
        ageMatch = player.age >= 24 && player.age <= 28;
      } else if (selectedAge === "experienced") {
        ageMatch = player.age > 28;
      }
      
      return positionMatch && ageMatch;
    });
  }, [selectedPosition, selectedAge]);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background pt-16">
        {/* Page Header with Title and View Toggle */}
        <div className="bg-background">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-5xl md:text-6xl font-bebas uppercase text-foreground mb-2 tracking-wider">
                  Players
                </h1>
                <p className="text-primary uppercase tracking-widest text-sm font-semibold">
                  Players Under Management
                </p>
              </div>

              {/* View Toggle - Hidden on mobile */}
              <div className="hidden md:flex items-center gap-2 bg-secondary/50 backdrop-blur-sm p-1 rounded">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="h-10 w-10 p-0"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-10 w-10 p-0"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                <SelectTrigger className="w-[160px] bg-background/50 backdrop-blur-sm border-primary/10 text-foreground font-semibold uppercase tracking-wide rounded hover:border-primary/30 transition-colors">
                  <SelectValue placeholder="Position" />
                </SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-md border-primary/20 z-50">
                  <SelectItem value="all" className="uppercase tracking-wide font-semibold hover:bg-primary/10">
                    All Positions
                  </SelectItem>
                  {positions.map((position) => (
                    <SelectItem 
                      key={position} 
                      value={position}
                      className="uppercase tracking-wide font-semibold hover:bg-primary/10"
                    >
                      {position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedAge} onValueChange={setSelectedAge}>
                <SelectTrigger className="w-[160px] bg-background/50 backdrop-blur-sm border-primary/10 text-foreground font-semibold uppercase tracking-wide rounded hover:border-primary/30 transition-colors">
                  <SelectValue placeholder="Age Range" />
                </SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-md border-primary/20 z-50">
                  <SelectItem value="all" className="uppercase tracking-wide font-semibold hover:bg-primary/10">
                    All Ages
                  </SelectItem>
                  <SelectItem value="young" className="uppercase tracking-wide font-semibold hover:bg-primary/10">
                    Young (&lt;24)
                  </SelectItem>
                  <SelectItem value="prime" className="uppercase tracking-wide font-semibold hover:bg-primary/10">
                    Prime (24-28)
                  </SelectItem>
                  <SelectItem value="experienced" className="uppercase tracking-wide font-semibold hover:bg-primary/10">
                    Experienced (28+)
                  </SelectItem>
                </SelectContent>
              </Select>

              {(selectedPosition !== "all" || selectedAge !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedPosition("all");
                    setSelectedAge("all");
                  }}
                  className="text-primary hover:text-foreground hover:bg-primary/10 uppercase tracking-wide font-semibold"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Formation Display */}
        <div className="container mx-auto px-4 py-8">
          <FormationDisplay selectedPosition={selectedPosition} />
        </div>

        {/* Players Grid/List */}
        <main className="container mx-auto px-4 py-12">
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-2xl font-bebas text-muted-foreground uppercase tracking-wider">
                No players found with current filters
              </p>
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                  : "flex flex-col gap-2 max-w-5xl"
              }
            >
              {filteredPlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default PlayerDirectory;
