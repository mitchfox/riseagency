import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { WorkWithUsDialog } from "@/components/WorkWithUsDialog";
import { HoverText } from "@/components/HoverText";
import { useLanguage } from "@/contexts/LanguageContext";

const RealisePotential = () => {
  const { t } = useLanguage();
  const journeySteps = [
    {
      number: "01",
      titleKey: "realise.step1_title",
      subtitleKey: "realise.step1_subtitle",
      descriptionKey: "realise.step1_description",
      itemKeys: ["realise.step1_item1", "realise.step1_item2", "realise.step1_item3"],
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      number: "02",
      titleKey: "realise.step2_title",
      subtitleKey: "realise.step2_subtitle",
      descriptionKey: "realise.step2_description",
      itemKeys: ["realise.step2_item1", "realise.step2_item2", "realise.step2_item3"],
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      number: "03",
      titleKey: "realise.step3_title",
      subtitleKey: "realise.step3_subtitle",
      descriptionKey: "realise.step3_description",
      itemKeys: ["realise.step3_item1", "realise.step3_item2", "realise.step3_item3"],
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      number: "04",
      titleKey: "realise.step4_title",
      subtitleKey: "realise.step4_subtitle",
      descriptionKey: "realise.step4_description",
      itemKeys: ["realise.step4_item1", "realise.step4_item2", "realise.step4_item3"],
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      number: "05",
      titleKey: "realise.step5_title",
      subtitleKey: "realise.step5_subtitle",
      descriptionKey: "realise.step5_description",
      itemKeys: ["realise.step5_item1", "realise.step5_item2", "realise.step5_item3"],
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <SEO
        title="Realise Potential - RISE Football Agency"
        description="Discover how RISE optimizes player development through a comprehensive match week approach - from training to highlights."
        url="/realise-potential"
      />
      <Header />
      <div className="bg-background min-h-screen">
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="container mx-auto max-w-6xl relative z-10">
            <div className="text-center space-y-6">
              <span className="inline-block text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2">
                {t('realise.badge')}
              </span>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bebas uppercase tracking-wider leading-none">
                <span className="text-foreground">{t('realise.title_line1')}</span>
                <br />
                <span className="text-primary">{t('realise.title_line2')}</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light">
                {t('realise.subtitle')}
              </p>
            </div>
          </div>
        </section>

        {/* Journey Grid */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {journeySteps.map((step, index) => (
                <div
                  key={step.number}
                  className={`group relative ${index === 4 ? 'md:col-span-2 lg:col-span-1' : ''}`}
                >
                  <div className="h-full p-8 border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-500 hover:bg-primary/5">
                    {/* Number */}
                    <div className="absolute top-6 right-6 text-7xl font-bebas text-primary/10 group-hover:text-primary/20 transition-colors">
                      {step.number}
                    </div>

                    {/* Icon */}
                    <div className="text-primary mb-6 opacity-80 group-hover:opacity-100 transition-opacity">
                      {step.icon}
                    </div>

                    {/* Content */}
                    <div className="relative z-10 space-y-4">
                      <div>
                        <h3 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider text-foreground">
                          {t(step.titleKey)}
                        </h3>
                        <p className="text-sm text-primary font-medium uppercase tracking-wider">
                          {t(step.subtitleKey)}
                        </p>
                      </div>

                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {t(step.descriptionKey)}
                      </p>

                      <ul className="space-y-2 pt-2">
                        {step.itemKeys.map((itemKey, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="w-1 h-1 bg-primary rounded-full" />
                            {t(itemKey)}
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

        {/* Summary Statement */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <div className="border border-primary/20 bg-primary/5 p-12">
              <p className="text-xl md:text-2xl text-foreground leading-relaxed font-light">
                {t('realise.summary')}
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-4xl text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider text-foreground">
              {t('realise.cta_title')}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t('realise.cta_subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <WorkWithUsDialog>
                <Button size="lg" className="btn-shine text-lg font-bebas uppercase tracking-wider px-10 py-6">
                  <HoverText text={t('realise.work_with_us')} />
                </Button>
              </WorkWithUsDialog>
              <Button asChild variant="outline" size="lg" className="text-lg font-bebas uppercase tracking-wider px-10 py-6">
                <Link to="/"><HoverText text={t('realise.back_to_home')} /></Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
};

export default RealisePotential;
