import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { ScrollReveal, ScrollRevealContainer, ScrollRevealItem } from "@/components/ScrollReveal";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, TrendingUp, Eye, Target, FileSignature, ArrowRight } from "lucide-react";
import footballIcon from "@/assets/football-icon.png";
import bannerHero from "@/assets/banner-hero.jpg";

const HowWeRise = () => {
  const { t } = useLanguage();

  const playerServices = [
    {
      id: "develop",
      title: "DEVELOP",
      teaser: "Receive expert training to maximise your physical capacity for performance. Push the limits of your body and mind to truly know how far you can go in your career.",
      fullContent: [
        "We believe that pushing the limits of your body and mind are key to discovering how far you can truly go in your career. Through our expert training, you can realise your true potential, resting assured that no stone will be left unturned in your journey to becoming the best you can possibly be.",
        "Our agency provides the best possible support to help you excel in your career. We understand that maximising potential requires both holistic and individualised attention to nurture the body and mind. With a team composed of experienced professionals, we provide support through tactical analysis, as well as psychological, technical, strength, power and speed training. This comprehensive set of expertise allows us to approach a player's development from all angles, ensuring progress in every aspect of performance.",
        "Unlike club training that aims to cater to the average needs of many players, our expert individualised training is tailored specifically to the unique needs and aspirations of our players directly. One of the key benefits of our agency is the continuity of care that we provide. Our team remains in place throughout the entire career, unlike club staff who see players coming and going every season. This allows us to truly get to know our players, understand evolving needs, and make necessary adjustments to training in real-time. We can track progress closely, making small tweaks and corrections that can make a big difference in performance. Additionally, our team acts as a conduit to club staff, keeping the lines of communication open, sharing important information and collaborating to ensure training remains in harmony."
      ],
      icon: TrendingUp
    },
    {
      id: "perform",
      title: "PERFORM",
      teaser: "Play your best on a consistent basis through smart preparation, including psychological training sessions and pre-match analysis specific to your individual matchups.",
      fullContent: [
        "To rise to the occasion, we must fully embrace the ethos that every day matters. We are not a standard fair-weather agent who only shows up during transfer windows; instead, we are there for the daily grind, supporting you every step of the way. We understand that success in your career is built on consistency and proper preparation.",
        "As part of our comprehensive approach to player development, we offer individualised pre-match analysis. The better prepared you are for game day, the more likely you are to excel on the pitch. We do not offer generic advice; instead, we provide analysis that is specific to your unique abilities. This means understanding the opposition and main matchups you will face, but framing it in a way that plays to your strengths and covers any potential weaknesses.",
        "Beyond the physical and tactical preparations, we also understand the importance of mental readiness. Our mental skill and will sessions work to get you into the right frame of mind before match day.",
        "Daily lifestyle work plays a crucial role in your preparation too. Good nutrition is the fuel that powers your performance, and we provide advice on how to optimise your diet to support your training and recovery. We also provide guidance on recovery strategies, recognising that the time spent off the pitch is just as important as the time on it."
      ],
      icon: Target
    },
    {
      id: "attract",
      title: "ATTRACT",
      teaser: "Through our vast scouting network, we maximise visibility across the footballing world to ensure player interest and demand.",
      fullContent: [
        "One of the significant advantages of partnering with our agency is the breadth and depth of our connections within the industry. Over the years, we have cultivated a wide scouting network that spans across clubs, leagues, and continents.",
        "Our network includes technical directors, recruitment analysts, coaches, and other decision-makers across professional football. These are the individuals who identify and recruit talent, making decisions that can shape a player's career trajectory. By maintaining close ties with these professionals, we can keep our players in the forefront of their minds, promoting your skills, potential, and performance throughout each season.",
        "This continuous promotion is not just about putting your name out there; it is about strategically aligning your strengths and abilities with the needs and goals of potential suitors. We work to understand the specific requirements and ambitions of different clubs, positioning our players as the solution to their needs.",
        "It is not only about marketing you to potential suitors; it is also about finding the right fit for you - clubs and roles where you can thrive, both professionally and personally. We consider factors such as the club's culture, the coaching staff's philosophy, the team's style of play, and even the location and lifestyle."
      ],
      icon: Eye
    },
    {
      id: "sign",
      title: "SIGN",
      teaser: "Sign the dotted line after our team of intermediaries negotiate new and improved contracts. Retain confidence knowing your career opportunities are being created and finalised.",
      fullContent: [
        "Our role is then to negotiate the best possible contracts for our players. We recognise the sheer amount of dedication, hard work, and sacrifice that goes into a career, and we firmly believe in ensuring our players are fairly rewarded for their efforts.",
        "Our team of agents and legal advisors understand the intricacies of the football industry and know how to advocate effectively for our clients. Our aim is to secure contracts that reflect not only your current performance, but also your potential, and the value you bring to the team.",
        "This is not limited to the financial aspect of the contract. We also consider clauses around playing time, position, transfer possibilities, injury provisions, image rights, sponsorship deals, and post-career opportunities.",
        "During negotiations, our team maintains constant communication with you, ensuring transparency and clarity at every stage."
      ],
      icon: FileSignature
    }
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO 
        title="How We Rise - Player Development | RISE Football Agency"
        description="Discover how RISE develops players through comprehensive support: development, performance, attraction, and contract negotiation."
        image="/og-preview-how-we-rise.png"
        url="/how-we-rise"
      />
      <Header />
      
      <main className="pt-16">
        {/* Hero Section with Football Icon Background - Restored players-draft style */}
        <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
          {/* Football icon background pattern - using the new uploaded icon */}
          <div className="absolute inset-0 pointer-events-none opacity-5">
            <div className="absolute top-1/4 left-1/4 w-48 h-48 animate-pulse">
              <img src={footballIcon} alt="" className="w-full h-full object-contain" />
            </div>
            <div className="absolute top-1/2 right-1/4 w-32 h-32 animate-pulse" style={{ animationDelay: '1s' }}>
              <img src={footballIcon} alt="" className="w-full h-full object-contain" />
            </div>
            <div className="absolute bottom-1/4 left-1/3 w-24 h-24 animate-pulse" style={{ animationDelay: '2s' }}>
              <img src={footballIcon} alt="" className="w-full h-full object-contain" />
            </div>
            <div className="absolute top-1/3 right-1/3 w-64 h-64 animate-pulse" style={{ animationDelay: '0.5s' }}>
              <img src={footballIcon} alt="" className="w-full h-full object-contain" />
            </div>
          </div>
          
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: `url(${bannerHero})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-background" />
          
          <div className="relative container mx-auto px-4 text-center z-10 py-20">
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-bebas uppercase tracking-wider text-white mb-6">
              REALISE <span className="text-primary">POTENTIAL</span>
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-white/90 max-w-4xl mx-auto leading-relaxed">
              We are your backing in the highly competitive football industry, tackling your challenges and ensuring your success through comprehensive, client-focused solutions. Leveraging deep knowledge and experience in the game, we offer insights you cannot find elsewhere. With respect for both your time and ours, we deliver premium service with unmatched efficiency while our innovative strategies realise your potential, ensuring we rise together.
            </p>
          </div>
        </section>

        {/* Players Section Header */}
        <ScrollReveal>
          <section className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4 text-center">
              <div className="inline-block mb-6">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                  For Players
                </span>
              </div>
              <h2 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider mb-6">
                <span className="text-primary">PLAYERS</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                <em>Comprehensive support across every aspect of your career</em>
              </p>
            </div>
          </section>
        </ScrollReveal>

        {/* Player Services */}
        {playerServices.map((service, index) => (
          <ScrollReveal key={service.id}>
            <section className={`py-12 md:py-16 ${index % 2 === 0 ? 'bg-muted/30' : 'bg-background'}`}>
              <div className="container mx-auto px-4 max-w-5xl">
                <div className="border border-border/50 bg-card/50 rounded-2xl p-8 md:p-12">
                  <div className="flex items-start gap-6 mb-6">
                    <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30">
                      <service.icon className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider text-primary mb-4">
                        {service.title}
                      </h3>
                      <p className="text-lg text-foreground/90 leading-relaxed">
                        {service.teaser}
                      </p>
                    </div>
                  </div>
                  
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
              </div>
            </section>
          </ScrollReveal>
        ))}

        {/* CTA Section */}
        <ScrollReveal>
          <section className="py-16 md:py-24 bg-background relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
            
            <div className="container mx-auto px-4 text-center relative z-10">
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-6">
                Ready to <span className="text-primary">Rise</span>?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                <em>Take the first step towards realising your potential</em>
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button asChild size="lg" className="btn-shine font-bebas uppercase tracking-wider">
                  <Link to="/contact">
                    Get In Touch
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="font-bebas uppercase tracking-wider border-primary/30 text-primary hover:bg-primary/10">
                  <Link to="/youth-players">Youth Players</Link>
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

export default HowWeRise;
