import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PlayerCard } from "@/components/PlayerCard";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const Stars = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [selectedAgeRange, setSelectedAgeRange] = useState<string | null>(null);

  const positions = [
    "#1 - Goalkeeper",
    "#2 - Right Back",
    "#3 - Left Back",
    "#4 - Right Centre Back",
    "#5 - Left Centre Back",
    "#6 - Defensive Midfielder",
    "#7 - Right Winger",
    "#8 - Central Midfielder",
    "#9 - Centre Forward",
    "#10 - Attacking Midfielder",
    "#11 - Left Winger"
  ];

  const ageRanges = [
    { label: "15-17", min: 15, max: 17 },
    { label: "18-21", min: 18, max: 21 },
    { label: "22-24", min: 22, max: 24 },
    { label: "25-27", min: 25, max: 27 },
    { label: "28-30", min: 28, max: 30 },
    { label: "31-33", min: 31, max: 33 },
    { label: "34+", min: 34, max: 100 }
  ];

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('visible_on_stars_page', true)
        .order('name');
      
      if (!error && data) {
        setPlayers(data);
      }
      setLoading(false);
    };

    fetchPlayers();
  }, []);

  // Filter players based on selected filters
  const filteredPlayers = players.filter(player => {
    // Position filter
    if (selectedPosition && !player.position.toLowerCase().includes(selectedPosition.toLowerCase().split(' - ')[1])) {
      return false;
    }
    
    // Age range filter
    if (selectedAgeRange) {
      const range = ageRanges.find(r => r.label === selectedAgeRange);
      if (range && (player.age < range.min || player.age > range.max)) {
        return false;
      }
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16">
          <div className="container mx-auto px-4 py-24 text-center">
            <p className="text-xl text-muted-foreground">Loading players...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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

            {/* Filters */}
            <div className="mb-8 space-y-6">
              {/* Position Filter */}
              <div>
                <h3 className="text-2xl font-bebas uppercase tracking-wider mb-3 text-primary">
                  Filter by Position
                </h3>
                <div className="flex flex-wrap gap-2">
                  {positions.map((position) => (
                    <button
                      key={position}
                      onClick={() => setSelectedPosition(selectedPosition === position ? null : position)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        selectedPosition === position
                          ? 'bg-primary text-black'
                          : 'bg-secondary text-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {position}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age Range Filter */}
              <div>
                <h3 className="text-2xl font-bebas uppercase tracking-wider mb-3 text-primary">
                  Filter by Age Range
                </h3>
                <div className="flex flex-wrap gap-2">
                  {ageRanges.map((range) => (
                    <button
                      key={range.label}
                      onClick={() => setSelectedAgeRange(selectedAgeRange === range.label ? null : range.label)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        selectedAgeRange === range.label
                          ? 'bg-primary text-black'
                          : 'bg-secondary text-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Players Grid/List */}
            <div
              className={
                viewMode === "grid"
                  ? "grid md:grid-cols-2 lg:grid-cols-3 gap-8"
                  : "flex flex-col divide-y divide-border"
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

            {filteredPlayers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-xl text-muted-foreground">No players match the selected filters</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Stars;
