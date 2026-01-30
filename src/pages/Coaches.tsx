import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Trophy, TrendingUp, Search, FileSignature } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ScrollReveal } from "@/components/ScrollReveal";
import bannerHero from "@/assets/banner-hero.jpg";
import blackMarble from "@/assets/black-marble-smudged.png";
import coachesSection from "@/assets/coaches-section.png";
import coachesSection2 from "@/assets/coaches-section-2.png";
import coachesNetwork from "@/assets/coaches-network.jpg";

const Coaches = () => {
  const { t } = useLanguage();

  const coachServices = [
    {
      id: "results",
      icon: Trophy,
      title: "RESULTS",
      teaser: "Utilise our expertise to assess opponents and create game plans that lead to wins.",
      fullContent: [
        "We support coaches daily, offering individualised pre-match analysis, tactical insight, and mental readiness tools that translate directly into performance on match day."
      ],
      image: coachesSection
    },
    {
      id: "foster",
      icon: TrendingUp,
      title: "FOSTER",
      teaser: "Maximise the physical capacity of your players with strategies that ensure long-term development.",
      fullContent: [
        "Through holistic, individualised performance support, we help coaches push players beyond perceived limits while maintaining alignment with club staff."
      ],
      image: coachesNetwork
    },
    {
      id: "allure",
      icon: Search,
      title: "ALLURE",
      teaser: "Through our vast network, we scout across the globe to ensure recruitment is tailored to your specific tactical approach to the game. Find and attract profiles that fit your needs.",
      fullContent: [
        "In a competitive market, the combination of greater finances, superior scouting and networking results in the greatest success on the pitch. Our work impacts all three to put you in the prime position to execute at a higher level than competitors. Ensure that you find, convince and sign the greatest and best-fitted talent each and every season; while simultaneously making wise decisions on the timing of departures for expert squad-building.",
        "Our analysis extends across the entirety of professional football within Europe, allowing us to pick out players that club scouting networks can easily miss. Furthermore, our talent identification ensures prudent signings including undervalued players and key contributors to success on the pitch. We consider not only the raw ability and potential of players, but also their technical and tactical adaptability to your playstyle, as well as experience within related systems. This allows you to more easily coach the players in your team to reflect your vision on the pitch.",
        "A major aspect to this is our broad network which spans across half of the globe with key decision-makers in clubs at all levels of the game. This combined with our reputation for recruiting great fits for our coaches allows us to tap into any market to ensure deals are completed."
      ],
      image: coachesSection2
    },
    {
      id: "sign",
      icon: FileSignature,
      title: "SIGN",
      teaser: "Negotiate improved contracts with confidence.",
      fullContent: [
        "Our role is then to negotiate the best possible contracts for our coaches. We recognise the sheer amount of dedication, hard work, and sacrifice that goes into a career, and we firmly believe in ensuring our coaches are fairly rewarded for their efforts.",
        "Our team of agents and legal advisors understand the intricacies of the football industry and know how to advocate effectively for our clients. Our aim is to secure contracts that reflect not only your current performance, but also the value you bring to a team.",
        "This is not limited to the financial aspect of the contract, though that is certainly important. We also consider a wide range of other factors that contribute to your overall career satisfaction and progression. This could include clauses around recruitment, freedom of movement, club obligations, bonuses, as well as key elements like image rights and sponsorship deals.",
        "During negotiations, our team maintains constant communication with you, ensuring that you are always informed and involved in the process. We believe in transparency and will always explain the details of the proposed contract, including any potential risks and benefits."
      ],
      image: coachesSection
    }
  ];

  return (
    <div className="min-h-screen bg-background" key="coaches-page">
      <SEO 
        title="For Coaches - Representation | RISE Agency"
        description="Professional representation for coaching excellence. We showcase achievements, foster connections, and secure opportunities."
        image="/og-preview-coaches.png"
        url="/coaches"
      />
      <Header />
      
      <main className="pt-32 md:pt-24">
        {/* Hero Section */}
        <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bannerHero})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
          
          <div className="relative container mx-auto px-4 text-center z-10">
            <div className="inline-block mb-6">
              <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                {t('coaches.badge', 'For Coaches')}
              </span>
            </div>
            <h1 className="text-6xl md:text-8xl font-bebas uppercase tracking-wider text-white mb-4">
              {t('coaches.title', 'COACHES')}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              <em>{t('coaches.subtitle', 'Professional representation for coaching excellence')}</em>
            </p>
          </div>
        </section>

        {/* Coach Services with Collapsible - Alternating Layout */}
        {coachServices.map((service, index) => (
          <ScrollReveal key={service.id}>
            <section className="grid md:grid-cols-2">
              {/* Image - alternates position */}
              <div 
                className={`relative min-h-[300px] md:min-h-[600px] bg-cover bg-center ${index % 2 === 0 ? 'order-2 md:order-2' : 'order-2 md:order-1'}`}
                style={{ backgroundImage: `url(${service.image})` }}
              />
              
              {/* Content */}
              <div 
                className={`relative p-8 md:p-16 flex items-center ${index % 2 === 0 ? 'order-1 md:order-1' : 'order-1 md:order-2'}`}
                style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              >
                <div className="max-w-xl space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
                      <service.icon className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-primary mb-4">
                        {service.title}
                      </h2>
                      <p className="text-base md:text-xl text-white/90 leading-relaxed">
                        {service.teaser}
                      </p>
                    </div>
                  </div>
                  
                  <Collapsible>
                    <CollapsibleTrigger className="group flex items-center gap-3 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-md transition-all">
                      <span className="text-sm uppercase tracking-wider text-primary font-medium">Read More</span>
                      <ChevronDown className="h-4 w-4 text-primary transition-transform group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-6 space-y-4 text-sm md:text-base text-white/80 leading-relaxed">
                      {service.fullContent.map((paragraph, idx) => (
                        <p key={idx}>{paragraph}</p>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            </section>
          </ScrollReveal>
        ))}

        {/* CTA Section */}
        <ScrollReveal>
          <section className="py-6 md:py-8 bg-background">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
                {t('coaches.cta_title', 'READY TO TAKE THE NEXT STEP?')}
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                <em>{t('coaches.cta_subtitle', 'Let us help you achieve your coaching ambitions')}</em>
              </p>
              <Button asChild size="lg" className="btn-shine font-bebas uppercase tracking-wider">
                <Link to="/contact">{t('coaches.cta_button', 'Get In Touch')}</Link>
              </Button>
            </div>
          </section>
        </ScrollReveal>
      </main>

      <Footer />
    </div>
  );
};

export default Coaches;
