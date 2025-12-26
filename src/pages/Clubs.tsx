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
import clubsSection from "@/assets/clubs-section.png";
import clubsSection2 from "@/assets/clubs-section-2.png";
import clubsNetwork from "@/assets/clubs-network.jpg";

const Clubs = () => {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background" key="clubs-page">
      <SEO 
        title="For Clubs - Strategic Partnerships | RISE Agency"
        description="Work with RISE to strategise, recruit, and optimise your squad. Access our network of players and development programmes."
        image="/og-preview-clubs.png"
        url="/clubs"
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
              {t('clubs.title')}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              {t('clubs.subtitle')}
            </p>
          </div>
        </section>

        {/* STRATEGISE Section - Text Left, Image Right */}
        <section className="grid md:grid-cols-2">
          <div 
            className="relative p-8 md:p-16 flex items-center"
            style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="max-w-xl space-y-6">
              <div>
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-[--gold] mb-6">
                  {t('clubs.strategise')}
                </h2>
                <p className="text-base md:text-xl text-white/90 leading-relaxed">
                  {t('clubs.strategise_desc')}
                </p>
              </div>
              <Collapsible>
                <CollapsibleTrigger className="group flex items-center gap-3 px-4 py-2.5 bg-[--gold]/10 hover:bg-[--gold]/20 border border-[--gold]/30 rounded-md transition-all">
                  <span className="text-sm uppercase tracking-wider text-[--gold] font-medium">{t('clubs.learn_more')}</span>
                  <ChevronDown className="h-4 w-4 text-[--gold] transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-6 space-y-4 text-sm md:text-base text-white/80 leading-relaxed">
                  <p>{t('clubs.strategise_p1', 'In order to beat the competition, effective and innovative strategies must be employed. We work to build winning sides both in the short term and long term through our bespoke approach. Whether a board of directors or heading up technical staff, our consultation provides essential insights to gain an advantage for your team. The major advantage we can guarantee to our clients is national exclusivity, providing our undivided time and resources, resulting in greater domestic success due to the prioritisation of your club over all others.')}</p>
                  <p>{t('clubs.strategise_p2', 'At the heart of our strategy-building is an individualised approach. Due diligence is put into fully understanding the way an organisation thinks about the game, the culture it aims to build and what is most important to the key decision-makers. This allows us to create and provide the tools for a completely unique and tailored strategy for success.')}</p>
                  <p>{t('clubs.strategise_p3', 'Our extensive knowledge of what it takes to build a winning team and how to adapt the underlying protocols that lead to these, allows us to adapt approaches to the distinct needs of the club. These prove especially impactful in combination with our broad application of reasoning to get to the heart of any internal or external issue. Unlike the average organisation that remains reactive to changes in the footballing landscape, our team also works to stay ahead of the curve on key developments to avoid future pitfalls and be first to potential opportunities.')}</p>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
          <div 
            className="relative min-h-[300px] md:min-h-[600px] bg-cover bg-center"
            style={{ backgroundImage: `url(${clubsSection})` }}
          />
        </section>

        {/* RECRUIT Section - Image Left, Text Right */}
        <section className="grid md:grid-cols-2">
          <div 
            className="relative min-h-[300px] md:min-h-[600px] bg-cover bg-center order-2 md:order-1"
            style={{ backgroundImage: `url(${clubsNetwork})` }}
          />
          <div 
            className="relative p-8 md:p-16 flex items-center order-1 md:order-2"
            style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="max-w-xl space-y-6">
              <div>
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-[--gold] mb-6">
                  {t('clubs.recruit')}
                </h2>
                <p className="text-base md:text-xl text-white/90 leading-relaxed">
                  {t('clubs.recruit_desc')}
                </p>
              </div>
              <Collapsible>
                <CollapsibleTrigger className="group flex items-center gap-3 px-4 py-2.5 bg-[--gold]/10 hover:bg-[--gold]/20 border border-[--gold]/30 rounded-md transition-all">
                  <span className="text-sm uppercase tracking-wider text-[--gold] font-medium">{t('clubs.learn_more')}</span>
                  <ChevronDown className="h-4 w-4 text-[--gold] transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-6 space-y-4 text-sm md:text-base text-white/80 leading-relaxed">
                  <p>{t('clubs.recruit_p1', 'In a competitive market, the combination of greater finances, superior scouting and networking results in the greatest success on the pitch. Our work impacts all three to put your club in the prime position to execute at a higher level than all its competitors. Ensure that you find, convince and sign the greatest and best-fitted talent each and every season; while simultaneously making wise decisions on the timing of departures for expert squad-building.')}</p>
                  <p>{t('clubs.recruit_p2', 'Our analysis extends across the entirety of professional football within Europe, allowing us to pick up on players that club scouting networks can easily miss. Furthermore, our talent identification ensures prudent signings including undervalued players and key contributors to success on the pitch. We consider not only the raw ability and potential of players, but also their technical and tactical adaptability to playstyles, as well as experience within related systems.')}</p>
                  <p>{t('clubs.recruit_p3', 'A major aspect to this is our broad network which spans across half of the globe with key decision-makers in clubs at all levels of the game. This combined with our reputation for recruiting great fits for our clients allows us to tap into any market to ensure deals are completed.')}</p>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </section>

        {/* OPTIMISE Section - Text Left, Image Right */}
        <section className="grid md:grid-cols-2">
          <div 
            className="relative p-8 md:p-16 flex items-center"
            style={{ backgroundImage: `url(${blackMarble})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="max-w-xl space-y-6">
              <div>
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-[--gold] mb-6">
                  {t('clubs.optimise')}
                </h2>
                <p className="text-base md:text-xl text-white/90 leading-relaxed">
                  {t('clubs.optimise_desc')}
                </p>
              </div>
              <Collapsible>
                <CollapsibleTrigger className="group flex items-center gap-3 px-4 py-2.5 bg-[--gold]/10 hover:bg-[--gold]/20 border border-[--gold]/30 rounded-md transition-all">
                  <span className="text-sm uppercase tracking-wider text-[--gold] font-medium">{t('clubs.learn_more')}</span>
                  <ChevronDown className="h-4 w-4 text-[--gold] transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-6 space-y-4 text-sm md:text-base text-white/80 leading-relaxed">
                  <p>{t('clubs.optimise_p1', 'Where we stand apart from other agencies and help to elevate your side is in our unique expertise in the domain of performance. With a vast experience developing players and support staff, our consultation provides a platform to develop your personnel and improve results on the pitch.')}</p>
                  <p>{t('clubs.optimise_p2', "As part of our comprehensive approach to player development, we do not offer generic advice; instead, we provide analysis that is specific to the club's needs. This means understanding the parameters that allow for success at the current level while supporting the playing to strengths of individuals and overcoming any potential weaknesses.")}</p>
                  <p>{t('clubs.optimise_p3', 'In terms of coach development, we work to achieve vertical and horizontal alignment of support staff and break down the silo effect which so easily sets in at clubs. To do this, we work actively with coaches and management to offer a unique perspective and provide key insights with timeliness.')}</p>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
          <div 
            className="relative min-h-[300px] md:min-h-[600px] bg-cover bg-center"
            style={{ backgroundImage: `url(${clubsSection2})` }}
          />
        </section>

        {/* CTA Section */}
        <section className="py-6 md:py-8 bg-background">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
              {t('clubs.cta_title')}
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t('clubs.cta_subtitle')}
            </p>
            <Button asChild size="lg" className="btn-shine font-bebas uppercase tracking-wider">
              <Link to="/contact">{t('clubs.cta_button')}</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Clubs;
