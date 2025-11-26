import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { WorkWithUsDialog } from "@/components/WorkWithUsDialog";
import { IntroModal } from "@/components/IntroModal";
import { SEO } from "@/components/SEO";
import { VideoPortfolio } from "@/components/VideoPortfolio";
import { VideoScene3D } from "@/components/VideoScene3D";
import ScoutingNetworkMap from "@/components/ScoutingNetworkMap";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import marbleBg from "@/assets/marble-bg.png";
import riseStarIcon from "@/assets/rise-star-icon.png";
import marbleTexture from "@/assets/marble-texture.png";
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
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [insideAccessArticles, setInsideAccessArticles] = useState<NewsArticle[]>([]);

  useEffect(() => {
    const hasSeenIntro = localStorage.getItem("intro-modal-seen");
    if (!hasSeenIntro) {
      setShowIntroModal(true);
    }

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
      <IntroModal open={showIntroModal} onOpenChange={setShowIntroModal} />
      {!showIntroModal && <Header />}
      <div className="bg-background min-h-screen">
        {/* Video Portfolio Section - Moved to top */}
        <section className="pt-16 md:pt-14 py-12 md:py-20 px-4 bg-background relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5"></div>
          <div className="container mx-auto max-w-7xl relative z-10">
            <VideoPortfolio />
            
            <div className="text-center mt-12 space-y-6">
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-bebas uppercase tracking-wider">
                <span className="text-foreground">REALISE </span>
                <span className="text-primary">POTENTIAL</span>
              </h2>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto font-light tracking-wide italic mt-[15px]">
                Elite Football Representation & Performance Optimisation
              </p>
            </div>
          </div>
        </section>

        {/* Agency Overview Section */}
        <section className="py-12 md:py-16 px-4 bg-background relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent"></div>
          <div className="container mx-auto max-w-5xl relative z-10">
            <div className="text-center space-y-6 animate-fade-in">
              <div className="inline-block">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                  Why RISE?
                </span>
              </div>
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-bebas uppercase tracking-wider text-foreground leading-tight">
                Performance-First <span className="text-primary">Agency</span>
              </h2>
              <p className="text-base md:text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-4xl lg:max-w-6xl mx-auto font-light">
                RISE Football is the performance-first agency, ensuring our players, coaches and clubs develop optimally on the pitch, as well as off. To reach their potential, we provide our clients with an extensive training, analysis and recovery protocol while utilising our network to put them in a position to succeed.
              </p>
              <div className="flex justify-center gap-8 md:gap-12 pt-8 max-w-3xl mx-auto">
                <div className="flex flex-col items-center text-center">
                  <div className="text-5xl font-bebas text-primary mb-2">15+</div>
                  <div className="text-sm uppercase tracking-wider text-muted-foreground">Countries</div>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="text-5xl font-bebas text-primary mb-2">25+</div>
                  <div className="text-sm uppercase tracking-wider text-muted-foreground">Premier League Players</div>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="text-5xl font-bebas text-primary mb-2">50+</div>
                  <div className="text-sm uppercase tracking-wider text-muted-foreground">International Players</div>
                </div>
              </div>
              
              {/* Flip Cards */}
              <div className="grid md:grid-cols-3 gap-6 mt-12 max-w-5xl mx-auto">
                {/* Card 1 - Founder's Background */}
                <div className="flip-card-container group cursor-pointer" onClick={(e) => e.currentTarget.classList.toggle('flipped')}>
                  <div className="flip-card relative w-full h-64">
                    {/* Front */}
                    <div className="flip-card-front absolute inset-0 rounded-lg border border-primary/30 bg-background/80 backdrop-blur-sm p-6 flex flex-col items-center justify-center">
                      <svg className="w-12 h-12 text-primary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-4xl font-bebas text-primary mb-3">EXPERTISE</div>
                      <div className="text-sm uppercase tracking-wider text-muted-foreground text-center">Click to learn more</div>
                    </div>
                    {/* Back */}
                    <div className="flip-card-back absolute inset-0 rounded-lg border border-primary/30 bg-background/95 backdrop-blur-sm p-6 flex flex-col justify-center">
                      <div className="text-2xl font-bebas text-primary mb-4 text-center">ELITE EXPERIENCE</div>
                      <p className="text-sm text-foreground text-center leading-relaxed">
                        Our founder's background includes personal training elite players across Europe's biggest leagues, bringing world-class expertise to every client.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card 2 - FIFA Licenses */}
                <div className="flip-card-container group cursor-pointer" onClick={(e) => e.currentTarget.classList.toggle('flipped')}>
                  <div className="flip-card relative w-full h-64">
                    {/* Front */}
                    <div className="flip-card-front absolute inset-0 rounded-lg border border-primary/30 bg-background/80 backdrop-blur-sm p-6 flex flex-col items-center justify-center">
                      <svg className="w-12 h-12 text-primary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      <div className="text-4xl font-bebas text-primary mb-3">LICENSED</div>
                      <div className="text-sm uppercase tracking-wider text-muted-foreground text-center">Click to learn more</div>
                    </div>
                    {/* Back */}
                    <div className="flip-card-back absolute inset-0 rounded-lg border border-primary/30 bg-background/95 backdrop-blur-sm p-6 flex flex-col justify-center">
                      <div className="text-2xl font-bebas text-primary mb-4 text-center">CERTIFIED & APPROVED</div>
                      <p className="text-sm text-foreground text-center leading-relaxed">
                        FIFA licensed intermediaries and approved by football's governing bodies, ensuring full compliance and professional representation.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card 3 - Club Network */}
                <div className="flip-card-container group cursor-pointer" onClick={(e) => e.currentTarget.classList.toggle('flipped')}>
                  <div className="flip-card relative w-full h-64">
                    {/* Front */}
                    <div className="flip-card-front absolute inset-0 rounded-lg border border-primary/30 bg-background/80 backdrop-blur-sm p-6 flex flex-col items-center justify-center">
                      <svg className="w-12 h-12 text-primary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-4xl font-bebas text-primary mb-3">CONNECTED</div>
                      <div className="text-sm uppercase tracking-wider text-muted-foreground text-center">Click to learn more</div>
                    </div>
                    {/* Back */}
                    <div className="flip-card-back absolute inset-0 rounded-lg border border-primary/30 bg-background/95 backdrop-blur-sm p-6 flex flex-col justify-center">
                      <div className="text-2xl font-bebas text-primary mb-4 text-center">GLOBAL NETWORK</div>
                      <p className="text-sm text-foreground text-center leading-relaxed">
                        Extensive club network spanning top European leagues and beyond, providing unparalleled access and opportunities for our clients.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* INSIDE:ACCESS Section */}
        {insideAccessArticles.length > 0 && (
          <section className="py-12 md:py-16 px-4 bg-background">
            <div className="container mx-auto max-w-7xl w-full">
              <div className="text-center mb-6 space-y-3">
              <div className="inline-block">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                  Exclusive
                </span>
              </div>
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
                  INSIDE<span className="text-primary">:ACCESS</span>
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {insideAccessArticles.map((article, index) => (
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
        <section className="py-12 md:py-16 px-4 bg-background">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-8 space-y-3">
              <div className="inline-block">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                  Eyes Across The Game
                </span>
              </div>
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
                SCOUTING <span className="text-primary">NETWORK</span>
              </h2>
            </div>
            <ScoutingNetworkMap />
          </div>
        </section>

        {/* CTA Section - moved above News */}
        <section className="py-12 md:py-16 px-4 bg-background relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-primary/10"></div>
          <div className="container mx-auto max-w-4xl text-center space-y-8 relative z-10">
            <div className="space-y-4">
              <div className="inline-block">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                  RISE WITH US
                </span>
              </div>
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-bebas uppercase tracking-wider text-foreground leading-tight">
                Take The <span className="text-primary">1st Step</span>
              </h2>
              <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Reach out to one of our representatives for a direct 1:1 conversation about yourself, or a player under your care.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-4">
              <WorkWithUsDialog>
                <Button 
                  size="lg" 
                  className="btn-shine text-xl font-bebas uppercase tracking-wider px-12 py-7 hover:scale-105 transition-transform shadow-xl"
                >
                  Work With Us
                </Button>
              </WorkWithUsDialog>
              <Button 
                asChild
                variant="outline"
                size="lg" 
                className="text-xl font-bebas uppercase tracking-wider px-12 py-7 hover:scale-105 transition-transform"
              >
                <a href="mailto:jolon.levene@risefootballagency.com?subject=Portfolio%20Request">
                  Request Our Portfolio
                </a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground italic">
              Learn more about our portfolio, including how we work and with whom we work.
            </p>
          </div>
        </section>

        {/* News Section */}
        <section className="py-12 md:py-16 px-4 bg-background">
          <div className="container mx-auto max-w-7xl w-full">
            <div className="text-center mb-8 space-y-3">
              <div className="inline-block">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                  Latest Updates
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
                News
              </h2>
              <Link to="/news">
                <Button 
                  variant="outline"
                  className="font-bebas uppercase tracking-wider border-primary/30 text-foreground hover:bg-primary/10"
                >
                  All News →
                </Button>
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {newsArticles.map((article) => (
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
                      Read Article
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* WATCH NOW Section */}
        <section className="py-12 md:py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-6 space-y-3">
              <div className="inline-block">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                  OUR WORK
                </span>
              </div>
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
                WATCH <span className="text-primary">NOW</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Video 1 */}
              <div className="relative aspect-video rounded-xl overflow-hidden border border-border shadow-lg">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/pWH2cdmzwVg?rel=0"
                  title="RISE Football Video 1"
                  frameBorder="0"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>

              {/* Video 2 - Hidden on mobile */}
              <div className="relative aspect-video rounded-xl overflow-hidden border border-border shadow-lg hidden md:block">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/XtmRhHvXeyo?rel=0"
                  title="RISE Football Video 2"
                  frameBorder="0"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
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
                    Develop
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Receive expert training to maximise your physical capacity for performance. Push the limits of your body and mind to truly know how far you can go in your career.
                  </p>
                </div>
              </div>

              {/* Perform */}
              <div className="group relative overflow-hidden rounded-lg border border-primary/20 hover:border-primary transition-all">
                <div className="p-8 space-y-4">
                  <h3 className="text-4xl font-bebas uppercase tracking-wider text-primary">
                    Perform
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Play your best on a consistent basis through smart preparation, including psychological training sessions and pre-match analysis specific to your individual matchups.
                  </p>
                </div>
              </div>

              {/* Attract */}
              <div className="group relative overflow-hidden rounded-lg border border-primary/20 hover:border-primary transition-all">
                <div className="p-8 space-y-4">
                  <h3 className="text-4xl font-bebas uppercase tracking-wider text-primary">
                    Attract
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Through our vast scouting network, we maximise visibility across the footballing world to ensure player interest and demand.
                  </p>
                </div>
              </div>

              {/* Sign */}
              <div className="group relative overflow-hidden rounded-lg border border-primary/20 hover:border-primary transition-all">
                <div className="p-8 space-y-4">
                  <h3 className="text-4xl font-bebas uppercase tracking-wider text-primary">
                    Sign
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Sign the dotted line after our team of intermediaries negotiate new and improved contracts. Retain confidence knowing your career opportunities are being created and finalised.
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
                    STAY UP TO DATE
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider text-primary">
                  Join RISE Broadcast on Instagram
                </h2>
                <p className="text-foreground mb-6 text-base md:text-lg leading-relaxed">
                  Get daily updates on agency insights, performance optimization, coaching systems, and player development strategies
                </p>
                <a
                  href="https://www.instagram.com/channel/AbY33s3ZhuxaNwuo/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-background font-bebas uppercase tracking-wider text-lg hover:bg-primary/90 hover:scale-105 transition-all rounded shadow-lg"
                >
                  Join the Channel
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
