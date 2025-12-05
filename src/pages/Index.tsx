import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { WorkWithUsDialog } from "@/components/WorkWithUsDialog";
import { IntroModal } from "@/components/IntroModal";
import { SEO } from "@/components/SEO";
import { VideoPortfolio } from "@/components/VideoPortfolio";
import ScoutingNetworkMap from "@/components/ScoutingNetworkMap";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HoverText } from "@/components/HoverText";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslatedNews } from "@/hooks/useTranslateContent";
import riseStarIcon from "@/assets/rise-star-icon.png";
import playersNetwork from "@/assets/players-network.jpg";
import clubsNetwork from "@/assets/clubs-network.jpg";
import scoutsNetwork from "@/assets/scouts-network.jpg";
import coachesNetwork from "@/assets/coaches-network.jpg";

interface NewsArticle {
  id: string;
  title: string;
  excerpt: string | null;
  image_url: string | null;
  created_at: string;
}

const Index = () => {
  const { t } = useLanguage();
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [insideAccessArticles, setInsideAccessArticles] = useState<NewsArticle[]>([]);
  
  // Auto-translate news articles based on current language
  const { translatedArticles: translatedNews } = useTranslatedNews(newsArticles);
  const { translatedArticles: translatedInsideAccess } = useTranslatedNews(insideAccessArticles);

  useEffect(() => {
    // Fetch regular news articles
    const fetchNews = async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, excerpt, image_url, created_at')
        .eq('published', true)
        .eq('category', 'PLAYER NEWS')
        .order('created_at', { ascending: false })
        .limit(3);

      if (!error && data) {
        setNewsArticles(data);
      }
    };

    // Fetch INSIDE:ACCESS articles
    const fetchInsideAccess = async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, excerpt, image_url, created_at')
        .eq('published', true)
        .eq('category', 'INSIDE:ACCESS')
        .order('created_at', { ascending: false })
        .limit(6);

      if (!error && data) {
        setInsideAccessArticles(data);
      }
    };

    fetchNews();
    fetchInsideAccess();
  }, []);

  return (
    <>
      <SEO 
        title="RISE Football Agency - Elite Football Representation & Performance"
        description="RISE Football Agency scouts across professional football in Europe. We have guided many Premier League players to success through their development journey with expert representation and performance optimization."
        image="/og-preview-home.png"
        url="/"
      />
      <Header />
      <IntroModal open={showIntroModal} onOpenChange={setShowIntroModal} />
      <div className="bg-background min-h-screen relative z-10">
        {/* Hero Section */}
        <section className="pt-28 md:pt-32 pb-12 md:pb-20 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background/80"></div>
          <div className="container mx-auto max-w-7xl relative z-10">
            <div className="text-center space-y-6">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bebas uppercase tracking-wider">
                <span className="text-foreground">{t("home.hero_title_1", "REALISE")} </span>
                <span className="text-primary">{t("home.hero_title_2", "POTENTIAL")}</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto font-light tracking-wide italic">
                {t("home.hero_subtitle", "Elite Football Representation & Performance Optimisation")}
              </p>
            </div>

          </div>
        </section>


        {/* INSIDE:ACCESS Section */}
        {translatedInsideAccess.length > 0 && (
          <section className="py-12 md:py-16 px-4 bg-background/80 backdrop-blur-sm">
            <div className="container mx-auto max-w-7xl w-full">
              <div className="text-center mb-6 space-y-3">
              <div className="inline-block">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                  {t("home.exclusive", "Exclusive")}
                </span>
              </div>
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
                  INSIDE<span className="text-primary">:ACCESS</span>
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {translatedInsideAccess.map((article, index) => (
                  article.image_url && (
                    <Link
                      key={article.id}
                      to={`/news/${article.id}`}
                      className={`group relative aspect-[4/5] overflow-hidden rounded-lg ${
                        index >= 2 ? 'hidden md:block' : ''
                      }`}
                    >
                      <img 
                        src={article.image_url} 
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </Link>
                  )
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Club Network Map Section */}
        <section className="py-12 md:py-16 px-4 bg-background/90 backdrop-blur-sm">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-8 space-y-3">
              <div className="inline-block">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                  {t("home.eyes_across_game", "Eyes Across The Game")}
                </span>
              </div>
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
                {t("home.scouting", "SCOUTING")} <span className="text-primary">{t("home.network", "NETWORK")}</span>
              </h2>
            </div>
            <ScoutingNetworkMap />

            {/* Scouting Philosophy Points */}
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="p-6 border border-border/50 bg-card/30">
                <div className="flex items-start gap-4">
                  <span className="text-4xl font-bebas text-primary/30">01</span>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bebas uppercase tracking-wider text-foreground">
                      {t("home.scouting_point_1_title", "Deep European Network")}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t("home.scouting_point_1_desc", "We have built an extensive scouting network across Europe, with eyes at every level of the professional game.")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border border-border/50 bg-card/30">
                <div className="flex items-start gap-4">
                  <span className="text-4xl font-bebas text-primary/30">02</span>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bebas uppercase tracking-wider text-foreground">
                      {t("home.scouting_point_2_title", "Future-Focused Scouting")}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t("home.scouting_point_2_desc", "Novel scouting based on qualities that level up through the game—not just what works now, but what scales with a player's career.")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border border-border/50 bg-card/30">
                <div className="flex items-start gap-4">
                  <span className="text-4xl font-bebas text-primary/30">03</span>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bebas uppercase tracking-wider text-foreground">
                      {t("home.scouting_point_3_title", "Complete Player Knowledge")}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t("home.scouting_point_3_desc", "For any professional or academy player, we intend to know not just who they are—but how they play, what makes them tick, and what qualities they have that level up.")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section - moved above News */}
        <section className="py-12 md:py-16 px-4 bg-background/85 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-primary/10"></div>
          <div className="container mx-auto max-w-4xl text-center space-y-8 relative z-10">
            <div className="space-y-4">
              <div className="inline-block">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                  {t("home.rise_with_us", "RISE WITH US")}
                </span>
              </div>
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-bebas uppercase tracking-wider text-foreground leading-tight">
                {t("home.take_the", "Take The")} <span className="text-primary">{t("home.first_step", "1st Step")}</span>
              </h2>
              <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                {t("home.cta_description", "Reach out to one of our representatives for a direct 1:1 conversation about yourself, or a player under your care.")}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-4">
              <WorkWithUsDialog>
                <Button 
                  size="lg" 
                  className="btn-shine text-xl font-bebas uppercase tracking-wider px-12 py-7 hover:scale-105 transition-transform shadow-xl"
                >
                  <HoverText text={t("home.work_with_us", "Work With Us")} />
                </Button>
              </WorkWithUsDialog>
              <Button 
                asChild
                variant="outline"
                size="lg" 
                className="text-xl font-bebas uppercase tracking-wider px-12 py-7 hover:scale-105 transition-transform"
              >
                <a href="mailto:jolon.levene@risefootballagency.com?subject=Portfolio%20Request">
                  <HoverText text={t("home.request_portfolio", "Request Our Portfolio")} />
                </a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground italic">
              {t("home.portfolio_description", "Learn more about our portfolio, including how we work and with whom we work.")}
            </p>
          </div>
        </section>

        {/* News Section */}
        <section className="py-12 md:py-16 px-4 bg-background/90 backdrop-blur-sm">
          <div className="container mx-auto max-w-7xl w-full">
            <div className="text-center mb-8 space-y-3">
              <div className="inline-block">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                  {t("home.latest_updates", "Latest Updates")}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
                {t("home.news", "News")}
              </h2>
              <Link to="/news">
                <Button 
                  variant="outline"
                  className="font-bebas uppercase tracking-wider border-primary/30 text-foreground hover:bg-primary/10"
                >
                  <HoverText text={t("home.all_news", "All News →")} />
                </Button>
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {translatedNews.map((article) => (
                <Link
                  key={article.id}
                  to={`/news/${article.id}`}
                  className="group relative aspect-[16/10] overflow-hidden rounded-lg"
                >
                  {article.image_url && (
                    <>
                      <img 
                        src={article.image_url} 
                        alt={article.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
                    </>
                  )}
                  
                  {/* Date/Time */}
                  <div className="absolute top-4 left-4 flex items-center gap-2 text-white/80 text-xs font-bebas uppercase tracking-wider">
                    <span className="text-primary">▶</span>
                    <span>
                      {new Date(article.created_at).toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric' 
                      })} {new Date(article.created_at).toLocaleTimeString('en-GB', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>

                  {/* Title - moves up on hover */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 transition-all duration-300 group-hover:-translate-y-16">
                    <h3 className="text-xl md:text-2xl font-bebas uppercase text-white leading-tight">
                      {article.title}
                    </h3>
                  </div>

                  {/* Read Article button - fades in where title was */}
                  <div className="absolute bottom-6 left-6 opacity-0 group-hover:opacity-100 transition-all duration-300 delay-100">
                    <button className="px-4 py-2 text-sm font-bebas uppercase tracking-wider text-white bg-white/10 backdrop-blur-sm border border-white/30 rounded hover:bg-white/20 transition-colors">
                      {t("home.read_article", "Read Article")}
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* WATCH NOW Section */}
        <section className="py-12 md:py-16 px-4 bg-background/95 backdrop-blur-sm">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-6 space-y-3">
              <div className="inline-block">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                  {t("home.our_work", "OUR WORK")}
                </span>
              </div>
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
                {t("home.watch", "WATCH")} <span className="text-primary">{t("home.now", "NOW")}</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Video 1 */}
              <div className="relative aspect-video rounded-xl overflow-hidden border border-border shadow-lg">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube-nocookie.com/embed/pWH2cdmzwVg?rel=0"
                  title="RISE Football Video 1"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute inset-0 w-full h-full"
                />
              </div>

              {/* Video 2 - Hidden on mobile */}
              <div className="relative aspect-video rounded-xl overflow-hidden border border-border shadow-lg hidden md:block">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube-nocookie.com/embed/XtmRhHvXeyo?rel=0"
                  title="RISE Football Video 2"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>
          </div>
        </section>



        {/* Services Section for Players - HIDDEN */}
        <section className="hidden">
          <div className="container mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Develop */}
              <div className="group relative overflow-hidden rounded-lg border border-primary/20 hover:border-primary transition-all">
                <div className="p-8 space-y-4">
                  <h3 className="text-4xl font-bebas uppercase tracking-wider text-primary">
                    {t("home.develop", "Develop")}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {t("home.develop_desc", "Receive expert training to maximise your physical capacity for performance. Push the limits of your body and mind to truly know how far you can go in your career.")}
                  </p>
                </div>
              </div>

              {/* Perform */}
              <div className="group relative overflow-hidden rounded-lg border border-primary/20 hover:border-primary transition-all">
                <div className="p-8 space-y-4">
                  <h3 className="text-4xl font-bebas uppercase tracking-wider text-primary">
                    {t("home.perform", "Perform")}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {t("home.perform_desc", "Play your best on a consistent basis through smart preparation, including psychological training sessions and pre-match analysis specific to your individual matchups.")}
                  </p>
                </div>
              </div>

              {/* Attract */}
              <div className="group relative overflow-hidden rounded-lg border border-primary/20 hover:border-primary transition-all">
                <div className="p-8 space-y-4">
                  <h3 className="text-4xl font-bebas uppercase tracking-wider text-primary">
                    {t("home.attract", "Attract")}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {t("home.attract_desc", "Through our vast scouting network, we maximise visibility across the footballing world to ensure player interest and demand.")}
                  </p>
                </div>
              </div>

              {/* Sign */}
              <div className="group relative overflow-hidden rounded-lg border border-primary/20 hover:border-primary transition-all">
                <div className="p-8 space-y-4">
                  <h3 className="text-4xl font-bebas uppercase tracking-wider text-primary">
                    {t("home.sign", "Sign")}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {t("home.sign_desc", "Sign the dotted line after our team of intermediaries negotiate new and improved contracts. Retain confidence knowing your career opportunities are being created and finalised.")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* CTA Section moved above News */}

        {/* RISE Broadcast Advertisement */}
        <section className="py-12 md:py-16 px-4 bg-muted/30">
          <div className="container mx-auto">
            <div className="max-w-3xl mx-auto p-8 rounded-lg border border-primary/20 bg-primary/5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent"></div>
              <div className="text-center relative z-10 space-y-4">
                <div className="inline-block">
                  <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                    {t("home.stay_up_to_date", "STAY UP TO DATE")}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider text-primary">
                  {t("home.join_broadcast", "Join RISE Broadcast on Instagram")}
                </h2>
                <p className="text-foreground mb-6 text-base md:text-lg leading-relaxed">
                  {t("home.broadcast_desc", "Get daily updates on agency insights, performance optimization, coaching systems, and player development strategies")}
                </p>
                <a
                  href="https://www.instagram.com/channel/AbY33s3ZhuxaNwuo/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-background font-bebas uppercase tracking-wider text-lg hover:bg-primary/90 hover:scale-105 transition-all rounded shadow-lg"
                >
                  <HoverText text={t("home.join_channel", "Join the Channel")} />
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
};

export default Index;
