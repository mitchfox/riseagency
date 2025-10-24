import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import bannerHero from "@/assets/banner-hero.jpg";
import blackMarble from "@/assets/black-marble-smudged.png";
import celebration1 from "@/assets/gallery/celebration-1.jpg";
import matchAction2 from "@/assets/gallery/match-action-2.jpg";
import matchAction3 from "@/assets/gallery/match-action-3.jpg";
import trainingAction from "@/assets/gallery/training-action.jpg";

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
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bebas uppercase tracking-wider text-white mb-2 md:mb-4">
              Performance
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 max-w-3xl mx-auto px-4">
              Elevating your game through comprehensive support and development
            </p>
          </div>
        </section>

        {/* ATTRACT Section - Text Left, Image Right */}
        <section className="grid md:grid-cols-2">
          <div 
            className="relative p-6 sm:p-8 md:p-12 lg:p-16 flex items-center"
            style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="max-w-xl">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bebas uppercase tracking-wider text-[--gold] mb-4 md:mb-6">
                Attract
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-white/90 leading-relaxed">
                Through our vast scouting network, we maximise visibility across the footballing world to ensure player interest and demand.
              </p>
            </div>
          </div>
          <div 
            className="relative min-h-[400px] md:min-h-[600px] bg-cover bg-center"
            style={{ backgroundImage: `url(${celebration1})` }}
          />
        </section>

        {/* SIGN Section - Image Left, Text Right */}
        <section className="grid md:grid-cols-2">
          <div 
            className="relative min-h-[400px] md:min-h-[600px] bg-cover bg-center order-2 md:order-1"
            style={{ backgroundImage: `url(${matchAction2})` }}
          />
          <div 
            className="relative p-6 sm:p-8 md:p-12 lg:p-16 flex items-center order-1 md:order-2"
            style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="max-w-xl">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bebas uppercase tracking-wider text-[--gold] mb-4 md:mb-6">
                Sign
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-white/90 leading-relaxed">
                Sign the dotted line after our team of intermediaries negotiate new and improved contracts. Retain confidence knowing your career opportunities are being created and finalised.
              </p>
            </div>
          </div>
        </section>

        {/* DEVELOP Section - Text Left, Image Right */}
        <section className="grid md:grid-cols-2">
          <div 
            className="relative p-6 sm:p-8 md:p-12 lg:p-16 flex items-center"
            style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="max-w-xl">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bebas uppercase tracking-wider text-[--gold] mb-4 md:mb-6">
                Develop
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-white/90 leading-relaxed">
                Receive expert training to maximise your physical capacity for performance. Push the limits of your body and mind to truly know how far you can go in your career.
              </p>
            </div>
          </div>
          <div 
            className="relative min-h-[400px] md:min-h-[600px] bg-cover bg-center"
            style={{ backgroundImage: `url(${matchAction3})` }}
          />
        </section>

        {/* PERFORM Section - Image Left, Text Right */}
        <section className="grid md:grid-cols-2">
          <div 
            className="relative min-h-[400px] md:min-h-[600px] bg-cover bg-center order-2 md:order-1"
            style={{ backgroundImage: `url(${trainingAction})` }}
          />
          <div 
            className="relative p-6 sm:p-8 md:p-12 lg:p-16 flex items-center order-1 md:order-2"
            style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="max-w-xl">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bebas uppercase tracking-wider text-[--gold] mb-4 md:mb-6">
                Perform
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-white/90 leading-relaxed">
                Play your best on a consistent basis through smart preparation, including psychological training sessions and pre-match analysis specific to your individual matchups.
              </p>
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
