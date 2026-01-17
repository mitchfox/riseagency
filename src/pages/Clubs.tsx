import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrangeMeetingDialog } from "@/components/ArrangeMeetingDialog";
import { DeclareInterestDialog } from "@/components/DeclareInterestDialog";
import { useState } from "react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Marquee } from "@/components/Marquee";

import { 
  Target, 
  Users, 
  TrendingUp, 
  Globe, 
  BarChart3, 
  Handshake,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Shield,
  Zap,
  Play,
  FileText
} from "lucide-react";
import omotoyeCelebrating from "@/assets/omotoye-celebrating.png";
import whiteMarble from "@/assets/white-marble.png";
import realisePotentialReport from "@/assets/realise-potential-report.png";
import realisePotentialAnalysis from "@/assets/realise-potential-analysis.png";
import realisePotentialSessions from "@/assets/realise-potential-sessions.png";
import realisePotentialPaos from "@/assets/realise-potential-paos.png";

const Clubs = () => {
  const { t } = useLanguage();
  const [arrangeMeetingOpen, setArrangeMeetingOpen] = useState(false);
  const [declareInterestOpen, setDeclareInterestOpen] = useState(false);
  const [activeApproachImage, setActiveApproachImage] = useState(0);

  const services = [
    {
      icon: Target,
      title: t('clubs.strategise', 'STRATEGISE'),
      description: t('clubs.strategise_desc', 'Bespoke strategic consultation for domestic success'),
      details: [
        'National exclusivity arrangements available',
        'Individualised approach to each organisation',
        'Stay ahead of key developments in the footballing landscape'
      ]
    },
    {
      icon: Users,
      title: t('clubs.recruit', 'RECRUIT'),
      description: t('clubs.recruit_desc', 'Access our extensive network of talent across Europe'),
      details: [
        'Analysis across the entirety of European professional football',
        'Undervalued player identification',
        'Technical and tactical fit assessment'
      ]
    },
    {
      icon: TrendingUp,
      title: t('clubs.optimise', 'OPTIMISE'),
      description: t('clubs.optimise_desc', 'Performance consultation to develop your personnel'),
      details: [
        'Player development programmes',
        'Coach development and alignment',
        'Unique perspective and timely insights'
      ]
    }
  ];

  const stats = [
    { value: '120+', label: t('clubs.stat_network', 'Club Network Size') },
    { value: '3', label: t('clubs.stat_prem', 'Premier League Clubs') },
    { value: '30+', label: t('clubs.stat_countries', 'Countries Covered') },
    { value: '£10M+', label: t('clubs.stat_revenue', 'Transfer Revenue') }
  ];

  const approachImages = [
    { src: realisePotentialReport, label: 'R90 Performance Reports' },
    { src: realisePotentialAnalysis, label: 'Match Analysis' },
    { src: realisePotentialSessions, label: 'Development Sessions' },
    { src: realisePotentialPaos, label: 'Player Action Overviews' }
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full max-w-full" key="clubs-page">
      <SEO 
        title="For Clubs - Strategic Partnerships | RISE Agency"
        description="Work with RISE to strategise, recruit, and optimise your squad. Access our network of players and development programmes."
        image="/og-preview-clubs.png"
        url="/clubs"
      />
      <Header />
      <ArrangeMeetingDialog open={arrangeMeetingOpen} onOpenChange={setArrangeMeetingOpen} />
      <DeclareInterestDialog open={declareInterestOpen} onOpenChange={setDeclareInterestOpen} />
      
      <main className="pt-32 md:pt-24">
        {/* Hero Section */}
        <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center grayscale"
            style={{ backgroundImage: `url(${omotoyeCelebrating})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-background" />
          
          <div className="relative container mx-auto px-4 text-center z-10">
            <div className="inline-block mb-6">
              <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                {t('clubs.badge', 'Club Partnerships')}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bebas uppercase tracking-wider text-primary mb-6 px-2">
              {t('clubs.title', 'FOR CLUBS')}
            </h1>
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 -z-10 bg-black/50 rounded-full" style={{ transform: 'scaleX(1.1)' }} />
              <p className="text-lg sm:text-xl md:text-2xl text-white/90 max-w-3xl mx-auto px-8 py-3 font-light">
                <em>{t('clubs.subtitle', 'Strategic partnerships to elevate your club\'s performance')}</em>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
              <Button 
                onClick={() => setArrangeMeetingOpen(true)}
                size="lg" 
                className="btn-shine font-bebas uppercase tracking-wider text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto"
              >
                {t('clubs.arrange_meeting', 'Arrange Meeting')}
              </Button>
              <Button 
                asChild 
                variant="outline" 
                size="lg" 
                className="font-bebas uppercase tracking-wider text-base sm:text-lg px-6 sm:px-8 border-white/30 text-white hover:bg-white/10 w-full sm:w-auto"
              >
                <Link to="/club-direction">{t('clubs.club_direction', 'Club Direction')}</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <ScrollReveal>
          <section className="py-12 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center group">
                    <div className="text-4xl md:text-5xl font-bebas text-primary group-hover:scale-110 transition-transform">{stat.value}</div>
                    <div className="h-px w-12 bg-primary/50 mx-auto my-3" />
                    <p className="text-xs font-bebas uppercase tracking-widest text-foreground/70">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Marquee */}
        <Marquee />

        {/* Services Section */}
        <ScrollReveal>
          <section className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-4">
                  {t('clubs.how_we_help', 'HOW WE')} <span className="text-primary">{t('clubs.help', 'HELP')}</span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  <em>{t('clubs.services_desc', 'Comprehensive support across strategy, recruitment, and performance.')}</em>
                </p>
              </div>

              <div className="max-w-6xl mx-auto">
                <div className="grid md:grid-cols-3 gap-8">
                  {services.map((service, index) => (
                    <div key={index} className="group relative bg-card border border-border/50 rounded-xl p-8 hover:border-primary/50 hover:shadow-xl transition-all duration-300">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-[100px] -z-10" />
                      
                      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 border border-primary/20 group-hover:bg-primary/20 transition-colors mx-auto">
                        <service.icon className="w-8 h-8 text-primary" />
                      </div>
                      
                      <h3 className="text-2xl font-bebas uppercase tracking-wider mb-3 text-center">
                        {service.title}
                      </h3>
                      
                      <p className="text-muted-foreground mb-6 text-center">
                        {service.description}
                      </p>
                      
                      <ul className="space-y-3">
                        {service.details.map((detail, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <CheckCircle2 className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Our Approach Section - Enhanced with visuals */}
        <ScrollReveal>
          <section className="py-16 md:py-24 bg-muted/30 relative overflow-hidden">
            {/* Faded background images */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div 
                className="absolute top-0 right-0 w-1/2 h-full bg-cover bg-center grayscale"
                style={{ backgroundImage: `url(${omotoyeCelebrating})` }}
              />
            </div>
            
            <div className="container mx-auto px-4 relative z-10">
              <div className="max-w-6xl mx-auto">
                <div className="grid md:grid-cols-2 gap-12 items-start">
                  <div>
                    <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-8">
                      {t('clubs.our_approach', 'OUR')} <span className="text-primary">{t('clubs.approach', 'APPROACH')}</span>
                    </h2>
                    
                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                          <Shield className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bebas uppercase tracking-wider mb-2">National Exclusivity</h3>
                          <p className="text-muted-foreground">We offer exclusive partnerships within domestic leagues, ensuring your club receives our undivided attention and resources for greater success.</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                          <BarChart3 className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bebas uppercase tracking-wider mb-2">Data-Driven Insights</h3>
                          <p className="text-muted-foreground">Our analysis extends across the entirety of professional football within Europe, identifying opportunities that traditional scouting networks can miss.</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                          <Zap className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bebas uppercase tracking-wider mb-2">Proactive Strategy</h3>
                          <p className="text-muted-foreground">Unlike reactive organisations, we stay ahead of key developments in the footballing landscape to avoid future pitfalls and seize opportunities first.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Interactive visual gallery */}
                  <div className="space-y-4">
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-border/50 bg-card/50">
                      {approachImages.map((img, index) => (
                        <img 
                          key={index}
                          src={img.src} 
                          alt={img.label}
                          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${activeApproachImage === index ? 'opacity-100' : 'opacity-0'}`}
                        />
                      ))}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                        <p className="text-white font-bebas uppercase tracking-wider text-lg">
                          {approachImages[activeApproachImage]?.label}
                        </p>
                      </div>
                    </div>
                    
                    {/* Thumbnail selectors */}
                    <div className="grid grid-cols-4 gap-2">
                      {approachImages.map((img, index) => (
                        <button
                          key={index}
                          onClick={() => setActiveApproachImage(index)}
                          className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all duration-300 ${activeApproachImage === index ? 'border-primary scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                        >
                          <img src={img.src} alt={img.label} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                    
                    {/* Quick stats grid */}
                    <div className="grid grid-cols-2 gap-3 mt-6">
                      <div className="p-4 border border-border/50 bg-card/30 rounded-lg text-center">
                        <Globe className="w-8 h-8 text-primary mx-auto mb-2" />
                        <h4 className="text-sm font-bebas uppercase tracking-wider mb-1">European Network</h4>
                        <p className="text-xs text-muted-foreground">Key decision-makers across half the globe</p>
                      </div>
                      <div className="p-4 border border-border/50 bg-card/30 rounded-lg text-center">
                        <Handshake className="w-8 h-8 text-primary mx-auto mb-2" />
                        <h4 className="text-sm font-bebas uppercase tracking-wider mb-1">Trusted Partners</h4>
                        <p className="text-xs text-muted-foreground">Reputation for recruiting great fits</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* CTA Section */}
        <ScrollReveal>
          <section className="py-16 md:py-24 relative overflow-hidden border-t-2 border-b-2 border-primary">
            {/* White marble background */}
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${whiteMarble})` }}
            />
            
            <div className="container mx-auto px-4 text-center relative z-10">
              <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6 text-black">
                {t('clubs.cta_title', 'READY TO ELEVATE YOUR CLUB?')}
              </h2>
              <p className="text-xl text-black/70 mb-8 max-w-2xl mx-auto">
                {t('clubs.cta_subtitle', 'Schedule a consultation to discuss how we can support your objectives.')}
              </p>
              <div className="inline-block bg-black/90 px-6 py-3 rounded-lg mb-6">
                <p className="text-white font-bebas uppercase tracking-wider text-lg">Contact Us Today</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => setArrangeMeetingOpen(true)}
                  size="lg" 
                  className="btn-shine font-bebas uppercase tracking-wider"
                >
                  {t('clubs.arrange_meeting', 'Arrange Meeting')}
                </Button>
                <Button 
                  onClick={() => setDeclareInterestOpen(true)}
                  size="lg" 
                  className="font-bebas uppercase tracking-wider bg-black text-white hover:bg-black/80"
                >
                  {t('clubs.declare_interest', 'Declare Interest in Player')}
                </Button>
              </div>
            </div>
          </section>
        </ScrollReveal>
      </main>

      <Footer />
    </div>
  );
};

export default Clubs;
