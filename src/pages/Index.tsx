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
            
            <div className="text-center space-y-6" style={{ marginTop: "58px" }}>
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

        {/* Match Week Journey Section */}
        <section className="py-16 md:py-24 px-4 bg-background relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent"></div>
          <div className="container mx-auto max-w-7xl relative z-10">
            <div className="text-center mb-16 space-y-6">
              <div className="inline-block">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                  Our Process
                </span>
              </div>
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-bebas uppercase tracking-wider text-foreground leading-tight">
                A Match Week <span className="text-primary">With RISE</span>
              </h2>
              <p className="text-base md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-light">
                From training ground to match day and beyond, we optimize every aspect of player development and performance
              </p>
            </div>

            {/* Journey Timeline */}
            <div className="relative">
              {/* Vertical Line - Desktop */}
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/20 via-primary to-primary/20 transform -translate-x-1/2"></div>

              {/* Journey Steps */}
              <div className="space-y-12 md:space-y-24">
                {/* Step 1 - Training */}
                <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8">
                  <div className="w-full md:w-1/2 md:pr-12 md:text-right order-2 md:order-1">
                    <div className="group p-8 rounded-lg border border-primary/30 bg-background/80 backdrop-blur-sm hover:border-primary/60 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10">
                      <div className="text-6xl font-bebas text-primary mb-4">01</div>
                      <h3 className="text-3xl md:text-4xl font-bebas uppercase tracking-wider text-foreground mb-4">Training</h3>
                      <p className="text-muted-foreground leading-relaxed mb-4">
                        Structured, science-backed training protocols tailored to each player's needs. Our comprehensive approach ensures physical development, technical excellence, and tactical understanding.
                      </p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center md:justify-end gap-2">
                          <span>Strength & conditioning programs</span>
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </li>
                        <li className="flex items-center md:justify-end gap-2">
                          <span>Technical skill development</span>
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </li>
                        <li className="flex items-center md:justify-end gap-2">
                          <span>Recovery & nutrition guidance</span>
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="hidden md:flex w-12 h-12 rounded-full bg-primary border-4 border-background flex-shrink-0 items-center justify-center z-10 order-2">
                    <svg className="w-6 h-6 text-background" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="w-full md:w-1/2 order-1 md:order-3"></div>
                </div>

                {/* Step 2 - Pre-Match Analysis */}
                <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8">
                  <div className="w-full md:w-1/2 order-1"></div>
                  <div className="hidden md:flex w-12 h-12 rounded-full bg-primary border-4 border-background flex-shrink-0 items-center justify-center z-10 order-2">
                    <svg className="w-6 h-6 text-background" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="w-full md:w-1/2 md:pl-12 order-2 md:order-3">
                    <div className="group p-8 rounded-lg border border-primary/30 bg-background/80 backdrop-blur-sm hover:border-primary/60 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10">
                      <div className="text-6xl font-bebas text-primary mb-4">02</div>
                      <h3 className="text-3xl md:text-4xl font-bebas uppercase tracking-wider text-foreground mb-4">Pre-Match Analysis</h3>
                      <p className="text-muted-foreground leading-relaxed mb-4">
                        Detailed tactical preparation using advanced video analysis. We break down opposition tactics, identify key matchups, and develop game plans that maximize player strengths.
                      </p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Opposition scouting reports</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Tactical scheme breakdowns</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Strategic positioning insights</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Step 3 - Performance Reports */}
                <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8">
                  <div className="w-full md:w-1/2 md:pr-12 md:text-right order-2 md:order-1">
                    <div className="group p-8 rounded-lg border border-primary/30 bg-background/80 backdrop-blur-sm hover:border-primary/60 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10">
                      <div className="text-6xl font-bebas text-primary mb-4">03</div>
                      <h3 className="text-3xl md:text-4xl font-bebas uppercase tracking-wider text-foreground mb-4">Performance Reports</h3>
                      <p className="text-muted-foreground leading-relaxed mb-4">
                        Comprehensive match-day data analysis tracking every action, decision, and movement. Our detailed reports provide quantifiable metrics on player performance and development.
                      </p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center md:justify-end gap-2">
                          <span>Action-by-action scoring</span>
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </li>
                        <li className="flex items-center md:justify-end gap-2">
                          <span>R90 performance metrics</span>
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </li>
                        <li className="flex items-center md:justify-end gap-2">
                          <span>Statistical comparisons</span>
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="hidden md:flex w-12 h-12 rounded-full bg-primary border-4 border-background flex-shrink-0 items-center justify-center z-10 order-2">
                    <svg className="w-6 h-6 text-background" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="w-full md:w-1/2 order-1 md:order-3"></div>
                </div>

                {/* Step 4 - Post-Match Analysis */}
                <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8">
                  <div className="w-full md:w-1/2 order-1"></div>
                  <div className="hidden md:flex w-12 h-12 rounded-full bg-primary border-4 border-background flex-shrink-0 items-center justify-center z-10 order-2">
                    <svg className="w-6 h-6 text-background" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div className="w-full md:w-1/2 md:pl-12 order-2 md:order-3">
                    <div className="group p-8 rounded-lg border border-primary/30 bg-background/80 backdrop-blur-sm hover:border-primary/60 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10">
                      <div className="text-6xl font-bebas text-primary mb-4">04</div>
                      <h3 className="text-3xl md:text-4xl font-bebas uppercase tracking-wider text-foreground mb-4">Post-Match Analysis</h3>
                      <p className="text-muted-foreground leading-relaxed mb-4">
                        In-depth video review sessions breaking down individual performance. We identify areas of excellence and opportunities for growth, ensuring continuous improvement.
                      </p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Key moment breakdowns</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Tactical decision analysis</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Development focus areas</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Step 5 - Highlights */}
                <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8">
                  <div className="w-full md:w-1/2 md:pr-12 md:text-right order-2 md:order-1">
                    <div className="group p-8 rounded-lg border border-primary/30 bg-background/80 backdrop-blur-sm hover:border-primary/60 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10">
                      <div className="text-6xl font-bebas text-primary mb-4">05</div>
                      <h3 className="text-3xl md:text-4xl font-bebas uppercase tracking-wider text-foreground mb-4">Highlights</h3>
                      <p className="text-muted-foreground leading-relaxed mb-4">
                        Professional highlight reels showcasing player abilities. These materials support club presentations, transfer negotiations, and personal brand development.
                      </p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center md:justify-end gap-2">
                          <span>Professionally edited reels</span>
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </li>
                        <li className="flex items-center md:justify-end gap-2">
                          <span>Skills showcase videos</span>
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </li>
                        <li className="flex items-center md:justify-end gap-2">
                          <span>Marketing materials</span>
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="hidden md:flex w-12 h-12 rounded-full bg-primary border-4 border-background flex-shrink-0 items-center justify-center z-10 order-2">
                    <svg className="w-6 h-6 text-background" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="w-full md:w-1/2 order-1 md:order-3"></div>
                </div>
              </div>
            </div>

            {/* Closing Statement */}
            <div className="mt-20 text-center">
              <div className="inline-block p-8 rounded-lg border border-primary/30 bg-background/80 backdrop-blur-sm max-w-3xl">
                <p className="text-xl md:text-2xl text-foreground leading-relaxed font-light">
                  This comprehensive approach ensures our players are prepared, performing, and progressing at the highest level—week after week, season after season.
                </p>
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
