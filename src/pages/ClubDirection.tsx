import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrangeMeetingDialog } from "@/components/ArrangeMeetingDialog";
import { useState } from "react";
import { 
  Target, 
  TrendingUp, 
  Users, 
  BarChart3, 
  Search, 
  Zap,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import bannerHero from "@/assets/banner-hero.jpg";

const ClubDirection = () => {
  const { t } = useLanguage();
  const [meetingOpen, setMeetingOpen] = useState(false);

  const services = [
    {
      icon: Target,
      title: "Strategic Planning",
      description: "Comprehensive squad planning aligned with your club's vision and financial parameters.",
      features: ["Short and long-term squad analysis", "Budget optimisation", "Competitive positioning"]
    },
    {
      icon: Search,
      title: "Talent Identification",
      description: "Access our European scouting network to find players that fit your specific requirements.",
      features: ["Bespoke player shortlists", "Video analysis packages", "Background verification"]
    },
    {
      icon: BarChart3,
      title: "Performance Analysis",
      description: "Data-driven insights to evaluate current squad performance and identify improvement areas.",
      features: ["Individual player reports", "Team tactical analysis", "Opposition scouting"]
    },
    {
      icon: TrendingUp,
      title: "Development Pathways",
      description: "Structured development programmes for academy and first team integration.",
      features: ["Youth development frameworks", "Loan strategy consultation", "Progression planning"]
    },
    {
      icon: Users,
      title: "Staff Development",
      description: "Support for coaching staff development and departmental alignment.",
      features: ["Coaching consultation", "Staff structure review", "Best practice sharing"]
    },
    {
      icon: Zap,
      title: "Market Intelligence",
      description: "Real-time market insights and player availability across European leagues.",
      features: ["Transfer market updates", "Contract situation monitoring", "Valuation guidance"]
    }
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO 
        title="Club Direction - Strategic Football Consultancy | RISE Agency"
        description="Strategic consultancy for football clubs. Squad planning, talent identification, and performance analysis to elevate your club."
        image="/og-preview-clubs.png"
        url="/club-direction"
      />
      <Header />
      <ArrangeMeetingDialog open={meetingOpen} onOpenChange={setMeetingOpen} />
      
      <main className="pt-32 md:pt-24">
        {/* Hero Section */}
        <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bannerHero})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-background" />
          
          <div className="relative container mx-auto px-4 text-center z-10">
            <div className="inline-block mb-6">
              <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                {t('club_direction.badge', 'For Clubs')}
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider text-white mb-6">
              {t('club_direction.hero_title', 'CLUB')} <span className="text-primary">{t('club_direction.hero_highlight', 'DIRECTION')}</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-8">
              {t('club_direction.hero_subtitle', 'Strategic consultancy to help clubs compete at the highest level')}
            </p>
            <Button 
              onClick={() => setMeetingOpen(true)}
              size="lg" 
              className="btn-shine font-bebas uppercase tracking-wider"
            >
              Arrange a Consultation
            </Button>
          </div>
        </section>

        {/* Value Proposition */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-8">
                {t('club_direction.why_title', 'WHY WORK WITH')} <span className="text-primary">{t('club_direction.why_highlight', 'RISE?')}</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                We offer national exclusivity to our club partners, providing undivided time and resources. 
                This results in greater domestic success through the prioritisation of your club over all others.
              </p>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-6 border border-border/50 bg-card rounded-lg">
                  <div className="text-4xl font-bebas text-primary mb-2">100+</div>
                  <p className="text-sm text-muted-foreground">Club connections across Europe</p>
                </div>
                <div className="p-6 border border-border/50 bg-card rounded-lg">
                  <div className="text-4xl font-bebas text-primary mb-2">15+</div>
                  <p className="text-sm text-muted-foreground">Years combined experience</p>
                </div>
                <div className="p-6 border border-border/50 bg-card rounded-lg">
                  <div className="text-4xl font-bebas text-primary mb-2">5</div>
                  <p className="text-sm text-muted-foreground">European leagues covered</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-4">
                {t('club_direction.services_title', 'OUR')} <span className="text-primary">{t('club_direction.services_highlight', 'SERVICES')}</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Comprehensive support tailored to your club's specific needs and objectives
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {services.map((service, index) => (
                <div 
                  key={index}
                  className="p-8 border border-border/50 bg-card rounded-lg hover:border-primary/30 transition-all group"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                    <service.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bebas uppercase tracking-wider mb-3">
                    {service.title}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {service.description}
                  </p>
                  <ul className="space-y-2">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Process */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-4">
                  {t('club_direction.process_title', 'HOW IT')} <span className="text-primary">{t('club_direction.process_highlight', 'WORKS')}</span>
                </h2>
              </div>

              <div className="space-y-8">
                {[
                  { step: "01", title: "Initial Consultation", desc: "We meet to understand your club's vision, challenges, and objectives." },
                  { step: "02", title: "Assessment", desc: "Our team conducts a comprehensive review of your current setup and requirements." },
                  { step: "03", title: "Strategy Development", desc: "We create a tailored plan aligned with your goals and budget." },
                  { step: "04", title: "Implementation", desc: "Ongoing support and guidance as we work together to achieve results." }
                ].map((item, index) => (
                  <div key={index} className="flex gap-6 items-start">
                    <div className="text-4xl font-bebas text-primary/30">{item.step}</div>
                    <div>
                      <h3 className="text-xl font-bebas uppercase tracking-wider mb-2">{item.title}</h3>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
              {t('club_direction.cta_title', 'READY TO')} <span className="text-primary">{t('club_direction.cta_highlight', 'ELEVATE YOUR CLUB?')}</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Let's discuss how we can help your club achieve its goals
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => setMeetingOpen(true)}
                size="lg" 
                className="btn-shine font-bebas uppercase tracking-wider"
              >
                Arrange a Meeting
              </Button>
              <Button 
                asChild
                variant="outline" 
                size="lg" 
                className="font-bebas uppercase tracking-wider"
              >
                <Link to="/clubs">
                  Learn More
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ClubDirection;