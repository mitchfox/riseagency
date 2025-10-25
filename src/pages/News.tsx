import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  image_url: string;
  category: string;
  created_at: string;
}

const News = () => {
  const [newsItems, setNewsItems] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("published", true)
        .eq("category", "PLAYER NEWS")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNewsItems(data || []);
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background pt-24 md:pt-16 touch-pan-y overflow-x-hidden">
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-6xl md:text-8xl font-bebas uppercase tracking-wider text-foreground mb-12 text-center">
              Latest News
            </h1>
            
            {loading ? (
              <div className="space-y-8">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="border-primary/20">
                    <CardHeader>
                      <Skeleton className="h-4 w-32 mb-4" />
                      <Skeleton className="h-8 w-3/4" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : newsItems.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-xl text-muted-foreground">
                  No news articles available at this time
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {newsItems.map((item) => (
                  <Card key={item.id} className="border-primary/20 hover:border-primary transition-all">
                    {item.image_url && (
                      <div className="aspect-[16/9] overflow-hidden">
                        <img 
                          src={item.image_url} 
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-primary font-bebas uppercase tracking-wider">
                          {item.category}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                      <CardTitle className="text-3xl font-bebas uppercase tracking-wider">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base text-muted-foreground">
                        {item.excerpt}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default News;
