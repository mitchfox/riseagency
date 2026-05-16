import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHighlightMakerAuth } from "@/hooks/useHighlightMakerAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Film, LogOut, Download, Play, ArrowLeft, ChevronDown, ChevronRight, FolderDown,
} from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { PageLoading } from "@/components/LoadingSpinner";
import { HighlightReelPlayer } from "@/components/staff/HighlightReelPlayer";
import { sortActionsByMinute } from "@/lib/actionSorting";
import { format } from "date-fns";

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
  const [reelClips, setReelClips] = useState<{ id: string; title: string; videoUrl: string; actionScore?: number | null }[] | null>(null);
  const [reelTitle, setReelTitle] = useState("");
  const [reelIndex, setReelIndex] = useState(0);
  const [expandedPlaylists, setExpandedPlaylists] = useState<Set<string>>(new Set());
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());

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

  const openReel = (
    clips: { id?: string | null; name: string; videoUrl: string; actionScore?: number | null }[],
    title: string,
    startIdx = 0,
  ) => {
    const list = clips
      .filter((c) => !!c.videoUrl)
      .map((c, i) => ({
        id: c.id ?? `c-${i}`,
        title: c.name,
        videoUrl: c.videoUrl,
        actionScore: c.actionScore ?? null,
      }));
    if (list.length === 0) {
      toast.error("No playable clips");
      return;
    }
    const safeIdx = Math.max(0, Math.min(startIdx, list.length - 1));
    const rotated = [...list.slice(safeIdx), ...list.slice(0, safeIdx)];
    setReelClips(rotated);
    setReelTitle(title);
    setReelIndex(startIdx);
  };

  const togglePlaylist = (id: string) =>
    setExpandedPlaylists((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

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
              <TabsTrigger value="reports">Performance reports</TabsTrigger>
            </TabsList>

            <TabsContent value="playlists" className="mt-4 space-y-3">
              {playerPlaylists.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  No playlists for this player yet.
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
                          <span className="font-semibold">{pl.name}</span>
                          <Badge variant="secondary">{pl.clips.length}</Badge>
                        </button>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openReel(pl.clips, pl.name, 0)}
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
                        </div>
                      </div>
                      {isOpen && (
                        <div className="border-t border-border divide-y divide-border">
                          {pl.clips.map((c, idx) => (
                            <div
                              key={`${pl.id}-${idx}`}
                              className="flex items-center justify-between gap-2 p-3 hover:bg-muted/30"
                            >
                              <button
                                className="flex items-center gap-3 flex-1 text-left min-w-0"
                                onClick={() => openReel(pl.clips, pl.name, idx)}
                              >
                                <span className="text-xs text-muted-foreground w-6 text-right">
                                  {idx + 1}
                                </span>
                                <span className="truncate">{c.name}</span>
                              </button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  downloadOne(
                                    c.videoUrl,
                                    `${sanitize(`${selectedPlayer.name} - ${pl.name} - ${String(idx + 1).padStart(2, "0")} ${c.name}`)}.mp4`,
                                  )
                                }
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
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
                    ? format(new Date(analysis.analysis_date), "d MMM yyyy")
                    : "";
                  const allClips = Object.values(grouped).flat().map((a) => ({
                    id: a.id,
                    name: `${a.action_type || "Action"} - ${a.action_description || `#${a.action_number}`}`,
                    videoUrl: a.video_url!,
                    actionScore: a.action_score,
                  }));
                  return (
                    <Card key={analysis.id} className="overflow-hidden">
                      <div className="flex items-center justify-between p-3 gap-2">
                        <button
                          className="flex items-center gap-2 flex-1 text-left min-w-0"
                          onClick={() => toggleReport(analysis.id)}
                        >
                          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <div className="min-w-0">
                            <div className="font-semibold truncate">
                              {dateLabel}
                              {analysis.opponent ? ` • ${analysis.opponent}` : ""}
                              {analysis.result ? ` • ${analysis.result}` : ""}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {total} positive action clip{total === 1 ? "" : "s"}
                              {analysis.r90_score != null ? ` • R90 ${analysis.r90_score}` : ""}
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openReel(allClips, `${selectedPlayer.name} - ${dateLabel}`, 0)}
                          >
                            <Play className="w-4 h-4 mr-1" /> Play all
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadZip(allClips, `${selectedPlayer.name} - ${dateLabel} - Report`)}
                          >
                            <FolderDown className="w-4 h-4 mr-1" /> ZIP
                          </Button>
                        </div>
                      </div>
                      {isOpen && (
                        <div className="border-t border-border p-3 space-y-4">
                          {Object.entries(grouped).map(([cat, acts]) => {
                            const catClips = acts.map((a) => ({
                              id: a.id,
                              name: a.action_description || `Action #${a.action_number}`,
                              videoUrl: a.video_url!,
                              actionScore: a.action_score,
                            }));
                            return (
                              <div key={cat}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold">{cat}</span>
                                    <Badge variant="secondary">{acts.length}</Badge>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openReel(catClips, `${cat} - ${dateLabel}`, 0)}
                                    >
                                      <Play className="w-4 h-4 mr-1" /> Play
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        downloadZip(
                                          catClips,
                                          `${selectedPlayer.name} - ${dateLabel} - ${cat}`,
                                        )
                                      }
                                    >
                                      <FolderDown className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="divide-y divide-border rounded-md border border-border">
                                  {acts.map((a, idx) => (
                                    <div
                                      key={a.id}
                                      className="flex items-center justify-between gap-2 p-2 hover:bg-muted/30"
                                    >
                                      <button
                                        className="flex items-center gap-3 flex-1 text-left min-w-0"
                                        onClick={() => openReel(catClips, `${cat} - ${dateLabel}`, idx)}
                                      >
                                        <span className="text-xs font-mono text-muted-foreground w-12 shrink-0">
                                          {a.action_score != null ? a.action_score.toFixed(2) : "—"}
                                        </span>
                                        <span className="truncate text-sm">
                                          {a.action_description || `Action #${a.action_number}`}
                                        </span>
                                      </button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          downloadOne(
                                            a.video_url!,
                                            `${sanitize(
                                              `${selectedPlayer.name} - ${dateLabel} - ${cat} - ${a.action_description || a.action_number}`,
                                            )}.mp4`,
                                          )
                                        }
                                      >
                                        <Download className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>

      {reelClips && (
        <HighlightReelPlayer
          clips={reelClips}
          projectName={reelTitle}
          isOpen={true}
          onClose={() => setReelClips(null)}
        />
      )}
    </div>
  );
};

export default HighlightsPortal;