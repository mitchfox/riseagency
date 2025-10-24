import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import bannerHero from "@/assets/banner-hero.jpg";
import blackMarble from "@/assets/black-marble-smudged.png";
import coachesSection from "@/assets/coaches-section.png";
import coachesSection2 from "@/assets/coaches-section-2.png";
import coachesNetwork from "@/assets/coaches-network.jpg";

const Coaches = () => {
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
              For Coaches
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Professional representation for coaching excellence
            </p>
          </div>
        </section>

        {/* RESULTS Section - Text Left, Image Right */}
        <section className="grid md:grid-cols-2">
          <div 
            className="relative p-8 md:p-16 flex items-center"
            style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="max-w-xl">
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-[--gold] mb-6">
                Results
              </h2>
              <p className="text-base md:text-xl text-white/90 leading-relaxed">
                We showcase your coaching achievements and philosophy to clubs seeking experienced leadership. Your track record speaks volumes through our professional presentation.
              </p>
            </div>
          </div>
          <div 
            className="relative min-h-[300px] md:min-h-[600px] bg-cover bg-center"
            style={{ backgroundImage: `url(${coachesSection})` }}
          />
        </section>

        {/* FOSTER Section - Image Left, Text Right */}
        <section className="grid md:grid-cols-2">
          <div 
            className="relative min-h-[300px] md:min-h-[600px] bg-cover bg-center order-2 md:order-1"
            style={{ backgroundImage: `url(${coachesNetwork})` }}
          />
          <div 
            className="relative p-8 md:p-16 flex items-center order-1 md:order-2"
            style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="max-w-xl">
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-[--gold] mb-6">
                Foster
              </h2>
              <p className="text-base md:text-xl text-white/90 leading-relaxed">
                Build lasting relationships within the footballing community. We connect you with clubs, players, and industry professionals who value your coaching expertise.
              </p>
            </div>
          </div>
        </section>

        {/* ALLURE Section - Text Left, Image Right */}
        <section className="grid md:grid-cols-2">
          <div 
            className="relative p-8 md:p-16 flex items-center"
            style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="max-w-xl">
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-[--gold] mb-6">
                Allure
              </h2>
              <p className="text-base md:text-xl text-white/90 leading-relaxed">
                Position yourself for career advancement with strategic representation. We create opportunities that align with your ambitions and coaching philosophy.
              </p>
            </div>
          </div>
          <div 
            className="relative min-h-[300px] md:min-h-[600px] bg-cover bg-center"
            style={{ backgroundImage: `url(${coachesSection2})` }}
          />
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-background">
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
