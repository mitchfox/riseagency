import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHighlightMakerAuth } from "@/hooks/useHighlightMakerAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Film, LogOut, Download, Play, ArrowLeft, ChevronDown, ChevronRight, FolderDown, Star, Pencil,
  GripVertical, Trash2, ArrowDownWideNarrow,
} from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { PageLoading } from "@/components/LoadingSpinner";
import { ClippedActionsPlayer } from "@/components/ClippedActionsPlayer";
import { AnalysisVideoReports } from "@/components/portal/AnalysisVideoReports";
import { sortActionsByMinute } from "@/lib/actionSorting";
import { format } from "date-fns";
import { AddToPlaylistButton } from "@/components/portal/AddToPlaylistButton";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { UploadsTab } from "@/components/portal/UploadsTab";
import { getR90Grade } from "@/lib/gradeCalculations";

// --- Sortable row for playlist clips (drag-and-drop reorder) ---
const SortableClipRow = ({
  id, idx, name, onPlay, onDownload, makerUsername, playerId, playerEmail, videoUrl, onRemove, actionScore,
}: {
  id: string;
  idx: number;
  name: string;
  videoUrl: string;
  onPlay: () => void;
  onDownload: () => void;
  onRemove: () => void;
  makerUsername?: string;
  playerEmail?: string;
  playerId: string;
  actionScore?: number | null;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center justify-between gap-2 p-3 hover:bg-muted/30 ${isDragging ? "bg-muted/40 opacity-80" : ""}`}
    >
      <button
        type="button"
        className="touch-none cursor-grab text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <button
        className="flex items-center gap-3 flex-1 text-left min-w-0"
        onClick={onPlay}
      >
        <span className="text-xs text-muted-foreground w-6 text-right">{idx + 1}</span>
        <span className="truncate">{name}</span>
        {actionScore != null && (() => {
          const g = getR90Grade(actionScore);
          return (
            <span
              className="inline-flex items-center justify-center min-w-[36px] px-1.5 py-[1px] rounded-full text-[10px] font-bold text-black shrink-0"
              style={{ backgroundColor: g.color }}
              title={`R90 ${actionScore.toFixed(2)} (${g.grade})`}
            >
              {actionScore.toFixed(2)}
            </span>
          );
        })()}
      </button>
      <AddToPlaylistButton
        playerId={playerId}
        playerEmail={playerEmail}
        makerUsername={makerUsername}
        clip={{ name, videoUrl }}
      />
      <Button size="sm" variant="ghost" onClick={onDownload} title="Download clip">
        <Download className="w-4 h-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={onRemove} title="Remove from playlist">
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

interface PlayerLite {
  id: string;
  name: string;
  position: string;
  image_url: string | null;
  club: string | null;
  club_logo: string | null;
  nationality: string | null;
  league: string | null;
}
interface PlaylistClip { id?: string; name: string; videoUrl: string; order?: number }
interface PlaylistRow {
  id: string;
  player_id: string;
  name: string;
  clips: PlaylistClip[];
  created_at: string;
  updated_at: string;
}
interface AnalysisRow {
  id: string;
  player_id: string;
  analysis_date: string;
  opponent: string | null;
  result: string | null;
  r90_score: number | null;
  minutes_played: number | null;
  club_logo_url?: string | null;
}
interface ActionRow {
  id: string;
  analysis_id: string;
  action_number: number;
  minute: number | string | null;
  action_score: number | null;
  action_type: string | null;
  action_description: string | null;
  notes: string | null;
  video_url: string | null;
  clip_id: string | null;
  is_first_half: boolean | null;
}

const sanitize = (s: string) => s.replace(/[^a-z0-9._\- ]/gi, "_").slice(0, 80);

const getActionScoreBg = (score: number | null | undefined): string => {
  if (score == null) return 'bg-muted';
  if (score >= 0.15) return 'bg-green-800';
  if (score >= 0.10) return 'bg-green-600';
  if (score >= 0.05) return 'bg-green-500';
  if (score > 0) return 'bg-lime-500';
  if (score === 0) return 'bg-yellow-500';
  if (score > -0.05) return 'bg-orange-500';
  if (score > -0.10) return 'bg-red-500';
  return 'bg-red-700';
};

const downloadOne = async (url: string, filename: string) => {
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.error(e);
    toast.error("Download failed");
  }
};

const downloadZip = async (
  clips: { name: string; videoUrl: string }[],
  zipName: string,
) => {
  if (clips.length === 0) return;
  const t = toast.loading(`Preparing ${clips.length} clips...`);
  try {
    const zip = new JSZip();
    for (let i = 0; i < clips.length; i++) {
      const c = clips[i];
      try {
        const res = await fetch(c.videoUrl);
        if (!res.ok) continue;
        const blob = await res.blob();
        const idx = String(i + 1).padStart(2, "0");
        zip.file(`${idx} ${sanitize(c.name)}.mp4`, blob);
      } catch (e) {
        console.warn("skip clip", c.name, e);
      }
    }
    const out = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(out);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitize(zipName)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Download ready", { id: t });
  } catch (e: any) {
    console.error(e);
    toast.error(e.message || "Zip failed", { id: t });
  }
};

const HighlightsPortal = () => {
  const { maker, loading: authLoading, signOut } = useHighlightMakerAuth();
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<PlayerLite[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistRow[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [actionClips, setActionClips] = useState<any[] | null>(null);
  const [actionPlayerOpen, setActionPlayerOpen] = useState(false);
  const [actionPlayerTitle, setActionPlayerTitle] = useState("");
  const [expandedPlaylists, setExpandedPlaylists] = useState<Set<string>>(new Set());
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [openPlaylistId, setOpenPlaylistId] = useState<string | null>(null);

  useEffect(() => {
    if (!maker) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("highlight-maker-data", {
          body: { username: maker.username },
        });
        if (error) throw error;
        if (cancelled) return;
        const d = data as any;
        setPlayers(d.players || []);
        setPlaylists((d.playlists || []).map((p: any) => ({
          ...p,
          clips: Array.isArray(p.clips) ? p.clips : [],
        })));
        setAnalyses(d.analyses || []);
        setActions(d.actions || []);
      } catch (e: any) {
        console.error(e);
        toast.error(e.message || "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [maker]);

  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === selectedPlayerId) || null,
    [players, selectedPlayerId],
  );

  const playerPlaylists = useMemo(() => {
    if (!selectedPlayerId) return [];
    return playlists
      .filter((p) => p.player_id === selectedPlayerId)
      .map((p) => ({
        ...p,
        clips: [...p.clips].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      }));
  }, [playlists, selectedPlayerId]);

  // Map videoUrl -> action_score for the selected player (from already-loaded actions)
  const scoreByVideoUrl = useMemo(() => {
    if (!selectedPlayerId) return {} as Record<string, number>;
    const analysisIds = new Set(
      analyses.filter((a) => a.player_id === selectedPlayerId).map((a) => a.id),
    );
    const map: Record<string, number> = {};
    actions.forEach((a) => {
      if (!a.video_url || a.action_score == null) return;
      if (!analysisIds.has(a.analysis_id)) return;
      const prev = map[a.video_url];
      if (prev == null || a.action_score > prev) map[a.video_url] = a.action_score;
    });
    return map;
  }, [actions, analyses, selectedPlayerId]);

  const playerReports = useMemo(() => {
    if (!selectedPlayerId) return [];
    return analyses
      .filter((a) => a.player_id === selectedPlayerId)
      .map((a) => {
        const reportActions = sortActionsByMinute(
          actions
            .filter((x) => x.analysis_id === a.id && x.video_url && (x.action_score ?? 0) > 0),
        );
        const grouped: Record<string, ActionRow[]> = {};
        reportActions.forEach((act) => {
          const key = (act.action_type || "Uncategorised").trim() || "Uncategorised";
          (grouped[key] ||= []).push(act);
        });
        // sort each category by action_score desc
        Object.keys(grouped).forEach((k) => {
          grouped[k].sort((x, y) => (y.action_score ?? 0) - (x.action_score ?? 0));
        });
        return { analysis: a, grouped, total: reportActions.length };
      })
      .filter((r) => r.total > 0);
  }, [analyses, actions, selectedPlayerId]);

  const openPlaylistReel = (
    clips: { id?: string; name: string; videoUrl: string }[],
    title: string,
    startIdx = 0,
    playlistId: string | null = null,
  ) => {
    const list = clips
      .filter((c) => !!c.videoUrl)
      .map((c, i) => ({
        id: c.id ?? `c-${i}`,
        action_number: i + 1,
        action_type: 'Playlist',
        action_description: c.name,
        video_url: c.videoUrl,
        minute: 0,
        action_score: scoreByVideoUrl[c.videoUrl] ?? null,
      }));
    if (list.length === 0) { toast.error("No playable clips"); return; }
    const safeIdx = Math.max(0, Math.min(startIdx, list.length - 1));
    const rotated = [...list.slice(safeIdx), ...list.slice(0, safeIdx)];
    setActionClips(rotated);
    setActionPlayerTitle(title);
    setActionPlayerOpen(true);
    setOpenPlaylistId(playlistId);
  };

  const openActionReel = (acts: ActionRow[], title: string, startIdx = 0) => {
    const list = acts
      .filter((a) => !!a.video_url)
      .map((a) => ({
        id: a.id,
        action_number: a.action_number,
        action_type: a.action_type || 'Action',
        action_description: a.action_description || `Action #${a.action_number}`,
        video_url: a.video_url!,
        minute: typeof a.minute === 'number' ? a.minute : Number(a.minute) || 0,
        notes: a.notes,
      }));
    if (list.length === 0) { toast.error("No playable clips"); return; }
    const safeIdx = Math.max(0, Math.min(startIdx, list.length - 1));
    const rotated = [...list.slice(safeIdx), ...list.slice(0, safeIdx)];
    setActionClips(rotated);
    setActionPlayerTitle(title);
    setActionPlayerOpen(true);
  };

  const togglePlaylist = (id: string) =>
    setExpandedPlaylists((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const reorderClips = async (pl: PlaylistRow, fromId: string, toId: string) => {
    if (!maker) return;
    const ids = pl.clips.map((c, i) => c.id || `idx-${i}`);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0 || from === to) return;
    const next = arrayMove(pl.clips, from, to);
    setPlaylists((prev) => prev.map((p) => (p.id === pl.id ? { ...p, clips: next.map((c, i) => ({ ...c, order: i })) } : p)));
    const { data, error } = await supabase.functions.invoke("playlist-manage", {
      body: { action: "reorder", playlistId: pl.id, makerUsername: maker.username, clips: next },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Reorder failed");
    }
  };

  const removeClipFromPlaylist = async (pl: PlaylistRow, clipIndex: number) => {
    if (!maker) return;
    if (!window.confirm("Remove this clip from the playlist?")) return;
    setPlaylists((prev) => prev.map((p) => (p.id === pl.id ? { ...p, clips: p.clips.filter((_, i) => i !== clipIndex) } : p)));
    const { data, error } = await supabase.functions.invoke("playlist-manage", {
      body: { action: "removeClip", playlistId: pl.id, makerUsername: maker.username, clipIndex },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Remove failed");
    }
  };

  const renamePlaylist = async (pl: PlaylistRow) => {
    if (!maker) return;
    const next = window.prompt("Rename playlist", pl.name);
    if (!next || !next.trim() || next.trim() === pl.name) return;
    const { data, error } = await supabase.functions.invoke('playlist-manage', {
      body: { action: 'rename', playlistId: pl.id, makerUsername: maker.username, name: next.trim() },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Rename failed");
      return;
    }
    const newName = next.trim();
    setPlaylists(prev => prev.map(p => p.id === pl.id ? { ...p, name: newName } : p));
    toast.success("Playlist renamed");
  };

  const toggleReport = (id: string) =>
    setExpandedReports((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  if (authLoading || !maker) return <PageLoading />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 sticky top-0 z-30 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {selectedPlayer && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPlayerId(null)}
                className="shrink-0"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Players
              </Button>
            )}
            <div className="flex items-center gap-2 min-w-0">
              <Film className="w-5 h-5 text-primary shrink-0" />
              <span className="font-semibold truncate">
                {selectedPlayer ? selectedPlayer.name : "Highlights Portal"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {maker.display_name}
            </span>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-1" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <PageLoading />
        ) : !selectedPlayer ? (
          <div>
            <h2 className="text-xl font-semibold mb-4">Your players</h2>
            {players.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                No players assigned yet. Contact the agency.
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {players.map((p) => (
                  <Card
                    key={p.id}
                    className="p-4 cursor-pointer hover:border-primary transition-colors"
                    onClick={() => setSelectedPlayerId(p.id)}
                  >
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-3">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          {p.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>{p.position}</span>
                      {p.club && (
                        <>
                          <span>•</span>
                          <span className="truncate">{p.club}</span>
                        </>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Tabs defaultValue="playlists" className="w-full">
            <TabsList>
              <TabsTrigger value="playlists">Playlists</TabsTrigger>
              <TabsTrigger value="reports">Performance Reports</TabsTrigger>
              <TabsTrigger value="videoreports">Video Reports</TabsTrigger>
              <TabsTrigger value="uploads">Uploads</TabsTrigger>
            </TabsList>

            <TabsContent value="playlists" className="mt-4 space-y-3">
              {playerPlaylists.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  No favourited playlists for this player yet. Ask staff to star playlists that should appear here.
                </Card>
              ) : (
                playerPlaylists.map((pl) => {
                  const isOpen = expandedPlaylists.has(pl.id);
                  return (
                    <Card key={pl.id} className="overflow-hidden">
                      <div className="flex items-center justify-between p-3 gap-2">
                        <button
                          className="flex items-center gap-2 flex-1 text-left"
                          onClick={() => togglePlaylist(pl.id)}
                        >
                          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <Star className="w-4 h-4 fill-[#C6A332] text-[#C6A332]" />
                          <span className="font-semibold">{pl.name}</span>
                          <Badge variant="secondary">{pl.clips.length}</Badge>
                        </button>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPlaylistReel(pl.clips, pl.name, 0, pl.id)}
                            disabled={pl.clips.length === 0}
                          >
                            <Play className="w-4 h-4 mr-1" /> Play all
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              downloadZip(
                                pl.clips,
                                `${selectedPlayer.name} - ${pl.name}`,
                              )
                            }
                            disabled={pl.clips.length === 0}
                          >
                            <FolderDown className="w-4 h-4 mr-1" /> ZIP
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => renamePlaylist(pl)}
                            title="Rename playlist"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {isOpen && (
                        <div className="border-t border-border divide-y divide-border">
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e: DragEndEvent) => {
                              if (!e.over || e.active.id === e.over.id) return;
                              reorderClips(pl, String(e.active.id), String(e.over.id));
                            }}
                          >
                            <SortableContext
                              items={pl.clips.map((c, i) => c.id || `idx-${i}`)}
                              strategy={verticalListSortingStrategy}
                            >
                              {pl.clips.map((c, idx) => {
                                const rowId = c.id || `idx-${idx}`;
                                return (
                                  <SortableClipRow
                                    key={rowId}
                                    id={rowId}
                                    idx={idx}
                                    name={c.name}
                                    videoUrl={c.videoUrl}
                                    playerId={selectedPlayer.id}
                                    makerUsername={maker.username}
                                    onPlay={() => openPlaylistReel(pl.clips, pl.name, idx, pl.id)}
                                    onDownload={() =>
                                      downloadOne(
                                        c.videoUrl,
                                        `${sanitize(`${selectedPlayer.name} - ${pl.name} - ${String(idx + 1).padStart(2, "0")} ${c.name}`)}.mp4`,
                                      )
                                    }
                                    onRemove={() => removeClipFromPlaylist(pl, idx)}
                                  />
                                );
                              })}
                            </SortableContext>
                          </DndContext>
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="reports" className="mt-4 space-y-3">
              {playerReports.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  No performance reports with positive Action Score clips yet.
                </Card>
              ) : (
                playerReports.map(({ analysis, grouped, total }) => {
                  const isOpen = expandedReports.has(analysis.id);
                  const dateLabel = analysis.analysis_date
                    ? format(new Date(analysis.analysis_date), "d MMMM yyyy")
                    : "";
                  const allActs = Object.values(grouped).flat();
                  const allUrls = allActs.map((a) => ({
                    name: `${a.action_type || "Action"} - ${a.action_description || `#${a.action_number}`}`,
                    videoUrl: a.video_url!,
                  }));
                  const title = `${selectedPlayer.name} vs ${analysis.opponent || "Unknown"} - ${dateLabel}`;
                  return (
                    <Card key={analysis.id} className="overflow-hidden">
                      <button
                        type="button"
                        className="w-full text-left p-4 flex items-center gap-4 hover:bg-muted/20 transition-colors"
                        onClick={() => toggleReport(analysis.id)}
                      >
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-md bg-black/40 flex items-center justify-center shrink-0 overflow-hidden border border-border">
                          {analysis.club_logo_url ? (
                            <img
                              src={analysis.club_logo_url}
                              alt={analysis.opponent || "Opponent"}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Film className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-base md:text-lg font-semibold truncate">
                            vs {analysis.opponent || "Unknown"}
                            {analysis.result ? ` (${analysis.result})` : ""}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {dateLabel}
                            {analysis.r90_score != null ? ` • R90 ${analysis.r90_score}` : ""}
                            {` • ${total} positive action${total === 1 ? "" : "s"}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openActionReel(allActs, title, 0)}
                          >
                            <Play className="w-4 h-4 mr-1" /> Play all
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadZip(allUrls, `${title} - Report`)}
                          >
                            <FolderDown className="w-4 h-4 mr-1" /> ZIP
                          </Button>
                          {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </div>
                      </button>
                      {isOpen && (
                        <div className="border-t border-border p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {allActs.map((a) => {
                            const idx = allActs.indexOf(a);
                            return (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => openActionReel(allActs, title, idx)}
                                className={`${getActionScoreBg(a.action_score)} text-white text-left p-3 rounded-md hover:opacity-90 transition-opacity flex items-center gap-3 group relative`}
                              >
                                <div className="text-lg font-mono font-bold w-14 shrink-0 text-center bg-black/30 rounded py-1">
                                  {a.action_score != null ? a.action_score.toFixed(2) : "—"}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold truncate">
                                    {a.action_type || "Action"}
                                  </div>
                                  <div className="text-xs opacity-90 truncate">
                                    {a.action_description || `#${a.action_number}`}
                                  </div>
                                </div>
                                <Play className="w-5 h-5 opacity-70 group-hover:opacity-100 shrink-0" />
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadOne(
                                      a.video_url!,
                                      `${sanitize(`${title} - ${a.action_type} - ${a.action_description || a.action_number}`)}.mp4`,
                                    );
                                  }}
                                  className="absolute top-1 right-1 p-1 rounded hover:bg-black/30"
                                  title="Download clip"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </span>
                                <span
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute top-1 left-1"
                                >
                                  <AddToPlaylistButton
                                    playerId={selectedPlayer.id}
                                    makerUsername={maker.username}
                                    clip={{
                                      name: `${a.action_type || "Action"} vs ${analysis.opponent || "Unknown"}`,
                                      videoUrl: a.video_url!,
                                    }}
                                    className="h-7 w-7 bg-black/30 hover:bg-black/60 text-white"
                                  />
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="videoreports" className="mt-4">
              <AnalysisVideoReports
                analyses={analyses
                  .filter((a) => a.player_id === selectedPlayerId)
                  .map((a) => ({
                    id: a.id,
                    analysis_date: a.analysis_date,
                    opponent: a.opponent,
                    result: a.result,
                    minutes_played: a.minutes_played,
                  }))}
                playerId={selectedPlayerId!}
                embedded
              />
            </TabsContent>

            <TabsContent value="uploads" className="mt-4">
              <UploadsTab
                playerId={selectedPlayer.id}
                makerUsername={maker.username}
                onPlay={(c) => openPlaylistReel([c], c.name, 0)}
              />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <ClippedActionsPlayer
        open={actionPlayerOpen}
        onOpenChange={(o) => { setActionPlayerOpen(o); if (!o) { setActionClips(null); setOpenPlaylistId(null); } }}
        clips={actionClips || []}
        title={actionPlayerTitle}
        playerId={selectedPlayerId || undefined}
        mode={openPlaylistId ? 'playlist' : 'report'}
        onReorderClip={openPlaylistId ? (fromIdx, toPos) => {
          const pl = playlists.find(p => p.id === openPlaylistId);
          if (!pl) return;
          const ids = pl.clips.map((c, i) => c.id || `idx-${i}`);
          const fromId = ids[fromIdx];
          const toId = ids[toPos - 1];
          if (fromId && toId) {
            reorderClips(pl, fromId, toId);
            // rebuild displayed clips
            const next = arrayMove(pl.clips, fromIdx, toPos - 1);
            setActionClips(next.map((c, i) => ({
              id: c.id ?? `c-${i}`,
              action_number: i + 1,
              action_type: 'Playlist',
              action_description: c.name,
              video_url: c.videoUrl,
              minute: 0,
            })));
          }
        } : undefined}
        onRemoveClip={openPlaylistId ? (idx) => {
          const pl = playlists.find(p => p.id === openPlaylistId);
          if (pl) {
            removeClipFromPlaylist(pl, idx);
            setActionClips((prev) => (prev || []).filter((_, i) => i !== idx));
          }
        } : undefined}
      />
    </div>
  );
};

export default HighlightsPortal;