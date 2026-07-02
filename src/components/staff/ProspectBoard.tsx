import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Trash2, GripVertical, MapPin, Shield, UserPlus, Pencil, Upload, Image as ImageIcon, X, Eye, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import { FitScoreBadge } from "./recruitment/FitScoreBadge";
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
  club_logo_url?: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  last_contact_date: string | null;
  priority: 'low' | 'medium' | 'high' | null;
  linked_player_id: string | null;
  player_email?: string | null;
  has_representation_offer?: boolean | null;
  player_representation_status?: string | null;
  date_of_birth: string | null;
  probability_weight: number | null;
  projected_revenue: number | null;
  revenue_currency: string | null;
  stage_manual_override?: boolean | null;
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

const ageGroupLabelMap: Record<'A' | 'B' | 'C' | 'D', string> = {
  A: 'First Team',
  B: 'U21',
  C: 'U18',
  D: 'U16',
};

// Draggable prospect card
const ProspectCard = ({ prospect, isAdmin, onEdit, onDelete, onEditDetails, isDragging }: {
  prospect: Prospect;
  isAdmin: boolean;
  onEdit: (p: Prospect) => void;
  onDelete: (id: string) => void;
  onEditDetails: (p: Prospect) => void;
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
  const offerSlug = prospect.name.toLowerCase().trim().replace(/\s+/g, '-');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        pipeline-card group relative overflow-hidden p-3
        ${isDragging ? 'opacity-40 scale-95' : ''}
        ${isAdmin ? 'cursor-grab active:cursor-grabbing' : ''}
      `}
      {...(isAdmin ? { ...attributes, ...listeners } : {})}
    >
      <div className="relative min-h-[140px] flex flex-col justify-between">
        {/* Top section: position badge + priority dot */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <GripVertical className="grip-dots w-3.5 h-3.5 text-muted-foreground/40" />
            )}
            {prospect.position && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                {prospect.position}
              </span>
            )}
            <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-bebas tracking-wider text-primary/80 border-primary/40 bg-primary/10" title="Team level">
              {ageGroupLabelMap[prospect.age_group]}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: priorityColor }}
              title={`${prospect.priority || 'No'} priority`}
            />
            <FitScoreBadge
              player={{
                position: prospect.position,
                age: prospect.age,
                date_of_birth: prospect.date_of_birth,
                nationality: prospect.nationality,
                current_club: prospect.current_club,
              }}
              size="sm"
            />
          </div>
        </div>

        {/* Centre: avatar + name */}
        <div className="flex items-center gap-3 my-1">
          <Avatar className="h-16 w-16 border-2 border-primary/40 shrink-0 rounded-lg">
            <AvatarImage src={prospect.profile_image_url || ""} alt={prospect.name} className="object-cover object-top" />
            <AvatarFallback className="text-xs font-bold rounded-lg bg-primary/15 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-sm truncate text-primary">
              {prospect.name}
            </div>
            {prospect.current_club && (
              <div className="flex items-center gap-1.5 mt-1">
                {prospect.club_logo_url ? (
                  <img src={prospect.club_logo_url} alt="" className="w-5 h-5 object-contain shrink-0" loading="lazy" />
                ) : (
                  <Shield className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                )}
                <span className="text-[11px] text-foreground/80 truncate font-medium">{prospect.current_club}</span>
              </div>
            )}
            {prospect.nationality && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <img src={getCountryFlagUrl(prospect.nationality)} alt={prospect.nationality} className="w-4 h-3 object-cover rounded-sm shrink-0" loading="lazy" />
                <span className="text-[10px] text-muted-foreground truncate">{prospect.nationality}</span>
                {typeof prospect.age === 'number' && prospect.age > 0 && (
                  <span className="text-[10px] text-muted-foreground/80">· {prospect.age}y</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom: age group + age + actions */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
          <div className="flex items-center gap-2" />
          <div className="flex items-center gap-1">
            {prospect.player_email && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`${window.location.origin}/portal?staff_login=${encodeURIComponent(prospect.player_email || '')}`, '_blank');
                }}
                title="Open portal"
              >
                <Eye className="h-3 w-3 text-muted-foreground" />
              </Button>
            )}
            {(prospect.has_representation_offer || prospect.player_representation_status === 'prospect') && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`${window.location.origin}/risewithus/${offerSlug}`, '_blank');
                }}
                title="Open representation offer"
              >
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </Button>
            )}
            {isAdmin && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditDetails(prospect);
                  }}
                  title="Edit player details"
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </Button>
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
      </div>
      {/* Priority strip down the right edge */}
      <span aria-hidden className="absolute top-0 right-0 bottom-0 w-[3px]"
        style={{ background: `linear-gradient(180deg, ${priorityColor}, ${priorityColor}44)` }} />
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
const StageColumn = ({ stageValue, stageLabel, prospects: stageProspects, isAdmin, onEdit, onDelete, onEditDetails, isOver }: {
  stageValue: string;
  stageLabel: string;
  prospects: Prospect[];
  isAdmin: boolean;
  onEdit: (p: Prospect) => void;
  onDelete: (id: string) => void;
  onEditDetails: (p: Prospect) => void;
  isOver: boolean;
}) => {
  const { setNodeRef } = useDroppable({ id: stageValue });

  const weightedEV = stageProspects.reduce((acc, p) => {
    const rev = p.projected_revenue || 0;
    const w = (p.probability_weight || 0) / 100;
    return acc + rev * w;
  }, 0);

  return (
    <div
      ref={setNodeRef}
      className={`stage-column flex-1 min-w-[240px] !p-0 overflow-hidden ${isOver ? 'is-over' : ''}`}
    >
      <div className="px-3 py-2.5 flex items-center justify-between bg-primary/[0.08] border-b border-primary/20">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_currentColor]" />
          <span className="font-bebas uppercase text-sm tracking-wider text-primary truncate">
            {stageLabel}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {weightedEV > 0 && (
            <span className="text-[10px] text-muted-foreground font-medium">
              £{Math.round(weightedEV).toLocaleString()}
            </span>
          )}
          <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-[10px] font-semibold bg-foreground/[0.06] border border-border/60 text-foreground/80">
            {stageProspects.length}
          </span>
        </div>
      </div>
      <div className="p-2 space-y-2 min-h-[180px] bg-card/30">
        {stageProspects.length === 0 ? (
          <div className="py-8 text-center text-[11px] text-muted-foreground italic border border-dashed border-border/40 rounded-md">
            Drop a prospect here
          </div>
        ) : (
          stageProspects.map(p => (
            <ProspectCard
              key={p.id}
              prospect={p}
              isAdmin={isAdmin}
              onEdit={onEdit}
              onDelete={onDelete}
              onEditDetails={onEditDetails}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Edit Details Dialog for image, DOB, etc.
const EditDetailsDialog = ({ prospect, open, onOpenChange, onSaved }: {
  prospect: Prospect | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) => {
  const [imageUrl, setImageUrl] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [position, setPosition] = useState("");
  const [nationality, setNationality] = useState("");
  const [currentClub, setCurrentClub] = useState("");
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (prospect && open) {
      setImageUrl(prospect.profile_image_url || "");
      setDateOfBirth(prospect.date_of_birth || "");
      setPosition(prospect.position || "");
      setNationality(prospect.nationality || "");
      setCurrentClub(prospect.current_club || "");
      setImageFile(null);
      setImagePreview("");
    }
  }, [prospect, open]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!prospect) return;
    setSaving(true);

    try {
      let finalImageUrl = imageUrl;

      // Upload image if a new file was selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `prospects/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('marketing-gallery')
          .upload(fileName, imageFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('marketing-gallery')
          .getPublicUrl(fileName);
        finalImageUrl = publicUrl;
      }

      // Calculate age from DOB
      let age: number | null = prospect.age;
      if (dateOfBirth) {
        const dob = new Date(dateOfBirth);
        const now = new Date();
        age = Math.floor((now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (age < 0 || age > 50) age = null;
      }

      // Determine age group from age
      let ageGroup = prospect.age_group;
      if (age !== null) {
        if (age >= 21) ageGroup = 'A';
        else if (age >= 18) ageGroup = 'B';
        else if (age >= 16) ageGroup = 'C';
        else ageGroup = 'D';
      }

      const updateData: any = {
        profile_image_url: finalImageUrl || null,
        date_of_birth: dateOfBirth || null,
        position: position || null,
        nationality: nationality || null,
        current_club: currentClub || null,
        age,
        age_group: ageGroup,
      };

      const { error } = await supabase.from("prospects").update(updateData).eq("id", prospect.id);
      if (error) throw error;

      // Also update linked player if exists
      if (prospect.linked_player_id) {
        await supabase.from("players").update({
          image_url: finalImageUrl || null,
          date_of_birth: dateOfBirth || null,
          position: position || null,
          nationality: nationality || null,
          club: currentClub || null,
        }).eq("id", prospect.linked_player_id);
      }

      toast.success("Details updated");
      onOpenChange(false);
      onSaved();
    } catch (error: any) {
      console.error("Error updating details:", error);
      toast.error(error.message || "Failed to update details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Details — {prospect?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Image */}
          <div className="space-y-2">
            <Label>Player Image</Label>
            {(imagePreview || imageUrl) ? (
              <div className="relative rounded border border-border overflow-hidden bg-muted max-h-48">
                <img src={imagePreview || imageUrl} alt="Player" className="w-full h-auto max-h-48 object-contain" />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 w-7 h-7"
                  onClick={() => { setImageFile(null); setImagePreview(""); setImageUrl(""); }}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-24"
                onClick={() => document.getElementById('prospect-img-upload')?.click()}
              >
                <ImageIcon className="w-6 h-6 mr-2" /> Upload Image
              </Button>
            )}
            <input
              id="prospect-img-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Input value={position} onChange={e => setPosition(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nationality</Label>
              <Input value={nationality} onChange={e => setNationality(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Current Club</Label>
              <Input value={currentClub} onChange={e => setCurrentClub(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Details"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const ProspectBoard = ({ isAdmin }: { isAdmin: boolean }) => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailsProspect, setDetailsProspect] = useState<Prospect | null>(null);
  const [addMode, setAddMode] = useState<'manual' | 'database'>('manual');
  const [dbPlayers, setDbPlayers] = useState<any[]>([]);
  const [dbSearch, setDbSearch] = useState("");
  const [selectedDbPlayer, setSelectedDbPlayer] = useState<any | null>(null);
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
    probability_weight: "0",
    projected_revenue: "0",
    revenue_currency: "GBP",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  useEffect(() => {
    fetchAllProspects();
  }, []);

  // Load DB players when dialog opens in database mode
  useEffect(() => {
    if (dialogOpen && addMode === 'database') {
      loadDbPlayers();
    }
  }, [dialogOpen, addMode]);

  const loadDbPlayers = async () => {
    // Fetch ALL players from the full database, not just prospects
    const { data } = await supabase
      .from("players")
      .select("id, name, position, image_url, club, club_logo, nationality, date_of_birth, email, representation_status, has_representation_offer")
      .order("name");
    if (data) setDbPlayers(data);
  };

  const fetchAllProspects = async () => {
    try {
      const { data: prospectsData, error: pError } = await supabase
        .from("prospects")
        .select("*")
        .order("created_at", { ascending: false });

      if (pError) throw pError;

      const { data: playersData, error: plError } = await supabase
        .from("players")
        .select("id, name, position, image_url, club, club_logo, nationality, date_of_birth, email, representation_status, has_representation_offer, outreach_response_status")
        .or("representation_status.eq.prospect,has_representation_offer.eq.true");

      if (plError) throw plError;

      const playerById = new Map((playersData || []).map((player) => [player.id, player]));

      // Map a player's outreach response into a prospect stage. If nothing
      // matches (or the player hasn't responded), fall back to 'scouted' so
      // players with an outreach start on the board at that stage.
      const deriveStageFromResponse = (status: string | null | undefined): 'scouted' | 'connected' | 'rapport_building' => {
        if (status === 'replied') return 'connected';
        if (status === 'interested') return 'rapport_building';
        return 'scouted';
      };

      const fromProspects: Prospect[] = (prospectsData || []).map((p) => {
        const linkedPlayer = p.linked_player_id ? playerById.get(p.linked_player_id) : undefined;

        return {
          ...p,
          profile_image_url: p.profile_image_url || linkedPlayer?.image_url || null,
          current_club: p.current_club || linkedPlayer?.club || null,
          nationality: p.nationality || linkedPlayer?.nationality || null,
          club_logo_url: linkedPlayer?.club_logo || null,
          player_email: linkedPlayer?.email || null,
          has_representation_offer: Boolean(linkedPlayer?.has_representation_offer),
          player_representation_status: linkedPlayer?.representation_status || null,
          _source: 'prospects' as const,
        } as Prospect;
      });

      // Auto-sync stage from player outreach response, unless the user has
      // manually moved this prospect (stage_manual_override = true). Fire
      // updates in the background so the board renders fast.
      for (const p of fromProspects) {
        if (p.stage_manual_override) continue;
        const linked = p.linked_player_id ? playerById.get(p.linked_player_id) : null;
        if (!linked) continue;
        const desired = deriveStageFromResponse((linked as any).outreach_response_status);
        if (desired !== p.stage) {
          p.stage = desired;
          supabase.from("prospects").update({ stage: desired }).eq("id", p.id).then(() => {});
        }
      }

      const linkedPlayerIds = new Set(fromProspects.filter((p) => p.linked_player_id).map((p) => p.linked_player_id));

      const fromPlayers: Prospect[] = (playersData || [])
        .filter((p) => !linkedPlayerIds.has(p.id))
        .map((p) => {
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
            stage: deriveStageFromResponse((p as any).outreach_response_status),
            profile_image_url: p.image_url,
            club_logo_url: p.club_logo || null,
            contact_email: null,
            contact_phone: null,
            notes: null,
            last_contact_date: null,
            priority: 'medium' as const,
            linked_player_id: p.id,
            player_email: p.email || null,
            has_representation_offer: Boolean((p as any).has_representation_offer),
            player_representation_status: (p as any).representation_status || null,
            date_of_birth: p.date_of_birth,
            probability_weight: 0,
            projected_revenue: 0,
            revenue_currency: 'GBP',
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
            date_of_birth: fp.date_of_birth,
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
    setAddMode('manual');
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
      probability_weight: (prospect.probability_weight || 0).toString(),
      projected_revenue: (prospect.projected_revenue || 0).toString(),
      revenue_currency: prospect.revenue_currency || "GBP",
    });
    setDialogOpen(true);
  };

  const handleEditDetails = (prospect: Prospect) => {
    setDetailsProspect(prospect);
    setDetailsDialogOpen(true);
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
      if (addMode === 'database' && selectedDbPlayer && !editingProspect) {
        // Adding from database
        const player = selectedDbPlayer;
        let age: number | null = null;
        if (player.date_of_birth) {
          const dob = new Date(player.date_of_birth);
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

        // Do NOT change player status when adding to prospect board
        // Players on the board may already be represented (RISE status etc.)

        const { error } = await supabase.from("prospects").insert({
          name: player.name,
          age,
          position: player.position || null,
          nationality: player.nationality || null,
          current_club: player.club || null,
          age_group: ageGroup,
          stage: formData.stage,
          profile_image_url: player.image_url || null,
          priority: formData.priority,
          linked_player_id: player.id,
          date_of_birth: player.date_of_birth || null,
          notes: formData.notes || null,
        });
        if (error) throw error;
        toast.success(`${player.name} added from database`);
      } else {
        // Manual add or edit
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
          // Auto-add to players table if not already there
          const { data: existingPlayer } = await supabase
            .from("players")
            .select("id")
            .ilike("name", formData.name.trim())
            .maybeSingle();

          let linkedPlayerId: string | null = null;

          if (!existingPlayer) {
            const { data: newPlayer, error: playerErr } = await supabase
              .from("players")
              .insert({
                name: formData.name.trim(),
                position: formData.position || 'Unknown',
                nationality: formData.nationality || 'Unknown',
                age: formData.age ? parseInt(formData.age) : 0,
                club: formData.current_club || null,
                representation_status: 'prospect',
              })
              .select("id")
              .single();
            if (!playerErr && newPlayer) {
              linkedPlayerId = newPlayer.id;
            }
          } else {
            linkedPlayerId = existingPlayer.id;
          }

          const { error } = await supabase.from("prospects").insert([{
            ...prospectData,
            linked_player_id: linkedPlayerId,
          }]);
          if (error) throw error;
          toast.success("Prospect added and saved to player database");
        }
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
    setSelectedDbPlayer(null);
    setDbSearch("");
    setAddMode('manual');
    setFormData({
      name: "", age: "", position: "", nationality: "", current_club: "",
      age_group: "A", stage: "scouted", contact_email: "", contact_phone: "",
      notes: "", priority: "medium", probability_weight: "0", projected_revenue: "0", revenue_currency: "GBP",
    });
  };

  const filteredDbPlayers = dbPlayers.filter(p =>
    p.name.toLowerCase().includes(dbSearch.toLowerCase())
  );

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

              {/* Mode toggle - only when adding new */}
              {!editingProspect && (
                <div className="flex gap-2 mb-2">
                  <Button
                    type="button"
                    variant={addMode === 'manual' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => { setAddMode('manual'); setSelectedDbPlayer(null); }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Manual
                  </Button>
                  <Button
                    type="button"
                    variant={addMode === 'database' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAddMode('database')}
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1.5" /> From Database
                  </Button>
                </div>
              )}

              {/* Database player picker */}
              {addMode === 'database' && !editingProspect && (
                <div className="space-y-3 mb-4">
                  <Input
                    placeholder="Search players in database..."
                    value={dbSearch}
                    onChange={e => setDbSearch(e.target.value)}
                  />
                  <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
                    {filteredDbPlayers.slice(0, 50).map(p => (
                      <div
                        key={p.id}
                        className={`flex items-center gap-3 p-2 cursor-pointer hover:bg-accent/50 transition-colors ${selectedDbPlayer?.id === p.id ? 'bg-accent' : ''}`}
                        onClick={() => setSelectedDbPlayer(p)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={p.image_url || ""} />
                          <AvatarFallback className="text-[10px]">{p.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{[p.position, p.club, p.nationality].filter(Boolean).join(" · ")}</p>
                        </div>
                        {selectedDbPlayer?.id === p.id && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">Selected</Badge>
                        )}
                      </div>
                    ))}
                    {filteredDbPlayers.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No players found</p>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Show manual fields only when in manual mode or editing */}
                {(addMode === 'manual' || editingProspect) && (
                  <>
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
                  </>
                )}

                {/* Common fields for both modes */}
                {addMode === 'database' && !editingProspect && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Stage *</Label>
                      <Select value={formData.stage} onValueChange={(v: any) => setFormData({ ...formData, stage: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {stages.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
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
                  </div>
                )}

                {(addMode === 'manual' || editingProspect) && (
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
                )}

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={4} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button
                    type="submit"
                    disabled={addMode === 'database' && !editingProspect && !selectedDbPlayer}
                  >
                    {editingProspect ? "Update" : "Add"} Prospect
                  </Button>
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
                onEditDetails={handleEditDetails}
                isOver={overStage === stage.value}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeProspect ? <DragOverlayCard prospect={activeProspect} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Edit Details Dialog */}
      <EditDetailsDialog
        prospect={detailsProspect}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        onSaved={fetchAllProspects}
      />

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
