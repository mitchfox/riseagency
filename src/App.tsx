import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PageTracker } from "@/components/PageTracker";
import { PageTransition } from "@/components/PageTransition";
import { TransitionProvider } from "@/contexts/TransitionContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useSubdomainRouter } from "@/hooks/useSubdomainRouter";
import { getAllPathVariants } from "@/lib/localizedRoutes";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Index from "./pages/Index";
import Stars from "./pages/Stars";
import Players from "./pages/Performance"; // Old Performance content now becomes Players
import PlayerDetail from "./pages/PlayerDetail";
import News from "./pages/News";
import Contact from "./pages/Contact";
import Staff from "./pages/Staff";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import About from "./pages/About";
import Clubs from "./pages/Clubs";
import Coaches from "./pages/Coaches";
import Scouts from "./pages/Scouts";
import Agents from "./pages/Agents";
import Business from "./pages/Business";
import Media from "./pages/Media";
import Performance from "./pages/NewPerformance";
import BetweenTheLines from "./pages/BetweenTheLines";
import PerformanceReport from "./pages/PerformanceReport";
import NotFound from "./pages/NotFound";
import ImportProgramCSV from "./pages/ImportProgramCSV";
import ReplaceProgram from "./pages/ReplaceProgram";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import AnalysisViewer from "./pages/AnalysisViewer";
import Intro from "./pages/Intro";
import PlayersList from "./pages/PlayersList";
import PlayersDraft from "./pages/PlayersDraft";
import ClubNetwork from "./pages/ClubNetwork";
import PDFViewer from "./pages/PDFViewer";
import ScoutPortal from "./pages/ScoutPortal";
import Potential from "./pages/Potential";
import RealisePotential from "./pages/RealisePotential";
import FluidCursor from "./components/FluidCursor";

const queryClient = new QueryClient();

const SubdomainRouter = () => {
  useSubdomainRouter();
  return null;
};

// Helper to create routes for all language variants
const createLocalizedRoutes = (englishPath: string, element: React.ReactNode) => {
  const variants = getAllPathVariants(englishPath);
  return variants.map((path) => (
    <Route key={path} path={path} element={element} />
  ));
};

// Helper for dynamic routes (with parameters)
const createLocalizedDynamicRoutes = (englishPath: string, element: React.ReactNode) => {
  const basePath = englishPath.split('/:')[0];
  const param = englishPath.split('/:')[1];
  const variants = getAllPathVariants(basePath);
  return variants.map((path) => (
    <Route key={`${path}/:${param}`} path={`${path}/:${param}`} element={element} />
  ));
};

const App = () => {
  usePushNotifications();
  
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SubdomainRouter />
            <TransitionProvider>
            <FluidCursor />
            <PageTracker />
            <ScrollToTop />
            <PageTransition>
              {(displayLocation) => (
                <main>
                  <Routes location={displayLocation}>
                    <Route path="/" element={<Home />} />
                    {createLocalizedRoutes('/players', <Index />)}
                    <Route path="/intro" element={<Intro />} />
                    
                    {/* Localized routes */}
                    {createLocalizedRoutes('/stars', <Stars />)}
                    {createLocalizedDynamicRoutes('/stars/:playername', <PlayerDetail />)}
                    {createLocalizedRoutes('/clubs', <Clubs />)}
                    {createLocalizedRoutes('/coaches', <Coaches />)}
                    {createLocalizedRoutes('/scouts', <Scouts />)}
                    {createLocalizedRoutes('/agents', <Agents />)}
                    {createLocalizedRoutes('/business', <Business />)}
                    {createLocalizedRoutes('/media', <Media />)}
                    {createLocalizedRoutes('/performance', <Performance />)}
                    {createLocalizedRoutes('/news', <News />)}
                    {createLocalizedDynamicRoutes('/news/:articleId', <News />)}
                    {createLocalizedRoutes('/between-the-lines', <BetweenTheLines />)}
                    {createLocalizedDynamicRoutes('/between-the-lines/:articleId', <News />)}
                    {createLocalizedRoutes('/contact', <Contact />)}
                    {createLocalizedRoutes('/about', <About />)}
                    {createLocalizedRoutes('/login', <Login />)}
                    {createLocalizedRoutes('/portal', <Dashboard />)}
                    
                    {/* Non-localized routes */}
                    <Route path="/playersmore" element={<Players />} />
                    <Route path="/players-list" element={<PlayersList />} />
                    <Route path="/players-draft" element={<PlayersDraft />} />
                    <Route path="/club-network" element={<ClubNetwork />} />
                    <Route path="/staff" element={<Staff />} />
                    <Route path="/scout-portal" element={<ScoutPortal />} />
                    <Route path="/potential" element={<Potential />} />
                    <Route path="/realise-potential" element={<RealisePotential />} />
                    <Route path="/performance-report/:slug" element={<PerformanceReport />} />
                    <Route path="/analysis/:analysisId" element={<AnalysisViewer />} />
                    <Route path="/import-program" element={<ImportProgramCSV />} />
                    <Route path="/replace-program" element={<ReplaceProgram />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/terms-of-service" element={<TermsOfService />} />
                    <Route path="/pdf-viewer" element={<PDFViewer />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
              )}
            </PageTransition>
            </TransitionProvider>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;
