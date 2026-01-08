import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Search, Filter, Eye, Edit2, Trash2, UserPlus, Check, X, Clock,
  AlertCircle, TrendingUp, Users, MapPin, Building, UserCheck, ChevronRight,
  FileText, Send, Star, MessageSquare, Video, Link, FileDown
} from "lucide-react";
import { ScoutFeedbackDialog } from "./ScoutFeedbackDialog";

interface ScoutingReport {
  id: string;
  player_name: string;
  age: number | null;
  position: string | null;
  current_club: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  height_cm: number | null;
  preferred_foot: string | null;
  scout_name: string | null;
  scout_id: string | null;
  scouting_date: string | null;
  location: string | null;
  competition: string | null;
  match_context: string | null;
  status: string;
  priority: string | null;
  added_to_prospects: boolean;
  prospect_id: string | null;
  summary: string | null;
  strengths: string | null;
  weaknesses: string | null;
  skill_evaluations: any;
  auto_generated_review: string | null;
  created_at: string;
  profile_image_url: string | null;
  video_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  agent_name: string | null;
  agent_contact: string | null;
  linked_player_id: string | null;
  full_match_url: string | null;
  contribution_type: string | null;
  notes: string | null;
  rise_report_url: string | null;
  additional_documents: any;
  additional_info: string | null;
}

interface AllReportsSectionProps {
  onViewReport?: (report: ScoutingReport) => void;
  onEditReport?: (report: ScoutingReport) => void;
}

// New status config with user-specified categories (supports old values too)
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  recruiting: { 
    label: "Recruiting", 
    color: "bg-green-500/10 text-green-600 border-green-500/30",
    icon: Star 
  },
  scouting_further: { 
    label: "Scouting Further", 
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    icon: Eye 
  },
  no_interest: { 
    label: "No Interest At This Time", 
    color: "bg-gray-500/10 text-gray-600 border-gray-500/30",
    icon: X 
  },
  pending: { 
    label: "Analysing", 
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
    icon: Clock 
  },
  // Legacy statuses for backward compatibility
  recommended: { 
    label: "Recommended", 
    color: "bg-green-500/10 text-green-600 border-green-500/30",
    icon: Star 
  },
  monitoring: { 
    label: "Monitoring", 
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    icon: Eye 
  },
  rejected: { 
    label: "Rejected", 
    color: "bg-red-500/10 text-red-600 border-red-500/30",
    icon: X 
  },
};

const PRIORITY_CONFIG = {
  low: { label: "Low", color: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", color: "bg-blue-500/10 text-blue-600" },
  high: { label: "High", color: "bg-orange-500/10 text-orange-600" },
  critical: { label: "Critical", color: "bg-red-500/10 text-red-600" },
};

const CONTRIBUTION_CONFIG = {
  exclusive: { label: "Exclusive", color: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  contribution: { label: "Contribution", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  neither: { label: "Neither", color: "bg-gray-500/10 text-gray-600 border-gray-500/30" },
};

export const AllReportsSection = ({ onViewReport, onEditReport }: AllReportsSectionProps) => {
  const [reports, setReports] = useState<ScoutingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [selectedReport, setSelectedReport] = useState<ScoutingReport | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [existingPlayerNames, setExistingPlayerNames] = useState<Set<string>>(new Set());
  
  // Confirmation dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmNote, setConfirmNote] = useState("");
  const [confirmType, setConfirmType] = useState<"exclusive" | "contribution" | "neither" | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Feedback dialog state
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackReport, setFeedbackReport] = useState<ScoutingReport | null>(null);

  useEffect(() => {
    fetchReports();
    fetchPlayers();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("scouting_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from("players")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setPlayers(data || []);
      // Create a set of lowercase player names for comparison
      setExistingPlayerNames(new Set((data || []).map(p => p.name.toLowerCase().trim())));
    } catch (error) {
      console.error("Error fetching players:", error);
    }
  };

  // Check if player already exists in database
  const playerExistsInDatabase = (playerName: string): boolean => {
    return existingPlayerNames.has(playerName.toLowerCase().trim());
  };

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("scouting_reports")
        .update({ status: newStatus })
        .eq("id", reportId);

      if (error) throw error;
      
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
      toast.success(`Status updated to ${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label || newStatus}`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handlePriorityChange = async (reportId: string, newPriority: string) => {
    try {
      const { error } = await supabase
        .from("scouting_reports")
        .update({ priority: newPriority })
        .eq("id", reportId);

      if (error) throw error;
      
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, priority: newPriority } : r));
      toast.success("Priority updated");
    } catch (error) {
      console.error("Error updating priority:", error);
      toast.error("Failed to update priority");
    }
  };

  const handleContributionConfirm = async () => {
    if (!selectedReport || !confirmType) return;
    
    setSendingMessage(true);
    try {
      // Update the report with contribution type
      const { error } = await supabase
        .from("scouting_reports")
        .update({ 
          contribution_type: confirmType,
          notes: confirmNote || null
        })
        .eq("id", selectedReport.id);

      if (error) throw error;
      
      // Update local state
      setReports(prev => prev.map(r => 
        r.id === selectedReport.id 
          ? { ...r, contribution_type: confirmType, notes: confirmNote || null } 
          : r
      ));
      
      setSelectedReport(prev => prev ? { ...prev, contribution_type: confirmType } : null);
      
      toast.success(`Marked as ${CONTRIBUTION_CONFIG[confirmType].label}${confirmNote ? ' with note' : ''}`);
      
      // Reset dialog state
      setConfirmDialogOpen(false);
      setConfirmNote("");
      setConfirmType(null);
    } catch (error) {
      console.error("Error updating contribution type:", error);
      toast.error("Failed to update");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAddToDatabase = async (report: ScoutingReport) => {
    // Double-check the player doesn't exist
    if (playerExistsInDatabase(report.player_name)) {
      toast.error("This player already exists in the database");
      return;
    }
    
    try {
      // Add to players table as "Scouted" category
      const { data: player, error } = await supabase
        .from("players")
        .insert({
          name: report.player_name,
          age: report.age || 0,
          position: report.position || "Unknown",
          nationality: report.nationality || "Unknown",
          club: report.current_club,
          category: "Scouted",
          image_url: report.profile_image_url,
          bio: `Scouted on ${report.scouting_date ? format(new Date(report.scouting_date), "dd/MM/yyyy") : "Unknown"}. ${report.summary || ""}`
        })
        .select()
        .single();

      if (error) throw error;

      // Update the scouting report with the linked player ID
      await supabase
        .from("scouting_reports")
        .update({
          added_to_prospects: true,
          linked_player_id: player.id
        })
        .eq("id", report.id);

      setReports(prev => prev.map(r => 
        r.id === report.id ? { ...r, added_to_prospects: true, linked_player_id: player.id } : r
      ));
      
      // Update existing player names and refetch players list
      setExistingPlayerNames(prev => new Set([...prev, report.player_name.toLowerCase().trim()]));
      fetchPlayers();
      
      toast.success("Player added to Scouted Players");
    } catch (error) {
      console.error("Error adding to database:", error);
      toast.error("Failed to add player to database");
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;

    try {
      const { error } = await supabase
        .from("scouting_reports")
        .delete()
        .eq("id", reportId);

      if (error) throw error;
      
      setReports(prev => prev.filter(r => r.id !== reportId));
      toast.success("Report deleted");
    } catch (error) {
      console.error("Error deleting report:", error);
      toast.error("Failed to delete report");
    }
  };

  // Filter and sort reports
  const filteredReports = reports
    .filter(report => {
      const matchesSearch = 
        report.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.current_club?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.nationality?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.scout_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || report.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || report.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name":
          return a.player_name.localeCompare(b.player_name);
        case "status":
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

  // Stats
  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === "pending").length,
    recruiting: reports.filter(r => r.status === "recruiting").length,
    scoutingFurther: reports.filter(r => r.status === "scouting_further").length,
    noInterest: reports.filter(r => r.status === "no_interest").length,
    addedToDb: reports.filter(r => r.added_to_prospects).length,
  };

  const handleViewReport = (report: ScoutingReport) => {
    setSelectedReport(report);
    setViewDialogOpen(true);
    onViewReport?.(report);
  };

  const openConfirmDialog = (type: "exclusive" | "contribution" | "neither") => {
    setConfirmType(type);
    setConfirmNote("");
    setConfirmDialogOpen(true);
  };

  // Check if player can be added to database
  const canAddToDatabase = (report: ScoutingReport): boolean => {
    return !report.added_to_prospects && !playerExistsInDatabase(report.player_name);
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total Reports</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-2xl font-bold text-yellow-600">{stats.pending}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Analysing</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <Star className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{stats.recruiting}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Recruiting</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <Eye className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold text-blue-600">{stats.scoutingFurther}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Scouting Further</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-gray-500/10 to-gray-500/5 border-gray-500/20">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <X className="h-4 w-4 text-gray-600" />
              <span className="text-2xl font-bold text-gray-600">{stats.noInterest}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">No Interest</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <UserCheck className="h-4 w-4 text-purple-600" />
              <span className="text-2xl font-bold text-purple-600">{stats.addedToDb}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">In Database</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by player, club, nationality, or scout..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Analysing</SelectItem>
                <SelectItem value="recruiting">Recruiting</SelectItem>
                <SelectItem value="scouting_further">Scouting Further</SelectItem>
                <SelectItem value="no_interest">No Interest</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-[140px]">
                <AlertCircle className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name">Player Name</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <ScrollArea className="h-[calc(100vh-500px)] min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading reports...</div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No reports found</p>
            <p className="text-sm text-muted-foreground/70">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-3 pr-4">
            {filteredReports.map((report) => {
              const statusConfig = STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG];
              const priorityConfig = report.priority ? PRIORITY_CONFIG[report.priority as keyof typeof PRIORITY_CONFIG] : null;
              const StatusIcon = statusConfig?.icon || AlertCircle;
              const alreadyInDb = playerExistsInDatabase(report.player_name);
              
              return (
                <Card 
                  key={report.id} 
                  className="hover:border-primary/50 transition-all duration-200 cursor-pointer group"
                  onClick={() => handleViewReport(report)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Player Avatar */}
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {report.profile_image_url ? (
                          <img 
                            src={report.profile_image_url} 
                            alt={report.player_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-bold text-muted-foreground">
                            {report.player_name.charAt(0)}
                          </span>
                        )}
                      </div>

                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                              {report.player_name}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5 text-sm text-muted-foreground">
                              {report.age && <span>{report.age}y</span>}
                              {report.position && <span>• {report.position}</span>}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>

                        {/* Details Row */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                          {report.current_club && (
                            <div className="flex items-center gap-1">
                              <Building className="h-3.5 w-3.5" />
                              <span>{report.current_club}</span>
                            </div>
                          )}
                          {report.nationality && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>{report.nationality}</span>
                            </div>
                          )}
                          {report.scout_name && (
                            <div className="flex items-center gap-1">
                              <Eye className="h-3.5 w-3.5" />
                              <span>{report.scout_name}</span>
                            </div>
                          )}
                          <span className="text-xs">
                            {format(new Date(report.created_at), "dd MMM yyyy")}
                          </span>
                        </div>

                        {/* Status & Actions Row */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`${statusConfig?.color || ''} flex items-center gap-1`}>
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig?.label || report.status}
                            </Badge>
                            {priorityConfig && (
                              <Badge variant="outline" className={priorityConfig.color}>
                                {priorityConfig.label}
                              </Badge>
                            )}
                            {(report.added_to_prospects || alreadyInDb) && (
                              <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">
                                <UserCheck className="h-3 w-3 mr-1" />
                                In Database
                              </Badge>
                            )}
                            {report.contribution_type && (
                              <Badge variant="outline" className={CONTRIBUTION_CONFIG[report.contribution_type as keyof typeof CONTRIBUTION_CONFIG]?.color || ''}>
                                {CONTRIBUTION_CONFIG[report.contribution_type as keyof typeof CONTRIBUTION_CONFIG]?.label || report.contribution_type}
                              </Badge>
                            )}
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={report.status}
                              onValueChange={(value) => handleStatusChange(report.id, value)}
                            >
                              <SelectTrigger className="h-8 w-[140px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="recruiting">Recruiting</SelectItem>
                                <SelectItem value="scouting_further">Scouting Further</SelectItem>
                                <SelectItem value="no_interest">No Interest</SelectItem>
                              </SelectContent>
                            </Select>

                            {canAddToDatabase(report) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToDatabase(report);
                                }}
                              >
                                <UserPlus className="h-3.5 w-3.5 mr-1" />
                                Add
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditReport?.(report);
                              }}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(report.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* View Report Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedReport?.profile_image_url && (
                <div className="w-10 h-10 rounded-lg overflow-hidden">
                  <img 
                    src={selectedReport.profile_image_url} 
                    alt={selectedReport.player_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div>
                <span>{selectedReport?.player_name}</span>
                {selectedReport?.position && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    {selectedReport.position}
                  </span>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedReport && (
            <ScrollArea className="max-h-[70vh]">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
                  <TabsTrigger value="evaluation" className="flex-1">Evaluation</TabsTrigger>
                  <TabsTrigger value="documents" className="flex-1">Documents</TabsTrigger>
                  <TabsTrigger value="actions" className="flex-1">Actions</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs text-muted-foreground">Age</span>
                        <p className="font-medium">{selectedReport.age || "—"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Club</span>
                        <p className="font-medium">{selectedReport.current_club || "—"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Nationality</span>
                        <p className="font-medium">{selectedReport.nationality || "—"}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs text-muted-foreground">Scouted by</span>
                        <p className="font-medium">{selectedReport.scout_name || "—"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Date</span>
                        <p className="font-medium">{selectedReport.scouting_date ? format(new Date(selectedReport.scouting_date), "dd MMM yyyy") : "—"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Competition</span>
                        <p className="font-medium">{selectedReport.competition || "—"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Match Videos - Always show */}
                  <div className="pt-4 space-y-2">
                    <h4 className="text-sm font-medium mb-2">Match Videos</h4>
                    {selectedReport.video_url ? (
                      <a
                        href={selectedReport.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors"
                      >
                        <Video className="h-5 w-5 text-blue-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Highlight Video</p>
                        </div>
                        <ChevronRight className="h-4 w-4" />
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed bg-muted/30">
                        <Video className="h-5 w-5 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No highlight video attached</p>
                      </div>
                    )}
                    {selectedReport.full_match_url ? (
                      <a
                        href={selectedReport.full_match_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors"
                      >
                        <Video className="h-5 w-5 text-green-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Full Match</p>
                        </div>
                        <ChevronRight className="h-4 w-4" />
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed bg-muted/30">
                        <Video className="h-5 w-5 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No full match video attached</p>
                      </div>
                    )}
                  </div>

                  {selectedReport.auto_generated_review && (
                    <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
                      <h4 className="text-sm font-medium mb-2">AI Review</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedReport.auto_generated_review}
                      </p>
                    </div>
                  )}

                  {selectedReport.summary && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Summary</h4>
                      <p className="text-sm text-muted-foreground">{selectedReport.summary}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="evaluation" className="space-y-4 pt-4">
                  {selectedReport.strengths && (
                    <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                      <h4 className="text-sm font-medium text-green-600 mb-2">Strengths</h4>
                      <p className="text-sm">{selectedReport.strengths}</p>
                    </div>
                  )}
                  {selectedReport.weaknesses && (
                    <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                      <h4 className="text-sm font-medium text-red-600 mb-2">Weaknesses</h4>
                      <p className="text-sm">{selectedReport.weaknesses}</p>
                    </div>
                  )}
                  
                  {/* Skill Evaluations from RISE Report */}
                  {selectedReport.skill_evaluations && Array.isArray(selectedReport.skill_evaluations) && selectedReport.skill_evaluations.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-3">Skill Evaluations</h4>
                      <div className="space-y-3">
                        {selectedReport.skill_evaluations.map((skill: any, index: number) => (
                          <div key={index} className="p-3 rounded-lg bg-muted/50 border">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{skill.skill_name}</span>
                              <Badge variant="outline" className={
                                skill.grade?.startsWith('A') ? 'bg-green-500/10 text-green-600 border-green-500/30' :
                                skill.grade?.startsWith('B') ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' :
                                skill.grade?.startsWith('C') ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' :
                                'bg-red-500/10 text-red-600 border-red-500/30'
                              }>
                                {skill.grade}
                              </Badge>
                            </div>
                            {skill.domain && (
                              <span className="text-xs text-muted-foreground">{skill.domain}</span>
                            )}
                            {skill.description && (
                              <p className="text-xs text-muted-foreground mt-1">{skill.description}</p>
                            )}
                            {skill.notes && skill.notes.length > 0 && (
                              <p className="text-sm mt-2 italic">{skill.notes.join(' ')}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="documents" className="space-y-4 pt-4">
                  {/* RISE Report */}
                  {selectedReport.rise_report_url && (
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-medium">RISE Report</h4>
                      </div>
                      <a 
                        href={selectedReport.rise_report_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <FileDown className="h-4 w-4" />
                        View RISE Report
                      </a>
                    </div>
                  )}

                  {/* Video Links */}
                  <div className="space-y-2">
                    {selectedReport.video_url && (
                      <div className="p-4 rounded-lg bg-muted/50 border">
                        <div className="flex items-center gap-2 mb-2">
                          <Video className="h-4 w-4" />
                          <h4 className="text-sm font-medium">Highlights Video</h4>
                        </div>
                        <a 
                          href={selectedReport.video_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          Watch highlights →
                        </a>
                      </div>
                    )}
                    {selectedReport.full_match_url && (
                      <div className="p-4 rounded-lg bg-muted/50 border">
                        <div className="flex items-center gap-2 mb-2">
                          <Video className="h-4 w-4" />
                          <h4 className="text-sm font-medium">Full Match Video</h4>
                        </div>
                        <a 
                          href={selectedReport.full_match_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          Watch full match →
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Additional Documents */}
                  {selectedReport.additional_documents && Array.isArray(selectedReport.additional_documents) && selectedReport.additional_documents.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Additional Documents</h4>
                      <div className="space-y-2">
                        {selectedReport.additional_documents.map((doc: any, index: number) => (
                          <div key={index} className="p-3 rounded-lg bg-muted/50 border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{doc.name || `Document ${index + 1}`}</span>
                            </div>
                            <a 
                              href={doc.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                              <Link className="h-3 w-3" />
                              Open
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Additional Info */}
                  {selectedReport.additional_info && (
                    <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
                      <h4 className="text-sm font-medium mb-2">Additional Information</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedReport.additional_info}</p>
                    </div>
                  )}

                  {/* Empty state */}
                  {!selectedReport.rise_report_url && !selectedReport.video_url && !selectedReport.full_match_url && 
                   (!selectedReport.additional_documents || selectedReport.additional_documents.length === 0) && 
                   !selectedReport.additional_info && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No documents attached to this report</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="actions" className="space-y-4 pt-4">
                  <div className="space-y-4">
                    {/* Status Selection */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Status</label>
                      <Select
                        value={selectedReport.status}
                        onValueChange={(value) => {
                          handleStatusChange(selectedReport.id, value);
                          setSelectedReport(prev => prev ? { ...prev, status: value } : null);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Analysing</SelectItem>
                          <SelectItem value="recruiting">Recruiting</SelectItem>
                          <SelectItem value="scouting_further">Scouting Further</SelectItem>
                          <SelectItem value="no_interest">No Interest At This Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Priority Selection */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Priority</label>
                      <Select
                        value={selectedReport.priority || "none"}
                        onValueChange={(value) => {
                          const newPriority = value === "none" ? null : value;
                          if (newPriority) {
                            handlePriorityChange(selectedReport.id, newPriority);
                          }
                          setSelectedReport(prev => prev ? { ...prev, priority: newPriority } : null);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Set priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Priority</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Contribution Type - Exclusive/Contribution/Neither */}
                    <div className="pt-4 border-t">
                      <label className="text-sm font-medium mb-3 block">Confirm Contribution Type</label>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant={selectedReport.contribution_type === "exclusive" ? "default" : "outline"}
                          className="w-full"
                          onClick={() => openConfirmDialog("exclusive")}
                        >
                          <Star className="h-4 w-4 mr-2" />
                          Exclusive
                        </Button>
                        <Button
                          variant={selectedReport.contribution_type === "contribution" ? "default" : "outline"}
                          className="w-full"
                          onClick={() => openConfirmDialog("contribution")}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Contribution
                        </Button>
                        <Button
                          variant={selectedReport.contribution_type === "neither" ? "default" : "outline"}
                          className="w-full"
                          onClick={() => openConfirmDialog("neither")}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Neither
                        </Button>
                      </div>
                      {selectedReport.contribution_type && (
                        <div className="mt-2 p-2 rounded bg-muted text-sm">
                          Current: <Badge variant="outline" className={CONTRIBUTION_CONFIG[selectedReport.contribution_type as keyof typeof CONTRIBUTION_CONFIG]?.color || ''}>
                            {CONTRIBUTION_CONFIG[selectedReport.contribution_type as keyof typeof CONTRIBUTION_CONFIG]?.label}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Add to Database */}
                    <div className="pt-4 border-t space-y-2">
                      {canAddToDatabase(selectedReport) ? (
                        <Button
                          className="w-full"
                          onClick={() => {
                            handleAddToDatabase(selectedReport);
                            setSelectedReport(prev => prev ? { ...prev, added_to_prospects: true } : null);
                          }}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add to Player Database
                        </Button>
                      ) : (
                        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                          <UserCheck className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                          <p className="text-sm text-purple-600 font-medium">Already in Database</p>
                        </div>
                      )}

                      {/* Feedback Button */}
                      {selectedReport.scout_id && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setFeedbackReport(selectedReport);
                            setFeedbackDialogOpen(true);
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Send Feedback to Scout
                        </Button>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setViewDialogOpen(false);
                            onEditReport?.(selectedReport);
                          }}
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit Report
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            handleDelete(selectedReport.id);
                            setViewDialogOpen(false);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Contribution Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Confirm as {confirmType && CONTRIBUTION_CONFIG[confirmType]?.label}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Mark this scouting report as <strong>{confirmType && CONTRIBUTION_CONFIG[confirmType]?.label}</strong>. 
              You can add an optional note that will be saved with the report.
            </p>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Note (optional)</label>
              <Textarea
                placeholder="Add a note about this decision..."
                value={confirmNote}
                onChange={(e) => setConfirmNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleContributionConfirm} disabled={sendingMessage}>
              {sendingMessage ? (
                "Saving..."
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Confirm
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scout Feedback Dialog */}
      {feedbackReport && (
        <ScoutFeedbackDialog
          open={feedbackDialogOpen}
          onOpenChange={setFeedbackDialogOpen}
          reportId={feedbackReport.id}
          scoutId={feedbackReport.scout_id || ""}
          playerName={feedbackReport.player_name}
          onSuccess={fetchReports}
        />
      )}
    </div>
  );
};
