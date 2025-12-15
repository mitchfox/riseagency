import { useState, useEffect } from 'react';
import { getLocalizedPath } from '@/lib/localizedRoutes';
import { getSubdomainInfo, getLanguageFromSubdomain, isPreviewOrLocalEnvironment } from '@/lib/subdomainUtils';

export type RoleSubdomain = 'players' | 'clubs' | 'agents' | 'coaches' | 'scouts' | 'business' | 'media' | null;

interface RoleConfig {
  name: string;
  subdomain: string;
  route: string;
}

export const roleConfigs: Record<Exclude<RoleSubdomain, null>, RoleConfig> = {
  players: { name: 'PLAYER', subdomain: 'players', route: '/players' },
  clubs: { name: 'CLUB', subdomain: 'clubs', route: '/clubs' },
  agents: { name: 'AGENT', subdomain: 'agents', route: '/agents' },
  coaches: { name: 'COACH', subdomain: 'coaches', route: '/coaches' },
  scouts: { name: 'SCOUT', subdomain: 'scouts', route: '/scouts' },
  business: { name: 'BUSINESS', subdomain: 'business', route: '/business' },
  media: { name: 'MEDIA', subdomain: 'media', route: '/media' },
};

// Map routes to their role subdomains
export const pathToRole: Record<string, Exclude<RoleSubdomain, null>> = {
  '/learnmore': 'players',
  '/players': 'players',
  '/clubs': 'clubs',
  '/scouts': 'scouts',
  '/agents': 'agents',
  '/coaches': 'coaches',
  '/media': 'media',
  '/business': 'business',
};

export const useRoleSubdomain = () => {
  const [currentRole, setCurrentRole] = useState<RoleSubdomain>(null);
  const [currentLanguageSubdomain, setCurrentLanguageSubdomain] = useState<string | null>(null);

  useEffect(() => {
    const info = getSubdomainInfo();
    
    if (info.type === 'language') {
      setCurrentLanguageSubdomain(info.subdomain);
      setCurrentRole(null);
    } else if (info.type === 'role') {
      const roleSubdomains: RoleSubdomain[] = ['players', 'clubs', 'agents', 'coaches', 'scouts', 'business', 'media'];
      if (roleSubdomains.includes(info.subdomain as RoleSubdomain)) {
        setCurrentRole(info.subdomain as RoleSubdomain);
      }
      setCurrentLanguageSubdomain(null);
    } else {
      setCurrentRole(null);
      setCurrentLanguageSubdomain(null);
    }
  }, []);

  const getRoleUrl = (role: Exclude<RoleSubdomain, null>) => {
    const hostname = window.location.hostname;
    
    // For localhost, lovable.app preview, or IP addresses, just return the route
    if (isPreviewOrLocalEnvironment(hostname)) {
      return roleConfigs[role].route;
    }
    
    // If we're on a language subdomain, stay on it and use localized routes
    if (currentLanguageSubdomain) {
      const languageCode = getLanguageFromSubdomain(currentLanguageSubdomain) || 'en';
      const localizedPath = getLocalizedPath(roleConfigs[role].route, languageCode);
      return localizedPath;
    }
    
    const protocol = window.location.protocol;
    const info = getSubdomainInfo(hostname);
    
    return `${protocol}//${role}.${info.baseDomain}`;
  };

  const otherRoles = currentRole 
    ? (Object.keys(roleConfigs) as Exclude<RoleSubdomain, null>[]).filter(r => r !== currentRole)
    : (Object.keys(roleConfigs) as Exclude<RoleSubdomain, null>[]);

  return { 
    currentRole, 
    roleConfigs, 
    getRoleUrl, 
    otherRoles,
    isRoleSubdomain: currentRole !== null,
    isLanguageSubdomain: currentLanguageSubdomain !== null,
    currentLanguageSubdomain
  };
};
