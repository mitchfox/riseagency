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
import { getSubdomainInfo } from '@/lib/subdomainUtils';

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

const Home = () => {
  const subdomainInfo = useMemo(() => getSubdomainInfo(), []);
  
  // If we have a role subdomain with a matching component, render it
  if (subdomainInfo.type === 'role' && subdomainInfo.subdomain && subdomainComponents[subdomainInfo.subdomain]) {
    const PageComponent = subdomainComponents[subdomainInfo.subdomain];
    return <PageComponent />;
  }
  
  // Default to Landing page
  return <Landing />;
};

export default Home;
