import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";
import { useLanguage } from "@/contexts/LanguageContext";

interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image_url: string;
  category: string;
  created_at: string;
}

const createSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

// Separate component for article view to use hooks properly
const ArticleView = ({ article }: { article: NewsArticle }) => {
  const { t, language } = useLanguage();
  const { translatedContent, isTranslating } = useAutoTranslate({
    title: article.title,
    excerpt: article.excerpt,
    content: article.content,
    enabled: language !== 'en'
  });

  const formatParagraph = (paragraph: string) => {
    return paragraph.split(/(\*\*.*?\*\*)/).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <>
      <Link to="/news">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("news.back_to_news", "Back to News")}
        </Button>
      </Link>
      
      <article>
        {article.image_url && (
          <div className="w-full mb-8">
            <img 
              src={article.image_url} 
              alt={translatedContent.title}
              className="w-full h-auto rounded-lg"
            />
          </div>
        )}
        
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-primary font-bebas uppercase tracking-wider">
            {article.category}
          </span>
          <div className="flex items-center gap-2">
            {isTranslating && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                {t("news.translating", "Translating...")}
              </span>
            )}
            <span className="text-sm text-muted-foreground">
              {new Date(article.created_at).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground mb-6">
          {translatedContent.title}
        </h1>
        
        {translatedContent.excerpt && (
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            {translatedContent.excerpt}
          </p>
        )}
        
        <div className="prose prose-lg max-w-none text-foreground">
          {translatedContent.content.split('\n').map((paragraph, index) => (
            <p key={index} className="mb-4 leading-relaxed">
              {formatParagraph(paragraph)}
            </p>
          ))}
        </div>
      </article>
    </>
  );
};

const News = () => {
  const { articleId } = useParams();
  const { t } = useLanguage();
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

  const fetchArticle = async (slug: string) => {
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("published", true);

      if (error) throw error;

      const article = data?.find(article => createSlug(article.title) === slug);
      
      if (article) {
        setCurrentArticle(article);
      }
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
      <SEO 
        title={currentArticle ? currentArticle.title : "Latest News - RISE Football Agency"}
        description={currentArticle ? currentArticle.excerpt : "Stay updated with the latest news from RISE Football Agency and our talented roster of players."}
        image={currentArticle?.image_url || "/og-preview-news.png"}
        url={articleId ? `/news/${articleId}` : "/news"}
      />
      <Header />
      <div className="min-h-screen bg-background pt-24 md:pt-16 touch-pan-y overflow-x-hidden">
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-4xl mx-auto">
            {articleId && currentArticle ? (
              loading ? (
                <Skeleton className="w-full h-96" />
              ) : (
                <ArticleView article={currentArticle} />
              )
            ) : (
              // News List View
              <>
                <div className="text-center mb-12 space-y-3 animate-fade-in">
                  <div className="inline-block">
                    <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                      {t("news.latest_updates", "Latest Updates")}
                    </span>
                  </div>
                  <h1 className="text-5xl md:text-7xl lg:text-8xl font-bebas uppercase tracking-wider text-foreground">
                    {t("news.latest", "Latest")} <span className="text-primary">{t("news.news", "News")}</span>
                  </h1>
                </div>
                
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="space-y-4">
                        <Skeleton className="h-80 w-full rounded-lg" />
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    ))}
                  </div>
                ) : newsItems.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-xl text-muted-foreground">
                      {t("news.no_articles", "No news articles available at this time")}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {newsItems.map((item) => (
                      <Link key={item.id} to={`/news/${createSlug(item.title)}`}>
                        <div className="group cursor-pointer overflow-hidden rounded-lg border border-border hover:border-primary/50 transition-all hover:shadow-lg">
                          {item.image_url && (
                            <div className="relative aspect-[4/3] overflow-hidden bg-black">
                              <img 
                                src={item.image_url} 
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                              
                              <div className="absolute top-4 left-4">
                                <span className="text-xs font-bebas uppercase tracking-wider text-white bg-primary/90 px-3 py-1 rounded shadow-lg">
                                  {new Date(item.created_at).toLocaleDateString('en-GB', { 
                                    day: '2-digit', 
                                    month: '2-digit', 
                                    year: 'numeric' 
                                  })}
                                </span>
                              </div>
                            </div>
                          )}
                          <div className="p-6 bg-card">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-xs text-primary font-bebas uppercase tracking-wider">
                                {item.category}
                              </span>
                            </div>
                            <h3 className="text-xl md:text-2xl font-bebas uppercase tracking-wider text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
                              {item.title}
                            </h3>
                            {item.excerpt && (
                              <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                                {item.excerpt}
                              </p>
                            )}
                          </div>
                        </div>
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
