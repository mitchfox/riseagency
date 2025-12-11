import { useState, useEffect } from 'react';
import { getLocalizedPath } from '@/lib/localizedRoutes';

export type RoleSubdomain = 'players' | 'clubs' | 'agents' | 'coaches' | 'scouts' | 'business' | 'media' | null;

interface RoleConfig {
  name: string;
  subdomain: string;
  route: string;
}

export const roleConfigs: Record<Exclude<RoleSubdomain, null>, RoleConfig> = {
  players: { name: 'PLAYER', subdomain: 'players', route: '/playersmore' },
  clubs: { name: 'CLUB', subdomain: 'clubs', route: '/clubs' },
  agents: { name: 'AGENT', subdomain: 'agents', route: '/agents' },
  coaches: { name: 'COACH', subdomain: 'coaches', route: '/coaches' },
  scouts: { name: 'SCOUT', subdomain: 'scouts', route: '/scouts' },
  business: { name: 'BUSINESS', subdomain: 'business', route: '/business' },
  media: { name: 'MEDIA', subdomain: 'media', route: '/media' },
};

// Map routes to their role subdomains
export const pathToRole: Record<string, Exclude<RoleSubdomain, null>> = {
  '/playersmore': 'players',
  '/players': 'players',
  '/clubs': 'clubs',
  '/scouts': 'scouts',
  '/agents': 'agents',
  '/coaches': 'coaches',
  '/media': 'media',
  '/business': 'business',
};

// Language subdomains that should NOT trigger role subdomain navigation
const languageSubdomains = ['en', 'es', 'pt', 'fr', 'de', 'it', 'pl', 'cs', 'cz', 'ru', 'tr'];

// Map language subdomains to language codes
const subdomainToLanguage: Record<string, string> = {
  'en': 'en',
  'es': 'es',
  'pt': 'pt',
  'fr': 'fr',
  'de': 'de',
  'it': 'it',
  'pl': 'pl',
  'cs': 'cs',
  'cz': 'cs',
  'ru': 'ru',
  'tr': 'tr',
};

export const useRoleSubdomain = () => {
  const [currentRole, setCurrentRole] = useState<RoleSubdomain>(null);
  const [currentLanguageSubdomain, setCurrentLanguageSubdomain] = useState<string | null>(null);

  useEffect(() => {
    const detectSubdomain = () => {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      
      // For localhost or IP addresses, skip detection
      if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
        return { role: null, language: null };
      }
      
      let functionalSubdomain = '';
      
      if (parts[0].toLowerCase() === 'www' && parts.length >= 4) {
        // Format: www.{subdomain}.domain.com
        functionalSubdomain = parts[1].toLowerCase();
      } else if (parts[0].toLowerCase() !== 'www' && parts.length >= 3) {
        // Format: {subdomain}.domain.com
        functionalSubdomain = parts[0].toLowerCase();
      }
      
      // Check if this is a language subdomain
      if (languageSubdomains.includes(functionalSubdomain)) {
        return { role: null, language: functionalSubdomain };
      }
      
      // Check if this is a role subdomain
      const roleSubdomains: RoleSubdomain[] = ['players', 'clubs', 'agents', 'coaches', 'scouts', 'business', 'media'];
      if (roleSubdomains.includes(functionalSubdomain as RoleSubdomain)) {
        return { role: functionalSubdomain as RoleSubdomain, language: null };
      }
      
      return { role: null, language: null };
    };

    const { role, language } = detectSubdomain();
    setCurrentRole(role);
    setCurrentLanguageSubdomain(language);
  }, []);

  const getRoleUrl = (role: Exclude<RoleSubdomain, null>) => {
    const hostname = window.location.hostname;
    
    // For localhost, lovable.app preview, or IP addresses, just return the route
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.includes('lovable.app')) {
      return roleConfigs[role].route;
    }
    
    // If we're on a language subdomain, stay on it and use localized routes
    if (currentLanguageSubdomain) {
      const languageCode = subdomainToLanguage[currentLanguageSubdomain] || 'en';
      const localizedPath = getLocalizedPath(roleConfigs[role].route, languageCode);
      return localizedPath;
    }
    
    const protocol = window.location.protocol;
    
    // Extract base domain
    const parts = hostname.split('.');
    let baseDomain = '';
    
    if (parts[0].toLowerCase() === 'www' && parts.length >= 4) {
      // www.subdomain.domain.com -> domain.com
      baseDomain = parts.slice(-2).join('.');
    } else if (parts.length >= 3) {
      // subdomain.domain.com -> domain.com
      baseDomain = parts.slice(-2).join('.');
    } else {
      baseDomain = hostname;
    }
    
    return `${protocol}//${role}.${baseDomain}`;
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
