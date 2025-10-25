import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image_url: string;
  category: string;
  created_at: string;
}

const News = () => {
  const { articleId } = useParams();
  const [newsItems, setNewsItems] = useState<NewsArticle[]>([]);
  const [currentArticle, setCurrentArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (articleId) {
      fetchArticle(articleId);
    } else {
      fetchNews();
    }
  }, [articleId]);

  const fetchArticle = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", id)
        .eq("published", true)
        .single();

      if (error) throw error;
      setCurrentArticle(data);
    } catch (error) {
      console.error("Error fetching article:", error);
    } finally {
      setLoading(false);
    }
  };

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
            {articleId && currentArticle ? (
              // Individual Article View
              <>
                <Link to="/news">
                  <Button variant="ghost" className="mb-6">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to News
                  </Button>
                </Link>
                
                {loading ? (
                  <Skeleton className="w-full h-96" />
                ) : (
                  <article>
                    {currentArticle.image_url && (
                      <div className="w-full mb-8">
                        <img 
                          src={currentArticle.image_url} 
                          alt={currentArticle.title}
                          className="w-full h-auto rounded-lg"
                        />
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-primary font-bebas uppercase tracking-wider">
                        {currentArticle.category}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(currentArticle.created_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                    
                    <h1 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground mb-6">
                      {currentArticle.title}
                    </h1>
                    
                    {currentArticle.excerpt && (
                      <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                        {currentArticle.excerpt}
                      </p>
                    )}
                    
                    <div className="prose prose-lg max-w-none text-foreground">
                      {currentArticle.content.split('\n').map((paragraph, index) => (
                        <p key={index} className="mb-4 leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </article>
                )}
              </>
            ) : (
              // News List View
              <>
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
                      <Link key={item.id} to={`/news/${item.id}`}>
                        <Card className="border-primary/20 hover:border-primary transition-all cursor-pointer">
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
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default News;
