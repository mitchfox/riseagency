import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getEnglishPath, getLocalizedPath } from '@/lib/localizedRoutes';

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

// Role subdomains that should NOT be treated as language subdomains
const roleSubdomains = ['players', 'clubs', 'scouts', 'agents', 'coaches', 'media', 'business'];

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

const validLanguages: LanguageCode[] = ['en', 'es', 'pt', 'fr', 'de', 'it', 'pl', 'cs', 'ru', 'tr'];

function isPreviewOrLocalEnvironment(): boolean {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || 
         /^\d+\.\d+\.\d+\.\d+$/.test(hostname) ||
         hostname.includes('lovable.app') ||
         hostname.includes('lovableproject.com');
}

function detectLanguageFromSubdomain(): LanguageCode | null {
  const hostname = window.location.hostname;
  
  // For localhost, IP addresses, or preview environments, return null to trigger auto-detection
  if (isPreviewOrLocalEnvironment()) {
    return null;
  }
  
  const parts = hostname.split('.');
  
  // Check format: es.risefootballagency.com (language subdomain first)
  // Skip role subdomains like players.risefootballagency.com
  if (parts.length >= 2) {
    const potentialLang = parts[0].toLowerCase();
    // Skip if it's a role subdomain
    if (roleSubdomains.includes(potentialLang)) {
      return null;
    }
    if (languageSubdomains[potentialLang]) {
      return languageSubdomains[potentialLang];
    }
  }
  
  // No language subdomain found - return null to trigger auto-detection
  return null;
}

async function detectLanguageFromIP(): Promise<LanguageCode> {
  try {
    const { data, error } = await supabase.functions.invoke('detect-language');
    
    if (error) {
      console.error('Language detection error:', error);
      return 'en';
    }
    
    const detectedLang = data?.language;
    if (detectedLang && validLanguages.includes(detectedLang as LanguageCode)) {
      return detectedLang as LanguageCode;
    }
    
    return 'en';
  } catch (err) {
    console.error('Failed to detect language from IP:', err);
    return 'en';
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [translations, setTranslations] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [translationsLoaded, setTranslationsLoaded] = useState(false);

  // Initialize language on mount
  useEffect(() => {
    async function initializeLanguage() {
      console.log('LanguageContext: Starting language initialization...');
      console.log('LanguageContext: Hostname:', window.location.hostname);
      
      // First check subdomain
      const subdomainLang = detectLanguageFromSubdomain();
      console.log('LanguageContext: Detected subdomain language:', subdomainLang);
      
      if (subdomainLang) {
        // Subdomain explicitly sets language
        console.log('LanguageContext: Setting language from subdomain:', subdomainLang);
        setLanguage(subdomainLang);
        setIsInitialized(true);
        return;
      }
      
      // For preview/local environments, check stored preference first
      if (isPreviewOrLocalEnvironment()) {
        const stored = localStorage.getItem('preferred_language');
        if (stored && validLanguages.includes(stored as LanguageCode)) {
          setLanguage(stored as LanguageCode);
          setIsInitialized(true);
          return;
        }
        
        // Check if we've already done IP detection this session
        const sessionDetected = sessionStorage.getItem('ip_language_detected');
        if (sessionDetected && validLanguages.includes(sessionDetected as LanguageCode)) {
          setLanguage(sessionDetected as LanguageCode);
          setIsInitialized(true);
          return;
        }
      }
      
      // No subdomain and no stored preference - detect from IP
      const detectedLang = await detectLanguageFromIP();
      
      // Store in session so we don't re-detect on every page load
      if (isPreviewOrLocalEnvironment()) {
        sessionStorage.setItem('ip_language_detected', detectedLang);
      }
      
      setLanguage(detectedLang);
      setIsInitialized(true);
    }
    
    initializeLanguage();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    
    async function fetchTranslations() {
      setIsLoading(true);
      setTranslationsLoaded(false);
      try {
        const { data, error } = await supabase
          .from('translations')
          .select('*');

        if (error) {
          console.error('Error fetching translations:', error);
          // Still mark as loaded to prevent infinite loading
          setTranslationsLoaded(true);
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
        setTranslationsLoaded(true);
      } catch (err) {
        console.error('Failed to fetch translations:', err);
        setTranslationsLoaded(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTranslations();
  }, [language, isInitialized]);

  const t = useCallback((key: string, fallback?: string): string => {
    return translations.get(key) || fallback || key;
  }, [translations]);

  const switchLanguage = useCallback((lang: LanguageCode) => {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    const protocol = window.location.protocol;
    
    // Convert current path to English, then to the target language
    const englishPath = getEnglishPath(pathname);
    const localizedPath = getLocalizedPath(englishPath, lang);
    
    // For preview/localhost environments, use localStorage and navigate
    if (isPreviewOrLocalEnvironment()) {
      localStorage.setItem('preferred_language', lang);
      sessionStorage.setItem('ip_language_detected', lang); // Override IP detection
      // Use window.location to ensure full page reload with new language
      if (pathname !== localizedPath) {
        window.location.href = localizedPath;
      } else {
        setLanguage(lang);
      }
      return;
    }

    const parts = hostname.split('.');
    
    // Extract base domain using the same reliable approach as role subdomains
    // Always take the last 2 parts: risefootballagency.com
    const baseDomain = parts.slice(-2).join('.');
    
    // Check if we're on a role subdomain by looking at parts before the base domain
    let currentRoleSubdomain: string | null = null;
    for (const part of parts.slice(0, -2)) {
      const lowerPart = part.toLowerCase();
      if (lowerPart === 'www') continue;
      if (roleSubdomains.includes(lowerPart)) {
        currentRoleSubdomain = lowerPart;
        break;
      }
    }

    // Build new hostname
    let newHostname: string;
    if (lang === 'en') {
      // English: just the base domain (no language subdomain)
      newHostname = baseDomain;
    } else {
      // Other languages: language.basedomain (e.g., es.risefootballagency.com)
      const urlSubdomain = languageUrlSubdomains[lang];
      newHostname = `${urlSubdomain}.${baseDomain}`;
    }

    // If we were on a role subdomain, convert it to a path and translate it
    // e.g., players.risefootballagency.com → es.risefootballagency.com/jugadoras
    let finalPath = localizedPath;
    if (currentRoleSubdomain) {
      // Translate the role subdomain to a localized path
      const roleAsEnglishPath = `/${currentRoleSubdomain}`;
      const localizedRolePath = getLocalizedPath(roleAsEnglishPath, lang);
      
      // If user was at root of role subdomain, use the localized role path
      if (localizedPath === '/' || localizedPath === '') {
        finalPath = localizedRolePath;
      } else {
        // Append the current localized path to the localized role path
        finalPath = `${localizedRolePath}${localizedPath}`;
      }
    }

    const newUrl = `${protocol}//${newHostname}${finalPath}`;
    window.location.href = newUrl;
  }, []);

  // Don't render children until language is initialized AND translations are loaded
  if (!isInitialized || !translationsLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
