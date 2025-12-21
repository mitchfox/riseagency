import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

type LanguageCode = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'pl' | 'cs' | 'ru' | 'tr' | 'hr' | 'no';

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
  'hr': 'croatian',
  'no': 'norwegian',
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

    const targetLang = languageColumnMap[language as LanguageCode];
    
    // Check memory cache first
    const cacheKey = `${contentId}`;
    const cached = translationCache.get(cacheKey);
    if (cached && cached[targetLang]) {
      return cached[targetLang];
    }

    // Check localStorage cache
    const localCacheKey = `translation_${contentId}`;
    try {
      const localCached = localStorage.getItem(localCacheKey);
      if (localCached) {
        const parsed = JSON.parse(localCached);
        if (parsed[targetLang]) {
          translationCache.set(cacheKey, parsed);
          return parsed[targetLang];
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }

    // Query translations database first - parse contentId to get page_name and text_key
    // Format: "page_name:text_key" or just use as text_key
    setIsTranslating(true);
    try {
      const [pageName, textKey] = contentId.includes(':') 
        ? contentId.split(':') 
        : ['general', contentId];
      
      const { data: dbTranslation, error: dbError } = await supabase
        .from('translations')
        .select('*')
        .eq('page_name', pageName)
        .eq('text_key', textKey)
        .maybeSingle();

      if (!dbError && dbTranslation && dbTranslation[targetLang]) {
        // Found in database - cache and return
        const translationData = {
          english: dbTranslation.english,
          spanish: dbTranslation.spanish,
          portuguese: dbTranslation.portuguese,
          french: dbTranslation.french,
          german: dbTranslation.german,
          italian: dbTranslation.italian,
          polish: dbTranslation.polish,
          czech: dbTranslation.czech,
          russian: dbTranslation.russian,
          turkish: dbTranslation.turkish,
          croatian: dbTranslation.croatian,
          norwegian: dbTranslation.norwegian,
        };
        
        translationCache.set(cacheKey, translationData);
        try {
          localStorage.setItem(localCacheKey, JSON.stringify(translationData));
        } catch (e) {
          // Ignore localStorage errors
        }
        
        return dbTranslation[targetLang] as string;
      }

      // Not found in database - return original text (no AI fallback)
      console.log(`Translation not found in database for: ${pageName}:${textKey}`);
      return text;
    } catch (err) {
      console.error('Translation lookup failed:', err);
      return text;
    } finally {
      setIsTranslating(false);
    }
  }, [language]);

  return { translateText, isTranslating, language };
}

// Hook specifically for translating news articles - uses database first
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
      
      // Try to get translations from database for all articles
      const articleIds = articles.map(a => a.id);
      
      try {
        // Query translations table for news articles
        const { data: dbTranslations, error: dbError } = await supabase
          .from('translations')
          .select('*')
          .eq('page_name', 'news')
          .in('text_key', articleIds.flatMap(id => [`${id}_title`, `${id}_excerpt`]));

        const result = articles.map(article => {
          const copy = { ...article } as T;
          
          if (!dbError && dbTranslations) {
            // Look for title translation
            const titleTrans = dbTranslations.find(t => t.text_key === `${article.id}_title`);
            if (titleTrans && titleTrans[targetLang]) {
              (copy as any).title = titleTrans[targetLang];
            }
            
            // Look for excerpt translation
            const excerptTrans = dbTranslations.find(t => t.text_key === `${article.id}_excerpt`);
            if (excerptTrans && excerptTrans[targetLang]) {
              (copy as any).excerpt = excerptTrans[targetLang];
            }
          }
          
          return copy;
        });
        
        setTranslatedArticles(result);
      } catch (e) {
        console.error('News translation lookup failed:', e);
        setTranslatedArticles(articles);
      } finally {
        setIsLoading(false);
      }
    };

    translateArticles();
  }, [articles, language]);

  return { translatedArticles, isLoading };
}
