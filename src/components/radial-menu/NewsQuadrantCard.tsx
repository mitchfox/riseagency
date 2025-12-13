import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NewsItem {
  id: string;
  title: string;
  image_url: string;
}

export const NewsQuadrantCard = () => {
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
    <div className="absolute inset-0 flex items-center justify-center animate-[fade-in_0.3s_ease-out_forwards]">
      {/* Full quadrant background with news image */}
      {newsItems.map((item, index) => (
        <div
          key={item.id}
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{ opacity: index === newsIndex ? 1 : 0 }}
        >
          <img 
            src={item.image_url} 
            alt="Latest News" 
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay - from bottom-left corner */}
          <div className="absolute inset-0 bg-gradient-to-tr from-black/90 via-black/50 to-transparent" />
        </div>
      ))}
      
      {/* Content overlay - positioned in the outer corner away from center */}
      <div className="absolute bottom-4 left-4 text-left space-y-3 max-w-[40%]">
        {/* Label */}
        <div className="inline-block bg-primary px-4 py-1">
          <span className="text-sm font-bebas uppercase tracking-wider text-black">Latest News</span>
        </div>
        
        {/* News title */}
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
            <h3 className="text-2xl font-bebas uppercase text-white tracking-wider leading-tight">{item.title}</h3>
          </div>
        ))}
      </div>
    </div>
  );
};