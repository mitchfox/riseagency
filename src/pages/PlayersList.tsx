import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PlayerCard } from "@/components/PlayerCard";
import { useState, useEffect, useRef, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { LateralFilter } from "@/components/LateralFilter";
import { Button } from "@/components/ui/button";
import { DeclareInterestPlayerDialog } from "@/components/DeclareInterestPlayerDialog";
import { ContactDialog } from "@/components/ContactDialog";
import { LanguageMapSelector } from "@/components/LanguageMapSelector";
import { LayoutGrid, List, Users, MessageCircle, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const BATCH_SIZE = 3;

const PlayersList = () => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [selectedAgeRanges, setSelectedAgeRanges] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [declareInterestOpen, setDeclareInterestOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [expandedFilter, setExpandedFilter] = useState<"position" | "age" | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const positionOptions = [
    { label: "GK", value: "GK" },
    { label: "LB", value: "LB" },
    { label: "LCB", value: "LCB" },
    { label: "RCB", value: "RCB" },
    { label: "RB", value: "RB" },
    { label: "CDM", value: "CDM" },
    { label: "CM", value: "CM" },
    { label: "CAM", value: "CAM" },
    { label: "LW", value: "LW" },
    { label: "RW", value: "RW" },
    { label: "CF", value: "CF" }
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
      // Only show players with representation_status: mandated, represented, previously_mandated
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .in('representation_status', ['mandated', 'represented', 'previously_mandated'])
        .order('player_list_order', { ascending: true, nullsFirst: false });
      
      if (!error && data) {
        // Parse bio to extract club info for each player
        const playersWithParsedData = data.map((player: any) => {
          let currentClub = '';
          let clubLogo = '';
          let currentLeague = '';
          let tacticalFormations = [];
          
          if (player.bio) {
            try {
              const parsed = JSON.parse(player.bio);
              if (typeof parsed === 'object' && parsed !== null) {
                currentClub = parsed.currentClub || '';
                currentLeague = parsed.currentLeague || '';
                
                // Extract from schemeHistory or tacticalFormations
                if (parsed.schemeHistory && Array.isArray(parsed.schemeHistory) && parsed.schemeHistory.length > 0) {
                  clubLogo = parsed.schemeHistory[0].clubLogo || '';
                  if (!currentLeague) currentLeague = parsed.schemeHistory[0].league || parsed.schemeHistory[0].competition || '';
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
                  if (!currentLeague) currentLeague = parsed.tacticalFormations[0].league || parsed.tacticalFormations[0].competition || '';
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
            currentLeague,
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

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [selectedPositions, selectedAgeRanges]);

  // Intersection Observer for lazy loading
  const loadMore = useCallback(() => {
    setVisibleCount(prev => prev + BATCH_SIZE);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredPlayers.length) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore, visibleCount, filteredPlayers.length]);

  // Get only visible players
  const visiblePlayers = filteredPlayers.slice(0, visibleCount);

  if (loading) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <Header />
        <main className="pt-16">
          <div className="container mx-auto px-4 py-24 text-center">
            <p className="text-xl text-muted-foreground">{t('players_list.loading', 'Loading players...')}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Helmet>
        <title>Player List | RISE Football Agency</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <Header />
      
      <main className="pt-32 md:pt-24">
        {/* Hero Section */}
        <section className="py-8 px-4">
          <div className="container mx-auto">
            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Declare Interest Card */}
              <button
                onClick={() => setDeclareInterestOpen(true)}
                className="group relative flex items-center gap-6 p-8 border border-border rounded-lg hover:border-primary transition-all duration-300 bg-card"
              >
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Users className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-2xl font-bebas uppercase tracking-wider text-foreground group-hover:text-primary transition-colors">
                    {t('players_list.declare_interest', 'Declare Interest in Player(s)')}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('players_list.declare_interest_desc', 'Select players and submit your interest')}
                  </p>
                </div>
                <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </button>

              {/* Contact Card */}
              <button
                onClick={() => setContactOpen(true)}
                className="group relative flex items-center gap-6 p-8 border border-border rounded-lg hover:border-primary transition-all duration-300 bg-card"
              >
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <MessageCircle className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-2xl font-bebas uppercase tracking-wider text-foreground group-hover:text-primary transition-colors">
                    {t('players_list.contact', 'Contact')}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('players_list.contact_desc', 'Get in touch with us directly')}
                  </p>
                </div>
                <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </button>
            </div>

            {/* View Mode Toggle - Icon Only */}
            <div className="flex justify-center gap-2 mb-4">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-3 rounded-lg transition-colors ${
                  viewMode === "grid"
                    ? "bg-primary text-black"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-3 rounded-lg transition-colors ${
                  viewMode === "list"
                    ? "bg-primary text-black"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
                title="List View"
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            {/* Language Selector */}
            <div className="flex justify-center mb-4">
              <LanguageMapSelector />
            </div>

            {/* Filters */}
            <div className="mb-8 flex flex-wrap items-center gap-3 justify-center">
              <LateralFilter
                label={t('players_list.filter_position', 'Filter by Position')}
                options={positionOptions}
                selectedValues={selectedPositions}
                onToggle={togglePosition}
                onClear={() => setSelectedPositions([])}
                isExpanded={expandedFilter === "position"}
                onExpandedChange={(expanded) => setExpandedFilter(expanded ? "position" : null)}
              />

              <LateralFilter
                label={t('players_list.filter_age', 'Filter by Age')}
                options={ageRangeOptions}
                selectedValues={selectedAgeRanges}
                onToggle={toggleAgeRange}
                onClear={() => setSelectedAgeRanges([])}
                direction="left"
                isExpanded={expandedFilter === "age"}
                onExpandedChange={(expanded) => setExpandedFilter(expanded ? "age" : null)}
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
                  {t('players_list.clear_filters', 'Clear All Filters')}
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
              {visiblePlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  viewMode={viewMode}
                />
              ))}
            </div>

            {/* Load more trigger */}
            {visibleCount < filteredPlayers.length && (
              <div 
                ref={loadMoreRef} 
                className="flex justify-center py-8"
              >
                <div className="text-muted-foreground animate-pulse font-bebas uppercase tracking-wider">
                  {t('players_list.loading_more', 'Loading more players...')}
                </div>
              </div>
            )}

            {filteredPlayers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-xl text-muted-foreground">{t('players_list.no_players', 'No players match the selected filters')}</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />

      <DeclareInterestPlayerDialog 
        open={declareInterestOpen} 
        onOpenChange={setDeclareInterestOpen}
      />
      
      <ContactDialog 
        open={contactOpen} 
        onOpenChange={setContactOpen} 
      />
    </div>
  );
};

export default PlayersList;