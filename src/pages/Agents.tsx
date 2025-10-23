import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import bannerHero from "@/assets/banner-hero.jpg";
import scoutsNetwork from "@/assets/scouts-network.jpg";

const Agents = () => {
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
              For Agents
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Collaborate with us to maximize opportunities
            </p>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-16 md:py-24 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="space-y-12">
              <div>
                <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
                  Strategic Partnerships
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  We work alongside fellow agents to create mutually beneficial opportunities. Our collaborative approach ensures the best outcomes for players and all parties involved.
                </p>
              </div>

              <div>
                <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
                  Market Intelligence
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Share and receive valuable market insights, transfer opportunities, and industry intelligence through our professional network.
                </p>
              </div>

              <div>
                <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
                  Professional Standards
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  We maintain the highest standards of professionalism and ethics in all our dealings, building relationships based on trust and transparency.
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
                src={scoutsNetwork} 
                alt="Agent network" 
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
              Build Strategic Partnerships
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Connect with us to explore collaboration opportunities
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

export default Agents;
