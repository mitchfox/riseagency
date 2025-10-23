import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import bannerHero from "@/assets/banner-hero.jpg";
import workingTogether from "@/assets/working-together.jpg";
import celebration1 from "@/assets/gallery/celebration-1.jpg";
import matchAction2 from "@/assets/gallery/match-action-2.jpg";
import matchAction3 from "@/assets/gallery/match-action-3.jpg";

const Performance = () => {
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
              Performance
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Elevating your game through comprehensive support and development
            </p>
          </div>
        </section>

        {/* ATTRACT Section */}
        <section className="relative min-h-screen grid md:grid-cols-2">
          <div className="relative bg-black flex items-center justify-center p-8 md:p-16">
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-40"
              style={{ backgroundImage: `url(${celebration1})` }}
            />
            <div className="relative z-10 max-w-xl">
              <div className="absolute -right-8 top-0 text-6xl md:text-8xl font-bebas text-white/10 rotate-90 origin-top-right">
                RISE
              </div>
              <h2 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider text-white mb-8">
                Attract
              </h2>
              <p className="text-lg md:text-xl text-white/90 mb-8 leading-relaxed">
                Through our vast scouting network, we maximise visibility across the footballing world to ensure player interest and demand.
              </p>
              <Button 
                asChild 
                size="lg" 
                className="bg-primary/90 hover:bg-primary text-black font-bebas uppercase tracking-wider group"
              >
                <Link to="/contact">
                  Learn More 
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>
          <div 
            className="relative bg-cover bg-center min-h-[50vh] md:min-h-full"
            style={{ backgroundImage: `url(${matchAction2})` }}
          />
        </section>

        {/* SIGN Section */}
        <section className="relative min-h-screen grid md:grid-cols-2">
          <div 
            className="relative bg-cover bg-center min-h-[50vh] md:min-h-full order-2 md:order-1"
            style={{ backgroundImage: `url(${matchAction3})` }}
          />
          <div className="relative bg-muted flex items-center justify-center p-8 md:p-16 order-1 md:order-2">
            <div className="relative z-10 max-w-xl">
              <div className="absolute -left-8 top-0 text-6xl md:text-8xl font-bebas text-foreground/10 -rotate-90 origin-top-left">
                RISE
              </div>
              <h2 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider mb-8">
                Sign
              </h2>
              <p className="text-lg md:text-xl text-foreground/80 mb-8 leading-relaxed">
                Sign the dotted line after our team of intermediaries negotiate new and improved contracts. Retain confidence knowing your career opportunities are being created and finalised.
              </p>
              <Button 
                asChild 
                size="lg" 
                className="bg-foreground hover:bg-foreground/90 text-background font-bebas uppercase tracking-wider group"
              >
                <Link to="/contact">
                  Learn More 
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* DEVELOP Section */}
        <section className="relative min-h-screen grid md:grid-cols-2">
          <div className="relative bg-black flex items-center justify-center p-8 md:p-16">
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-40"
              style={{ backgroundImage: `url(${bannerHero})` }}
            />
            <div className="relative z-10 max-w-xl">
              <div className="absolute -right-8 top-0 text-6xl md:text-8xl font-bebas text-white/10 rotate-90 origin-top-right">
                RISE
              </div>
              <h2 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider text-white mb-8">
                Develop
              </h2>
              <p className="text-lg md:text-xl text-white/90 mb-8 leading-relaxed">
                Receive expert training to maximise your physical capacity for performance. Push the limits of your body and mind to truly know how far you can go in your career.
              </p>
              <Button 
                asChild 
                size="lg" 
                className="bg-primary/90 hover:bg-primary text-black font-bebas uppercase tracking-wider group"
              >
                <Link to="/contact">
                  Learn More 
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>
          <div 
            className="relative bg-cover bg-center min-h-[50vh] md:min-h-full"
            style={{ backgroundImage: `url(${bannerHero})` }}
          />
        </section>

        {/* PERFORM Section */}
        <section className="relative min-h-screen grid md:grid-cols-2">
          <div 
            className="relative bg-cover bg-center min-h-[50vh] md:min-h-full order-2 md:order-1"
            style={{ backgroundImage: `url(${workingTogether})` }}
          />
          <div className="relative bg-muted flex items-center justify-center p-8 md:p-16 order-1 md:order-2">
            <div className="relative z-10 max-w-xl">
              <div className="absolute -left-8 top-0 text-6xl md:text-8xl font-bebas text-foreground/10 -rotate-90 origin-top-left">
                RISE
              </div>
              <h2 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider mb-8">
                Perform
              </h2>
              <p className="text-lg md:text-xl text-foreground/80 mb-8 leading-relaxed">
                Play your best on a consistent basis through smart preparation, including psychological training sessions and pre-match analysis specific to your individual matchups.
              </p>
              <Button 
                asChild 
                size="lg" 
                className="bg-foreground hover:bg-foreground/90 text-background font-bebas uppercase tracking-wider group"
              >
                <Link to="/contact">
                  Learn More 
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
              Ready to Elevate Your Game?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join RISE and experience comprehensive support designed to maximize your potential
            </p>
            <Button asChild size="lg" className="btn-shine font-bebas uppercase tracking-wider">
              <Link to="/contact">Get Started</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Performance;
