import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import bannerHero from "@/assets/banner-hero.jpg";
import clubsSection from "@/assets/clubs-section.png";
import clubsSection2 from "@/assets/clubs-section-2.png";

const Clubs = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bannerHero})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
          
          <div className="relative container mx-auto px-4 text-center z-10">
            <h1 className="text-6xl md:text-8xl font-bebas uppercase tracking-wider text-white mb-6">
              For Clubs
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Strategic partnerships for competitive advantage
            </p>
          </div>
        </section>

        {/* Clubs Section 1 - STRATEGISE & RECRUIT */}
        <section className="relative">
          <img 
            src={clubsSection} 
            alt="Strategise and Recruit for Clubs" 
            className="w-full h-auto"
          />
        </section>

        {/* Clubs Section 2 - OPTIMISE */}
        <section className="relative">
          <img 
            src={clubsSection2} 
            alt="Optimise Club Performance" 
            className="w-full h-auto"
          />
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-muted/30">
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
