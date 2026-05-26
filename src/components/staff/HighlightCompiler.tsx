import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayerCombobox } from "@/components/staff/PlayerCombobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Film, Trash2, Play, Pause, Plus, FolderDown, ChevronUp, ChevronDown,
  Link2, Check, XCircle, Star, Clock, ArrowLeft, Pencil, FileVideo,
  ClipboardList, Search, MoreHorizontal, ArrowDownWideNarrow, MonitorPlay
} from "lucide-react";
import { HighlightReelPlayer } from "./HighlightReelPlayer";
import JSZip from "jszip";
import { format } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CompilerClip {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  source: "video_analysis" | "performance_report";
  sourceId: string;
  sourceLabel: string;
  duration?: number;
  r90Score?: number | null;
  actionScore?: number | null;
  actionNumber?: number;
  status: "accepted" | "pending";
  /** ISO date — inherited from parent video_analysis auto_delete_at */
  expiresAt?: string | null;
}

interface HighlightProject {
  id: string;
  name: string;
  player_id: string | null;
  clips: CompilerClip[];
  settings: Record<string, any> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Score colour coding (matches PlayerFixtures scale) ──────────────────────

const getScoreBgColor = (score: number | null | undefined): string => {
  if (score === null || score === undefined) return 'bg-primary/90';
  if (score < 0) return 'bg-red-950';
  if (score < 0.2) return 'bg-red-600';
  if (score < 0.4) return 'bg-red-400';
  if (score < 0.6) return 'bg-orange-700';
  if (score < 0.8) return 'bg-orange-500';
  if (score < 1.0) return 'bg-yellow-400';
  if (score < 1.4) return 'bg-lime-400';
  if (score < 1.8) return 'bg-green-500';
  if (score < 2.5) return 'bg-green-700';
  return 'bg-yellow-600'; // RISE gold for 2.5+
};

const getActionScoreBgColor = (score: number | null | undefined): string => {
  if (score === null || score === undefined) return 'bg-muted';
  if (score >= 0.15) return 'bg-green-800';
  if (score >= 0.10) return 'bg-green-600';
  if (score >= 0.05) return 'bg-green-500';
  if (score > 0) return 'bg-lime-500';
  if (score === 0) return 'bg-yellow-500';
  if (score > -0.05) return 'bg-orange-500';
  if (score > -0.10) return 'bg-red-500';
  return 'bg-red-700';
};

const getClipScoreColor = (clip: { r90Score?: number | null; actionScore?: number | null }): string => {
  if (clip.actionScore != null) return getActionScoreBgColor(clip.actionScore);
  if (clip.r90Score != null) return getScoreBgColor(clip.r90Score);
  return 'bg-primary/90';
};

// ─── Component ───────────────────────────────────────────────────────────────

interface HighlightCompilerProps {
  defaultPlayerId?: string;
}

export const HighlightCompiler = ({ defaultPlayerId }: HighlightCompilerProps = {}) => {
  // ── Project list state ──
  const [projects, setProjects] = useState<HighlightProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [activeProject, setActiveProject] = useState<HighlightProject | null>(null);

  // ── Active project state ──
  const [clips, setClips] = useState<CompilerClip[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Link dialog state ──
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkTab, setLinkTab] = useState<"reports" | "analyses">("reports");
  const [linkPlayerId, setLinkPlayerId] = useState<string>(defaultPlayerId || "");
  const [players, setPlayers] = useState<{ id: string; name: string; position?: string | null; club?: string | null; image_url?: string | null; representation_status?: string | null }[]>([]);
  const [linkReports, setLinkReports] = useState<any[]>([]);
  const [linkAnalyses, setLinkAnalyses] = useState<any[]>([]);
  const [linkSearch, setLinkSearch] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");

  // ── New project dialog ──
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);

  // ── Rename ──
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // ── Reel player ──
  const [reelPlayerOpen, setReelPlayerOpen] = useState(false);

  // ─── Load projects ──────────────────────────────────────────────────────────

  useEffect(() => { fetchProjects(); fetchPlayers(); }, []);

  useEffect(() => {
    if (defaultPlayerId) {
      setLinkPlayerId(defaultPlayerId);
    }
  }, [defaultPlayerId]);

  useEffect(() => {
    if (linkOpen && defaultPlayerId) {
      setLinkPlayerId(defaultPlayerId);
    }
  }, [linkOpen, defaultPlayerId]);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    const { data, error } = await supabase
      .from("highlight_projects")
      .select("*")
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setProjects(data.map(p => ({
        ...p,
        clips: Array.isArray(p.clips) ? (p.clips as any as CompilerClip[]) : [],
        settings: p.settings as Record<string, any> | null,
      })));
    }
    setLoadingProjects(false);
  };

  const fetchPlayers = async () => {
    const { data } = await supabase
      .from("players")
      .select("id, name, position, club, image_url, representation_status")
      .order("name");
    setPlayers(data || []);
  };

  // ─── Create project ─────────────────────────────────────────────────────────

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    setCreating(true);
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;

    const { data, error } = await supabase
      .from("highlight_projects")
      .insert({
        name: newProjectName.trim(),
        clips: [],
        created_by: userId || null,
        player_id: defaultPlayerId || null,
      })
      .select()
      .single();

    if (error) { toast.error("Failed to create project"); setCreating(false); return; }
    const project: HighlightProject = { ...data, clips: [], settings: data.settings as any };
    setProjects(prev => [project, ...prev]);
    setActiveProject(project);
    setClips([]);
    setNewProjectOpen(false);
    setNewProjectName("");
    setCreating(false);
    toast.success("Project created");
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from("highlight_projects").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    setProjects(prev => prev.filter(p => p.id !== id));
    if (activeProject?.id === id) { setActiveProject(null); setClips([]); }
    toast.success("Project deleted");
  };

  const renameProject = async (id: string) => {
    if (!renameValue.trim()) return;
    const { error } = await supabase.from("highlight_projects").update({ name: renameValue.trim() }).eq("id", id);
    if (!error) {
      setProjects(prev => prev.map(p => p.id === id ? { ...p, name: renameValue.trim() } : p));
      if (activeProject?.id === id) setActiveProject(prev => prev ? { ...prev, name: renameValue.trim() } : prev);
    }
    setRenamingId(null);
    setRenameValue("");
  };

  // ─── Open project ───────────────────────────────────────────────────────────

  const openProject = (project: HighlightProject) => {
    setActiveProject(project);
    setClips(project.clips || []);
  };

  // ─── Persist clips (debounced) ──────────────────────────────────────────────

  const persistClips = useCallback((newClips: CompilerClip[]) => {
    if (!activeProject) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      await supabase
        .from("highlight_projects")
        .update({ clips: newClips as any })
        .eq("id", activeProject.id);
    }, 800);
  }, [activeProject]);

  const updateClips = useCallback((newClips: CompilerClip[]) => {
    setClips(newClips);
    persistClips(newClips);
  }, [persistClips]);

  // ─── Linking ────────────────────────────────────────────────────────────────

  const fetchLinkReports = async (playerId: string) => {
    const { data } = await supabase
      .from("player_analysis")
      .select("id, opponent, analysis_date, r90_score, players!player_analysis_player_id_fkey(name)")
      .eq("player_id", playerId)
      .order("analysis_date", { ascending: false });
    setLinkReports(data || []);
  };

  const fetchLinkAnalyses = async (playerId?: string) => {
    let query = supabase
      .from("video_analyses")
      .select("id, title, clips, created_at, player_id, opponent, video_url, auto_delete_at")
      .order("created_at", { ascending: false });
    if (playerId && playerId !== "all") query = query.eq("player_id", playerId);
    const { data } = await query;
    setLinkAnalyses(data || []);
  };

  useEffect(() => {
    if (linkOpen && linkPlayerId) {
      fetchLinkReports(linkPlayerId);
      fetchLinkAnalyses(linkPlayerId);
    } else if (linkOpen) {
      fetchLinkAnalyses();
    }
  }, [linkOpen, linkPlayerId]);

  /** Link a performance report — all clipped actions become pending */
  const linkReport = async (reportId: string, reportLabel: string, reportR90?: number | null) => {
    const { data: actions } = await supabase
      .from("performance_report_actions")
      .select("id, action_number, action_type, action_description, video_url, minute, action_score")
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
        sourceId: reportId,
        sourceLabel: reportLabel,
        r90Score: reportR90,
        actionScore: a.action_score,
        actionNumber: a.action_number,
        status: "pending" as const,
      }));

    if (newClips.length === 0) {
      toast.info("All clips from this report are already added");
      return;
    }

    updateClips([...clips, ...newClips]);
    setLinkOpen(false);
    toast.success(`${newClips.length} clips pending review`);
  };

  /** Link a video analysis — all clips become pending, inherit expiry */
  const linkAnalysis = (analysis: any) => {
    const analysisClips = Array.isArray(analysis.clips) ? analysis.clips : [];
    if (analysisClips.length === 0) {
      toast.error("No clips in this analysis");
      return;
    }

    const baseUrl = analysis.video_url;
    const newClips: CompilerClip[] = analysisClips
      .filter((c: any) => !clips.some(existing => existing.id === `va-${analysis.id}-${c.id}`))
      .map((c: any) => ({
        id: `va-${analysis.id}-${c.id}`,
        title: c.label || c.action_type || `Clip`,
        description: c.action_description || c.notes || undefined,
        videoUrl: `${baseUrl}#t=${c.start},${c.end}`,
        source: "video_analysis" as const,
        sourceId: analysis.id,
        sourceLabel: analysis.title || "Video Analysis",
        actionScore: c.action_score ?? null,
        status: "pending" as const,
        expiresAt: analysis.auto_delete_at,
      }));

    if (newClips.length === 0) {
      toast.info("All clips already added");
      return;
    }

    updateClips([...clips, ...newClips]);
    setLinkOpen(false);
    toast.success(`${newClips.length} clips pending review`);
  };

  // ─── Clip actions ───────────────────────────────────────────────────────────

  const acceptClip = (id: string) => updateClips(clips.map(c => c.id === id ? { ...c, status: "accepted" } : c));
  const rejectClip = (id: string) => updateClips(clips.filter(c => c.id !== id));
  const acceptAll = () => { updateClips(clips.map(c => c.status === "pending" ? { ...c, status: "accepted" } : c)); toast.success("All accepted"); };
  const rejectAll = () => { updateClips(clips.filter(c => c.status !== "pending")); toast.success("All rejected"); };
  const removeClip = (id: string) => updateClips(clips.filter(c => c.id !== id));

  const moveClip = (index: number, direction: "up" | "down") => {
    const accepted = clips.filter(c => c.status === "accepted");
    const pending = clips.filter(c => c.status === "pending");
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= accepted.length) return;
    [accepted[index], accepted[target]] = [accepted[target], accepted[index]];
    updateClips([...accepted, ...pending]);
  };

  const moveClipTo = (fromIdx: number, toIdx: number) => {
    const accepted = clips.filter(c => c.status === "accepted");
    const pending = clips.filter(c => c.status === "pending");
    if (fromIdx < 0 || fromIdx >= accepted.length) return;
    const clamped = Math.max(0, Math.min(accepted.length - 1, toIdx));
    const [moved] = accepted.splice(fromIdx, 1);
    accepted.splice(clamped, 0, moved);
    updateClips([...accepted, ...pending]);
  };

  const movePendingClip = (index: number, direction: "up" | "down") => {
    const accepted = clips.filter(c => c.status === "accepted");
    const pending = clips.filter(c => c.status === "pending");
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= pending.length) return;
    [pending[index], pending[target]] = [pending[target], pending[index]];
    updateClips([...accepted, ...pending]);
  };

  const sortPendingByScore = () => {
    const accepted = clips.filter(c => c.status === "accepted");
    const pending = [...clips.filter(c => c.status === "pending")];
    const hasScore = pending.filter(c => c.r90Score != null || c.actionScore != null);
    const noScore = pending.filter(c => c.r90Score == null && c.actionScore == null);
    hasScore.sort((a, b) => (b.actionScore ?? b.r90Score ?? 0) - (a.actionScore ?? a.r90Score ?? 0));
    updateClips([...accepted, ...hasScore, ...noScore]);
    toast.success("Pending clips sorted by score (highest first)");
  };

  const togglePlay = (id: string) => {
    const video = videoRefs.current[id];
    if (!video) return;
    if (playingId === id) { video.pause(); setPlayingId(null); }
    else {
      Object.entries(videoRefs.current).forEach(([key, v]) => { if (key !== id && v) v.pause(); });
      video.play().catch(() => {});
      setPlayingId(id);
    }
  };

  const handleDurationLoaded = (id: string, duration: number) => {
    setClips(prev => prev.map(c => c.id === id ? { ...c, duration } : c));
  };

  const sortByR90 = () => {
    const accepted = clips.filter(c => c.status === "accepted");
    const pending = clips.filter(c => c.status === "pending");
    const hasScore = accepted.filter(c => c.r90Score != null || c.actionScore != null);
    const noScore = accepted.filter(c => c.r90Score == null && c.actionScore == null);
    hasScore.sort((a, b) => {
      const scoreA = a.actionScore ?? a.r90Score ?? 0;
      const scoreB = b.actionScore ?? b.r90Score ?? 0;
      return scoreB - scoreA;
    });
    updateClips([...hasScore, ...noScore, ...pending]);
    toast.success("Sorted by score (highest first)");
  };

  // ─── Extend expiry ─────────────────────────────────────────────────────────

  const extendExpiry = async (clip: CompilerClip) => {
    if (!clip.expiresAt || clip.source !== "video_analysis") return;
    const newDate = new Date(new Date(clip.expiresAt).getTime() + 7 * 86400000);
    const { error } = await supabase
      .from("video_analyses")
      .update({ auto_delete_at: newDate.toISOString() })
      .eq("id", clip.sourceId);
    if (error) { toast.error("Failed to extend"); return; }

    // Update all clips from same source
    const updated = clips.map(c =>
      c.sourceId === clip.sourceId ? { ...c, expiresAt: newDate.toISOString() } : c
    );
    updateClips(updated);
    toast.success("Deletion extended by 7 days");
  };

  // ─── Export ─────────────────────────────────────────────────────────────────

  const exportAsZip = async () => {
    const accepted = clips.filter(c => c.status === "accepted");
    if (accepted.length === 0) { toast.error("No accepted clips to export"); return; }
    setExporting(true); setExportProgress(0);
    try {
      const zip = new JSZip();
      const folder = zip.folder(activeProject?.name || "Highlight Reel") || zip;
      for (let i = 0; i < accepted.length; i++) {
        const clip = accepted[i];
        const sanitised = clip.title.replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "Clip";
        setExportProgress(Math.round((i / accepted.length) * 80));
        try {
          // Strip URL fragments (e.g. #t=) which break Supabase storage fetches
          const cleanUrl = clip.videoUrl.split("#")[0];
          // Force download mode on Supabase storage URLs to avoid CORS / inline-stream issues
          const fetchUrl = cleanUrl.includes("supabase.co/storage")
            ? (cleanUrl.includes("?") ? `${cleanUrl}&download=` : `${cleanUrl}?download=`)
            : cleanUrl;
          const response = await fetch(fetchUrl, { mode: "cors", cache: "no-store" });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const rawBlob = await response.blob();
          // Detect the real content type so the extension matches the bytes.
          // Clips can be MP4 (from Performance Reports) or WebM (from Video
          // Analysis recordings) — forcing every file to .mp4 produced files
          // that wouldn't open. Read the response header first, fall back to
          // sniffing the URL, then default to MP4.
          const headerType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
          const urlLower = cleanUrl.toLowerCase();
          let mime = headerType;
          if (!mime || mime === "application/octet-stream" || mime === "binary/octet-stream") {
            if (urlLower.endsWith(".webm")) mime = "video/webm";
            else if (urlLower.endsWith(".mov")) mime = "video/quicktime";
            else if (urlLower.endsWith(".mpeg") || urlLower.endsWith(".mpg")) mime = "video/mpeg";
            else mime = "video/mp4";
          }
          const ext = mime === "video/webm" ? "webm"
            : mime === "video/quicktime" ? "mov"
            : mime === "video/mpeg" ? "mpeg"
            : "mp4";
          const blob = new Blob([rawBlob], { type: mime });
          const fileName = `${i + 1}. ${sanitised}.${ext}`;
          folder.file(fileName, blob);
        } catch (err) {
          console.error(`Failed to download clip ${clip.title}:`, err);
          toast.error(`Could not download: ${clip.title}`);
        }
      }
      setExportProgress(90);
      const content = await zip.generateAsync({ type: "blob" }, (meta) => {
        setExportProgress(90 + Math.round(meta.percent / 10));
      });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeProject?.name || "Highlight Reel"}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setExportProgress(100);
      toast.success("Highlight reel exported!");
    } catch { toast.error("Export failed"); }
    finally { setTimeout(() => { setExporting(false); setExportProgress(0); }, 1500); }
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const fmtDuration = (s?: number) => {
    if (!s || !isFinite(s)) return "--";
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  const daysUntilExpiry = (dateStr?: string | null): number | null => {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  };

  const acceptedClips = clips.filter(c => c.status === "accepted");
  const pendingClips = clips.filter(c => c.status === "pending");
  const totalDuration = acceptedClips.reduce((sum, c) => sum + (c.duration || 0), 0);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — Project list view
  // ═══════════════════════════════════════════════════════════════════════════

  if (!activeProject) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Film className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Highlight Compiler</h2>
          </div>
          <Button onClick={() => setNewProjectOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Project
          </Button>
        </div>

        {loadingProjects ? (
          <p className="text-sm text-muted-foreground text-center py-12">Loading projects...</p>
        ) : projects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center space-y-3">
              <Film className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">No highlight projects yet</p>
              <Button variant="outline" size="sm" onClick={() => setNewProjectOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Create your first project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.map(project => {
              const clipCount = Array.isArray(project.clips) ? project.clips.length : 0;
              const acceptedCount = Array.isArray(project.clips) ? project.clips.filter(c => c.status === "accepted").length : 0;
              return (
                <Card
                  key={project.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors group"
                  onClick={() => openProject(project)}
                >
                  <CardContent className="p-4 space-y-2">
                    {renamingId === project.id ? (
                      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                        <Input
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                          onKeyDown={e => e.key === "Enter" && renameProject(project.id)}
                        />
                        <Button size="sm" variant="outline" className="h-8" onClick={() => renameProject(project.id)}>
                          <Check className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-sm truncate flex-1">{project.name}</h3>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setRenamingId(project.id); setRenameValue(project.name); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteProject(project.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{clipCount} clip{clipCount !== 1 ? "s" : ""}</span>
                      {acceptedCount > 0 && <Badge variant="outline" className="text-[10px]">{acceptedCount} accepted</Badge>}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Updated {format(new Date(project.updated_at || project.created_at), "dd MMM yyyy HH:mm")}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* New Project Dialog */}
        <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Highlight Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Project Name</Label>
                <Input
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="e.g. Michael Pre-Season Reel"
                  onKeyDown={e => e.key === "Enter" && createProject()}
                />
              </div>
              <Button onClick={createProject} disabled={!newProjectName.trim() || creating} className="w-full">
                {creating ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — Active project view
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setActiveProject(null); fetchProjects(); }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Film className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold truncate">{activeProject.name}</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => { setLinkOpen(true); setLinkSearch(""); if (defaultPlayerId) setLinkPlayerId(defaultPlayerId); }}>
            <Link2 className="h-4 w-4 mr-1" /> Link Source
          </Button>
          <Button size="sm" onClick={exportAsZip} disabled={acceptedClips.length === 0 || exporting}>
            <FolderDown className="h-4 w-4 mr-1" />
            {exporting ? "Exporting..." : "Export ZIP"}
          </Button>
        </div>
      </div>

      {/* Export progress */}
      {exporting && (
        <div className="space-y-1">
          <Progress value={exportProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">{exportProgress}% — Downloading and packaging clips...</p>
        </div>
      )}

      {/* ════ Pending clips ════ */}
      {pendingClips.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Pending Review</h3>
              <Badge variant="secondary" className="text-xs">{pendingClips.length}</Badge>
            </div>
            <div className="flex gap-2">
              {pendingClips.some(c => c.r90Score != null || c.actionScore != null) && (
                <Button variant="outline" size="sm" onClick={sortPendingByScore} className="text-xs h-7">
                  <ArrowDownWideNarrow className="h-3 w-3 mr-1" /> Sort by Score
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={acceptAll} className="text-xs h-7">
                <Check className="h-3 w-3 mr-1" /> Accept All
              </Button>
              <Button variant="outline" size="sm" onClick={rejectAll} className="text-xs h-7 text-destructive hover:text-destructive">
                <XCircle className="h-3 w-3 mr-1" /> Reject All
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {pendingClips.map(clip => {
              const expiry = daysUntilExpiry(clip.expiresAt);
              return (
                <Card key={clip.id} className="overflow-hidden border-dashed border-primary/40">
                  <div className="relative aspect-square bg-black cursor-pointer group" onClick={() => togglePlay(clip.id)}>
                    <video
                      ref={el => { videoRefs.current[clip.id] = el; }}
                      src={clip.videoUrl}
                      className="w-full h-full object-cover"
                      muted playsInline preload="metadata" crossOrigin="anonymous"
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
                    {(clip.r90Score != null || clip.actionScore != null) && (
                      <Badge className={`absolute top-1 left-1 text-[10px] py-0 px-1 text-white ${getClipScoreColor(clip)}`}>
                        <Star className="h-2.5 w-2.5 mr-0.5" />
                        {clip.actionScore != null ? clip.actionScore.toFixed(3) : clip.r90Score?.toFixed(2)}
                      </Badge>
                    )}
                    {expiry !== null && (
                      <button
                        onClick={e => { e.stopPropagation(); extendExpiry(clip); }}
                        className={`absolute top-1 right-1 flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded ${expiry <= 2 ? 'bg-destructive/90 text-destructive-foreground' : 'bg-black/60 text-white/80'}`}
                        title="Click to extend by 7 days"
                      >
                        <Clock className="h-2.5 w-2.5" /> {expiry}d
                      </button>
                    )}
                  </div>

                  <div className="p-2 space-y-1">
                    <p className="font-medium text-xs truncate">{clip.title}</p>
                    {clip.description && <p className="text-[10px] text-muted-foreground line-clamp-2">{clip.description}</p>}
                    <p className="text-[10px] text-muted-foreground truncate">{clip.sourceLabel}</p>
                  </div>

                  <div className="flex border-t">
                    <button onClick={() => movePendingClip(pendingClips.indexOf(clip), 'up')} disabled={pendingClips.indexOf(clip) === 0} className="px-2 flex items-center justify-center text-xs hover:bg-accent disabled:opacity-30">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <div className="w-px bg-border" />
                    <button onClick={() => movePendingClip(pendingClips.indexOf(clip), 'down')} disabled={pendingClips.indexOf(clip) === pendingClips.length - 1} className="px-2 flex items-center justify-center text-xs hover:bg-accent disabled:opacity-30">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <div className="w-px bg-border" />
                    <button onClick={() => acceptClip(clip.id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium hover:bg-accent transition-colors text-primary">
                      <Check className="h-3.5 w-3.5" /> Accept
                    </button>
                    <div className="w-px bg-border" />
                    <button onClick={() => rejectClip(clip.id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium hover:bg-accent transition-colors text-destructive">
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ════ Accepted clips (ordered reel) ════ */}
      {acceptedClips.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <h3 className="font-semibold text-foreground">Highlight Reel</h3>
              <span>{acceptedClips.length} clip{acceptedClips.length !== 1 ? "s" : ""}</span>
              <span>Total: {fmtDuration(totalDuration)}</span>
            </div>
            <div className="flex items-center gap-2">
              {acceptedClips.some(c => c.r90Score != null || c.actionScore != null) && (
                <Button variant="outline" size="sm" onClick={sortByR90} className="text-xs h-7">
                  <ArrowDownWideNarrow className="h-3 w-3 mr-1" /> Sort by Score
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setReelPlayerOpen(true)} className="text-xs h-7">
                <MonitorPlay className="h-3 w-3 mr-1" /> Watch Reel
              </Button>
            </div>
          </div>

          {acceptedClips.map((clip, index) => {
            const expiry = daysUntilExpiry(clip.expiresAt);
            return (
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
                        {(clip.r90Score != null || clip.actionScore != null) && (
                          <Badge className={`text-[10px] ml-auto flex-shrink-0 text-white ${getClipScoreColor(clip)}`}>
                            {clip.actionScore != null ? `Score: ${clip.actionScore.toFixed(3)}` : `R90: ${clip.r90Score?.toFixed(2)}`}
                          </Badge>
                        )}
                      </div>
                      {clip.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{clip.description}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">
                          {clip.source === "video_analysis" ? "Video Analysis" : "Performance Report"}
                        </Badge>
                        {expiry !== null && (
                          <button
                            onClick={() => extendExpiry(clip)}
                            className={`flex items-center gap-0.5 text-[10px] ${expiry <= 2 ? 'text-destructive' : 'text-muted-foreground'}`}
                            title="Click to extend by 7 days"
                          >
                            <Clock className="h-3 w-3" /> {expiry}d left
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center px-2 gap-1 border-l">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveClip(index, "up")} disabled={index === 0}>
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveClip(index, "down")} disabled={index === acceptedClips.length - 1}>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeClip(clip.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {clips.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <Film className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">No clips yet. Link a performance report or video analysis to get started.</p>
            <Button variant="outline" size="sm" onClick={() => { setLinkOpen(true); if (defaultPlayerId) setLinkPlayerId(defaultPlayerId); }}>
              <Link2 className="h-4 w-4 mr-1" /> Link Source
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ═══ Link Source Dialog ═══ */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Link Source</DialogTitle>
            <DialogDescription>Link a performance report or video analysis. All clips will appear as pending for review.</DialogDescription>
          </DialogHeader>

          {defaultPlayerId ? (
            <div className="flex items-center gap-3 pb-2">
              <Label className="text-sm whitespace-nowrap">Player:</Label>
              <div className="rounded-md border px-3 py-2 text-sm min-w-[220px]">
                <span className="font-medium">{players.find(p => p.id === defaultPlayerId)?.name || "Selected player"}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2 pb-2">
              <Label className="text-sm">Player</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search players by name..."
                  value={playerSearch}
                  onChange={e => setPlayerSearch(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
              {linkPlayerId && linkPlayerId !== "all" && (
                <div className="flex items-center justify-between rounded-md border bg-accent/30 px-3 py-1.5">
                  <span className="text-sm font-medium">{players.find(p => p.id === linkPlayerId)?.name}</span>
                  <Button
                    variant="ghost" size="sm" className="h-6 text-xs"
                    onClick={() => { setLinkPlayerId(""); setLinkReports([]); setLinkAnalyses([]); setPlayerSearch(""); }}
                  >Change</Button>
                </div>
              )}
              {playerSearch && !linkPlayerId && (
                <ScrollArea className="max-h-[180px] rounded-md border">
                  <div className="p-1">
                    {players
                      .filter(p => p.name.toLowerCase().includes(playerSearch.toLowerCase()))
                      .slice(0, 50)
                      .map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { setLinkPlayerId(p.id); setLinkReports([]); setLinkAnalyses([]); setPlayerSearch(""); }}
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                        >
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-muted" />
                          )}
                          <span className="flex-1 truncate">{p.name}</span>
                          {p.position && <span className="text-xs text-muted-foreground">{p.position}</span>}
                        </button>
                      ))}
                    {players.filter(p => p.name.toLowerCase().includes(playerSearch.toLowerCase())).length === 0 && (
                      <p className="px-2 py-3 text-center text-xs text-muted-foreground">No players match "{playerSearch}"</p>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          <Tabs value={linkTab} onValueChange={v => setLinkTab(v as any)} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="reports" className="gap-1.5"><ClipboardList className="h-4 w-4" /> Performance Reports</TabsTrigger>
              <TabsTrigger value="analyses" className="gap-1.5"><FileVideo className="h-4 w-4" /> Video Analysis</TabsTrigger>
            </TabsList>

            <div className="relative mt-3 mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={linkSearch} onChange={e => setLinkSearch(e.target.value)} className="pl-9" />
            </div>

            <TabsContent value="reports" className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-[400px]">
                <div className="space-y-2 pr-3">
                  {!linkPlayerId || linkPlayerId === "all" ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Select a player to see their reports</p>
                  ) : linkReports.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No reports found</p>
                  ) : (
                    linkReports
                      .filter(r => !linkSearch || r.opponent?.toLowerCase().includes(linkSearch.toLowerCase()))
                      .map(report => (
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
                              {report.r90_score != null && <Badge variant="outline" className="text-xs">R90: {report.r90_score.toFixed(2)}</Badge>}
                              <Link2 className="h-4 w-4 text-primary" />
                            </div>
                          </div>
                        </Card>
                      ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="analyses" className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-[400px]">
                <div className="space-y-2 pr-3">
                  {linkAnalyses.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No video analyses found</p>
                  ) : (
                    linkAnalyses
                      .filter(va => !linkSearch || va.title?.toLowerCase().includes(linkSearch.toLowerCase()) || va.opponent?.toLowerCase().includes(linkSearch.toLowerCase()))
                      .map(va => {
                        const clipCount = Array.isArray(va.clips) ? va.clips.length : 0;
                        const expiry = daysUntilExpiry(va.auto_delete_at);
                        return (
                          <Card
                            key={va.id}
                            className={`p-3 cursor-pointer hover:bg-accent/50 transition-colors ${clipCount === 0 ? 'opacity-50' : ''}`}
                            onClick={() => clipCount > 0 && linkAnalysis(va)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{va.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {va.opponent && <span className="text-xs text-muted-foreground">vs {va.opponent}</span>}
                                  <Badge variant="secondary" className="text-[10px]">{clipCount} clips</Badge>
                                  {expiry !== null && (
                                    <span className={`text-[10px] flex items-center gap-0.5 ${expiry <= 2 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                      <Clock className="h-2.5 w-2.5" /> {expiry}d left
                                    </span>
                                  )}
                                </div>
                              </div>
                              {clipCount > 0 && <Link2 className="h-4 w-4 text-primary" />}
                            </div>
                          </Card>
                        );
                      })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      {/* ═══ Highlight Reel Player ═══ */}
      <HighlightReelPlayer
        clips={acceptedClips}
        projectName={activeProject.name}
        isOpen={reelPlayerOpen}
        onClose={() => setReelPlayerOpen(false)}
        playerId={activeProject.player_id}
        onReorder={(from, to) => moveClipTo(from, to)}
      />
    </div>
  );
};
