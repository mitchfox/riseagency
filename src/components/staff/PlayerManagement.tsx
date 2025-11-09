import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Edit, FileText, LineChart, Video, Calendar, Plus, DollarSign, User, Trash2, Eye } from "lucide-react";
import { PerformanceActionsDialog } from "./PerformanceActionsDialog";
import { CreatePerformanceReportDialog } from "./CreatePerformanceReportDialog";
import { ProgrammingManagement } from "./ProgrammingManagement";
import { PlayerFixtures } from "./PlayerFixtures";
import { PlayerImages } from "./PlayerImages";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Player {
  id: string;
  name: string;
  position: string;
  age: number;
  nationality: string;
  bio: string | null;
  image_url: string | null;
  email: string | null;
  visible_on_stars_page: boolean;
  highlights: any;
  category: string;
  representation_status: string;
  club: string | null;
  club_logo: string | null;
  links?: any;
}

interface PlayerStats {
  id: string;
  player_id: string;
  goals: number;
  assists: number;
  matches: number;
  minutes: number;
  clean_sheets: number | null;
  saves: number | null;
}

const PlayerManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<Record<string, PlayerStats>>({});
  const [loading, setLoading] = useState(true);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("analysis");
  const [playerAnalyses, setPlayerAnalyses] = useState<Record<string, any[]>>({});
  const [playerInvoices, setPlayerInvoices] = useState<Record<string, any[]>>({});
  const [isPerformanceActionsDialogOpen, setIsPerformanceActionsDialogOpen] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>("");
  const [isCreateReportDialogOpen, setIsCreateReportDialogOpen] = useState(false);
  const [createReportPlayerId, setCreateReportPlayerId] = useState<string>("");
  const [createReportPlayerName, setCreateReportPlayerName] = useState<string>("");
  const [editReportAnalysisId, setEditReportAnalysisId] = useState<string | undefined>(undefined);
  const [isProgrammingDialogOpen, setIsProgrammingDialogOpen] = useState(false);
  const [selectedProgrammingPlayerId, setSelectedProgrammingPlayerId] = useState<string>("");
  const [selectedProgrammingPlayerName, setSelectedProgrammingPlayerName] = useState<string>("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [formData, setFormData] = useState({
    // Basic Info
    name: "",
    email: "",
    position: "",
    age: 0,
    nationality: "",
    category: "",
    representation_status: "",
    visible_on_stars_page: false,
    image_url: "",
    
    // Club Info
    club: "",
    club_logo: "",
    
    // Bio JSON fields
    bioText: "",
    dateOfBirth: "",
    number: "",
    whatsapp: "",
    
    // Arrays
    externalLinks: [] as { label: string; url: string }[],
    strengths: [] as string[],
    tacticalSchemes: [] as {
      formation: string;
      positions: string[];
      teamName: string;
      matches: string | number; // Can be string like "CURRENT CLUB" or number
      clubLogo: string;
      playerImage: string;
    }[],
    seasonStats: [] as { header: string; value: string }[],
    topStats: [] as { label: string; value: string; description?: string }[],
    
    // Separate links field
    links: [] as { label: string; url: string }[],
  });
  const [tacticalAnalyses, setTacticalAnalyses] = useState<Record<string, any[]>>({});
  const [playerPrograms, setPlayerPrograms] = useState<Record<string, any[]>>({});

  useEffect(() => {
    fetchPlayers();
    fetchAllAnalyses();
    fetchAllInvoices();
    fetchTacticalAnalyses();
    fetchAllPrograms();
  }, []);

  // Read player and tab from URL params
  useEffect(() => {
    if (players.length === 0) return;
    
    const playerSlug = searchParams.get('player');
    const tabParam = searchParams.get('tab');
    
    if (playerSlug) {
      // First try to find by ID (UUID format), then by slug (name-based)
      const player = players.find(p => p.id === playerSlug) || 
                     players.find(p => p.name?.toLowerCase().replace(/\s+/g, '-') === playerSlug);
      
      if (player) {
        setSelectedPlayerId(player.id);
      }
    }
    
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [players, searchParams]);

  const fetchPlayers = async () => {
    try {
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("*")
        .order("name");

      if (playersError) throw playersError;

      const { data: statsData, error: statsError } = await supabase
        .from("player_stats")
        .select("*");

      if (statsError) throw statsError;

      setPlayers(playersData || []);
      
      const statsMap: Record<string, PlayerStats> = {};
      statsData?.forEach(stat => {
        statsMap[stat.player_id] = stat;
      });
      setStats(statsMap);
    } catch (error: any) {
      toast.error("Failed to fetch players: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAnalyses = async () => {
    try {
      const { data, error } = await supabase
        .from("player_analysis")
        .select("*")
        .order("analysis_date", { ascending: false });

      if (error) throw error;

      const analysesMap: Record<string, any[]> = {};
      data?.forEach(analysis => {
        if (!analysesMap[analysis.player_id]) {
          analysesMap[analysis.player_id] = [];
        }
        analysesMap[analysis.player_id].push(analysis);
      });
      setPlayerAnalyses(analysesMap);
    } catch (error: any) {
      toast.error("Failed to fetch analyses: " + error.message);
    }
  };

  const fetchAllInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("invoice_date", { ascending: false });

      if (error) throw error;

      const invoicesMap: Record<string, any[]> = {};
      data?.forEach(invoice => {
        if (!invoicesMap[invoice.player_id]) {
          invoicesMap[invoice.player_id] = [];
        }
        invoicesMap[invoice.player_id].push(invoice);
      });
      setPlayerInvoices(invoicesMap);
    } catch (error: any) {
      toast.error("Failed to fetch invoices: " + error.message);
    }
  };

  const fetchTacticalAnalyses = async () => {
    try {
      const { data: playerAnalysisLinks, error: linksError } = await supabase
        .from("player_analysis")
        .select("player_id, analysis_writer_id");

      if (linksError) throw linksError;

      const { data: analyses, error: analysesError } = await supabase
        .from("analyses")
        .select("*")
        .order("created_at", { ascending: false });

      if (analysesError) throw analysesError;

      const tacticalMap: Record<string, any[]> = {};
      playerAnalysisLinks?.forEach(link => {
        if (link.analysis_writer_id) {
          const analysis = analyses?.find(a => a.id === link.analysis_writer_id);
          if (analysis) {
            if (!tacticalMap[link.player_id]) {
              tacticalMap[link.player_id] = [];
            }
            tacticalMap[link.player_id].push(analysis);
          }
        }
      });
      setTacticalAnalyses(tacticalMap);
    } catch (error: any) {
      toast.error("Failed to fetch tactical analyses: " + error.message);
    }
  };

  const fetchAllPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from("player_programs")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;

      const programsMap: Record<string, any[]> = {};
      data?.forEach(program => {
        if (!programsMap[program.player_id]) {
          programsMap[program.player_id] = [];
        }
        programsMap[program.player_id].push(program);
      });
      setPlayerPrograms(programsMap);
    } catch (error: any) {
      toast.error("Failed to fetch programs: " + error.message);
    }
  };

  const parseBioJSON = (bioString: string | null) => {
    if (!bioString) return null;
    try {
      const parsed = JSON.parse(bioString);
      return parsed;
    } catch {
      // If it's not JSON, return as plain text
      return { text: bioString };
    }
  };

  const reconstructBioJSON = () => {
    const bio: any = {
      bio: formData.bioText, // Use 'bio' key to match existing structure
      dateOfBirth: formData.dateOfBirth || undefined,
      number: formData.number || undefined,
      whatsapp: formData.whatsapp || undefined,
      currentClub: formData.club || undefined,
      currentClubLogo: formData.club_logo || undefined,
    };

    if (formData.externalLinks.length > 0) {
      bio.externalLinks = formData.externalLinks;
    }

    if (formData.strengths.length > 0) {
      bio.strengthsAndPlayStyle = formData.strengths;
    }

    if (formData.tacticalSchemes.length > 0) {
      bio.schemeHistory = formData.tacticalSchemes; // Use 'schemeHistory' to match existing structure
    }

    if (formData.seasonStats.length > 0) {
      bio.seasonStats = formData.seasonStats;
    }

    if (formData.topStats.length > 0) {
      bio.topStats = formData.topStats;
    }

    // Remove undefined fields
    Object.keys(bio).forEach(key => {
      if (bio[key] === undefined) delete bio[key];
    });

    return JSON.stringify(bio);
  };

  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    
    // Parse bio JSON
    const bioData = parseBioJSON(player.bio);
    
    // Parse links JSON
    let linksArray: { label: string; url: string }[] = [];
    if (player.links && Array.isArray(player.links)) {
      linksArray = player.links;
    }

    setFormData({
      // Basic Info
      name: player.name,
      email: player.email || "",
      position: player.position,
      age: player.age,
      nationality: player.nationality,
      category: player.category || "",
      representation_status: player.representation_status || "",
      visible_on_stars_page: player.visible_on_stars_page || false,
      image_url: player.image_url || "",
      
      // Club Info - read from player table OR bio JSON
      club: player.club || bioData?.currentClub || "",
      club_logo: player.club_logo || bioData?.currentClubLogo || "",
      
      // Bio JSON fields - handle both 'bio' and 'text' keys
      bioText: bioData?.bio || bioData?.text || "",
      dateOfBirth: bioData?.dateOfBirth || "",
      number: bioData?.number?.toString() || "",
      whatsapp: bioData?.whatsapp || "",
      
      // Arrays from bio - ensure proper structure with defaults
      externalLinks: Array.isArray(bioData?.externalLinks) ? bioData.externalLinks : [],
      strengths: Array.isArray(bioData?.strengthsAndPlayStyle) ? bioData.strengthsAndPlayStyle : [],
      tacticalSchemes: (Array.isArray(bioData?.tacticalFormations) ? bioData.tacticalFormations : 
                          Array.isArray(bioData?.schemeHistory) ? bioData.schemeHistory : []).map(f => ({
        formation: f?.formation || "",
        positions: Array.isArray(f?.positions) ? f.positions : [],
        teamName: f?.teamName || "",
        matches: f?.matches || 0, // Keep as-is, can be string or number
        clubLogo: f?.clubLogo || "",
        playerImage: f?.playerImage || "",
      })),
      seasonStats: Array.isArray(bioData?.seasonStats) ? bioData.seasonStats : [],
      topStats: Array.isArray(bioData?.topStats) ? bioData.topStats : [],
      
      // Separate links field
      links: linksArray,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;

    try {
      const bioJSON = reconstructBioJSON();
      
      const { error } = await supabase
        .from("players")
        .update({
          name: formData.name,
          email: formData.email || null,
          position: formData.position,
          club: formData.club || null,
          club_logo: formData.club_logo || null,
          age: formData.age,
          nationality: formData.nationality,
          bio: bioJSON,
          image_url: formData.image_url || null,
          category: formData.category || null,
          representation_status: formData.representation_status || null,
          visible_on_stars_page: formData.visible_on_stars_page,
          links: formData.links.length > 0 ? formData.links : null,
        })
        .eq("id", editingPlayer.id);

      if (error) throw error;

      toast.success("Player updated successfully");
      setIsEditDialogOpen(false);
      fetchPlayers();
    } catch (error: any) {
      toast.error("Failed to update player: " + error.message);
    }
  };

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);
  const selectedPlayerStats = selectedPlayerId ? stats[selectedPlayerId] : null;

  // Group players by representation status in order: represented, mandated, other
  const groupedPlayers = {
    represented: players.filter(p => p.representation_status === 'represented'),
    mandated: players.filter(p => p.representation_status === 'mandated'),
    other: players.filter(p => p.representation_status === 'other' || !p.representation_status),
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">Loading players...</div>;
  }

  const representedPlayers = groupedPlayers.represented;
  const mandatedPlayers = groupedPlayers.mandated;
  const otherPlayers = groupedPlayers.other;

  return (
    <div className="flex h-full gap-4 flex-col md:flex-row">
      {/* Mobile Player Selector */}
      <div className="md:hidden px-3 pb-3">
        <Select value={selectedPlayerId || undefined} onValueChange={setSelectedPlayerId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a player" />
          </SelectTrigger>
          <SelectContent>
            {representedPlayers.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Represented
                </div>
                {representedPlayers.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
              </>
            )}
            {mandatedPlayers.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Mandated
                </div>
                {mandatedPlayers.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
              </>
            )}
            {otherPlayers.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Other
                </div>
                {otherPlayers.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Inner Player Sidebar */}
      <div className="hidden md:flex w-20 flex-col gap-2 overflow-y-auto border-r pr-2">
        {/* Represented Players */}
        {representedPlayers.map((player) => (
          <button
            key={player.id}
            onClick={() => setSelectedPlayerId(player.id)}
            className={`relative group transition-all ${
              selectedPlayerId === player.id 
                ? 'opacity-100 ring-2 ring-primary' 
                : 'opacity-40 hover:opacity-70'
            }`}
            title={player.name}
          >
            <Avatar className="w-14 h-14">
              <AvatarImage src={player.image_url || undefined} alt={player.name} />
              <AvatarFallback className="text-xs">{(player.name || '').split(' ').filter(n => n).map(n => n[0]).join('') || '??'}</AvatarFallback>
            </Avatar>
          </button>
        ))}
        
        {/* Gold border separator */}
        {representedPlayers.length > 0 && mandatedPlayers.length > 0 && (
          <div className="h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent my-2" />
        )}
        
        {/* Mandated Players */}
        {mandatedPlayers.map((player) => (
          <button
            key={player.id}
            onClick={() => setSelectedPlayerId(player.id)}
            className={`relative group transition-all ${
              selectedPlayerId === player.id 
                ? 'opacity-100 ring-2 ring-primary' 
                : 'opacity-40 hover:opacity-70'
            }`}
            title={player.name}
          >
            <Avatar className="w-14 h-14">
              <AvatarImage src={player.image_url || undefined} alt={player.name} />
              <AvatarFallback className="text-xs">{(player.name || '').split(' ').filter(n => n).map(n => n[0]).join('') || '??'}</AvatarFallback>
            </Avatar>
          </button>
        ))}
        
        {/* Gold border separator */}
        {mandatedPlayers.length > 0 && otherPlayers.length > 0 && (
          <div className="h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent my-2" />
        )}
        
        {/* Other Players */}
        {otherPlayers.map((player) => (
          <button
            key={player.id}
            onClick={() => setSelectedPlayerId(player.id)}
            className={`relative group transition-all ${
              selectedPlayerId === player.id 
                ? 'opacity-100 ring-2 ring-primary' 
                : 'opacity-40 hover:opacity-70'
            }`}
            title={player.name}
          >
            <Avatar className="w-14 h-14">
              <AvatarImage src={player.image_url || undefined} alt={player.name} />
              <AvatarFallback className="text-xs">{(player.name || '').split(' ').filter(n => n).map(n => n[0]).join('') || '??'}</AvatarFallback>
            </Avatar>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {!selectedPlayerId ? (
          // Preview Cards Grid grouped by representation status
          <div className="space-y-6 px-3 md:px-0">
            {/* Represented Players */}
            {representedPlayers.length > 0 && (
              <div>
                <h3 className="text-base md:text-lg font-semibold mb-4 text-primary">Represented</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {representedPlayers.map((player) => {
                    const playerStats = stats[player.id];
                    return (
                      <Card 
                        key={player.id} 
                        className="cursor-pointer hover:shadow-lg transition-all overflow-hidden"
                        onClick={() => setSelectedPlayerId(player.id)}
                      >
                        <div className="flex flex-col sm:flex-row h-full">
                          {/* Image Section - Top on mobile, Left on desktop */}
                          <div className="w-full h-48 sm:w-32 sm:h-auto flex-shrink-0 relative">
                            <img 
                              src={player.image_url || undefined} 
                              alt={player.name}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          </div>
                          
                          {/* Content Section - Bottom on mobile, Right on desktop */}
                          <div className="flex-1 flex flex-col p-3 sm:p-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-base sm:text-lg mb-1 truncate">{player.name}</h3>
                              <p className="text-xs sm:text-sm text-muted-foreground mb-2">{player.position}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 sm:mb-3">
                                <span>{player.age}y</span>
                                <span>•</span>
                                <span className="truncate">{player.nationality}</span>
                              </div>
                              
                              {player.club && (
                                <div className="flex items-center gap-2 text-xs sm:text-sm mb-2 sm:mb-3">
                                  {player.club_logo && (
                                    <img src={player.club_logo} alt="" className="w-4 h-4 sm:w-5 sm:h-5 object-contain flex-shrink-0" />
                                  )}
                                  <span className="text-muted-foreground truncate">{player.club}</span>
                                </div>
                              )}
                            </div>
                            
                            {playerStats && (
                              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-border/50">
                                <div>
                                  <div className="font-semibold text-base sm:text-lg">{playerStats.goals}</div>
                                  <div className="text-muted-foreground text-[10px] sm:text-xs">Goals</div>
                                </div>
                                <div>
                                  <div className="font-semibold text-base sm:text-lg">{playerStats.assists}</div>
                                  <div className="text-muted-foreground text-[10px] sm:text-xs">Assists</div>
                                </div>
                                <div>
                                  <div className="font-semibold text-base sm:text-lg">{playerStats.matches}</div>
                                  <div className="text-muted-foreground text-[10px] sm:text-xs">Matches</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Gold Border Separator */}
            {groupedPlayers.represented.length > 0 && groupedPlayers.mandated.length > 0 && (
              <div className="h-1 bg-gradient-to-r from-transparent via-gold to-transparent rounded-full" />
            )}

            {/* Mandated Players */}
            {mandatedPlayers.length > 0 && (
              <div>
                <h3 className="text-base md:text-lg font-semibold mb-4 text-primary">Mandated</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mandatedPlayers.map((player) => {
                    const playerStats = stats[player.id];
                    return (
                      <Card 
                        key={player.id} 
                        className="cursor-pointer hover:shadow-lg transition-all"
                        onClick={() => setSelectedPlayerId(player.id)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start gap-3">
                            <Avatar className="w-16 h-16">
                              <AvatarImage src={player.image_url || undefined} alt={player.name} />
                              <AvatarFallback>{(player.name || '').split(' ').filter(n => n).map(n => n[0]).join('') || '??'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate">{player.name}</h3>
                              <p className="text-sm text-muted-foreground">{player.position}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <span>{player.age}y</span>
                                <span>•</span>
                                <span>{player.nationality}</span>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {player.club && (
                            <div className="flex items-center gap-2 text-sm mb-3">
                              {player.club_logo && (
                                <img src={player.club_logo} alt="" className="w-5 h-5 object-contain" />
                              )}
                              <span className="text-muted-foreground">{player.club}</span>
                            </div>
                          )}
                          {playerStats && (
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                              <div>
                                <div className="font-semibold text-lg">{playerStats.goals}</div>
                                <div className="text-muted-foreground">Goals</div>
                              </div>
                              <div>
                                <div className="font-semibold text-lg">{playerStats.assists}</div>
                                <div className="text-muted-foreground">Assists</div>
                              </div>
                              <div>
                                <div className="font-semibold text-lg">{playerStats.matches}</div>
                                <div className="text-muted-foreground">Matches</div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Gold Border Separator */}
            {groupedPlayers.mandated.length > 0 && groupedPlayers.other.length > 0 && (
              <div className="h-1 bg-gradient-to-r from-transparent via-gold to-transparent rounded-full" />
            )}

            {/* Other Players */}
            {groupedPlayers.other.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-primary">Other</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedPlayers.other.map((player) => {
                    const playerStats = stats[player.id];
                    return (
                      <Card 
                        key={player.id} 
                        className="cursor-pointer hover:shadow-lg transition-all"
                        onClick={() => setSelectedPlayerId(player.id)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start gap-3">
                            <Avatar className="w-16 h-16">
                              <AvatarImage src={player.image_url || undefined} alt={player.name} />
                              <AvatarFallback>{(player.name || '').split(' ').filter(n => n).map(n => n[0]).join('') || '??'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate">{player.name}</h3>
                              <p className="text-sm text-muted-foreground">{player.position}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <span>{player.age}y</span>
                                <span>•</span>
                                <span>{player.nationality}</span>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {player.club && (
                            <div className="flex items-center gap-2 text-sm mb-3">
                              {player.club_logo && (
                                <img src={player.club_logo} alt="" className="w-5 h-5 object-contain" />
                              )}
                              <span className="text-muted-foreground">{player.club}</span>
                            </div>
                          )}
                          {playerStats && (
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                              <div>
                                <div className="font-semibold text-lg">{playerStats.goals}</div>
                                <div className="text-muted-foreground">Goals</div>
                              </div>
                              <div>
                                <div className="font-semibold text-lg">{playerStats.assists}</div>
                                <div className="text-muted-foreground">Assists</div>
                              </div>
                              <div>
                                <div className="font-semibold text-lg">{playerStats.matches}</div>
                                <div className="text-muted-foreground">Matches</div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Player Detail View
          <div className="space-y-6">
            {/* Player Header */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-16 h-16 md:w-20 md:h-20">
                      <AvatarImage src={selectedPlayer?.image_url || undefined} alt={selectedPlayer?.name} />
                      <AvatarFallback className="text-xl md:text-2xl">
                        {(selectedPlayer?.name || '').split(' ').filter(n => n).map(n => n[0]).join('') || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold">{selectedPlayer?.name}</h2>
                      <p className="text-muted-foreground text-base md:text-lg">{selectedPlayer?.position}</p>
                      <div className="flex items-center gap-3 text-xs md:text-sm text-muted-foreground mt-2">
                        <span>{selectedPlayer?.age} years</span>
                        <span>•</span>
                        <span>{selectedPlayer?.nationality}</span>
                        {selectedPlayer?.club && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              {selectedPlayer.club_logo && (
                                <img src={selectedPlayer.club_logo} alt="" className="w-4 h-4 object-contain" />
                              )}
                              <span>{selectedPlayer.club}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditPlayer(selectedPlayer!)}
                      className="flex-1 md:flex-none"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedPlayerId(null)}
                      className="flex-1 md:flex-none"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {selectedPlayerStats && (
                <CardContent className="p-3 sm:p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 text-center">
                    <div className="p-2 sm:p-4 bg-secondary/30 rounded-lg">
                      <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">{selectedPlayerStats.goals}</div>
                      <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1">Goals</div>
                    </div>
                    <div className="p-2 sm:p-4 bg-secondary/30 rounded-lg">
                      <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">{selectedPlayerStats.assists}</div>
                      <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1">Assists</div>
                    </div>
                    <div className="p-2 sm:p-4 bg-secondary/30 rounded-lg">
                      <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">{selectedPlayerStats.matches}</div>
                      <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1">Matches</div>
                    </div>
                    <div className="p-2 sm:p-4 bg-secondary/30 rounded-lg">
                      <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">{selectedPlayerStats.minutes}</div>
                      <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1">Minutes</div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Tabbed Sections */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="flex flex-nowrap overflow-x-auto md:grid md:grid-cols-5 w-full gap-1 bg-muted/30 border-b p-1">
                <TabsTrigger value="analysis" className="flex-shrink-0 whitespace-nowrap px-4 py-2 text-sm md:text-base min-w-[100px]">
                  <LineChart className="w-4 h-4 mr-2" />
                  <span>Analysis</span>
                </TabsTrigger>
                <TabsTrigger value="programming" className="flex-shrink-0 whitespace-nowrap px-4 py-2 text-sm md:text-base min-w-[110px]">
                  <FileText className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Programming</span>
                  <span className="sm:hidden">Programs</span>
                </TabsTrigger>
                <TabsTrigger value="highlights" className="flex-shrink-0 whitespace-nowrap px-4 py-2 text-sm md:text-base min-w-[110px]">
                  <Video className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Highlights</span>
                  <span className="sm:hidden">Videos</span>
                </TabsTrigger>
                <TabsTrigger value="fixtures" className="flex-shrink-0 whitespace-nowrap px-4 py-2 text-sm md:text-base min-w-[100px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Fixtures</span>
                </TabsTrigger>
                <TabsTrigger value="invoices" className="flex-shrink-0 whitespace-nowrap px-4 py-2 text-sm md:text-base min-w-[100px]">
                  <DollarSign className="w-4 h-4 mr-2" />
                  <span>Invoices</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analysis" className="space-y-4">
                <Tabs defaultValue="performance" className="w-full">
                  <TabsList className="flex flex-nowrap overflow-x-auto md:grid md:grid-cols-2 w-full gap-1 bg-muted/30 border-b p-1">
                    <TabsTrigger value="performance" className="flex-shrink-0 whitespace-nowrap px-4 py-2 text-sm md:text-base min-w-[160px]">Performance Reports</TabsTrigger>
                    <TabsTrigger value="tactical" className="flex-shrink-0 whitespace-nowrap px-4 py-2 text-sm md:text-base min-w-[160px]">Tactical Analysis</TabsTrigger>
                  </TabsList>

                  <TabsContent value="performance" className="mt-4">
                    <Card>
                      <CardHeader>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <CardTitle>Performance Reports</CardTitle>
                          <Button
                            size="sm"
                            onClick={() => {
                              setCreateReportPlayerId(selectedPlayerId!);
                              setCreateReportPlayerName(selectedPlayer!.name);
                              setIsCreateReportDialogOpen(true);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            New Report
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {playerAnalyses[selectedPlayerId]?.length > 0 ? (
                          <div className="space-y-3">
                            {playerAnalyses[selectedPlayerId].map((analysis) => {
                              const getR90ColorClass = (score: number) => {
                                if (score < 0) return "bg-red-950";
                                if (score >= 0 && score < 0.2) return "bg-red-600";
                                if (score >= 0.2 && score < 0.4) return "bg-red-400";
                                if (score >= 0.4 && score < 0.6) return "bg-orange-700";
                                if (score >= 0.6 && score < 0.8) return "bg-orange-500";
                                if (score >= 0.8 && score < 1.0) return "bg-yellow-400";
                                if (score >= 1.0 && score < 1.4) return "bg-lime-400";
                                if (score >= 1.4 && score < 1.8) return "bg-green-500";
                                if (score >= 1.8 && score < 2.5) return "bg-green-700";
                                return "bg-gold";
                              };

                              return (
                                <div
                                  key={analysis.id}
                                  className="rounded-lg overflow-hidden text-white flex flex-col md:flex-row md:items-stretch"
                                >
                                  {/* R90 Score - Horizontal on Mobile, Vertical on Desktop */}
                                  {analysis.r90_score !== null && analysis.r90_score !== undefined && (
                                    <>
                                      {/* Mobile: Horizontal R90 */}
                                      <div className={`md:hidden ${getR90ColorClass(analysis.r90_score)} p-3`}>
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                          <div className="text-3xl font-bold">
                                            {analysis.r90_score.toFixed(2)}
                                          </div>
                                          <div className={`w-8 h-8 ${getR90ColorClass(analysis.r90_score)} rounded border-2 border-white/50`}></div>
                                        </div>
                                        <div className="text-xs opacity-90 font-medium text-center">R90 SCORE</div>
                                      </div>
                                      
                                      {/* Desktop: Vertical R90 */}
                                      <div className={`hidden md:flex ${getR90ColorClass(analysis.r90_score)} items-center justify-center p-4 flex-shrink-0`}>
                                        <div className="text-center">
                                          <div className="text-4xl font-bold">
                                            {analysis.r90_score.toFixed(2)}
                                          </div>
                                          <div className="text-xs opacity-80">R90</div>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                  
                                  {/* Match info and stats with black background */}
                                  <div className="bg-black flex-1 p-3 md:p-4">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-base md:text-lg font-semibold truncate">{analysis.opponent}</h4>
                                        <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm opacity-90 mt-1">
                                          <span>{new Date(analysis.analysis_date).toLocaleDateString('en-GB')}</span>
                                          {analysis.result && (
                                            <>
                                              <span>•</span>
                                              <span>{analysis.result}</span>
                                            </>
                                          )}
                                          {analysis.minutes_played && (
                                            <>
                                              <span>•</span>
                                              <span>{analysis.minutes_played} min</span>
                                            </>
                                          )}
                                        </div>
                                        
                                        {/* Advanced Stats - Compact */}
                                        {analysis.striker_stats && Object.keys(analysis.striker_stats).length > 0 && (
                                          <div className="flex flex-wrap gap-x-3 md:gap-x-4 gap-y-1 text-[10px] md:text-xs opacity-80 mt-2">
                                            {Object.entries(analysis.striker_stats).map(([key, value]) => {
                                              let displayValue = '';
                                              if (value === null || value === undefined) {
                                                displayValue = '-';
                                              } else if (Array.isArray(value)) {
                                                try {
                                                  displayValue = value.filter(v => v != null && v !== undefined).map(v => String(v)).join(', ') || '-';
                                                } catch (e) {
                                                  displayValue = '-';
                                                }
                                              } else if (typeof value === 'object') {
                                                displayValue = JSON.stringify(value);
                                              } else {
                                                displayValue = String(value);
                                              }
                                              
                                              return (
                                                <span key={key} className="whitespace-nowrap">
                                                  <span className="font-medium">{key.replace(/_/g, ' ')}</span>: {displayValue}
                                                </span>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Action Buttons */}
                                      <div className="flex gap-2 flex-shrink-0">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setEditReportAnalysisId(analysis.id);
                                            setCreateReportPlayerId(selectedPlayerId!);
                                            setCreateReportPlayerName(selectedPlayer!.name);
                                            setIsCreateReportDialogOpen(true);
                                          }}
                                          className="h-8 px-2 md:px-3"
                                        >
                                          <Edit className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                                          <span className="hidden md:inline">Edit</span>
                                        </Button>
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          onClick={() => {
                                            const slug = `${selectedPlayer!.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-vs-${analysis.opponent.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.replace(/-+/g, '-');
                                            window.open(`/performance-report/${slug}-${analysis.id}`, '_blank');
                                          }}
                                          className="h-8 px-2 md:px-3"
                                        >
                                          <Eye className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                                          <span className="hidden md:inline">View</span>
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-center text-muted-foreground py-8">
                            No performance reports yet. Create one to get started.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="tactical" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Tactical Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {tacticalAnalyses[selectedPlayerId]?.length > 0 ? (
                          <div className="space-y-3">
                            {tacticalAnalyses[selectedPlayerId].map((analysis) => (
                              <div
                                key={analysis.id}
                                className="p-3 md:p-4 border rounded-lg hover:bg-secondary/30 transition-colors"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      <span className="text-[10px] md:text-xs px-2 py-1 rounded bg-primary/20 text-primary font-medium whitespace-nowrap">
                                        {analysis.analysis_type}
                                      </span>
                                      {analysis.match_date && (
                                        <span className="text-xs md:text-sm text-muted-foreground">
                                          {new Date(analysis.match_date).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="font-medium mb-1 text-sm md:text-base">{analysis.title || 'Untitled'}</h4>
                                    {analysis.home_team && analysis.away_team && (
                                      <p className="text-xs md:text-sm text-muted-foreground">
                                        {analysis.home_team} vs {analysis.away_team}
                                        {analysis.home_score !== null && analysis.away_score !== null && (
                                          <span className="ml-2 font-medium">
                                            ({analysis.home_score} - {analysis.away_score})
                                          </span>
                                        )}
                                      </p>
                                    )}
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(`/analysis/${analysis.id}`, '_blank')}
                                    className="w-full sm:w-auto"
                                  >
                                    View
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-muted-foreground py-8">
                            No tactical analysis available yet.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="programming">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <CardTitle>Training Programs</CardTitle>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedProgrammingPlayerId(selectedPlayerId!);
                          setSelectedProgrammingPlayerName(selectedPlayer!.name);
                          setIsProgrammingDialogOpen(true);
                        }}
                        className="w-full sm:w-auto"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Manage Programs
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {playerPrograms[selectedPlayerId]?.length > 0 ? (
                      <div className="space-y-3">
                        {playerPrograms[selectedPlayerId].map((program) => (
                          <div
                            key={program.id}
                            className="p-3 md:p-4 border rounded-lg hover:bg-secondary/30 transition-colors cursor-pointer"
                            onClick={() => {
                              setSelectedProgrammingPlayerId(selectedPlayerId!);
                              setSelectedProgrammingPlayerName(selectedPlayer!.name);
                              setIsProgrammingDialogOpen(true);
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <h4 className="font-medium text-sm md:text-base truncate">{program.program_name}</h4>
                                  {program.is_current && (
                                    <span className="text-[10px] md:text-xs px-2 py-1 rounded bg-primary/20 text-primary font-medium whitespace-nowrap">
                                      Current
                                    </span>
                                  )}
                                </div>
                                {program.phase_name && (
                                  <p className="text-xs md:text-sm text-muted-foreground">
                                    Phase: {program.phase_name}
                                  </p>
                                )}
                                {program.phase_dates && (
                                  <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                                    {program.phase_dates}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8 text-sm">
                        No programs yet. Click "Manage Programs" to create one.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="highlights">
                <Card>
                  <CardHeader>
                    <CardTitle>Video Content & Images</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedPlayer?.highlights ? (
                      <Tabs defaultValue="match-highlights" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="match-highlights">Match Highlights</TabsTrigger>
                          <TabsTrigger value="best-clips">Best Clips</TabsTrigger>
                          <TabsTrigger value="images">Images</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="match-highlights" className="mt-4">
                          {(() => {
                            try {
                              const highlights = typeof selectedPlayer.highlights === 'string'
                                ? JSON.parse(selectedPlayer.highlights)
                                : selectedPlayer.highlights;
                              
                              const matchHighlights = Array.isArray(highlights) ? highlights : (highlights.matchHighlights || []);

                              return (
                                <div className="space-y-4">
                                  <Button 
                                    onClick={() => {
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.multiple = true;
                                      input.accept = 'video/mp4,video/quicktime,video/x-msvideo,video/*';
                                      input.onchange = async (e: any) => {
                                        const files = e.target.files;
                                        if (files && files.length > 0) {
                                          try {
                                            for (const file of files) {
                                              const formData = new FormData();
                                              formData.append('file', file);
                                              formData.append('playerEmail', selectedPlayer.email || '');
                                              formData.append('clipName', file.name.replace(/\.[^/.]+$/, ''));
                                              
                                              const response = await fetch(
                                                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-player-highlight`,
                                                {
                                                  method: 'POST',
                                                  headers: {
                                                    'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                                                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                                                  },
                                                  body: formData,
                                                }
                                              );

                                              if (!response.ok) throw new Error('Upload failed');
                                            }
                                            toast.success('Clips uploaded successfully!');
                                            fetchPlayers();
                                          } catch (error: any) {
                                            toast.error('Failed to upload: ' + error.message);
                                          }
                                        }
                                      };
                                      input.click();
                                    }}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Upload Highlight
                                  </Button>
                                  
                                   {matchHighlights.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {matchHighlights.map((highlight: any, idx: number) => (
                                        <div key={idx} className="border rounded-lg p-3 hover:bg-secondary/30 transition-colors space-y-2">
                                          <video 
                                            src={highlight.videoUrl}
                                            controls
                                            className="w-full h-48 sm:h-40 object-cover rounded"
                                          />
                                          <p className="text-sm font-medium truncate">{highlight.name}</p>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={async () => {
                                              if (!confirm('Delete this highlight?')) return;
                                              try {
                                                const response = await fetch(
                                                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-player-highlight`,
                                                  {
                                                    method: 'POST',
                                                    headers: {
                                                      'Content-Type': 'application/json',
                                                      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                                                    },
                                                    body: JSON.stringify({
                                                      playerEmail: selectedPlayer.email,
                                                      clipName: highlight.name,
                                                      videoUrl: highlight.videoUrl,
                                                    }),
                                                  }
                                                );
                                                if (!response.ok) throw new Error('Delete failed');
                                                toast.success('Deleted successfully!');
                                                fetchPlayers();
                                              } catch (error: any) {
                                                toast.error('Failed to delete: ' + error.message);
                                              }
                                            }}
                                            className="w-full text-destructive hover:text-destructive"
                                          >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-center text-muted-foreground py-8">No match highlights yet</p>
                                  )}
                                </div>
                              );
                            } catch (e) {
                              return <p className="text-center text-muted-foreground py-8">Error loading highlights</p>;
                            }
                          })()}
                        </TabsContent>

                        <TabsContent value="best-clips" className="mt-4">
                          {(() => {
                            try {
                              const highlights = typeof selectedPlayer.highlights === 'string'
                                ? JSON.parse(selectedPlayer.highlights)
                                : selectedPlayer.highlights;
                              
                              const bestClips = highlights.bestClips || [];

                              return (
                                <div className="space-y-4">
                                  <Button 
                                    onClick={() => {
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.multiple = true;
                                      input.accept = 'video/mp4,video/quicktime,video/x-msvideo,video/*';
                                      input.onchange = async (e: any) => {
                                        const files = e.target.files;
                                        if (files && files.length > 0) {
                                          try {
                                            for (const file of files) {
                                              const formData = new FormData();
                                              formData.append('file', file);
                                              formData.append('playerEmail', selectedPlayer.email || '');
                                              formData.append('clipName', file.name.replace(/\.[^/.]+$/, ''));
                                              
                                              const response = await fetch(
                                                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-player-highlight`,
                                                {
                                                  method: 'POST',
                                                  headers: {
                                                    'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                                                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                                                  },
                                                  body: formData,
                                                }
                                              );

                                              if (!response.ok) throw new Error('Upload failed');
                                            }
                                            toast.success('Clips uploaded successfully!');
                                            fetchPlayers();
                                          } catch (error: any) {
                                            toast.error('Failed to upload: ' + error.message);
                                          }
                                        }
                                      };
                                      input.click();
                                    }}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Upload Clip
                                  </Button>
                                  
                                  {bestClips.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {bestClips.map((clip: any, idx: number) => (
                                        <div key={idx} className="border rounded-lg p-3 hover:bg-secondary/30 transition-colors space-y-2">
                                          <video 
                                            src={clip.videoUrl}
                                            controls
                                            className="w-full h-48 sm:h-40 object-cover rounded"
                                          />
                                          <p className="text-sm font-medium truncate">{clip.name}</p>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={async () => {
                                              if (!confirm('Delete this clip?')) return;
                                              try {
                                                const response = await fetch(
                                                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-player-highlight`,
                                                  {
                                                    method: 'POST',
                                                    headers: {
                                                      'Content-Type': 'application/json',
                                                      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                                                    },
                                                    body: JSON.stringify({
                                                      playerEmail: selectedPlayer.email,
                                                      clipName: clip.name,
                                                      videoUrl: clip.videoUrl,
                                                    }),
                                                  }
                                                );
                                                if (!response.ok) throw new Error('Delete failed');
                                                toast.success('Deleted successfully!');
                                                fetchPlayers();
                                              } catch (error: any) {
                                                toast.error('Failed to delete: ' + error.message);
                                              }
                                            }}
                                            className="w-full text-destructive hover:text-destructive"
                                          >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-center text-muted-foreground py-8">No best clips yet</p>
                                  )}
                                </div>
                              );
                            } catch (e) {
                              return <p className="text-center text-muted-foreground py-8">Error loading clips</p>;
                            }
                          })()}
                        </TabsContent>
                        
                        <TabsContent value="images" className="mt-4">
                          <div className="space-y-4">
                            <Button 
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.multiple = true;
                                input.accept = 'image/jpeg,image/png,image/gif,image/webp,image/*';
                                input.onchange = async (e: any) => {
                                  const files = e.target.files;
                                  if (files && files.length > 0) {
                                    try {
                                      for (const file of files) {
                                        const fileExt = file.name.split('.').pop();
                                        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                                        const filePath = `${fileName}`;
                                        
                                        const { error: uploadError } = await supabase.storage
                                          .from('marketing-gallery')
                                          .upload(filePath, file);
                                        
                                        if (uploadError) throw uploadError;
                                        
                                        const { data: { publicUrl } } = supabase.storage
                                          .from('marketing-gallery')
                                          .getPublicUrl(filePath);
                                        
                                        const { error: dbError } = await supabase
                                          .from('marketing_gallery')
                                          .insert([{
                                            title: `${selectedPlayer.name} - ${file.name.replace(/\.[^/.]+$/, '')}`,
                                            description: `Player image for ${selectedPlayer.name}`,
                                            file_url: publicUrl,
                                            file_type: 'image',
                                            category: 'players',
                                          }]);
                                        
                                        if (dbError) throw dbError;
                                      }
                                      toast.success('Images uploaded successfully!');
                                    } catch (error: any) {
                                      toast.error('Failed to upload: ' + error.message);
                                    }
                                  }
                                };
                                input.click();
                              }}
                              variant="outline"
                              size="sm"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Upload Images
                            </Button>
                            
                            <PlayerImages playerName={selectedPlayer.name} isAdmin={isAdmin} />
                          </div>
                        </TabsContent>
                      </Tabs>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No content uploaded yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fixtures">
                <Card>
                  <CardHeader>
                    <CardTitle>Fixtures</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PlayerFixtures 
                      playerId={selectedPlayerId!} 
                      playerName={selectedPlayer!.name}
                      isAdmin={isAdmin} 
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="invoices">
                <Card>
                  <CardHeader>
                    <CardTitle>Invoices</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {playerInvoices[selectedPlayerId]?.length > 0 ? (
                      <div className="space-y-3">
                         {playerInvoices[selectedPlayerId].map((invoice) => (
                          <div key={invoice.id} className="p-4 border rounded-lg">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="w-full sm:w-auto">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-medium">Invoice #{invoice.invoice_number}</h4>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    invoice.status === 'paid' 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                      : invoice.status === 'overdue'
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  }`}>
                                    {invoice.status}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {new Date(invoice.invoice_date).toLocaleDateString()} - Due: {new Date(invoice.due_date).toLocaleDateString()}
                                </p>
                                <p className="text-lg font-semibold mt-2">
                                  {invoice.currency} {invoice.amount.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No invoices yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <PerformanceActionsDialog
        open={isPerformanceActionsDialogOpen}
        onOpenChange={setIsPerformanceActionsDialogOpen}
        analysisId={selectedAnalysisId || ""}
        playerName={selectedPlayerName}
        isAdmin={isAdmin}
      />

      <CreatePerformanceReportDialog
        open={isCreateReportDialogOpen}
        onOpenChange={(open) => {
          setIsCreateReportDialogOpen(open);
          if (!open) {
            setEditReportAnalysisId(undefined);
          }
        }}
        playerId={createReportPlayerId}
        playerName={createReportPlayerName}
        analysisId={editReportAnalysisId}
        onSuccess={() => {
          fetchAllAnalyses();
          fetchTacticalAnalyses();
          toast.success(`Performance report ${editReportAnalysisId ? 'updated' : 'created'} successfully`);
          setEditReportAnalysisId(undefined);
        }}
      />

      <ProgrammingManagement
        isOpen={isProgrammingDialogOpen}
        onClose={() => setIsProgrammingDialogOpen(false)}
        playerId={selectedProgrammingPlayerId}
        playerName={selectedProgrammingPlayerName}
        isAdmin={isAdmin}
      />

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Edit Player - {editingPlayer?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(90vh-120px)] pr-4">
            <form onSubmit={handleUpdatePlayer} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="flex flex-nowrap overflow-x-auto md:grid md:grid-cols-6 w-full gap-1">
                  <TabsTrigger value="basic" className="flex-shrink-0 whitespace-nowrap">Basic</TabsTrigger>
                  <TabsTrigger value="career" className="flex-shrink-0 whitespace-nowrap">Career</TabsTrigger>
                  <TabsTrigger value="bio" className="flex-shrink-0 whitespace-nowrap">Bio</TabsTrigger>
                  <TabsTrigger value="tactical" className="flex-shrink-0 whitespace-nowrap">Schemes</TabsTrigger>
                  <TabsTrigger value="stats" className="flex-shrink-0 whitespace-nowrap">Stats</TabsTrigger>
                  <TabsTrigger value="links" className="flex-shrink-0 whitespace-nowrap">Links</TabsTrigger>
                </TabsList>

                {/* Basic Info Tab */}
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="position">Position *</Label>
                      <Input
                        id="position"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="age">Age *</Label>
                      <Input
                        id="age"
                        type="number"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nationality">Nationality *</Label>
                      <Input
                        id="nationality"
                        value={formData.nationality}
                        onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image_url">Player Image URL</Label>
                    <Input
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://example.com/player.png"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Professional">Professional</SelectItem>
                          <SelectItem value="Youth">Youth</SelectItem>
                          <SelectItem value="Academy">Academy</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="representation_status">Representation Status</Label>
                      <Select
                        value={formData.representation_status}
                        onValueChange={(value) => setFormData({ ...formData, representation_status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="represented">Represented</SelectItem>
                          <SelectItem value="mandated">Mandated</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="visible_on_stars_page"
                      checked={formData.visible_on_stars_page}
                      onChange={(e) => setFormData({ ...formData, visible_on_stars_page: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="visible_on_stars_page">Visible on Stars Page</Label>
                  </div>
                </TabsContent>

                {/* Career Info Tab */}
                <TabsContent value="career" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="club">Current Club</Label>
                    <Input
                      id="club"
                      value={formData.club}
                      onChange={(e) => setFormData({ ...formData, club: e.target.value })}
                      placeholder="e.g., FC Barcelona"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="club_logo">Club Logo URL</Label>
                    <Input
                      id="club_logo"
                      value={formData.club_logo}
                      onChange={(e) => setFormData({ ...formData, club_logo: e.target.value })}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="number">Jersey Number</Label>
                      <Input
                        id="number"
                        value={formData.number}
                        onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                        placeholder="e.g., 10"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp Number</Label>
                    <Input
                      id="whatsapp"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      placeholder="+1234567890"
                    />
                  </div>
                </TabsContent>

                {/* Bio & Strengths Tab */}
                <TabsContent value="bio" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bioText">Bio Text</Label>
                    <Textarea
                      id="bioText"
                      value={formData.bioText}
                      onChange={(e) => setFormData({ ...formData, bioText: e.target.value })}
                      rows={4}
                      placeholder="Player biography..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Strengths & Play Style</Label>
                    {formData.strengths.map((strength, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={strength}
                          onChange={(e) => {
                            const newStrengths = [...formData.strengths];
                            newStrengths[index] = e.target.value;
                            setFormData({ ...formData, strengths: newStrengths });
                          }}
                          placeholder="e.g., Exceptional dribbling ability"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => {
                            const newStrengths = formData.strengths.filter((_, i) => i !== index);
                            setFormData({ ...formData, strengths: newStrengths });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({ ...formData, strengths: [...formData.strengths, ""] });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Strength
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>External Links (in Bio)</Label>
                    {formData.externalLinks.map((link, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={link.label}
                          onChange={(e) => {
                            const newLinks = [...formData.externalLinks];
                            newLinks[index].label = e.target.value;
                            setFormData({ ...formData, externalLinks: newLinks });
                          }}
                          placeholder="Label (e.g., Transfermarkt)"
                          className="flex-1"
                        />
                        <Input
                          value={link.url}
                          onChange={(e) => {
                            const newLinks = [...formData.externalLinks];
                            newLinks[index].url = e.target.value;
                            setFormData({ ...formData, externalLinks: newLinks });
                          }}
                          placeholder="URL"
                          className="flex-[2]"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => {
                            const newLinks = formData.externalLinks.filter((_, i) => i !== index);
                            setFormData({ ...formData, externalLinks: newLinks });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({ 
                          ...formData, 
                          externalLinks: [...formData.externalLinks, { label: "", url: "" }] 
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add External Link
                    </Button>
                  </div>
                </TabsContent>

                {/* Tactical Schemes Tab */}
                <TabsContent value="tactical" className="space-y-4">
                  <Label>Tactical Schemes</Label>
                  {formData.tacticalSchemes.map((scheme, index) => (
                    <Card key={index} className="p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Scheme {index + 1}</h4>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const newSchemes = formData.tacticalSchemes.filter((_, i) => i !== index);
                            setFormData({ ...formData, tacticalSchemes: newSchemes });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          value={scheme.formation || ""}
                          onChange={(e) => {
                            const newSchemes = [...formData.tacticalSchemes];
                            newSchemes[index].formation = e.target.value;
                            setFormData({ ...formData, tacticalSchemes: newSchemes });
                          }}
                          placeholder="Formation (e.g., 4-3-3)"
                        />
                        <Input
                          value={(Array.isArray(scheme.positions) ? scheme.positions : []).join(", ")}
                          onChange={(e) => {
                            const newSchemes = [...formData.tacticalSchemes];
                            newSchemes[index].positions = e.target.value.split(",").map(p => p.trim()).filter(p => p);
                            setFormData({ ...formData, tacticalSchemes: newSchemes });
                          }}
                          placeholder="Positions (e.g., CM, RCM)"
                        />
                        <Input
                          value={scheme.teamName || ""}
                          onChange={(e) => {
                            const newSchemes = [...formData.tacticalSchemes];
                            newSchemes[index].teamName = e.target.value;
                            setFormData({ ...formData, tacticalSchemes: newSchemes });
                          }}
                          placeholder="Team Name"
                        />
                        <Input
                          value={scheme.matches || ""}
                          onChange={(e) => {
                            const newSchemes = [...formData.tacticalSchemes];
                            const value = e.target.value;
                            // Try to parse as number, otherwise keep as string
                            newSchemes[index].matches = isNaN(Number(value)) ? value : parseInt(value);
                            setFormData({ ...formData, tacticalSchemes: newSchemes });
                          }}
                          placeholder="Matches (e.g., 15 or 'CURRENT CLUB')"
                        />
                        <Input
                          value={scheme.clubLogo || ""}
                          onChange={(e) => {
                            const newSchemes = [...formData.tacticalSchemes];
                            newSchemes[index].clubLogo = e.target.value;
                            setFormData({ ...formData, tacticalSchemes: newSchemes });
                          }}
                          placeholder="Club Logo URL"
                          className="col-span-2"
                        />
                        <Input
                          value={scheme.playerImage || ""}
                          onChange={(e) => {
                            const newSchemes = [...formData.tacticalSchemes];
                            newSchemes[index].playerImage = e.target.value;
                            setFormData({ ...formData, tacticalSchemes: newSchemes });
                          }}
                          placeholder="Player Image URL"
                          className="col-span-2"
                        />
                      </div>
                    </Card>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFormData({ 
                        ...formData, 
                        tacticalSchemes: [
                          ...formData.tacticalSchemes, 
                          {
                            formation: "",
                            positions: [],
                            teamName: "",
                            matches: 0,
                            clubLogo: "",
                            playerImage: "",
                          }
                        ] 
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Scheme
                  </Button>
                </TabsContent>

                {/* Stats Tab */}
                <TabsContent value="stats" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Season Stats</Label>
                    {formData.seasonStats.map((stat, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={stat.header}
                          onChange={(e) => {
                            const newStats = [...formData.seasonStats];
                            newStats[index].header = e.target.value;
                            setFormData({ ...formData, seasonStats: newStats });
                          }}
                          placeholder="Header (e.g., Goals)"
                          className="flex-1"
                        />
                        <Input
                          value={stat.value}
                          onChange={(e) => {
                            const newStats = [...formData.seasonStats];
                            newStats[index].value = e.target.value;
                            setFormData({ ...formData, seasonStats: newStats });
                          }}
                          placeholder="Value (e.g., 15)"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => {
                            const newStats = formData.seasonStats.filter((_, i) => i !== index);
                            setFormData({ ...formData, seasonStats: newStats });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({ 
                          ...formData, 
                          seasonStats: [...formData.seasonStats, { header: "", value: "" }] 
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Season Stat
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Top Stats</Label>
                    {formData.topStats.map((stat, index) => (
                      <div key={index} className="space-y-2 p-3 border rounded">
                        <div className="flex gap-2">
                          <Input
                            value={stat.label}
                            onChange={(e) => {
                              const newStats = [...formData.topStats];
                              newStats[index].label = e.target.value;
                              setFormData({ ...formData, topStats: newStats });
                            }}
                            placeholder="Label (e.g., Pass Accuracy)"
                          />
                          <Input
                            value={stat.value}
                            onChange={(e) => {
                              const newStats = [...formData.topStats];
                              newStats[index].value = e.target.value;
                              setFormData({ ...formData, topStats: newStats });
                            }}
                            placeholder="Value (e.g., 89%)"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => {
                              const newStats = formData.topStats.filter((_, i) => i !== index);
                              setFormData({ ...formData, topStats: newStats });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          value={stat.description || ""}
                          onChange={(e) => {
                            const newStats = [...formData.topStats];
                            newStats[index].description = e.target.value;
                            setFormData({ ...formData, topStats: newStats });
                          }}
                          placeholder="Description (optional)"
                        />
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({ 
                          ...formData, 
                          topStats: [...formData.topStats, { label: "", value: "", description: "" }] 
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Top Stat
                    </Button>
                  </div>
                </TabsContent>

                {/* Links Tab */}
                <TabsContent value="links" className="space-y-4">
                  <div className="space-y-2">
                    <Label>External Profile Links</Label>
                    <p className="text-sm text-muted-foreground">
                      These appear as separate link buttons on the player profile
                    </p>
                    {formData.links.map((link, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={link.label}
                          onChange={(e) => {
                            const newLinks = [...formData.links];
                            newLinks[index].label = e.target.value;
                            setFormData({ ...formData, links: newLinks });
                          }}
                          placeholder="Label (e.g., Transfermarkt)"
                          className="flex-1"
                        />
                        <Input
                          value={link.url}
                          onChange={(e) => {
                            const newLinks = [...formData.links];
                            newLinks[index].url = e.target.value;
                            setFormData({ ...formData, links: newLinks });
                          }}
                          placeholder="URL"
                          className="flex-[2]"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => {
                            const newLinks = formData.links.filter((_, i) => i !== index);
                            setFormData({ ...formData, links: newLinks });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({ 
                          ...formData, 
                          links: [...formData.links, { label: "", url: "" }] 
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Link
                    </Button>
                  </div>

                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <p className="font-medium mb-1">Note about Highlights:</p>
                    <p className="text-muted-foreground">
                      Video highlights are managed through the player's Highlights tab using the file upload system, not through this edit dialog.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save Changes
                </Button>
              </div>
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlayerManagement;
