import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Plus, Trash2, Check, X, ChevronUp, ChevronDown, Link2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";
import smudgedMarble from "@/assets/smudged-marble-overlay.png";

export interface OpsCategory {
  id: string;
  title: string;
  display_order: number;
}
export interface OpsItem {
  id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  rough_time: string | null;
  highlights: string[];
  staff_task_id: string | null;
  display_order: number;
}
export interface StaffTaskOption {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
}

interface Props {
  kind: "time" | "priority";
  categories: OpsCategory[];
  items: OpsItem[];
  staffTasks: StaffTaskOption[];
  unlocked: boolean;
  token: string | null;
  reorderable?: boolean;
  defaultCategorySuggestions?: string[];
  onRefresh: () => Promise<void> | void;
}

async function callWrite(token: string | null, action: string, payload: any) {
  if (!token) throw new Error("Not authenticated");
  const { data, error } = await invokeEdgeFunction("investor-overview-write", {
    body: { token, action, payload },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
}

const normaliseItem = (row: any): OpsItem => ({
  ...row,
  highlights: Array.isArray(row?.highlights) ? row.highlights : [],
});

const ItemEditor = ({ item, categoryId, kind, token, staffTasks, displayOrder, onDone, onCancel }: {
  item?: Partial<OpsItem>; categoryId: string; kind: "time" | "priority";
  token: string | null; staffTasks: StaffTaskOption[]; displayOrder: number;
  onDone: (saved?: OpsItem) => void; onCancel: () => void;
}) => {
  const [title, setTitle] = useState(item?.title || "");
  const [description, setDescription] = useState(item?.description || "");
  const [roughTime, setRoughTime] = useState(item?.rough_time || "");
  const [highlights, setHighlights] = useState((item?.highlights || []).join(", "));
  const [staffTaskId, setStaffTaskId] = useState<string | null>(item?.staff_task_id || null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!title.trim()) { toast.error("Title required"); return; }
    setBusy(true);
    try {
      const isEdit = Boolean(item?.id);
      const saved = await callWrite(token, "upsertOpsItem", {
        kind,
        id: item?.id,
        category_id: categoryId,
        title, description, rough_time: roughTime,
        highlights: highlights.split(",").map(h => h.trim()).filter(Boolean),
        staff_task_id: staffTaskId,
        display_order: item?.display_order ?? displayOrder,
      });
      toast.success(isEdit ? "Task updated" : "Task added");
      onDone((saved as any)?.row ? normaliseItem((saved as any).row) : undefined);
    } catch (e: any) { toast.error(e.message || "Save failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-3 p-4 border border-primary/40 rounded-xl bg-primary/5">
      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" />
      <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description / what this entails" rows={4} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input value={roughTime} onChange={e => setRoughTime(e.target.value)} placeholder="Rough time (e.g. 30 min, 2 hrs)" />
        <Input value={highlights} onChange={e => setHighlights(e.target.value)} placeholder="Highlights, comma, separated" />
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Link2 className="w-3.5 h-3.5 mr-2" />
            {staffTaskId
              ? `Linked: ${staffTasks.find(t => t.id === staffTaskId)?.title || "Unknown staff task"}`
              : "Auto-populate from a staff task (optional)"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[420px] max-h-[60vh] overflow-y-auto p-2 z-50">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-medium text-muted-foreground">Staff tasks</span>
            {staffTaskId && <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setStaffTaskId(null)}><X className="w-3 h-3 mr-1" />Unlink</Button>}
          </div>
          {staffTasks.length === 0 && <div className="text-xs text-muted-foreground p-3">No staff tasks available.</div>}
          {staffTasks.map(t => (
            <button key={t.id} type="button"
              onClick={() => {
                setStaffTaskId(t.id);
                if (!title) setTitle(t.title);
                if (!description && t.description) setDescription(t.description);
              }}
              className={`w-full text-left px-3 py-2 rounded hover:bg-primary/10 text-sm ${staffTaskId === t.id ? "bg-primary/15" : ""}`}>
              <div className="font-medium truncate">{t.title}</div>
              {t.category && <div className="text-[10px] text-muted-foreground tracking-normal normal-case">{t.category}</div>}
            </button>
          ))}
        </PopoverContent>
      </Popover>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={busy}><X className="w-4 h-4 mr-1" />Cancel</Button>
        <Button onClick={save} disabled={busy} className="bg-primary text-primary-foreground"><Check className="w-4 h-4 mr-1" />Save</Button>
      </div>
    </div>
  );
};

const ItemCard = ({ item, staffTask, unlocked, reorderable, isFirst, isLast, token, kind, staffTasks, onChanged, onItemSaved, onItemDeleted, onMove }: {
  item: OpsItem; staffTask?: StaffTaskOption;
  unlocked: boolean; reorderable?: boolean; isFirst: boolean; isLast: boolean;
  token: string | null; kind: "time" | "priority";
  staffTasks: StaffTaskOption[];
  onChanged: () => Promise<void> | void;
  onItemSaved?: (item: OpsItem) => void;
  onItemDeleted?: (id: string) => void;
  onMove?: (dir: -1 | 1) => Promise<void> | void;
}) => {
  const [editing, setEditing] = useState(false);

  const displayTitle = item.title || staffTask?.title || "Untitled";
  const displayDescription = item.description || staffTask?.description || null;

  if (editing) {
    return <ItemEditor item={item} categoryId={item.category_id || ""} kind={kind} token={token} staffTasks={staffTasks}
      displayOrder={item.display_order}
      onDone={async (saved) => { setEditing(false); if (saved) onItemSaved?.(saved); await onChanged(); }}
      onCancel={() => setEditing(false)} />;
  }

  const del = async () => {
    if (!confirm(`Delete "${displayTitle}"?`)) return;
    try { await callWrite(token, "deleteOpsItem", { kind, id: item.id }); onItemDeleted?.(item.id); toast.success("Task deleted"); await onChanged(); }
    catch (e: any) { toast.error(e.message || "Delete failed"); }
  };

  return (
    <motion.div layout
      className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card hover:border-primary/40 transition-colors">
      {/* Title strip with smudged marble */}
      <div className="relative overflow-hidden border-b border-primary/15">
        <div className="absolute inset-0 opacity-60 pointer-events-none"
          style={{ backgroundImage: `url(${smudgedMarble})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="absolute inset-0 bg-gradient-to-r from-background/30 via-background/10 to-background/30 pointer-events-none" />
        <div className="relative flex items-start gap-3 px-5 md:px-6 py-4">
          {reorderable && unlocked && (
            <div className="flex flex-col gap-0.5 shrink-0">
              <Button size="icon" variant="ghost" className="h-6 w-6" disabled={isFirst} onClick={() => onMove?.(-1)}><ChevronUp className="w-3.5 h-3.5" /></Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" disabled={isLast} onClick={() => onMove?.(1)}><ChevronDown className="w-3.5 h-3.5" /></Button>
            </div>
          )}
          <h4 className="flex-1 text-lg md:text-xl font-bold tracking-tight text-foreground leading-tight">{displayTitle}</h4>
          {item.staff_task_id && (
            <span className="shrink-0 text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded border border-primary/40 text-primary bg-primary/10 flex items-center gap-1">
              <Link2 className="w-2.5 h-2.5" />Staff
            </span>
          )}
          {unlocked && (
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={del}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          )}
        </div>
      </div>
      {(displayDescription || item.rough_time || item.highlights.length > 0) && (
        <div className="px-5 md:px-6 py-4 space-y-3">
          {displayDescription && (
            <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{displayDescription}</p>
          )}
          {(item.rough_time || item.highlights.length > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              {item.rough_time && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary font-medium">
                  <Clock className="w-3 h-3" />{item.rough_time}
                </span>
              )}
              {item.highlights.map((h, i) => (
                <span key={i} className="text-[11px] px-2 py-1 rounded-full bg-muted/50 text-muted-foreground border border-border/50">{h}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export const OpsBoard = ({ kind, categories, items, staffTasks, unlocked, token, reorderable, defaultCategorySuggestions, onRefresh }: Props) => {
  const [adding, setAdding] = useState<string | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState("");
  const [localCategories, setLocalCategories] = useState<OpsCategory[]>([]);
  const [localItems, setLocalItems] = useState<OpsItem[]>([]);
  const [deletedCategoryIds, setDeletedCategoryIds] = useState<string[]>([]);
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);

  const visibleCategories = useMemo(() => {
    const byId = new Map<string, OpsCategory>();
    [...categories, ...localCategories].forEach(cat => byId.set(cat.id, cat));
    return [...byId.values()]
      .filter(cat => !deletedCategoryIds.includes(cat.id))
      .sort((a, b) => a.display_order - b.display_order || a.title.localeCompare(b.title));
  }, [categories, localCategories, deletedCategoryIds]);

  const visibleItems = useMemo(() => {
    const byId = new Map<string, OpsItem>();
    [...items, ...localItems].forEach(item => byId.set(item.id, item));
    return [...byId.values()]
      .filter(item => !deletedItemIds.includes(item.id) && (!item.category_id || !deletedCategoryIds.includes(item.category_id)))
      .sort((a, b) => a.display_order - b.display_order || a.title.localeCompare(b.title));
  }, [items, localItems, deletedItemIds, deletedCategoryIds]);

  const saveLocalItem = (item: OpsItem) => {
    setDeletedItemIds(prev => prev.filter(id => id !== item.id));
    setLocalItems(prev => [...prev.filter(existing => existing.id !== item.id), item]);
  };

  const deleteLocalItem = (id: string) => {
    setDeletedItemIds(prev => prev.includes(id) ? prev : [...prev, id]);
    setLocalItems(prev => prev.filter(item => item.id !== id));
  };

  const grouped = useMemo(() => visibleCategories.map(cat => ({
    cat,
    list: visibleItems.filter(i => i.category_id === cat.id).sort((a, b) => a.display_order - b.display_order),
  })), [visibleCategories, visibleItems]);

  const orphan = visibleItems.filter(i => !visibleCategories.find(c => c.id === i.category_id));

  const moveItem = async (list: OpsItem[], idx: number, dir: -1 | 1) => {
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= list.length) return;
    const a = list[idx], b = list[swapIdx];
    try {
      await callWrite(token, "reorderOpsItems", {
        kind,
        items: [
          { id: a.id, display_order: b.display_order, category_id: a.category_id },
          { id: b.id, display_order: a.display_order, category_id: b.category_id },
        ],
      });
      toast.success("Reordered");
      await onRefresh();
    } catch (e: any) { toast.error(e.message || "Reorder failed"); }
  };

  const createCategory = async (title: string) => {
    if (!title.trim()) return;
    try {
      const saved = await callWrite(token, "upsertOpsCategory", {
        kind, title: title.trim(),
        display_order: (visibleCategories[visibleCategories.length - 1]?.display_order ?? 0) + 1,
      });
      const savedRow = (saved as any)?.row;
      if (savedRow) {
        setDeletedCategoryIds(prev => prev.filter(id => id !== savedRow.id));
        setLocalCategories(prev => [...prev.filter(c => c.id !== savedRow.id), savedRow]);
      }
      setNewCategoryTitle(""); setAddingCategory(false);
      toast.success("Category added");
      await onRefresh();
    } catch (e: any) { toast.error(e.message || "Failed to add category"); }
  };

  return (
    <div className="space-y-10 font-sans normal-case tracking-normal">
      {grouped.map(({ cat, list }, groupIdx) => (
        <div key={cat.id} className="space-y-4">
          {/* Rise Gold divider header */}
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/60 to-primary/80" />
            <h3 className="text-sm md:text-base font-semibold tracking-normal text-primary shrink-0">{cat.title}</h3>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-primary/60 to-primary/80" />
            {unlocked && (
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={async () => {
                  const t = prompt("Rename category", cat.title); if (!t || t === cat.title) return;
                  try { await callWrite(token, "upsertOpsCategory", { kind, id: cat.id, title: t, display_order: cat.display_order }); toast.success("Category renamed"); await onRefresh(); }
                  catch (e: any) { toast.error(e.message || "Rename failed"); }
                }}><Pencil className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={async () => {
                  if (!confirm(`Delete category "${cat.title}" and all its items?`)) return;
                  try { await callWrite(token, "deleteOpsCategory", { kind, id: cat.id }); toast.success("Category deleted"); await onRefresh(); }
                  catch (e: any) { toast.error(e.message || "Delete failed"); }
                }}><Trash2 className="w-3 h-3" /></Button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {list.map((it, idx) => (
                <ItemCard key={it.id} item={it}
                  staffTask={it.staff_task_id ? staffTasks.find(t => t.id === it.staff_task_id) : undefined}
                  unlocked={unlocked} reorderable={reorderable}
                  isFirst={idx === 0} isLast={idx === list.length - 1}
                  token={token} kind={kind} staffTasks={staffTasks}
                  onChanged={onRefresh}
                  onItemSaved={saveLocalItem}
                  onMove={(dir) => moveItem(list, idx, dir)} />
              ))}
            </AnimatePresence>
            {adding === cat.id && (
              <ItemEditor categoryId={cat.id} kind={kind} token={token} staffTasks={staffTasks}
                displayOrder={(list[list.length - 1]?.display_order ?? 0) + 1}
                onDone={async (saved) => { setAdding(null); if (saved) saveLocalItem(saved); await onRefresh(); }}
                onCancel={() => setAdding(null)} />
            )}
            {unlocked && adding !== cat.id && (
              <Button size="sm" variant="outline" className="w-full border-dashed" onClick={() => setAdding(cat.id)}>
                <Plus className="w-3.5 h-3.5 mr-1" />Add to {cat.title}
              </Button>
            )}
          </div>
        </div>
      ))}

      {orphan.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-primary/40" />
            <h3 className="text-sm font-semibold tracking-normal text-muted-foreground shrink-0">Uncategorised</h3>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-primary/30 to-primary/40" />
          </div>
          {orphan.map((it, idx) => (
            <ItemCard key={it.id} item={it}
              staffTask={it.staff_task_id ? staffTasks.find(t => t.id === it.staff_task_id) : undefined}
              unlocked={unlocked} reorderable={false}
              isFirst={idx === 0} isLast={idx === orphan.length - 1}
              token={token} kind={kind} staffTasks={staffTasks}
              onChanged={onRefresh}
              onItemSaved={saveLocalItem} />
          ))}
        </div>
      )}

      {unlocked && (
        <div className="border-t border-primary/10 pt-4">
          {addingCategory ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input value={newCategoryTitle} onChange={e => setNewCategoryTitle(e.target.value)}
                  placeholder="Category title"
                  onKeyDown={e => { if (e.key === "Enter") createCategory(newCategoryTitle); }} autoFocus />
                <Button onClick={() => createCategory(newCategoryTitle)} className="bg-primary text-primary-foreground"><Check className="w-4 h-4" /></Button>
                <Button variant="ghost" onClick={() => { setAddingCategory(false); setNewCategoryTitle(""); }}><X className="w-4 h-4" /></Button>
              </div>
              {defaultCategorySuggestions && defaultCategorySuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {defaultCategorySuggestions
                    .filter(s => !visibleCategories.find(c => c.title.toLowerCase() === s.toLowerCase()))
                    .map(s => (
                      <Button key={s} variant="outline" size="sm" className="h-6 text-[11px]"
                        onClick={() => createCategory(s)}>{s}</Button>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <Button variant="outline" size="sm" className="border-dashed" onClick={() => setAddingCategory(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />Add category
            </Button>
          )}
        </div>
      )}
    </div>
  );
};