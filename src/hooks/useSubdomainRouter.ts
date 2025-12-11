import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSubdomainInfo, ROLE_SUBDOMAINS } from '@/lib/subdomainUtils';

export const useSubdomainRouter = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const info = getSubdomainInfo();
    
    // If we're on a role subdomain, don't do any navigation
    // The Home component handles rendering the correct page at root
    if (info.type === 'role' && info.subdomain && ROLE_SUBDOMAINS.includes(info.subdomain as any)) {
      return;
    }
    
    // No navigation needed - subdomain-based content is handled by Home component
  }, [navigate, location.pathname]);
};
