import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PlayerCard } from "@/components/PlayerCard";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LateralFilter } from "@/components/LateralFilter";
import { LayoutGrid, List, Users, MessageCircle, ArrowRight, ChevronLeft, ChevronRight, FileText, Search, BarChart3, GraduationCap, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { parsePlayerBio } from "@/lib/playerDataParser";
import { DeclareInterestDialog } from "@/components/DeclareInterestDialog";
import { ContactDialog } from "@/components/ContactDialog";
import { PortfolioRequestDialog } from "@/components/PortfolioRequestDialog";
import { useNavigate } from "react-router-dom";
import { HoverText } from "@/components/HoverText";

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
      <div className="min-h-screen bg-background">
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
    <div className="min-h-screen bg-background">
      <SEO 
        title="Our Stars - Professional Football Players | RISE Agency"
        description="Meet our talented roster of professional footballers across Europe. View player profiles, positions, and clubs from our extensive network."
        image="/og-preview-stars.png"
        url="/stars"
      />
      <Header />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="py-8 px-4">
          <div className="container mx-auto">
            {/* Title - Condensed */}
            <div className="text-center mb-6">
              <h1 className="text-6xl md:text-8xl font-bebas uppercase tracking-wider text-foreground">
                {t('stars.title', 'Our Stars')}
              </h1>
              <p className="text-muted-foreground mt-4 max-w-3xl mx-auto">
                {t('stars.subtitle', 'Elite Football Representation & Performance Optimisation')}
              </p>
              
              {/* Capability Tiles */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 max-w-4xl mx-auto">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-card/30 border border-border/50">
                  <Search className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm text-foreground/80">Extensive Scouting Network</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-card/30 border border-border/50">
                  <BarChart3 className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm text-foreground/80">Deep Analysis Models</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-card/30 border border-border/50">
                  <GraduationCap className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm text-foreground/80">Expert Coaching</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-card/30 border border-border/50">
                  <Trophy className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm text-foreground/80">Premier League Background</span>
                </div>
              </div>
              
              <p className="text-muted-foreground mt-6 max-w-3xl mx-auto text-sm">
                {t('stars.description', 'Because of our background, we have the mandate to many top players across Europe\'s major divisions not under exclusive representation. Clubs can request our full portfolio through the button below.')}
              </p>
            </div>

            {/* Interest Cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <Card 
                className="bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary transition-colors cursor-pointer group btn-shine"
                onClick={() => setDeclareInterestOpen(true)}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="p-2 sm:p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0">
                        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                      </div>
                       <div className="min-w-0">
                         <h3 className="font-bebas uppercase tracking-wider text-base sm:text-lg mb-1 break-words">
                           <HoverText text={t('stars.declare_interest', 'Declare Interest in Player(s)')} />
                         </h3>
                         <p className="text-xs sm:text-sm text-muted-foreground break-words">
                           {t('stars.declare_interest_desc', 'Select players and submit your interest')}
                         </p>
                       </div>
                    </div>
                    <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-primary group-hover:translate-x-1 transition-transform shrink-0" />
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                className="bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary transition-colors cursor-pointer group btn-shine"
                onClick={() => setContactOpen(true)}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="p-2 sm:p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0">
                        <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                      </div>
                       <div className="min-w-0">
                         <h3 className="font-bebas uppercase tracking-wider text-base sm:text-lg mb-1 break-words">
                           <HoverText text={t('stars.contact_btn', 'Contact')} />
                         </h3>
                         <p className="text-xs sm:text-sm text-muted-foreground break-words">
                           {t('stars.contact_desc', 'Get in touch with us directly')}
                         </p>
                       </div>
                    </div>
                    <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-primary group-hover:translate-x-1 transition-transform shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary transition-colors cursor-pointer group btn-shine"
                onClick={() => setPortfolioOpen(true)}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="p-2 sm:p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0">
                        <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                      </div>
                       <div className="min-w-0">
                         <h3 className="font-bebas uppercase tracking-wider text-base sm:text-lg mb-1 break-words">
                           <HoverText text={t('stars.request_portfolio', 'Request Full Portfolio')} />
                         </h3>
                         <p className="text-xs sm:text-sm text-muted-foreground break-words">
                           {t('stars.request_portfolio_desc', 'Access our complete player portfolio')}
                         </p>
                       </div>
                    </div>
                    <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-primary group-hover:translate-x-1 transition-transform shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* View Mode Toggle - Icons Only */}
            <div className="flex justify-center gap-2 mb-6">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-3 transition-colors rounded ${
                  viewMode === "grid"
                    ? "bg-primary text-black"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-3 transition-colors rounded ${
                  viewMode === "list"
                    ? "bg-primary text-black"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
                aria-label="List view"
              >
                <List className="w-5 h-5" />
              </button>
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