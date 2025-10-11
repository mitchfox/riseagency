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
      <div className="min-h-screen bg-background pt-20">
        {/* Page Header with Title and View Toggle */}
        <div className="bg-background border-b border-primary/20">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-5xl md:text-6xl font-bebas uppercase text-foreground mb-2 tracking-wider">
                  Players
                </h1>
                <p className="text-primary uppercase tracking-widest text-sm font-semibold">
                  Elite Squad
                </p>
              </div>

              {/* View Toggle - Hidden on mobile */}
              <div className="hidden md:flex items-center gap-2 bg-secondary p-1">
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
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <span className="text-sm font-bebas text-muted-foreground uppercase tracking-wider">
                  Filters:
                </span>
              </div>

              <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                <SelectTrigger className="w-[160px] bg-secondary border-primary/20 text-foreground font-semibold uppercase tracking-wide">
                  <SelectValue placeholder="Position" />
                </SelectTrigger>
                <SelectContent className="bg-secondary border-primary/20 z-50">
                  <SelectItem value="all" className="uppercase tracking-wide font-semibold">
                    All Positions
                  </SelectItem>
                  {positions.map((position) => (
                    <SelectItem 
                      key={position} 
                      value={position}
                      className="uppercase tracking-wide font-semibold"
                    >
                      {position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedAge} onValueChange={setSelectedAge}>
                <SelectTrigger className="w-[160px] bg-secondary border-primary/20 text-foreground font-semibold uppercase tracking-wide">
                  <SelectValue placeholder="Age" />
                </SelectTrigger>
                <SelectContent className="bg-secondary border-primary/20 z-50">
                  <SelectItem value="all" className="uppercase tracking-wide font-semibold">
                    All Ages
                  </SelectItem>
                  <SelectItem value="young" className="uppercase tracking-wide font-semibold">
                    Young (&lt;24)
                  </SelectItem>
                  <SelectItem value="prime" className="uppercase tracking-wide font-semibold">
                    Prime (24-28)
                  </SelectItem>
                  <SelectItem value="experienced" className="uppercase tracking-wide font-semibold">
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
                  className="text-primary hover:text-foreground uppercase tracking-wide font-semibold"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
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
