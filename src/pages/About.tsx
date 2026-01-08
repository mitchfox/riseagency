import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { WorkWithUsDialog } from "@/components/WorkWithUsDialog";
import bannerHero from "@/assets/banner-hero.jpg";
import { Target, Users, Globe, Heart, TrendingUp, Brain, Zap, Shield } from "lucide-react";

const About = () => {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO 
        title="About RISE - Premier Football Agency"
        description="Premier football agency specialising in player representation. Founded on integrity, dedication, and excellence."
        image="/og-preview-about.png"
        url="/about"
      />
      <Header />
      
      <main className="pt-32 md:pt-24 touch-pan-y overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bannerHero})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
          
          <div className="relative container mx-auto px-4 text-center z-10">
            <div className="inline-block mb-4">
              <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                {t('about.badge', 'Est. 2021')}
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider text-white mb-6">
              {t('about.hero_title', 'About RISE')}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              {t('about.hero_subtitle', 'Performance-first football representation')}
            </p>
          </div>
        </section>

        {/* Our Story */}
        <section className="py-12 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-8">
                {t('about.our_story', 'OUR')} <span className="text-primary">{t('about.story', 'STORY')}</span>
              </h2>
              <div className="space-y-6 text-lg text-muted-foreground">
                <p>{t('about.story_p1', 'We started as players. We understand the journey: the sacrifices, the setbacks, and what it takes to make it.')}</p>
                <p>{t('about.story_p2', 'RISE was founded on a simple belief: talent needs more than opportunity—it needs the right guidance, structure, and support to truly flourish.')}</p>
                <p>{t('about.story_p3', 'We combine data-driven performance analysis with personalized career management to help players reach their full potential.')}</p>
                <p className="text-foreground font-medium">{t('about.story_p4', 'We built this into the agency we run today. Every lesson, every insight, every connection. Now focused on helping the next generation realise their potential.')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Who We Are */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-8">
                {t('about.who_we_are', 'WHO WE ARE')}
              </h2>
              <div className="space-y-6 text-lg text-muted-foreground">
                <p>{t('about.who_we_are_p1', 'We are a team of football professionals, analysts, and agents dedicated to elevating the game.')}</p>
                <p>{t('about.who_we_are_p2', 'Our expertise spans performance analysis, tactical development, contract negotiation, and career guidance.')}</p>
                <p>{t('about.who_p3', "We understand that success in football extends beyond what happens on the pitch. That's why we provide comprehensive support covering all aspects of a player's career, from performance optimisation and transfer dealings to personal development and career guidance.")}</p>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
                <div className="text-center p-6 border border-border/50 bg-card/30 rounded-lg group hover:border-primary/30 transition-all">
                  <div className="text-5xl font-bebas text-primary group-hover:scale-110 transition-transform">74</div>
                  <div className="h-px w-12 bg-primary/50 mx-auto my-3" />
                  <p className="text-xs font-bebas uppercase tracking-widest text-foreground/70">{t('about.stat_professionals', 'Professionals')}</p>
                </div>
                <div className="text-center p-6 border border-border/50 bg-card/30 rounded-lg group hover:border-primary/30 transition-all">
                  <div className="text-5xl font-bebas text-primary group-hover:scale-110 transition-transform">18</div>
                  <div className="h-px w-12 bg-primary/50 mx-auto my-3" />
                  <p className="text-xs font-bebas uppercase tracking-widest text-foreground/70">{t('about.stat_big5', 'Big 5 League Players')}</p>
                </div>
                <div className="text-center p-6 border border-border/50 bg-card/30 rounded-lg group hover:border-primary/30 transition-all">
                  <div className="text-5xl font-bebas text-primary group-hover:scale-110 transition-transform">10</div>
                  <div className="h-px w-12 bg-primary/50 mx-auto my-3" />
                  <p className="text-xs font-bebas uppercase tracking-widest text-foreground/70">{t('about.stat_national', 'National Team Players')}</p>
                </div>
                <div className="text-center p-6 border border-border/50 bg-card/30 rounded-lg group hover:border-primary/30 transition-all">
                  <div className="text-4xl font-bebas text-primary group-hover:scale-110 transition-transform">£100M+</div>
                  <div className="h-px w-12 bg-primary/50 mx-auto my-3" />
                  <p className="text-xs font-bebas uppercase tracking-widest text-foreground/70">{t('about.stat_transfers', 'Transfer Fees')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Mission */}
        <section className="py-12 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-8">
                {t('about.our_mission', 'OUR MISSION')}
              </h2>
              <div className="space-y-6 text-lg text-muted-foreground">
                <p className="text-xl md:text-2xl text-foreground font-medium">
                  {t('about.mission_p1', 'To provide comprehensive support that enables footballers to reach their highest potential, both on and off the pitch.')}
                </p>
                <p>{t('about.mission_p2', "Through our extensive network of clubs, scouts, and industry professionals, we create pathways for players to achieve their dreams. We pride ourselves on building lasting relationships based on trust, transparency, and mutual respect.")}</p>
              </div>
              
              {/* Mission Pillars */}
              <div className="grid md:grid-cols-3 gap-6 mt-12">
                <div className="p-6 border border-border/50 bg-card/30 rounded-lg">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bebas uppercase tracking-wider text-foreground mb-2">Development First</h3>
                      <p className="text-sm text-muted-foreground">We focus on making players better, knowing career opportunities follow performance improvement.</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 border border-border/50 bg-card/30 rounded-lg">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Brain className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bebas uppercase tracking-wider text-foreground mb-2">Data-Driven</h3>
                      <p className="text-sm text-muted-foreground">Performance analysis and tactical insights guide every decision we make for our players.</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 border border-border/50 bg-card/30 rounded-lg">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bebas uppercase tracking-wider text-foreground mb-2">Long-Term Vision</h3>
                      <p className="text-sm text-muted-foreground">We build careers, not just transfers. Every move is part of a bigger picture.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What We Do */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-12">
                {t('about.what_we_do', 'WHAT WE DO')}
              </h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="p-8 border border-border/50 bg-card/30 rounded-lg group hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <Target className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bebas uppercase tracking-wider text-primary">
                      {t('about.service_representation', 'Representation')}
                    </h3>
                  </div>
                  <p className="text-muted-foreground">
                    {t('about.service_representation_desc', 'Professional contract negotiation and career management')}
                  </p>
                </div>
                <div className="p-8 border border-border/50 bg-card/30 rounded-lg group hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <Zap className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bebas uppercase tracking-wider text-primary">
                      {t('about.service_analysis', 'Performance Analysis')}
                    </h3>
                  </div>
                  <p className="text-muted-foreground">
                    {t('about.service_analysis_desc', 'Data-driven insights to optimize player development')}
                  </p>
                </div>
                <div className="p-8 border border-border/50 bg-card/30 rounded-lg group hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bebas uppercase tracking-wider text-primary">
                      {t('about.service_development', 'Player Development')}
                    </h3>
                  </div>
                  <p className="text-muted-foreground">
                    {t('about.service_development_desc', 'Tailored training programs and mentorship')}
                  </p>
                </div>
                <div className="p-8 border border-border/50 bg-card/30 rounded-lg group hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <Globe className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bebas uppercase tracking-wider text-primary">
                      {t('about.service_marketing', 'Marketing & Brand')}
                    </h3>
                  </div>
                  <p className="text-muted-foreground">
                    {t('about.service_marketing_desc', 'Building player profiles and commercial opportunities')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The RISE Difference */}
        <section className="py-12 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-4">
                  THE RISE <span className="text-primary">DIFFERENCE</span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                  What sets us apart from traditional football agencies
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <span className="text-4xl font-bebas text-primary/30">01</span>
                    <div>
                      <h3 className="text-xl font-bebas uppercase tracking-wider text-foreground mb-2">Former Players & Coaches</h3>
                      <p className="text-muted-foreground">We've lived the journey. We understand the sacrifices, the pressure, and what it takes to succeed at every level.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <span className="text-4xl font-bebas text-primary/30">02</span>
                    <div>
                      <h3 className="text-xl font-bebas uppercase tracking-wider text-foreground mb-2">Development-Focused</h3>
                      <p className="text-muted-foreground">We're not just agents—we're performance partners. Our in-house team provides tactical analysis, physical training, and psychological support.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <span className="text-4xl font-bebas text-primary/30">03</span>
                    <div>
                      <h3 className="text-xl font-bebas uppercase tracking-wider text-foreground mb-2">European Network</h3>
                      <p className="text-muted-foreground">With scouts across every major European league, we ensure our players are visible to the right clubs at the right time.</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <span className="text-4xl font-bebas text-primary/30">04</span>
                    <div>
                      <h3 className="text-xl font-bebas uppercase tracking-wider text-foreground mb-2">Individualised Attention</h3>
                      <p className="text-muted-foreground">Unlike club staff who manage many players, we provide continuity and personalised support throughout your entire career.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <span className="text-4xl font-bebas text-primary/30">05</span>
                    <div>
                      <h3 className="text-xl font-bebas uppercase tracking-wider text-foreground mb-2">Technology-Driven</h3>
                      <p className="text-muted-foreground">From performance tracking to video analysis, we use cutting-edge tools to give our players every advantage.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <span className="text-4xl font-bebas text-primary/30">06</span>
                    <div>
                      <h3 className="text-xl font-bebas uppercase tracking-wider text-foreground mb-2">Transparent Partnership</h3>
                      <p className="text-muted-foreground">We believe in open communication and honest guidance. Your career is your career—we're here to support it.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
              {t('about.cta_title', 'Join the RISE Family')}
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t('about.cta_subtitle', 'Ready to take your career to the next level?')}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <WorkWithUsDialog>
                <Button size="lg" className="btn-shine font-bebas uppercase tracking-wider">
                  Work With Us
                </Button>
              </WorkWithUsDialog>
              <Button asChild variant="outline" size="lg" className="font-bebas uppercase tracking-wider">
                <Link to="/learnmore">Learn More</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;