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

// Hook specifically for translating news articles using BATCH translation
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
      
      // Collect all texts to translate and track which article/field they belong to
      const textsToTranslate: string[] = [];
      const textMap: { articleIndex: number; field: 'title' | 'excerpt' }[] = [];
      const cachedTranslations: { articleIndex: number; field: 'title' | 'excerpt'; value: string }[] = [];
      
      articles.forEach((article, articleIndex) => {
        // Check title cache
        const titleCacheKey = `translation_news_title_${article.id}_${language}`;
        const excerptCacheKey = `translation_news_excerpt_${article.id}_${language}`;
        
        try {
          const cachedTitle = localStorage.getItem(titleCacheKey);
          if (cachedTitle) {
            cachedTranslations.push({ articleIndex, field: 'title', value: cachedTitle });
          } else {
            textsToTranslate.push(article.title);
            textMap.push({ articleIndex, field: 'title' });
          }
        } catch {
          textsToTranslate.push(article.title);
          textMap.push({ articleIndex, field: 'title' });
        }
        
        // Check excerpt cache
        if (article.excerpt) {
          try {
            const cachedExcerpt = localStorage.getItem(excerptCacheKey);
            if (cachedExcerpt) {
              cachedTranslations.push({ articleIndex, field: 'excerpt', value: cachedExcerpt });
            } else {
              textsToTranslate.push(article.excerpt);
              textMap.push({ articleIndex, field: 'excerpt' });
            }
          } catch {
            textsToTranslate.push(article.excerpt);
            textMap.push({ articleIndex, field: 'excerpt' });
          }
        }
      });
      
      // Start with original articles
      const result = articles.map(a => ({ ...a })) as T[];
      
      // Apply cached translations
      cachedTranslations.forEach(({ articleIndex, field, value }) => {
        (result[articleIndex] as any)[field] = value;
      });
      
      // Batch translate uncached texts
      if (textsToTranslate.length > 0) {
        try {
          const { data, error } = await supabase.functions.invoke('ai-translate-batch', {
            body: { texts: textsToTranslate }
          });
          
          if (!error && data?.translations) {
            data.translations.forEach((translation: Record<string, string>, i: number) => {
              const mapping = textMap[i];
              const translatedText = translation[targetLang];
              if (translatedText) {
                (result[mapping.articleIndex] as any)[mapping.field] = translatedText;
                // Cache the translation
                const article = articles[mapping.articleIndex];
                const cacheKey = `translation_news_${mapping.field}_${article.id}_${language}`;
                try {
                  localStorage.setItem(cacheKey, translatedText);
                } catch {}
              }
            });
          }
        } catch (e) {
          console.error('Batch news translation failed:', e);
        }
      }
      
      setTranslatedArticles(result);
      setIsLoading(false);
    };

    translateArticles();
  }, [articles, language]);

  return { translatedArticles, isLoading };
}
