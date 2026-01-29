import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { Newspaper, Calendar } from "lucide-react";
import bannerHero from "@/assets/banner-hero.jpg";

interface PressRelease {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  published_at: string;
}

const PressReleases = () => {
  const { t } = useLanguage();
  const [pressReleases, setPressReleases] = useState<PressRelease[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPressReleases = async () => {
      const { data, error } = await supabase
        .from("press_releases")
        .select("id, title, content, excerpt, published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (!error && data) {
        setPressReleases(data);
      }
      setLoading(false);
    };

    fetchPressReleases();
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO 
        title="Press Releases - RISE Football Agency"
        description="Official press releases and announcements from RISE Football Agency. Stay updated with the latest news about our players and agency developments."
        image="/og-preview-media.png"
        url="/press-releases"
      />
      <Header />
      
      <main className="pt-32 md:pt-24">
        {/* Hero Section */}
        <section className="relative h-[40vh] md:h-[50vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bannerHero})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
          
          <div className="relative container mx-auto px-4 text-center z-10">
            <h1 className="text-5xl md:text-8xl font-bebas uppercase tracking-wider text-white mb-4">
              {t('press.title', 'PRESS')} <span className="text-primary">{t('press.releases', 'RELEASES')}</span>
            </h1>
            <p className="text-lg md:text-2xl text-white/90 max-w-3xl mx-auto">
              {t('press.subtitle', 'Official announcements and updates from RISE Football Agency')}
            </p>
          </div>
        </section>

        {/* Press Releases Section */}
        <ScrollReveal>
          <section className="py-8 md:py-16">
            <div className="container mx-auto px-4 max-w-4xl">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border border-border rounded-lg p-4 md:p-6">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/4 mb-4" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ))}
                </div>
              ) : pressReleases.length === 0 ? (
                <div className="text-center py-16">
                  <Newspaper className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-bebas uppercase text-muted-foreground">
                    {t('press.no_releases', 'No press releases yet')}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('press.check_back', 'Check back soon for official announcements')}
                  </p>
                </div>
              ) : (
                <Accordion 
                  type="single" 
                  collapsible 
                  defaultValue={pressReleases[0]?.id}
                  className="space-y-4"
                >
                  {pressReleases.map((release) => (
                    <AccordionItem 
                      key={release.id} 
                      value={release.id}
                      className="border border-border rounded-lg px-4 md:px-6 bg-card/50 hover:bg-card/80 transition-colors"
                    >
                      <AccordionTrigger className="hover:no-underline py-4 md:py-6">
                        <div className="flex flex-col items-start text-left gap-1 md:gap-2">
                          <h3 className="text-lg md:text-2xl font-bebas uppercase tracking-wider text-foreground pr-4">
                            {release.title}
                          </h3>
                          <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                            {format(new Date(release.published_at), "MMMM d, yyyy")}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 md:pb-6">
                        {release.excerpt && (
                          <p className="text-sm md:text-base text-muted-foreground mb-4 italic border-l-2 border-primary pl-4">
                            {release.excerpt}
                          </p>
                        )}
                        <div 
                          className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-foreground/90"
                          dangerouslySetInnerHTML={{ __html: release.content }}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>
          </section>
        </ScrollReveal>
      </main>
      
      <Footer />
    </div>
  );
};

export default PressReleases;
