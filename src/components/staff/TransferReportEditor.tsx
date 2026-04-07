import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, EyeOff, ExternalLink, Save, X, Loader2, GripVertical } from "lucide-react";
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

interface TransferReportEditorProps {
  reportId: string;
  onClose: () => void;
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

const SortableSection = ({ section, checked, onToggle }: { section: { id: string; label: string }; checked: boolean; onToggle: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-3 rounded-md border border-border hover:bg-muted/50 transition-colors">
      <div {...listeners} {...attributes} className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground">
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      <span className="text-sm">{section.label}</span>
    </div>
  );
};

export const TransferReportEditor = ({ reportId, onClose }: TransferReportEditorProps) => {
  const [report, setReport] = useState<any>(null);
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<string[]>([]);
  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_ORDER);
  const [customNotes, setCustomNotes] = useState('');
  const [title, setTitle] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('transfer_reports').select('*').eq('id', reportId).single();
      if (data) {
        setReport(data);
        setSections(data.included_sections || []);
        setSectionOrder(data.section_order || DEFAULT_ORDER);
        setCustomNotes(data.custom_notes || '');
        setTitle(data.title || '');

        const { data: p } = await supabase.from('players').select('name, image_url').eq('id', data.player_id).single();
        setPlayer(p);
      }
      setLoading(false);
    };
    fetch();
  }, [reportId]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('transfer_reports').update({
      included_sections: sections,
      section_order: sectionOrder,
      custom_notes: customNotes || null,
      title,
    }).eq('id', reportId);
    if (error) toast.error('Failed to save');
    else toast.success('Report updated');
    setSaving(false);
  };

  const toggleStatus = async () => {
    const newStatus = report.status === 'published' ? 'draft' : 'published';
    const { error } = await supabase.from('transfer_reports').update({ status: newStatus }).eq('id', reportId);
    if (error) toast.error('Failed to update');
    else {
      setReport({ ...report, status: newStatus });
      toast.success(newStatus === 'published' ? 'Report published' : 'Report unpublished');
    }
  };

  const toggleSection = (id: string) => {
    setSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
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
  ALL_SECTIONS.forEach(s => {
    if (!orderedSections.find(os => os.id === s.id)) orderedSections.push(s);
  });

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!report) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-background/95 backdrop-blur-sm py-3 z-10 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bebas uppercase tracking-wider">Edit Report</h2>
            <Badge variant={report.status === 'published' ? 'default' : 'secondary'}>
              {report.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleStatus}>
              {report.status === 'published' ? <EyeOff className="w-4 h-4 mr-1.5" /> : <Eye className="w-4 h-4 mr-1.5" />}
              {report.status === 'published' ? 'Unpublish' : 'Publish'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open(`/transfer-report/${report.slug}`, '_blank')}>
              <ExternalLink className="w-4 h-4 mr-1.5" /> View Live
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
              Save
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left - Controls */}
          <div className="space-y-6">
            {/* Player info */}
            <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card">
              {player?.image_url && <img src={player.image_url} alt={player.name} className="w-12 h-12 rounded-full object-cover" />}
              <div>
                <p className="font-semibold">{player?.name}</p>
                <p className="text-xs text-muted-foreground">/{report.slug}</p>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Report Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* Sections - Draggable */}
            <div>
              <label className="text-sm font-medium mb-3 block">Visible Sections (drag to reorder)</label>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={orderedSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1.5">
                    {orderedSections.map(section => (
                      <SortableSection
                        key={section.id}
                        section={section}
                        checked={sections.includes(section.id)}
                        onToggle={() => toggleSection(section.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Scouting Notes (visible on report)</label>
              <Textarea
                value={customNotes}
                onChange={e => setCustomNotes(e.target.value)}
                placeholder="Additional notes visible to the reader..."
                rows={5}
              />
            </div>
          </div>

          {/* Right - Preview */}
          <div>
            <label className="text-sm font-medium mb-2 block">Live Preview</label>
            <div className="rounded-lg border-2 border-border overflow-hidden sticky top-20" style={{ height: '70vh' }}>
              <iframe
                src={`/transfer-report/${report.slug}`}
                className="w-full h-full border-0"
                title="Report Preview"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
