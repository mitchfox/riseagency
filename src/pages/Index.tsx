import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { WorkWithUsDialog } from "@/components/WorkWithUsDialog";
import { IntroModal } from "@/components/IntroModal";
import { useState, useEffect } from "react";
import bannerHero from "@/assets/banner-hero-team.jpg";
import marbleBg from "@/assets/marble-bg.png";
import riseStarIcon from "@/assets/rise-star-icon.png";
import marbleTexture from "@/assets/marble-texture.png";
import playersNetwork from "@/assets/players-network.jpg";
import clubsNetwork from "@/assets/clubs-network.jpg";
import scoutsNetwork from "@/assets/scouts-network.jpg";
import coachesNetwork from "@/assets/coaches-network.jpg";

const newsArticles = [
  {
    title: "Omotoye Scores Brace in Derby Victory",
    date: "March 15, 2025",
    excerpt: "Belgian striker shines with two crucial goals in regional derby, extending his impressive season form.",
    link: "/players/tyrese-omotoye"
  },
  {
    title: "Mulligan Earns International Call-Up",
    date: "March 10, 2025",
    excerpt: "Czech midfielder's consistent performances earn recognition at senior national team level.",
    link: "/players/michael-vit-mulligan"
  },
  {
    title: "Young Talent Svoboda Joins Senior Training",
    date: "March 5, 2025",
    excerpt: "18-year-old prospect invited to train with Bohemians 1905 first team, marking significant career step.",
    link: "/players/jaroslav-svoboda"
  }
];

const Index = () => {
  const [showIntroModal, setShowIntroModal] = useState(false);

  useEffect(() => {
    const hasSeenIntro = localStorage.getItem("intro-modal-seen");
    if (!hasSeenIntro) {
      setShowIntroModal(true);
    }
  }, []);

  return (
    <>
      <IntroModal open={showIntroModal} onOpenChange={setShowIntroModal} />
      <Header />
      <div className="min-h-screen bg-background">
        {/* Hero Banner Section */}
        <section className="relative h-screen flex items-center justify-center overflow-hidden pt-10">
          <div 
            className="absolute inset-0 bg-cover bg-center scale-105 animate-[scale-in_20s_ease-in-out_infinite_alternate]"
            style={{ backgroundImage: `url(${bannerHero})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background" />
          
          <div className="relative z-10 container mx-auto px-4">
            <div className="max-w-5xl mx-auto text-center space-y-12 animate-fade-in">
              <div className="space-y-6">
                <div className="overflow-hidden relative w-full mb-8">
                  <h1 
                    className="text-6xl md:text-8xl lg:text-9xl font-bebas font-bold uppercase tracking-[0.15em] text-white whitespace-nowrap inline-block animate-[scroll-left_45s_linear_infinite]"
                    style={{
                      textShadow: '0 4px 12px rgba(0, 0, 0, 0.8), 0 2px 4px rgba(0, 0, 0, 0.6)',
                    }}
                  >
                    REALISE POTENTIAL • REALISE POTENTIAL • REALISE POTENTIAL • REALISE POTENTIAL • REALISE POTENTIAL • REALISE POTENTIAL •
                  </h1>
                </div>
                <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto font-light tracking-wide">
                  Elite Football Representation & Performance Optimisation
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <Link to="/stars">
                  <Button 
                    size="lg" 
                    className="btn-shine text-lg font-bebas uppercase tracking-widest px-10 py-7 hover:scale-105 transition-all duration-300 shadow-xl"
                  >
                    View Our Stars
                  </Button>
                </Link>
                <WorkWithUsDialog>
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="text-lg font-bebas uppercase tracking-widest px-10 py-7 hover:scale-105 transition-all duration-300 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20"
                  >
                    Work With Us
                  </Button>
                </WorkWithUsDialog>
              </div>
            </div>
          </div>
          
          {/* Scroll indicator */}
          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
              <div className="w-1 h-3 bg-white/50 rounded-full animate-pulse"></div>
            </div>
          </div>
        </section>

        {/* Agency Overview Section */}
        <section className="py-32 px-4 bg-background relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent"></div>
          <div className="container mx-auto max-w-5xl relative z-10">
            <div className="text-center space-y-8 animate-fade-in">
              <div className="inline-block">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                  Who We Are
                </span>
              </div>
              <h2 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider text-foreground leading-tight">
                Performance-First <span className="text-primary">Agency</span>
              </h2>
              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-4xl mx-auto font-light">
                RISE Football is the performance-first agency, ensuring our players, coaches and clubs develop optimally on the pitch, as well as off. To reach their potential, we provide our clients with an extensive training, analysis and recovery protocol while utilising our network to put them in a position to succeed.
              </p>
              <div className="flex justify-center gap-12 pt-8">
                <div className="text-center">
                  <div className="text-5xl font-bebas text-primary mb-2">50+</div>
                  <div className="text-sm uppercase tracking-wider text-muted-foreground">Players</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bebas text-primary mb-2">15+</div>
                  <div className="text-sm uppercase tracking-wider text-muted-foreground">Countries</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bebas text-primary mb-2">100+</div>
                  <div className="text-sm uppercase tracking-wider text-muted-foreground">Transfers</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* News Section */}
        <section className="py-32 px-4 bg-muted/30">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-16 space-y-4">
              <div className="inline-block">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                  Latest Updates
                </span>
              </div>
              <h2 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider text-foreground">
                Latest <span className="text-primary">News</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Stay updated with our players' achievements and agency news
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {newsArticles.map((article, index) => (
                <Link
                  key={index}
                  to={article.link}
                  className="group bg-background rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2"
                >
                  <div className="p-8 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/30"></div>
                      <div className="text-xs text-primary uppercase tracking-widest font-bebas">
                        {article.date}
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-primary/30"></div>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bebas uppercase text-foreground leading-tight group-hover:text-primary transition-colors duration-300">
                      {article.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center text-primary font-bebas uppercase tracking-wider text-sm pt-2 group-hover:gap-3 transition-all">
                      <span>Read More</span>
                      <span className="inline-block group-hover:translate-x-2 transition-transform">→</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Inbound CTA Section - Moved to top */}
        <section className="py-32 px-4 bg-background relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5"></div>
          <div className="container mx-auto max-w-7xl relative z-10">
            <div className="text-center mb-20 space-y-4">
              <div className="inline-block">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                  Our Network
                </span>
              </div>
              <h2 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider text-foreground">
                Join Our <span className="text-primary">Network</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Whether you're a player, club, scout, or coach - we want to hear from you
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Players */}
              <div className="relative overflow-hidden rounded-2xl group cursor-pointer">
                <div className="aspect-[4/5] relative">
                  <img 
                    src={playersNetwork} 
                    alt="Players" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-90 group-hover:opacity-95 transition-opacity duration-300" />
                </div>
                <div className="absolute inset-0 flex flex-col justify-end p-8 space-y-4">
                  <div className="transform transition-transform duration-300 group-hover:-translate-y-2">
                    <h3 className="text-4xl font-bebas uppercase tracking-wider text-white mb-3">
                      Players
                    </h3>
                    <p className="text-white/90 text-sm leading-relaxed mb-4">
                      Take your career to the next level with professional representation
                    </p>
                    <Button 
                      asChild
                      size="lg" 
                      className="btn-shine w-full text-lg font-bebas uppercase tracking-wider"
                    >
                      <Link to="/contact">Get In Touch</Link>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Clubs */}
              <div className="relative overflow-hidden rounded-2xl group cursor-pointer">
                <div className="aspect-[4/5] relative">
                  <img 
                    src={clubsNetwork} 
                    alt="Clubs" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-90 group-hover:opacity-95 transition-opacity duration-300" />
                </div>
                <div className="absolute inset-0 flex flex-col justify-end p-8 space-y-4">
                  <div className="transform transition-transform duration-300 group-hover:-translate-y-2">
                    <h3 className="text-4xl font-bebas uppercase tracking-wider text-white mb-3">
                      Clubs
                    </h3>
                    <p className="text-white/90 text-sm leading-relaxed mb-4">
                      Discover top talent for your squad through our extensive network
                    </p>
                    <Button 
                      asChild
                      size="lg" 
                      className="btn-shine w-full text-lg font-bebas uppercase tracking-wider"
                    >
                      <Link to="/contact">Partner With Us</Link>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Scouts */}
              <div className="relative overflow-hidden rounded-2xl group cursor-pointer">
                <div className="aspect-[4/5] relative">
                  <img 
                    src={scoutsNetwork} 
                    alt="Scouts" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-90 group-hover:opacity-95 transition-opacity duration-300" />
                </div>
                <div className="absolute inset-0 flex flex-col justify-end p-8 space-y-4">
                  <div className="transform transition-transform duration-300 group-hover:-translate-y-2">
                    <h3 className="text-4xl font-bebas uppercase tracking-wider text-white mb-3">
                      Scouts
                    </h3>
                    <p className="text-white/90 text-sm leading-relaxed mb-4">
                      Collaborate with us to identify and develop emerging talent
                    </p>
                    <Button 
                      asChild
                      size="lg" 
                      className="btn-shine w-full text-lg font-bebas uppercase tracking-wider"
                    >
                      <Link to="/contact">Join Network</Link>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Coaches */}
              <div className="relative overflow-hidden rounded-2xl group cursor-pointer">
                <div className="aspect-[4/5] relative">
                  <img 
                    src={coachesNetwork} 
                    alt="Coaches" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-90 group-hover:opacity-95 transition-opacity duration-300" />
                </div>
                <div className="absolute inset-0 flex flex-col justify-end p-8 space-y-4">
                  <div className="transform transition-transform duration-300 group-hover:-translate-y-2">
                    <h3 className="text-4xl font-bebas uppercase tracking-wider text-white mb-3">
                      Coaches
                    </h3>
                    <p className="text-white/90 text-sm leading-relaxed mb-4">
                      Connect with professional representation for your coaching career
                    </p>
                    <Button 
                      asChild
                      size="lg" 
                      className="btn-shine w-full text-lg font-bebas uppercase tracking-wider"
                    >
                      <Link to="/contact">Connect With Us</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* Services Section for Players - HIDDEN */}
        <section className="hidden">
          <div className="container mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Develop */}
              <div className="group relative overflow-hidden rounded-lg border border-primary/20 hover:border-primary transition-all">
                <div className="p-8 space-y-4">
                  <h3 className="text-4xl font-bebas uppercase tracking-wider text-primary">
                    Develop
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Receive expert training to maximise your physical capacity for performance. Push the limits of your body and mind to truly know how far you can go in your career.
                  </p>
                </div>
              </div>

              {/* Perform */}
              <div className="group relative overflow-hidden rounded-lg border border-primary/20 hover:border-primary transition-all">
                <div className="p-8 space-y-4">
                  <h3 className="text-4xl font-bebas uppercase tracking-wider text-primary">
                    Perform
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Play your best on a consistent basis through smart preparation, including psychological training sessions and pre-match analysis specific to your individual matchups.
                  </p>
                </div>
              </div>

              {/* Attract */}
              <div className="group relative overflow-hidden rounded-lg border border-primary/20 hover:border-primary transition-all">
                <div className="p-8 space-y-4">
                  <h3 className="text-4xl font-bebas uppercase tracking-wider text-primary">
                    Attract
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Through our vast scouting network, we maximise visibility across the footballing world to ensure player interest and demand.
                  </p>
                </div>
              </div>

              {/* Sign */}
              <div className="group relative overflow-hidden rounded-lg border border-primary/20 hover:border-primary transition-all">
                <div className="p-8 space-y-4">
                  <h3 className="text-4xl font-bebas uppercase tracking-wider text-primary">
                    Sign
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Sign the dotted line after our team of intermediaries negotiate new and improved contracts. Retain confidence knowing your career opportunities are being created and finalised.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Additional Services */}
        <section className="py-32 px-4 relative overflow-hidden bg-muted/30">
          <div 
            className="absolute inset-0 opacity-20"
            style={{ backgroundImage: `url(${marbleTexture})`, backgroundRepeat: "repeat" }}
          />
          <div className="container mx-auto max-w-5xl relative z-10">
            <div className="text-center mb-20 space-y-4">
              <div className="inline-block">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                  What We Offer
                </span>
              </div>
              <h2 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider text-foreground">
                Our <span className="text-primary">Services</span>
              </h2>
            </div>
            
            <div className="space-y-8">
              <div className="flex items-start gap-8 group p-8 rounded-2xl bg-background/50 backdrop-blur-sm border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl">
                <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center bg-primary/10 rounded-xl group-hover:scale-110 transition-transform">
                  <img src={riseStarIcon} alt="Rise Star" className="w-10 h-10 object-contain" />
                </div>
                <div>
                  <h3 className="text-3xl font-bebas uppercase tracking-wider text-foreground mb-3 group-hover:text-primary transition-colors">
                    Stakeholder Management
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    Career management through contract negotiations, loans and transfers
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-8 group p-8 rounded-2xl bg-background/50 backdrop-blur-sm border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl">
                <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center bg-primary/10 rounded-xl group-hover:scale-110 transition-transform">
                  <img src={riseStarIcon} alt="Rise Star" className="w-10 h-10 object-contain" />
                </div>
                <div>
                  <h3 className="text-3xl font-bebas uppercase tracking-wider text-foreground mb-3 group-hover:text-primary transition-colors">
                    Brand Image
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    Development of your brand image and management of public relations
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-8 group p-8 rounded-2xl bg-background/50 backdrop-blur-sm border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl">
                <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center bg-primary/10 rounded-xl group-hover:scale-110 transition-transform">
                  <img src={riseStarIcon} alt="Rise Star" className="w-10 h-10 object-contain" />
                </div>
                <div>
                  <h3 className="text-3xl font-bebas uppercase tracking-wider text-foreground mb-3 group-hover:text-primary transition-colors">
                    Commercial Interests
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    Creating relationships with major brands and negotiating the best sponsorship opportunities
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-4 bg-background relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-primary/10"></div>
          <div className="container mx-auto max-w-4xl text-center space-y-12 relative z-10">
            <div className="space-y-6">
              <div className="inline-block">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                  Get Started
                </span>
              </div>
              <h2 className="text-6xl md:text-8xl font-bebas uppercase tracking-wider text-foreground leading-tight">
                Take The <span className="text-primary">1st Step</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Reach out to one of our representatives for a direct 1:1 conversation about yourself, or a player under your care.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-4">
              <WorkWithUsDialog>
                <Button 
                  size="lg" 
                  className="btn-shine text-xl font-bebas uppercase tracking-wider px-12 py-7 hover:scale-105 transition-transform shadow-xl"
                >
                  Work With Us
                </Button>
              </WorkWithUsDialog>
              <Button 
                asChild
                variant="outline"
                size="lg" 
                className="text-xl font-bebas uppercase tracking-wider px-12 py-7 hover:scale-105 transition-transform"
              >
                <a href="mailto:jolon.levene@risefootballagency.com?subject=Portfolio%20Request">
                  Request Our Portfolio
                </a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground italic">
              Learn more about our portfolio, including how we work and with whom we work.
            </p>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
};

export default Index;
