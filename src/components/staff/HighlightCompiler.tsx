import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Film, GripVertical, Trash2, Play, Pause, Download, Plus,
  FileVideo, ClipboardList, Search, FolderDown, X, ChevronUp, ChevronDown,
  Link2, Check, XCircle, Star
} from "lucide-react";
import JSZip from "jszip";

interface CompilerClip {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  source: "video_analysis" | "performance_report";
  sourceLabel: string;
  duration?: number;
  r90Score?: number | null;
  actionNumber?: number;
  status: "accepted" | "pending";
}

export const HighlightCompiler = () => {
  const [clips, setClips] = useState<CompilerClip[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [projectName, setProjectName] = useState("Highlight Reel");
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  // Import sources
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("all");
  const [videoAnalyses, setVideoAnalyses] = useState<any[]>([]);
  const [vaSearch, setVaSearch] = useState("");
  const [perfReports, setPerfReports] = useState<any[]>([]);
  const [prSearch, setPrSearch] = useState("");

  // Link report
  const [linkPlayerId, setLinkPlayerId] = useState<string>("");
  const [linkReports, setLinkReports] = useState<any[]>([]);

  useEffect(() => { fetchPlayers(); }, []);

  const fetchPlayers = async () => {
    const { data } = await supabase.from("players").select("id, name").order("name");
    setPlayers(data || []);
  };

  const fetchVideoAnalyses = async () => {
    let query = supabase.from("video_analyses").select("id, title, clips, created_at, player_id, opponent").order("created_at", { ascending: false });
    if (selectedPlayerId !== "all") query = query.eq("player_id", selectedPlayerId);
    const { data } = await query;
    setVideoAnalyses(data || []);
  };

  const fetchPerfReports = async () => {
    let query = supabase.from("player_analysis").select("id, opponent, analysis_date, player_id, r90_score, players!player_analysis_player_id_fkey(name)").order("analysis_date", { ascending: false });
    if (selectedPlayerId !== "all") query = query.eq("player_id", selectedPlayerId);
    const { data } = await query;
    setPerfReports(data || []);
  };

  useEffect(() => {
    if (importOpen) { fetchVideoAnalyses(); fetchPerfReports(); }
  }, [importOpen, selectedPlayerId]);

  // Fetch reports for linking
  const fetchLinkReports = async (playerId: string) => {
    const { data } = await supabase
      .from("player_analysis")
      .select("id, opponent, analysis_date, r90_score, players!player_analysis_player_id_fkey(name)")
      .eq("player_id", playerId)
      .order("analysis_date", { ascending: false });
    setLinkReports(data || []);
  };

  useEffect(() => {
    if (linkOpen && linkPlayerId) fetchLinkReports(linkPlayerId);
  }, [linkOpen, linkPlayerId]);

  // Link a full report — add all clipped actions as pending
  const linkReport = async (reportId: string, reportLabel: string, reportR90?: number | null) => {
    const { data: actions } = await supabase
      .from("performance_report_actions")
      .select("id, action_number, action_type, action_description, video_url, minute")
      .eq("analysis_id", reportId)
      .not("video_url", "is", null)
      .order("action_number");

    if (!actions || actions.length === 0) {
      toast.error("No clipped actions in this report");
      return;
    }

    const newClips: CompilerClip[] = actions
      .filter(a => !clips.some(c => c.videoUrl === a.video_url))
      .map(a => ({
        id: `pr-${a.id}`,
        title: a.action_type || `Action ${a.action_number}`,
        description: a.action_description || undefined,
        videoUrl: a.video_url!,
        source: "performance_report" as const,
        sourceLabel: reportLabel,
        r90Score: reportR90,
        actionNumber: a.action_number,
        status: "pending" as const,
      }));

    if (newClips.length === 0) {
      toast.info("All clips from this report are already added");
      return;
    }

    setClips(prev => [...prev, ...newClips]);
    setLinkOpen(false);
    toast.success(`${newClips.length} clips added as pending — review below`);
  };

  // Clip management
  const addClip = (clip: CompilerClip) => {
    if (clips.some(c => c.videoUrl === clip.videoUrl)) {
      toast.info("Clip already added");
      return;
    }
    setClips(prev => [...prev, clip]);
    toast.success(`Added: ${clip.title}`);
  };

  const removeClip = (id: string) => setClips(prev => prev.filter(c => c.id !== id));

  const acceptClip = (id: string) => {
    setClips(prev => prev.map(c => c.id === id ? { ...c, status: "accepted" } : c));
  };

  const rejectClip = (id: string) => removeClip(id);

  const acceptAll = () => {
    setClips(prev => prev.map(c => c.status === "pending" ? { ...c, status: "accepted" } : c));
    toast.success("All pending clips accepted");
  };

  const rejectAll = () => {
    setClips(prev => prev.filter(c => c.status !== "pending"));
    toast.success("All pending clips removed");
  };

  const moveClip = (index: number, direction: "up" | "down") => {
    const accepted = clips.filter(c => c.status === "accepted");
    const pending = clips.filter(c => c.status === "pending");
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= accepted.length) return;
    [accepted[index], accepted[target]] = [accepted[target], accepted[index]];
    setClips([...accepted, ...pending]);
  };

  const togglePlay = (id: string) => {
    const video = videoRefs.current[id];
    if (!video) return;
    if (playingId === id) {
      video.pause();
      setPlayingId(null);
    } else {
      Object.entries(videoRefs.current).forEach(([key, v]) => { if (key !== id && v) v.pause(); });
      video.play().catch(() => {});
      setPlayingId(id);
    }
  };

  const handleDurationLoaded = (id: string, duration: number) => {
    setClips(prev => prev.map(c => c.id === id ? { ...c, duration } : c));
  };

  // Export as ZIP
  const exportAsZip = async () => {
    const accepted = clips.filter(c => c.status === "accepted");
    if (accepted.length === 0) { toast.error("No accepted clips to export"); return; }
    setExporting(true);
    setExportProgress(0);
    try {
      const zip = new JSZip();
      const folder = zip.folder(projectName) || zip;
      for (let i = 0; i < accepted.length; i++) {
        const clip = accepted[i];
        const sanitised = clip.title.replace(/[^a-zA-Z0-9 _-]/g, "").trim();
        const fileName = `${i + 1}. ${sanitised}.mp4`;
        setExportProgress(Math.round((i / accepted.length) * 80));
        try {
          const response = await fetch(clip.videoUrl);
          const blob = await response.blob();
          folder.file(fileName, blob);
        } catch { toast.error(`Could not download: ${clip.title}`); }
      }
      setExportProgress(90);
      const content = await zip.generateAsync({ type: "blob" }, (meta) => {
        setExportProgress(90 + Math.round(meta.percent / 10));
      });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setExportProgress(100);
      toast.success("Highlight reel exported!");
    } catch (err: any) {
      console.error("Export failed:", err);
      toast.error("Export failed");
    } finally {
      setTimeout(() => { setExporting(false); setExportProgress(0); }, 1500);
    }
  };

  const fmtDuration = (s?: number) => {
    if (!s || !isFinite(s)) return "--";
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  const acceptedClips = clips.filter(c => c.status === "accepted");
  const pendingClips = clips.filter(c => c.status === "pending");
  const totalDuration = acceptedClips.reduce((sum, c) => sum + (c.duration || 0), 0);

  const getVaClips = (analysis: any): CompilerClip[] => {
    if (!analysis.clips || !Array.isArray(analysis.clips)) return [];
    return (analysis.clips as any[])
      .filter((c: any) => c.url || c.videoUrl)
      .map((c: any, idx: number) => ({
        id: `va-${analysis.id}-${idx}`,
        title: c.label || c.name || `Clip ${idx + 1}`,
        videoUrl: c.url || c.videoUrl,
        source: "video_analysis" as const,
        sourceLabel: analysis.title || "Video Analysis",
        status: "accepted" as const,
      }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Film className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Highlight Compiler</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input value={projectName} onChange={e => setProjectName(e.target.value)} className="w-48 text-sm" placeholder="Project name" />
          <Button variant="outline" size="sm" onClick={() => setLinkOpen(true)}>
            <Link2 className="h-4 w-4 mr-1" /> Link Report
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Import Clips
          </Button>
          <Button size="sm" onClick={exportAsZip} disabled={acceptedClips.length === 0 || exporting}>
            <FolderDown className="h-4 w-4 mr-1" />
            {exporting ? "Exporting..." : "Export ZIP"}
          </Button>
        </div>
      </div>

      {exporting && (
        <div className="space-y-1">
          <Progress value={exportProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">{exportProgress}% — Downloading and packaging clips...</p>
        </div>
      )}

      {/* Pending clips review */}
      {pendingClips.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Pending Review</h3>
              <Badge variant="secondary" className="text-xs">{pendingClips.length}</Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={acceptAll} className="text-xs h-7">
                <Check className="h-3 w-3 mr-1" /> Accept All
              </Button>
              <Button variant="outline" size="sm" onClick={rejectAll} className="text-xs h-7 text-destructive hover:text-destructive">
                <XCircle className="h-3 w-3 mr-1" /> Reject All
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {pendingClips.map(clip => (
              <Card key={clip.id} className="overflow-hidden border-dashed border-primary/40">
                {/* Video thumbnail */}
                <div
                  className="relative aspect-square bg-black cursor-pointer group"
                  onClick={() => togglePlay(clip.id)}
                >
                  <video
                    ref={el => { videoRefs.current[clip.id] = el; }}
                    src={clip.videoUrl}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                    crossOrigin="anonymous"
                    onLoadedMetadata={e => handleDurationLoaded(clip.id, (e.target as HTMLVideoElement).duration)}
                    onEnded={() => setPlayingId(null)}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                    {playingId === clip.id
                      ? <Pause className="h-8 w-8 text-white/90" />
                      : <Play className="h-8 w-8 text-white/90" />}
                  </div>
                  <Badge variant="secondary" className="absolute bottom-1 right-1 text-[10px] py-0 px-1">
                    {fmtDuration(clip.duration)}
                  </Badge>
                  {clip.r90Score != null && (
                    <Badge className="absolute top-1 left-1 text-[10px] py-0 px-1 bg-primary/90">
                      <Star className="h-2.5 w-2.5 mr-0.5" /> {clip.r90Score.toFixed(2)}
                    </Badge>
                  )}
                </div>

                {/* Info */}
                <div className="p-2 space-y-1">
                  <p className="font-medium text-xs truncate">{clip.title}</p>
                  {clip.description && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{clip.description}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground truncate">{clip.sourceLabel}</p>
                </div>

                {/* Accept / Reject */}
                <div className="flex border-t">
                  <button
                    onClick={() => acceptClip(clip.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium hover:bg-accent transition-colors text-primary"
                  >
                    <Check className="h-3.5 w-3.5" /> Accept
                  </button>
                  <div className="w-px bg-border" />
                  <button
                    onClick={() => rejectClip(clip.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium hover:bg-accent transition-colors text-destructive"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Accepted clips — ordered list */}
      {acceptedClips.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <h3 className="font-semibold text-foreground">Highlight Reel</h3>
            <span>{acceptedClips.length} clip{acceptedClips.length !== 1 ? "s" : ""}</span>
            <span>Total: {fmtDuration(totalDuration)}</span>
          </div>

          {acceptedClips.map((clip, index) => (
            <Card key={clip.id} className="overflow-hidden">
              <div className="flex items-stretch">
                <div className="relative w-48 min-h-[108px] bg-black flex-shrink-0 group cursor-pointer" onClick={() => togglePlay(clip.id)}>
                  <video
                    ref={el => { videoRefs.current[clip.id] = el; }}
                    src={clip.videoUrl}
                    className="w-full h-full object-cover"
                    muted playsInline preload="metadata" crossOrigin="anonymous"
                    onLoadedMetadata={e => handleDurationLoaded(clip.id, (e.target as HTMLVideoElement).duration)}
                    onEnded={() => setPlayingId(null)}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                    {playingId === clip.id ? <Pause className="h-8 w-8 text-white/80" /> : <Play className="h-8 w-8 text-white/80" />}
                  </div>
                  <Badge variant="secondary" className="absolute bottom-1 right-1 text-[10px] py-0 px-1">{fmtDuration(clip.duration)}</Badge>
                </div>

                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary font-bold text-sm">{index + 1}.</span>
                      <span className="font-medium text-sm truncate">{clip.title}</span>
                      {clip.r90Score != null && (
                        <Badge variant="outline" className="text-[10px] ml-auto flex-shrink-0">
                          R90: {clip.r90Score.toFixed(2)}
                        </Badge>
                      )}
                    </div>
                    {clip.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{clip.description}</p>
                    )}
                    <Badge variant="outline" className="text-[10px] mt-1">
                      {clip.source === "video_analysis" ? "Video Analysis" : "Performance Report"}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center px-2 gap-1 border-l">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveClip(index, "up")} disabled={index === 0}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveClip(index, "down")} disabled={index === acceptedClips.length - 1}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeClip(clip.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {clips.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <Film className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">No clips added yet</p>
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setLinkOpen(true)}>
                <Link2 className="h-4 w-4 mr-1" /> Link a Performance Report
              </Button>
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Import Individual Clips
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ Link Report Dialog ═══ */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Link Performance Report</DialogTitle>
            <DialogDescription>Select a player then a report. All clipped actions will appear as pending for review.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 pb-2">
            <Label className="text-sm whitespace-nowrap">Player:</Label>
            <Select value={linkPlayerId} onValueChange={(v) => { setLinkPlayerId(v); setLinkReports([]); }}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select player" />
              </SelectTrigger>
              <SelectContent>
                {players.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-2 pr-3">
              {!linkPlayerId && (
                <p className="text-sm text-muted-foreground text-center py-8">Select a player to see their reports</p>
              )}
              {linkPlayerId && linkReports.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No reports found for this player</p>
              )}
              {linkReports.map(report => (
                <Card
                  key={report.id}
                  className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => linkReport(report.id, `${(report.players as any)?.name || 'Player'} vs ${report.opponent || 'Unknown'}`, report.r90_score)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{(report.players as any)?.name || "Player"} vs {report.opponent || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{report.analysis_date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.r90_score != null && (
                        <Badge variant="outline" className="text-xs">R90: {report.r90_score.toFixed(2)}</Badge>
                      )}
                      <Link2 className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ═══ Import Individual Clips Dialog ═══ */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Individual Clips</DialogTitle>
            <DialogDescription>Add individual clips from Video Analysis sessions or Performance Report actions.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 pb-2">
            <Label className="text-sm whitespace-nowrap">Filter by player:</Label>
            <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All players" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All players</SelectItem>
                {players.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="video_analysis" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="video_analysis" className="gap-1.5"><FileVideo className="h-4 w-4" /> Video Analysis</TabsTrigger>
              <TabsTrigger value="performance_reports" className="gap-1.5"><ClipboardList className="h-4 w-4" /> Performance Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="video_analysis" className="flex-1 min-h-0 mt-3">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search video analyses..." value={vaSearch} onChange={e => setVaSearch(e.target.value)} className="pl-9" />
              </div>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2 pr-3">
                  {videoAnalyses
                    .filter(va => !vaSearch || va.title?.toLowerCase().includes(vaSearch.toLowerCase()) || va.opponent?.toLowerCase().includes(vaSearch.toLowerCase()))
                    .map(va => {
                      const vaClips = getVaClips(va);
                      if (vaClips.length === 0) return null;
                      return (
                        <Card key={va.id} className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-medium text-sm">{va.title}</p>
                              {va.opponent && <p className="text-xs text-muted-foreground">vs {va.opponent}</p>}
                            </div>
                            <Badge variant="secondary" className="text-xs">{vaClips.length} clips</Badge>
                          </div>
                          <div className="space-y-1">
                            {vaClips.map(clip => {
                              const alreadyAdded = clips.some(c => c.videoUrl === clip.videoUrl);
                              return (
                                <div key={clip.id} className="flex items-center justify-between py-1 px-2 rounded bg-muted/30 text-sm">
                                  <span className="truncate flex-1 mr-2">{clip.title}</span>
                                  <Button variant={alreadyAdded ? "secondary" : "outline"} size="sm" className="h-7 text-xs" disabled={alreadyAdded} onClick={() => addClip(clip)}>
                                    {alreadyAdded ? "Added" : "Add"}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </Card>
                      );
                    })}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="performance_reports" className="flex-1 min-h-0 mt-3">
              <ImportPerfReportTab
                perfReports={perfReports}
                prSearch={prSearch}
                setPrSearch={setPrSearch}
                clips={clips}
                addClip={addClip}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Sub-component for performance report individual import
const ImportPerfReportTab = ({ perfReports, prSearch, setPrSearch, clips, addClip }: {
  perfReports: any[];
  prSearch: string;
  setPrSearch: (v: string) => void;
  clips: CompilerClip[];
  addClip: (clip: CompilerClip) => void;
}) => {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [perfActions, setPerfActions] = useState<any[]>([]);

  const fetchPerfActions = async (reportId: string) => {
    const { data } = await supabase
      .from("performance_report_actions")
      .select("id, action_number, action_type, action_description, video_url, minute")
      .eq("analysis_id", reportId)
      .not("video_url", "is", null)
      .order("action_number");
    setPerfActions(data || []);
    setSelectedReportId(reportId);
  };

  return (
    <>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search reports..." value={prSearch} onChange={e => setPrSearch(e.target.value)} className="pl-9" />
      </div>
      <ScrollArea className="h-[400px]">
        <div className="space-y-1 pr-3">
          {selectedReportId ? (
            <div className="space-y-2">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedReportId(null); setPerfActions([]); }}>← Back to reports</Button>
              {perfActions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No clipped actions in this report</p>
              ) : (
                perfActions.map(action => {
                  const clipData: CompilerClip = {
                    id: `pr-${action.id}`,
                    title: `${action.action_type || "Action"} (${action.minute ? action.minute + "'" : "#" + action.action_number})`,
                    description: action.action_description || undefined,
                    videoUrl: action.video_url,
                    source: "performance_report",
                    sourceLabel: `Report action #${action.action_number}`,
                    status: "accepted",
                  };
                  const alreadyAdded = clips.some(c => c.videoUrl === action.video_url);
                  return (
                    <div key={action.id} className="flex items-center justify-between py-2 px-3 rounded bg-muted/30">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-sm font-medium truncate">{action.action_type || "Action"}</p>
                        <p className="text-xs text-muted-foreground truncate">{action.action_description || `#${action.action_number}`}</p>
                      </div>
                      <Button variant={alreadyAdded ? "secondary" : "outline"} size="sm" className="h-7 text-xs flex-shrink-0" disabled={alreadyAdded} onClick={() => addClip(clipData)}>
                        {alreadyAdded ? "Added" : "Add"}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            perfReports
              .filter(r => !prSearch || r.opponent?.toLowerCase().includes(prSearch.toLowerCase()) || (r.players as any)?.name?.toLowerCase().includes(prSearch.toLowerCase()))
              .map(report => (
                <Card key={report.id} className="p-3 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => fetchPerfActions(report.id)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{(report.players as any)?.name || "Player"} vs {report.opponent || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{report.analysis_date}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground rotate-[-90deg]" />
                  </div>
                </Card>
              ))
          )}
        </div>
      </ScrollArea>
    </>
  );
};
