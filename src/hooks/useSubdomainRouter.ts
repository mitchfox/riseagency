import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Role subdomains - these are handled by the Home component at root path
const roleSubdomains = ['portal', 'scouts', 'potential', 'players', 'clubs', 'agents', 'coaches', 'media', 'business'];

// Language subdomains (don't trigger route redirects)
const languageSubdomains = ['es', 'pt', 'fr', 'de', 'it', 'pl', 'cs', 'cz', 'ru', 'tr'];

const getSubdomain = (): string | null => {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  // For localhost or IP addresses, skip subdomain routing
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }
  
  let functionalSubdomain = '';
  
  if (parts[0].toLowerCase() === 'www' && parts.length >= 4) {
    // Format: www.{subdomain}.domain.com
    functionalSubdomain = parts[1].toLowerCase();
  } else if (parts[0].toLowerCase() !== 'www' && parts.length >= 3) {
    // Format: {subdomain}.domain.com
    functionalSubdomain = parts[0].toLowerCase();
  }
  
  if (!functionalSubdomain || languageSubdomains.includes(functionalSubdomain)) {
    return null;
  }
  
  return functionalSubdomain;
};

export const useSubdomainRouter = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const subdomain = getSubdomain();
    
    // If we're on a role subdomain, don't do any navigation
    // The Home component handles rendering the correct page at root
    if (subdomain && roleSubdomains.includes(subdomain)) {
      return;
    }
    
    // No navigation needed - subdomain-based content is handled by Home component
  }, [navigate, location.pathname]);
};
