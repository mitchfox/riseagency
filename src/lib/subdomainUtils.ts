// Shared subdomain detection utility
// Handles both subdomain.domain.com and www.subdomain.domain.com formats

export const LANGUAGE_SUBDOMAINS = ['en', 'es', 'pt', 'fr', 'de', 'it', 'pl', 'cs', 'cz', 'ru', 'tr', 'hr', 'no'] as const;
export const ROLE_SUBDOMAINS = ['players', 'clubs', 'scouts', 'agents', 'coaches', 'media', 'business', 'portal', 'potential'] as const;

export type LanguageSubdomain = typeof LANGUAGE_SUBDOMAINS[number];
export type RoleSubdomainType = typeof ROLE_SUBDOMAINS[number];

export interface SubdomainInfo {
  subdomain: string | null;
  type: 'language' | 'role' | null;
  baseDomain: string;
  hasWww: boolean;
}

/**
 * Extracts subdomain information from hostname
 * Handles both formats:
 * - subdomain.domain.com (3 parts minimum)
 * - www.subdomain.domain.com (4 parts with www prefix)
 */
export function getSubdomainInfo(hostname: string = window.location.hostname): SubdomainInfo {
  // Default response for localhost, IP addresses, or preview environments
  const defaultResult: SubdomainInfo = {
    subdomain: null,
    type: null,
    baseDomain: hostname,
    hasWww: false,
  };
  
  // For localhost or IP addresses, skip subdomain detection
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return defaultResult;
  }
  
  // For preview environments (lovable.app, lovableproject.com)
  if (hostname.includes('lovable.app') || hostname.includes('lovableproject.com')) {
    return defaultResult;
  }
  
  const parts = hostname.split('.');
  
  // Need at least 3 parts for a subdomain (subdomain.domain.com)
  if (parts.length < 3) {
    return {
      ...defaultResult,
      baseDomain: hostname,
    };
  }
  
  let functionalSubdomain = '';
  let hasWww = false;
  let baseDomain = '';
  
  // Check for www prefix
  if (parts[0].toLowerCase() === 'www') {
    hasWww = true;
    
    if (parts.length >= 4) {
      // Format: www.subdomain.domain.com
      functionalSubdomain = parts[1].toLowerCase();
      baseDomain = parts.slice(-2).join('.');
    } else {
      // Format: www.domain.com (no functional subdomain)
      baseDomain = parts.slice(-2).join('.');
      return {
        subdomain: null,
        type: null,
        baseDomain,
        hasWww: true,
      };
    }
  } else {
    // Format: subdomain.domain.com
    functionalSubdomain = parts[0].toLowerCase();
    baseDomain = parts.slice(-2).join('.');
  }
  
  // Determine type
  let type: 'language' | 'role' | null = null;
  
  if (LANGUAGE_SUBDOMAINS.includes(functionalSubdomain as LanguageSubdomain)) {
    type = 'language';
  } else if (ROLE_SUBDOMAINS.includes(functionalSubdomain as RoleSubdomainType)) {
    type = 'role';
  }
  
  return {
    subdomain: functionalSubdomain || null,
    type,
    baseDomain,
    hasWww,
  };
}

/**
 * Check if we're on a language subdomain
 */
export function isLanguageSubdomain(hostname?: string): boolean {
  const info = getSubdomainInfo(hostname);
  return info.type === 'language';
}

/**
 * Check if we're on a role subdomain
 */
export function isRoleSubdomain(hostname?: string): boolean {
  const info = getSubdomainInfo(hostname);
  return info.type === 'role';
}

/**
 * Get the language code from a language subdomain
 * Maps 'cz' to 'cs' for Czech
 */
export function getLanguageFromSubdomain(subdomain: string | null): string | null {
  if (!subdomain) return null;
  
  const languageMap: Record<string, string> = {
    'en': 'en',
    'es': 'es',
    'pt': 'pt',
    'fr': 'fr',
    'de': 'de',
    'it': 'it',
    'pl': 'pl',
    'cs': 'cs',
    'cz': 'cs', // Czech uses 'cz' in DNS but 'cs' as language code
    'ru': 'ru',
    'tr': 'tr',
    'hr': 'hr',
    'no': 'no',
  };
  
  return languageMap[subdomain] || null;
}

/**
 * Check if hostname is a preview or local environment
 */
export function isPreviewOrLocalEnvironment(hostname: string = window.location.hostname): boolean {
  return hostname === 'localhost' || 
         /^\d+\.\d+\.\d+\.\d+$/.test(hostname) ||
         hostname.includes('lovable.app') ||
         hostname.includes('lovableproject.com');
}
