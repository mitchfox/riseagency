import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface TranslatedContent {
  title: string;
  excerpt: string;
  content: string;
}

interface UseAutoTranslateOptions {
  title: string;
  excerpt?: string | null;
  content: string;
  enabled?: boolean;
  pageKey?: string; // Optional key to look up in translations table
}

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

export function useAutoTranslate({ title, excerpt, content, enabled = true, pageKey }: UseAutoTranslateOptions) {
  const { language } = useLanguage();
  const [translatedContent, setTranslatedContent] = useState<TranslatedContent>({
    title,
    excerpt: excerpt || '',
    content,
  });
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    // Reset to original when language is English or translation disabled
    if (language === 'en' || !enabled) {
      setTranslatedContent({ title, excerpt: excerpt || '', content });
      return;
    }

    const translateContent = async () => {
      setIsTranslating(true);
      const targetLang = languageColumnMap[language as LanguageCode];
      
      try {
        // If pageKey is provided, try to look up translations from database
        if (pageKey) {
          const keys = [
            `${pageKey}_title`,
            `${pageKey}_excerpt`,
            `${pageKey}_content`,
          ];
          
          const { data: dbTranslations, error } = await supabase
            .from('translations')
            .select('*')
            .in('text_key', keys);

          if (!error && dbTranslations && dbTranslations.length > 0) {
            const titleTrans = dbTranslations.find(t => t.text_key === `${pageKey}_title`);
            const excerptTrans = dbTranslations.find(t => t.text_key === `${pageKey}_excerpt`);
            const contentTrans = dbTranslations.find(t => t.text_key === `${pageKey}_content`);

            setTranslatedContent({
              title: (titleTrans && titleTrans[targetLang]) || title,
              excerpt: (excerptTrans && excerptTrans[targetLang]) || excerpt || '',
              content: (contentTrans && contentTrans[targetLang]) || content,
            });
            setIsTranslating(false);
            return;
          }
        }

        // No database translation found - keep original content
        console.log(`No translation found in database for: ${pageKey || 'unknown'}`);
        setTranslatedContent({ title, excerpt: excerpt || '', content });
      } catch (err) {
        console.error('Translation lookup error:', err);
        setTranslatedContent({ title, excerpt: excerpt || '', content });
      } finally {
        setIsTranslating(false);
      }
    };

    translateContent();
  }, [title, excerpt, content, language, enabled, pageKey]);

  return { translatedContent, isTranslating };
}
