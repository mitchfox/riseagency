import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import bannerHero from "@/assets/banner-hero.jpg";
import blackMarble from "@/assets/black-marble-smudged.png";
import celebration1 from "@/assets/gallery/celebration-1.jpg";
import matchAction2 from "@/assets/gallery/match-action-2.jpg";
import matchAction3 from "@/assets/gallery/match-action-3.jpg";
import trainingAction from "@/assets/gallery/training-action.jpg";

const Performance = () => {
  const { t } = useLanguage();
  
  return (
    <div className="min-h-screen bg-background overflow-x-hidden" key="players-page">
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
            <p className="text-sm sm:text-base md:text-lg uppercase tracking-widest text-primary mb-2 md:mb-4">
              {t('learnmore.hero_subtitle', 'Player Development & Career Support')}
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bebas uppercase tracking-wider text-white mb-2 md:mb-4">
              {t('learnmore.hero_title', 'REALISE POTENTIAL')}
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 max-w-3xl mx-auto px-4">
              {t('learnmore.hero_description', 'We develop our players on and off the pitch because better players create better careers')}
            </p>
          </div>
        </section>

        {/* ATTRACT Section - Text Left, Image Right */}
        <section className="grid md:grid-cols-2">
          <div 
            className="relative p-6 sm:p-8 md:p-12 lg:p-16 flex items-center"
            style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="max-w-xl space-y-6">
              <div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bebas uppercase tracking-wider text-[--gold] mb-4 md:mb-6">
                  {t('learnmore.attract_title', 'Attract')}
                </h2>
                <p className="text-base sm:text-lg md:text-xl text-white/90 leading-relaxed">
                  {t('learnmore.attract_description', 'Through our vast scouting network, we maximise visibility across the footballing world to ensure player interest and demand.')}
                </p>
              </div>
              <Collapsible>
                <CollapsibleTrigger className="group flex items-center gap-3 px-4 py-2.5 bg-[--gold]/10 hover:bg-[--gold]/20 border border-[--gold]/30 rounded-md transition-all">
                  <span className="text-sm uppercase tracking-wider text-[--gold] font-medium">{t('common.learn_more', 'Learn More')}</span>
                  <ChevronDown className="h-4 w-4 text-[--gold] transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-6 space-y-4 text-sm md:text-base text-white/80 leading-relaxed">
                  <p>{t('learnmore.attract_p1', 'One of the significant advantages of partnering with our agency is the breadth and depth of our connections within the industry. Over the years, we have cultivated a wide scouting network that spans across clubs, leagues, and continents.')}</p>
                  <p>{t('learnmore.attract_p2', 'Our network includes technical directors, recruitment analysts, coaches, and other decision-makers across professional football. These are the individuals who identify and recruit talent, making decisions that can shape a player\'s career trajectory. By maintaining close ties with these professionals, we can keep our players in the forefront of their minds, promoting your skills, potential, and performance throughout each season.')}</p>
                  <p>{t('learnmore.attract_p3', 'This continuous promotion is not just about putting your name out there; it is about strategically aligning your strengths and abilities with the needs and goals of potential suitors. We work to understand the specific requirements and ambitions of different clubs, positioning our players as the solution to their needs. This might involve highlighting certain aspects of your performance, demonstrating your ability to fit within a particular system or style of play, or showcasing your potential for growth and development.')}</p>
                  <p>{t('learnmore.attract_p4', 'It is not only about marketing you to potential suitors; it is also about finding the right fit for you, clubs and roles where you can thrive, both professionally and personally. We consider factors such as the club\'s culture, the coaching staff\'s philosophy, the team\'s style of play, and even the location and lifestyle.')}</p>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
          <div 
            className="relative min-h-[400px] md:min-h-[600px] bg-cover bg-center"
            style={{ backgroundImage: `url(${celebration1})` }}
          />
        </section>

        {/* SIGN Section - Image Left, Text Right */}
        <section className="grid md:grid-cols-2">
          <div 
            className="relative min-h-[400px] md:min-h-[600px] bg-cover bg-center order-2 md:order-1"
            style={{ backgroundImage: `url(${matchAction2})` }}
          />
          <div 
            className="relative p-6 sm:p-8 md:p-12 lg:p-16 flex items-center order-1 md:order-2"
            style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="max-w-xl space-y-6">
              <div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bebas uppercase tracking-wider text-[--gold] mb-4 md:mb-6">
                  {t('learnmore.sign_title', 'Sign')}
                </h2>
                <p className="text-base sm:text-lg md:text-xl text-white/90 leading-relaxed">
                  {t('learnmore.sign_description', 'Sign the dotted line after our team of intermediaries negotiate new and improved contracts. Retain confidence knowing your career opportunities are being created and finalised.')}
                </p>
              </div>
              <Collapsible>
                <CollapsibleTrigger className="group flex items-center gap-3 px-4 py-2.5 bg-[--gold]/10 hover:bg-[--gold]/20 border border-[--gold]/30 rounded-md transition-all">
                  <span className="text-sm uppercase tracking-wider text-[--gold] font-medium">{t('common.learn_more', 'Learn More')}</span>
                  <ChevronDown className="h-4 w-4 text-[--gold] transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-6 space-y-4 text-sm md:text-base text-white/80 leading-relaxed">
                  <p>{t('learnmore.sign_p1', 'Our role is then to negotiate the best possible contracts for our players. We recognise the sheer amount of dedication, hard work, and sacrifice that goes into a career, and we firmly believe in ensuring our players are fairly rewarded for their efforts.')}</p>
                  <p>{t('learnmore.sign_p2', 'Our team of agents and legal advisors understand the intricacies of the football industry and know how to advocate effectively for our clients. Our aim is to secure contracts that reflect not only your current performance, but also your potential, and the value you bring to the team.')}</p>
                  <p>{t('learnmore.sign_p3', 'This is not limited to the financial aspect of the contract, though that is certainly important. We also consider a wide range of other factors that contribute to your overall career satisfaction and progression. This could include clauses around playing time, position, transfer possibilities, injury provisions, as well as key elements like image rights, sponsorship deals, and post-career opportunities.')}</p>
                  <p>{t('learnmore.sign_p4', 'During negotiations, our team maintains constant communication with you, ensuring that you are always informed and involved in the process. We believe in transparency and will always explain the details of the proposed contract, including any potential risks and benefits.')}</p>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </section>

        {/* DEVELOP Section - Text Left, Image Right */}
        <section className="grid md:grid-cols-2">
          <div 
            className="relative p-6 sm:p-8 md:p-12 lg:p-16 flex items-center"
            style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="max-w-xl space-y-6">
              <div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bebas uppercase tracking-wider text-[--gold] mb-4 md:mb-6">
                  {t('learnmore.develop_title', 'Develop')}
                </h2>
                <p className="text-base sm:text-lg md:text-xl text-white/90 leading-relaxed">
                  {t('learnmore.develop_description', 'Receive expert training to maximise your physical capacity for performance. Push the limits of your body and mind to truly know how far you can go in your career.')}
                </p>
              </div>
              <Collapsible>
                <CollapsibleTrigger className="group flex items-center gap-3 px-4 py-2.5 bg-[--gold]/10 hover:bg-[--gold]/20 border border-[--gold]/30 rounded-md transition-all">
                  <span className="text-sm uppercase tracking-wider text-[--gold] font-medium">{t('common.learn_more', 'Learn More')}</span>
                  <ChevronDown className="h-4 w-4 text-[--gold] transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-6 space-y-4 text-sm md:text-base text-white/80 leading-relaxed">
                  <p>{t('learnmore.develop_p1', 'We believe that pushing the limits of your body and mind are key to discovering how far you can truly go in your career. Through our expert training, you can realise your true potential, resting assured that no stone will be left unturned in your journey to becoming the best you can possibly be.')}</p>
                  <p>{t('learnmore.develop_p2', 'Our agency provides the best possible support to help you excel in your career. We understand that maximising potential requires both holistic and individualised attention to nurture the body and mind. With a team composed of experienced professionals, we provide support through tactical analysis, as well as psychological, technical, strength, power and speed training. This comprehensive set of expertise allows us to approach a player\'s development from all angles, ensuring progress in every aspect of performance.')}</p>
                  <p>{t('learnmore.develop_p3', 'Unlike club training that aims to cater to the average needs of many players, our expert individualised training is tailored specifically to the unique needs and aspirations of our players directly. One of the key benefits of our agency is the continuity of care that we provide. Our team remains in place throughout the entire career, unlike club staff who see players coming and going every season. This allows us to truly get to know our players, understand evolving needs, and make necessary adjustments to training in real-time. We can track progress closely, making small tweaks and corrections that can make a big difference in performance. Additionally, our team acts as a conduit to club staff, keeping the lines of communication open, sharing important information and collaborating to ensure training remains in harmony.')}</p>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
          <div 
            className="relative min-h-[400px] md:min-h-[600px] bg-cover bg-center"
            style={{ backgroundImage: `url(${matchAction3})` }}
          />
        </section>

        {/* PERFORM Section - Image Left, Text Right */}
        <section className="grid md:grid-cols-2">
          <div 
            className="relative min-h-[400px] md:min-h-[600px] bg-cover bg-center order-2 md:order-1"
            style={{ backgroundImage: `url(${trainingAction})` }}
          />
          <div 
            className="relative p-6 sm:p-8 md:p-12 lg:p-16 flex items-center order-1 md:order-2"
            style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="max-w-xl space-y-6">
              <div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bebas uppercase tracking-wider text-[--gold] mb-4 md:mb-6">
                  {t('learnmore.perform_title', 'Perform')}
                </h2>
                <p className="text-base sm:text-lg md:text-xl text-white/90 leading-relaxed">
                  {t('learnmore.perform_description', 'Play your best on a consistent basis through smart preparation, including psychological training sessions and pre-match analysis specific to your individual matchups.')}
                </p>
              </div>
              <Collapsible>
                <CollapsibleTrigger className="group flex items-center gap-3 px-4 py-2.5 bg-[--gold]/10 hover:bg-[--gold]/20 border border-[--gold]/30 rounded-md transition-all">
                  <span className="text-sm uppercase tracking-wider text-[--gold] font-medium">{t('common.learn_more', 'Learn More')}</span>
                  <ChevronDown className="h-4 w-4 text-[--gold] transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-6 space-y-4 text-sm md:text-base text-white/80 leading-relaxed">
                  <p>{t('learnmore.perform_p1', 'To rise to the occasion, we must fully embrace the ethos that every day matters. We are not a standard fair-weather agent who only shows up during transfer windows; instead, we are there for the daily grind, supporting you every step of the way. We understand that success in your career is built on consistency and proper preparation.')}</p>
                  <p>{t('learnmore.perform_p2', 'As part of our comprehensive approach to player development, we offer individualised pre-match analysis. The better prepared you are for game day, the more likely you are to excel on the pitch. We do not offer generic advice; instead, we provide analysis that is specific to your unique abilities. This means understanding the opposition and main matchups you will face, but framing it in a way that plays to your strengths and covers any potential weaknesses.')}</p>
                  <p>{t('learnmore.perform_p3', 'Beyond the physical and tactical preparations, we also understand the importance of mental readiness. Our mental skill and will sessions work to get you into the right frame of mind before match day.')}</p>
                  <p>{t('learnmore.perform_p4', 'Daily lifestyle work plays a crucial role in your preparation too. Good nutrition is the fuel that powers your performance, and we provide advice on how to optimise your diet to support your training and recovery. We also provide guidance on recovery strategies, recognising that the time spent off the pitch is just as important as the time on it.')}</p>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </section>

        {/* Additional Services Grid */}
        <section className="py-20 md:py-28 bg-gradient-to-b from-background via-muted/20 to-background">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {/* STAKEHOLDER MANAGEMENT */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[--gold]/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-8 rounded-lg border border-border/50 bg-card hover:border-[--gold]/30 transition-all duration-300 h-full">
                  <h3 className="text-2xl md:text-3xl lg:text-4xl font-bebas uppercase tracking-wider text-[--gold] mb-4">
                    {t('learnmore.stakeholder_title', 'Stakeholder Management')}
                  </h3>
                  <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                    {t('learnmore.stakeholder_description', 'Career management through contract negotiations, loans and transfers')}
                  </p>
                </div>
              </div>

              {/* BRAND */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[--gold]/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-8 rounded-lg border border-border/50 bg-card hover:border-[--gold]/30 transition-all duration-300 h-full">
                  <h3 className="text-2xl md:text-3xl lg:text-4xl font-bebas uppercase tracking-wider text-[--gold] mb-2">
                    {t('learnmore.brand_title', 'Brand')}
                  </h3>
                  <p className="text-lg font-semibold text-foreground mb-3">{t('learnmore.brand_subtitle', 'Image')}</p>
                  <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                    {t('learnmore.brand_description', 'Development of your brand image and management of public relations')}
                  </p>
                </div>
              </div>

              {/* COMMERCIAL INTERESTS */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[--gold]/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-8 rounded-lg border border-border/50 bg-card hover:border-[--gold]/30 transition-all duration-300 h-full">
                  <h3 className="text-2xl md:text-3xl lg:text-4xl font-bebas uppercase tracking-wider text-[--gold] mb-4">
                    {t('learnmore.commercial_title', 'Commercial Interests')}
                  </h3>
                  <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                    {t('learnmore.commercial_description', 'Creating relationships with major brands and negotiating the best sponsorship opportunities')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
              {t('learnmore.cta_title', 'Ready to Elevate Your Game?')}
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t('learnmore.cta_description', 'Join RISE and experience comprehensive support designed to maximize your potential')}
            </p>
            <Button asChild size="lg" className="btn-shine font-bebas uppercase tracking-wider">
              <Link to="/contact">{t('common.get_started', 'Get Started')}</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Performance;