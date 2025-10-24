import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/stars" element={<Stars />} />
          <Route path="/stars/:playername" element={<PlayerDetail />} />
          <Route path="/players" element={<Players />} />
          <Route path="/clubs" element={<Clubs />} />
          <Route path="/coaches" element={<Coaches />} />
          <Route path="/scouts" element={<Scouts />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/news" element={<News />} />
          <Route path="/between-the-lines" element={<BetweenTheLines />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/about" element={<About />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/performance-report/:analysisId" element={<PerformanceReport />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
