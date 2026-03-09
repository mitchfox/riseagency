import { useMemo, lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { getSubdomainInfo } from '@/lib/subdomainUtils';
import { PageLoading } from '@/components/LoadingSpinner';

// Lazy import all subdomain pages to avoid static/dynamic import conflicts with App.tsx
const Landing = lazy(() => import('./Landing'));
const Clubs = lazy(() => import('./Clubs'));
const Scouts = lazy(() => import('./Scouts'));
const Agents = lazy(() => import('./Agents'));
const Coaches = lazy(() => import('./Coaches'));
const Media = lazy(() => import('./Media'));
const Business = lazy(() => import('./Business'));
const Dashboard = lazy(() => import('./Dashboard'));
const Potential = lazy(() => import('./Potential'));
const PlayersPage = lazy(() => import('./PlayersPage'));

// Map subdomains to their lazy page components
const subdomainComponents: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  'portal': Dashboard,
  'scouts': Scouts,
  'potential': Potential,
  'players': PlayersPage,
  'clubs': Clubs,
  'agents': Agents,
  'coaches': Coaches,
  'media': Media,
  'business': Business,
};

// Detect Lovable preview environment
const isLovablePreview = (() => {
  const hostname = window.location.hostname;
  return hostname.startsWith('id-preview--') ||
         window.location.search.includes('__lovable_token') ||
         (window.self !== window.top && (hostname.includes('lovable') || hostname.includes('localhost')));
})();

const Home = () => {
  const subdomainInfo = useMemo(() => getSubdomainInfo(), []);

  // In Lovable preview, redirect to /staff to avoid landing page reload issues
  if (isLovablePreview) {
    return <Navigate to="/staff" replace />;
  }
  
  // If we have a role subdomain with a matching component, render it
  if (subdomainInfo.type === 'role' && subdomainInfo.subdomain && subdomainComponents[subdomainInfo.subdomain]) {
    const PageComponent = subdomainComponents[subdomainInfo.subdomain];
    return <Suspense fallback={<PageLoading />}><PageComponent /></Suspense>;
  }
  
  // Default to Landing page
  return <Suspense fallback={<PageLoading />}><Landing /></Suspense>;
};

export default Home;
