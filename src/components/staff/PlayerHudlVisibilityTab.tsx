import { useEffect, useMemo, useState } from "react";
import { Loader2, GripVertical, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Clip = { id?: string; name: string; videoUrl: string; order?: number };
type Playlist = { id: string; name: string; clips: Clip[] };
type Visibility = { playlist_id: string; clip_id: string | null; clip_video_url: string | null; visible: boolean; sort_order: number };

interface Props {
  playerId: string;
}

const SortableClip = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded border border-border bg-card p-2">
      <button type="button" {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground" aria-label="Reorder">
        <GripVertical className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
};

export const PlayerHudlVisibilityTab = ({ playerId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [visiblePlaylists, setVisiblePlaylists] = useState<Record<string, boolean>>({});
  const [clipState, setClipState] = useState<Record<string, { visible: boolean; order: number }>>({});
  const [playlistOrder, setPlaylistOrder] = useState<Record<string, number>>({});
  const [clipOrderByPlaylist, setClipOrderByPlaylist] = useState<Record<string, string[]>>({});
  const [actionScores, setActionScores] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: pl }, { data: vis }, { data: actions }] = await Promise.all([
        supabase.from("playlists").select("id, name, clips").eq("player_id", playerId).order("created_at", { ascending: false }),
        (supabase as any).from("player_hudl_visibility").select("playlist_id, clip_id, clip_video_url, visible, sort_order").eq("player_id", playerId),
        supabase.from("performance_report_actions").select("video_url, action_score").not("video_url", "is", null),
      ]);
      if (cancelled) return;

      const lists: Playlist[] = (pl || []).map((p: any) => ({ id: p.id, name: p.name, clips: (p.clips as Clip[]) || [] }));
      setPlaylists(lists);

      const scoreMap: Record<string, number> = {};
      (actions || []).forEach((a: any) => {
        if (a.video_url) {
          const cur = scoreMap[a.video_url] || 0;
          if ((a.action_score || 0) > cur) scoreMap[a.video_url] = a.action_score || 0;
        }
      });
      setActionScores(scoreMap);

      const visRows = (vis || []) as Visibility[];
      const plVisible: Record<string, boolean> = {};
      const plOrder: Record<string, number> = {};
      const clipMap: Record<string, { visible: boolean; order: number }> = {};
      const clipOrderMap: Record<string, string[]> = {};

      lists.forEach((p, idx) => {
        const playlistRow = visRows.find(v => v.playlist_id === p.id && !v.clip_id && !v.clip_video_url);
        plVisible[p.id] = playlistRow ? playlistRow.visible : true;
        plOrder[p.id] = playlistRow?.sort_order ?? idx;

        const clipKeys = p.clips.map(c => c.id || c.videoUrl);
        const orderedKeys = [...clipKeys].sort((a, b) => {
          const ra = visRows.find(v => v.playlist_id === p.id && (v.clip_id === a || v.clip_video_url === a));
          const rb = visRows.find(v => v.playlist_id === p.id && (v.clip_id === b || v.clip_video_url === b));
          return (ra?.sort_order ?? clipKeys.indexOf(a)) - (rb?.sort_order ?? clipKeys.indexOf(b));
        });
        clipOrderMap[p.id] = orderedKeys;

        p.clips.forEach((c, ci) => {
          const key = `${p.id}::${c.id || c.videoUrl}`;
          const row = visRows.find(v => v.playlist_id === p.id && (v.clip_id === (c.id || c.videoUrl) || v.clip_video_url === c.videoUrl));
          clipMap[key] = { visible: row ? row.visible : true, order: row?.sort_order ?? ci };
        });
      });

      setVisiblePlaylists(plVisible);
      setPlaylistOrder(plOrder);
      setClipState(clipMap);
      setClipOrderByPlaylist(clipOrderMap);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [playerId]);

  const sensors = useSensors(useSensor(PointerSensor));

  const onClipDragEnd = (playlistId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setClipOrderByPlaylist(prev => {
      const list = prev[playlistId] || [];
      const oldIndex = list.indexOf(active.id as string);
      const newIndex = list.indexOf(over.id as string);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return { ...prev, [playlistId]: arrayMove(list, oldIndex, newIndex) };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Replace all rows for this player
      await (supabase as any).from("player_hudl_visibility").delete().eq("player_id", playerId);

      const rows: any[] = [];
      playlists.forEach((p) => {
        rows.push({
          player_id: playerId,
          playlist_id: p.id,
          clip_id: null,
          clip_video_url: null,
          visible: visiblePlaylists[p.id] ?? true,
          sort_order: playlistOrder[p.id] ?? 0,
        });
        const order = clipOrderByPlaylist[p.id] || p.clips.map(c => c.id || c.videoUrl);
        order.forEach((key, idx) => {
          const clip = p.clips.find(c => (c.id || c.videoUrl) === key);
          if (!clip) return;
          const cs = clipState[`${p.id}::${key}`] || { visible: true, order: idx };
          rows.push({
            player_id: playerId,
            playlist_id: p.id,
            clip_id: clip.id || clip.videoUrl,
            clip_video_url: clip.videoUrl,
            visible: cs.visible,
            sort_order: idx,
          });
        });
      });

      if (rows.length > 0) {
        const { error } = await (supabase as any).from("player_hudl_visibility").insert(rows);
        if (error) throw error;
      }
      toast.success("Hudl visibility saved");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading playlists…</div>;

  if (playlists.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">No Hudl playlists for this player yet. Create them from the Highlights tab.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Toggle which playlists and clips appear on the public Stars profile, and drag clips to reorder them.</p>
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save"}</Button>
      </div>
      <div className="space-y-4">
        {playlists.map((p) => {
          const order = clipOrderByPlaylist[p.id] || p.clips.map(c => c.id || c.videoUrl);
          return (
            <div key={p.id} className="rounded-md border border-border bg-card/40 p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Switch checked={visiblePlaylists[p.id] ?? true} onCheckedChange={(v) => setVisiblePlaylists(prev => ({ ...prev, [p.id]: v }))} />
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-xs text-muted-foreground">({p.clips.length} clips)</span>
                </div>
                <span className="text-xs text-muted-foreground">{(visiblePlaylists[p.id] ?? true) ? "Visible on Stars" : "Hidden"}</span>
              </div>
              {p.clips.length > 0 && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onClipDragEnd(p.id)}>
                  <SortableContext items={order} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1.5">
                      {order.map((key) => {
                        const clip = p.clips.find(c => (c.id || c.videoUrl) === key);
                        if (!clip) return null;
                        const stateKey = `${p.id}::${key}`;
                        const cs = clipState[stateKey] || { visible: true, order: 0 };
                        const score = actionScores[clip.videoUrl];
                        return (
                          <SortableClip key={key} id={key}>
                            <Switch
                              checked={cs.visible}
                              onCheckedChange={(v) => setClipState(prev => ({ ...prev, [stateKey]: { ...cs, visible: v } }))}
                            />
                            <span className="flex-1 truncate text-sm">{clip.name}</span>
                            {typeof score === "number" && score > 0 && (
                              <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{score.toFixed(2)}</span>
                            )}
                          </SortableClip>
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerHudlVisibilityTab;