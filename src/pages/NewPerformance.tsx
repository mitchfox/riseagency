import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import bannerHero from "@/assets/banner-hero.jpg";

const NewPerformance = () => {
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
              Performance
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Maximizing potential through data-driven insights
            </p>
          </div>
        </section>

        {/* Content Sections */}
        <section className="py-16 md:py-24 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="space-y-16">
              <div>
                <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
                  Performance Analysis
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                  We utilize cutting-edge technology and data analytics to track and improve player performance. Our comprehensive analysis covers:
                </p>
                <ul className="list-disc list-inside text-lg text-muted-foreground space-y-2 ml-4">
                  <li>Physical metrics and fitness tracking</li>
                  <li>Technical skills assessment</li>
                  <li>Tactical understanding and decision-making</li>
                  <li>Match performance statistics</li>
                </ul>
              </div>

              <div>
                <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
                  Individual Development Plans
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Each player receives a personalized development roadmap based on detailed performance data. We identify areas for improvement and create targeted training programs to address specific needs.
                </p>
              </div>

              <div>
                <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
                  Video Analysis
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Our team provides detailed video breakdowns of match performances, training sessions, and specific skill work. This visual feedback helps players understand their strengths and areas for development.
                </p>
              </div>

              <div>
                <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
                  Benchmarking
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  We compare player statistics against professional standards at various levels, providing clear targets and realistic progression pathways.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
              Optimize Your Performance
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Learn how our performance analysis can elevate your game
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

export default NewPerformance;
