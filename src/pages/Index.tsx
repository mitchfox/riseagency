import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center px-4 pt-16">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background z-0" />
          <div className="container mx-auto relative z-10">
            <div className="max-w-5xl mx-auto text-center space-y-8">
              <h1 className="text-6xl md:text-8xl font-bebas uppercase tracking-wider text-foreground">
                How We Rise
              </h1>
              <div className="bg-primary/90 backdrop-blur-sm p-8 md:p-12 rounded-lg">
                <p className="text-lg md:text-xl text-background leading-relaxed font-medium">
                  We are your backing in the highly competitive football industry, tackling your challenges and ensuring your success through comprehensive, client-focused solutions. Leveraging deep knowledge and experience in the game, we offer insights you cannot find elsewhere. With respect for both your time and ours, we deliver premium service with unmatched efficiency while our innovative strategies realise your potential, ensuring we rise together.
                </p>
              </div>
              <Link to="/players">
                <Button 
                  size="lg" 
                  className="text-2xl font-bebas uppercase tracking-widest px-12 py-8 hover:scale-105 transition-transform"
                >
                  Players
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
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-primary" />
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
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-primary" />
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
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-primary" />
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
                className="text-xl font-bebas uppercase tracking-wider px-8 py-6"
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
