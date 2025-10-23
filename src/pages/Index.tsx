import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { WorkWithUsDialog } from "@/components/WorkWithUsDialog";
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

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
        {/* Hero Banner Section */}
        <section className="relative h-[60vh] min-h-[500px] flex items-center justify-center overflow-hidden pt-16">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bannerHero})` }}
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10">
            <div className="max-w-full mx-auto text-center space-y-10">
              <div className="overflow-hidden relative w-full">
                <h1 className="text-5xl md:text-7xl font-bebas font-bold uppercase tracking-wider text-white drop-shadow-2xl whitespace-nowrap inline-block animate-[scroll-left_60s_linear_infinite]">
                  REALISE POTENTIAL • REALISE POTENTIAL • REALISE POTENTIAL • REALISE POTENTIAL • REALISE POTENTIAL • REALISE POTENTIAL • REALISE POTENTIAL • REALISE POTENTIAL •
                </h1>
              </div>
              <Link to="/stars">
                <Button 
                  size="lg" 
                  className="btn-shine text-lg font-bebas uppercase tracking-widest px-8 py-5 hover:scale-105 transition-transform bg-primary hover:bg-primary/90"
                >
                  View Stars
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Agency Overview Section */}
        <section className="py-20 px-4 bg-background">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center space-y-6">
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
                Performance-First Agency
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                RISE Football is the performance-first agency, ensuring our players, coaches and clubs develop optimally on the pitch, as well as off. To reach their potential, we provide our clients with an extensive training, analysis and recovery protocol while utilising our network to put them in a position to succeed.
              </p>
            </div>
          </div>
        </section>

        {/* News Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground mb-4">
                Latest <span className="text-primary">News</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Stay updated with our players' achievements and agency news
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {newsArticles.map((article, index) => (
                <Link
                  key={index}
                  to={article.link}
                  className="group bg-secondary/30 backdrop-blur-sm rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 transition-all hover:scale-[1.02]"
                >
                  <div className="p-6 space-y-3">
                    <div className="text-xs text-primary uppercase tracking-wider font-bebas">
                      {article.date}
                    </div>
                    <h3 className="text-2xl font-bebas uppercase text-foreground leading-tight group-hover:text-primary transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {article.excerpt}
                    </p>
                    <div className="text-sm text-primary font-bebas uppercase tracking-wider">
                      Read More →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Inbound CTA Section - Moved to top */}
        <section className="py-24 px-4 bg-secondary/30">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider text-foreground mb-4">
                Join Our <span className="text-primary">Network</span>
              </h2>
              <p className="text-base text-muted-foreground tracking-normal max-w-2xl mx-auto">
                Whether you're a player, club, scout, or coach - we want to hear from you
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Players */}
              <div className="relative overflow-hidden rounded-lg group">
                <div className="aspect-[4/5] relative">
                  <img 
                    src={playersNetwork} 
                    alt="Players" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3">
                  <h3 className="text-3xl font-bebas uppercase tracking-wider text-white">
                    Players
                  </h3>
                  <p className="text-white/80 text-sm">
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

              {/* Clubs */}
              <div className="relative overflow-hidden rounded-lg group">
                <div className="aspect-[4/5] relative">
                  <img 
                    src={clubsNetwork} 
                    alt="Clubs" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3">
                  <h3 className="text-3xl font-bebas uppercase tracking-wider text-white">
                    Clubs
                  </h3>
                  <p className="text-white/80 text-sm">
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

              {/* Scouts */}
              <div className="relative overflow-hidden rounded-lg group">
                <div className="aspect-[4/5] relative">
                  <img 
                    src={scoutsNetwork} 
                    alt="Scouts" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3">
                  <h3 className="text-3xl font-bebas uppercase tracking-wider text-white">
                    Scouts
                  </h3>
                  <p className="text-white/80 text-sm">
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

              {/* Coaches */}
              <div className="relative overflow-hidden rounded-lg group">
                <div className="aspect-[4/5] relative">
                  <img 
                    src={coachesNetwork} 
                    alt="Coaches" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3">
                  <h3 className="text-3xl font-bebas uppercase tracking-wider text-white">
                    Coaches
                  </h3>
                  <p className="text-white/80 text-sm">
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
        <section className="py-24 px-4 relative overflow-hidden">
          <div 
            className="absolute inset-0 opacity-30"
            style={{ backgroundImage: `url(${marbleTexture})`, backgroundRepeat: "repeat" }}
          />
          <div className="container mx-auto max-w-4xl relative z-10">
            <div className="space-y-12">
              <div className="flex items-start gap-6 group">
                <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center">
                  <img src={riseStarIcon} alt="Rise Star" className="w-16 h-16 object-contain" />
                </div>
                <div>
                  <h3 className="text-2xl font-bebas uppercase tracking-wider text-foreground mb-2">
                    Stakeholder Management
                  </h3>
                  <p className="text-muted-foreground">
                    Career management through contract negotiations, loans and transfers
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6 group">
                <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center">
                  <img src={riseStarIcon} alt="Rise Star" className="w-16 h-16 object-contain" />
                </div>
                <div>
                  <h3 className="text-2xl font-bebas uppercase tracking-wider text-foreground mb-2">
                    Brand Image
                  </h3>
                  <p className="text-muted-foreground">
                    Development of your brand image and management of public relations
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6 group">
                <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center">
                  <img src={riseStarIcon} alt="Rise Star" className="w-16 h-16 object-contain" />
                </div>
                <div>
                  <h3 className="text-2xl font-bebas uppercase tracking-wider text-foreground mb-2">
                    Commercial Interests
                  </h3>
                  <p className="text-muted-foreground">
                    Creating relationships with major brands and negotiating the best sponsorship opportunities
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-4">
          <div className="container mx-auto max-w-3xl text-center space-y-8">
            <h2 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider text-foreground">
              Take The <span className="text-primary">1st Step</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Reach out to one of our representatives for a direct 1:1 conversation about yourself, or a player under your care.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <WorkWithUsDialog>
                <Button 
                  size="lg" 
                  className="btn-shine text-xl font-bebas uppercase tracking-wider px-8 py-6"
                >
                  Work With Us
                </Button>
              </WorkWithUsDialog>
              <Button 
                asChild
                variant="outline"
                size="lg" 
                className="text-xl font-bebas uppercase tracking-wider px-8 py-6"
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
