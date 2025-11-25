import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, MessageCircle, Mail, MapPin, Users, TrendingUp, Award } from "lucide-react";
import bannerHero from "@/assets/banner-hero.jpg";
import blackMarble from "@/assets/black-marble-smudged.png";

const positions = [
  { 
    code: "GK", 
    name: "Goalkeeper",
    criteria: [
      { skill: "Shot Stopping", description: "Ability to make saves in various situations" },
      { skill: "Distribution", description: "Quality of passing and throwing from the back" },
      { skill: "Command of Area", description: "Presence and control in the penalty box" },
      { skill: "One-on-One", description: "Ability to face attackers in isolation" },
      { skill: "Communication", description: "Organizing defensive line and teammates" },
      { skill: "Positioning", description: "Reading the game and anticipating danger" },
      { skill: "Footwork", description: "Technical ability with feet in build-up play" }
    ]
  },
  { 
    code: "FB", 
    name: "Full Back",
    criteria: [
      { skill: "1v1 Defending", description: "Ability to defend against wingers" },
      { skill: "Recovery Speed", description: "Pace to track back and cover" },
      { skill: "Crossing Quality", description: "Delivery from wide areas" },
      { skill: "Overlapping Runs", description: "Timing and frequency of forward runs" },
      { skill: "Positional Awareness", description: "Balance between attack and defense" },
      { skill: "Stamina", description: "Ability to maintain high work rate" },
      { skill: "Tactical Intelligence", description: "Understanding when to push and drop" }
    ]
  },
  { 
    code: "CB", 
    name: "Centre Back",
    criteria: [
      { skill: "Aerial Ability", description: "Winning headers in both boxes" },
      { skill: "Reading the Game", description: "Anticipation and interception timing" },
      { skill: "Tackling", description: "Timing and execution of challenges" },
      { skill: "Ball Playing", description: "Passing range and composure under pressure" },
      { skill: "Physical Presence", description: "Strength in duels and set pieces" },
      { skill: "Concentration", description: "Maintaining focus for 90 minutes" },
      { skill: "Leadership", description: "Organizing and directing teammates" }
    ]
  },
  { 
    code: "CDM", 
    name: "Defensive Midfielder",
    criteria: [
      { skill: "Ball Winning", description: "Tackles, interceptions, and duels" },
      { skill: "Positioning", description: "Screening the defense effectively" },
      { skill: "Passing Range", description: "Short and long distribution quality" },
      { skill: "Decision Making", description: "When to press, drop, or cover" },
      { skill: "Physical Presence", description: "Strength in midfield battles" },
      { skill: "Game Management", description: "Controlling tempo and transitions" },
      { skill: "Discipline", description: "Tactical awareness and avoiding cards" }
    ]
  },
  { 
    code: "CM", 
    name: "Central Midfielder",
    criteria: [
      { skill: "Technical Ability", description: "First touch and ball control" },
      { skill: "Vision", description: "Seeing and executing passes" },
      { skill: "Work Rate", description: "Box-to-box energy and contribution" },
      { skill: "Pressing", description: "Intensity and timing when out of possession" },
      { skill: "Goal Threat", description: "Late runs into the box and finishing" },
      { skill: "Versatility", description: "Ability to play multiple midfield roles" },
      { skill: "Composure", description: "Decision making under pressure" }
    ]
  },
  { 
    code: "CAM", 
    name: "Attacking Midfielder",
    criteria: [
      { skill: "Creativity", description: "Ability to unlock defenses" },
      { skill: "Final Ball", description: "Quality of key passes and assists" },
      { skill: "Movement", description: "Finding space between lines" },
      { skill: "Finishing", description: "Shooting accuracy and technique" },
      { skill: "Dribbling", description: "Close control in tight spaces" },
      { skill: "Set Pieces", description: "Free kicks and corner delivery" },
      { skill: "Game Intelligence", description: "When to drop, turn, or shoot" }
    ]
  },
  { 
    code: "W", 
    name: "Winger",
    criteria: [
      { skill: "1v1 Dribbling", description: "Beating defenders in isolation" },
      { skill: "Pace", description: "Speed to stretch defenses" },
      { skill: "Crossing", description: "Quality of delivery from wide areas" },
      { skill: "Goal Threat", description: "Cutting inside and finishing" },
      { skill: "Direct Running", description: "Taking on defenders with purpose" },
      { skill: "Work Rate", description: "Tracking back and defensive contribution" },
      { skill: "Decision Making", description: "When to cross, shoot, or pass" }
    ]
  },
  { 
    code: "CF", 
    name: "Centre Forward",
    criteria: [
      { skill: "Finishing", description: "Conversion rate and composure in the box" },
      { skill: "Movement", description: "Timing of runs and positioning" },
      { skill: "Hold-Up Play", description: "Link play with back to goal" },
      { skill: "Aerial Ability", description: "Heading for goal and flick-ons" },
      { skill: "Physical Presence", description: "Strength against defenders" },
      { skill: "Pressing", description: "Leading the line defensively" },
      { skill: "Clinical Instinct", description: "Being in the right place at the right time" }
    ]
  }
];

const Scouts = () => {
  const [selectedPosition, setSelectedPosition] = useState<typeof positions[0] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextPosition = () => {
    setCurrentIndex((prev) => (prev + 1) % positions.length);
  };

  const prevPosition = () => {
    setCurrentIndex((prev) => (prev - 1 + positions.length) % positions.length);
  };

  const handleWhatsApp = () => {
    window.open("https://wa.me/447856255509", "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="For Scouts - Discover Talent with RISE Agency"
        description="Join RISE's scouting network. Access our database, competitive incentives, and forever commission structure. Scout smarter across Europe."
        image="/og-preview-scouts.png"
        url="/scouts"
      />
      <Header />
      
      <main className="pt-24 md:pt-16">
        {/* Hero Section */}
        <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bannerHero})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
          
          <div className="relative container mx-auto px-4 text-center z-10">
            <h1 className="text-6xl md:text-8xl font-bebas uppercase tracking-wider text-white mb-4">
              Scout With RISE
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-8">
              Join our elite scouting network with competitive incentives and forever commission
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button 
                size="lg" 
                className="btn-shine font-bebas uppercase tracking-wider"
                onClick={handleWhatsApp}
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Contact via WhatsApp
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="font-bebas uppercase tracking-wider bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20"
                asChild
              >
                <a href="mailto:contact@riseagency.com">
                  <Mail className="mr-2 h-5 w-5" />
                  Email Us
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Position Criteria Section */}
        <section className="py-16 md:py-24 px-4 bg-muted/30">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider mb-4">
                What We Look For
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Our position-specific scouting criteria based on real data from thousands of reports
              </p>
            </div>

            {/* Position Slider */}
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-center gap-4 mb-8">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prevPosition}
                  className="h-12 w-12 rounded-full"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>

                <div className="flex gap-2 overflow-x-auto px-4 max-w-3xl">
                  {positions.map((position, index) => (
                    <Button
                      key={position.code}
                      variant={index === currentIndex ? "default" : "outline"}
                      className={`font-bebas text-lg px-6 py-6 uppercase tracking-wider whitespace-nowrap transition-all ${
                        index === currentIndex ? "scale-110" : "scale-100 opacity-50"
                      }`}
                      onClick={() => {
                        setCurrentIndex(index);
                        setSelectedPosition(position);
                      }}
                    >
                      {position.code}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextPosition}
                  className="h-12 w-12 rounded-full"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>

              {/* Current Position Display */}
              <Card className="p-8 bg-card/50 backdrop-blur-sm">
                <div className="text-center mb-6">
                  <Badge variant="secondary" className="text-2xl px-6 py-2 font-bebas uppercase mb-2">
                    {positions[currentIndex].code}
                  </Badge>
                  <h3 className="text-3xl font-bebas uppercase tracking-wider">
                    {positions[currentIndex].name}
                  </h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {positions[currentIndex].criteria.map((criterion, idx) => (
                    <div key={idx} className="p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-semibold text-primary mb-1">{criterion.skill}</h4>
                      <p className="text-sm text-muted-foreground">{criterion.description}</p>
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full mt-6 font-bebas uppercase tracking-wider"
                  onClick={() => setSelectedPosition(positions[currentIndex])}
                >
                  View Full Details
                </Button>
              </Card>
            </div>
          </div>
        </section>

        {/* Scouting Database Section */}
        <section className="py-16 md:py-24 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider mb-4">
                Our Scouting Database
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Comprehensive player tracking system with advanced analytics and position-specific metrics
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <Card className="p-6 text-center">
                <div className="h-48 bg-muted/30 rounded-lg mb-4 flex items-center justify-center">
                  <div className="text-muted-foreground">
                    <Users className="h-16 w-16 mx-auto mb-2" />
                    <p className="text-sm">Database Screenshot Placeholder</p>
                  </div>
                </div>
                <h3 className="text-2xl font-bebas uppercase tracking-wider mb-2">Player Profiles</h3>
                <p className="text-muted-foreground">Detailed profiles with stats, videos, and match reports</p>
              </Card>

              <Card className="p-6 text-center">
                <div className="h-48 bg-muted/30 rounded-lg mb-4 flex items-center justify-center">
                  <div className="text-muted-foreground">
                    <TrendingUp className="h-16 w-16 mx-auto mb-2" />
                    <p className="text-sm">Analytics Dashboard Placeholder</p>
                  </div>
                </div>
                <h3 className="text-2xl font-bebas uppercase tracking-wider mb-2">Advanced Analytics</h3>
                <p className="text-muted-foreground">R90 ratings, skill evaluations, and performance tracking</p>
              </Card>

              <Card className="p-6 text-center">
                <div className="h-48 bg-muted/30 rounded-lg mb-4 flex items-center justify-center">
                  <div className="text-muted-foreground">
                    <Award className="h-16 w-16 mx-auto mb-2" />
                    <p className="text-sm">Reports Interface Placeholder</p>
                  </div>
                </div>
                <h3 className="text-2xl font-bebas uppercase tracking-wider mb-2">Scouting Reports</h3>
                <p className="text-muted-foreground">Standardized reports with detailed assessments</p>
              </Card>
            </div>
          </div>
        </section>

        {/* European Coverage Section */}
        <section 
          className="py-16 md:py-24 px-4 relative"
          style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div className="container mx-auto relative z-10">
            <div className="text-center mb-12">
              <h2 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider text-white mb-4">
                Scouting Across Europe
              </h2>
              <p className="text-xl text-white/90 max-w-3xl mx-auto">
                We cover major leagues and hidden gems across the continent
              </p>
            </div>

            {/* Map Placeholder */}
            <div className="max-w-4xl mx-auto mb-12">
              <div className="aspect-video bg-muted/20 rounded-lg backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <div className="text-center text-white">
                  <MapPin className="h-20 w-20 mx-auto mb-4" />
                  <p className="text-lg font-bebas uppercase tracking-wider">Interactive Europe Map</p>
                  <p className="text-sm text-white/70">Coverage map visualization coming soon</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8 text-white">
              <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
                <h3 className="text-2xl font-bebas uppercase tracking-wider mb-3">Deep Understanding</h3>
                <p className="text-white/90">
                  We don't just watch players—we analyze their tactical intelligence, technical ability, and mental attributes through comprehensive match analysis.
                </p>
              </Card>

              <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
                <h3 className="text-2xl font-bebas uppercase tracking-wider mb-3">Lower Leagues Focus</h3>
                <p className="text-white/90">
                  Our network extends beyond top divisions, discovering talent in lower leagues where players develop fundamental skills and hunger to succeed.
                </p>
              </Card>

              <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
                <h3 className="text-2xl font-bebas uppercase tracking-wider mb-3">Data-Driven Approach</h3>
                <p className="text-white/90">
                  Every report includes position-specific metrics, performance statistics, and tactical analysis to support our qualitative assessments.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Incentive Structure Section */}
        <section className="py-16 md:py-24 px-4 bg-muted/30">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider mb-4">
                Competitive Incentive Structure
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                We reward quality scouting with industry-leading commission rates
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <Card className="p-8 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <div className="text-4xl font-bebas text-primary mb-4">Forever Commission</div>
                <h3 className="text-2xl font-bebas uppercase tracking-wider mb-3">Lifetime Earnings</h3>
                <p className="text-muted-foreground mb-4">
                  Receive commission on all earnings from players you discover, throughout their entire career. Your scouting work pays dividends for years to come.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Commission on initial signing fees</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Percentage of future transfers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Ongoing representation earnings</span>
                  </li>
                </ul>
              </Card>

              <Card className="p-8">
                <div className="text-4xl font-bebas text-primary mb-4">Development Support</div>
                <h3 className="text-2xl font-bebas uppercase tracking-wider mb-3">Enhance Your Skills</h3>
                <p className="text-muted-foreground mb-4">
                  Access training, resources, and mentorship to develop your scouting expertise and industry knowledge.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Regular training sessions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Access to our database and tools</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Industry networking opportunities</span>
                  </li>
                </ul>
              </Card>
            </div>

            <Card className="p-8 bg-gradient-to-r from-muted/50 to-muted/30">
              <h3 className="text-3xl font-bebas uppercase tracking-wider mb-4 text-center">How It Works</h3>
              <div className="grid md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-5xl font-bebas text-primary mb-2">1</div>
                  <h4 className="font-semibold mb-2">Scout & Report</h4>
                  <p className="text-sm text-muted-foreground">Identify talented players using our criteria</p>
                </div>
                <div>
                  <div className="text-5xl font-bebas text-primary mb-2">2</div>
                  <h4 className="font-semibold mb-2">Submit to Database</h4>
                  <p className="text-sm text-muted-foreground">Add detailed reports to our system</p>
                </div>
                <div>
                  <div className="text-5xl font-bebas text-primary mb-2">3</div>
                  <h4 className="font-semibold mb-2">We Represent</h4>
                  <p className="text-sm text-muted-foreground">We work to develop and place the player</p>
                </div>
                <div>
                  <div className="text-5xl font-bebas text-primary mb-2">4</div>
                  <h4 className="font-semibold mb-2">You Earn</h4>
                  <p className="text-sm text-muted-foreground">Receive forever commission on earnings</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider mb-6">
              Ready to Join?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Get in touch to discuss how you can become part of our scouting network
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button 
                size="lg" 
                className="btn-shine font-bebas uppercase tracking-wider text-lg px-8"
                onClick={handleWhatsApp}
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                WhatsApp Us
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="font-bebas uppercase tracking-wider text-lg px-8"
                asChild
              >
                <a href="mailto:contact@riseagency.com">
                  <Mail className="mr-2 h-5 w-5" />
                  Email Contact
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Position Detail Dialog */}
      <Dialog open={!!selectedPosition} onOpenChange={() => setSelectedPosition(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bebas uppercase tracking-wider">
              <Badge variant="secondary" className="text-xl px-4 py-1 font-bebas uppercase mr-3">
                {selectedPosition?.code}
              </Badge>
              {selectedPosition?.name} - Scouting Criteria
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              <p className="text-muted-foreground mb-6">
                When evaluating a {selectedPosition?.name.toLowerCase()}, we assess the following key attributes based on thousands of professional scouting reports:
              </p>
              {selectedPosition?.criteria.map((criterion, idx) => (
                <Card key={idx} className="p-4 bg-muted/30">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl font-bebas text-primary min-w-[2rem]">{idx + 1}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg mb-1">{criterion.skill}</h4>
                      <p className="text-sm text-muted-foreground">{criterion.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
              <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm">
                  <strong>Note:</strong> These criteria are derived from our comprehensive scouting database and are regularly updated based on industry best practices and successful player placements.
                </p>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Scouts;