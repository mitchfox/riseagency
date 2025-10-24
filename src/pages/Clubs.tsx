import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import bannerHero from "@/assets/banner-hero.jpg";
import blackMarble from "@/assets/black-marble-bg.png";
import clubsSection from "@/assets/clubs-section.png";
import clubsSection2 from "@/assets/clubs-section-2.png";
import clubsNetwork from "@/assets/clubs-network.jpg";

const Clubs = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bannerHero})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
          
          <div className="relative container mx-auto px-4 text-center z-10">
            <h1 className="text-6xl md:text-8xl font-bebas uppercase tracking-wider text-white mb-4">
              For Clubs
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Strategic partnerships for competitive advantage
            </p>
          </div>
        </section>

        {/* STRATEGISE Section - Text Left, Image Right */}
        <section className="grid md:grid-cols-2">
          <div 
            className="relative p-8 md:p-16 flex items-center"
            style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="max-w-xl">
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-[--gold] mb-6">
                Strategise
              </h2>
              <p className="text-base md:text-xl text-white/90 leading-relaxed">
                Work alongside our recruitment team to identify talent that fits your club's philosophy and tactical needs. We provide comprehensive player analysis and market intelligence.
              </p>
            </div>
          </div>
          <div 
            className="relative min-h-[300px] md:min-h-[600px] bg-cover bg-center"
            style={{ backgroundImage: `url(${clubsSection})` }}
          />
        </section>

        {/* RECRUIT Section - Image Left, Text Right */}
        <section className="grid md:grid-cols-2">
          <div 
            className="relative min-h-[300px] md:min-h-[600px] bg-cover bg-center order-2 md:order-1"
            style={{ backgroundImage: `url(${clubsNetwork})` }}
          />
          <div 
            className="relative p-8 md:p-16 flex items-center order-1 md:order-2"
            style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="max-w-xl">
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-[--gold] mb-6">
                Recruit
              </h2>
              <p className="text-base md:text-xl text-white/90 leading-relaxed">
                Access our extensive network of talented players across all levels. Our professional intermediaries facilitate seamless negotiations and contract discussions.
              </p>
            </div>
          </div>
        </section>

        {/* OPTIMISE Section - Text Left, Image Right */}
        <section className="grid md:grid-cols-2">
          <div 
            className="relative p-8 md:p-16 flex items-center"
            style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="max-w-xl">
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-[--gold] mb-6">
                Optimise
              </h2>
              <p className="text-base md:text-xl text-white/90 leading-relaxed">
                Enhance your squad's performance through our player development programs. We provide physical and psychological support to maximize your team's potential.
              </p>
            </div>
          </div>
          <div 
            className="relative min-h-[300px] md:min-h-[600px] bg-cover bg-center"
            style={{ backgroundImage: `url(${clubsSection2})` }}
          />
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
              Partner With Us
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Discover how we can help strengthen your squad with exceptional talent
            </p>
            <Button asChild size="lg" className="btn-shine font-bebas uppercase tracking-wider">
              <Link to="/contact">Get In Touch</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Clubs;
