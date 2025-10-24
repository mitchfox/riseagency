import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function BetweenTheLines() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("ALL POSTS");
  const [selectedPosition, setSelectedPosition] = useState("ALL POSITIONS");

  useEffect(() => {
    fetchArticles();
  }, []);

  useEffect(() => {
    filterArticles();
  }, [selectedCategory, selectedPosition, articles]);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("published", true)
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
      <main className="flex-1 pt-32 pb-16">
        <div className="container mx-auto px-4">
          {/* Page Title */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider text-primary mb-4">
              Between The Lines
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Expert insights, tactical analysis, and professional development content for football players and coaches
            </p>
          </div>

          {/* Category Filters */}
          <div className="mb-6 pb-4 border-b border-border overflow-x-auto">
            <div className="flex gap-4 min-w-max">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`text-sm font-bebas uppercase tracking-wider px-4 py-2 transition-colors whitespace-nowrap ${
                    selectedCategory === category
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Position Filters */}
          <div className="mb-12 pb-4 border-b border-border overflow-x-auto">
            <div className="flex gap-4 min-w-max">
              {positions.map((position) => (
                <button
                  key={position}
                  onClick={() => setSelectedPosition(position)}
                  className={`text-sm font-bebas uppercase tracking-wider px-4 py-2 transition-colors whitespace-nowrap ${
                    selectedPosition === position
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {position}
                </button>
              ))}
            </div>
          </div>

          {/* Articles Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ))}
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-xl text-muted-foreground">
                No articles found for the selected filters
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article) => (
                <article
                  key={article.id}
                  className="group cursor-pointer overflow-hidden rounded-lg border border-border hover:border-primary transition-all"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-black">
                    {article.image_url ? (
                      <img
                        src={article.image_url}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <p className="text-muted-foreground">No image</p>
                      </div>
                    )}
                    {article.category && (
                      <div className="absolute top-4 left-4">
                        <Badge className="bg-primary/90 text-black font-bebas uppercase tracking-wider">
                          {article.category}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bebas uppercase tracking-wider text-foreground group-hover:text-primary transition-colors mb-2">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {article.excerpt}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
