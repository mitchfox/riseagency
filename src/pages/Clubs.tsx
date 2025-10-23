import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import bannerHero from "@/assets/banner-hero.jpg";
import clubsNetwork from "@/assets/clubs-network.jpg";

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
              Access elite talent through our extensive network
            </p>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-16 md:py-24 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="space-y-12">
              <div>
                <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
                  Player Recruitment
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  We connect clubs with exceptional talent that matches their specific needs. Our comprehensive scouting network and detailed player analysis ensure you find the right fit for your squad.
                </p>
              </div>

              <div>
                <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
                  Negotiation & Transfers
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Our experienced team handles all aspects of transfer negotiations, ensuring smooth transactions that benefit all parties involved. We facilitate deals with transparency and professionalism.
                </p>
              </div>

              <div>
                <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
                  Long-Term Partnerships
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  We believe in building lasting relationships with clubs, providing ongoing support and access to our talent pool as your needs evolve.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Image Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="relative h-[400px] rounded-lg overflow-hidden">
              <img 
                src={clubsNetwork} 
                alt="Club partnerships" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          </div>
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
