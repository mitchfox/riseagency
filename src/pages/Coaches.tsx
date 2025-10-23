import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import bannerHero from "@/assets/banner-hero.jpg";
import coachesNetwork from "@/assets/coaches-network.jpg";

const Coaches = () => {
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
              For Coaches
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Professional representation for coaching careers
            </p>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-16 md:py-24 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="space-y-12">
              <div>
                <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
                  Career Advancement
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  We help coaches navigate their career path, connecting them with opportunities that match their philosophy and ambitions. From youth development to senior positions, we facilitate the right moves.
                </p>
              </div>

              <div>
                <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
                  Contract Negotiation
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Our team ensures coaches receive fair compensation and beneficial terms. We handle negotiations professionally, allowing you to focus on what you do best - coaching.
                </p>
              </div>

              <div>
                <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
                  Network Access
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Gain access to our extensive network of clubs, sporting directors, and industry professionals. We open doors to opportunities across multiple leagues and countries.
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
                src={coachesNetwork} 
                alt="Coaching network" 
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
              Advance Your Coaching Career
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Let us help you reach the next level in your coaching journey
            </p>
            <Button asChild size="lg" className="btn-shine font-bebas uppercase tracking-wider">
              <Link to="/contact">Connect With Us</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Coaches;
