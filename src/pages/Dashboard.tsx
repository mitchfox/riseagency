import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NotificationPermission } from "@/components/NotificationPermission";
import { toast } from "sonner";
import { FileText, Play, Download, Upload } from "lucide-react";
import { addDays, format, parseISO } from "date-fns";

interface Analysis {
  id: string;
  analysis_date: string;
  r90_score: number;
  pdf_url: string | null;
  video_url: string | null;
  notes: string | null;
  opponent: string | null;
  result: string | null;
  minutes_played: number | null;
  analysis_writer_id?: string | null;
  analysis_writer_data?: any;
}

interface PlayerProgram {
  id: string;
  program_name: string;
  phase_name: string | null;
  phase_dates: string | null;
  overview_text: string | null;
  is_current: boolean;
  schedule_notes: string | null;
  weekly_schedules: any;
  sessions: any;
  phase_image_url: string | null;
  player_image_url: string | null;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  pdf_url: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [concepts, setConcepts] = useState<any[]>([]);
  const [playerData, setPlayerData] = useState<any>(null);
  const [programs, setPrograms] = useState<PlayerProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [accordionValue, setAccordionValue] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);
  const [dailyAphorism, setDailyAphorism] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Session color mapping with hover states
  const getSessionColor = (sessionKey: string) => {
    const key = sessionKey.toUpperCase();
    const colorMap: Record<string, { bg: string; text: string; hover: string }> = {
      'A': { bg: 'hsl(220, 70%, 35%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(220, 70%, 45%)' },
      'B': { bg: 'hsl(140, 50%, 30%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(140, 50%, 40%)' },
      'C': { bg: 'hsl(0, 50%, 35%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(0, 50%, 45%)' },
      'D': { bg: 'hsl(45, 70%, 45%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(45, 70%, 55%)' },
      'E': { bg: 'hsl(70, 20%, 40%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(70, 20%, 50%)' },
      'F': { bg: 'hsl(270, 60%, 40%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(270, 60%, 50%)' },
      'G': { bg: 'hsl(190, 70%, 45%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(190, 70%, 55%)' },
      'PRE-B': { bg: 'hsl(220, 80%, 20%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(220, 80%, 30%)' },
      'PRE-C': { bg: 'hsl(220, 80%, 20%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(220, 80%, 30%)' },
      'PREHAB': { bg: 'hsl(220, 80%, 20%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(220, 80%, 30%)' },
      'T': { bg: 'hsl(140, 50%, 20%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(140, 50%, 30%)' },
      'TESTING': { bg: 'hsl(140, 50%, 20%)', text: 'hsl(45, 100%, 60%)', hover: 'hsl(140, 50%, 30%)' },
      'R': { bg: 'hsl(0, 0%, 85%)', text: 'hsl(45, 100%, 45%)', hover: 'hsl(0, 0%, 90%)' },
      'REST': { bg: 'hsl(0, 0%, 85%)', text: 'hsl(45, 100%, 45%)', hover: 'hsl(0, 0%, 90%)' },
    };
    return colorMap[key] || { bg: 'hsl(0, 0%, 15%)', text: 'hsl(0, 0%, 100%)', hover: 'hsl(0, 0%, 25%)' };
  };

  // Handle clicking on a schedule day to jump to that session
  const handleSessionClick = (sessionKey: string) => {
    setSelectedSession(sessionKey);
    setAccordionValue(['sessions']);
    // Scroll to sessions section after state update
    setTimeout(() => {
      const sessionsSection = document.querySelector('[value="sessions"]');
      sessionsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Calculate actual dates for each day in a week based on week_start_date
  const getWeekDates = (weekStartDate: string | null) => {
    if (!weekStartDate) return null;
    
    try {
      const startDate = parseISO(weekStartDate);
      return {
        monday: startDate,
        tuesday: addDays(startDate, 1),
        wednesday: addDays(startDate, 2),
        thursday: addDays(startDate, 3),
        friday: addDays(startDate, 4),
        saturday: addDays(startDate, 5),
        sunday: addDays(startDate, 6),
      };
    } catch (error) {
      console.error('Error parsing week start date:', error);
      return null;
    }
  };

  // Handle clicking on an exercise to show details
  const handleExerciseClick = (exercise: any) => {
    setSelectedExercise(exercise);
    setExerciseDialogOpen(true);
  };

  useEffect(() => {
    checkAuth();
    fetchDailyAphorism();
  }, [navigate]);

  const checkAuth = async () => {
    try {
      // Check localStorage first (persistent), then sessionStorage (session only)
      const playerEmail = localStorage.getItem("player_email") || sessionStorage.getItem("player_email");
      
      if (!playerEmail) {
        navigate("/login");
        return;
      }

      await fetchAnalyses(playerEmail);
      await fetchPrograms(playerEmail);
      await fetchInvoices(playerEmail);
    } catch (error) {
      console.error("Error loading data:", error);
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyses = async (email: string | undefined) => {
    if (!email) return;
    
    try {
      // First get the player ID and data from email
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (playerError) throw playerError;
      if (!playerData) {
        console.log("No player profile found for this email");
        return;
      }

      // Parse bio data if it's JSON
      let parsedPlayerData = { ...playerData };
      if (playerData.bio) {
        try {
          const bioData = JSON.parse(playerData.bio);
          parsedPlayerData = { ...playerData, ...bioData };
        } catch (e) {
          // Bio is not JSON, keep as is
        }
      }

      setPlayerData(parsedPlayerData);

      // Then fetch their analyses
      const { data: analysisData, error: analysisError } = await supabase
        .from("player_analysis")
        .select("*")
        .eq("player_id", playerData.id)
        .order("analysis_date", { ascending: false });

      if (analysisError) throw analysisError;
      setAnalyses(analysisData || []);

      // Fetch all analyses (pre-match, post-match, concepts) linked to this player
      const linkedAnalysisIds = (analysisData || [])
        .filter(a => a.analysis_writer_id)
        .map(a => a.analysis_writer_id);

      if (linkedAnalysisIds.length > 0) {
        const { data: allAnalysesData, error: allAnalysesError } = await supabase
          .from("analyses")
          .select("*")
          .in("id", linkedAnalysisIds);

        if (!allAnalysesError && allAnalysesData) {
          // Separate concepts from other analyses
          setConcepts(allAnalysesData.filter(a => a.analysis_type === "concept"));
          
          // Add pre-match and post-match analyses to the analyses array
          const matchAnalyses = allAnalysesData.filter(a => 
            a.analysis_type === "pre-match" || a.analysis_type === "post-match"
          );
          
          // Merge with existing player_analysis data
          const mergedAnalyses = [...(analysisData || [])] as Analysis[];
          matchAnalyses.forEach(matchAnalysis => {
            const playerAnalysis = (analysisData || []).find(
              pa => pa.analysis_writer_id === matchAnalysis.id
            );
            if (playerAnalysis) {
              // Update the existing analysis with details from analyses table
              const index = mergedAnalyses.findIndex(a => a.id === playerAnalysis.id);
              if (index !== -1) {
                mergedAnalyses[index] = {
                  ...mergedAnalyses[index],
                  analysis_writer_data: matchAnalysis
                } as Analysis;
              }
            }
          });
          setAnalyses(mergedAnalyses);
        }
      }
    } catch (error: any) {
      console.error("Error fetching analyses:", error);
      toast.error("Failed to load analysis data");
    }
  };

  const fetchPrograms = async (email: string | undefined) => {
    if (!email) return;
    
    try {
      // First get the player ID from email
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (playerError) throw playerError;
      if (!playerData) return;

      // Fetch their programs
      const { data: programsData, error: programsError } = await supabase
        .from("player_programs")
        .select("*")
        .eq("player_id", playerData.id)
        .order("created_at", { ascending: false });

      if (programsError) throw programsError;
      
      setPrograms(programsData || []);
      
      // Set the current program as default
      const currentProgram = programsData?.find(p => p.is_current);
      if (currentProgram) {
        setSelectedProgramId(currentProgram.id);
      } else if (programsData && programsData.length > 0) {
        setSelectedProgramId(programsData[0].id);
      }
    } catch (error: any) {
      console.error("Error fetching programs:", error);
      toast.error("Failed to load program data");
    }
  };

  const fetchDailyAphorism = async () => {
    try {
      // Fetch all aphorisms
      const { data, error } = await supabase
        .from("coaching_aphorisms")
        .select("*");

      if (error) throw error;
      if (!data || data.length === 0) return;

      // Use current date as seed for consistent daily selection
      const today = new Date();
      const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
      const index = dayOfYear % data.length;
      
      setDailyAphorism(data[index]);
    } catch (error) {
      console.error("Error fetching daily aphorism:", error);
    }
  };

  const fetchInvoices = async (email: string | undefined) => {
    if (!email) return;
    
    try {
      // First get the player ID from email
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (playerError) throw playerError;
      if (!playerData) return;

      // Fetch their invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select("*")
        .eq("player_id", playerData.id)
        .order("invoice_date", { ascending: false });

      if (invoicesError) throw invoicesError;
      
      setInvoices(invoicesData || []);
    } catch (error: any) {
      console.error("Error fetching invoices:", error);
    }
  };

  const getR90Color = (score: number) => {
    if (score < 0) return "bg-red-950"; // Dark red for negative
    if (score >= 0 && score < 0.2) return "bg-red-600"; // Red
    if (score >= 0.2 && score < 0.4) return "bg-red-400"; // Light red
    if (score >= 0.4 && score < 0.6) return "bg-orange-700"; // Orange-brown
    if (score >= 0.6 && score < 0.8) return "bg-orange-500"; // Yellow-orange
    if (score >= 0.8 && score < 1.0) return "bg-yellow-400"; // Yellow
    if (score >= 1.0 && score < 1.4) return "bg-lime-400"; // Light Green
    if (score >= 1.4 && score < 1.8) return "bg-green-500"; // Green
    if (score >= 1.8 && score < 2.5) return "bg-green-700"; // Dark green
    return "bg-yellow-600"; // Gold for 2.5+
  };

  const handleLogout = async () => {
    // Clear both session and persistent storage
    sessionStorage.removeItem("player_email");
    localStorage.removeItem("player_email");
    toast.success("Logged out successfully");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <p className="text-muted-foreground p-4">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 md:pt-20 pb-12 px-0 md:px-4">
        <div className="container mx-auto max-w-6xl px-0 md:px-6">
          {/* Player Header */}
          <div className="relative mb-12">
            <div className="flex items-center gap-6 mb-8">
              {playerData?.image_url && (
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary shadow-[0_0_20px_hsl(var(--primary)/0.5)]">
                  <img 
                    src={playerData.image_url} 
                    alt={playerData.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground mb-2">
                  {playerData?.name || "Player Portal"}
                </h1>
                <div className="hidden md:flex items-center gap-4 text-muted-foreground">
                  {playerData?.position && (
                    <span className="text-lg">{playerData.position}</span>
                  )}
                  {playerData?.nationality && (
                    <>
                      <span>•</span>
                      <span className="text-lg">{playerData.nationality}</span>
                    </>
                  )}
                  {playerData?.currentClub && (
                    <>
                      <span>•</span>
                      <span className="text-lg">{playerData.currentClub}</span>
                    </>
                  )}
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="font-bebas uppercase tracking-wider"
              >
                Log Out
              </Button>
            </div>
          </div>

          {dailyAphorism && (
            <div className="mb-8 px-4 md:px-0">
              <Card className="bg-card/50 border-primary/20">
                <CardContent className="py-6 px-6 text-center">
                  <p className="text-lg md:text-xl font-semibold text-[#D4AF37] mb-3">
                    {dailyAphorism.featured_text}
                  </p>
                  <p className="text-base text-white">
                    {dailyAphorism.body_text}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="mb-6">
            <NotificationPermission />
          </div>

          <Tabs defaultValue="analysis" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2 mb-8 bg-muted h-auto p-2">
              <TabsTrigger value="analysis" className="font-bebas uppercase text-sm sm:text-base">
                Analysis
              </TabsTrigger>
              <TabsTrigger value="physical" className="font-bebas uppercase text-sm sm:text-base">
                Physical Programming
              </TabsTrigger>
              <TabsTrigger value="invoices" className="font-bebas uppercase text-sm sm:text-base">
                Key Documents
              </TabsTrigger>
              <TabsTrigger value="highlights" className="font-bebas uppercase text-sm sm:text-base">
                Highlights
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analysis" className="space-y-6">
              <Tabs defaultValue="performance" className="w-full">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 gap-2 mb-4 bg-muted h-auto p-2">
                  <TabsTrigger value="performance" className="font-bebas uppercase text-sm sm:text-base">
                    Performance Analysis
                  </TabsTrigger>
                  <TabsTrigger value="concepts" className="font-bebas uppercase text-sm sm:text-base">
                    Concepts
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="performance">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-3xl font-bebas uppercase tracking-wider">
                        Performance Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {analyses.length === 0 ? (
                        <div className="py-8"></div>
                      ) : (
                        <div className="space-y-3">
                          {analyses.map((analysis) => (
                            <div 
                              key={analysis.id} 
                              className="flex flex-col md:flex-row md:items-center md:justify-between border rounded-lg p-3 md:p-4 hover:border-primary transition-colors bg-card gap-3 md:gap-0"
                            >
                              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                                <span className="text-xs md:text-sm text-muted-foreground md:min-w-[100px]">
                                  {new Date(analysis.analysis_date).toLocaleDateString('en-GB')}
                                </span>
                                
                                {analysis.opponent && (
                                  <div className="flex flex-col">
                                    <span className="text-xs md:text-sm font-medium">vs {analysis.opponent}</span>
                                    {analysis.result && (
                                      <span className="text-xs text-muted-foreground">{analysis.result}</span>
                                    )}
                                  </div>
                                )}

                                {analysis.minutes_played !== null && (
                                  <span className="text-xs md:text-sm text-muted-foreground">
                                    {analysis.minutes_played} min
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                {analysis.r90_score !== null && analysis.r90_score !== undefined && (
                                  <button
                                    onClick={() => navigate(`/performance-report/${analysis.id}`)}
                                    className={`${getR90Color(analysis.r90_score)} text-white px-3 md:px-4 py-1.5 md:py-2 rounded text-sm md:text-base font-bold hover:opacity-80 transition-opacity cursor-pointer`}
                                  >
                                    R90: {analysis.r90_score.toFixed(2)}
                                  </button>
                                )}
                                
                                {analysis.analysis_writer_data && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      navigate(`/analysis/${analysis.analysis_writer_id}`);
                                    }}
                                    className={`text-xs border-0 ${
                                      analysis.analysis_writer_data.analysis_type === "pre-match" 
                                        ? "bg-gradient-to-r from-slate-300 to-slate-400 text-slate-900 hover:from-slate-400 hover:to-slate-500" 
                                        : "bg-[hsl(43,49%,61%)] text-black hover:bg-[hsl(43,49%,71%)]"
                                    }`}
                                  >
                                    <FileText className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                                    {analysis.analysis_writer_data.analysis_type === "pre-match" ? "Pre-Match" : "Post-Match"} Analysis
                                  </Button>
                                )}
                                
                                {analysis.pdf_url && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => window.open(analysis.pdf_url!, '_blank')}
                                    className="text-xs"
                                  >
                                    <FileText className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                                    PDF
                                  </Button>
                                )}
                                
                                {analysis.video_url && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => window.open(analysis.video_url!, '_blank')}
                                    className="text-xs"
                                  >
                                    📹 Video
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="concepts">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-3xl font-bebas uppercase tracking-wider">
                        Concepts
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {concepts.length === 0 ? (
                        <div className="py-8">
                          <p className="text-center text-muted-foreground">No concepts available yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-8">
                          {concepts.map((concept) => (
                            <div key={concept.id} className="border rounded-lg p-6 space-y-4">
                              <h3 className="text-2xl font-bebas uppercase tracking-wider">
                                {concept.title || "Untitled Concept"}
                              </h3>
                              {concept.concept && (
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-lg">Concept</h4>
                                  <p className="text-muted-foreground whitespace-pre-wrap">{concept.concept}</p>
                                </div>
                              )}
                              {concept.points && Array.isArray(concept.points) && concept.points.length > 0 && (
                                <div className="grid gap-4">
                                  {concept.points.map((point: any, index: number) => (
                                    <div key={index} className="space-y-2">
                                      {point.images && Array.isArray(point.images) && point.images.length > 0 && (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                          {point.images.map((img: string, imgIndex: number) => (
                                            <img
                                              key={imgIndex}
                                              src={img}
                                              alt={`Concept image ${imgIndex + 1}`}
                                              className="w-full h-48 object-cover rounded-lg"
                                            />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {concept.explanation && (
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-lg">Explanation</h4>
                                  <p className="text-muted-foreground whitespace-pre-wrap">{concept.explanation}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="physical" className="space-y-6">
              <Card className="bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-3xl font-bebas uppercase tracking-wider">
                      Physical Programming
                    </CardTitle>
                    {programs.length > 1 && (
                      <Select value={selectedProgramId || undefined} onValueChange={setSelectedProgramId}>
                        <SelectTrigger className="w-[250px]">
                          <SelectValue placeholder="Select program" />
                        </SelectTrigger>
                        <SelectContent>
                          {programs.map((program) => (
                            <SelectItem key={program.id} value={program.id}>
                              {program.program_name} {program.is_current && "(Current)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {programs.length === 0 ? (
                    <div className="py-8"></div>
                  ) : (
                    <>
                      {programs.filter(p => p.id === selectedProgramId).map((program) => {
                        const hasContent = 
                          program.overview_text || 
                          program.phase_image_url || 
                          program.player_image_url ||
                          (program.weekly_schedules && Array.isArray(program.weekly_schedules) && program.weekly_schedules.length > 0) ||
                          program.schedule_notes ||
                          (program.sessions && typeof program.sessions === 'object' && Object.keys(program.sessions).length > 0);

                        return (
                          <div key={program.id}>
                            {/* Program Header */}
                            <div className="border-b pb-4 mb-6">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h3 className="text-2xl font-bebas uppercase tracking-wider">
                                    {program.program_name}
                                  </h3>
                                  {program.phase_name && (
                                    <p className="text-lg text-muted-foreground">{program.phase_name}</p>
                                  )}
                                </div>
                                {program.is_current && (
                                  <span className="px-3 py-1 bg-primary text-black text-sm font-bebas uppercase rounded">
                                    Current
                                  </span>
                                )}
                              </div>
                              {program.phase_dates && (
                                <p className="text-sm text-muted-foreground">{program.phase_dates}</p>
                              )}
                            </div>

                            {!hasContent ? (
                              <div className="p-6 border border-primary/20 rounded-lg bg-accent/10">
                                <p className="text-center text-muted-foreground">
                                  Your coach is currently preparing the details for this program. Check back soon!
                                </p>
                              </div>
                            ) : (
                              <Accordion type="multiple" value={accordionValue} onValueChange={setAccordionValue} className="w-full">{/* defaultValue="schedule" removed as we're now using controlled state */}
                                {/* Overview Section */}
                                {(program.overview_text || program.phase_image_url || program.player_image_url) && (
                                  <AccordionItem value="overview">
                                    <AccordionTrigger className="text-xl font-bebas uppercase hover:no-underline">
                                      Overview
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-4">
                                      {program.overview_text && (
                                        <p className="text-muted-foreground whitespace-pre-wrap">{program.overview_text}</p>
                                      )}
                                      
                                      {(program.phase_image_url || program.player_image_url) && (
                                        <div className="grid md:grid-cols-2 gap-4">
                                          {program.phase_image_url && (
                                            <img 
                                              src={program.phase_image_url} 
                                              alt="Phase overview"
                                              className="w-full rounded-lg"
                                            />
                                          )}
                                          {program.player_image_url && (
                                            <img 
                                              src={program.player_image_url} 
                                              alt="Player"
                                              className="w-full rounded-lg"
                                            />
                                          )}
                                        </div>
                                      )}
                                    </AccordionContent>
                                  </AccordionItem>
                                )}

                                {/* Schedule Section */}
                                {((program.weekly_schedules && Array.isArray(program.weekly_schedules) && program.weekly_schedules.length > 0) || program.schedule_notes) && (
                                  <AccordionItem value="schedule">
                                    <AccordionTrigger className="text-xl font-bebas uppercase hover:no-underline">
                                      Schedule
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="space-y-6">
                                        {/* Weekly Schedule Table */}
                                        {program.weekly_schedules && Array.isArray(program.weekly_schedules) && program.weekly_schedules.length > 0 && (
                                          <div className="bg-black/40 rounded-xl p-2 md:p-4 overflow-x-auto">
                                            <div>
                                            {/* Table Header */}
                                            <div className="grid grid-cols-8 gap-1 md:gap-2 mb-2">
                                                 <div 
                                                  className="p-1 md:p-4 font-bebas uppercase text-[10px] md:text-lg flex items-center justify-center rounded-lg leading-tight"
                                                  style={{ 
                                                    backgroundColor: 'hsl(43, 49%, 61%)',
                                                    color: 'hsl(0, 0%, 0%)'
                                                  }}
                                                >
                                                  <span className="hidden md:inline text-center w-full">Week Start Date</span>
                                                  <span className="md:hidden text-center w-full">Week Start</span>
                                                </div>
                                              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                                                 <div 
                                                  key={day}
                                                  className="p-1 md:p-4 font-bebas uppercase text-xs md:text-lg flex items-center justify-center rounded-lg"
                                                     style={{ 
                                                       backgroundColor: 'hsl(43, 49%, 61%)',
                                                       color: 'hsl(0, 0%, 0%)'
                                                     }}
                                                   >
                                                     <span className="hidden md:inline">
                                                       {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][idx]}
                                                     </span>
                                                     <span className="md:hidden">{day}</span>
                                                   </div>
                                                 ))}
                                               </div>
                                               
                                               {/* Table Rows */}
                                               <div className="space-y-1 md:space-y-2">
                                              {program.weekly_schedules.map((week: any, idx: number) => (
                                                <div 
                                                  key={idx}
                                                  className="grid grid-cols-8 gap-1 md:gap-2"
                                                >
                                                   {/* Week Cell */}
                                                    <div 
                                                      className="p-3 md:p-6 flex flex-col items-center justify-center rounded-lg"
                                                      style={{ 
                                                        backgroundColor: 'hsl(0, 0%, 95%)',
                                                        color: 'hsl(0, 0%, 0%)'
                                                      }}
                                                    >
                                                      {week.week_start_date ? (() => {
                                                        const date = parseISO(week.week_start_date);
                                                        const day = format(date, 'd');
                                                        const suffix = day.endsWith('1') && day !== '11' ? 'st' :
                                                                      day.endsWith('2') && day !== '12' ? 'nd' :
                                                                      day.endsWith('3') && day !== '13' ? 'rd' : 'th';
                                                        return (
                                                          <div className="text-center">
                                                            <div className="text-2xl md:text-3xl font-bold mb-1">{day}<sup className="text-base">{suffix}</sup></div>
                                                            <div className="text-sm md:text-base font-medium italic">{format(date, 'MMMM')}</div>
                                                          </div>
                                                        );
                                                      })() : <span>{week.week}</span>}
                                                    </div>
                                                  
                                                  {/* Day Cells */}
                                                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day, dayIdx) => {
                                                    const sessionValue = week[day] || '';
                                                    const colors = sessionValue ? getSessionColor(sessionValue) : { bg: 'hsl(0, 0%, 10%)', text: 'hsl(0, 0%, 100%)', hover: 'hsl(0, 0%, 15%)' };
                                                    const weekDates = getWeekDates(week.week_start_date);
                                                    const dayDate = weekDates ? weekDates[day as keyof typeof weekDates] : null;
                                                    const dayImageKey = `${day}Image`; // Use camelCase for image field
                                                    const clubLogoUrl = week[dayImageKey];
                                                    
                                                    return (
                                                      <div 
                                                        key={day}
                                                        onClick={() => sessionValue && handleSessionClick(sessionValue)}
                                                        className={`p-1 md:p-3 flex items-center justify-center rounded-lg min-h-[50px] md:min-h-[60px] transition-all relative ${sessionValue ? 'cursor-pointer hover:scale-105' : ''}`}
                                                        style={{ 
                                                          backgroundColor: colors.bg,
                                                          border: '1px solid rgba(255, 255, 255, 0.1)'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                          if (sessionValue && colors.hover) {
                                                            e.currentTarget.style.backgroundColor = colors.hover;
                                                          }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                          if (sessionValue) {
                                                            e.currentTarget.style.backgroundColor = colors.bg;
                                                          }
                                                        }}
                                                      >
                                                         {/* Day number in top right */}
                                                         {dayDate && (
                                                           <span 
                                                             className="absolute top-0.5 right-0.5 text-[8px] md:text-xs opacity-50 leading-none z-30"
                                                             style={{ color: colors.text }}
                                                           >
                                                             {format(dayDate, 'd')}
                                                           </span>
                                                         )}
                                                         
                                                         {/* Display club logo if available - BEHIND the session letter */}
                                                         {clubLogoUrl && (
                                                           <div className="absolute inset-0 flex items-center justify-center p-3 z-0">
                                                             <img 
                                                               src={clubLogoUrl} 
                                                               alt={`${day} club logo`}
                                                               className="max-w-full max-h-full object-contain opacity-25"
                                                               onError={(e) => {
                                                                 console.error('Failed to load club logo:', clubLogoUrl);
                                                                 e.currentTarget.style.display = 'none';
                                                               }}
                                                             />
                                                           </div>
                                                         )}
                                                         
                                                         {sessionValue && (
                                                           <span 
                                                             className="font-bebas text-base md:text-2xl uppercase font-bold relative z-20"
                                                             style={{ 
                                                               color: colors.text,
                                                               textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
                                                             }}
                                                           >
                                                             {sessionValue}
                                                           </span>
                                                         )}
                                                      </div>
                                                   );
                                                 })}
                                               </div>
                                             ))}
                                             </div>
                                             </div>
                                           </div>
                                         )}

                                        {/* Schedule Notes */}
                                        {program.schedule_notes && (
                                          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6">
                                            <p className="text-base text-foreground/90 leading-relaxed">{program.schedule_notes}</p>
                                          </div>
                                        )}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                )}

                                {/* Sessions Section */}
                                {program.sessions && typeof program.sessions === 'object' && Object.keys(program.sessions).length > 0 && (() => {
                                  // Define all possible sessions A-H
                                  const allSessions = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
                                  
                                  // Check which sessions have actual exercise data
                                  const hasSessionData = (sessionKey: string) => {
                                    const mainSession = program.sessions[sessionKey] || program.sessions[sessionKey.toLowerCase()];
                                    const preSession = program.sessions[`PRE-${sessionKey}`] || program.sessions[`pre-${sessionKey.toLowerCase()}`];
                                    
                                    const mainHasData = mainSession && mainSession.exercises && Array.isArray(mainSession.exercises) && mainSession.exercises.length > 0;
                                    const preHasData = preSession && preSession.exercises && Array.isArray(preSession.exercises) && preSession.exercises.length > 0;
                                    
                                    return !!(mainHasData || preHasData);
                                  };
                                  
                                  // Find first session with data
                                  const firstSessionWithData = allSessions.find(s => hasSessionData(s)) || 'A';
                                  
                                  return (
                                    <AccordionItem value="sessions">
                                      <AccordionTrigger className="text-xl font-bebas uppercase hover:no-underline">
                                        Sessions
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        {/* Main Session Tabs - Two Rows */}
                                        <div className="space-y-2 mb-4">
                                          {/* First Row: A, B, C, D */}
                                           <div className="grid grid-cols-4 gap-2">
                                             {['A', 'B', 'C', 'D'].map((mainKey) => {
                                               const colors = getSessionColor(mainKey);
                                               const hasData = hasSessionData(mainKey);
                                               const isActive = (selectedSession || firstSessionWithData) === mainKey;
                                               return (
                                                 <Button
                                                   key={mainKey}
                                                   onClick={() => hasData && setSelectedSession(mainKey)}
                                                   disabled={!hasData}
                                                   className="font-bebas uppercase text-sm"
                                                   style={{
                                                     backgroundColor: hasData ? colors.bg : 'hsl(0, 0%, 20%)',
                                                     color: hasData ? colors.text : 'hsl(0, 0%, 40%)',
                                                     opacity: hasData ? (isActive ? 1 : 0.7) : 0.3,
                                                     border: isActive ? '2px solid white' : 'none',
                                                     cursor: hasData ? 'pointer' : 'not-allowed',
                                                   }}
                                                 >
                                                   Session {mainKey}
                                                 </Button>
                                               );
                                             })}
                                           </div>
                                           
                                           {/* Second Row: E, F, G, H */}
                                           <div className="grid grid-cols-4 gap-2">
                                             {['E', 'F', 'G', 'H'].map((mainKey) => {
                                               const colors = getSessionColor(mainKey);
                                               const hasData = hasSessionData(mainKey);
                                               const isActive = (selectedSession || firstSessionWithData) === mainKey;
                                               return (
                                                 <Button
                                                   key={mainKey}
                                                   onClick={() => hasData && setSelectedSession(mainKey)}
                                                   disabled={!hasData}
                                                   className="font-bebas uppercase text-sm"
                                                   style={{
                                                     backgroundColor: hasData ? colors.bg : 'hsl(0, 0%, 20%)',
                                                     color: hasData ? colors.text : 'hsl(0, 0%, 40%)',
                                                     opacity: hasData ? (isActive ? 1 : 0.7) : 0.3,
                                                     border: isActive ? '2px solid white' : 'none',
                                                     cursor: hasData ? 'pointer' : 'not-allowed',
                                                   }}
                                                 >
                                                   Session {mainKey}
                                                 </Button>
                                               );
                                             })}
                                           </div>
                                        </div>
                                        
                                        {/* Main Session Content with Sub-tabs */}
                                        {allSessions.map((mainKey) => {
                                            const preKey = `PRE-${mainKey}`;
                                            const preSessionData = program.sessions[preKey] || program.sessions[preKey.toLowerCase()];
                                            const mainSession = program.sessions[mainKey] || program.sessions[mainKey.toLowerCase()];
                                            
                                            // Check if sessions have actual exercise data
                                            const hasPreSession = preSessionData && preSessionData.exercises && Array.isArray(preSessionData.exercises) && preSessionData.exercises.length > 0;
                                            const hasMainSession = mainSession && mainSession.exercises && Array.isArray(mainSession.exercises) && mainSession.exercises.length > 0;
                                            
                                          // Only render content if there's data for this session and it's selected
                                          if (!hasPreSession && !hasMainSession) return null;
                                          if ((selectedSession || firstSessionWithData) !== mainKey) return null;
                                          
                                           return (
                                             <div key={mainKey} className="mt-4">
                                                 <Tabs defaultValue={hasPreSession ? "pre" : "main"} className="w-full">
                                                    {/* Sub-tabs for Pre and Main Session */}
                                                     <TabsList className="grid w-full gap-2 grid-cols-2 mb-4 bg-transparent p-0">
                                                        {hasPreSession && (
                                                          <TabsTrigger
                                                            value="pre"
                                                            className="font-bebas uppercase text-sm transition-all data-[state=active]:!bg-[hsl(43,49%,61%)] data-[state=active]:!text-black"
                                                            style={{
                                                              backgroundColor: getSessionColor(preKey).bg,
                                                              color: getSessionColor(preKey).text,
                                                            }}
                                                          >
                                                            Pre-{mainKey}
                                                          </TabsTrigger>
                                                        )}
                                                        {hasMainSession && (
                                                          <TabsTrigger
                                                            value="main"
                                                            className="font-bebas uppercase text-sm transition-all data-[state=active]:!bg-[hsl(43,49%,61%)] data-[state=active]:!text-black"
                                                            style={{
                                                              backgroundColor: getSessionColor(mainKey).bg,
                                                              color: getSessionColor(mainKey).text,
                                                            }}
                                                          >
                                                            Session {mainKey}
                                                          </TabsTrigger>
                                                        )}
                                                    </TabsList>
                                                  
                                                   {/* Pre Session Content */}
                                                   {hasPreSession && (
                                                     <TabsContent value="pre">
                                                       {preSessionData.exercises && Array.isArray(preSessionData.exercises) && preSessionData.exercises.length > 0 && (
                                                        <div className="space-y-4">
                                                           {/* Exercise Table */}
                                                          <div className="border-2 border-white rounded-lg overflow-hidden">
                                                            <div 
                                                              className="grid grid-cols-5 gap-0 text-xs md:text-base"
                                                            >
                                                              <div 
                                                                className="p-2 md:p-4 font-bebas uppercase border-r-2 border-white text-center"
                                                                style={{ 
                                                                  backgroundColor: 'hsl(43, 49%, 61%)',
                                                                  color: 'hsl(0, 0%, 0%)'
                                                                }}
                                                              >
                                                                Exercise Name
                                                              </div>
                                                              <div 
                                                                className="p-2 md:p-4 font-bebas uppercase border-r-2 border-white text-center"
                                                                style={{ 
                                                                  backgroundColor: 'hsl(43, 49%, 61%)',
                                                                  color: 'hsl(0, 0%, 0%)'
                                                                }}
                                                              >
                                                                Reps
                                                              </div>
                                                              <div 
                                                                className="p-2 md:p-4 font-bebas uppercase border-r-2 border-white text-center"
                                                                style={{ 
                                                                  backgroundColor: 'hsl(43, 49%, 61%)',
                                                                  color: 'hsl(0, 0%, 0%)'
                                                                }}
                                                              >
                                                                Sets
                                                              </div>
                                                              <div 
                                                                className="p-2 md:p-4 font-bebas uppercase border-r-2 border-white text-center"
                                                                style={{ 
                                                                  backgroundColor: 'hsl(43, 49%, 61%)',
                                                                  color: 'hsl(0, 0%, 0%)'
                                                                }}
                                                              >
                                                                Load
                                                              </div>
                                                              <div 
                                                                className="p-2 md:p-4 font-bebas uppercase text-center"
                                                                style={{ 
                                                                  backgroundColor: 'hsl(43, 49%, 61%)',
                                                                  color: 'hsl(0, 0%, 0%)'
                                                                }}
                                                              >
                                                                <span className="hidden md:inline">Recovery Time</span>
                                                                <span className="md:hidden">Recovery</span>
                                                              </div>
                                                            </div>
                                                            
                                                             <div>
                                                               {preSessionData.exercises.map((exercise: any, idx: number) => (
                                                                <div 
                                                                  key={idx}
                                                                  onClick={() => handleExerciseClick(exercise)}
                                                                  className="grid grid-cols-5 gap-0 border-t-2 border-white cursor-pointer hover:opacity-80 transition-opacity min-h-[60px] md:min-h-[80px]"
                                                                >
                                                                  <div 
                                                                    className="p-2 md:p-4 text-xs md:text-sm font-medium border-r-2 border-white flex items-center justify-center text-center break-words"
                                                                    style={{ 
                                                                      backgroundColor: 'hsl(45, 40%, 80%)',
                                                                      color: 'hsl(0, 0%, 0%)'
                                                                    }}
                                                                  >
                                                                    {exercise.name || exercise}
                                                                  </div>
                                                                  <div 
                                                                    className="p-2 md:p-4 text-xs md:text-sm italic border-r-2 border-white flex items-center justify-center text-center"
                                                                    style={{ 
                                                                      backgroundColor: 'hsl(0, 0%, 10%)',
                                                                      color: 'hsl(0, 0%, 100%)'
                                                                    }}
                                                                  >
                                                                    {exercise.reps || exercise.repetitions || '-'}
                                                                  </div>
                                                                  <div
                                                                    className="p-2 md:p-4 text-xs md:text-sm italic border-r-2 border-white flex items-center justify-center text-center"
                                                                    style={{ 
                                                                      backgroundColor: 'hsl(0, 0%, 10%)',
                                                                      color: 'hsl(0, 0%, 100%)'
                                                                    }}
                                                                  >
                                                                    {exercise.sets || '-'}
                                                                  </div>
                                                                  <div 
                                                                    className="p-2 md:p-4 text-xs md:text-sm italic border-r-2 border-white flex items-center justify-center text-center"
                                                                    style={{ 
                                                                      backgroundColor: 'hsl(0, 0%, 10%)',
                                                                      color: 'hsl(0, 0%, 100%)'
                                                                    }}
                                                                  >
                                                                    {exercise.load && exercise.load !== "'-" ? exercise.load : '-'}
                                                                  </div>
                                                                  <div 
                                                                    className="p-2 md:p-4 text-xs md:text-sm italic flex items-center justify-center text-center"
                                                                    style={{ 
                                                                      backgroundColor: 'hsl(0, 0%, 10%)',
                                                                      color: 'hsl(0, 0%, 100%)'
                                                                    }}
                                                                  >
                                                                    {exercise.rest || exercise.recoveryTime || exercise.recovery_time || '-'}
                                                                  </div>
                                                                </div>
                                                              ))}
                                                            </div>
                                                          </div>
                                                        </div>
                                                      )}
                                                    </TabsContent>
                                                  )}
                                                  
                                                   {/* Main Session Content */}
                                                   {hasMainSession && (
                                                     <TabsContent value="main">
                                                       {mainSession.exercises && Array.isArray(mainSession.exercises) && mainSession.exercises.length > 0 && (
                                                        <div className="space-y-4">
                                                          {/* Exercise Table */}
                                                          <div className="border-2 border-white rounded-lg overflow-hidden">
                                                            <div 
                                                              className="grid grid-cols-5 gap-0 text-xs md:text-base"
                                                            >
                                                              <div 
                                                                className="p-2 md:p-4 font-bebas uppercase border-r-2 border-white text-center"
                                                                style={{ 
                                                                  backgroundColor: 'hsl(43, 49%, 61%)',
                                                                  color: 'hsl(0, 0%, 0%)'
                                                                }}
                                                              >
                                                                Exercise Name
                                                              </div>
                                                              <div 
                                                                className="p-2 md:p-4 font-bebas uppercase border-r-2 border-white text-center"
                                                                style={{ 
                                                                  backgroundColor: 'hsl(43, 49%, 61%)',
                                                                  color: 'hsl(0, 0%, 0%)'
                                                                }}
                                                              >
                                                                Reps
                                                              </div>
                                                              <div 
                                                                className="p-2 md:p-4 font-bebas uppercase border-r-2 border-white text-center"
                                                                style={{ 
                                                                  backgroundColor: 'hsl(43, 49%, 61%)',
                                                                  color: 'hsl(0, 0%, 0%)'
                                                                }}
                                                              >
                                                                Sets
                                                              </div>
                                                              <div 
                                                                className="p-2 md:p-4 font-bebas uppercase border-r-2 border-white text-center"
                                                                style={{ 
                                                                  backgroundColor: 'hsl(43, 49%, 61%)',
                                                                  color: 'hsl(0, 0%, 0%)'
                                                                }}
                                                              >
                                                                Load
                                                              </div>
                                                              <div 
                                                                className="p-2 md:p-4 font-bebas uppercase text-center"
                                                                style={{ 
                                                                  backgroundColor: 'hsl(43, 49%, 61%)',
                                                                  color: 'hsl(0, 0%, 0%)'
                                                                }}
                                                              >
                                                                <span className="hidden md:inline">Recovery Time</span>
                                                                <span className="md:hidden">Recovery</span>
                                                              </div>
                                                            </div>
                                                            
                                                            <div>
                                                              {mainSession.exercises.map((exercise: any, idx: number) => (
                                                                <div 
                                                                  key={idx}
                                                                  onClick={() => handleExerciseClick(exercise)}
                                                                  className="grid grid-cols-5 gap-0 border-t-2 border-white cursor-pointer hover:opacity-80 transition-opacity min-h-[60px] md:min-h-[80px]"
                                                                >
                                                                  <div 
                                                                    className="p-2 md:p-4 text-xs md:text-sm font-medium border-r-2 border-white flex items-center justify-center text-center break-words"
                                                                    style={{ 
                                                                      backgroundColor: 'hsl(45, 40%, 80%)',
                                                                      color: 'hsl(0, 0%, 0%)'
                                                                    }}
                                                                  >
                                                                    {exercise.name || exercise}
                                                                  </div>
                                                                  <div 
                                                                    className="p-2 md:p-4 text-xs md:text-sm italic border-r-2 border-white flex items-center justify-center text-center"
                                                                    style={{ 
                                                                      backgroundColor: 'hsl(0, 0%, 10%)',
                                                                      color: 'hsl(0, 0%, 100%)'
                                                                    }}
                                                                  >
                                                                    {exercise.reps || exercise.repetitions || '-'}
                                                                  </div>
                                                                  <div
                                                                    className="p-2 md:p-4 text-xs md:text-sm italic border-r-2 border-white flex items-center justify-center text-center"
                                                                    style={{ 
                                                                      backgroundColor: 'hsl(0, 0%, 10%)',
                                                                      color: 'hsl(0, 0%, 100%)'
                                                                    }}
                                                                  >
                                                                    {exercise.sets || '-'}
                                                                  </div>
                                                                  <div 
                                                                    className="p-2 md:p-4 text-xs md:text-sm italic border-r-2 border-white flex items-center justify-center text-center"
                                                                    style={{ 
                                                                      backgroundColor: 'hsl(0, 0%, 10%)',
                                                                      color: 'hsl(0, 0%, 100%)'
                                                                    }}
                                                                  >
                                                                    {exercise.load && exercise.load !== "'-" ? exercise.load : '-'}
                                                                  </div>
                                                                  <div 
                                                                    className="p-2 md:p-4 text-xs md:text-sm italic flex items-center justify-center text-center"
                                                                    style={{ 
                                                                      backgroundColor: 'hsl(0, 0%, 10%)',
                                                                      color: 'hsl(0, 0%, 100%)'
                                                                    }}
                                                                  >
                                                                    {exercise.rest || exercise.recoveryTime || exercise.recovery_time || '-'}
                                                                  </div>
                                                                </div>
                                                              ))}
                                                            </div>
                                                          </div>
                                                        </div>
                                                      )}
                                                    </TabsContent>
                                                  )}
                                                </Tabs>
                                              </div>
                                            );
                                          })}
                                      </AccordionContent>
                                    </AccordionItem>
                                  );
                                })()}

                                {/* Testing Section */}
                                <AccordionItem value="testing">
                                  <AccordionTrigger className="text-xl font-bebas uppercase hover:no-underline">
                                    Testing
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <p className="text-muted-foreground">
                                      Testing protocols and benchmarks will be added here by your coach.
                                    </p>
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices" className="space-y-6">
              <Tabs defaultValue="invoices" className="w-full">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 gap-2 mb-4 bg-muted h-auto p-2">
                  <TabsTrigger value="invoices" className="font-bebas uppercase text-sm sm:text-base">
                    Invoices
                  </TabsTrigger>
                  <TabsTrigger value="other" className="font-bebas uppercase text-sm sm:text-base">
                    Other
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="invoices">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-3xl font-bebas uppercase tracking-wider">
                        Invoices
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {invoices.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                          No invoices available yet.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {invoices.map((invoice) => {
                            const getStatusColor = (status: string) => {
                              switch (status) {
                                case 'paid':
                                  return 'bg-green-500/10 text-green-500 border-green-500/20';
                                case 'pending':
                                  return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
                                case 'overdue':
                                  return 'bg-red-500/10 text-red-500 border-red-500/20';
                                case 'cancelled':
                                  return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
                                default:
                                  return 'bg-muted text-muted-foreground';
                              }
                            };

                            return (
                              <div 
                                key={invoice.id}
                                className="flex flex-col md:flex-row md:items-center md:justify-between border rounded-lg p-4 hover:border-primary transition-colors bg-card gap-4"
                              >
                                <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
                                  <div className="flex flex-col">
                                    <span className="font-mono text-sm font-medium">
                                      {invoice.invoice_number}
                                    </span>
                                    {invoice.description && (
                                      <span className="text-xs text-muted-foreground">
                                        {invoice.description}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                    <span className="text-sm text-muted-foreground">
                                      Issued: {format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                      Due: {format(new Date(invoice.due_date), 'dd/MM/yyyy')}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-4">
                                    <span className="text-lg font-bold">
                                      {invoice.amount.toFixed(2)} {invoice.currency}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase border ${getStatusColor(invoice.status)}`}>
                                      {invoice.status}
                                    </span>
                                  </div>
                                </div>

                                {invoice.pdf_url && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(invoice.pdf_url!, '_blank')}
                                  >
                                    <FileText className="w-4 h-4 mr-2" />
                                    View PDF
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="other">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-3xl font-bebas uppercase tracking-wider">
                        Other Documents
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="py-8 text-center text-muted-foreground">
                        No other documents available yet.
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="highlights" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-3xl font-bebas uppercase tracking-wider">
                    Highlights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    let highlightsData = { matchHighlights: [], bestClips: [] };
                    try {
                      const parsed = playerData?.highlights ? JSON.parse(playerData.highlights) : [];
                      // Handle legacy array format or new object format
                      if (Array.isArray(parsed)) {
                        highlightsData = { matchHighlights: parsed, bestClips: [] };
                      } else {
                        highlightsData = {
                          matchHighlights: parsed.matchHighlights || [],
                          bestClips: parsed.bestClips || []
                        };
                      }
                    } catch (e) {
                      console.error('Error parsing highlights:', e);
                    }
                    
                    const hasContent = highlightsData.matchHighlights.length > 0 || highlightsData.bestClips.length > 0;
                    
                    if (!hasContent) {
                      return (
                        <div className="py-8 text-center text-muted-foreground">
                          No highlights available yet.
                        </div>
                      );
                    }
                    
                    return (
                      <Tabs defaultValue="match" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                          <TabsTrigger value="match" className="font-bebas uppercase">
                            Match Highlights
                          </TabsTrigger>
                          <TabsTrigger value="best" className="font-bebas uppercase">
                            Best Clips
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="match">
                          {highlightsData.matchHighlights.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">
                              No match highlights available yet.
                            </div>
                          ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                              {highlightsData.matchHighlights.map((highlight: any, index: number) => (
                                <div 
                                  key={index}
                                  className="border rounded-lg overflow-hidden hover:border-primary transition-colors bg-card"
                                >
                                  {highlight.clubLogo && (
                                    <div className="relative aspect-video bg-black">
                                      <img 
                                        src={highlight.clubLogo} 
                                        alt={highlight.name || `Highlight ${index + 1}`}
                                        className="w-full h-full object-contain p-8"
                                      />
                                    </div>
                                  )}
                                   <div className="p-4 space-y-3">
                                     <div className="flex items-start gap-3">
                                       <span className="text-2xl font-bold text-primary">{index + 1}</span>
                                       <div className="flex-1">
                                         <h3 className="font-bebas text-xl uppercase tracking-wider">
                                           {highlight.name || `Match Highlight ${index + 1}`}
                                         </h3>
                                       </div>
                                     </div>
                                     <div className="flex gap-2">
                                      {highlight.videoUrl && (
                                        <>
                                          <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => window.open(highlight.videoUrl, '_blank')}
                                            className="flex-1"
                                          >
                                            <Play className="w-4 h-4 mr-2" />
                                            Watch
                                          </Button>
                                          <Button 
                                            variant="default" 
                                            size="sm"
                                            onClick={async () => {
                                              try {
                                                const videoUrl = highlight.videoUrl || highlight.url;
                                                const fileName = highlight.name || highlight.title || `highlight-${index + 1}`;
                                                
                                                toast.info("Starting download...");
                                                
                                                const response = await fetch(videoUrl);
                                                const blob = await response.blob();
                                                
                                                const blobUrl = window.URL.createObjectURL(blob);
                                                const link = document.createElement('a');
                                                link.href = blobUrl;
                                                link.download = fileName;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                                
                                                window.URL.revokeObjectURL(blobUrl);
                                                
                                                toast.success("Download completed");
                                              } catch (error) {
                                                console.error('Download error:', error);
                                                toast.error("Download failed");
                                              }
                                            }}
                                            className="flex-1"
                                          >
                                            <Download className="w-4 h-4 mr-2" />
                                            Download
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="best">
                          {highlightsData.bestClips.length === 0 ? (
                            <div className="py-8 text-center space-y-4">
                              <p className="text-muted-foreground">No best clips available yet.</p>
                              <Button 
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'video/mp4,video/quicktime,video/x-msvideo,video/*';
                                  input.onchange = async (e: any) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    
                                    const clipName = prompt('Enter a name for this clip:');
                                    if (!clipName) return;
                                    
                                    try {
                                      toast.info("Uploading clip...");
                                      
                                      const fileName = `${playerData.id}_${Date.now()}_${file.name}`;
                                      const { error: uploadError } = await supabase.storage
                                        .from('analysis-files')
                                        .upload(`highlights/${fileName}`, file);
                                      
                                      if (uploadError) throw uploadError;
                                      
                                      const { data: { publicUrl } } = supabase.storage
                                        .from('analysis-files')
                                        .getPublicUrl(`highlights/${fileName}`);
                                      
                                      const parsed = playerData?.highlights ? JSON.parse(playerData.highlights) : {};
                                      const updatedHighlights = {
                                        matchHighlights: parsed.matchHighlights || [],
                                        bestClips: [
                                          ...(parsed.bestClips || []),
                                          {
                                            name: clipName,
                                            videoUrl: publicUrl,
                                            addedAt: new Date().toISOString()
                                          }
                                        ]
                                      };
                                      
                                      const { error: updateError } = await supabase
                                        .from('players')
                                        .update({ highlights: JSON.stringify(updatedHighlights) })
                                        .eq('id', playerData.id);
                                      
                                      if (updateError) throw updateError;
                                      
                                      toast.success("Clip uploaded successfully!");
                                      window.location.reload();
                                    } catch (error) {
                                      console.error('Upload error:', error);
                                      toast.error("Failed to upload clip");
                                    }
                                  };
                                  input.click();
                                }}
                                variant="outline"
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Clip
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex justify-end">
                                <Button 
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'video/mp4,video/quicktime,video/x-msvideo,video/*';
                                    input.onchange = async (e: any) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      
                                      const clipName = prompt('Enter a name for this clip:');
                                      if (!clipName) return;
                                      
                                      try {
                                        toast.info("Uploading clip...");
                                        
                                        const fileName = `${playerData.id}_${Date.now()}_${file.name}`;
                                        const { error: uploadError } = await supabase.storage
                                          .from('analysis-files')
                                          .upload(`highlights/${fileName}`, file);
                                        
                                        if (uploadError) throw uploadError;
                                        
                                        const { data: { publicUrl } } = supabase.storage
                                          .from('analysis-files')
                                          .getPublicUrl(`highlights/${fileName}`);
                                        
                                        const parsed = playerData?.highlights ? JSON.parse(playerData.highlights) : {};
                                        const updatedHighlights = {
                                          matchHighlights: parsed.matchHighlights || [],
                                          bestClips: [
                                            ...(parsed.bestClips || []),
                                            {
                                              name: clipName,
                                              videoUrl: publicUrl,
                                              addedAt: new Date().toISOString()
                                            }
                                          ]
                                        };
                                        
                                        const { error: updateError } = await supabase
                                          .from('players')
                                          .update({ highlights: JSON.stringify(updatedHighlights) })
                                          .eq('id', playerData.id);
                                        
                                        if (updateError) throw updateError;
                                        
                                        toast.success("Clip uploaded successfully!");
                                        window.location.reload();
                                      } catch (error) {
                                        console.error('Upload error:', error);
                                        toast.error("Failed to upload clip");
                                      }
                                    };
                                    input.click();
                                  }}
                                  variant="outline"
                                  size="sm"
                                >
                                  <Upload className="w-4 h-4 mr-2" />
                                  Upload Clip
                                </Button>
                              </div>
                              <div className="grid gap-4 md:grid-cols-2">
                              {highlightsData.bestClips.map((highlight: any, index: number) => (
                                <div 
                                  key={index}
                                  className="border rounded-lg overflow-hidden hover:border-primary transition-colors bg-card"
                                >
                                  <div className="p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-start gap-3 flex-1">
                                        <span className="text-2xl font-bold text-primary">{index + 1}</span>
                                        <div className="flex-1">
                                          <h3 className="font-bebas text-xl uppercase tracking-wider">
                                            {highlight.name || `Best Clip ${index + 1}`}
                                          </h3>
                                        </div>
                                      </div>
                                      <div className="flex gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={async () => {
                                            if (index > 0) {
                                              const newBestClips = [...highlightsData.bestClips];
                                              [newBestClips[index - 1], newBestClips[index]] = [newBestClips[index], newBestClips[index - 1]];
                                              
                                              try {
                                                const updatedHighlights = {
                                                  matchHighlights: highlightsData.matchHighlights,
                                                  bestClips: newBestClips
                                                };
                                                
                                                const { error } = await supabase
                                                  .from('players')
                                                  .update({ highlights: JSON.stringify(updatedHighlights) })
                                                  .eq('id', playerData.id);
                                                
                                                if (error) throw error;
                                                toast.success("Clip moved up");
                                                window.location.reload();
                                              } catch (error) {
                                                console.error('Reorder error:', error);
                                                toast.error("Failed to reorder");
                                              }
                                            }
                                          }}
                                          disabled={index === 0}
                                          title="Move up"
                                        >
                                          ↑
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={async () => {
                                            if (index < highlightsData.bestClips.length - 1) {
                                              const newBestClips = [...highlightsData.bestClips];
                                              [newBestClips[index], newBestClips[index + 1]] = [newBestClips[index + 1], newBestClips[index]];
                                              
                                              try {
                                                const updatedHighlights = {
                                                  matchHighlights: highlightsData.matchHighlights,
                                                  bestClips: newBestClips
                                                };
                                                
                                                const { error } = await supabase
                                                  .from('players')
                                                  .update({ highlights: JSON.stringify(updatedHighlights) })
                                                  .eq('id', playerData.id);
                                                
                                                if (error) throw error;
                                                toast.success("Clip moved down");
                                                window.location.reload();
                                              } catch (error) {
                                                console.error('Reorder error:', error);
                                                toast.error("Failed to reorder");
                                              }
                                            }
                                          }}
                                          disabled={index === highlightsData.bestClips.length - 1}
                                          title="Move down"
                                        >
                                          ↓
                                        </Button>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      {highlight.videoUrl && (
                                        <>
                                          <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => window.open(highlight.videoUrl, '_blank')}
                                            className="flex-1"
                                          >
                                            <Play className="w-4 h-4 mr-2" />
                                            Watch
                                          </Button>
                                          <Button 
                                            variant="default" 
                                            size="sm"
                                            onClick={async () => {
                                              try {
                                                const videoUrl = highlight.videoUrl || highlight.url;
                                                const fileName = highlight.name || highlight.title || `clip-${index + 1}`;
                                                
                                                toast.info("Starting download...");
                                                
                                                const response = await fetch(videoUrl);
                                                const blob = await response.blob();
                                                
                                                const blobUrl = window.URL.createObjectURL(blob);
                                                const link = document.createElement('a');
                                                link.href = blobUrl;
                                                link.download = fileName;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                                
                                                window.URL.revokeObjectURL(blobUrl);
                                                
                                                toast.success("Download completed");
                                              } catch (error) {
                                                console.error('Download error:', error);
                                                toast.error("Download failed");
                                              }
                                            }}
                                            className="flex-1"
                                          >
                                            <Download className="w-4 h-4 mr-2" />
                                            Download
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                              </div>
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />

      {/* Exercise Details Dialog */}
      <Dialog open={exerciseDialogOpen} onOpenChange={setExerciseDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-bebas uppercase text-2xl">
              {selectedExercise?.name || 'Exercise Details'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedExercise?.description && (
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedExercise.description}
                </p>
              </div>
            )}
            
            {(selectedExercise?.videoUrl || selectedExercise?.video_url) && (
              <div>
                <h4 className="font-semibold mb-2">Video</h4>
                <a 
                  href={selectedExercise.videoUrl || selectedExercise.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <Play className="w-4 h-4" />
                  Watch Exercise Video
                </a>
              </div>
            )}
            
            {!selectedExercise?.description && !selectedExercise?.videoUrl && !selectedExercise?.video_url && (
              <p className="text-sm text-muted-foreground italic">
                No additional details available for this exercise.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
