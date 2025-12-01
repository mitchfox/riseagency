import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PlayerCard } from "@/components/PlayerCard";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LateralFilter } from "@/components/LateralFilter";
import { Button } from "@/components/ui/button";

const Stars = () => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [selectedAgeRanges, setSelectedAgeRanges] = useState<string[]>([]);

  const positionOptions = [
    { label: "#1 - GK", value: "#1 - Goalkeeper" },
    { label: "#2 - RB", value: "#2 - Right Back" },
    { label: "#3 - LB", value: "#3 - Left Back" },
    { label: "#4 - RCB", value: "#4 - Right Centre Back" },
    { label: "#5 - LCB", value: "#5 - Left Centre Back" },
    { label: "#6 - CDM", value: "#6 - Defensive Midfielder" },
    { label: "#7 - RW", value: "#7 - Right Winger" },
    { label: "#8 - CM", value: "#8 - Central Midfielder" },
    { label: "#9 - CF", value: "#9 - Centre Forward" },
    { label: "#10 - CAM", value: "#10 - Attacking Midfielder" },
    { label: "#11 - LW", value: "#11 - Left Winger" }
  ];

  const ageRangeOptions = [
    { label: "15-17", value: "15-17", min: 15, max: 17 },
    { label: "18-21", value: "18-21", min: 18, max: 21 },
    { label: "22-24", value: "22-24", min: 22, max: 24 },
    { label: "25-27", value: "25-27", min: 25, max: 27 },
    { label: "28-30", value: "28-30", min: 28, max: 30 },
    { label: "31-33", value: "31-33", min: 31, max: 33 },
    { label: "34+", value: "34+", min: 34, max: 100 }
  ];

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('visible_on_stars_page', true)
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
        player.position.toLowerCase().includes(pos.toLowerCase().split(' - ')[1])
      );
      if (!matchesPosition) return false;
    }
    
    // Age range filter
    if (selectedAgeRanges.length > 0) {
      const matchesAge = selectedAgeRanges.some(rangeLabel => {
        const range = ageRangeOptions.find(r => r.value === rangeLabel);
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
            <p className="text-xl text-muted-foreground">{t('stars.loading')}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Our Stars - Professional Football Players | RISE Agency"
        description="Meet our talented roster of professional footballers across Europe. View player profiles, positions, and clubs from our extensive network."
        image="/og-preview-stars.png"
        url="/stars"
      />
      <Header />
      
      <main className="pt-24 md:pt-16">
        {/* Hero Section */}
        <section className="py-16 md:py-24 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-6xl md:text-8xl font-bebas uppercase tracking-wider text-foreground mb-4">
                {t('stars.title')}
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl lg:max-w-5xl mx-auto">
                {t('stars.subtitle')}
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
                {t('stars.grid_view')}
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-6 py-2 font-bebas uppercase tracking-wider transition-colors ${
                  viewMode === "list"
                    ? "bg-primary text-black"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                {t('stars.list_view')}
              </button>
            </div>

            {/* Filters */}
            <div className="mb-8 space-y-4">
              <LateralFilter
                label={t('stars.filter_position')}
                options={positionOptions}
                selectedValues={selectedPositions}
                onToggle={togglePosition}
                onClear={() => setSelectedPositions([])}
              />

              <LateralFilter
                label={t('stars.filter_age')}
                options={ageRangeOptions}
                selectedValues={selectedAgeRanges}
                onToggle={toggleAgeRange}
                onClear={() => setSelectedAgeRanges([])}
              />

              {/* Clear All Filters */}
              {(selectedPositions.length > 0 || selectedAgeRanges.length > 0) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedPositions([]);
                    setSelectedAgeRanges([]);
                  }}
                  className="font-bebas uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  {t('stars.clear_filters')}
                </Button>
              )}
            </div>

            {/* Players Grid/List */}
            <div
              className={
                viewMode === "grid"
                  ? "grid md:grid-cols-2 lg:grid-cols-3 gap-8 group/container"
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
                <p className="text-xl text-muted-foreground">{t('stars.no_players')}</p>
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