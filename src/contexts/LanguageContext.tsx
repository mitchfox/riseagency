import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type LanguageCode = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'pl' | 'cs' | 'ru' | 'tr';

interface Translation {
  page_name: string;
  text_key: string;
  english: string | null;
  spanish: string | null;
  portuguese: string | null;
  french: string | null;
  german: string | null;
  italian: string | null;
  polish: string | null;
  czech: string | null;
  russian: string | null;
  turkish: string | null;
}

interface LanguageContextType {
  language: LanguageCode;
  translations: Map<string, string>;
  t: (key: string, fallback?: string) => string;
  isLoading: boolean;
  switchLanguage: (lang: LanguageCode) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const languageSubdomains: Record<string, LanguageCode> = {
  'es': 'es',
  'pt': 'pt',
  'fr': 'fr',
  'de': 'de',
  'it': 'it',
  'pl': 'pl',
  'cs': 'cs',
  'cz': 'cs', // DNS uses 'cz' for Czech
  'ru': 'ru',
  'tr': 'tr',
};

// URL subdomains to use (matching DNS records)
const languageUrlSubdomains: Record<LanguageCode, string> = {
  'en': '',
  'es': 'es',
  'pt': 'pt',
  'fr': 'fr',
  'de': 'de',
  'it': 'it',
  'pl': 'pl',
  'cs': 'cz', // DNS uses 'cz' for Czech
  'ru': 'ru',
  'tr': 'tr',
};

const languageColumns: Record<LanguageCode, keyof Translation> = {
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

function isPreviewOrLocalEnvironment(): boolean {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || 
         /^\d+\.\d+\.\d+\.\d+$/.test(hostname) ||
         hostname.includes('lovable.app') ||
         hostname.includes('lovableproject.com');
}

function detectLanguageFromSubdomain(): LanguageCode {
  const hostname = window.location.hostname;
  
  // For localhost, IP addresses, or preview environments, check localStorage
  if (isPreviewOrLocalEnvironment()) {
    const stored = localStorage.getItem('preferred_language');
    if (stored && ['en', 'es', 'pt', 'fr', 'de', 'it', 'pl', 'cs', 'ru', 'tr'].includes(stored)) {
      return stored as LanguageCode;
    }
    return 'en';
  }
  
  const parts = hostname.split('.');
  
  // Check format: es.risefootballagency.com (language subdomain first)
  if (parts.length >= 2) {
    const potentialLang = parts[0].toLowerCase();
    if (languageSubdomains[potentialLang]) {
      return languageSubdomains[potentialLang];
    }
  }
  
  return 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<LanguageCode>(() => detectLanguageFromSubdomain());
  const [translations, setTranslations] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTranslations() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('translations')
          .select('*');

        if (error) {
          console.error('Error fetching translations:', error);
          return;
        }

        const column = languageColumns[language];
        const translationMap = new Map<string, string>();

        data?.forEach((row: Translation) => {
          const key = `${row.page_name}.${row.text_key}`;
          const value = row[column] as string | null;
          // Fall back to English if translation is missing
          translationMap.set(key, value || row.english || '');
        });

        setTranslations(translationMap);
      } catch (err) {
        console.error('Failed to fetch translations:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTranslations();
  }, [language]);

  const t = useCallback((key: string, fallback?: string): string => {
    return translations.get(key) || fallback || key;
  }, [translations]);

  const switchLanguage = useCallback((lang: LanguageCode) => {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    const protocol = window.location.protocol;
    
    // For preview/localhost environments, use localStorage and update state
    if (isPreviewOrLocalEnvironment()) {
      localStorage.setItem('preferred_language', lang);
      setLanguage(lang);
      return;
    }

    const parts = hostname.split('.');
    let baseDomain: string;

    // Check if first part is a language subdomain
    if (languageSubdomains[parts[0].toLowerCase()]) {
      // Format: es.domain.com -> remove the language part
      baseDomain = parts.slice(1).join('.');
    } else {
      baseDomain = hostname;
    }

    // Build new URL - format: es.risefootballagency.com (matching DNS records)
    let newHostname: string;
    if (lang === 'en') {
      // English uses the base domain (no language subdomain)
      newHostname = baseDomain;
    } else {
      // Other languages: es.risefootballagency.com
      const urlSubdomain = languageUrlSubdomains[lang];
      newHostname = `${urlSubdomain}.${baseDomain}`;
    }

    const newUrl = `${protocol}//${newHostname}${pathname}`;
    window.location.href = newUrl;
  }, []);

  return (
    <LanguageContext.Provider value={{ language, translations, t, isLoading, switchLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
