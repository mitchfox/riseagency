import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { RepresentationDialog } from "@/components/RepresentationDialog";
import { useState } from "react";
import { ScrollReveal, ScrollRevealContainer, ScrollRevealItem } from "@/components/ScrollReveal";
import { 
  Search, 
  UserCheck, 
  MessageCircle, 
  Handshake, 
  Rocket,
  ArrowRight,
  ChevronRight
} from "lucide-react";
import bannerHero from "@/assets/banner-hero.jpg";

const PlayerJourney = () => {
  const { t } = useLanguage();
  const [representationOpen, setRepresentationOpen] = useState(false);

  const journeySteps = [
    {
      step: 1,
      icon: Search,
      title: t("journey.step1_title", "Discovery"),
      subtitle: t("journey.step1_subtitle", "How we connect"),
      description: t("journey.step1_desc", "The journey begins when we find you, through our extensive European scouting network, or when you reach out to us. Either way, it starts with recognition of talent worth investing in."),
      details: [
        t("journey.step1_detail1", "We scout across all of Europe's professional leagues"),
        t("journey.step1_detail2", "Players can also request representation directly"),
        t("journey.step1_detail3", "Initial assessment of potential and fit")
      ]
    },
    {
      step: 2,
      icon: UserCheck,
      title: t("journey.step2_title", "Assessment"),
      subtitle: t("journey.step2_subtitle", "Evaluating the fit"),
      description: t("journey.step2_desc", "Not every talented player is right for us, and we might not be right for every player. We take time to assess whether there's genuine potential for a successful partnership."),
      details: [
        t("journey.step2_detail1", "Review of playing style, mentality, and ambition"),
        t("journey.step2_detail2", "Understanding your goals and timeline"),
        t("journey.step2_detail3", "Honest assessment of where you are and where you could be")
      ]
    },
    {
      step: 3,
      icon: MessageCircle,
      title: t("journey.step3_title", "Discussion"),
      subtitle: t("journey.step3_subtitle", "Full transparency"),
      description: t("journey.step3_desc", "We have detailed conversations about what we offer, what we expect, and what the journey looks like. For under-18s, parents are fully involved in every discussion."),
      details: [
        t("journey.step3_detail1", "Clear explanation of our services and approach"),
        t("journey.step3_detail2", "Discussion of development pathway"),
        t("journey.step3_detail3", "Parent/guardian involvement for youth players"),
        t("journey.step3_detail4", "No pressure. Take the time you need")
      ]
    },
    {
      step: 4,
      icon: Handshake,
      title: t("journey.step4_title", "Agreement"),
      subtitle: t("journey.step4_subtitle", "Formalising the partnership"),
      description: t("journey.step4_desc", "Once we're aligned on goals and approach, we formalise the partnership. Everything is clear, documented, and agreed upon by all parties."),
      details: [
        t("journey.step4_detail1", "Transparent fee structure explained"),
        t("journey.step4_detail2", "Clear terms and expectations"),
        t("journey.step4_detail3", "Family involvement and approval where relevant")
      ]
    },
    {
      step: 5,
      icon: Rocket,
      title: t("journey.step5_title", "Development"),
      subtitle: t("journey.step5_subtitle", "The work begins"),
      description: t("journey.step5_desc", "This is where the real journey starts. You get access to our performance teams, match analysis, development programmes, and the full weight of our network and expertise."),
      details: [
        t("journey.step5_detail1", "Dedicated performance support"),
        t("journey.step5_detail2", "Regular match analysis and feedback"),
        t("journey.step5_detail3", "Career guidance and opportunity creation"),
        t("journey.step5_detail4", "Ongoing development programmes")
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO 
        title={t("journey.seo_title", "How We Work With Players - RISE Football Agency")}
        description={t("journey.seo_desc", "A step-by-step look at how RISE develops talent. From discovery to development, see the journey we take with every player we represent.")}
        image="/og-preview-journey.png"
        url="/player-journey"
      />
      <Header />
      <RepresentationDialog open={representationOpen} onOpenChange={setRepresentationOpen} />
      
      <main className="pt-32 md:pt-24 touch-pan-y overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bannerHero})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-background" />
          
          <div className="relative container mx-auto px-4 text-center z-10">
            <div className="inline-block mb-6">
             <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                {t("journey.badge", "The Process")}
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider text-white mb-6">
              {t("journey.hero_title_1", "HOW WE WORK")} <span className="text-primary">{t("journey.hero_title_2", "WITH PLAYERS")}</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              {t("journey.hero_subtitle", "From discovery to development: a transparent look at the journey")}
            </p>
          </div>
        </section>

        {/* Journey Steps */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto space-y-12">
              {journeySteps.map((step, index) => (
                <div key={step.step} className="relative">
                  {/* Connector line */}
                  {index < journeySteps.length - 1 && (
                    <div className="absolute left-8 top-24 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 to-primary/10 hidden md:block" style={{ height: 'calc(100% + 3rem)' }} />
                  )}
                  
                  <div className="flex gap-6 md:gap-8">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary relative z-10">
                        <step.icon className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 pb-8">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-bebas text-primary/60 uppercase tracking-widest">
                          {t("journey.step", "Step")} {step.step}
                        </span>
                        <ChevronRight className="w-4 h-4 text-primary/40" />
                        <span className="text-sm text-muted-foreground">
                          {step.subtitle}
                        </span>
                      </div>
                      
                      <h3 className="text-3xl md:text-4xl font-bebas uppercase tracking-wider mb-4">
                        {step.title}
                      </h3>
                      
                      <p className="text-lg text-muted-foreground mb-6">
                        {step.description}
                      </p>
                      
                      <ul className="space-y-2">
                        {step.details.map((detail, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <ArrowRight className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                            <span className="text-muted-foreground">{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider">
                {t("journey.results_title_1", "THE")} <span className="text-primary">{t("journey.results_title_2", "RESULTS")}</span>
              </h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
              <div className="text-center p-6 border border-border/50 bg-card/30 rounded-lg">
                <div className="text-5xl md:text-6xl font-bebas text-primary mb-2">74</div>
                <p className="text-sm font-bebas uppercase tracking-widest text-foreground/70">{t("journey.stat_professionals", "Professionals")}</p>
              </div>
              <div className="text-center p-6 border border-border/50 bg-card/30 rounded-lg">
                <div className="text-5xl md:text-6xl font-bebas text-primary mb-2">18</div>
                <p className="text-sm font-bebas uppercase tracking-widest text-foreground/70">{t("journey.stat_big5", "Big 5 League Players")}</p>
              </div>
              <div className="text-center p-6 border border-border/50 bg-card/30 rounded-lg">
                <div className="text-5xl md:text-6xl font-bebas text-primary mb-2">10</div>
                <p className="text-sm font-bebas uppercase tracking-widest text-foreground/70">{t("journey.stat_national", "National Team Players")}</p>
              </div>
              <div className="text-center p-6 border border-border/50 bg-card/30 rounded-lg">
                <div className="text-5xl md:text-6xl font-bebas text-primary mb-2">{t('player_journey.100m', '£100M+')}</div>
                <p className="text-sm font-bebas uppercase tracking-widest text-foreground/70">{t("journey.stat_transfers", "Transfer Fees Developed")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
              {t("journey.cta_title_1", "START YOUR")} <span className="text-primary">{t("journey.cta_title_2", "JOURNEY")}</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t("journey.cta_desc", "Ready to take the first step? Get in touch and let's see if there's a fit.")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => setRepresentationOpen(true)}
                size="lg" 
                className="btn-shine font-bebas uppercase tracking-wider"
              >
                {t("journey.request_representation", "Request Representation")}
              </Button>
              <Button 
                asChild 
                variant="outline" 
                size="lg" 
                className="font-bebas uppercase tracking-wider"
              >
                <Link to="/youth-players">{t("journey.for_youth", "For Youth Players & Parents")}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PlayerJourney;
