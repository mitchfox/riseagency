import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, TrendingUp, Users, Shield, Handshake } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import bannerHero from "@/assets/banner-hero.jpg";

const Business = () => {
  const { t } = useLanguage();
  
  return (
    <div className="min-h-screen bg-background" key="business-page">
      <SEO 
        title="Business Solutions - Commercial Football Partnerships | RISE Agency"
        description="Partner with RISE for strategic commercial partnerships, sponsorship opportunities, and business development in professional football."
        image="/og-preview-business.png"
        url="/business"
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
              {t('business.title', 'BUSINESS')}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              {t('business.subtitle', 'Strategic Commercial Partnerships in Football')}
            </p>
          </div>
        </section>

        {/* PARTNERSHIPS Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 text-primary">
                  <Handshake className="h-6 w-6" />
                  <span className="text-sm font-bebas uppercase tracking-widest">{t('business.commercial_growth', 'Commercial Growth')}</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
                  {t('business.partnerships', 'PARTNERSHIPS')}
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t('business.partnerships_desc', 'Connect your brand with elite football talent and unlock new markets through strategic partnerships with RISE and our roster of professional players.')}
                </p>
                <Collapsible>
                  <CollapsibleTrigger className="group flex items-center gap-3 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-md transition-all">
                    <span className="text-sm uppercase tracking-wider text-primary font-medium">{t('business.learn_more', 'Learn More')}</span>
                    <ChevronDown className="h-4 w-4 text-primary transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-6 space-y-4 text-base text-muted-foreground leading-relaxed">
                    <p>
                      Our commercial partnerships team works to align brands with the right talent, creating authentic connections that resonate with football audiences globally. From kit sponsorships to brand ambassadorships, we craft bespoke partnership opportunities.
                    </p>
                    <p>
                      We leverage our deep understanding of player profiles, audience demographics, and market trends to ensure maximum ROI for our commercial partners while maintaining the integrity and authenticity that modern consumers demand.
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              </div>
              <div className="bg-card/50 border border-border rounded-lg p-8 space-y-6">
                <h3 className="text-2xl font-bebas uppercase tracking-wider text-foreground">{t('business.partnership_benefits', 'Partnership Benefits')}</h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <span className="text-muted-foreground">Access to our exclusive roster of professional players</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <span className="text-muted-foreground">Bespoke campaign development and execution</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <span className="text-muted-foreground">Global reach across European football markets</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <span className="text-muted-foreground">Comprehensive analytics and performance tracking</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* SPONSORSHIP Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 bg-card/50 border border-border rounded-lg p-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-4 border border-border/50 rounded-lg">
                    <div className="text-4xl font-bebas text-primary mb-2">50+</div>
                    <div className="text-sm text-muted-foreground uppercase tracking-wide">{t('business.active_players', 'Active Players')}</div>
                  </div>
                  <div className="text-center p-4 border border-border/50 rounded-lg">
                    <div className="text-4xl font-bebas text-primary mb-2">12</div>
                    <div className="text-sm text-muted-foreground uppercase tracking-wide">{t('business.countries', 'Countries')}</div>
                  </div>
                  <div className="text-center p-4 border border-border/50 rounded-lg">
                    <div className="text-4xl font-bebas text-primary mb-2">5M+</div>
                    <div className="text-sm text-muted-foreground uppercase tracking-wide">{t('business.combined_reach', 'Combined Reach')}</div>
                  </div>
                  <div className="text-center p-4 border border-border/50 rounded-lg">
                    <div className="text-4xl font-bebas text-primary mb-2">100%</div>
                    <div className="text-sm text-muted-foreground uppercase tracking-wide">{t('business.commitment', 'Commitment')}</div>
                  </div>
                </div>
              </div>
              <div className="order-1 md:order-2 space-y-6">
                <div className="inline-flex items-center gap-2 text-primary">
                  <TrendingUp className="h-6 w-6" />
                  <span className="text-sm font-bebas uppercase tracking-widest">{t('business.brand_elevation', 'Brand Elevation')}</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
                  {t('business.sponsorship', 'SPONSORSHIP')}
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t('business.sponsorship_desc', 'Elevate your brand through strategic sponsorship opportunities with rising stars and established professionals across European football.')}
                </p>
                <Collapsible>
                  <CollapsibleTrigger className="group flex items-center gap-3 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-md transition-all">
                    <span className="text-sm uppercase tracking-wider text-primary font-medium">{t('business.learn_more', 'Learn More')}</span>
                    <ChevronDown className="h-4 w-4 text-primary transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-6 space-y-4 text-base text-muted-foreground leading-relaxed">
                    <p>
                      Our sponsorship packages are designed to maximize brand exposure while ensuring authentic representation. We work closely with sponsors to understand their objectives and match them with players whose values and audience align with their brand.
                    </p>
                    <p>
                      From boot deals to lifestyle partnerships, we negotiate and manage sponsorship agreements that benefit all parties while maintaining the player's focus on performance.
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </div>
        </section>

        {/* INVESTMENT Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 text-primary">
                  <Shield className="h-6 w-6" />
                  <span className="text-sm font-bebas uppercase tracking-widest">{t('business.secure_returns', 'Secure Returns')}</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
                  {t('business.investment', 'INVESTMENT')}
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t('business.investment_desc', 'Explore investment opportunities in player development, transfers, and football infrastructure with RISE as your trusted partner.')}
                </p>
                <Collapsible>
                  <CollapsibleTrigger className="group flex items-center gap-3 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-md transition-all">
                    <span className="text-sm uppercase tracking-wider text-primary font-medium">{t('business.learn_more', 'Learn More')}</span>
                    <ChevronDown className="h-4 w-4 text-primary transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-6 space-y-4 text-base text-muted-foreground leading-relaxed">
                    <p>
                      Football represents one of the most dynamic investment markets globally. Our expertise in talent identification, player development, and market valuation provides unique opportunities for investors seeking exposure to this growing asset class.
                    </p>
                    <p>
                      We offer structured investment opportunities in player economic rights, development programs, and strategic football ventures, all backed by our comprehensive due diligence and risk management frameworks.
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              </div>
              <div className="bg-card/50 border border-border rounded-lg p-8 space-y-6">
                <h3 className="text-2xl font-bebas uppercase tracking-wider text-foreground">{t('business.investment_areas', 'Investment Areas')}</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 border border-border/50 rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bebas uppercase tracking-wide text-foreground">{t('business.player_development', 'Player Development')}</h4>
                      <p className="text-sm text-muted-foreground">{t('business.fund_talent', 'Fund the next generation of talent')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 border border-border/50 rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bebas uppercase tracking-wide text-foreground">{t('business.transfer_rights', 'Transfer Rights')}</h4>
                      <p className="text-sm text-muted-foreground">{t('business.participate_transactions', 'Participate in player transactions')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 border border-border/50 rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bebas uppercase tracking-wide text-foreground">{t('business.infrastructure', 'Infrastructure')}</h4>
                      <p className="text-sm text-muted-foreground">{t('business.support_tech', 'Support football technology & facilities')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-6">
              {t('business.lets_build', "Let's Build Together")}
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t('business.cta_desc', 'Ready to explore commercial opportunities with RISE? Get in touch with our business development team.')}
            </p>
            <Button asChild size="lg" className="btn-shine font-bebas uppercase tracking-wider">
              <a href="mailto:jolon.levene@risefootballagency.com?subject=Business%20Inquiry">{t('business.contact_team', 'Contact Business Team')}</a>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Business;
