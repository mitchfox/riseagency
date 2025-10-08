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
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
                Player Directory
              </h1>
              <p className="text-muted-foreground">
                Meet our talented squad
              </p>
            </div>

            {/* View Toggle - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-2 bg-card border border-border rounded-lg p-1">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-8 w-8 p-0"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-8 w-8 p-0"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Players Grid/List */}
      <main className="container mx-auto px-4 py-8">
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "flex flex-col gap-4 max-w-4xl"
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
