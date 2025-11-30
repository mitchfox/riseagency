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
}

export function useAutoTranslate({ title, excerpt, content, enabled = true }: UseAutoTranslateOptions) {
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
      try {
        // Combine all text with markers for splitting later
        const combinedText = `[TITLE]${title}[/TITLE][EXCERPT]${excerpt || ''}[/EXCERPT][CONTENT]${content}[/CONTENT]`;
        
        const { data, error } = await supabase.functions.invoke('ai-translate', {
          body: { text: combinedText }
        });

        if (error) throw error;

        // Get the translation for current language
        const langMap: Record<string, string> = {
          'es': 'spanish',
          'pt': 'portuguese',
          'fr': 'french',
          'de': 'german',
          'it': 'italian',
          'pl': 'polish',
          'cs': 'czech',
          'ru': 'russian',
          'tr': 'turkish'
        };
        
        const translationKey = langMap[language];
        const translatedText = data?.[translationKey] || combinedText;

        // Parse back the translated content
        const titleMatch = translatedText.match(/\\\\[TITLE\\\\](.*?)\\\\[\\\\/TITLE\\\\]/s);
        const excerptMatch = translatedText.match(/\\\\[EXCERPT\\\\](.*?)\\\\[\\\\/EXCERPT\\\\]/s);
        const contentMatch = translatedText.match(/\\\\[CONTENT\\\\](.*?)\\\\[\\\\/CONTENT\\\\]/s);

        setTranslatedContent({
          title: titleMatch?.[1] || title,
          excerpt: excerptMatch?.[1] || excerpt || '',
          content: contentMatch?.[1] || content,
        });
      } catch (err) {
        console.error('Translation error:', err);
        // Keep original content on error
        setTranslatedContent({ title, excerpt: excerpt || '', content });
      } finally {
        setIsTranslating(false);
      }
    };

    translateContent();
  }, [title, excerpt, content, language, enabled]);

  return { translatedContent, isTranslating };
}
