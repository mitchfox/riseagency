import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { players } from "@/data/players";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle, ExternalLink, Video } from "lucide-react";

const PlayerDetail = () => {
  const { playername } = useParams<{ playername: string }>();
  const navigate = useNavigate();
  const [currentFormationIndex, setCurrentFormationIndex] = useState(0);
  const [currentStrengthIndex, setCurrentStrengthIndex] = useState(0);
  
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

  // Auto-rotate strengths and play style every 5 seconds
  useEffect(() => {
    if (player?.strengthsAndPlayStyle && player.strengthsAndPlayStyle.length > 0) {
      const interval = setInterval(() => {
        setCurrentStrengthIndex((prev) => 
          (prev + 1) % player.strengthsAndPlayStyle!.length
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
      {/* Player Profile */}
      <main className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Player Image */}
          <div className="relative">
            {/* Back Button - Positioned over image */}
            <div className="absolute top-4 left-4 z-20">
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
            
            <div className="relative overflow-hidden aspect-[3/4]">
              <img
                src={player.image}
                alt={player.name}
                className="w-full h-full object-cover"
              />
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            </div>
          </div>

          {/* Player Info - Desktop: Grid 2x2, Mobile: Stacked */}
          <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-6 lg:space-y-0">
            {/* Name and Position */}
            <div className="lg:col-span-2">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bebas uppercase text-foreground mb-4 leading-none tracking-wide">
                {player.name}
              </h1>
              <p className="text-lg text-muted-foreground uppercase tracking-widest font-semibold">
                {player.position} • Age {player.age} • {player.nationality}
              </p>
            </div>

            {/* WhatsApp Contact Button */}
            {player.whatsapp && (
              <div className="lg:col-span-2">
                <Button 
                  asChild
                  size="lg"
                  className="btn-shine w-full text-lg font-bebas uppercase tracking-wider"
                >
                  <a 
                    href={`https://wa.me/${player.whatsapp.replace(/\+/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Contact About This Player
                  </a>
                </Button>
              </div>
            )}

            {/* Bio */}
            <div className="lg:col-span-2">
              <h2 className="text-sm font-bebas text-primary uppercase tracking-widest mb-4 text-lg">
                About
              </h2>
              <p className="text-foreground/80 leading-relaxed">
                {player.bio}
              </p>
            </div>

            {/* Highlights Video */}
            <div className="lg:col-span-2">
              <h2 className="text-sm font-bebas text-primary uppercase tracking-widest mb-4 text-lg">
                Season Highlights
              </h2>
              <div className="relative aspect-video bg-secondary/30 rounded-lg overflow-hidden group hover:shadow-lg transition-all">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <Video className="w-16 h-16 text-primary" />
                  <p className="text-foreground/60 font-bebas text-xl uppercase tracking-wider">
                    Highlights Coming Soon
                  </p>
                </div>
              </div>
            </div>

            {/* External Links */}
            {player.externalLinks && player.externalLinks.length > 0 && (
              <div>
                <h2 className="text-sm font-bebas text-primary uppercase tracking-widest mb-4 text-lg">
                  External Links
                </h2>
                <div className="flex flex-wrap gap-3">
                  {player.externalLinks.map((link, index) => (
                    <Button
                      key={index}
                      asChild
                      variant="outline"
                      size="sm"
                    >
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold"
                      >
                        {link.label}
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths & Play Style Slider */}
            {player.strengthsAndPlayStyle && player.strengthsAndPlayStyle.length > 0 && (
              <div>
                <h2 className="text-sm font-bebas text-primary uppercase tracking-widest mb-4 text-lg">
                  Strengths & Play Style
                </h2>
                <div className="bg-secondary/30 backdrop-blur-sm p-6 rounded-lg min-h-[140px] flex items-center">
                  <p className="text-foreground/90 leading-relaxed transition-all duration-500">
                    {player.strengthsAndPlayStyle[currentStrengthIndex]}
                  </p>
                </div>
                <div className="flex justify-center gap-2 mt-4">
                  {player.strengthsAndPlayStyle.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentStrengthIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentStrengthIndex 
                          ? 'bg-primary w-6' 
                          : 'bg-primary/30'
                      }`}
                      aria-label={`Go to strength ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Tactical Formations Slider */}
            {player.tacticalFormations && player.tacticalFormations.length > 0 && (
              <div>
                <h2 className="text-sm font-bebas text-primary uppercase tracking-widest mb-4 text-lg">
                  Tactical Formations
                </h2>
                <div className="bg-secondary/30 backdrop-blur-sm p-6 rounded-lg text-center min-h-[140px] flex flex-col justify-center">
                  <div className="text-3xl font-bbh text-primary mb-2 transition-all duration-500">
                    {player.tacticalFormations[currentFormationIndex].formation}
                  </div>
                  <div className="text-sm text-muted-foreground uppercase tracking-widest font-semibold transition-all duration-500">
                    {player.tacticalFormations[currentFormationIndex].club}
                  </div>
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

            {/* Stats */}
            <div className="lg:col-span-2">
              <h2 className="text-sm font-bebas text-primary uppercase tracking-widest mb-6 text-lg">
                Season Stats
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
          </div>
        </div>

        {/* Contact Section */}
        <section className="py-16 px-4 bg-secondary/20 border-t border-primary/10">
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
