import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, Clock3, User, Link2, GripVertical, Image as ImageIcon, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'MON' },
  { id: 'tuesday', label: 'TUE' },
  { id: 'wednesday', label: 'WED' },
  { id: 'thursday', label: 'THU' },
  { id: 'friday', label: 'FRI' },
  { id: 'saturday', label: 'SAT' },
  { id: 'sunday', label: 'SUN' },
];

const DEFAULT_POST_TYPES = [
  'Highlight Reel',
  'Matchday Graphic',
  'Story Update',
  'Training Clip',
  'Player Spotlight',
  'Testimonial',
  'Behind the Scenes',
  'Press Release',
  'Infographic',
  'Podcast / Interview',
];

const PLATFORM_FORMATS = [
  { value: 'post', label: 'Post' },
  { value: 'story', label: 'Story' },
  { value: 'reel', label: 'Reel' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'video', label: 'Video' },
];

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned', color: 'hsl(220, 14%, 46%)' },
  { value: 'creating', label: 'Creating', color: 'hsl(43, 74%, 49%)' },
  { value: 'ready', label: 'Ready', color: 'hsl(142, 71%, 45%)' },
  { value: 'posted', label: 'Posted', color: 'hsl(217, 91%, 60%)' },
];

interface ScheduleItem {
  id: string;
  post_type: string;
  day_of_week: string;
  scheduled_time: string | null;
  platform_format: string;
  owner_id: string | null;
  status: string;
  linked_draft_id: string | null;
  notes: string | null;
  display_order: number;
  image_url: string | null;
}

interface DraftPost {
  id: string;
  title: string;
  workflow_status: string;
  canva_link: string | null;
  image_url: string | null;
  image_url_internal: string | null;
}

interface ScheduleManagerProps {
  canManage: boolean;
  compact?: boolean;
}

const getStatusStyle = (status: string) => {
  const s = STATUS_OPTIONS.find(o => o.value === status);
  return s ? s.color : 'hsl(220, 14%, 46%)';
};

const getStatusLabel = (status: string) => {
  const s = STATUS_OPTIONS.find(o => o.value === status);
  return s ? s.label : 'Planned';
};

// ---- Draggable Card ----
const ScheduleCard = ({
  item, canManage, owners, draft, onDelete, isDragging, onClickDraft,
}: {
  item: ScheduleItem;
  canManage: boolean;
  owners: Record<string, string>;
  draft?: DraftPost | null;
  onDelete: (id: string) => void;
  isDragging?: boolean;
  onClickDraft?: (draft: DraftPost) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    data: { item },
    disabled: !canManage,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 50,
  } : undefined;

  const statusColor = getStatusStyle(item.status);
  const cardImage = item.image_url;
  const draftImage = draft ? (draft.image_url_internal || draft.image_url) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative group rounded-xl overflow-hidden border-2 transition-all duration-200
        ${isDragging ? 'opacity-40 scale-95' : 'hover:scale-[1.02] hover:shadow-xl'}
        ${canManage ? 'cursor-grab active:cursor-grabbing' : ''}
      `}
      {...(canManage ? { ...attributes, ...listeners } : {})}
    >
      {/* Card image background */}
      {cardImage && (
        <div className="relative h-20 overflow-hidden">
          <img
            src={cardImage}
            alt={item.post_type}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          {/* Format badge on image */}
          <div className="absolute top-1.5 left-1.5">
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full backdrop-blur-sm"
              style={{
                background: `${statusColor}44`,
                color: 'white',
                border: `1px solid ${statusColor}66`,
              }}
            >
              {item.platform_format}
            </span>
          </div>
          <div
            className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border border-white/30"
            style={{ backgroundColor: statusColor }}
            title={getStatusLabel(item.status)}
          />
        </div>
      )}

      <div
        className="relative p-2.5 flex flex-col justify-between"
        style={{
          background: `linear-gradient(145deg, hsl(0, 0%, 14%) 0%, hsl(0, 0%, 8%) 100%)`,
          borderColor: statusColor,
          minHeight: cardImage ? '60px' : '90px',
        }}
      >
        {/* Top row (only if no image) */}
        {!cardImage && (
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-1.5">
              {canManage && (
                <GripVertical className="w-3 h-3 text-muted-foreground/40" />
              )}
              <span
                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                style={{
                  background: `${statusColor}22`,
                  color: statusColor,
                  border: `1px solid ${statusColor}44`,
                }}
              >
                {item.platform_format}
              </span>
            </div>
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: statusColor }}
              title={getStatusLabel(item.status)}
            />
          </div>
        )}

        {/* Post type name */}
        <div>
          <div className="font-bold text-xs leading-tight" style={{ color: 'hsl(43, 49%, 75%)' }}>
            {item.post_type}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {item.scheduled_time && (
              <div className="flex items-center gap-0.5">
                <Clock3 className="w-2.5 h-2.5 text-muted-foreground/60" />
                <span className="text-[9px] text-muted-foreground">{item.scheduled_time}</span>
              </div>
            )}
            {item.owner_id && owners[item.owner_id] && (
              <div className="flex items-center gap-0.5">
                <User className="w-2.5 h-2.5 text-muted-foreground/60" />
                <span className="text-[9px] text-muted-foreground">{owners[item.owner_id]}</span>
              </div>
            )}
          </div>
        </div>

        {/* Linked draft thumbnail */}
        {draft && (
          <div
            className="mt-1.5 flex items-center gap-1.5 rounded-md p-1 bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onClickDraft?.(draft);
            }}
          >
            {draftImage && (
              <img src={draftImage} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[9px] text-white/70 truncate leading-tight">{draft.title}</p>
              <p className="text-[8px] text-primary/70">{draft.workflow_status}</p>
            </div>
          </div>
        )}

        {/* Bottom: status + actions */}
        <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <Badge
            variant="outline"
            className="text-[9px] h-4 px-1.5 font-bebas tracking-wider"
            style={{ color: statusColor, borderColor: `${statusColor}44` }}
          >
            {getStatusLabel(item.status)}
          </Badge>
          {canManage && (
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            >
              <Trash2 className="h-3 w-3 text-destructive/70" />
            </Button>
          )}
        </div>

        {/* Corner accent */}
        {!cardImage && (
          <div
            className="absolute top-0 right-0 w-6 h-6"
            style={{ background: `linear-gradient(225deg, ${statusColor}33 0%, transparent 60%)` }}
          />
        )}
      </div>
    </div>
  );
};

// ---- Drag Overlay ----
const DragOverlayCard = ({ item }: { item: ScheduleItem }) => {
  const statusColor = getStatusStyle(item.status);
  return (
    <div className="rounded-xl overflow-hidden border-2 shadow-2xl w-[170px]" style={{ borderColor: statusColor }}>
      {item.image_url && (
        <div className="h-14 overflow-hidden">
          <img src={item.image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-2" style={{ background: `linear-gradient(145deg, hsl(0, 0%, 14%) 0%, hsl(0, 0%, 8%) 100%)` }}>
        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ background: `${statusColor}22`, color: statusColor }}>{item.platform_format}</span>
        <div className="font-bold text-xs mt-1" style={{ color: 'hsl(43, 49%, 75%)' }}>{item.post_type}</div>
      </div>
    </div>
  );
};

// ---- Droppable Column ----
const DayColumn = ({
  dayId, dayLabel, items, canManage, owners, draftsMap, onDelete, onAdd, isOver, onClickDraft,
}: {
  dayId: string;
  dayLabel: string;
  items: ScheduleItem[];
  canManage: boolean;
  owners: Record<string, string>;
  draftsMap: Record<string, DraftPost>;
  onDelete: (id: string) => void;
  onAdd: (day: string) => void;
  isOver: boolean;
  onClickDraft?: (draft: DraftPost) => void;
}) => {
  const { setNodeRef } = useDroppable({ id: dayId });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[150px] rounded-xl border transition-all duration-200 ${isOver ? 'ring-2 ring-primary/50 border-primary/40' : ''}`}
      style={{ borderColor: isOver ? undefined : 'rgba(255, 255, 255, 0.08)' }}
    >
      <div
        className="px-2.5 py-1.5 flex items-center justify-between rounded-t-xl"
        style={{ backgroundColor: 'hsl(43, 49%, 61%)' }}
      >
        <span className="font-bebas uppercase text-xs tracking-wider" style={{ color: 'hsl(0, 0%, 0%)' }}>
          {dayLabel}
        </span>
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="text-[9px] h-4 bg-black/20 text-black border-0">
            {items.length}
          </Badge>
          {canManage && (
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0 text-black/60 hover:text-black hover:bg-black/10"
              onClick={() => onAdd(dayId)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      <div className="p-1.5 space-y-1.5 min-h-[120px]" style={{ backgroundColor: 'hsl(0, 0%, 6%)' }}>
        {items.length === 0 ? (
          <div className="py-6 text-center text-[10px] text-muted-foreground opacity-30">
            Drop here
          </div>
        ) : (
          items.map(item => (
            <ScheduleCard
              key={item.id}
              item={item}
              canManage={canManage}
              owners={owners}
              draft={item.linked_draft_id ? draftsMap[item.linked_draft_id] : null}
              onDelete={onDelete}
              onClickDraft={onClickDraft}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ---- Main Component ----
export const ScheduleManager = ({ canManage }: ScheduleManagerProps) => {
  const isMobile = useIsMobile();
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [owners, setOwners] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<DraftPost[]>([]);
  const [seriesPostTypes, setSeriesPostTypes] = useState<string[]>([]);
  const [customPostTypes, setCustomPostTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showCustomTypeDialog, setShowCustomTypeDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeItem, setActiveItem] = useState<ScheduleItem | null>(null);
  const [overDay, setOverDay] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newCustomType, setNewCustomType] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    post_type: '',
    day_of_week: 'monday',
    scheduled_time: '',
    platform_format: 'post',
    owner_id: '',
    status: 'planned',
    linked_draft_id: '',
    notes: '',
    image_url: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  // All post type options = defaults + series from marketing + custom
  const allPostTypes = useMemo(() => {
    const merged = new Set([...DEFAULT_POST_TYPES, ...seriesPostTypes, ...customPostTypes]);
    return Array.from(merged).sort();
  }, [seriesPostTypes, customPostTypes]);

  const draftsMap = useMemo(() => {
    const map: Record<string, DraftPost> = {};
    for (const d of drafts) map[d.id] = d;
    return map;
  }, [drafts]);

  useEffect(() => {
    fetchItems();
    fetchOwners();
    fetchDrafts();
    fetchMarketingSeries();
    loadCustomPostTypes();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_schedule_items')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      setItems((data || []) as ScheduleItem[]);
    } catch (err) {
      console.error('Failed to fetch schedule items:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOwners = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      if (error) throw error;
      const mapped = (data || []).reduce<Record<string, string>>((acc, p: any) => {
        if (p.id) acc[p.id] = p.full_name || 'Team';
        return acc;
      }, {});
      setOwners(mapped);
    } catch (err) {
      console.error('Failed to fetch owners:', err);
    }
  };

  const fetchDrafts = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, workflow_status, canva_link, image_url, image_url_internal')
        .neq('workflow_status', 'posted')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setDrafts((data || []) as DraftPost[]);
    } catch (err) {
      console.error('Failed to fetch drafts:', err);
    }
  };

  const fetchMarketingSeries = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_marketing_resources')
        .select('title')
        .order('title');
      if (error) throw error;
      if (data) {
        setSeriesPostTypes(data.map((r: any) => r.title).filter(Boolean));
      }
    } catch (err) {
      console.error('Failed to fetch marketing series:', err);
    }
  };

  const loadCustomPostTypes = () => {
    try {
      const stored = localStorage.getItem('schedule_custom_post_types');
      if (stored) setCustomPostTypes(JSON.parse(stored));
    } catch {}
  };

  const saveCustomPostType = (name: string) => {
    const updated = [...customPostTypes, name];
    setCustomPostTypes(updated);
    localStorage.setItem('schedule_custom_post_types', JSON.stringify(updated));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `schedule/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('marketing-gallery')
        .upload(fileName, file, { cacheControl: '31536000', upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('marketing-gallery')
        .getPublicUrl(fileName);
      setForm(p => ({ ...p, image_url: publicUrl }));
      toast.success('Image uploaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !form.post_type) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('marketing_schedule_items')
        .insert({
          post_type: form.post_type,
          day_of_week: form.day_of_week,
          scheduled_time: form.scheduled_time || null,
          platform_format: form.platform_format,
          owner_id: form.owner_id || null,
          status: form.status,
          linked_draft_id: form.linked_draft_id || null,
          notes: form.notes || null,
          image_url: form.image_url || null,
        });
      if (error) throw error;
      toast.success('Added to schedule');
      setShowDialog(false);
      resetForm();
      fetchItems();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManage || !confirm('Remove this from the schedule?')) return;
    try {
      const { error } = await supabase.from('marketing_schedule_items').delete().eq('id', id);
      if (error) throw error;
      toast.success('Removed');
      fetchItems();
    } catch (err) {
      toast.error('Failed to remove');
    }
  };

  const resetForm = () => {
    setForm({ post_type: '', day_of_week: 'monday', scheduled_time: '', platform_format: 'post', owner_id: '', status: 'planned', linked_draft_id: '', notes: '', image_url: '' });
  };

  const openAddForDay = (day: string) => {
    setForm(prev => ({ ...prev, day_of_week: day }));
    setShowDialog(true);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { item: ScheduleItem } | undefined;
    if (data?.item) setActiveItem(data.item);
  };

  const handleDragOver = (event: any) => {
    setOverDay(event.over?.id as string || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveItem(null);
    setOverDay(null);
    const { active, over } = event;
    if (!over) return;
    const targetDay = over.id as string;
    const draggedData = active.data.current as { item: ScheduleItem } | undefined;
    if (!draggedData?.item) return;
    if (draggedData.item.day_of_week === targetDay) return;

    setItems(prev => prev.map(i => i.id === draggedData.item.id ? { ...i, day_of_week: targetDay } : i));

    try {
      const { error } = await supabase
        .from('marketing_schedule_items')
        .update({ day_of_week: targetDay })
        .eq('id', draggedData.item.id);
      if (error) throw error;
    } catch (err) {
      toast.error('Failed to move item');
      fetchItems();
    }
  };

  const handleClickDraft = (draft: DraftPost) => {
    if (draft.canva_link) {
      window.open(draft.canva_link, '_blank');
    } else {
      toast.info(`Draft: ${draft.title} (${draft.workflow_status})`);
    }
  };

  const handleAddCustomType = () => {
    if (!newCustomType.trim()) return;
    saveCustomPostType(newCustomType.trim());
    setNewCustomType('');
    setShowCustomTypeDialog(false);
    toast.success('Post type added');
  };

  const boardData = useMemo(() =>
    DAYS_OF_WEEK.map(day => ({
      ...day,
      items: items.filter(i => i.day_of_week === day.id),
    })),
    [items]
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Weekly Content Schedule</CardTitle>
                <CardDescription>Plan your weekly content by post type. Drag cards between days.</CardDescription>
              </div>
              {canManage && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowCustomTypeDialog(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> New Post Type
                  </Button>
                  <Button size="sm" onClick={() => setShowDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Add to Schedule
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className={`flex gap-1.5 ${isMobile ? 'overflow-x-auto pb-4 snap-x snap-mandatory' : ''}`}>
                {boardData.map(day => (
                  <DayColumn
                    key={day.id}
                    dayId={day.id}
                    dayLabel={day.label}
                    items={day.items}
                    canManage={canManage}
                    owners={owners}
                    draftsMap={draftsMap}
                    onDelete={handleDelete}
                    onAdd={openAddForDay}
                    isOver={overDay === day.id}
                    onClickDraft={handleClickDraft}
                  />
                ))}
              </div>
              <DragOverlay>
                {activeItem && <DragOverlayCard item={activeItem} />}
              </DragOverlay>
            </DndContext>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {STATUS_OPTIONS.map(s => (
                <div key={s.value} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-[10px]">{s.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add to Schedule Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add to Schedule</DialogTitle>
            <DialogDescription>Choose a content type and assign it to a day</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image upload */}
            <div className="space-y-2">
              <Label>Cover Image (optional)</Label>
              {form.image_url ? (
                <div className="relative w-full h-28 rounded-lg overflow-hidden border border-border">
                  <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="absolute top-1 right-1 h-6 text-[10px]"
                    onClick={() => setForm(p => ({ ...p, image_url: '' }))}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-20 border-dashed flex flex-col gap-1"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Upload image</span>
                    </>
                  )}
                </Button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>

            <div className="space-y-2">
              <Label>Post Type</Label>
              <Select value={form.post_type} onValueChange={v => setForm(p => ({ ...p, post_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select post type" /></SelectTrigger>
                <SelectContent>
                  {allPostTypes.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {seriesPostTypes.length > 0 && (
                <p className="text-[10px] text-muted-foreground">Includes series from your marketing resources</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Day</Label>
                <Select value={form.day_of_week} onValueChange={v => setForm(p => ({ ...p, day_of_week: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Time (optional)</Label>
                <Input type="time" value={form.scheduled_time} onChange={e => setForm(p => ({ ...p, scheduled_time: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={form.platform_format} onValueChange={v => setForm(p => ({ ...p, platform_format: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORM_FORMATS.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Owner</Label>
              <Select value={form.owner_id} onValueChange={v => setForm(p => ({ ...p, owner_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Assign to team member" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(owners).map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {drafts.length > 0 && (
              <div className="space-y-2">
                <Label>Link Content Creator Draft (optional)</Label>
                <Select value={form.linked_draft_id} onValueChange={v => setForm(p => ({ ...p, linked_draft_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Tag a draft from content creator" /></SelectTrigger>
                  <SelectContent>
                    {drafts.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.post_type}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Adding...</> : 'Add to Schedule'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Post Type Dialog */}
      <Dialog open={showCustomTypeDialog} onOpenChange={setShowCustomTypeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Post Type</DialogTitle>
            <DialogDescription>Add a new content type to your schedule options</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="e.g. Weekly Recap, Fan Q&A..."
              value={newCustomType}
              onChange={e => setNewCustomType(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCustomType()}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCustomTypeDialog(false)}>Cancel</Button>
              <Button onClick={handleAddCustomType} disabled={!newCustomType.trim()}>Add Post Type</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
