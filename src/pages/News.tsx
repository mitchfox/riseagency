import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight, MessageCircle, HelpCircle } from "lucide-react";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";
import { useLanguage } from "@/contexts/LanguageContext";
import { linkPlayerNames, usePlayerNames } from "@/lib/playerLinking";
import { AskQuestionDialog } from "@/components/AskQuestionDialog";
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

// Check if article is a BTL category
const BTL_CATEGORIES = [
  "TECHNICAL", "NUTRITION", "PSYCHOLOGY", "TACTICAL",
  "STRENGTH, POWER & SPEED", "RECOVERY", "COACHING", "AGENTS"
];

const isBTLArticle = (category: string | undefined) => {
  return category && BTL_CATEGORIES.includes(category.toUpperCase());
};

// Separate component for article view to use hooks properly
const ArticleView = ({ article }: { article: NewsArticle }) => {
  const { t, language } = useLanguage();
  const playerNames = usePlayerNames();
  const [askQuestionOpen, setAskQuestionOpen] = useState(false);
  const { translatedContent, isTranslating } = useAutoTranslate({
    title: article.title,
    excerpt: article.excerpt,
    content: article.content,
    enabled: language !== 'en'
  });

  // Determine if this is a BTL article
  const isBTL = isBTLArticle(article.category);
  const backLink = isBTL ? "/between-the-lines" : "/news";
  const backText = isBTL ? t("btl.back_to_all", "Back to All") : t("news.back_to_news", "Back to News");

  // Format paragraph with bold text and player links
  const formatParagraph = (paragraph: string) => {
    // First, handle bold text
    const boldParts = paragraph.split(/(\*\*.*?\*\*)/);
    
    return boldParts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        // Link player names within bold text
        const linkedContent = linkPlayerNames(boldText, playerNames);
        return <strong key={i}>{linkedContent}</strong>;
      }
      // Link player names in regular text
      return <span key={i}>{linkPlayerNames(part, playerNames)}</span>;
    });
  };

  // Create article structured data
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": article.title,
    "description": article.excerpt,
    "image": article.image_url,
    "datePublished": article.created_at,
    "dateModified": article.created_at,
    "author": {
      "@type": "Organization",
      "name": "RISE Football Agency"
    },
    "publisher": {
      "@type": "Organization",
      "name": "RISE Football Agency",
      "logo": {
        "@type": "ImageObject",
        "url": "https://risefootballagency.com/favicon.ico"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://risefootballagency.com/news/${createSlug(article.title)}`
    }
  };

  return (
    <>
      <SEO 
        title={`${article.title} | RISE Football Agency News`}
        description={article.excerpt || article.title}
        image={article.image_url || "/og-preview-news.png"}
        url={isBTL ? `/between-the-lines/${createSlug(article.title)}` : `/news/${createSlug(article.title)}`}
        type="article"
        article={{
          publishedTime: article.created_at,
          modifiedTime: article.created_at,
          author: "RISE Football Agency"
        }}
        structuredData={articleSchema}
      />
      <Link to={backLink}>
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {backText}
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
        
        {/* Ask Question & Contact Buttons */}
        <div className="mt-12 pt-8 border-t border-border/50">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => setAskQuestionOpen(true)} variant="outline" className="font-bebas uppercase tracking-wider">
              <HelpCircle className="w-4 h-4 mr-2" />
              Ask a Question
            </Button>
            <Button asChild className="btn-shine font-bebas uppercase tracking-wider">
              <Link to="/contact">
                Contact Us
              </Link>
            </Button>
          </div>
        </div>
        
        <AskQuestionDialog 
          open={askQuestionOpen} 
          onOpenChange={setAskQuestionOpen}
          articleTitle={article.title}
        />
      </article>
      
      {/* Similar Articles - Only for BTL articles */}
      {isBTL && <SimilarArticles currentArticleId={article.id} category={article.category} />}
    </>
  );
};

// Component to fetch and display similar articles
const SimilarArticles = ({ currentArticleId, category }: { currentArticleId: string; category: string }) => {
  const { t } = useLanguage();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  
  useEffect(() => {
    const fetchSimilar = async () => {
      // Fetch articles from same category, excluding current article
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("published", true)
        .eq("category", category)
        .neq("id", currentArticleId)
        .order("created_at", { ascending: false })
        .limit(3);
      
      if (data && data.length > 0) {
        setArticles(data);
      } else {
        // Fallback to other BTL articles if no same-category articles found
        const { data: fallbackData } = await supabase
          .from("blog_posts")
          .select("*")
          .eq("published", true)
          .neq("category", "PLAYER NEWS")
          .neq("id", currentArticleId)
          .order("created_at", { ascending: false })
          .limit(3);
        
        if (fallbackData) {
          setArticles(fallbackData);
        }
      }
    };
    
    fetchSimilar();
  }, [currentArticleId, category]);
  
  if (articles.length === 0) return null;
  
  return (
    <div className="mt-16 pt-8 border-t border-border/50">
      <h3 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider mb-8 text-center">
        {t("btl.similar_articles", "Similar Articles")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {articles.map((article) => (
          <Link 
            key={article.id} 
            to={`/between-the-lines/${createSlug(article.title)}`}
            className="group"
          >
            <div className="overflow-hidden rounded-lg border border-border hover:border-primary/50 transition-all">
              {article.image_url && (
                <div className="aspect-[16/9] overflow-hidden">
                  <img 
                    src={article.image_url} 
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
              )}
              <div className="p-4 bg-card">
                <span className="text-xs text-primary font-bebas uppercase tracking-wider">
                  {article.category}
                </span>
                <h4 className="text-lg font-bebas uppercase tracking-wider mt-1 group-hover:text-primary transition-colors line-clamp-2">
                  {article.title}
                </h4>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

const ARTICLES_PER_PAGE = 9;

const News = () => {
  const { articleId } = useParams();
  const { t } = useLanguage();
  const [newsItems, setNewsItems] = useState<NewsArticle[]>([]);
  const [currentArticle, setCurrentArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

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
        title={currentArticle ? currentArticle.title : "Latest News | RISE Football Agency"}
        description={currentArticle ? currentArticle.excerpt : "Stay updated with the latest news from RISE Football Agency and our talented roster of players."}
        image={currentArticle?.image_url || "/og-preview-news.png"}
        url={articleId ? `/news/${articleId}` : "/news"}
      />
      <Header />
      <div className="min-h-screen bg-background pt-32 md:pt-24 touch-pan-y overflow-x-hidden">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-6xl mx-auto">
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
                    {newsItems
                      .slice((currentPage - 1) * ARTICLES_PER_PAGE, currentPage * ARTICLES_PER_PAGE)
                      .map((item) => (
                      <Link key={item.id} to={`/news/${createSlug(item.title)}`}>
                        <div className="group cursor-pointer overflow-hidden rounded-lg border border-border hover:border-primary/50 transition-all hover:shadow-lg">
                          {item.image_url && (
                            <div className="relative aspect-[4/3] overflow-hidden bg-black">
                              <img 
                                src={item.image_url} 
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                loading="lazy"
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
                
                {/* Pagination */}
                {!loading && newsItems.length > ARTICLES_PER_PAGE && (
                  <div className="flex justify-center items-center gap-4 mt-12">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="font-bebas uppercase"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      {t("news.previous", "Previous")}
                    </Button>
                    
                    <span className="text-sm text-muted-foreground font-bebas">
                      {t("news.page", "Page")} {currentPage} {t("news.of", "of")} {Math.ceil(newsItems.length / ARTICLES_PER_PAGE)}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(newsItems.length / ARTICLES_PER_PAGE), p + 1))}
                      disabled={currentPage === Math.ceil(newsItems.length / ARTICLES_PER_PAGE)}
                      className="font-bebas uppercase"
                    >
                      {t("news.next", "Next")}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default News;
