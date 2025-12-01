import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import bannerHero from "@/assets/banner-hero.jpg";
import blackMarble from "@/assets/black-marble-smudged.png";
import coachesSection from "@/assets/coaches-section.png";
import coachesSection2 from "@/assets/coaches-section-2.png";
import coachesNetwork from "@/assets/coaches-network.jpg";

const Coaches = () => {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background" key="coaches-page">
      <SEO 
        title="For Coaches - Professional Representation | RISE Agency"
        description="Professional representation for coaching excellence. We showcase your achievements, foster connections, and secure the best opportunities that reflect your coaching expertise."
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
            <h1 className="text-6xl md:text-8xl font-bebas uppercase tracking-wider text-white mb-4">
              {t('coaches.title')}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              {t('coaches.subtitle')}
            </p>
          </div>
        </section>

        {/* RESULTS Section - Text Left, Image Right */}
        <section className="grid md:grid-cols-2">
          <div 
            className="relative p-8 md:p-16 flex items-center"
            style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="max-w-xl space-y-6">
              <div>
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-[--gold] mb-6">
                  {t('coaches.results')}
                </h2>
                <p className="text-base md:text-xl text-white/90 leading-relaxed">
                  {t('coaches.results_desc')}
                </p>
              </div>
              <Collapsible>
                <CollapsibleTrigger className="group flex items-center gap-3 px-4 py-2.5 bg-[--gold]/10 hover:bg-[--gold]/20 border border-[--gold]/30 rounded-md transition-all">
                  <span className="text-sm uppercase tracking-wider text-[--gold] font-medium">{t('coaches.learn_more')}</span>
                  <ChevronDown className="h-4 w-4 text-[--gold] transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-6 space-y-4 text-sm md:text-base text-white/80 leading-relaxed">
                  <p>
                    To rise to the occasion, we must fully embrace the ethos that every day matters. We are not a standard fair-weather agent who only shows up during transfer windows; instead, we are there for the daily grind, supporting you every step of the way. We understand that success in your career is built on consistency and proper preparation.
                  </p>
                  <p>
                    As part of our comprehensive approach to ensuring our coaches succeed, we offer individualised pre-match analysis to support your preparation for game day with an eye for tactical and technical details that club staff are unlikely to pick up on. The better prepared you are for game day, the more likely your side are to excel on the pitch. We do not offer generic advice; instead, we provide analysis that is specific to the unique abilities of your side. This means understanding the opposition and main matchups you will face, but framing it in a way that plays to strengths and covers any potential weaknesses.
                  </p>
                  <p>
                    Beyond the physical and tactical preparations, we also understand the importance of mental readiness. Our mental skill and will sessions work to get you into the right frame of mind before match day, so that you can re-impart this wisdom to your players and be a greater motivator.
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
          <div 
            className="relative min-h-[300px] md:min-h-[600px] bg-cover bg-center"
            style={{ backgroundImage: `url(${coachesSection})` }}
          />
        </section>

        {/* FOSTER Section - Image Left, Text Right */}
        <section className="grid md:grid-cols-2">
          <div 
            className="relative min-h-[300px] md:min-h-[600px] bg-cover bg-center order-2 md:order-1"
            style={{ backgroundImage: `url(${coachesNetwork})` }}
          />
          <div 
            className="relative p-8 md:p-16 flex items-center order-1 md:order-2"
            style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="max-w-xl space-y-6">
              <div>
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-[--gold] mb-6">
                  {t('coaches.foster')}
                </h2>
                <p className="text-base md:text-xl text-white/90 leading-relaxed">
                  {t('coaches.foster_desc')}
                </p>
              </div>
              <Collapsible>
                <CollapsibleTrigger className="group flex items-center gap-3 px-4 py-2.5 bg-[--gold]/10 hover:bg-[--gold]/20 border border-[--gold]/30 rounded-md transition-all">
                  <span className="text-sm uppercase tracking-wider text-[--gold] font-medium">{t('coaches.learn_more')}</span>
                  <ChevronDown className="h-4 w-4 text-[--gold] transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-6 space-y-4 text-sm md:text-base text-white/80 leading-relaxed">
                  <p>
                    Pushing the limits of your players physically and mentally is key to discovering what they are truly capable of. Through our expertise in the performance space, we support the implementation of training protocols to eliminate their weaknesses while expanding on their strengths. Rest assured that no stone will be left unturned in each training week.
                  </p>
                  <p>
                    Our agency provides the best possible support to help your players excel. We understand that maximising potential requires both holistic and individualised attention to nurture the body and mind. With a team composed of experienced professionals, we provide support through tactical analysis, as well as psychological, technical, strength, power and speed training. This comprehensive set of expertise allows us to approach a player's development from all angles, ensuring progress in every aspect of performance.
                  </p>
                  <p>
                    Our expert individualised training is tailored specifically to help you make adjustments for the unique needs and aspirations of your players. One of the key benefits of our agency is the continuity of care that we provide. Our team follows you from club to club, unlike the typical performance staff with whom you must start afresh with each move that you make in your career. This allows us to truly get to understand the ways that you work, evolving needs, and we can therefore suggest necessary adjustments to your training regimen in real-time. We can track progress closely, making small tweaks and corrections that can make a big difference in performance. Additionally, our team acts as a conduit to club staff, keeping the lines of communication open, sharing important information and collaborating to ensure training remains in harmony.
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </section>

        {/* ALLURE Section - Text Left, Image Right */}
        <section className="grid md:grid-cols-2">
          <div 
            className="relative p-8 md:p-16 flex items-center"
            style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="max-w-xl space-y-6">
              <div>
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-[--gold] mb-6">
                  {t('coaches.allure')}
                </h2>
                <p className="text-base md:text-xl text-white/90 leading-relaxed">
                  {t('coaches.allure_desc')}
                </p>
              </div>
              <Collapsible>
                <CollapsibleTrigger className="group flex items-center gap-3 px-4 py-2.5 bg-[--gold]/10 hover:bg-[--gold]/20 border border-[--gold]/30 rounded-md transition-all">
                  <span className="text-sm uppercase tracking-wider text-[--gold] font-medium">{t('coaches.learn_more')}</span>
                  <ChevronDown className="h-4 w-4 text-[--gold] transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-6 space-y-4 text-sm md:text-base text-white/80 leading-relaxed">
                  <p>
                    In a competitive market, the combination of greater finances, superior scouting and networking results in the greatest success on the pitch. Our work impacts all three to put you in the prime position to execute at a higher level than competitors. Ensure that you find, convince and sign the greatest and best-fitted talent each and every season; while simultaneously making wise decisions on the timing of departures for expert squad-building.
                  </p>
                  <p>
                    Our analysis extends across the entirety of professional football within Europe, allowing us to pick out players that club scouting networks can easily miss. Furthermore, our talent identification ensures prudent signings including undervalued players and key contributors to success on the pitch. We consider not only the raw ability and potential of players, but also their technical and tactical adaptability to your playstyle, as well as experience within related systems. This allows you to more easily coach the players in your team to reflect your vision on the pitch.
                  </p>
                  <p>
                    A major aspect to this is our broad network which spans across half of the globe with key decision-makers in clubs at all levels of the game. This combined with our reputation for recruiting great fits for our coaches allows us to tap into any market to ensure deals are completed.
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
          <div 
            className="relative min-h-[300px] md:min-h-[600px] bg-cover bg-center"
            style={{ backgroundImage: `url(${coachesSection2})` }}
          />
        </section>

        {/* PROGRESS Section - Image Left, Text Right */}
        <section className="grid md:grid-cols-2">
          <div 
            className="relative min-h-[300px] md:min-h-[600px] bg-cover bg-center order-2 md:order-1"
            style={{ backgroundImage: `url(${coachesSection})` }}
          />
          <div 
            className="relative p-8 md:p-16 flex items-center order-1 md:order-2"
            style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="max-w-xl space-y-6">
              <div>
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-[--gold] mb-6">
                  {t('coaches.progress')}
                </h2>
                <p className="text-base md:text-xl text-white/90 leading-relaxed">
                  {t('coaches.progress_desc')}
                </p>
              </div>
              <Collapsible>
                <CollapsibleTrigger className="group flex items-center gap-3 px-4 py-2.5 bg-[--gold]/10 hover:bg-[--gold]/20 border border-[--gold]/30 rounded-md transition-all">
                  <span className="text-sm uppercase tracking-wider text-[--gold] font-medium">{t('coaches.learn_more')}</span>
                  <ChevronDown className="h-4 w-4 text-[--gold] transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-6 space-y-4 text-sm md:text-base text-white/80 leading-relaxed">
                  <p>
                    Our role is then to negotiate the best possible contracts for our coaches. We recognise the sheer amount of dedication, hard work, and sacrifice that goes into a career, and we firmly believe in ensuring our coaches are fairly rewarded for their efforts.
                  </p>
                  <p>
                    Our team of agents and legal advisors understand the intricacies of the football industry and know how to advocate effectively for our clients. Our aim is to secure contracts that reflect not only your current performance, but also the value you bring to a team.
                  </p>
                  <p>
                    This is not limited to the financial aspect of the contract, though that is certainly important. We also consider a wide range of other factors that contribute to your overall career satisfaction and progression. This could include clauses around recruitment, freedom of movement, club obligations, bonuses, as well as key elements like image rights and sponsorship deals.
                  </p>
                  <p>
                    During negotiations, our team maintains constant communication with you, ensuring that you are always informed and involved in the process. We believe in transparency and will always explain the details of the proposed contract, including any potential risks and benefits.
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 md:py-16 bg-background">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
              {t('coaches.cta_title')}
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t('coaches.cta_subtitle')}
            </p>
            <Button asChild size="lg" className="btn-shine font-bebas uppercase tracking-wider">
              <Link to="/contact">{t('coaches.cta_button')}</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Coaches;
