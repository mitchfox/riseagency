import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PageTracker } from "@/components/PageTracker";
import { PageTransition } from "@/components/PageTransition";
import { usePushNotifications } from "@/hooks/usePushNotifications";
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

const queryClient = new QueryClient();

const App = () => {
  usePushNotifications();
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <PageTracker />
          <ScrollToTop />
          <PageTransition>
            {(displayLocation) => (
              <Routes location={displayLocation}>
                <Route path="/" element={<Index />} />
                <Route path="/intro" element={<Intro />} />
                <Route path="/stars" element={<Stars />} />
                <Route path="/stars/:playername" element={<PlayerDetail />} />
                <Route path="/players" element={<Players />} />
                <Route path="/players-list" element={<PlayersList />} />
                <Route path="/players-draft" element={<PlayersDraft />} />
                <Route path="/clubs" element={<Clubs />} />
                <Route path="/club-network" element={<ClubNetwork />} />
                <Route path="/coaches" element={<Coaches />} />
                <Route path="/scouts" element={<Scouts />} />
                <Route path="/performance" element={<Performance />} />
                <Route path="/news" element={<News />} />
                <Route path="/news/:articleId" element={<News />} />
                <Route path="/between-the-lines" element={<BetweenTheLines />} />
                <Route path="/between-the-lines/:articleId" element={<News />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/about" element={<About />} />
                <Route path="/staff" element={<Staff />} />
                <Route path="/login" element={<Login />} />
                <Route path="/portal" element={<Dashboard />} />
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
            )}
          </PageTransition>
        </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
