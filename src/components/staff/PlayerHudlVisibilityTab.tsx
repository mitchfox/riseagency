import { useEffect, useMemo, useState } from "react";
import { Loader2, GripVertical, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type ActionRow = {
  id: string;
  action_type: string | null;
  action_score: number | null;
  video_url: string | null;
  minute: number | null;
  analysis_id: string;
};

interface Props { playerId: string; }

const SortableItem = ({ id, children }: { id: string; children: React.ReactNode }) => {
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

const titleCase = (s: string) => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export const PlayerHudlVisibilityTab = ({ playerId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actions, setActions] = useState<ActionRow[]>([]);
  // visibility per video_url
  const [visibleClips, setVisibleClips] = useState<Record<string, boolean>>({});
  // ordering per category
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [clipsByCategory, setClipsByCategory] = useState<Record<string, string[]>>({});
  const [visibleCategories, setVisibleCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);

      // get player's analyses, then their actions (mirrors PlayerDetail logic)
      const { data: analyses } = await supabase
        .from('player_analysis')
        .select('id')
        .eq('player_id', playerId)
        .order('analysis_date', { ascending: false });

      const ids = (analyses || []).slice(0, 10).map((a: any) => a.id);
      let actionData: ActionRow[] = [];
      if (ids.length > 0) {
        const { data } = await supabase
          .from('performance_report_actions')
          .select('id, action_type, action_score, video_url, minute, analysis_id')
          .in('analysis_id', ids)
          .not('video_url', 'is', null)
          .gt('action_score', 0)
          .order('action_score', { ascending: false })
          .limit(50);
        actionData = (data || []) as any;
      }

      const { data: visRows } = await (supabase as any)
        .from('player_hudl_visibility')
        .select('clip_video_url, visible, sort_order, playlist_id')
        .eq('player_id', playerId);

      if (cancelled) return;

      // Build categories: Best Actions (>= 0.05) + per action_type
      const typeMap: Record<string, ActionRow[]> = {};
      actionData.forEach(a => {
        if (!a.video_url) return;
        const types = a.action_type?.includes(',')
          ? a.action_type.split(',').map(t => t.trim())
          : [a.action_type || 'Other'];
        types.forEach(type => {
          const t = type || 'Other';
          if (!typeMap[t]) typeMap[t] = [];
          typeMap[t].push(a);
        });
      });

      const bestActions = actionData.filter(a => (a.action_score || 0) >= 0.05);
      const sortedTypes = Object.entries(typeMap)
        .map(([type, arr]) => ({
          type,
          avg: arr.reduce((s, x) => s + (x.action_score || 0), 0) / arr.length,
          actions: arr,
        }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 4);

      const cats: Record<string, ActionRow[]> = {};
      if (bestActions.length > 0) cats['Best Actions'] = bestActions;
      sortedTypes.forEach(({ type, actions: arr }) => {
        cats[type] = [...arr].sort((a, b) => (b.action_score || 0) - (a.action_score || 0));
      });

      const categoryNames = Object.keys(cats);

      // Apply saved ordering/visibility
      const visMap: Record<string, boolean> = {};
      const catVis: Record<string, boolean> = {};
      const catOrderHints: Record<string, number> = {};
      const clipOrderHints: Record<string, number> = {};
      (visRows || []).forEach((r: any) => {
        if (r.clip_video_url) {
          visMap[r.clip_video_url] = !!r.visible;
          clipOrderHints[r.clip_video_url] = r.sort_order ?? 0;
        } else if (r.playlist_id) {
          catVis[r.playlist_id] = !!r.visible;
          catOrderHints[r.playlist_id] = r.sort_order ?? 0;
        }
      });

      const orderedCats = [...categoryNames].sort((a, b) => {
        const av = catOrderHints[a] ?? categoryNames.indexOf(a);
        const bv = catOrderHints[b] ?? categoryNames.indexOf(b);
        return av - bv;
      });

      const clipsCat: Record<string, string[]> = {};
      const clipVis: Record<string, boolean> = {};
      orderedCats.forEach(cat => {
        const urls = Array.from(new Set(cats[cat].map(a => a.video_url!).filter(Boolean)));
        const ordered = [...urls].sort((a, b) => {
          const av = clipOrderHints[a] ?? urls.indexOf(a);
          const bv = clipOrderHints[b] ?? urls.indexOf(b);
          return av - bv;
        });
        clipsCat[cat] = ordered;
        ordered.forEach(u => {
          clipVis[u] = visMap[u] ?? true;
        });
      });
      const cVis: Record<string, boolean> = {};
      orderedCats.forEach(c => { cVis[c] = catVis[c] ?? true; });

      setActions(actionData);
      setCategoryOrder(orderedCats);
      setClipsByCategory(clipsCat);
      setVisibleClips(clipVis);
      setVisibleCategories(cVis);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [playerId]);

  const sensors = useSensors(useSensor(PointerSensor));

  const onCategoryDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    setCategoryOrder(prev => {
      const oi = prev.indexOf(e.active.id as string);
      const ni = prev.indexOf(e.over!.id as string);
      if (oi < 0 || ni < 0) return prev;
      return arrayMove(prev, oi, ni);
    });
  };

  const onClipDragEnd = (cat: string) => (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    setClipsByCategory(prev => {
      const list = prev[cat] || [];
      const oi = list.indexOf(e.active.id as string);
      const ni = list.indexOf(e.over!.id as string);
      if (oi < 0 || ni < 0) return prev;
      return { ...prev, [cat]: arrayMove(list, oi, ni) };
    });
  };

  const scoresByUrl = useMemo(() => {
    const m: Record<string, number> = {};
    actions.forEach(a => {
      if (a.video_url) {
        const cur = m[a.video_url] || 0;
        if ((a.action_score || 0) > cur) m[a.video_url] = a.action_score || 0;
      }
    });
    return m;
  }, [actions]);

  const labelByUrl = useMemo(() => {
    const m: Record<string, string> = {};
    actions.forEach(a => {
      if (a.video_url && !m[a.video_url]) {
        const minute = typeof a.minute === 'number' ? `${a.minute}'` : '';
        m[a.video_url] = [titleCase((a.action_type || '').split(',')[0] || 'Clip'), minute].filter(Boolean).join(' · ');
      }
    });
    return m;
  }, [actions]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await (supabase as any).from('player_hudl_visibility').delete().eq('player_id', playerId);
      const rows: any[] = [];
      categoryOrder.forEach((cat, ci) => {
        // store category-level visibility/order using playlist_id field as the category name
        rows.push({
          player_id: playerId,
          playlist_id: cat,
          clip_id: null,
          clip_video_url: null,
          visible: visibleCategories[cat] ?? true,
          sort_order: ci,
        });
        (clipsByCategory[cat] || []).forEach((url, idx) => {
          rows.push({
            player_id: playerId,
            playlist_id: cat,
            clip_id: url,
            clip_video_url: url,
            visible: visibleClips[url] ?? true,
            sort_order: idx,
          });
        });
      });
      if (rows.length > 0) {
        const { error } = await (supabase as any).from('player_hudl_visibility').insert(rows);
        if (error) throw error;
      }
      toast.success('Hudl visibility saved');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading clips…</div>;

  if (categoryOrder.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">No video report actions for this player yet. Add action clips with R90 scores in performance reports.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Reorder/hide categories and individual clips. R90 action scores shown.</p>
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save'}</Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onCategoryDragEnd}>
        <SortableContext items={categoryOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {categoryOrder.map(cat => {
              const clipUrls = clipsByCategory[cat] || [];
              return (
                <SortableItem key={cat} id={cat}>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Switch checked={visibleCategories[cat] ?? true} onCheckedChange={(v) => setVisibleCategories(p => ({ ...p, [cat]: v }))} />
                        <span className="font-semibold">{titleCase(cat)}</span>
                        <span className="text-xs text-muted-foreground">({clipUrls.length})</span>
                      </div>
                    </div>
                    {clipUrls.length > 0 && (
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onClipDragEnd(cat)}>
                        <SortableContext items={clipUrls} strategy={verticalListSortingStrategy}>
                          <div className="space-y-1.5 pl-2">
                            {clipUrls.map(url => {
                              const score = scoresByUrl[url];
                              return (
                                <SortableItem key={`${cat}::${url}`} id={url}>
                                  <Switch checked={visibleClips[url] ?? true} onCheckedChange={(v) => setVisibleClips(p => ({ ...p, [url]: v }))} />
                                  <span className="flex-1 truncate text-sm">{labelByUrl[url] || url.split('/').pop()}</span>
                                  {typeof score === 'number' && (
                                    <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">R90 {score.toFixed(2)}</span>
                                  )}
                                </SortableItem>
                              );
                            })}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                </SortableItem>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default PlayerHudlVisibilityTab;
