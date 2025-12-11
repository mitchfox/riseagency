import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { getLocalizedPath } from "@/lib/localizedRoutes";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { HoverText } from "@/components/HoverText";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

interface Article {
  id: string;
  title: string;
  excerpt: string;
  image_url: string;
  category: string;
  created_at: string;
}

const categories = [
  "ALL POSTS",
  "TECHNICAL",
  "NUTRITION",
  "PSYCHOLOGY",
  "TACTICAL",
  "STRENGTH, POWER & SPEED",
  "RECOVERY",
  "COACHING",
  "AGENTS",
];

const positions = [
  "ALL POSITIONS",
  "CENTRAL MIDFIELDER",
  "CENTRE BACK",
  "FULL BACK",
  "GOALKEEPER",
  "STRIKER",
  "WINGER",
];

const createSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

export default function BetweenTheLines() {
  const { t, language } = useLanguage();
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("ALL POSTS");
  const [selectedPosition, setSelectedPosition] = useState("ALL POSITIONS");
  const [autoplayPlugin] = useState(() =>
    Autoplay({ delay: 2000, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  useEffect(() => {
    fetchArticles();
  }, []);

  useEffect(() => {
    filterArticles();
  }, [selectedCategory, selectedPosition, articles]);

  const fetchArticles = async () => {
    try {
      const betweenTheLinesCategories = [
        "TECHNICAL",
        "NUTRITION",
        "PSYCHOLOGY",
        "TACTICAL",
        "STRENGTH, POWER & SPEED",
        "RECOVERY",
        "COACHING",
        "AGENTS",
      ];

      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("published", true)
        .in("category", betweenTheLinesCategories)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error("Error fetching articles:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterArticles = () => {
    let filtered = [...articles];

    if (selectedCategory !== "ALL POSTS") {
      filtered = filtered.filter(
        (article) => article.category?.toUpperCase() === selectedCategory
      );
    }

    if (selectedPosition !== "ALL POSITIONS") {
      filtered = filtered.filter((article) =>
        article.title?.toUpperCase().includes(selectedPosition)
      );
    }

    setFilteredArticles(filtered);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-32 pb-16 touch-pan-y overflow-x-hidden">
        <div className="container mx-auto px-4">
          {/* Page Title */}
          <div className="text-center mb-12 space-y-3 animate-fade-in">
            <div className="inline-block">
              <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                {t('btl.badge')}
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bebas uppercase tracking-wider text-foreground mb-4">
              {t('btl.title_part1')} <span className="text-primary">{t('btl.title_part2')}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t('btl.subtitle')}
            </p>
          </div>

          {/* Category Filters */}
          <div className="mb-6 pb-4 border-b border-border/50 overflow-x-auto">
            <div className="flex gap-4 min-w-max">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`text-sm font-bebas uppercase tracking-wider px-4 py-2 rounded transition-all whitespace-nowrap ${
                    selectedCategory === category
                      ? "text-primary bg-primary/10 border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Position Filters */}
          <div className="mb-12 pb-4 border-b border-border/50 overflow-x-auto">
            <div className="flex gap-4 min-w-max">
              {positions.map((position) => (
                <button
                  key={position}
                  onClick={() => setSelectedPosition(position)}
                  className={`text-sm font-bebas uppercase tracking-wider px-4 py-2 rounded transition-all whitespace-nowrap ${
                    selectedPosition === position
                      ? "text-primary bg-primary/10 border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {position}
                </button>
              ))}
            </div>
          </div>

          {/* Articles Carousel */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-80 w-full rounded-lg" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ))}
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-xl text-muted-foreground">
                {t('btl.no_articles')}
              </p>
            </div>
          ) : (
            <Carousel
              plugins={[autoplayPlugin]}
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-4">
                {filteredArticles.map((article) => (
                  <CarouselItem key={article.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                    <a
                      href={getLocalizedPath(`/between-the-lines/${createSlug(article.title)}`, language)}
                      className="group cursor-pointer overflow-hidden rounded-lg border border-border hover:border-primary/50 transition-all hover:shadow-lg block h-full"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-black">
                        {article.image_url ? (
                          <>
                            <img
                              src={article.image_url}
                              alt={article.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <p className="text-muted-foreground">No image</p>
                          </div>
                        )}
                        {article.category && (
                          <div className="absolute top-4 left-4">
                            <Badge className="bg-primary text-background font-bebas uppercase tracking-wider shadow-lg">
                              {article.category}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="p-6 bg-card">
                        <h3 className="text-xl md:text-2xl font-bebas uppercase tracking-wider text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
                          {article.title}
                        </h3>
                        {article.excerpt && (
                          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                            {article.excerpt}
                          </p>
                        )}
                      </div>
                    </a>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex" />
              <CarouselNext className="hidden md:flex" />
            </Carousel>
          )}

          {/* RISE Broadcast Advertisement */}
          <section className="py-8">
            <div className="max-w-3xl mx-auto p-8 rounded-lg border border-primary/20 bg-primary/5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent"></div>
              <div className="text-center relative z-10">
                <h2 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider text-primary mb-3">
                  {t('btl.broadcast_title')}
                </h2>
                <p className="text-foreground mb-6 text-base md:text-lg leading-relaxed">
                  {t('btl.broadcast_description')}
                </p>
                <a
                  href="https://www.instagram.com/channel/AbY33s3ZhuxaNwuo/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-background font-bebas uppercase tracking-wider text-lg hover:bg-primary/90 hover:scale-105 transition-all rounded shadow-lg"
                >
                  <HoverText text={t('btl.join_channel')} />
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
