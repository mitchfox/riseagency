import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

type LanguageCode = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'pl' | 'cs' | 'ru' | 'tr';

const languageColumnMap: Record<LanguageCode, string> = {
  'en': 'english',
  'es': 'spanish',
  'pt': 'portuguese',
  'fr': 'french',
  'de': 'german',
  'it': 'italian',
  'pl': 'polish',
  'cs': 'czech',
  'ru': 'russian',
  'tr': 'turkish',
};

// Cache translations in memory to avoid re-fetching
const translationCache = new Map<string, Record<string, string>>();

export function useTranslateContent() {
  const { language } = useLanguage();
  const [isTranslating, setIsTranslating] = useState(false);

  const translateText = useCallback(async (text: string, contentId: string): Promise<string> => {
    // Return original for English
    if (language === 'en') {
      return text;
    }

    // Check cache first
    const cacheKey = `${contentId}`;
    const cached = translationCache.get(cacheKey);
    if (cached && cached[languageColumnMap[language as LanguageCode]]) {
      return cached[languageColumnMap[language as LanguageCode]];
    }

    // Check localStorage cache
    const localCacheKey = `translation_${contentId}`;
    try {
      const localCached = localStorage.getItem(localCacheKey);
      if (localCached) {
        const parsed = JSON.parse(localCached);
        const targetLang = languageColumnMap[language as LanguageCode];
        if (parsed[targetLang]) {
          translationCache.set(cacheKey, parsed);
          return parsed[targetLang];
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }

    // Fetch translation from AI
    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-translate', {
        body: { text }
      });

      if (error) {
        console.error('Translation error:', error);
        return text;
      }

      // Cache the result
      translationCache.set(cacheKey, data);
      try {
        localStorage.setItem(localCacheKey, JSON.stringify(data));
      } catch (e) {
        // Ignore localStorage errors
      }

      const targetLang = languageColumnMap[language as LanguageCode];
      return data[targetLang] || text;
    } catch (err) {
      console.error('Translation failed:', err);
      return text;
    } finally {
      setIsTranslating(false);
    }
  }, [language]);

  return { translateText, isTranslating, language };
}

// Hook specifically for translating news articles
export function useTranslatedNews<T extends { id: string; title: string; excerpt: string | null }>(articles: T[]) {
  const { language } = useLanguage();
  const [translatedArticles, setTranslatedArticles] = useState<T[]>(articles);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (language === 'en' || articles.length === 0) {
      setTranslatedArticles(articles);
      return;
    }

    const translateArticles = async () => {
      setIsLoading(true);
      const targetLang = languageColumnMap[language as LanguageCode];
      
      const translated = await Promise.all(
        articles.map(async (article) => {
          // Check cache first
          const titleCacheKey = `translation_news_title_${article.id}`;
          const excerptCacheKey = `translation_news_excerpt_${article.id}`;
          
          let translatedTitle = article.title;
          let translatedExcerpt = article.excerpt;

          // Try to get cached title
          try {
            const cachedTitle = localStorage.getItem(titleCacheKey);
            if (cachedTitle) {
              const parsed = JSON.parse(cachedTitle);
              if (parsed[targetLang]) {
                translatedTitle = parsed[targetLang];
              } else {
                // Fetch new translation
                const { data } = await supabase.functions.invoke('ai-translate', {
                  body: { text: article.title }
                });
                if (data?.[targetLang]) {
                  translatedTitle = data[targetLang];
                  localStorage.setItem(titleCacheKey, JSON.stringify(data));
                }
              }
            } else {
              // Fetch new translation
              const { data } = await supabase.functions.invoke('ai-translate', {
                body: { text: article.title }
              });
              if (data?.[targetLang]) {
                translatedTitle = data[targetLang];
                localStorage.setItem(titleCacheKey, JSON.stringify(data));
              }
            }
          } catch (e) {
            // Use original on error
          }

          // Try to get cached excerpt
          if (article.excerpt) {
            try {
              const cachedExcerpt = localStorage.getItem(excerptCacheKey);
              if (cachedExcerpt) {
                const parsed = JSON.parse(cachedExcerpt);
                if (parsed[targetLang]) {
                  translatedExcerpt = parsed[targetLang];
                } else {
                  const { data } = await supabase.functions.invoke('ai-translate', {
                    body: { text: article.excerpt }
                  });
                  if (data?.[targetLang]) {
                    translatedExcerpt = data[targetLang];
                    localStorage.setItem(excerptCacheKey, JSON.stringify(data));
                  }
                }
              } else {
                const { data } = await supabase.functions.invoke('ai-translate', {
                  body: { text: article.excerpt }
                });
                if (data?.[targetLang]) {
                  translatedExcerpt = data[targetLang];
                  localStorage.setItem(excerptCacheKey, JSON.stringify(data));
                }
              }
            } catch (e) {
              // Use original on error
            }
          }

          return {
            ...article,
            title: translatedTitle,
            excerpt: translatedExcerpt
          } as T;
        })
      );

      setTranslatedArticles(translated);
      setIsLoading(false);
    };

    translateArticles();
  }, [articles, language]);

  return { translatedArticles, isLoading };
}
