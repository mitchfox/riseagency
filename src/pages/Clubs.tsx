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
  Zap
} from "lucide-react";
import bannerHero from "@/assets/banner-hero.jpg";

const Clubs = () => {
  const { t } = useLanguage();
  const [arrangeMeetingOpen, setArrangeMeetingOpen] = useState(false);
  const [declareInterestOpen, setDeclareInterestOpen] = useState(false);

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
    { value: '74', label: t('clubs.stat_professionals', 'Professionals Developed') },
    { value: '18', label: t('clubs.stat_big5', 'Big 5 League Players') },
    { value: '£100M+', label: t('clubs.stat_transfers', 'Transfer Fees') },
    { value: '30+', label: t('clubs.stat_countries', 'Countries Covered') }
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden" key="clubs-page">
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
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bannerHero})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-background" />
          
          <div className="relative container mx-auto px-4 text-center z-10">
            <div className="inline-block mb-6">
              <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                {t('clubs.badge', 'Club Partnerships')}
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bebas uppercase tracking-wider text-white mb-6">
              {t('clubs.title', 'FOR')} <span className="text-primary">{t('clubs.title_highlight', 'CLUBS')}</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-8">
              {t('clubs.subtitle', 'Strategic partnerships that deliver competitive advantage')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => setArrangeMeetingOpen(true)}
                size="lg" 
                className="btn-shine font-bebas uppercase tracking-wider text-lg px-8"
              >
                {t('clubs.arrange_meeting', 'Arrange Meeting')}
              </Button>
              <Button 
                asChild 
                variant="outline" 
                size="lg" 
                className="font-bebas uppercase tracking-wider text-lg px-8 border-white/30 text-white hover:bg-white/10"
              >
                <Link to="/club-direction">{t('clubs.club_direction', 'Club Direction')}</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Stats Section */}
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

        {/* Marquee */}
        <Marquee />

        {/* Services Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-4">
                {t('clubs.how_we_help', 'HOW WE')} <span className="text-primary">{t('clubs.help', 'HELP')}</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {t('clubs.services_desc', 'Comprehensive support across strategy, recruitment, and performance.')}
              </p>
            </div>

            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-3 gap-8">
                {services.map((service, index) => (
                  <div key={index} className="group relative bg-card border border-border/50 rounded-xl p-8 hover:border-primary/50 hover:shadow-xl transition-all duration-300">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-[100px] -z-10" />
                    
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                      <service.icon className="w-8 h-8 text-primary" />
                    </div>
                    
                    <h3 className="text-2xl font-bebas uppercase tracking-wider mb-3">
                      {service.title}
                    </h3>
                    
                    <p className="text-muted-foreground mb-6">
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

        {/* Our Approach Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
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
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 border border-border/50 bg-card/30 rounded-lg text-center">
                    <Globe className="w-10 h-10 text-primary mx-auto mb-4" />
                    <h4 className="text-lg font-bebas uppercase tracking-wider mb-2">European Network</h4>
                    <p className="text-sm text-muted-foreground">Key decision-makers across half the globe</p>
                  </div>
                  <div className="p-6 border border-border/50 bg-card/30 rounded-lg text-center">
                    <Handshake className="w-10 h-10 text-primary mx-auto mb-4" />
                    <h4 className="text-lg font-bebas uppercase tracking-wider mb-2">Trusted Partners</h4>
                    <p className="text-sm text-muted-foreground">Reputation for recruiting great fits</p>
                  </div>
                  <div className="p-6 border border-border/50 bg-card/30 rounded-lg text-center col-span-2">
                    <TrendingUp className="w-10 h-10 text-primary mx-auto mb-4" />
                    <h4 className="text-lg font-bebas uppercase tracking-wider mb-2">Performance Expertise</h4>
                    <p className="text-sm text-muted-foreground">Unique expertise in performance development that elevates your entire organisation</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
              {t('clubs.cta_title', 'READY TO ELEVATE YOUR CLUB?')}
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t('clubs.cta_subtitle', 'Schedule a consultation to discuss how we can support your objectives.')}
            </p>
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
                variant="outline" 
                size="lg" 
                className="font-bebas uppercase tracking-wider"
              >
                {t('clubs.declare_interest', 'Declare Interest in Player')}
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Clubs;
