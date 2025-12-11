import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSubdomainInfo, getLanguageFromSubdomain } from '@/lib/subdomainUtils';
import { getLocalizedPath, reverseRouteMap } from '@/lib/localizedRoutes';

/**
 * Hook that redirects English paths to localized paths when on a language subdomain
 * e.g., fr.domain.com/players -> fr.domain.com/joueurs
 */
export const useLocalizedRedirect = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const info = getSubdomainInfo();
    
    // Only apply on language subdomains
    if (info.type !== 'language' || !info.subdomain) {
      return;
    }
    
    const languageCode = getLanguageFromSubdomain(info.subdomain);
    if (!languageCode || languageCode === 'en') {
      return;
    }
    
    const currentPath = location.pathname;
    
    // Extract base path for checking
    const basePath = '/' + currentPath.split('/').filter(Boolean)[0];
    
    // Check if the current path is an English path that should be localized
    const localizedPath = getLocalizedPath(basePath, languageCode);
    
    // If the localized path is different from the current path, redirect
    if (localizedPath !== basePath && currentPath.startsWith(basePath)) {
      // Preserve any additional path segments (e.g., /stars/player-name)
      const rest = currentPath.slice(basePath.length);
      const newPath = localizedPath + rest;
      
      // Only redirect if paths are actually different
      if (newPath !== currentPath) {
        navigate(newPath, { replace: true });
      }
    }
  }, [location.pathname, navigate]);
};
