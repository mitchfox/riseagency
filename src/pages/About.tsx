import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import bannerHero from "@/assets/banner-hero.jpg";

const About = () => {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO 
        title="About RISE - Premier Football Agency"
        description="Premier football agency specialising in player representation. Founded on integrity, dedication, and excellence."
        image="/og-preview-about.png"
        url="/about"
      />
      <Header />
      
      <main className="pt-32 md:pt-24 touch-pan-y overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bannerHero})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
          
          <div className="relative container mx-auto px-4 text-center z-10">
            <h1 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider text-white mb-6">
              {t('about.title')}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              {t('about.subtitle')}
            </p>
          </div>
        </section>

        {/* Our Story */}
        <section className="py-8 md:py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-8">
                {t('about.our_story', 'OUR')} <span className="text-primary">{t('about.story', 'STORY')}</span>
              </h2>
              <div className="space-y-6 text-lg text-muted-foreground">
                <p>{t('about.story_p1', 'We started as players. We understand the journey: the sacrifices, the setbacks, and what it takes to make it.')}</p>
                <p>{t('about.story_p2', 'We became coaches. We learned how to develop talent, how to identify potential, and how to build players who could compete at the highest level.')}</p>
                <p>{t('about.story_p3', "We developed performance teams around Premier League talents. We saw firsthand what separates good players from great ones, and it's not always what you'd expect.")}</p>
                <p className="text-foreground font-medium">{t('about.story_p4', 'We built this into the agency we run today. Every lesson, every insight, every connection. Now focused on helping the next generation realise their potential.')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Who We Are */}
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-8">
                {t('about.who_we_are')}
              </h2>
              <div className="space-y-6 text-lg text-muted-foreground">
                <p>{t('about.who_p1', 'RISE Football Agency is the best agency for developing talents and guiding them to the top. We are committed to nurturing talent and maximizing the potential of every athlete we work with.')}</p>
                <p>{t('about.who_p2', 'Founded on firsthand experience as players and coaches, RISE has established itself as a trusted partner for players at all stages of their careers. Our team combines deep development expertise with a genuine passion for the beautiful game.')}</p>
                <p>{t('about.who_p3', "We understand that success in football extends beyond what happens on the pitch. That's why we provide comprehensive support covering all aspects of a player's career, from performance optimisation and transfer dealings to personal development and career guidance.")}</p>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
                <div className="text-center p-4 border border-border/50 bg-card/30 rounded-lg">
                  <div className="text-4xl font-bebas text-primary">74</div>
                  <p className="text-xs font-bebas uppercase tracking-widest text-foreground/70">{t('about.stat_professionals', 'Professionals')}</p>
                </div>
                <div className="text-center p-4 border border-border/50 bg-card/30 rounded-lg">
                  <div className="text-4xl font-bebas text-primary">18</div>
                  <p className="text-xs font-bebas uppercase tracking-widest text-foreground/70">{t('about.stat_big5', 'Big 5 League Players')}</p>
                </div>
                <div className="text-center p-4 border border-border/50 bg-card/30 rounded-lg">
                  <div className="text-4xl font-bebas text-primary">10</div>
                  <p className="text-xs font-bebas uppercase tracking-widest text-foreground/70">{t('about.stat_national', 'National Team Players')}</p>
                </div>
                <div className="text-center p-4 border border-border/50 bg-card/30 rounded-lg">
                  <div className="text-4xl font-bebas text-primary">£100M+</div>
                  <p className="text-xs font-bebas uppercase tracking-widest text-foreground/70">{t('about.stat_transfers', 'Transfer Fees')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Mission */}
        <section className="py-6 md:py-8 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-8">
                {t('about.our_mission')}
              </h2>
              <div className="space-y-6 text-lg text-muted-foreground">
                <p>{t('about.mission_p1', 'Our mission is simple: to help footballers reach their full potential both on and off the field. We believe every player deserves expert guidance, unwavering support, and opportunities to showcase their abilities on the biggest stages.')}</p>
                <p>{t('about.mission_p2', "Through our extensive network of clubs, scouts, and industry professionals, we create pathways for players to achieve their dreams. We pride ourselves on building lasting relationships based on trust, transparency, and mutual respect.")}</p>
                <p className="text-base text-muted-foreground/90 pt-4">{t('about.mission_p3', "Our work supports player development within the governance structures that maintain football's integrity. We operate as responsible participants in the regulatory environment, ensuring our services complement and respect the frameworks set by football's governing bodies.")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* What We Do */}
        <section className="py-6 md:py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-12">
                {t('about.what_we_do')}
              </h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-2xl font-bebas uppercase tracking-wider text-primary">
                    {t('about.representation')}
                  </h3>
                  <p className="text-muted-foreground">
                    {t('about.representation_desc')}
                  </p>
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-bebas uppercase tracking-wider text-primary">
                    {t('about.career_dev')}
                  </h3>
                  <p className="text-muted-foreground">
                    {t('about.career_dev_desc')}
                  </p>
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-bebas uppercase tracking-wider text-primary">
                    {t('about.global_network')}
                  </h3>
                  <p className="text-muted-foreground">
                    {t('about.global_network_desc')}
                  </p>
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-bebas uppercase tracking-wider text-primary">
                    {t('about.personal_support')}
                  </h3>
                  <p className="text-muted-foreground">
                    {t('about.personal_support_desc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-6 md:py-8 bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-6">
              {t('about.cta_title')}
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t('about.cta_subtitle')}
            </p>
            <Button asChild size="lg" className="btn-shine font-bebas uppercase tracking-wider">
              <Link to="/contact">{t('about.cta_button')}</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
