import { type MouseEvent, useEffect, useMemo, useState } from "react";
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

// Normalise action types so "Flick-on", "flick on", "Flick On" all map to the same key.
export const normaliseActionKey = (raw: string): string => {
  return (raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '_');
};

const prettyLabelFromKey = (key: string): string =>
  titleCase(key.replace(/_/g, ' '));

export const PlayerHudlVisibilityTab = ({ playerId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actions, setActions] = useState<ActionRow[]>([]);
  // visibility per video_url
  const [visibleClips, setVisibleClips] = useState<Record<string, boolean>>({});
  // ordering per category (stored by normalised key)
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [clipsByCategory, setClipsByCategory] = useState<Record<string, string[]>>({});
  const [visibleCategories, setVisibleCategories] = useState<Record<string, boolean>>({});
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);

      // Get ALL of the player's analyses (no slice), then all their clipped actions with positive R90.
      const { data: analyses } = await supabase
        .from('player_analysis')
        .select('id')
        .eq('player_id', playerId)
        .order('analysis_date', { ascending: false });

      const ids = (analyses || []).map((a: any) => a.id);
      let actionData: ActionRow[] = [];
      if (ids.length > 0) {
        // Page through to bypass the 1000-row default limit
        const pageSize = 1000;
        let from = 0;
        while (true) {
          const { data, error } = await supabase
            .from('performance_report_actions')
            .select('id, action_type, action_score, video_url, minute, analysis_id')
            .in('analysis_id', ids)
            .not('video_url', 'is', null)
            .gt('action_score', 0)
            .order('action_score', { ascending: false })
            .range(from, from + pageSize - 1);
          if (error) break;
          const chunk = (data || []) as any as ActionRow[];
          actionData.push(...chunk);
          if (chunk.length < pageSize) break;
          from += pageSize;
        }
      }

      const { data: visRows } = await (supabase as any)
        .from('player_hudl_visibility')
        .select('clip_video_url, visible, sort_order, playlist_id, playlist_key')
        .eq('player_id', playerId);

      if (cancelled) return;

      // Build categories: "Best Actions" (>= 0.05) + per normalised action_type.
      // Merge variant labels (e.g. "Flick-on" / "flick on") under one normalised key.
      const typeMap: Record<string, ActionRow[]> = {};
      const labelMap: Record<string, string> = {};
      actionData.forEach(a => {
        if (!a.video_url) return;
        const parts = a.action_type?.includes(',')
          ? a.action_type.split(',').map(t => t.trim()).filter(Boolean)
          : [a.action_type || 'Other'];
        parts.forEach(rawType => {
          const key = normaliseActionKey(rawType || 'other');
          if (!typeMap[key]) typeMap[key] = [];
          typeMap[key].push(a);
          if (!labelMap[key]) labelMap[key] = prettyLabelFromKey(key);
        });
      });

      const bestKey = 'best_actions';
      const bestActions = actionData.filter(a => (a.action_score || 0) >= 0.05);
      labelMap[bestKey] = 'Best Actions';

      const cats: Record<string, ActionRow[]> = {};
      if (bestActions.length > 0) cats[bestKey] = bestActions;
      Object.entries(typeMap)
        .sort((a, b) => {
          const avgA = a[1].reduce((s, x) => s + (x.action_score || 0), 0) / a[1].length;
          const avgB = b[1].reduce((s, x) => s + (x.action_score || 0), 0) / b[1].length;
          return avgB - avgA;
        })
        .forEach(([key, arr]) => {
          cats[key] = [...arr].sort((a, b) => (b.action_score || 0) - (a.action_score || 0));
        });

      const categoryKeys = Object.keys(cats);

      // Apply saved ordering/visibility (default OFF when no saved row)
      const savedClipVis: Record<string, boolean> = {};
      const savedCatVis: Record<string, boolean> = {};
      const catOrderHints: Record<string, number> = {};
      const clipOrderHints: Record<string, number> = {};
      (visRows || []).forEach((r: any) => {
        const catKey = r.playlist_key || (r.playlist_id ? normaliseActionKey(r.playlist_id) : null);
        if (r.clip_video_url) {
          savedClipVis[r.clip_video_url] = !!r.visible;
          clipOrderHints[r.clip_video_url] = r.sort_order ?? 0;
        } else if (catKey) {
          savedCatVis[catKey] = !!r.visible;
          catOrderHints[catKey] = r.sort_order ?? 0;
        }
      });

      const orderedCats = [...categoryKeys].sort((a, b) => {
        const av = catOrderHints[a] ?? categoryKeys.indexOf(a);
        const bv = catOrderHints[b] ?? categoryKeys.indexOf(b);
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
          // Default ON for clips inside a saved-on category, OFF otherwise.
          if (savedClipVis[u] != null) clipVis[u] = savedClipVis[u];
          else clipVis[u] = !!savedCatVis[cat]; // default off
        });
      });
      const cVis: Record<string, boolean> = {};
      orderedCats.forEach(c => { cVis[c] = savedCatVis[c] ?? false; }); // default OFF

      setActions(actionData);
      setCategoryOrder(orderedCats);
      setClipsByCategory(clipsCat);
      setVisibleClips(clipVis);
      setVisibleCategories(cVis);
      setCategoryLabels(labelMap);
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

  const handleSave = async (event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    setSaving(true);
    try {
      await (supabase as any).from('player_hudl_visibility').delete().eq('player_id', playerId);
      const rows: any[] = [];
      categoryOrder.forEach((cat, ci) => {
        rows.push({
          player_id: playerId,
          playlist_id: cat,
          playlist_key: cat,
          clip_id: null,
          clip_video_url: null,
          visible: visibleCategories[cat] ?? true,
          sort_order: ci,
        });
        (clipsByCategory[cat] || []).forEach((url, idx) => {
          rows.push({
            player_id: playerId,
            playlist_id: cat,
            playlist_key: cat,
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

  // Toggling a category ON should turn ALL its clips on (until manually deselected).
  // Toggling OFF should hide the category entirely.
  const toggleCategory = (cat: string, value: boolean) => {
    setVisibleCategories(p => ({ ...p, [cat]: value }));
    if (value) {
      const urls = clipsByCategory[cat] || [];
      setVisibleClips(p => {
        const next = { ...p };
        urls.forEach(u => { next[u] = true; });
        return next;
      });
    }
  };

  if (loading) return <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading clips…</div>;

  if (categoryOrder.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">No positive R90 video report actions for this player yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">All action types start off. Toggle a type on to show all of its clips, then deselect any clips you don't want.</p>
        <Button type="button" onClick={handleSave} disabled={saving} size="sm" className="gap-2"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save'}</Button>
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
                        <Switch checked={visibleCategories[cat] ?? false} onCheckedChange={(v) => toggleCategory(cat, v)} />
                        <span className="font-semibold">{categoryLabels[cat] || prettyLabelFromKey(cat)}</span>
                        <span className="text-xs text-muted-foreground">({clipUrls.length})</span>
                      </div>
                    </div>
                    {clipUrls.length > 0 && visibleCategories[cat] && (
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
