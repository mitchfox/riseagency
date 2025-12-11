import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getEnglishPath, getLocalizedPath } from '@/lib/localizedRoutes';
import { getSubdomainInfo, getLanguageFromSubdomain, isPreviewOrLocalEnvironment, ROLE_SUBDOMAINS } from '@/lib/subdomainUtils';

type LanguageCode = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'pl' | 'cs' | 'ru' | 'tr' | 'hr' | 'no';

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
  croatian: string | null;
  norwegian: string | null;
}

interface LanguageContextType {
  language: LanguageCode;
  translations: Map<string, string>;
  t: (key: string, fallback?: string) => string;
  isLoading: boolean;
  switchLanguage: (lang: LanguageCode) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

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
  'hr': 'hr',
  'no': 'no',
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
  'hr': 'croatian',
  'no': 'norwegian',
};

const validLanguages: LanguageCode[] = ['en', 'es', 'pt', 'fr', 'de', 'it', 'pl', 'cs', 'ru', 'tr', 'hr', 'no'];

function detectLanguageFromSubdomain(): LanguageCode | null {
  // For preview/local environments, return null to trigger auto-detection
  if (isPreviewOrLocalEnvironment()) {
    return null;
  }
  
  const info = getSubdomainInfo();
  
  // Skip role subdomains
  if (info.type === 'role') {
    return null;
  }
  
  // Check if it's a language subdomain
  if (info.type === 'language' && info.subdomain) {
    const langCode = getLanguageFromSubdomain(info.subdomain);
    if (langCode && validLanguages.includes(langCode as LanguageCode)) {
      return langCode as LanguageCode;
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
      // First check URL parameter (highest priority for testing)
      const urlParams = new URLSearchParams(window.location.search);
      const langParam = urlParams.get('lang');
      if (langParam && validLanguages.includes(langParam as LanguageCode)) {
        // Store in sessionStorage so it persists during navigation
        sessionStorage.setItem('url_language_override', langParam);
        setLanguage(langParam as LanguageCode);
        setIsInitialized(true);
        return;
      }
      
      // Check if we have a session override from URL param
      const sessionOverride = sessionStorage.getItem('url_language_override');
      if (sessionOverride && validLanguages.includes(sessionOverride as LanguageCode)) {
        setLanguage(sessionOverride as LanguageCode);
        setIsInitialized(true);
        return;
      }
      
      // Then check subdomain
      const subdomainLang = detectLanguageFromSubdomain();
      
      if (subdomainLang) {
        // Subdomain explicitly sets language
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
      console.log('[Translation] Fetching translations for language:', language);
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
        console.log('[Translation] Using column:', column, 'for language:', language);
        const translationMap = new Map<string, string>();

        data?.forEach((row: Translation) => {
          // Handle case where text_key already includes page_name prefix
          const textKey = row.text_key;
          const pageName = row.page_name;
          
          // If text_key already starts with page_name., don't duplicate
          const key = textKey.startsWith(`${pageName}.`) 
            ? textKey 
            : `${pageName}.${textKey}`;
          
          const value = row[column] as string | null;
          // Fall back to English if translation is missing
          translationMap.set(key, value || row.english || '');
        });

        console.log('[Translation] Loaded', translationMap.size, 'translations. Sample keys:', Array.from(translationMap.keys()).slice(0, 5));
        console.log('[Translation] Sample: landing.nav_players =', translationMap.get('landing.nav_players'));
        
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

    const info = getSubdomainInfo(hostname);
    const baseDomain = info.baseDomain;
    
    // Check if we're on a role subdomain
    let currentRoleSubdomain: string | null = null;
    if (info.type === 'role' && info.subdomain) {
      currentRoleSubdomain = info.subdomain;
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
    if (currentRoleSubdomain && ROLE_SUBDOMAINS.includes(currentRoleSubdomain as any)) {
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
