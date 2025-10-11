import { useState } from "react";
import { PlayerCard } from "@/components/PlayerCard";
import { players } from "@/data/players";
import { Grid, List } from "lucide-react";
import { Button } from "@/components/ui/button";

const PlayerDirectory = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-6xl md:text-7xl font-bebas uppercase text-foreground mb-2 tracking-wider">
                Players
              </h1>
              <p className="text-primary uppercase tracking-widest text-sm">
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
        </div>
      </header>

      {/* Players Grid/List */}
      <main className="container mx-auto px-4 py-12">
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1"
              : "flex flex-col gap-1 max-w-5xl"
          }
        >
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              viewMode={viewMode}
            />
          ))}
        </div>
      </main>
    </div>
  );
};

export default PlayerDirectory;
