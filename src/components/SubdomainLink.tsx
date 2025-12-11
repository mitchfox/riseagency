import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoleSubdomain, RoleSubdomain, roleConfigs } from '@/hooks/useRoleSubdomain';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLocalizedPath } from '@/lib/localizedRoutes';
import { getSubdomainInfo } from '@/lib/subdomainUtils';

interface SubdomainLinkProps {
  role: Exclude<RoleSubdomain, null>;
  children: React.ReactNode;
  className?: string;
}

export const SubdomainLink = ({ role, children, className }: SubdomainLinkProps) => {
  const { getRoleUrl } = useRoleSubdomain();
  const { language } = useLanguage();
  const navigate = useNavigate();
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const info = getSubdomainInfo();
    
    // If on a language subdomain, use internal routing to preserve language
    if (info.type === 'language') {
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
  
  const info = getSubdomainInfo();
  
  // For href, show the internal route when on language subdomain
  const href = info.type === 'language'
    ? getLocalizedPath(roleConfigs[role].route, language)
    : getRoleUrl(role);
  
  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
};
