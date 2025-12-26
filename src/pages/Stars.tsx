import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PlayerCard } from "@/components/PlayerCard";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LateralFilter } from "@/components/LateralFilter";
import { LayoutGrid, List, Users, MessageCircle, ArrowRight, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parsePlayerBio } from "@/lib/playerDataParser";
import { DeclareInterestDialog } from "@/components/DeclareInterestDialog";
import { ContactDialog } from "@/components/ContactDialog";
import { PortfolioRequestDialog } from "@/components/PortfolioRequestDialog";
import { useNavigate } from "react-router-dom";

const PLAYERS_PER_PAGE = 12;

const Stars = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [selectedAgeRanges, setSelectedAgeRanges] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [declareInterestOpen, setDeclareInterestOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [portfolioOpen, setPortfolioOpen] = useState(false);

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
        .neq('category', 'Scouted')
        .order('name');
      
      if (!error && data) {
        // Use optimized parser
        const playersWithParsedData = data.map((player: any) => {
          const parsedData = parsePlayerBio(player.bio);
          return {
            ...player,
            ...parsedData
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

  // Pagination
  const totalPages = Math.ceil(filteredPlayers.length / PLAYERS_PER_PAGE);
  const startIndex = (currentPage - 1) * PLAYERS_PER_PAGE;
  const endIndex = startIndex + PLAYERS_PER_PAGE;
  const paginatedPlayers = filteredPlayers.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPositions, selectedAgeRanges]);

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
      <div className="min-h-screen bg-background overflow-x-hidden">
        <Header />
        <main className="pt-16">
          <div className="container mx-auto px-4 py-24 text-center">
            <p className="text-xl text-muted-foreground">{t('stars.loading', 'Loading players...')}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO 
        title={t('stars.seo_title', 'Our Stars - Professional Football Players | RISE Agency')}
        description={t('stars.seo_description', 'Meet our talented roster of professional footballers across Europe. View player profiles, positions, and clubs from our extensive network.')}
        image="/og-preview-stars.png"
        url="/stars"
      />
      <Header />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative py-8 md:py-12 px-4 overflow-hidden">
          {/* Background accent */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="container mx-auto relative z-10">
            {/* Title Block */}
            <div className="text-center mb-12 md:mb-16">
              <p className="text-primary uppercase tracking-[0.3em] text-xs md:text-sm font-medium mb-4">
                {t('stars.subtitle', 'Elite Football Representation')}
              </p>
              <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-bebas uppercase tracking-wider text-foreground leading-none">
                {t('stars.title', 'Our Stars')}
              </h1>
              
              <div className="w-20 h-px bg-primary mx-auto mt-8 mb-8" />
              
              <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
                {t('stars.description', 'Because of our background, we have the mandate to many top players across Europe\'s major divisions not under exclusive representation. Clubs can request our full portfolio through the button below.')}
              </p>
            </div>

            {/* Action Cards - Premium Design */}
            <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto mb-12">
              {/* Declare Interest Card */}
              <button 
                onClick={() => setDeclareInterestOpen(true)}
                className="group relative bg-secondary/50 backdrop-blur-sm border border-border hover:border-primary/50 p-6 md:p-8 text-left transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-full border border-primary/30 flex items-center justify-center mb-6 group-hover:border-primary group-hover:bg-primary/10 transition-all duration-300">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bebas text-xl md:text-2xl uppercase tracking-wider text-foreground mb-2">
                    {t('stars.declare_interest', 'Declare Interest')}
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                    {t('stars.declare_interest_desc', 'Select players and submit your interest')}
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-primary text-sm font-medium">
                    <span className="uppercase tracking-wider text-xs">Get Started</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
              
              {/* Contact Card */}
              <button 
                onClick={() => setContactOpen(true)}
                className="group relative bg-secondary/50 backdrop-blur-sm border border-border hover:border-primary/50 p-6 md:p-8 text-left transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-full border border-primary/30 flex items-center justify-center mb-6 group-hover:border-primary group-hover:bg-primary/10 transition-all duration-300">
                    <MessageCircle className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bebas text-xl md:text-2xl uppercase tracking-wider text-foreground mb-2">
                    {t('stars.contact_btn', 'Contact Us')}
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                    {t('stars.contact_desc', 'Get in touch with us directly')}
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-primary text-sm font-medium">
                    <span className="uppercase tracking-wider text-xs">Reach Out</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>

              {/* Portfolio Card */}
              <button 
                onClick={() => setPortfolioOpen(true)}
                className="group relative bg-secondary/50 backdrop-blur-sm border border-border hover:border-primary/50 p-6 md:p-8 text-left transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-full border border-primary/30 flex items-center justify-center mb-6 group-hover:border-primary group-hover:bg-primary/10 transition-all duration-300">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bebas text-xl md:text-2xl uppercase tracking-wider text-foreground mb-2">
                    {t('stars.request_portfolio', 'Full Portfolio')}
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                    {t('stars.request_portfolio_desc', 'Access our complete player portfolio')}
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-primary text-sm font-medium">
                    <span className="uppercase tracking-wider text-xs">Request Access</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* Player Grid Section */}
        <section className="px-4 pb-8">
          <div className="container mx-auto">
            {/* Controls Bar */}
            <div className="flex items-center justify-between border-y border-border py-4 mb-8">
              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2.5 transition-all duration-200 rounded ${
                    viewMode === "grid"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2.5 transition-all duration-200 rounded ${
                    viewMode === "list"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Player Count */}
              <span className="text-sm text-muted-foreground hidden sm:block">
                {filteredPlayers.length} {t('stars.players', 'players')}
              </span>
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
              <LateralFilter
                label={t('stars.filter_position', 'Filter by Position')}
                options={positionOptions}
                selectedValues={selectedPositions}
                onToggle={togglePosition}
                onClear={() => setSelectedPositions([])}
              />

              <LateralFilter
                label={t('stars.filter_age', 'Filter by Age')}
                options={ageRangeOptions}
                selectedValues={selectedAgeRanges}
                onToggle={toggleAgeRange}
                onClear={() => setSelectedAgeRanges([])}
                direction="left"
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
                  {t('stars.clear_filters', 'Clear All Filters')}
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
              {paginatedPlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  viewMode={viewMode}
                />
              ))}
            </div>

            {filteredPlayers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-xl text-muted-foreground">{t('stars.no_players', 'No players match the selected filters')}</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-12">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="font-bebas uppercase"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  {t('stars.previous', 'Previous')}
                </Button>
                
                <span className="text-sm text-muted-foreground font-bebas">
                  {t('stars.page', 'Page')} {currentPage} {t('stars.of', 'of')} {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="font-bebas uppercase"
                >
                  {t('stars.next', 'Next')}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
      
      {/* Dialogs */}
      <DeclareInterestDialog open={declareInterestOpen} onOpenChange={setDeclareInterestOpen} />
      <ContactDialog open={contactOpen} onOpenChange={setContactOpen} />
      <PortfolioRequestDialog open={portfolioOpen} onOpenChange={setPortfolioOpen} />
    </div>
  );
};

export default Stars;