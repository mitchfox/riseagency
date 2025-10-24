import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { RequestScoutDialog } from "@/components/RequestScoutDialog";
import bannerHero from "@/assets/banner-hero.jpg";
import blackMarble from "@/assets/black-marble-smudged.png";
import scoutsNetwork from "@/assets/scouts-network.jpg";
import matchAction1 from "@/assets/gallery/match-action-1.jpg";
import teamDiscussion from "@/assets/gallery/team-discussion.jpg";

const Scouts = () => {
  const [requestScoutOpen, setRequestScoutOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 md:pt-16">
        {/* Hero Section */}
        <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bannerHero})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
          
          <div className="relative container mx-auto px-4 text-center z-10">
            <h1 className="text-6xl md:text-8xl font-bebas uppercase tracking-wider text-white mb-4">
              For Scouts
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Collaborate with us to discover talent
            </p>
          </div>
        </section>

        {/* IDENTIFY Section - Text Left, Image Right */}
        <section className="grid md:grid-cols-2">
          <div 
            className="relative p-8 md:p-16 flex items-center"
            style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="max-w-xl">
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-[--gold] mb-6">
                Identify
              </h2>
              <p className="text-base md:text-xl text-white/90 leading-relaxed">
                Work alongside our team to identify and evaluate emerging talent. Our collaborative approach ensures comprehensive player assessment and development tracking.
              </p>
            </div>
          </div>
          <div 
            className="relative min-h-[300px] md:min-h-[600px] bg-cover bg-center"
            style={{ backgroundImage: `url(${matchAction1})` }}
          />
        </section>

        {/* NETWORK Section - Image Left, Text Right */}
        <section className="grid md:grid-cols-2">
          <div 
            className="relative min-h-[300px] md:min-h-[600px] bg-cover bg-center order-2 md:order-1"
            style={{ backgroundImage: `url(${scoutsNetwork})` }}
          />
          <div 
            className="relative p-8 md:p-16 flex items-center order-1 md:order-2"
            style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="max-w-xl">
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-[--gold] mb-6">
                Network
              </h2>
              <p className="text-base md:text-xl text-white/90 leading-relaxed">
                Gain access to our extensive network of clubs, coaches, and industry professionals. We facilitate connections that create opportunities for the players you discover.
              </p>
            </div>
          </div>
        </section>

        {/* DEVELOP Section - Text Left, Image Right */}
        <section className="grid md:grid-cols-2">
          <div 
            className="relative p-8 md:p-16 flex items-center"
            style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="max-w-xl">
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-[--gold] mb-6">
                Develop
              </h2>
              <p className="text-base md:text-xl text-white/90 leading-relaxed">
                Enhance your scouting expertise through industry insights, best practices, and opportunities to expand your reach. We support your professional growth in talent identification.
              </p>
            </div>
          </div>
          <div 
            className="relative min-h-[300px] md:min-h-[600px] bg-cover bg-center"
            style={{ backgroundImage: `url(${teamDiscussion})` }}
          />
        </section>

        {/* Player Request Section */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
              Request a Scout at Your Game
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Playing in an upcoming match? Request one of our scouts to attend and evaluate your performance
            </p>
            <Button 
              onClick={() => setRequestScoutOpen(true)}
              size="lg" 
              className="btn-shine font-bebas uppercase tracking-wider"
            >
              Request Scout Attendance
            </Button>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 md:py-16 bg-background">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
              Join Our Scouting Network
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
      <RequestScoutDialog open={requestScoutOpen} onOpenChange={setRequestScoutOpen} />
    </div>
  );
};

export default Scouts;
