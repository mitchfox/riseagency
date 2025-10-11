import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import bannerHero from "@/assets/banner-hero-new.jpg";
import marbleBg from "@/assets/marble-bg.png";
import riseStarIcon from "@/assets/rise-star-icon.png";

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
          <div className="container mx-auto relative z-10 px-4">
            <div className="max-w-7xl mx-auto text-center space-y-8">
              <div className="overflow-hidden">
                <h1 className="text-8xl md:text-[12rem] font-bebas font-bold uppercase tracking-wider text-white drop-shadow-2xl whitespace-nowrap animate-[slide-in-right_20s_linear_infinite]">
                  RISE TOGETHER • RISE TOGETHER • RISE TOGETHER • RISE TOGETHER • RISE TOGETHER • RISE TOGETHER •
                </h1>
              </div>
              <Link to="/players">
                <Button 
                  size="lg" 
                  className="btn-shine text-2xl font-bebas uppercase tracking-widest px-12 py-8 hover:scale-105 transition-transform bg-primary hover:bg-primary/90"
                >
                  View Players
                </Button>
              </Link>
            </div>
          </div>
        </section>


        {/* Services Section for Players */}
        <section className="py-24 px-4">
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
        <section className="py-24 px-4 bg-secondary/30">
          <div className="container mx-auto max-w-4xl">
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

        {/* Inbound CTA Section */}
        <section className="py-24 px-4 bg-secondary/30">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-16">
              <h2 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider text-foreground mb-4">
                Join Our <span className="text-primary">Network</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Whether you're a player, club, or scout - we want to hear from you
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-background/50 backdrop-blur-sm p-8 rounded-lg text-center space-y-4 border border-primary/20 hover:border-primary transition-all">
                <h3 className="text-3xl font-bebas uppercase tracking-wider text-primary">
                  Players
                </h3>
                <p className="text-muted-foreground">
                  Take your career to the next level with professional representation
                </p>
                <Button 
                  asChild
                  size="lg" 
                  className="btn-shine w-full text-xl font-bebas uppercase tracking-wider"
                >
                  <Link to="/contact">Get In Touch</Link>
                </Button>
              </div>
              <div className="bg-background/50 backdrop-blur-sm p-8 rounded-lg text-center space-y-4 border border-primary/20 hover:border-primary transition-all">
                <h3 className="text-3xl font-bebas uppercase tracking-wider text-primary">
                  Clubs
                </h3>
                <p className="text-muted-foreground">
                  Discover top talent for your squad through our extensive network
                </p>
                <Button 
                  asChild
                  size="lg" 
                  className="btn-shine w-full text-xl font-bebas uppercase tracking-wider"
                >
                  <Link to="/contact">Partner With Us</Link>
                </Button>
              </div>
              <div className="bg-background/50 backdrop-blur-sm p-8 rounded-lg text-center space-y-4 border border-primary/20 hover:border-primary transition-all">
                <h3 className="text-3xl font-bebas uppercase tracking-wider text-primary">
                  Scouts
                </h3>
                <p className="text-muted-foreground">
                  Collaborate with us to identify and develop emerging talent
                </p>
                <Button 
                  asChild
                  size="lg" 
                  className="btn-shine w-full text-xl font-bebas uppercase tracking-wider"
                >
                  <Link to="/contact">Join Network</Link>
                </Button>
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
              <Button 
                asChild
                size="lg" 
                className="btn-shine text-xl font-bebas uppercase tracking-wider px-8 py-6"
              >
                <a href="mailto:jolon.levene@risefootballagency.com?subject=Portfolio%20Request">
                  Request Our Portfolio
                </a>
              </Button>
              <Button 
                asChild
                variant="outline"
                size="lg" 
                className="text-xl font-bebas uppercase tracking-wider px-8 py-6"
              >
                <a href="http://wa.link/mabnsw" target="_blank" rel="noopener noreferrer">
                  Reach Out To Us
                </a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground italic">
              Learn more about our portfolio, including how we work and with whom we work.
            </p>
          </div>
        </section>
      </div>
    </>
  );
};

export default Index;
