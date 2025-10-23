import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import bannerHero from "@/assets/banner-hero.jpg";
import scoutsNetwork from "@/assets/scouts-network.jpg";

const Scouts = () => {
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
              For Scouts
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Collaborate with us to discover talent
            </p>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-16 md:py-24 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="space-y-12">
              <div>
                <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
                  Talent Identification
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  We work alongside scouts to identify and evaluate emerging talent. Our collaborative approach ensures comprehensive player assessment and development tracking.
                </p>
              </div>

              <div>
                <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
                  Network Access
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Gain access to our extensive network of clubs, coaches, and industry professionals. We facilitate connections that create opportunities for the players you discover.
                </p>
              </div>

              <div>
                <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
                  Professional Development
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  We support scouts with industry insights, best practices, and opportunities to enhance their scouting expertise and expand their reach.
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
              alt="Scout network"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          </div>
        </section>

        {/* Scout Request Form Section */}
        <section className="py-16 md:py-24 px-4 bg-muted/30">
          <div className="container mx-auto max-w-2xl">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-4">
                Request a Scout at Your Game
              </h2>
              <p className="text-lg text-muted-foreground">
                Fill out the form below and we'll get in touch
              </p>
            </div>
            
            <form className="space-y-6 bg-card p-8 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="playerName">Player Name *</Label>
                  <Input id="playerName" placeholder="John Doe" required />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" placeholder="john@example.com" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="position">Position *</Label>
                  <Input id="position" placeholder="e.g., Striker, Midfielder" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gameDate">Game Date *</Label>
                <Input id="gameDate" type="date" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue">Venue/Location *</Label>
                <Input id="venue" placeholder="Stadium name and address" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="details">Additional Details</Label>
                <Textarea 
                  id="details" 
                  placeholder="Tell us about the game, level of competition, or any other relevant information..."
                  className="min-h-[120px]"
                />
              </div>

              <Button type="submit" size="lg" className="w-full btn-shine font-bebas uppercase tracking-wider text-lg">
                Submit Request
              </Button>
            </form>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-muted/30">
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
    </div>
  );
};

export default Scouts;
