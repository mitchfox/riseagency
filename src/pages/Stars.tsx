import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PlayerCard } from "@/components/PlayerCard";
import { players } from "@/data/players";
import { useState } from "react";

const Stars = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="py-16 md:py-24 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-6xl md:text-8xl font-bebas uppercase tracking-wider text-foreground mb-4">
                Our Stars
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Meet our talented roster of professional footballers
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex justify-center gap-4 mb-12">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-6 py-2 font-bebas uppercase tracking-wider transition-colors ${
                  viewMode === "grid"
                    ? "bg-primary text-black"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                Grid View
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-6 py-2 font-bebas uppercase tracking-wider transition-colors ${
                  viewMode === "list"
                    ? "bg-primary text-black"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                List View
              </button>
            </div>

            {/* Players Grid/List */}
            <div
              className={
                viewMode === "grid"
                  ? "grid md:grid-cols-2 lg:grid-cols-3 gap-8"
                  : "flex flex-col divide-y divide-border"
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
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Stars;
