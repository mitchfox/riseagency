import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Trophy, TrendingUp, Search, FileSignature, ArrowRight, Globe, BarChart3, Handshake, CheckCircle2, Shield, Zap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Marquee } from "@/components/Marquee";
import { ArrangeMeetingDialog } from "@/components/ArrangeMeetingDialog";
import { RepresentationDialog } from "@/components/RepresentationDialog";
import { useState } from "react";
import bannerHero from "@/assets/banner-hero.jpg";
import blackMarble from "@/assets/black-marble-smudged.png";
import whiteMarble from "@/assets/white-marble.png";
import realisePotentialReport from "@/assets/realise-potential-report.png";
import realisePotentialAnalysis from "@/assets/realise-potential-analysis.png";
import realisePotentialSessions from "@/assets/realise-potential-sessions.png";
import realisePotentialPaos from "@/assets/realise-potential-paos.png";

const Coaches = () => {
  const { t } = useLanguage();
  const [arrangeMeetingOpen, setArrangeMeetingOpen] = useState(false);
  const [representationOpen, setRepresentationOpen] = useState(false);
  const [activeApproachImage, setActiveApproachImage] = useState(0);

  const coachServices = [
    {
      id: "results",
      icon: Trophy,
      title: "RESULTS",
      teaser: "Utilise our expertise to assess opponents and create game plans that lead to wins.",
      fullContent: [
        "We support coaches daily, offering individualised pre-match analysis, tactical insight, and mental readiness tools that translate directly into performance on match day."
      ]
    },
    {
      id: "foster",
      icon: TrendingUp,
      title: "FOSTER",
      teaser: "Maximise the physical capacity of your players with strategies that ensure long-term development.",
      fullContent: [
        "Through holistic, individualised performance support, we help coaches push players beyond perceived limits while maintaining alignment with club staff."
      ]
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
      ]
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
      ]
    }
  ];

  const stats = [
    { value: '50+', label: t('coaches.stat_coaches', 'Coaches in Network') },
    { value: '15+', label: t('coaches.stat_leagues', 'Leagues Covered') },
    { value: '30+', label: t('coaches.stat_countries', 'Countries') },
    { value: '100%', label: t('coaches.stat_support', 'Dedicated Support') }
  ];

  const approachImages = [
    { src: realisePotentialReport, label: 'Tactical Analysis' },
    { src: realisePotentialAnalysis, label: 'Match Preparation' },
    { src: realisePotentialSessions, label: 'Development Plans' },
    { src: realisePotentialPaos, label: 'Performance Insights' }
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full max-w-full" key="coaches-page">
      <SEO 
        title="For Coaches - Representation | RISE Agency"
        description="Professional representation for coaching excellence. We showcase achievements, foster connections, and secure opportunities."
        image="/og-preview-coaches.png"
        url="/coaches"
      />
      <Header />
      <ArrangeMeetingDialog open={arrangeMeetingOpen} onOpenChange={setArrangeMeetingOpen} />
      <RepresentationDialog open={representationOpen} onOpenChange={setRepresentationOpen} />
      
      <main className="pt-32 md:pt-24">
        {/* Hero Section */}
        <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center grayscale"
            style={{ backgroundImage: `url(${bannerHero})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-background" />
          
          <div className="relative container mx-auto px-4 text-center z-10">
            <div className="inline-block mb-6">
              <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                {t('coaches.badge', 'For Coaches')}
              </span>
            </div>
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-bebas uppercase tracking-wider text-white mb-4">
              {t('coaches.title', 'COACHES')}
            </h1>
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent blur-xl" 
                   style={{ borderRadius: '50%/60%', transform: 'scale(1.2, 1.5)' }} />
              <p className="text-xl md:text-2xl text-white/90 italic relative z-10 px-8">
                {t('coaches.subtitle', 'Professional representation for coaching excellence')}
              </p>
            </div>
            
            {/* Stats Row */}
            <div className="flex flex-wrap justify-center gap-8 md:gap-12 mt-12">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bebas text-primary">{stat.value}</div>
                  <div className="text-xs md:text-sm text-white/60 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Services Icons Row */}
        <ScrollReveal>
          <section className="py-12 md:py-16 border-b border-border/50">
            <div className="container mx-auto px-4">
              <div className="flex flex-wrap justify-center gap-8 md:gap-16">
                {coachServices.map((service) => (
                  <a
                    key={service.id}
                    href={`#${service.id}`}
                    className="group flex flex-col items-center gap-3 transition-all hover:scale-105"
                  >
                    <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30 group-hover:bg-primary/20 group-hover:border-primary/50 transition-all">
                      <service.icon className="w-8 h-8 text-primary" />
                    </div>
                    <span className="font-bebas text-xl uppercase tracking-wider text-foreground group-hover:text-primary transition-colors">
                      {service.title}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Coach Services Cards */}
        {coachServices.map((service, index) => (
          <ScrollReveal key={service.id}>
            <section 
              id={service.id}
              className={`py-16 md:py-24 ${index % 2 === 0 ? 'bg-muted/30' : 'bg-background'}`}
            >
              <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center max-w-6xl mx-auto">
                  {/* Content - alternates position */}
                  <div className={`${index % 2 === 0 ? 'md:order-1' : 'md:order-2'}`}>
                    <div className="flex items-start gap-4 mb-6">
                      <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
                        <service.icon className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-primary mb-2">
                          {service.title}
                        </h2>
                      </div>
                    </div>
                    
                    <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                      {service.teaser}
                    </p>
                    
                    <Collapsible>
                      <CollapsibleTrigger className="group flex items-center gap-3 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-md transition-all">
                        <span className="text-sm uppercase tracking-wider text-primary font-medium">Read More</span>
                        <ChevronDown className="h-4 w-4 text-primary transition-transform group-data-[state=open]:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
                        {service.fullContent.map((paragraph, idx) => (
                          <p key={idx}>{paragraph}</p>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                  
                  {/* Visual - alternates position */}
                  <div className={`${index % 2 === 0 ? 'md:order-2' : 'md:order-1'}`}>
                    <div 
                      className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-border/50"
                      style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover' }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="p-8 rounded-full bg-primary/10 border border-primary/30">
                          <service.icon className="w-24 h-24 text-primary/50" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </ScrollReveal>
        ))}

        {/* Our Approach Section with Interactive Gallery */}
        <ScrollReveal>
          <section className="py-16 md:py-24 bg-muted/20">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                  {t('coaches.approach_badge', 'Our Approach')}
                </span>
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mt-6 mb-4">
                  {t('coaches.approach_title', 'How We Support You')}
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  <em>{t('coaches.approach_subtitle', 'Comprehensive tools and insights to enhance your coaching')}</em>
                </p>
              </div>
              
              {/* Interactive Image Gallery */}
              <div className="max-w-4xl mx-auto">
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-border/50 mb-6">
                  {approachImages.map((img, idx) => (
                    <img 
                      key={idx}
                      src={img.src} 
                      alt={img.label}
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                        activeApproachImage === idx ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  ))}
                </div>
                
                {/* Thumbnail Selectors */}
                <div className="flex justify-center gap-4">
                  {approachImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveApproachImage(idx)}
                      className={`group relative flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${
                        activeApproachImage === idx 
                          ? 'bg-primary/20 border border-primary' 
                          : 'bg-muted/50 border border-transparent hover:border-primary/30'
                      }`}
                    >
                      <div className="w-16 h-12 md:w-20 md:h-14 rounded overflow-hidden">
                        <img 
                          src={img.src} 
                          alt={img.label}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className={`text-xs font-bebas uppercase tracking-wider ${
                        activeApproachImage === idx ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {img.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* CTA Section */}
        <ScrollReveal>
          <section 
            className="relative py-16 md:py-24 overflow-hidden"
            style={{ backgroundImage: `url(${whiteMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            {/* Gold border lines */}
            <div className="absolute top-4 left-4 right-4 bottom-4 border border-primary/30 pointer-events-none" />
            
            <div className="container mx-auto px-4 text-center relative z-10">
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-black mb-6">
                {t('coaches.cta_title', 'Ready to Elevate Your Career?')}
              </h2>
              <div className="inline-block bg-black px-6 py-2 mb-8">
                <p className="text-xl text-white">
                  <em>{t('coaches.cta_subtitle', 'Let us help you achieve your coaching ambitions')}</em>
                </p>
              </div>
              
              <div className="flex flex-wrap gap-4 justify-center">
                <Button 
                  size="lg" 
                  onClick={() => setRepresentationOpen(true)}
                  className="btn-shine font-bebas uppercase tracking-wider bg-black text-white hover:bg-black/90"
                >
                  {t('coaches.represent_me', 'Represent Me')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={() => setArrangeMeetingOpen(true)}
                  className="font-bebas uppercase tracking-wider border-black text-black hover:bg-black/10"
                >
                  {t('coaches.arrange_meeting', 'Arrange Meeting')}
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

export default Coaches;
