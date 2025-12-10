import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoleSubdomain, RoleSubdomain, roleConfigs } from '@/hooks/useRoleSubdomain';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLocalizedPath } from '@/lib/localizedRoutes';

// Language subdomains that should take precedence over role navigation
const languageSubdomains = ['en', 'es', 'pt', 'fr', 'de', 'it', 'pl', 'cs', 'cz', 'ru', 'tr'];

interface SubdomainLinkProps {
  role: Exclude<RoleSubdomain, null>;
  children: React.ReactNode;
  className?: string;
}

export const SubdomainLink = ({ role, children, className }: SubdomainLinkProps) => {
  const { getRoleUrl } = useRoleSubdomain();
  const { language } = useLanguage();
  const navigate = useNavigate();
  
  // Check if we're on a language subdomain
  const isOnLanguageSubdomain = () => {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const subdomain = parts[0].toLowerCase();
      return languageSubdomains.includes(subdomain);
    }
    return false;
  };
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // If on a language subdomain, use internal routing to preserve language
    if (isOnLanguageSubdomain()) {
      const route = roleConfigs[role].route;
      const localizedRoute = getLocalizedPath(route, language);
      navigate(localizedRoute);
      return;
    }
    
    const url = getRoleUrl(role);
    // Check if it's an external URL (starts with http) or internal route
    if (url.startsWith('http')) {
      window.location.href = url;
    } else {
      // For localhost, use internal navigation
      navigate(url);
    }
  };
  
  // For href, show the internal route when on language subdomain
  const href = isOnLanguageSubdomain() 
    ? getLocalizedPath(roleConfigs[role].route, language)
    : getRoleUrl(role);
  
  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
};
