import { lazy, Suspense } from "react";
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
import { useLocalizedRedirect } from "@/hooks/useLocalizedRedirect";
import { getAllPathVariants } from "@/lib/localizedRoutes";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "next-themes";

// Critical pages - loaded immediately
import Home from "./pages/Home";
import Stars from "./pages/Stars";
import PlayerDetail from "./pages/PlayerDetail";
import News from "./pages/News";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages for better initial load performance
const Landing = lazy(() => import("./pages/Landing"));
const PlayersPage = lazy(() => import("./pages/PlayersPage"));
const LearnMorePage = lazy(() => import("./pages/LearnMorePage"));
const Staff = lazy(() => import("./pages/Staff"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const About = lazy(() => import("./pages/About"));
const Clubs = lazy(() => import("./pages/Clubs"));
const Coaches = lazy(() => import("./pages/Coaches"));
const Scouts = lazy(() => import("./pages/Scouts"));
const Agents = lazy(() => import("./pages/Agents"));
const Business = lazy(() => import("./pages/Business"));
const Media = lazy(() => import("./pages/Media"));
const PerformancePage = lazy(() => import("./pages/PerformancePage"));
const BetweenTheLines = lazy(() => import("./pages/BetweenTheLines"));
const OpenAccess = lazy(() => import("./pages/OpenAccess"));
const PerformanceReport = lazy(() => import("./pages/PerformanceReport"));
const ImportProgramCSV = lazy(() => import("./pages/ImportProgramCSV"));
const ReplaceProgram = lazy(() => import("./pages/ReplaceProgram"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const AnalysisViewer = lazy(() => import("./pages/AnalysisViewer"));
const Intro = lazy(() => import("./pages/Intro"));
const PlayersList = lazy(() => import("./pages/PlayersList"));
const PlayersDraft = lazy(() => import("./pages/PlayersDraft"));
// ClubNetwork is accessed only through Staff page, not as a standalone route
const PDFViewer = lazy(() => import("./pages/PDFViewer"));
const ScoutPortal = lazy(() => import("./pages/ScoutPortal"));
const ScoutLogin = lazy(() => import("./pages/ScoutLogin"));
const Potential = lazy(() => import("./pages/Potential"));
const RealisePotential = lazy(() => import("./pages/RealisePotential"));
const YouthPlayers = lazy(() => import("./pages/YouthPlayers"));
const PlayerJourney = lazy(() => import("./pages/PlayerJourney"));
const FluidCursor = lazy(() => import("./components/FluidCursor"));

// Loading fallback component
import { PageLoading } from "@/components/LoadingSpinner";
const PageLoader = () => <PageLoading />;

const queryClient = new QueryClient();

const SubdomainRouter = () => {
  useSubdomainRouter();
  useLocalizedRedirect();
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
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <SubdomainRouter />
              <TransitionProvider>
              <Suspense fallback={null}>
                <FluidCursor />
              </Suspense>
              <PageTracker />
              <ScrollToTop />
              <PageTransition>
                {(displayLocation) => (
                  <main>
                    <Suspense fallback={<PageLoader />}>
                    <Routes location={displayLocation}>
                      <Route path="/" element={<Home />} />
                      {createLocalizedRoutes('/players', <PlayersPage />)}
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
                      {createLocalizedRoutes('/performance', <PerformancePage />)}
                      {createLocalizedRoutes('/news', <News />)}
                      {createLocalizedDynamicRoutes('/news/:articleId', <News />)}
                      {createLocalizedRoutes('/between-the-lines', <BetweenTheLines />)}
                      {createLocalizedDynamicRoutes('/between-the-lines/:articleId', <News />)}
                      {createLocalizedRoutes('/open-access', <OpenAccess />)}
                      {createLocalizedRoutes('/contact', <Contact />)}
                      {createLocalizedRoutes('/about', <About />)}
                      {createLocalizedRoutes('/login', <Login />)}
                      {createLocalizedRoutes('/portal', <Dashboard />)}
                      
                      {/* Non-localized routes */}
                      {createLocalizedRoutes('/learnmore', <LearnMorePage />)}
                      <Route path="/players-list" element={<PlayersList />} />
                      <Route path="/players-draft" element={<PlayersDraft />} />
                      {/* Club Network is now only accessible via Staff page */}
                      <Route path="/staff" element={<ErrorBoundary><Staff /></ErrorBoundary>} />
                      <Route path="/scout-portal" element={<ScoutPortal />} />
                      <Route path="/scout-login" element={<ScoutLogin />} />
                      <Route path="/potential" element={<Potential />} />
                      <Route path="/realise-potential" element={<RealisePotential />} />
                      {createLocalizedRoutes('/youth-players', <YouthPlayers />)}
                      {createLocalizedRoutes('/player-journey', <PlayersDraft />)}
                      <Route path="/performance-report/:slug" element={<PerformanceReport />} />
                      <Route path="/analysis/:analysisId" element={<AnalysisViewer />} />
                      <Route path="/import-program" element={<ImportProgramCSV />} />
                      <Route path="/replace-program" element={<ReplaceProgram />} />
                      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                      <Route path="/terms-of-service" element={<TermsOfService />} />
                      <Route path="/pdf-viewer" element={<PDFViewer />} />
                      <Route path="/error" element={<NotFound />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                    </Suspense>
                  </main>
                )}
              </PageTransition>
              </TransitionProvider>
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
