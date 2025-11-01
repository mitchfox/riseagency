import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PlayerCard } from "@/components/PlayerCard";
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

const PlayersList = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [selectedAgeRanges, setSelectedAgeRanges] = useState<string[]>([]);

  const positions = [
    "GK",
    "RB",
    "LB",
    "RCB",
    "LCB",
    "CDM",
    "RW",
    "CM",
    "CF",
    "CAM",
    "LW"
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
        .order('name');
      
      if (!error && data) {
        // Parse bio to extract club info for each player
        const playersWithParsedData = data.map((player: any) => {
          let currentClub = '';
          let clubLogo = '';
          let tacticalFormations = [];
          
          if (player.bio) {
            try {
              const parsed = JSON.parse(player.bio);
              if (typeof parsed === 'object' && parsed !== null) {
                currentClub = parsed.currentClub || '';
                
                // Extract from schemeHistory or tacticalFormations
                if (parsed.schemeHistory && Array.isArray(parsed.schemeHistory) && parsed.schemeHistory.length > 0) {
                  clubLogo = parsed.schemeHistory[0].clubLogo || '';
                  tacticalFormations = parsed.schemeHistory.map((scheme: any) => ({
                    formation: scheme.formation,
                    role: scheme.positions?.[0] || '',
                    positions: scheme.positions || [],
                    club: scheme.teamName,
                    clubLogo: scheme.clubLogo,
                    playerImage: scheme.playerImage,
                    appearances: scheme.matches,
                    matches: scheme.matches
                  }));
                } else if (parsed.tacticalFormations && Array.isArray(parsed.tacticalFormations) && parsed.tacticalFormations.length > 0) {
                  clubLogo = parsed.tacticalFormations[0].clubLogo || '';
                  tacticalFormations = parsed.tacticalFormations;
                }
              }
            } catch (e) {
              console.error('Error parsing player bio:', e);
            }
          }
          
          return {
            ...player,
            currentClub,
            clubLogo,
            tacticalFormations
          };
        });
        
        setPlayers(playersWithParsedData);
      }
      setLoading(false);
    };

    fetchPlayers();
  }, []);

  // Filter players based on selected filters
  const filteredPlayers = players.filter(player => {
    // Position filter
    if (selectedPositions.length > 0) {
      const matchesPosition = selectedPositions.some(pos => 
        player.position.toLowerCase().includes(pos.toLowerCase())
      );
      if (!matchesPosition) return false;
    }
    
    // Age range filter
    if (selectedAgeRanges.length > 0) {
      const matchesAge = selectedAgeRanges.some(rangeLabel => {
        const range = ageRanges.find(r => r.label === rangeLabel);
        return range && player.age >= range.min && player.age <= range.max;
      });
      if (!matchesAge) return false;
    }
    
    return true;
  });

  const togglePosition = (position: string) => {
    setSelectedPositions(prev =>
      prev.includes(position)
        ? prev.filter(p => p !== position)
        : [...prev, position]
    );
  };

  const toggleAgeRange = (range: string) => {
    setSelectedAgeRanges(prev =>
      prev.includes(range)
        ? prev.filter(r => r !== range)
        : [...prev, range]
    );
  };

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
      <Helmet>
        <title>Player List | RISE Football Agency</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <Header />
      
      <main className="pt-24 md:pt-16">
        {/* Hero Section */}
        <section className="py-16 md:py-24 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-6xl md:text-8xl font-bebas uppercase tracking-wider text-foreground mb-4">
                Player List
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Complete roster of all players
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
            <div className="mb-8 flex flex-wrap gap-4">
              {/* Position Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="font-bebas uppercase tracking-wider border-primary/30 hover:bg-primary/10"
                  >
                    Filter by Position
                    {selectedPositions.length > 0 && (
                      <span className="ml-2 bg-primary text-black rounded-full px-2 py-0.5 text-xs">
                        {selectedPositions.length}
                      </span>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 max-h-96 overflow-y-auto bg-background">
                  <DropdownMenuLabel className="font-bebas uppercase tracking-wider">
                    Select Positions
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {positions.map((position) => (
                    <DropdownMenuCheckboxItem
                      key={position}
                      checked={selectedPositions.includes(position)}
                      onCheckedChange={() => togglePosition(position)}
                      className="cursor-pointer"
                    >
                      {position}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Age Range Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="font-bebas uppercase tracking-wider border-primary/30 hover:bg-primary/10"
                  >
                    Filter by Age
                    {selectedAgeRanges.length > 0 && (
                      <span className="ml-2 bg-primary text-black rounded-full px-2 py-0.5 text-xs">
                        {selectedAgeRanges.length}
                      </span>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-background">
                  <DropdownMenuLabel className="font-bebas uppercase tracking-wider">
                    Select Age Ranges
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {ageRanges.map((range) => (
                    <DropdownMenuCheckboxItem
                      key={range.label}
                      checked={selectedAgeRanges.includes(range.label)}
                      onCheckedChange={() => toggleAgeRange(range.label)}
                      className="cursor-pointer"
                    >
                      {range.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Clear Filters */}
              {(selectedPositions.length > 0 || selectedAgeRanges.length > 0) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedPositions([]);
                    setSelectedAgeRanges([]);
                  }}
                  className="font-bebas uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  Clear All Filters
                </Button>
              )}
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

export default PlayersList;
