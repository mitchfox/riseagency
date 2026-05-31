import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getEnglishPath, getLocalizedPath } from '@/lib/localizedRoutes';
import { getSubdomainInfo, getLanguageFromSubdomain, isPreviewOrLocalEnvironment, ROLE_SUBDOMAINS } from '@/lib/subdomainUtils';
import { PageLoading } from '@/components/LoadingSpinner';

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

  // Initialize language on mount.
  // CRITICAL: this must NEVER block on a network call. Anything that requires
  // an edge-function round-trip (IP geolocation) is fired-and-forgotten in
  // the background and `setLanguage` is called when it resolves — so the
  // page renders translations on the very first React tick.
  useEffect(() => {
    // 1. URL ?lang= param (highest priority — testing / direct links)
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang');
    if (langParam && validLanguages.includes(langParam as LanguageCode)) {
      sessionStorage.setItem('url_language_override', langParam);
      // Persist as a host-scoped preference so future visits to this
      // origin (without ?lang=) don't fall back to IP detection.
      try {
        const base = getSubdomainInfo().baseDomain;
        localStorage.setItem(
          'preferred_language',
          JSON.stringify({ lang: langParam, host: base })
        );
      } catch {}
      setLanguage(langParam as LanguageCode);
      setIsInitialized(true);
      return;
    }

    const sessionOverride = sessionStorage.getItem('url_language_override');
    if (sessionOverride && validLanguages.includes(sessionOverride as LanguageCode)) {
      setLanguage(sessionOverride as LanguageCode);
      setIsInitialized(true);
      return;
    }

    // 2. Subdomain — synchronous, no flash
    const subdomainLang = detectLanguageFromSubdomain();
    if (subdomainLang) {
      setLanguage(subdomainLang);
      setIsInitialized(true);
      return;
    }

    // 3. Saved preference (stored as plain string OR {lang, host} JSON)
    let savedLang: LanguageCode | null = null;
    let savedHost: string | null = null;
    try {
      const raw = localStorage.getItem('preferred_language');
      if (raw) {
        if (raw.startsWith('{')) {
          const parsed = JSON.parse(raw);
          if (parsed?.lang && validLanguages.includes(parsed.lang)) {
            savedLang = parsed.lang as LanguageCode;
            savedHost = parsed.host || null;
          }
        } else if (validLanguages.includes(raw as LanguageCode)) {
          savedLang = raw as LanguageCode;
        }
      }
    } catch {}

    // Honour saved preference only when it was made on this same base domain
    // (or when no host is recorded — legacy format).
    const currentBase = (() => {
      try { return getSubdomainInfo().baseDomain; } catch { return ''; }
    })();
    if (savedLang && (!savedHost || savedHost === currentBase)) {
      setLanguage(savedLang);
      setIsInitialized(true);
      return;
    }

    // 4. Cached IP detection from this session — instant
    const sessionDetected = sessionStorage.getItem('ip_language_detected');
    if (sessionDetected && validLanguages.includes(sessionDetected as LanguageCode)) {
      setLanguage(sessionDetected as LanguageCode);
      setIsInitialized(true);
      return;
    }

    // 5. Nothing known — render English immediately and detect IP in the
    //    background. If detection returns a different language, switch to it.
    setLanguage('en');
    setIsInitialized(true);
    detectLanguageFromIP()
      .then((detected) => {
        try { sessionStorage.setItem('ip_language_detected', detected); } catch {}
        if (detected && detected !== 'en' && validLanguages.includes(detected)) {
          setLanguage(detected);
        }
      })
      .catch(() => { /* keep English */ });
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    
    async function fetchTranslations() {
      console.log('[Translation] Fetching translations for language:', language);
      setIsLoading(true);
      setTranslationsLoaded(false);
      try {
        // Fetch all translations in batches to bypass 1000-row PostgREST limit
        const PAGE_SIZE = 1000;
        let allData: Translation[] = [];
        let from = 0;
        let hasMore = true;

        while (hasMore) {
          const { data: batch, error: batchError } = await supabase
            .from('translations')
            .select('*')
            .range(from, from + PAGE_SIZE - 1);

          if (batchError) {
            console.error('Error fetching translations batch:', batchError);
            break;
          }

          if (batch && batch.length > 0) {
            allData = allData.concat(batch as Translation[]);
            from += PAGE_SIZE;
            hasMore = batch.length === PAGE_SIZE;
          } else {
            hasMore = false;
          }
        }

        const data = allData;
        const error = null;

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

          const localizedValue = row[column] as string | null;
          const englishValue = row.english || '';
          const candidate = localizedValue || englishValue;

          // Prevent duplicate-key rows with missing localized content from overwriting
          // an already-localized value with English fallback.
          const existing = translationMap.get(key);
          if (!existing) {
            translationMap.set(key, candidate);
            return;
          }

          const existingIsEnglishFallback = existing === englishValue;
          const candidateIsLocalized = !!localizedValue;

          // Only replace when the new row provides a true localized value and current is fallback.
          if (candidateIsLocalized && existingIsEnglishFallback) {
            translationMap.set(key, candidate);
          }
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

    // User made an explicit choice — persist a host-scoped preference so
    // the /representation geo-redirect on a DIFFERENT base domain can still
    // honour the visitor's location.
    const info = getSubdomainInfo(hostname);
    try {
      localStorage.setItem(
        'preferred_language',
        JSON.stringify({ lang, host: info.baseDomain })
      );
      // Mark the destination host as already-resolved so the redirect IIFE
      // there doesn't fire on next load.
      const targetSub = languageUrlSubdomains[lang];
      const targetHost = targetSub ? `${targetSub}.${info.baseDomain}` : info.baseDomain;
      sessionStorage.setItem('rep_redirected_for:' + info.baseDomain, '1');
      sessionStorage.setItem('rep_redirected_for:' + targetHost, '1');
    } catch {}
    
    // Convert current path to English, then to the target language
    const englishPath = getEnglishPath(pathname);
    const localizedPath = getLocalizedPath(englishPath, lang);
    
    // For preview/localhost environments, use localStorage and navigate
    if (isPreviewOrLocalEnvironment()) {
      sessionStorage.setItem('ip_language_detected', lang); // Override IP detection
      // Use window.location to ensure full page reload with new language
      if (pathname !== localizedPath) {
        window.location.href = localizedPath;
      } else {
        setLanguage(lang);
      }
      return;
    }

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
    // Append ?lang=xx so the destination origin (which has its own,
    // separate localStorage) honours the user's explicit choice on first
    // load instead of falling through to IP detection.
    const sep = finalPath.includes('?') ? '&' : '?';
    window.location.href = `${newUrl}${sep}lang=${lang}`;
  }, []);

  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isRepresentationRoute = pathname === '/representation' || pathname === '/request-representation';

  // Memoise the provider value so every consumer doesn't re-render on every
  // parent render — context value identity is what triggers re-renders.
  const contextValue = useMemo(
    () => ({ language, translations, t, isLoading, switchLanguage }),
    [language, translations, t, isLoading, switchLanguage]
  );

  if (isRepresentationRoute) {
    return (
      <LanguageContext.Provider value={contextValue}>
        {children}
      </LanguageContext.Provider>
    );
  }

  // Don't render children until language is initialized AND translations are loaded
  if (!isInitialized || !translationsLoaded) {
    return <PageLoading />;
  }

  return (
    <LanguageContext.Provider value={contextValue}>
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
