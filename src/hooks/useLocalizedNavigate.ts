import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLocalizedPath } from '@/lib/localizedRoutes';
import { getSubdomainInfo, getLanguageFromSubdomain } from '@/lib/subdomainUtils';

export function useLocalizedNavigate() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const localizedNavigate = (path: string, options?: { replace?: boolean }) => {
    // Prefer the subdomain language so the very first click on a localised
    // subdomain (e.g. pl.) never falls back to the English path while the
    // language context is still initialising.
    let lang = language;
    try {
      const info = getSubdomainInfo();
      if (info.type === 'language' && info.subdomain) {
        const fromSub = getLanguageFromSubdomain(info.subdomain);
        if (fromSub) lang = fromSub as typeof language;
      }
    } catch {}
    const localizedPath = getLocalizedPath(path, lang);
    navigate(localizedPath, options);
  };

  return localizedNavigate;
}
