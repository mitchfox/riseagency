import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { HoverText } from "@/components/HoverText";
import { useLanguage } from "@/contexts/LanguageContext";
import { BarChart3, Video, Target, TrendingUp, Activity, Brain } from "lucide-react";
import { ScrollReveal, ScrollRevealContainer, ScrollRevealItem } from "@/components/ScrollReveal";
import bannerHero from "@/assets/banner-hero.jpg";

const PerformancePage = () => {
  const { t } = useLanguage();

  const services = [
    {
      icon: BarChart3,
      title: t('performance.analysis_title', 'Performance Analysis'),
      description: t('performance.analysis_intro', 'We utilise cutting-edge technology and data analytics to track and improve player performance. Our comprehensive analysis covers:'),
      items: [
        t('performance.analysis_item1', 'Physical metrics and fitness tracking'),
        t('performance.analysis_item2', 'Technical skills assessment'),
        t('performance.analysis_item3', 'Tactical understanding and decision-making'),
        t('performance.analysis_item4', 'Match performance statistics')
      ]
    },
    {
      icon: Target,
      title: t('performance.development_title', 'Individual Development Plans'),
      description: t('performance.development_text', 'Each player receives a personalised development roadmap based on detailed performance data. We identify areas for improvement and create targeted training programmes to address specific needs.')
    },
    {
      icon: Video,
      title: t('performance.video_title', 'Video Analysis'),
      description: t('performance.video_text', 'Our team provides detailed video breakdowns of match performances, training sessions, and specific skill work. This visual feedback helps players understand their strengths and areas for development.')
    },
    {
      icon: TrendingUp,
      title: t('performance.benchmarking_title', 'Benchmarking'),
      description: t('performance.benchmarking_text', 'We compare player statistics against professional standards at various levels, providing clear targets and realistic progression pathways.')
    }
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO 
        title={t('performance.seo_title', 'Performance Analysis - Data-Driven Player Development | RISE')}
        description={t('performance.seo_description', 'Maximise player potential through data-driven insights. We provide comprehensive performance analysis, video breakdown, and individual development plans.')}
        image="/og-preview-performance.png"
        url="/performance"
      />
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
            <div className="inline-block mb-6">
              <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                {t('performance.badge', 'Data-Driven')}
              </span>
            </div>
            <h1 className="text-6xl md:text-8xl font-bebas uppercase tracking-wider text-white mb-6">
              {t('performance.hero_title', 'Performance')}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              {t('performance.hero_subtitle', 'Maximising potential through data-driven insights')}
            </p>
          </div>
        </section>

        {/* Services Grid */}
        <section className="py-16 md:py-24 px-4">
          <div className="container mx-auto max-w-6xl">
            <ScrollRevealContainer className="grid md:grid-cols-2 gap-8" staggerDelay={0.1}>
              {services.map((service, index) => (
                <ScrollRevealItem key={index}>
                  <div 
                    className="p-8 border border-border/50 bg-card/30 rounded-lg hover:border-primary/30 transition-all group"
                  >
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colours">
                      <service.icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider mb-4">
                      {service.title}
                    </h3>
                    <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                      {service.description}
                    </p>
                    {service.items && (
                      <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                        {service.items.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </ScrollRevealItem>
              ))}
            </ScrollRevealContainer>
          </div>
        </section>

        {/* Visual Stats Section */}
        <ScrollReveal>
          <section className="py-16 md:py-24 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-4">
                  {t('performance.our_approach', 'OUR')} <span className="text-primary">{t('performance.approach', 'APPROACH')}</span>
                </h2>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                <div className="text-center p-8 border border-border/50 bg-card rounded-lg">
                  <Activity className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bebas uppercase tracking-wider mb-2">Physical</h3>
                  <p className="text-sm text-muted-foreground">Strength, speed, endurance and injury prevention metrics tracked and optimised</p>
                </div>
                <div className="text-center p-8 border border-border/50 bg-card rounded-lg">
                  <Brain className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bebas uppercase tracking-wider mb-2">Psychological</h3>
                  <p className="text-sm text-muted-foreground">Mental resilience, focus and match preparation support</p>
                </div>
                <div className="text-center p-8 border border-border/50 bg-card rounded-lg">
                  <Target className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bebas uppercase tracking-wider mb-2">Tactical</h3>
                  <p className="text-sm text-muted-foreground">Positional intelligence, decision-making and game understanding</p>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
              {t('performance.cta_title', 'Optimise Your Performance')}
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t('performance.cta_subtitle', 'Learn how our performance analysis can elevate your game')}
            </p>
            <Button asChild size="lg" className="btn-shine font-bebas uppercase tracking-wider">
              <Link to="/contact">{t('common.get_started', 'Get Started')}</Link>
            </Button>
          </div>
        </section>

        {/* RISE Broadcast Advertisement */}
        <section className="py-12 md:py-16 px-4 bg-muted/30">
          <div className="container mx-auto">
            <div className="max-w-5xl mx-auto p-8 rounded-lg border border-primary/20 bg-primary/5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent"></div>
              <div className="text-center relative z-10">
                <h2 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider text-primary mb-3">
                  {t('common.broadcast_title', 'Join RISE Broadcast on Instagram')}
                </h2>
                <p className="text-foreground mb-6 text-base md:text-lg leading-relaxed">
                  {t('common.broadcast_description', 'Get daily updates on agency insights, performance optimisation, coaching systems, and player development strategies')}
                </p>
                <a
                  href="https://www.instagram.com/channel/AbY33s3ZhuxaNwuo/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-background font-bebas uppercase tracking-wider text-lg hover:bg-primary/90 hover:scale-105 transition-all rounded shadow-lg"
                >
                  <HoverText text={t('common.join_channel', 'Join the Channel')} />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PerformancePage;
