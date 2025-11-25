import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, MessageCircle, Mail, MapPin, Users, TrendingUp, Award, Eye, Database, BarChart3, Target, Sparkles, Globe } from "lucide-react";
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
    <div className="min-h-screen bg-background overflow-hidden">
      <SEO 
        title="For Scouts - Discover Talent with RISE Agency"
        description="Join RISE's scouting network. Access our database, competitive incentives, and forever commission structure. Scout smarter across Europe."
        image="/og-preview-scouts.png"
        url="/scouts"
      />
      <Header />
      
      <main className="pt-24 md:pt-16">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center scale-105 animate-subtle-zoom"
            style={{ backgroundImage: `url(${bannerHero})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black via-primary/20 to-background/90 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          
          {/* Floating particles effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/20 rounded-full animate-float" />
            <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-primary/30 rounded-full animate-float-delayed" />
            <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-primary/20 rounded-full animate-float-slow" />
          </div>
          
          <div className="relative container mx-auto px-4 text-center z-10 space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-white">Elite Scouting Network</span>
            </div>
            
            <h1 className="text-7xl md:text-9xl font-bebas uppercase tracking-wider text-white mb-6 leading-none">
              <span className="bg-gradient-to-r from-white via-primary-foreground to-white bg-clip-text text-transparent">
                Scout With
              </span>
              <br />
              <span className="text-primary">RISE</span>
            </h1>
            
            <p className="text-xl md:text-3xl text-white/90 max-w-3xl mx-auto font-light leading-relaxed">
              Join our elite scouting network with competitive incentives and{" "}
              <span className="text-primary font-semibold">forever commission</span>
            </p>
            
            <div className="flex gap-4 justify-center flex-wrap pt-4">
              <Button 
                size="lg" 
                className="btn-shine font-bebas uppercase tracking-wider text-lg px-8 py-6 rounded-xl group"
                onClick={handleWhatsApp}
              >
                <MessageCircle className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                Contact via WhatsApp
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="font-bebas uppercase tracking-wider text-lg px-8 py-6 bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white hover:text-background hover:scale-105 transition-all rounded-xl"
                asChild
              >
                <a href="mailto:contact@riseagency.com">
                  <Mail className="mr-2 h-5 w-5" />
                  Email Us
                </a>
              </Button>
            </div>
            
            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
              <div className="w-6 h-10 border-2 border-white/30 rounded-full p-1">
                <div className="w-1.5 h-3 bg-white/50 rounded-full mx-auto animate-scroll" />
              </div>
            </div>
          </div>
        </section>

        {/* Position Criteria Section */}
        <section className="py-20 md:py-32 px-4 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
          
          <div className="container mx-auto relative z-10">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-6">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Position-Specific Criteria</span>
              </div>
              
              <h2 className="text-6xl md:text-8xl font-bebas uppercase tracking-wider mb-6 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                What We Look For
              </h2>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto font-light">
                Position-specific scouting criteria based on{" "}
                <span className="text-foreground font-semibold">real data</span> from thousands of reports
              </p>
            </div>

            {/* Position Slider */}
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-center gap-6 mb-12">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prevPosition}
                  className="h-14 w-14 rounded-full bg-muted/50 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground transition-all hover:scale-110"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>

                <div className="flex gap-3 overflow-x-auto px-4 max-w-4xl scrollbar-hide">
                  {positions.map((position, index) => (
                    <Button
                      key={position.code}
                      variant={index === currentIndex ? "default" : "outline"}
                      className={`font-bebas text-xl px-8 py-7 uppercase tracking-wider whitespace-nowrap transition-all duration-300 rounded-xl ${
                        index === currentIndex 
                          ? "scale-110 shadow-xl shadow-primary/20" 
                          : "scale-95 opacity-40 hover:opacity-70 hover:scale-100"
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
                  className="h-14 w-14 rounded-full bg-muted/50 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground transition-all hover:scale-110"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>

              {/* Current Position Display */}
              <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-card via-card/95 to-primary/5 backdrop-blur-sm shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                
                <div className="relative p-10">
                  <div className="text-center mb-8">
                    <Badge variant="secondary" className="text-3xl px-8 py-3 font-bebas uppercase mb-4 bg-primary/10 border-primary/30">
                      {positions[currentIndex].code}
                    </Badge>
                    <h3 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-2">
                      {positions[currentIndex].name}
                    </h3>
                    <div className="h-1 w-24 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto" />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-5 mb-8">
                    {positions[currentIndex].criteria.map((criterion, idx) => (
                      <div 
                        key={idx} 
                        className="group p-5 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl hover:from-primary/10 hover:to-primary/5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-transparent hover:border-primary/20"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-2 w-2 rounded-full bg-primary mt-2 group-hover:scale-150 transition-transform" />
                          <div className="flex-1">
                            <h4 className="font-bold text-primary mb-2 text-lg group-hover:text-primary/90 transition-colors">
                              {criterion.skill}
                            </h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {criterion.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    className="w-full py-6 font-bebas uppercase tracking-wider text-lg rounded-xl btn-shine group"
                    onClick={() => setSelectedPosition(positions[currentIndex])}
                  >
                    <Eye className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                    View Full Details
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Scouting Database Section */}
        <section className="py-20 md:py-32 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
          <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
          
          <div className="container mx-auto relative z-10">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-6">
                <Database className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Advanced Technology</span>
              </div>
              
              <h2 className="text-6xl md:text-8xl font-bebas uppercase tracking-wider mb-6 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                Our Scouting Database
              </h2>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto font-light">
                Comprehensive player tracking with{" "}
                <span className="text-foreground font-semibold">advanced analytics</span>{" "}
                and position-specific metrics
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <Card className="group relative overflow-hidden border-2 border-transparent hover:border-primary/30 bg-gradient-to-br from-card via-card/95 to-primary/5 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative p-8 text-center">
                  <div className="h-56 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl mb-6 flex items-center justify-center group-hover:scale-105 transition-transform duration-500 border border-primary/10">
                    <div className="text-primary">
                      <Users className="h-20 w-20 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                      <p className="text-sm text-muted-foreground">Database Screenshot</p>
                      <p className="text-xs text-muted-foreground/70">Coming Soon</p>
                    </div>
                  </div>
                  
                  <h3 className="text-3xl font-bebas uppercase tracking-wider mb-3 group-hover:text-primary transition-colors">
                    Player Profiles
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Detailed profiles with comprehensive stats, video analysis, and in-depth match reports
                  </p>
                </div>
              </Card>

              <Card className="group relative overflow-hidden border-2 border-transparent hover:border-primary/30 bg-gradient-to-br from-card via-card/95 to-primary/5 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative p-8 text-center">
                  <div className="h-56 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl mb-6 flex items-center justify-center group-hover:scale-105 transition-transform duration-500 border border-primary/10">
                    <div className="text-primary">
                      <BarChart3 className="h-20 w-20 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                      <p className="text-sm text-muted-foreground">Analytics Dashboard</p>
                      <p className="text-xs text-muted-foreground/70">Coming Soon</p>
                    </div>
                  </div>
                  
                  <h3 className="text-3xl font-bebas uppercase tracking-wider mb-3 group-hover:text-primary transition-colors">
                    Advanced Analytics
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    R90 ratings, detailed skill evaluations, and comprehensive performance tracking
                  </p>
                </div>
              </Card>

              <Card className="group relative overflow-hidden border-2 border-transparent hover:border-primary/30 bg-gradient-to-br from-card via-card/95 to-primary/5 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative p-8 text-center">
                  <div className="h-56 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl mb-6 flex items-center justify-center group-hover:scale-105 transition-transform duration-500 border border-primary/10">
                    <div className="text-primary">
                      <Award className="h-20 w-20 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                      <p className="text-sm text-muted-foreground">Reports Interface</p>
                      <p className="text-xs text-muted-foreground/70">Coming Soon</p>
                    </div>
                  </div>
                  
                  <h3 className="text-3xl font-bebas uppercase tracking-wider mb-3 group-hover:text-primary transition-colors">
                    Scouting Reports
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Standardized professional reports with comprehensive player assessments
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* European Coverage Section */}
        <section 
          className="py-20 md:py-32 px-4 relative overflow-hidden"
          style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/70 to-primary/30" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
          
          <div className="container mx-auto relative z-10">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6">
                <Globe className="h-4 w-4 text-white" />
                <span className="text-sm font-semibold text-white">Global Network</span>
              </div>
              
              <h2 className="text-6xl md:text-8xl font-bebas uppercase tracking-wider text-white mb-6 leading-none">
                Scouting Across
                <br />
                <span className="bg-gradient-to-r from-white via-primary-foreground to-white bg-clip-text text-transparent">
                  Europe
                </span>
              </h2>
              <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto font-light">
                Covering major leagues and discovering{" "}
                <span className="text-white font-semibold">hidden gems</span>{" "}
                across the continent
              </p>
            </div>

            {/* Map Placeholder */}
            <div className="max-w-5xl mx-auto mb-16">
              <div className="relative aspect-video bg-white/5 rounded-2xl backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden group hover:border-white/40 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative text-center text-white z-10">
                  <MapPin className="h-24 w-24 mx-auto mb-6 text-white/80 group-hover:scale-110 transition-transform duration-500" />
                  <p className="text-2xl font-bebas uppercase tracking-wider mb-2">Interactive Europe Map</p>
                  <p className="text-sm text-white/70">Coverage visualization coming soon</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <Card className="group relative overflow-hidden bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 hover:border-white/40 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/20">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative p-8">
                  <div className="h-12 w-12 bg-primary/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Eye className="h-6 w-6 text-white" />
                  </div>
                  
                  <h3 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider text-white mb-4">
                    Deep Understanding
                  </h3>
                  <p className="text-white/90 leading-relaxed">
                    We don't just watch players—we analyze their tactical intelligence, technical ability, and mental attributes through comprehensive match analysis.
                  </p>
                </div>
              </Card>

              <Card className="group relative overflow-hidden bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 hover:border-white/40 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/20">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative p-8">
                  <div className="h-12 w-12 bg-primary/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  
                  <h3 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider text-white mb-4">
                    Lower Leagues Focus
                  </h3>
                  <p className="text-white/90 leading-relaxed">
                    Our network extends beyond top divisions, discovering talent in lower leagues where players develop fundamental skills and hunger to succeed.
                  </p>
                </div>
              </Card>

              <Card className="group relative overflow-hidden bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 hover:border-white/40 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/20">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative p-8">
                  <div className="h-12 w-12 bg-primary/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  
                  <h3 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider text-white mb-4">
                    Data-Driven Approach
                  </h3>
                  <p className="text-white/90 leading-relaxed">
                    Every report includes position-specific metrics, performance statistics, and tactical analysis to support our qualitative assessments.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Incentive Structure Section */}
        <section className="py-20 md:py-32 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-primary/5" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          
          <div className="container mx-auto max-w-6xl relative z-10">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-6">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Industry-Leading Benefits</span>
              </div>
              
              <h2 className="text-6xl md:text-8xl font-bebas uppercase tracking-wider mb-6 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                Competitive
                <br />
                Incentive Structure
              </h2>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto font-light">
                We reward quality scouting with{" "}
                <span className="text-foreground font-semibold">industry-leading</span>{" "}
                commission rates
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-16">
              <Card className="group relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/10 via-card to-primary/5 hover:border-primary/40 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2">
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                
                <div className="relative p-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-16 w-16 bg-primary/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-5xl font-bebas text-primary">Forever Commission</div>
                  </div>
                  
                  <h3 className="text-3xl font-bebas uppercase tracking-wider mb-4">Lifetime Earnings</h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed text-lg">
                    Receive commission on all earnings from players you discover, throughout their entire career. Your scouting work pays dividends for years to come.
                  </p>
                  
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 group/item">
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform">
                        <span className="text-primary text-sm">✓</span>
                      </div>
                      <span className="text-foreground">Commission on initial signing fees</span>
                    </li>
                    <li className="flex items-start gap-3 group/item">
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform">
                        <span className="text-primary text-sm">✓</span>
                      </div>
                      <span className="text-foreground">Percentage of future transfers</span>
                    </li>
                    <li className="flex items-start gap-3 group/item">
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform">
                        <span className="text-primary text-sm">✓</span>
                      </div>
                      <span className="text-foreground">Ongoing representation earnings</span>
                    </li>
                  </ul>
                </div>
              </Card>

              <Card className="group relative overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2">
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                
                <div className="relative p-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <TrendingUp className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-5xl font-bebas text-primary">Development Support</div>
                  </div>
                  
                  <h3 className="text-3xl font-bebas uppercase tracking-wider mb-4">Enhance Your Skills</h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed text-lg">
                    Access training, resources, and mentorship to develop your scouting expertise and industry knowledge.
                  </p>
                  
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 group/item">
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform">
                        <span className="text-primary text-sm">✓</span>
                      </div>
                      <span className="text-foreground">Regular training sessions</span>
                    </li>
                    <li className="flex items-start gap-3 group/item">
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform">
                        <span className="text-primary text-sm">✓</span>
                      </div>
                      <span className="text-foreground">Access to our database and tools</span>
                    </li>
                    <li className="flex items-start gap-3 group/item">
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform">
                        <span className="text-primary text-sm">✓</span>
                      </div>
                      <span className="text-foreground">Industry networking opportunities</span>
                    </li>
                  </ul>
                </div>
              </Card>
            </div>

            <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-card via-primary/5 to-card">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
              
              <div className="relative p-10">
                <div className="text-center mb-12">
                  <h3 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-4">How It Works</h3>
                  <div className="h-1 w-32 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto" />
                </div>
                
                <div className="grid md:grid-cols-4 gap-8">
                  {[
                    { num: "1", title: "Scout & Report", desc: "Identify talented players using our position-specific criteria" },
                    { num: "2", title: "Submit to Database", desc: "Add detailed reports to our comprehensive system" },
                    { num: "3", title: "We Represent", desc: "We work to develop and place the player effectively" },
                    { num: "4", title: "You Earn", desc: "Receive forever commission on all player earnings" }
                  ].map((step, idx) => (
                    <div key={idx} className="relative text-center group">
                      <div className="relative mb-6">
                        <div className="text-7xl font-bebas text-primary/20 absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 group-hover:scale-110 transition-transform">
                          {step.num}
                        </div>
                        <div className="relative text-6xl font-bebas text-primary pt-4 group-hover:scale-110 transition-transform">
                          {step.num}
                        </div>
                      </div>
                      <h4 className="font-bold text-lg mb-3 group-hover:text-primary transition-colors">{step.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 md:py-32 relative overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bannerHero})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-primary/20 to-black/80" />
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6">
                <Sparkles className="h-4 w-4 text-white" />
                <span className="text-sm font-semibold text-white">Join The Network</span>
              </div>
              
              <h2 className="text-6xl md:text-8xl font-bebas uppercase tracking-wider text-white leading-none">
                Ready to
                <br />
                <span className="bg-gradient-to-r from-white via-primary-foreground to-white bg-clip-text text-transparent">
                  Join Our Team?
                </span>
              </h2>
              
              <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto font-light leading-relaxed">
                Get in touch to discuss how you can become part of our{" "}
                <span className="text-white font-semibold">elite scouting network</span>
              </p>
              
              <div className="flex gap-4 justify-center flex-wrap pt-4">
                <Button 
                  size="lg" 
                  className="btn-shine font-bebas uppercase tracking-wider text-lg px-10 py-7 rounded-xl group"
                  onClick={handleWhatsApp}
                >
                  <MessageCircle className="mr-2 h-6 w-6 group-hover:scale-110 transition-transform" />
                  WhatsApp Us
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="font-bebas uppercase tracking-wider text-lg px-10 py-7 bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white hover:text-background hover:scale-105 transition-all rounded-xl"
                  asChild
                >
                  <a href="mailto:contact@riseagency.com">
                    <Mail className="mr-2 h-6 w-6" />
                    Email Contact
                  </a>
                </Button>
              </div>
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