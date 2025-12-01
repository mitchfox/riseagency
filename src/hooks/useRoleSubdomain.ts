import { useState, useEffect } from 'react';

export type RoleSubdomain = 'players' | 'clubs' | 'agents' | 'coaches' | 'scouts' | 'business' | 'media' | null;

interface RoleConfig {
  name: string;
  subdomain: string;
  route: string;
}

export const roleConfigs: Record<Exclude<RoleSubdomain, null>, RoleConfig> = {
  players: { name: 'PLAYERS', subdomain: 'players', route: '/playersmore' },
  clubs: { name: 'CLUBS', subdomain: 'clubs', route: '/clubs' },
  agents: { name: 'AGENTS', subdomain: 'agents', route: '/agents' },
  coaches: { name: 'COACHES', subdomain: 'coaches', route: '/coaches' },
  scouts: { name: 'SCOUTS', subdomain: 'scouts', route: '/scouts' },
  business: { name: 'BUSINESS', subdomain: 'business', route: '/business' },
  media: { name: 'MEDIA', subdomain: 'media', route: '/media' },
};

export const useRoleSubdomain = () => {
  const [currentRole, setCurrentRole] = useState<RoleSubdomain>(null);

  useEffect(() => {
    const detectRole = () => {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      
      // For localhost or IP addresses, skip role detection
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
      
      // Check if this is a role subdomain
      const roleSubdomains: RoleSubdomain[] = ['players', 'clubs', 'agents', 'coaches', 'scouts', 'business', 'media'];
      if (roleSubdomains.includes(functionalSubdomain as RoleSubdomain)) {
        return functionalSubdomain as RoleSubdomain;
      }
      
      return null;
    };

    setCurrentRole(detectRole());
  }, []);

  const getRoleUrl = (role: Exclude<RoleSubdomain, null>) => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // For localhost, just return the route
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return roleConfigs[role].route;
    }
    
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
    isRoleSubdomain: currentRole !== null 
  };
};
