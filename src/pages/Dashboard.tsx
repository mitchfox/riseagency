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
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { FileText } from "lucide-react";

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

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [playerData, setPlayerData] = useState<any>(null);
  const [programs, setPrograms] = useState<PlayerProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  // Session color mapping
  const getSessionColor = (sessionKey: string) => {
    const key = sessionKey.toUpperCase();
    const colorMap: Record<string, { bg: string; text: string }> = {
      'A': { bg: 'hsl(220, 70%, 35%)', text: 'hsl(45, 100%, 60%)' },
      'B': { bg: 'hsl(140, 50%, 30%)', text: 'hsl(45, 100%, 60%)' },
      'C': { bg: 'hsl(0, 50%, 35%)', text: 'hsl(45, 100%, 60%)' },
      'D': { bg: 'hsl(45, 70%, 45%)', text: 'hsl(45, 100%, 60%)' },
      'E': { bg: 'hsl(70, 20%, 40%)', text: 'hsl(45, 100%, 60%)' },
      'F': { bg: 'hsl(270, 60%, 40%)', text: 'hsl(45, 100%, 60%)' },
      'G': { bg: 'hsl(190, 70%, 45%)', text: 'hsl(45, 100%, 60%)' },
      'PRE-B': { bg: 'hsl(220, 80%, 20%)', text: 'hsl(45, 100%, 60%)' },
      'PRE-C': { bg: 'hsl(220, 80%, 20%)', text: 'hsl(45, 100%, 60%)' },
      'PREHAB': { bg: 'hsl(220, 80%, 20%)', text: 'hsl(45, 100%, 60%)' },
      'T': { bg: 'hsl(140, 50%, 20%)', text: 'hsl(45, 100%, 60%)' },
      'TESTING': { bg: 'hsl(140, 50%, 20%)', text: 'hsl(45, 100%, 60%)' },
      'R': { bg: 'hsl(0, 0%, 85%)', text: 'hsl(45, 100%, 45%)' },
      'REST': { bg: 'hsl(0, 0%, 85%)', text: 'hsl(45, 100%, 45%)' },
    };
    return colorMap[key] || { bg: 'hsl(0, 0%, 15%)', text: 'hsl(0, 0%, 100%)' };
  };

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/login");
      } else {
        setUser(session.user);
        fetchAnalyses(session.user.email);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

      setUser(session.user);
      await fetchAnalyses(session.user.email);
      await fetchPrograms(session.user.email);
    } catch (error) {
      console.error("Auth error:", error);
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

  const getR90Color = (score: number) => {
    if (score < 0) return "bg-red-900";
    if (score >= 0 && score < 0.5) return "bg-red-600";
    if (score >= 0.5 && score < 1.0) return "bg-yellow-500";
    if (score >= 1.0 && score < 1.5) return "bg-lime-400";
    if (score >= 1.5 && score < 2.5) return "bg-green-500";
    return "bg-green-700";
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
      <main className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
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
                <h1 className="text-5xl md:text-6xl font-bebas uppercase tracking-wider text-foreground mb-2">
                  {playerData?.name || user?.user_metadata?.full_name || "Player Portal"}
                </h1>
                <div className="flex items-center gap-4 text-muted-foreground">
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

          <Tabs defaultValue="analysis" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="analysis" className="font-bebas uppercase">
                Performance Analysis
              </TabsTrigger>
              <TabsTrigger value="physical" className="font-bebas uppercase">
                Physical Programming
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analysis" className="space-y-6">
              <Card className="bg-marble">
                <CardHeader>
                  <CardTitle className="text-3xl font-bebas uppercase tracking-wider">
                    Performance Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analyses.length === 0 ? (
                    <>
                      <p className="text-muted-foreground">
                        Your personalized performance analysis will appear here. This section will include:
                      </p>
                      <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                        <li>Match performance reviews</li>
                        <li>Technical skill assessments</li>
                        <li>Tactical positioning analysis</li>
                        <li>Areas for improvement</li>
                        <li>Strengths to leverage</li>
                      </ul>
                      <div className="mt-6 p-6 border border-primary/20 rounded-lg">
                        <p className="text-center text-muted-foreground italic">
                          Content coming soon - your coach will upload analysis reports here
                        </p>
                      </div>
                    </>
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
                    <div className="space-y-4">
                      <p className="text-muted-foreground">
                        Your personalized physical training program will appear here. This section will include:
                      </p>
                      <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                        <li>Weekly training schedules</li>
                        <li>Strength & conditioning workouts</li>
                        <li>Recovery protocols</li>
                        <li>Nutrition guidelines</li>
                        <li>Injury prevention exercises</li>
                      </ul>
                      <div className="mt-6 p-6 border border-primary/20 rounded-lg">
                        <p className="text-center text-muted-foreground italic">
                          Content coming soon - your strength coach will upload programs here
                        </p>
                      </div>
                    </div>
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
                              <Accordion type="single" defaultValue="schedule" className="w-full" collapsible>
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
                                      <div className="space-y-4">
                                        {/* Weekly Schedule */}
                                        {program.weekly_schedules && Array.isArray(program.weekly_schedules) && program.weekly_schedules.length > 0 && (
                                          <div className="space-y-4">
                                            {program.weekly_schedules.map((week: any, idx: number) => (
                                              <div key={idx} className="border rounded-lg p-4">
                                                <h6 className="font-bebas text-base mb-3">Week {week.week || idx + 1}</h6>
                                                <div className="grid gap-2">
                                                  {Object.entries(week).filter(([key]) => key !== 'week').map(([day, value]) => {
                                                    const sessionValue = value as string;
                                                    const colors = sessionValue ? getSessionColor(sessionValue) : null;
                                                    return (
                                                      <div key={day} className="flex justify-between py-2 border-b last:border-0">
                                                        <span className="font-medium capitalize">{day}</span>
                                                        {sessionValue ? (
                                                          <span 
                                                            className="px-3 py-1 rounded font-bebas uppercase text-sm"
                                                            style={{ 
                                                              backgroundColor: colors?.bg,
                                                              color: colors?.text
                                                            }}
                                                          >
                                                            {sessionValue}
                                                          </span>
                                                        ) : (
                                                          <span className="text-muted-foreground">-</span>
                                                        )}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* Schedule Notes */}
                                        {program.schedule_notes && (
                                          <div className="bg-accent/20 border border-primary/20 rounded-lg p-4">
                                            <h5 className="text-base font-bebas uppercase mb-2">Notes</h5>
                                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{program.schedule_notes}</p>
                                          </div>
                                        )}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                )}

                                {/* Sessions Section */}
                                {program.sessions && typeof program.sessions === 'object' && Object.keys(program.sessions).length > 0 && (
                                  <AccordionItem value="sessions">
                                    <AccordionTrigger className="text-xl font-bebas uppercase hover:no-underline">
                                      Sessions
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="space-y-3">
                                        {Object.entries(program.sessions).map(([key, session]: [string, any]) => {
                                          const colors = getSessionColor(key);
                                          return (
                                            <div 
                                              key={key} 
                                              className="rounded-lg p-4"
                                              style={{ 
                                                backgroundColor: colors.bg,
                                              }}
                                            >
                                              <h5 
                                                className="font-bebas text-lg mb-2 uppercase"
                                                style={{ color: colors.text }}
                                              >
                                                Session {key}
                                              </h5>
                                              {session.exercises && Array.isArray(session.exercises) && (
                                                <div className="space-y-1">
                                                  {session.exercises.map((exercise: any, idx: number) => (
                                                    <div key={idx} className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                                                      <span className="font-medium">{exercise.name || exercise}</span>
                                                      {exercise.repetitions && <span className="opacity-80 ml-2">• {exercise.repetitions}</span>}
                                                      {exercise.sets && <span className="opacity-80 ml-1">× {exercise.sets} sets</span>}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                )}

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

                                {/* Exercise Descriptions Section */}
                                {program.sessions && typeof program.sessions === 'object' && Object.keys(program.sessions).length > 0 && (
                                  <AccordionItem value="descriptions">
                                    <AccordionTrigger className="text-xl font-bebas uppercase hover:no-underline">
                                      Exercise Descriptions
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="space-y-6">
                                        {Object.entries(program.sessions).map(([sessionKey, session]: [string, any]) => 
                                          session.exercises && Array.isArray(session.exercises) && session.exercises.map((exercise: any, idx: number) => (
                                            exercise.description && (
                                              <div key={`${sessionKey}-${idx}`} className="border-l-2 border-primary/30 pl-4">
                                                <h5 className="font-bebas text-base uppercase mb-2">{exercise.name}</h5>
                                                <p className="text-sm text-muted-foreground mb-2">{exercise.description}</p>
                                                <div className="text-xs text-muted-foreground space-x-4">
                                                  {exercise.repetitions && <span>Reps: {exercise.repetitions}</span>}
                                                  {exercise.sets && <span>Sets: {exercise.sets}</span>}
                                                  {exercise.load && exercise.load !== '-' && <span>Load: {exercise.load}</span>}
                                                  {exercise.recoveryTime && exercise.recoveryTime !== '-' && <span>Rest: {exercise.recoveryTime}</span>}
                                                </div>
                                              </div>
                                            )
                                          ))
                                        )}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                )}
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
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
