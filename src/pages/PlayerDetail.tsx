import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { players } from "@/data/players";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle, ExternalLink, Video } from "lucide-react";
import { FormationDisplay } from "@/components/FormationDisplay";
import blackMarbleBg from "@/assets/black-marble-menu.png";

const PlayerDetail = () => {
  const { playername } = useParams<{ playername: string }>();
  const navigate = useNavigate();
  const [currentFormationIndex, setCurrentFormationIndex] = useState(0);
  const [currentVideoType, setCurrentVideoType] = useState<'season' | number>('season'); // 'season' or match index
  
  const player = players.find((p) => p.id === playername);

  // Auto-rotate tactical formations every 5 seconds
  useEffect(() => {
    if (player?.tacticalFormations && player.tacticalFormations.length > 0) {
      const interval = setInterval(() => {
        setCurrentFormationIndex((prev) => 
          (prev + 1) % player.tacticalFormations!.length
        );
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [player]);

  if (!player) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">Player Not Found</h1>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Directory
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background pt-16">
        <main className="container mx-auto px-4 py-2">
          {/* Back Button */}
          <div className="mb-2">
            <Button
              onClick={() => navigate("/players")}
              variant="outline"
              size="sm"
              className="group font-bebas uppercase tracking-wider border-primary/30 bg-background/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back to Players
            </Button>
          </div>

          {/* Player Name, Info, and Contact - Full width with grid background */}
          <div className="mb-4 relative">
            {/* Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
            
            <div className="relative flex flex-wrap items-center justify-between gap-4 lg:gap-6 p-6">
              {/* Player Name with Golden Gloss */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[--gold]/20 via-[--gold]/10 to-transparent blur-xl" />
                <h1 className="relative text-5xl md:text-6xl font-bebas uppercase text-foreground leading-none tracking-wide">
                  {player.name}
                </h1>
              </div>
              
              <p className="text-4xl md:text-5xl text-primary uppercase tracking-widest font-bebas font-semibold leading-none">
                {player.position}
              </p>
              
              <p className="text-4xl md:text-5xl text-primary uppercase tracking-widest font-bebas font-semibold leading-none">
                Age {player.age}
              </p>
              
              <p className="text-4xl md:text-5xl text-primary uppercase tracking-widest font-bebas font-semibold leading-none">
                {player.nationality}
              </p>
              
              {player.whatsapp && (
                <Button 
                  asChild
                  size="default"
                  className="btn-shine text-base font-bebas uppercase tracking-wider ml-auto"
                >
                  <a 
                    href={`https://wa.me/${player.whatsapp.replace(/\+/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Contact About This Player
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Highlights Video - Full Width 16:9 with Club Logo Overlays */}
          <div className="mb-8">
            <div className="relative aspect-video bg-secondary/30 rounded-lg overflow-hidden group">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <Video className="w-16 h-16 text-primary" />
                <p className="text-foreground/60 font-bebas text-xl uppercase tracking-wider">
                  {currentVideoType === 'season' ? 'Season Highlights' : `Match Highlights`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {currentVideoType !== 'season' && player.videoHighlights?.matchHighlights?.[currentVideoType]
                    ? `vs ${player.videoHighlights.matchHighlights[currentVideoType].opponent}`
                    : 'Coming Soon'}
                </p>
              </div>
              
              {/* Club Logo Overlays - Bottom */}
              {player.videoHighlights?.matchHighlights && player.videoHighlights.matchHighlights.length > 0 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                  {/* Season Highlights Button */}
                  <button
                    onClick={() => setCurrentVideoType('season')}
                    className={`w-12 h-12 rounded border-2 transition-all ${
                      currentVideoType === 'season'
                        ? 'border-[--gold] bg-[--gold]/20 scale-110'
                        : 'border-white/30 bg-black/40 hover:border-[--gold]/50'
                    }`}
                    title="Season Highlights"
                  >
                    <Video className="w-6 h-6 text-white mx-auto" />
                  </button>
                  
                  {/* Match Highlights Buttons */}
                  {player.videoHighlights.matchHighlights.map((match, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentVideoType(index)}
                      className={`w-12 h-12 rounded border-2 transition-all overflow-hidden ${
                        currentVideoType === index
                          ? 'border-[--gold] scale-110 ring-2 ring-[--gold]/50'
                          : 'border-white/30 hover:border-[--gold]/50'
                      }`}
                      title={`vs ${match.opponent}`}
                    >
                      <img 
                        src={match.clubLogo} 
                        alt={match.opponent}
                        className="w-full h-full object-cover bg-white/90"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Player Image and Bio Section - Image smaller, bio wider */}
          <div className="mb-12">
            <h2 className="text-sm font-bebas text-primary uppercase tracking-widest mb-4 text-lg">
              BIOGRAPHY
            </h2>
            <div className="flex gap-6 items-start">
              {/* Player Image - Smaller */}
              <div className="relative overflow-hidden w-48 h-64 rounded-lg flex-shrink-0">
                <img
                  src={player.image}
                  alt={player.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
              </div>

              {/* Bio - Wider, approximately 5 lines */}
              <div className="flex-1">
                <p className="text-foreground/80 leading-relaxed text-base line-clamp-5">
                  {player.bio}
                </p>
              </div>
            </div>
          </div>

          {/* Stats, Strengths, Scheme History Grid */}
          <div className="grid lg:grid-cols-2 gap-8 mb-12">

            {/* Stats - Full Width */}
            <div className="lg:col-span-2">
              <h2 className="text-sm font-bebas text-primary uppercase tracking-widest mb-6 text-lg">
                Season Stats
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {player.stats.goals !== undefined && (
                  <div className="text-center p-6 bg-background">
                    <div className="text-3xl font-bbh text-primary mb-2">
                      {player.stats.goals}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                      Goals
                    </div>
                  </div>
                )}
                {player.stats.assists !== undefined && (
                  <div className="text-center p-6 bg-background">
                    <div className="text-3xl font-bbh text-primary mb-2">
                      {player.stats.assists}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                      Assists
                    </div>
                  </div>
                )}
                {player.stats.cleanSheets !== undefined && (
                  <div className="text-center p-6 bg-background">
                    <div className="text-3xl font-bbh text-primary mb-2">
                      {player.stats.cleanSheets}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                      Clean Sheets
                    </div>
                  </div>
                )}
                {player.stats.saves !== undefined && (
                  <div className="text-center p-6 bg-background">
                    <div className="text-3xl font-bbh text-primary mb-2">
                      {player.stats.saves}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                      Saves
                    </div>
                  </div>
                )}
                <div className="text-center p-6 bg-background">
                  <div className="text-3xl font-bbh text-primary mb-2">
                    {player.stats.matches}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                    Matches
                  </div>
                </div>
                <div className="text-center p-6 bg-background">
                  <div className="text-3xl font-bbh text-primary mb-2">
                    {player.stats.minutes}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                    Minutes
                  </div>
                </div>
              </div>
            </div>

            {/* Strengths & Play Style */}
            {player.strengthsAndPlayStyle && player.strengthsAndPlayStyle.length > 0 && (
              <div>
                <h2 className="text-sm font-bebas text-primary uppercase tracking-widest mb-4 text-lg">
                  Strengths & Play Style
                </h2>
                <div className="bg-secondary/30 backdrop-blur-sm p-6 rounded-lg">
                  <ul className="space-y-3">
                    {player.strengthsAndPlayStyle.map((strength, index) => (
                      <li key={index} className="flex items-start gap-3 text-foreground/90">
                        <span className="text-primary mt-1">•</span>
                        <span className="leading-relaxed">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Scheme History */}
            {player.tacticalFormations && player.tacticalFormations.length > 0 && (
              <div>
                <h2 className="text-sm font-bebas text-primary uppercase tracking-widest mb-4 text-lg">
                  Scheme History
                </h2>
                <div className="bg-secondary/30 backdrop-blur-sm p-6 rounded-lg">
                  {/* Formation Name on Top */}
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bbh text-primary mb-1 transition-all duration-500">
                      {player.tacticalFormations[currentFormationIndex].formation}
                    </div>
                    <div className="text-sm text-muted-foreground uppercase tracking-widest font-semibold transition-all duration-500">
                      {player.tacticalFormations[currentFormationIndex].club}
                    </div>
                  </div>
                  
                  {/* Formation Visual Below */}
                  <FormationDisplay 
                    selectedPosition={player.position} 
                    playerName={player.name} 
                    playerImage={player.image}
                  />
                </div>
                <div className="flex justify-center gap-2 mt-4">
                  {player.tacticalFormations.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentFormationIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentFormationIndex 
                          ? 'bg-primary w-6' 
                          : 'bg-primary/30'
                      }`}
                      aria-label={`Go to formation ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}

          </div>

        {/* Contact Section */}
        <section className="py-16 px-4 bg-secondary/20 border-t border-primary/10 -mx-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-4xl font-bebas text-center uppercase tracking-wider text-foreground mb-12">
              Get In <span className="text-primary">Touch</span>
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Clubs/Agents */}
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-bebas uppercase tracking-wider text-primary">
                  Clubs & Agents
                </h3>
                <p className="text-sm text-muted-foreground">
                  Interested in signing this player? Let's discuss opportunities.
                </p>
                <Button 
                  asChild
                  size="lg"
                  className="w-full font-bebas uppercase tracking-wider"
                >
                  <a href={`https://wa.me/${player.whatsapp?.replace(/\+/g, '')}`} target="_blank" rel="noopener noreferrer">
                    Contact Us
                  </a>
                </Button>
              </div>

              {/* Media */}
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-bebas uppercase tracking-wider text-primary">
                  Media
                </h3>
                <p className="text-sm text-muted-foreground">
                  Press inquiries and interview requests welcome.
                </p>
                <Button 
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full font-bebas uppercase tracking-wider"
                >
                  <a href="mailto:jolon.levene@risefootballagency.com?subject=Media%20Inquiry">
                    Email Us
                  </a>
                </Button>
              </div>

              {/* Sponsors */}
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-bebas uppercase tracking-wider text-primary">
                  Sponsors
                </h3>
                <p className="text-sm text-muted-foreground">
                  Explore partnership and sponsorship opportunities.
                </p>
                <Button 
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full font-bebas uppercase tracking-wider"
                >
                  <a href="mailto:jolon.levene@risefootballagency.com?subject=Sponsorship%20Inquiry">
                    Learn More
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      </div>
    </>
  );
};

export default PlayerDetail;
