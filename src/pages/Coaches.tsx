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
                  <p>{t('coaches.results_p1')}</p>
                  <p>{t('coaches.results_p2')}</p>
                  <p>{t('coaches.results_p3')}</p>
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
                  <p>{t('coaches.foster_p1')}</p>
                  <p>{t('coaches.foster_p2')}</p>
                  <p>{t('coaches.foster_p3')}</p>
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
                  <p>{t('coaches.allure_p1')}</p>
                  <p>{t('coaches.allure_p2')}</p>
                  <p>{t('coaches.allure_p3')}</p>
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
                  <p>{t('coaches.progress_p1')}</p>
                  <p>{t('coaches.progress_p2')}</p>
                  <p>{t('coaches.progress_p3')}</p>
                  <p>{t('coaches.progress_p4')}</p>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-6 md:py-8 bg-background">
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
