import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, ExternalLink, Edit, Trash2, Copy, Eye, FileText, Loader2, GripVertical } from "lucide-react";
import { TransferReportEditor } from "./TransferReportEditor";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TransferReport {
  id: string;
  player_id: string;
  title: string;
  slug: string;
  included_sections: string[];
  section_order: string[];
  content_config: Record<string, any>;
  custom_notes: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  player?: { name: string; image_url: string | null };
}

interface Player {
  id: string;
  name: string;
  image_url: string | null;
}

const ALL_SECTIONS = [
  { id: 'in_numbers', label: 'In Numbers' },
  { id: 'highlights', label: 'Highlights Reel' },
  { id: 'biography', label: 'Biography & Profile' },
  { id: 'stats', label: 'Season Statistics' },
  { id: 'data_graphics', label: 'Data Graphics & Visualisations' },
  { id: 'form_chart', label: 'Recent Form' },
  { id: 'tactical', label: 'Tactical History' },
  { id: 'strengths', label: 'Strengths & Play Style' },
  { id: 'comparison', label: 'Player Comparisons' },
  { id: 'clips', label: 'Wyscout Video Reports' },
  { id: 'graphics', label: 'Graphics & Images' },
  { id: 'scouting_notes', label: 'Scouting Notes' },
  { id: 'contract_info', label: 'Contract Information' },
  { id: 'physical_profile', label: 'Physical Profile' },
  { id: 'agent_notes', label: 'Agent Notes (Internal)' },
];

const DEFAULT_ORDER = ALL_SECTIONS.map(s => s.id);

const SortableSectionItem = ({ section, checked, onToggle }: { section: { id: string; label: string }; checked: boolean; onToggle: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2.5 rounded-md border border-border hover:bg-muted/50 transition-colors">
      <div {...listeners} {...attributes} className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground">
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      <span className="text-sm flex-1">{section.label}</span>
    </div>
  );
};

export const TransferReports = () => {
  const [reports, setReports] = useState<TransferReport[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TransferReport | null>(null);
  const [editorReportId, setEditorReportId] = useState<string | null>(null);

  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [title, setTitle] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>(['in_numbers', 'highlights', 'biography', 'stats', 'data_graphics']);
  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_ORDER);
  const [customNotes, setCustomNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => { fetchReports(); fetchPlayers(); }, []);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transfer_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { toast.error('Failed to load reports'); console.error(error); }
    else {
      const playerIds = [...new Set((data || []).map(r => r.player_id))];
      const { data: playerData } = await supabase
        .from('players')
        .select('id, name, image_url')
        .in('id', playerIds);
      const playerMap = new Map((playerData || []).map(p => [p.id, p]));
      setReports((data || []).map(r => ({
        ...r,
        included_sections: r.included_sections || [],
        section_order: r.section_order || DEFAULT_ORDER,
        content_config: (r.content_config || {}) as Record<string, any>,
        player: playerMap.get(r.player_id) || undefined,
      })));
    }
    setLoading(false);
  };

  const fetchPlayers = async () => {
    const { data } = await supabase.from('players').select('id, name, image_url').order('name');
    setPlayers(data || []);
  };

  const generateSlug = (playerName: string) => {
    const base = playerName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const rand = Math.random().toString(36).substring(2, 8);
    return `${base}-${rand}`;
  };

  const handleSave = async () => {
    if (!selectedPlayer || !title) {
      toast.error('Please select a player and add a title');
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const player = players.find(p => p.id === selectedPlayer);
      const slug = editing?.slug || generateSlug(player?.name || 'report');

      const payload = {
        player_id: selectedPlayer,
        title,
        slug,
        included_sections: selectedSections,
        section_order: sectionOrder,
        content_config: {},
        custom_notes: customNotes || null,
        status: 'published',
        created_by: userData?.user?.id || null,
      };

      if (editing) {
        const { error } = await supabase.from('transfer_reports').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Report updated');
      } else {
        const { error } = await supabase.from('transfer_reports').insert(payload);
        if (error) throw error;
        toast.success('Report created');
      }
      setDialogOpen(false);
      resetForm();
      fetchReports();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditing(null);
    setSelectedPlayer('');
    setTitle('');
    setSelectedSections(['in_numbers', 'highlights', 'biography', 'stats', 'data_graphics']);
    setSectionOrder(DEFAULT_ORDER);
    setCustomNotes('');
  };

  const openEdit = (report: TransferReport) => {
    setEditing(report);
    setSelectedPlayer(report.player_id);
    setTitle(report.title);
    setSelectedSections(report.included_sections);
    setSectionOrder(report.section_order || DEFAULT_ORDER);
    setCustomNotes(report.custom_notes || '');
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transfer report?')) return;
    const { error } = await supabase.from('transfer_reports').delete().eq('id', id);
    if (error) toast.error('Failed to delete');
    else { toast.success('Deleted'); fetchReports(); }
  };

  const toggleStatus = async (report: TransferReport) => {
    const newStatus = report.status === 'published' ? 'draft' : 'published';
    const { error } = await supabase.from('transfer_reports').update({ status: newStatus }).eq('id', report.id);
    if (error) toast.error('Failed to update status');
    else { toast.success(`Report ${newStatus === 'published' ? 'published' : 'unpublished'}`); fetchReports(); }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/transfer-report/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const toggleSection = (sectionId: string) => {
    setSelectedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSectionOrder(prev => {
      const oldIndex = prev.indexOf(active.id as string);
      const newIndex = prev.indexOf(over.id as string);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const orderedSections = sectionOrder
    .map(id => ALL_SECTIONS.find(s => s.id === id))
    .filter(Boolean) as typeof ALL_SECTIONS;
  // Add any sections not in the order
  ALL_SECTIONS.forEach(s => {
    if (!orderedSections.find(os => os.id === s.id)) orderedSections.push(s);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Transfer Reports</h3>
          <span className="text-sm text-muted-foreground">({reports.length})</span>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Create Report
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No transfer reports yet. Create one to generate a shareable player report link.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {reports.map(report => (
            <div key={report.id} className="border border-border rounded-lg p-4 bg-card flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {report.player?.image_url && (
                  <img src={report.player.image_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-semibold truncate">{report.title}</h4>
                    <Badge variant={report.status === 'published' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                      {report.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {report.player?.name || 'Unknown Player'} · {report.included_sections.length} sections
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => window.open(`/transfer-report/${report.slug}`, '_blank')} title="Preview">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => copyLink(report.slug)} title="Copy link">
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => toggleStatus(report)} title={report.status === 'published' ? 'Unpublish' : 'Publish'}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setEditorReportId(report.id)} title="Full Editor">
                  <Edit className="w-4 h-4 text-primary" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(report.id)} className="text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Create'} Transfer Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Player *</Label>
                <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                  <SelectTrigger><SelectValue placeholder="Select player" /></SelectTrigger>
                  <SelectContent>
                    {players.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Report Title *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. John Smith - Summer 2026" />
              </div>
            </div>

            <div>
              <Label className="mb-3 block">Sections (drag to reorder, tick to include)</Label>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
                <SortableContext items={orderedSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {orderedSections.map(section => (
                      <SortableSectionItem
                        key={section.id}
                        section={section}
                        checked={selectedSections.includes(section.id)}
                        onToggle={() => toggleSection(section.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            <div>
              <Label>Custom Notes (visible on report)</Label>
              <Textarea
                value={customNotes}
                onChange={e => setCustomNotes(e.target.value)}
                placeholder="Any additional context or notes to include on the report..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : editing ? 'Update Report' : 'Create Report'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Editor Overlay */}
      {editorReportId && (
        <TransferReportEditor
          reportId={editorReportId}
          onClose={() => { setEditorReportId(null); fetchReports(); }}
        />
      )}
    </div>
  );
};
