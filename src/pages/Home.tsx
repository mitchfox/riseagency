import { useMemo } from 'react';
import Landing from './Landing';
import Clubs from './Clubs';
import Scouts from './Scouts';
import Agents from './Agents';
import Coaches from './Coaches';
import Media from './Media';
import Business from './Business';
import Dashboard from './Dashboard';
import Potential from './Potential';
import Players from './Performance';

// Map subdomains to their page components
const subdomainComponents: Record<string, React.ComponentType> = {
  'portal': Dashboard,
  'scouts': Scouts,
  'potential': Potential,
  'players': Players,
  'clubs': Clubs,
  'agents': Agents,
  'coaches': Coaches,
  'media': Media,
  'business': Business,
};

// Language subdomains should not trigger role-based rendering
const languageSubdomains = ['en', 'es', 'pt', 'fr', 'de', 'it', 'pl', 'cs', 'cz', 'ru', 'tr'];

const getSubdomain = (): string | null => {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  // For localhost or IP addresses, no subdomain
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
  
  // Return null for language subdomains or no subdomain
  if (!functionalSubdomain || languageSubdomains.includes(functionalSubdomain)) {
    return null;
  }
  
  return functionalSubdomain;
};

const Home = () => {
  const subdomain = useMemo(() => getSubdomain(), []);
  
  // If we have a role subdomain with a matching component, render it
  if (subdomain && subdomainComponents[subdomain]) {
    const PageComponent = subdomainComponents[subdomain];
    return <PageComponent />;
  }
  
  // Default to Landing page
  return <Landing />;
};

export default Home;
