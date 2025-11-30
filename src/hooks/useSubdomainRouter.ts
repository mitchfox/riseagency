import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const subdomainRoutes: Record<string, string> = {
  'portal': '/portal',
  'scouts': '/scout-portal',
  'potential': '/potential',
  'players': '/players',
  'clubs': '/clubs',
  'agents': '/agents',
  'coaches': '/coaches'
};

// Language subdomains (don't trigger route redirects)
const languageSubdomains = ['es', 'pt', 'fr', 'de', 'it', 'pl', 'cs', 'cz', 'ru', 'tr'];

export const useSubdomainRouter = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    // For localhost or IP addresses, skip subdomain routing
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return;
    }
    
    // Determine the functional subdomain based on format:
    // www.portal.risefootballagency.com -> portal (parts[1])
    // www.es.risefootballagency.com -> es (language, ignore)
    // portal.risefootballagency.com -> portal (parts[0])
    // www.risefootballagency.com -> no subdomain
    
    let functionalSubdomain = '';
    
    if (parts[0].toLowerCase() === 'www' && parts.length >= 4) {
      // Format: www.{subdomain}.domain.com
      functionalSubdomain = parts[1].toLowerCase();
    } else if (parts[0].toLowerCase() !== 'www' && parts.length >= 3) {
      // Format: {subdomain}.domain.com
      functionalSubdomain = parts[0].toLowerCase();
    }
    
    // Skip if no subdomain or it's a language subdomain
    if (!functionalSubdomain || languageSubdomains.includes(functionalSubdomain)) {
      return;
    }
    
    // Check if this subdomain has a mapped route
    const targetRoute = subdomainRoutes[functionalSubdomain];
    
    if (targetRoute && location.pathname !== targetRoute) {
      navigate(targetRoute, { replace: true });
    }
  }, [navigate, location.pathname]);
};
