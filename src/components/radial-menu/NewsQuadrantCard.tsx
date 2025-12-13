import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface NewsItem {
  id: string;
  title: string;
  image_url: string;
}

export const NewsQuadrantCard = () => {
  const navigate = useNavigate();
  const [newsIndex, setNewsIndex] = useState(0);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    const fetchNews = async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, image_url')
        .eq('published', true)
        .eq('category', 'PLAYER NEWS')
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (data && !error && data.length > 0) {
        setNewsItems(data as NewsItem[]);
      }
    };

    fetchNews();
  }, []);

  useEffect(() => {
    if (newsItems.length === 0) return;
    
    const interval = setInterval(() => {
      setNewsIndex(prev => (prev + 1) % newsItems.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [newsItems.length]);

  if (newsItems.length === 0) return null;

  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div 
        className="relative w-56 bg-black/70 backdrop-blur-sm border-2 border-primary/50 rounded-lg overflow-hidden cursor-pointer hover:border-primary transition-colors shadow-2xl shadow-primary/20 animate-[slideFromBottomLeft_0.5s_ease-out_forwards]"
        onClick={() => navigate('/news')}
      >
        <div className="relative w-full aspect-video">
          {newsItems.map((item, index) => (
            <img 
              key={item.id}
              src={item.image_url} 
              alt="Latest News" 
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
              style={{ opacity: index === newsIndex ? 1 : 0 }}
            />
          ))}
        </div>
        <div className="relative p-3">
          {newsItems.map((item, index) => (
            <div 
              key={`news-text-${item.id}`}
              className="transition-opacity duration-1000 ease-in-out"
              style={{ 
                opacity: index === newsIndex ? 1 : 0,
                position: index === newsIndex ? 'relative' : 'absolute',
                visibility: index === newsIndex ? 'visible' : 'hidden'
              }}
            >
              <h3 className="text-primary font-bebas text-sm uppercase tracking-wider mb-1">Latest News</h3>
              <p className="text-white/80 text-xs line-clamp-2">{item.title}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
