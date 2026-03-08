import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Trash2, GripVertical, MapPin, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCountryFlagUrl } from "@/lib/countryFlags";
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

interface Prospect {
  id: string;
  name: string;
  age: number | null;
  position: string | null;
  nationality: string | null;
  current_club: string | null;
  age_group: 'A' | 'B' | 'C' | 'D';
  stage: 'scouted' | 'connected' | 'rapport_building' | 'rising' | 'rise';
  profile_image_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  last_contact_date: string | null;
  priority: 'low' | 'medium' | 'high' | null;
  linked_player_id: string | null;
  // From players table sync
  _source: 'prospects' | 'players';
}

const stages = [
  { value: 'scouted', label: 'SCOUTED' },
  { value: 'connected', label: 'CONNECTED' },
  { value: 'rapport_building', label: 'RAPPORT BUILDING' },
  { value: 'rising', label: 'RISING' },
  { value: 'rise', label: 'RISE' },
] as const;

const ageGroups = [
  { value: 'A', label: 'A - FIRST TEAM' },
  { value: 'B', label: 'B - U21' },
  { value: 'C', label: 'C - U18' },
  { value: 'D', label: 'D - U16' },
] as const;

const getPriorityColor = (priority: string | null) => {
  switch (priority) {
    case 'high': return 'hsl(0, 70%, 50%)';
    case 'medium': return 'hsl(43, 49%, 61%)';
    case 'low': return 'hsl(140, 50%, 50%)';
    default: return 'hsl(0, 0%, 40%)';
  }
};

// Draggable prospect card
const ProspectCard = ({ prospect, isAdmin, onEdit, onDelete, isDragging }: {
  prospect: Prospect;
  isAdmin: boolean;
  onEdit: (p: Prospect) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: prospect.id,
    data: { prospect },
    disabled: !isAdmin,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 50,
  } : undefined;

  const initials = prospect.name.split(" ").map(n => n[0]).join("").slice(0, 2);
  const priorityColor = getPriorityColor(prospect.priority);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative group rounded-xl overflow-hidden border-2 transition-all duration-200
        ${isDragging ? 'opacity-40 scale-95' : 'hover:scale-[1.02] hover:shadow-xl'}
        ${isAdmin ? 'cursor-grab active:cursor-grabbing' : ''}
      `}
      {...(isAdmin ? { ...attributes, ...listeners } : {})}
    >
      {/* Card background with gradient */}
      <div
        className="relative p-3 min-h-[140px] flex flex-col justify-between"
        style={{
          background: `linear-gradient(145deg, hsl(0, 0%, 14%) 0%, hsl(0, 0%, 8%) 100%)`,
          borderColor: priorityColor,
        }}
      >
        {/* Top section: position badge + priority dot */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" />
            )}
            {prospect.position && (
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  background: `${priorityColor}22`,
                  color: priorityColor,
                  border: `1px solid ${priorityColor}44`,
                }}
              >
                {prospect.position}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: priorityColor }}
              title={`${prospect.priority || 'No'} priority`}
            />
          </div>
        </div>

        {/* Centre: avatar + name */}
        <div className="flex items-center gap-3 my-1">
          <Avatar className="h-12 w-12 border-2 shrink-0" style={{ borderColor: `${priorityColor}66` }}>
            <AvatarImage src={prospect.profile_image_url || ""} alt={prospect.name} />
            <AvatarFallback
              className="text-xs font-bold"
              style={{ background: `${priorityColor}22`, color: priorityColor }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-sm truncate" style={{ color: 'hsl(43, 49%, 75%)' }}>
              {prospect.name}
            </div>
            {prospect.current_club && (
              <div className="flex items-center gap-1 mt-0.5">
                <Shield className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                <span className="text-[10px] text-muted-foreground truncate">{prospect.current_club}</span>
              </div>
            )}
            {prospect.nationality && (
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                <span className="text-[10px] text-muted-foreground truncate">{prospect.nationality}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom: age group + age + actions */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-1.5 font-bebas tracking-wider"
              style={{ color: 'hsl(43, 49%, 61%)', borderColor: 'hsl(43, 49%, 61% / 0.3)' }}
            >
              {prospect.age_group}
            </Badge>
            {prospect.age && (
              <span className="text-[10px] text-muted-foreground">{prospect.age}y</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(prospect);
                  }}
                >
                  <span className="text-[10px]">✏️</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(prospect.id);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-destructive/70" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Decorative corner line */}
        <div
          className="absolute top-0 right-0 w-8 h-8"
          style={{
            background: `linear-gradient(225deg, ${priorityColor}33 0%, transparent 60%)`,
          }}
        />
      </div>
    </div>
  );
};

// Overlay card for dragging
const DragOverlayCard = ({ prospect }: { prospect: Prospect }) => {
  const initials = prospect.name.split(" ").map(n => n[0]).join("").slice(0, 2);
  const priorityColor = getPriorityColor(prospect.priority);

  return (
    <div className="rounded-xl overflow-hidden border-2 shadow-2xl w-[180px]" style={{ borderColor: priorityColor }}>
      <div
        className="p-3 min-h-[120px]"
        style={{ background: `linear-gradient(145deg, hsl(0, 0%, 14%) 0%, hsl(0, 0%, 8%) 100%)` }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-10 w-10 border-2" style={{ borderColor: `${priorityColor}66` }}>
            <AvatarImage src={prospect.profile_image_url || ""} />
            <AvatarFallback className="text-xs font-bold" style={{ background: `${priorityColor}22`, color: priorityColor }}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="font-bold text-sm truncate" style={{ color: 'hsl(43, 49%, 75%)' }}>{prospect.name}</div>
            <div className="text-[10px] text-muted-foreground">{prospect.position}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Droppable stage column
const StageColumn = ({ stageValue, stageLabel, prospects: stageProspects, isAdmin, onEdit, onDelete, isOver }: {
  stageValue: string;
  stageLabel: string;
  prospects: Prospect[];
  isAdmin: boolean;
  onEdit: (p: Prospect) => void;
  onDelete: (id: string) => void;
  isOver: boolean;
}) => {
  const { setNodeRef } = useDroppable({ id: stageValue });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[200px] rounded-xl border transition-all duration-200 ${isOver ? 'ring-2 ring-primary/50 border-primary/40' : ''}`}
      style={{ borderColor: isOver ? undefined : 'rgba(255, 255, 255, 0.08)' }}
    >
      <div
        className="px-3 py-2 flex items-center justify-between rounded-t-xl"
        style={{ backgroundColor: 'hsl(43, 49%, 61%)' }}
      >
        <span className="font-bebas uppercase text-sm tracking-wider" style={{ color: 'hsl(0, 0%, 0%)' }}>
          {stageLabel}
        </span>
        <Badge variant="secondary" className="text-[10px] h-5 bg-black/20 text-black border-0">
          {stageProspects.length}
        </Badge>
      </div>
      <div className="p-2 space-y-2 min-h-[150px]" style={{ backgroundColor: 'hsl(0, 0%, 6%)' }}>
        {stageProspects.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground opacity-30">
            Drop here
          </div>
        ) : (
          stageProspects.map(p => (
            <ProspectCard
              key={p.id}
              prospect={p}
              isAdmin={isAdmin}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
};

export const ProspectBoard = ({ isAdmin }: { isAdmin: boolean }) => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    position: "",
    nationality: "",
    current_club: "",
    age_group: "A" as 'A' | 'B' | 'C' | 'D',
    stage: "scouted" as 'scouted' | 'connected' | 'rapport_building' | 'rising' | 'rise',
    contact_email: "",
    contact_phone: "",
    notes: "",
    priority: "medium" as 'low' | 'medium' | 'high',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  useEffect(() => {
    fetchAllProspects();
  }, []);

  const fetchAllProspects = async () => {
    try {
      // Fetch from prospects table
      const { data: prospectsData, error: pError } = await supabase
        .from("prospects")
        .select("*")
        .order("created_at", { ascending: false });

      if (pError) throw pError;

      // Fetch players with representation_status = 'prospect'
      const { data: playersData, error: plError } = await supabase
        .from("players")
        .select("id, name, position, image_url, club, nationality, date_of_birth")
        .eq("representation_status", "prospect");

      if (plError) throw plError;

      // Map prospects table data
      const fromProspects: Prospect[] = (prospectsData || []).map(p => ({
        ...p,
        _source: 'prospects' as const,
      } as Prospect));

      // Check which players are already linked
      const linkedPlayerIds = new Set(fromProspects.filter(p => p.linked_player_id).map(p => p.linked_player_id));

      // Create prospect entries for unlinked players
      const fromPlayers: Prospect[] = (playersData || [])
        .filter(p => !linkedPlayerIds.has(p.id))
        .map(p => {
          let age: number | null = null;
          if (p.date_of_birth) {
            const dob = new Date(p.date_of_birth);
            const now = new Date();
            age = Math.floor((now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            if (age < 0 || age > 50) age = null;
          }

          let ageGroup: 'A' | 'B' | 'C' | 'D' = 'C';
          if (age !== null) {
            if (age >= 21) ageGroup = 'A';
            else if (age >= 18) ageGroup = 'B';
            else if (age >= 16) ageGroup = 'C';
            else ageGroup = 'D';
          }

          return {
            id: `player-${p.id}`,
            name: p.name,
            age,
            position: p.position,
            nationality: p.nationality,
            current_club: p.club,
            age_group: ageGroup,
            stage: 'scouted' as const,
            profile_image_url: p.image_url,
            contact_email: null,
            contact_phone: null,
            notes: null,
            last_contact_date: null,
            priority: 'medium' as const,
            linked_player_id: p.id,
            _source: 'players' as const,
          };
        });

      // Auto-create prospect records for unlinked players
      for (const fp of fromPlayers) {
        const { data: created, error: cErr } = await supabase
          .from("prospects")
          .insert({
            name: fp.name,
            age: fp.age,
            position: fp.position,
            nationality: fp.nationality,
            current_club: fp.current_club,
            age_group: fp.age_group,
            stage: fp.stage,
            profile_image_url: fp.profile_image_url,
            priority: fp.priority,
            linked_player_id: fp.linked_player_id,
          })
          .select()
          .single();

        if (!cErr && created) {
          fromProspects.push({ ...created, _source: 'prospects' as const } as Prospect);
        }
      }

      setProspects(fromProspects);
    } catch (error: any) {
      console.error("Error fetching prospects:", error);
      toast.error("Failed to load prospects");
    } finally {
      setLoading(false);
    }
  };

  const handleMoveStage = async (prospectId: string, newStage: string) => {
    try {
      const { error } = await supabase
        .from("prospects")
        .update({ stage: newStage })
        .eq("id", prospectId);

      if (error) throw error;

      setProspects(prev =>
        prev.map(p => p.id === prospectId ? { ...p, stage: newStage as any } : p)
      );
    } catch (error: any) {
      console.error("Error moving prospect:", error);
      toast.error("Failed to move prospect");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: any) => {
    const overId = event.over?.id as string;
    if (stages.some(s => s.value === overId)) {
      setOverStage(overId);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverStage(null);

    if (!over) return;

    const prospectId = active.id as string;
    const newStage = over.id as string;

    if (!stages.some(s => s.value === newStage)) return;

    const prospect = prospects.find(p => p.id === prospectId);
    if (!prospect || prospect.stage === newStage) return;

    handleMoveStage(prospectId, newStage);
  };

  const handleEdit = (prospect: Prospect) => {
    setEditingProspect(prospect);
    setFormData({
      name: prospect.name,
      age: prospect.age?.toString() || "",
      position: prospect.position || "",
      nationality: prospect.nationality || "",
      current_club: prospect.current_club || "",
      age_group: prospect.age_group,
      stage: prospect.stage,
      contact_email: prospect.contact_email || "",
      contact_phone: prospect.contact_phone || "",
      notes: prospect.notes || "",
      priority: prospect.priority || "medium",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this prospect?")) return;
    try {
      const { error } = await supabase.from("prospects").delete().eq("id", id);
      if (error) throw error;
      toast.success("Prospect removed");
      setProspects(prev => prev.filter(p => p.id !== id));
    } catch (error: any) {
      console.error("Error deleting prospect:", error);
      toast.error("Failed to remove prospect");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const prospectData = {
        name: formData.name,
        age: formData.age ? parseInt(formData.age) : null,
        position: formData.position || null,
        nationality: formData.nationality || null,
        current_club: formData.current_club || null,
        age_group: formData.age_group,
        stage: formData.stage,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        notes: formData.notes || null,
        priority: formData.priority,
      };

      if (editingProspect) {
        const { error } = await supabase.from("prospects").update(prospectData).eq("id", editingProspect.id);
        if (error) throw error;
        toast.success("Prospect updated");
      } else {
        const { error } = await supabase.from("prospects").insert([prospectData]);
        if (error) throw error;
        toast.success("Prospect added");
      }

      setDialogOpen(false);
      resetForm();
      fetchAllProspects();
    } catch (error: any) {
      console.error("Error saving prospect:", error);
      toast.error("Failed to save prospect");
    }
  };

  const resetForm = () => {
    setEditingProspect(null);
    setFormData({
      name: "", age: "", position: "", nationality: "", current_club: "",
      age_group: "A", stage: "scouted", contact_email: "", contact_phone: "",
      notes: "", priority: "medium",
    });
  };

  const activeProspect = prospects.find(p => p.id === activeId);

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Loading prospects...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="text-xs sm:text-sm text-muted-foreground">
          {prospects.length} prospect{prospects.length !== 1 ? 's' : ''} tracked
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add Prospect
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProspect ? "Edit Prospect" : "Add New Prospect"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Age</Label>
                    <Input type="number" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Position</Label>
                    <Input value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nationality</Label>
                    <Input value={formData.nationality} onChange={(e) => setFormData({ ...formData, nationality: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Current Club</Label>
                  <Input value={formData.current_club} onChange={(e) => setFormData({ ...formData, current_club: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Age Group *</Label>
                    <Select value={formData.age_group} onValueChange={(v: any) => setFormData({ ...formData, age_group: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ageGroups.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Stage *</Label>
                    <Select value={formData.stage} onValueChange={(v: any) => setFormData({ ...formData, stage: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {stages.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(v: any) => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={4} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">{editingProspect ? "Update" : "Add"} Prospect</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Kanban board with drag and drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2" style={{ scrollSnapType: 'x mandatory' }}>
          {stages.map(stage => {
            const stageProspects = prospects.filter(p => p.stage === stage.value);
            return (
              <StageColumn
                key={stage.value}
                stageValue={stage.value}
                stageLabel={stage.label}
                prospects={stageProspects}
                isAdmin={isAdmin}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isOver={overStage === stage.value}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeProspect ? <DragOverlayCard prospect={activeProspect} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground pt-4 border-t">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(0, 70%, 50%)' }} />
          <span>High</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(43, 49%, 61%)' }} />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(140, 50%, 50%)' }} />
          <span>Low</span>
        </div>
      </div>
    </div>
  );
};
