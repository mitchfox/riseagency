import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const subdomainRoutes: Record<string, string> = {
  'portal': '/portal',
  'scouts': '/scout-portal',
  'potential': '/potential',
  'players': '/players',
  'clubs': '/clubs',
  'agents': '/agents'
};

// Subdomains to ignore (treat as main domain)
const ignoredSubdomains = ['www', 'localhost', ''];

export const useSubdomainRouter = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hostname = window.location.hostname;
    
    // Extract subdomain from hostname
    // e.g., "portal.risefootballagency.com" → "portal"
    const parts = hostname.split('.');
    
    // For localhost or IP addresses, skip subdomain routing
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return;
    }
    
    // Get the subdomain (first part if there are 3+ parts)
    // risefootballagency.com = 2 parts (no subdomain)
    // portal.risefootballagency.com = 3 parts (subdomain = "portal")
    const subdomain = parts.length >= 3 ? parts[0] : '';
    
    // Skip if no subdomain or it's an ignored subdomain
    if (ignoredSubdomains.includes(subdomain)) {
      return;
    }
    
    // Check if this subdomain has a mapped route
    const targetRoute = subdomainRoutes[subdomain];
    
    if (targetRoute && location.pathname !== targetRoute) {
      // Only redirect if we're not already on the target route
      navigate(targetRoute, { replace: true });
    }
  }, [navigate, location.pathname]);
};
