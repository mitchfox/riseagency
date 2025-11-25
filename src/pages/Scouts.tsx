import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Mail, MapPin, Users, TrendingUp, Award, Database, BarChart3, Target, Sparkles, Globe, Brain, Zap, Activity, Crosshair } from "lucide-react";
import { SCOUTING_POSITIONS, POSITION_SKILLS, ScoutingPosition } from "@/data/scoutingSkills";

const domainConfig = {
  Physical: {
    icon: Activity,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20"
  },
  Psychological: {
    icon: Brain,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20"
  },
  Technical: {
    icon: Zap,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20"
  },
  Tactical: {
    icon: Crosshair,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20"
  }
};

const positionInitials: Record<ScoutingPosition, string> = {
  "Goalkeeper": "GK",
  "Full-Back": "FB",
  "Centre-Back": "CB",
  "Central Defensive Midfielder": "CDM",
  "Central Midfielder": "CM",
  "Central Attacking Midfielder": "CAM",
  "Winger / Wide Forward": "W/WF",
  "Centre Forward / Striker": "CF/ST"
};

const Scouts = () => {
  const [selectedPosition, setSelectedPosition] = useState<ScoutingPosition>(SCOUTING_POSITIONS[0]);
  const [expandedDomain, setExpandedDomain] = useState<keyof typeof domainConfig | null>(null);

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

        {/* Scouting Criteria by Position Section */}
        <section className="py-10 md:py-16 px-4 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
          
          <div className="container mx-auto relative z-10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-3">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Position-Specific Scouting Criteria</span>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-3 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                What We Look For
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto font-light">
                Four key domains assessed for each position based on{" "}
                <span className="text-foreground font-semibold">thousands of professional reports</span>
              </p>
            </div>

            <div className="max-w-6xl mx-auto">
              {/* Position Selection */}
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2 bg-muted/50 p-2 rounded-xl mb-6">
                {SCOUTING_POSITIONS.map((position) => (
                  <button
                    key={position}
                    onClick={() => setSelectedPosition(position)}
                    className={`py-3 px-2 rounded-lg font-bebas uppercase tracking-wider text-sm md:text-base transition-all ${
                      selectedPosition === position
                        ? "bg-card shadow-lg text-primary scale-105"
                        : "hover:bg-card/50"
                    }`}
                  >
                    {positionInitials[position]}
                  </button>
                ))}
              </div>

              {/* Domain Grid */}
              {(() => {
                const positionSkills = POSITION_SKILLS[selectedPosition];
                const skillsByDomain = positionSkills.reduce((acc, skill) => {
                  if (!acc[skill.domain]) acc[skill.domain] = [];
                  acc[skill.domain].push(skill);
                  return acc;
                }, {} as Record<string, typeof positionSkills>);

                return (
                  <div className="relative">
                    {expandedDomain ? (
                      // Expanded view
                      <div className="relative">
                        {/* Corner mini domains */}
                        <div className="absolute top-4 right-4 z-10 grid grid-cols-2 gap-2">
                          {Object.keys(domainConfig).map((domain) => {
                            if (domain === expandedDomain) return null;
                            const config = domainConfig[domain as keyof typeof domainConfig];
                            const Icon = config.icon;
                            return (
                              <button
                                key={domain}
                                onClick={() => setExpandedDomain(domain as keyof typeof domainConfig)}
                                className={`h-12 w-12 ${config.bgColor} rounded-lg flex items-center justify-center transition-all hover:scale-110 hover:shadow-lg border ${config.borderColor}`}
                              >
                                <Icon className={`h-5 w-5 ${config.color}`} />
                              </button>
                            );
                          })}
                        </div>

                        {/* Expanded domain card */}
                        {(() => {
                          const skills = skillsByDomain[expandedDomain];
                          const config = domainConfig[expandedDomain];
                          const Icon = config.icon;
                          
                          return (
                            <Card className={`relative overflow-hidden border-2 ${config.borderColor} bg-gradient-to-br from-card via-card/95 to-background backdrop-blur-sm shadow-xl`}>
                              <div className={`absolute top-0 left-0 w-64 h-64 ${config.bgColor} rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2`} />
                              
                              <div className="relative p-6 md:p-8">
                                <button
                                  onClick={() => setExpandedDomain(null)}
                                  className="mb-6 hover:opacity-70 transition-opacity"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`h-12 w-12 ${config.bgColor} rounded-xl flex items-center justify-center`}>
                                      <Icon className={`h-6 w-6 ${config.color}`} />
                                    </div>
                                    <div className="text-left">
                                      <Badge variant="secondary" className={`text-lg px-4 py-1 font-bebas uppercase mb-1 ${config.bgColor} ${config.borderColor} border`}>
                                        {expandedDomain}
                                      </Badge>
                                      <p className="text-sm text-muted-foreground">{skills.length} Key Attributes for {selectedPosition}</p>
                                    </div>
                                  </div>
                                </button>
                                
                                <div className="grid md:grid-cols-2 gap-4">
                                  {skills.map((skill, idx) => (
                                    <div 
                                      key={idx} 
                                      className={`group p-4 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl hover:${config.bgColor} transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-transparent hover:${config.borderColor}`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className={`h-2 w-2 rounded-full ${config.color.replace('text-', 'bg-')} mt-2 group-hover:scale-150 transition-transform`} />
                                        <div className="flex-1">
                                          <h4 className={`font-bold ${config.color} mb-1.5 text-base`}>
                                            {skill.skill_name}
                                          </h4>
                                          <p className="text-sm text-muted-foreground leading-relaxed">
                                            {skill.description}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </Card>
                          );
                        })()}
                      </div>
                    ) : (
                      // Grid view
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(domainConfig).map(([domain, config]) => {
                          const Icon = config.icon;
                          const skills = skillsByDomain[domain];
                          
                          return (
                            <button
                              key={domain}
                              onClick={() => setExpandedDomain(domain as keyof typeof domainConfig)}
                              className={`group relative overflow-hidden border-2 ${config.borderColor} bg-gradient-to-br from-card via-card/95 to-background rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:scale-105 text-left`}
                            >
                              <div className={`absolute top-0 right-0 w-32 h-32 ${config.bgColor} rounded-full blur-2xl opacity-50`} />
                              
                              <div className="relative">
                                <div className={`h-12 w-12 ${config.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                  <Icon className={`h-6 w-6 ${config.color}`} />
                                </div>
                                
                                <h3 className={`text-2xl font-bebas uppercase tracking-wider mb-2 ${config.color}`}>
                                  {domain}
                                </h3>
                                
                                <p className="text-sm text-muted-foreground mb-3">
                                  {skills?.length || 4} Key Attributes
                                </p>
                                
                                <div className="text-xs text-muted-foreground/70 group-hover:text-primary transition-colors">
                                  Click to expand →
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
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

        {/* Hero Section - Scout With RISE */}
        <section className="relative min-h-[45vh] flex items-center justify-center overflow-hidden py-10 md:py-16">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/10 to-background" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          
          <div className="relative container mx-auto px-4 text-center z-10 space-y-4 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Elite Scouting Network</span>
            </div>
            
            <h2 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider mb-3 leading-none">
              <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                Scout With
              </span>
              <br />
              <span className="text-primary">RISE</span>
            </h2>
            
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