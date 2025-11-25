import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Mail, MapPin, Users, TrendingUp, Award, Database, BarChart3, Target, Sparkles, Globe, Brain, Zap, Activity, Crosshair } from "lucide-react";

const scoutingDomains = [
  {
    domain: "Physical",
    icon: Activity,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    criteria: [
      { skill: "Strength, Power & Speed", description: "Physical dominance in duels, explosive speed, and power to compete at the highest level." },
      { skill: "Use of Body", description: "Effective body positioning to shield the ball, maintain balance, and win physical contests." },
      { skill: "Anaerobic Endurance", description: "Capacity for repeated high-intensity efforts throughout 90 minutes without significant decline." },
      { skill: "Size & Aerial Ability", description: "How physical attributes are utilized in aerial duels and physical confrontations." }
    ]
  },
  {
    domain: "Psychological",
    icon: Brain,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
    criteria: [
      { skill: "Composure", description: "Maintains calm under pressure, makes clear decisions in high-stakes moments." },
      { skill: "Confidence", description: "Self-assured in all situations, willing to take risks and attempt difficult actions." },
      { skill: "Consistency", description: "Reliable performance throughout the match, continues making correct decisions regardless of outcomes." },
      { skill: "Mental Strength", description: "Resilience, aggression, intensity, and ability to respond to setbacks positively." }
    ]
  },
  {
    domain: "Technical",
    icon: Zap,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    criteria: [
      { skill: "First Touch & Ball Control", description: "Exceptional first touch to receive under pressure from all angles with both feet." },
      { skill: "Passing & Distribution", description: "Range and accuracy of passing, can play short combinations and long switches effectively." },
      { skill: "Dribbling & 1v1 Ability", description: "Capacity to beat opponents in tight spaces, carry the ball, and create space." },
      { skill: "Finishing & Shooting", description: "Clinical finishing, quality of shots from all ranges, and ability to create shooting opportunities." }
    ]
  },
  {
    domain: "Tactical",
    icon: Crosshair,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
    criteria: [
      { skill: "Positioning & Movement", description: "Intelligent positioning to receive the ball, create angles, and exploit space effectively." },
      { skill: "Decision-Making", description: "Knows when to pass, dribble, shoot, or hold position based on game context." },
      { skill: "Reading the Game", description: "Anticipates opponent movements and passes, proactive rather than reactive play." },
      { skill: "Defensive Awareness", description: "Understanding of defensive responsibilities, tracking runners, and contributing to pressing." }
    ]
  }
];

const Scouts = () => {
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
        <section className="relative min-h-[45vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/10 to-background" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          
          <div className="relative container mx-auto px-4 text-center z-10 space-y-4 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Elite Scouting Network</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider mb-3 leading-none">
              <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                Scout With
              </span>
              <br />
              <span className="text-primary">RISE</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto font-light leading-relaxed">
              Join our elite scouting network with competitive incentives and{" "}
              <span className="text-primary font-semibold">forever commission</span>
            </p>
            
            <div className="flex gap-4 justify-center flex-wrap pt-2">
              <Button 
                size="lg" 
                className="btn-shine font-bebas uppercase tracking-wider text-lg px-8 py-5 rounded-xl group"
                onClick={handleWhatsApp}
              >
                <MessageCircle className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                Contact via WhatsApp
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="font-bebas uppercase tracking-wider text-lg px-8 py-5 hover:scale-105 transition-all rounded-xl"
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

        {/* Scouting Domains Section */}
        <section className="py-10 md:py-16 px-4 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
          
          <div className="container mx-auto relative z-10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-3">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Universal Scouting Criteria</span>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-3 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                What We Look For
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto font-light">
                Four key domains assessed across all positions based on{" "}
                <span className="text-foreground font-semibold">thousands of professional reports</span>
              </p>
            </div>

            <div className="max-w-6xl mx-auto">
              <Tabs defaultValue="Physical" className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2 bg-muted/50 p-2 h-auto mb-6">
                  {scoutingDomains.map((domain) => {
                    const Icon = domain.icon;
                    return (
                      <TabsTrigger
                        key={domain.domain}
                        value={domain.domain}
                        className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-card data-[state=active]:shadow-lg"
                      >
                        <Icon className={`h-4 w-4 ${domain.color}`} />
                        <span className="font-bebas text-base uppercase tracking-wider">
                          {domain.domain}
                        </span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {scoutingDomains.map((domain) => {
                  const Icon = domain.icon;
                  return (
                    <TabsContent key={domain.domain} value={domain.domain} className="mt-0">
                      <Card className={`relative overflow-hidden border-2 ${domain.borderColor} bg-gradient-to-br from-card via-card/95 to-background backdrop-blur-sm shadow-xl`}>
                        <div className={`absolute top-0 right-0 w-64 h-64 ${domain.bgColor} rounded-full blur-3xl -translate-y-1/2 translate-x-1/2`} />
                        
                        <div className="relative p-6 md:p-8">
                          <div className="flex items-center gap-3 mb-6">
                            <div className={`h-12 w-12 ${domain.bgColor} rounded-xl flex items-center justify-center`}>
                              <Icon className={`h-6 w-6 ${domain.color}`} />
                            </div>
                            <div>
                              <Badge variant="secondary" className={`text-lg px-4 py-1 font-bebas uppercase mb-1 ${domain.bgColor} ${domain.borderColor} border`}>
                                {domain.domain}
                              </Badge>
                              <p className="text-sm text-muted-foreground">4 Key Attributes</p>
                            </div>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-4">
                            {domain.criteria.map((criterion, idx) => (
                              <div 
                                key={idx} 
                                className={`group p-4 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl hover:${domain.bgColor} transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-transparent hover:${domain.borderColor}`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`h-2 w-2 rounded-full ${domain.color.replace('text-', 'bg-')} mt-2 group-hover:scale-150 transition-transform`} />
                                  <div className="flex-1">
                                    <h4 className={`font-bold ${domain.color} mb-1.5 text-base`}>
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
                        </div>
                      </Card>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>
          </div>
        </section>

        {/* Scouting Database Section */}
        <section className="py-10 md:py-16 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
          
          <div className="container mx-auto relative z-10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-3">
                <Database className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Advanced Technology</span>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-3 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                Our Scouting Database
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto font-light">
                Comprehensive player tracking with{" "}
                <span className="text-foreground font-semibold">advanced analytics</span>{" "}
                and position-specific metrics
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <Card className="group relative overflow-hidden border-2 border-transparent hover:border-primary/30 bg-gradient-to-br from-card via-card/95 to-primary/5 transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative p-6 text-center">
                  <div className="h-12 w-12 mx-auto bg-primary/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  
                  <h3 className="text-2xl font-bebas uppercase tracking-wider mb-2 group-hover:text-primary transition-colors">
                    Player Profiles
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Detailed profiles with comprehensive stats, video analysis, and in-depth match reports
                  </p>
                </div>
              </Card>

              <Card className="group relative overflow-hidden border-2 border-transparent hover:border-primary/30 bg-gradient-to-br from-card via-card/95 to-primary/5 transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative p-6 text-center">
                  <div className="h-12 w-12 mx-auto bg-primary/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  
                  <h3 className="text-2xl font-bebas uppercase tracking-wider mb-2 group-hover:text-primary transition-colors">
                    Advanced Analytics
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    R90 ratings, detailed skill evaluations, and comprehensive performance tracking
                  </p>
                </div>
              </Card>

              <Card className="group relative overflow-hidden border-2 border-transparent hover:border-primary/30 bg-gradient-to-br from-card via-card/95 to-primary/5 transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative p-6 text-center">
                  <div className="h-12 w-12 mx-auto bg-primary/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                  
                  <h3 className="text-2xl font-bebas uppercase tracking-wider mb-2 group-hover:text-primary transition-colors">
                    Scouting Reports
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Standardized professional reports with comprehensive player assessments
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* European Coverage Section */}
        <section className="py-10 md:py-16 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/10 to-background" />
          
          <div className="container mx-auto relative z-10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-3">
                <Globe className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Global Network</span>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-3 leading-none">
                Scouting Across
                <br />
                <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                  Europe
                </span>
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto font-light">
                Covering major leagues and discovering{" "}
                <span className="text-foreground font-semibold">hidden gems</span>{" "}
                across the continent
              </p>
            </div>

            {/* Map Placeholder */}
            <div className="max-w-5xl mx-auto mb-8">
              <div className="relative aspect-video bg-muted/30 rounded-2xl border border-border flex items-center justify-center overflow-hidden group hover:border-primary/40 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative text-center z-10">
                  <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground group-hover:scale-110 transition-transform duration-500" />
                  <p className="text-xl font-bebas uppercase tracking-wider mb-1">Interactive Europe Map</p>
                  <p className="text-sm text-muted-foreground">Coverage visualization coming soon</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <Card className="group relative overflow-hidden border-2 border-transparent hover:border-primary/30 bg-gradient-to-br from-card via-card/95 to-primary/5 transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative p-6">
                  <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  
                  <h3 className="text-xl font-bebas uppercase tracking-wider mb-2">
                    Deep Understanding
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We don't just watch players—we analyze their tactical intelligence, technical ability, and mental attributes through comprehensive match analysis.
                  </p>
                </div>
              </Card>

              <Card className="group relative overflow-hidden border-2 border-transparent hover:border-primary/30 bg-gradient-to-br from-card via-card/95 to-primary/5 transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative p-6">
                  <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  
                  <h3 className="text-xl font-bebas uppercase tracking-wider mb-2">
                    Lower Leagues Focus
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Our network extends beyond top divisions, discovering talent in lower leagues where players develop fundamental skills and hunger to succeed.
                  </p>
                </div>
              </Card>

              <Card className="group relative overflow-hidden border-2 border-transparent hover:border-primary/30 bg-gradient-to-br from-card via-card/95 to-primary/5 transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative p-6">
                  <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  
                  <h3 className="text-xl font-bebas uppercase tracking-wider mb-2">
                    Data-Driven Approach
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Every report includes position-specific metrics, performance statistics, and tactical analysis to support our qualitative assessments.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Incentive Structure Section */}
        <section className="py-10 md:py-16 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-primary/5" />
          
          <div className="container mx-auto max-w-6xl relative z-10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-3">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Industry-Leading Benefits</span>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-3 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                Competitive
                <br />
                Incentive Structure
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto font-light">
                We reward quality scouting with{" "}
                <span className="text-foreground font-semibold">industry-leading</span>{" "}
                commission rates
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card className="group relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/10 via-card to-primary/5 hover:border-primary/40 transition-all duration-500 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                
                <div className="relative p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 bg-primary/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bebas text-primary">Forever Commission</div>
                  </div>
                  
                  <h3 className="text-2xl font-bebas uppercase tracking-wider mb-3">Lifetime Earnings</h3>
                  <p className="text-muted-foreground mb-4 leading-relaxed text-sm">
                    Receive commission on all earnings from players you discover, throughout their entire career. Your scouting work pays dividends for years to come.
                  </p>
                  
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 group/item">
                      <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform">
                        <span className="text-primary text-xs">✓</span>
                      </div>
                      <span className="text-sm text-foreground">Commission on initial signing fees</span>
                    </li>
                    <li className="flex items-start gap-2 group/item">
                      <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform">
                        <span className="text-primary text-xs">✓</span>
                      </div>
                      <span className="text-sm text-foreground">Percentage of future transfers</span>
                    </li>
                    <li className="flex items-start gap-2 group/item">
                      <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform">
                        <span className="text-primary text-xs">✓</span>
                      </div>
                      <span className="text-sm text-foreground">Ongoing representation earnings</span>
                    </li>
                  </ul>
                </div>
              </Card>

              <Card className="group relative overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-all duration-500 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                
                <div className="relative p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bebas text-primary">Development Support</div>
                  </div>
                  
                  <h3 className="text-2xl font-bebas uppercase tracking-wider mb-3">Enhance Your Skills</h3>
                  <p className="text-muted-foreground mb-4 leading-relaxed text-sm">
                    Access training, resources, and mentorship to develop your scouting expertise and industry knowledge.
                  </p>
                  
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 group/item">
                      <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform">
                        <span className="text-primary text-xs">✓</span>
                      </div>
                      <span className="text-sm text-foreground">Regular training sessions</span>
                    </li>
                    <li className="flex items-start gap-2 group/item">
                      <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform">
                        <span className="text-primary text-xs">✓</span>
                      </div>
                      <span className="text-sm text-foreground">Access to our database and tools</span>
                    </li>
                    <li className="flex items-start gap-2 group/item">
                      <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform">
                        <span className="text-primary text-xs">✓</span>
                      </div>
                      <span className="text-sm text-foreground">Industry networking opportunities</span>
                    </li>
                  </ul>
                </div>
              </Card>
            </div>

            <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-card via-primary/5 to-card">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
              
              <div className="relative p-6">
                <div className="text-center mb-6">
                  <h3 className="text-3xl font-bebas uppercase tracking-wider mb-2">How It Works</h3>
                  <div className="h-1 w-24 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto" />
                </div>
                
                <div className="grid md:grid-cols-4 gap-6">
                  {[
                    { num: "1", title: "Scout & Report", desc: "Identify talented players using our position-specific criteria" },
                    { num: "2", title: "Submit to Database", desc: "Add detailed reports to our comprehensive system" },
                    { num: "3", title: "We Represent", desc: "We work to develop and place the player effectively" },
                    { num: "4", title: "You Earn", desc: "Receive forever commission on all player earnings" }
                  ].map((step, idx) => (
                    <div key={idx} className="relative text-center group">
                      <div className="relative mb-4">
                        <div className="text-5xl font-bebas text-primary/20 absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 group-hover:scale-110 transition-transform">
                          {step.num}
                        </div>
                        <div className="relative text-4xl font-bebas text-primary pt-2 group-hover:scale-110 transition-transform">
                          {step.num}
                        </div>
                      </div>
                      <h4 className="font-bold text-base mb-2 group-hover:text-primary transition-colors">{step.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-10 md:py-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/10 to-background" />
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Join The Network</span>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider leading-none">
                Ready to
                <br />
                <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                  Join Our Team?
                </span>
              </h2>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
                Get in touch to discuss how you can become part of our{" "}
                <span className="text-foreground font-semibold">elite scouting network</span>
              </p>
              
              <div className="flex gap-4 justify-center flex-wrap pt-2">
                <Button 
                  size="lg" 
                  className="btn-shine font-bebas uppercase tracking-wider text-lg px-10 py-5 rounded-xl group"
                  onClick={handleWhatsApp}
                >
                  <MessageCircle className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  WhatsApp Us
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="font-bebas uppercase tracking-wider text-lg px-10 py-5 hover:scale-105 transition-all rounded-xl"
                  asChild
                >
                  <a href="mailto:contact@riseagency.com">
                    <Mail className="mr-2 h-5 w-5" />
                    Email Contact
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Scouts;