import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Eye, EyeOff, ExternalLink, Save, X, Loader2, GripVertical, Shield } from "lucide-react";
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
  const [contentConfig, setContentConfig] = useState<Record<string, any>>({});
  const [comparisonPlayers, setComparisonPlayers] = useState<any[]>([]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('transfer_reports').select('*').eq('id', reportId).single();
      if (data) {
        setReport(data);
        setSections(data.included_sections || []);
        setSectionOrder(data.section_order || DEFAULT_ORDER);
        setCustomNotes(data.custom_notes || '');
        setTitle(data.title || '');

        // Parse content_config
        let config: Record<string, any> = {};
        if (data.content_config) {
          if (typeof data.content_config === 'string') {
            try { config = JSON.parse(data.content_config); } catch {}
          } else {
            config = data.content_config as Record<string, any>;
          }
        }
        setContentConfig(config);

        const { data: p } = await supabase.from('players').select('name, image_url, position').eq('id', data.player_id).single();
        setPlayer(p);

        // Fetch comparison players for the position
        if (p?.position) {
          const { data: compData } = await supabase
            .from('comparison_players')
            .select('id, name, club, position')
            .eq('position', p.position)
            .limit(20);
          setComparisonPlayers(compData || []);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [reportId]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('transfer_reports').update({
      included_sections: sections,
      section_order: sectionOrder,
      custom_notes: customNotes || null,
      title,
      content_config: contentConfig,
    }).eq('id', reportId);
    if (error) toast.error('Failed to save');
    else {
      toast.success('Report saved — changes are live');
    }
    setSaving(false);
  };

  // No publish/unpublish - reports are always live

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

  const updateConfig = (key: string, value: any) => {
    setContentConfig(prev => ({ ...prev, [key]: value }));
  };

  const toggleComparisonPlayer = (playerId: string) => {
    const current = (contentConfig.comparison_player_ids || []) as string[];
    const updated = current.includes(playerId)
      ? current.filter((id: string) => id !== playerId)
      : [...current, playerId];
    updateConfig('comparison_player_ids', updated);
  };

  const orderedSections = sectionOrder
    .map(id => ALL_SECTIONS.find(s => s.id === id))
    .filter(Boolean) as typeof ALL_SECTIONS;
  ALL_SECTIONS.forEach(s => {
    if (!orderedSections.find(os => os.id === s.id)) orderedSections.push(s);
  });

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!report) return null;

  const selectedCompIds = (contentConfig.comparison_player_ids || []) as string[];

  return (
    <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-background/95 backdrop-blur-sm py-3 z-10 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bebas uppercase tracking-wider">Edit Report</h2>
            <Badge variant="default">Live</Badge>
          </div>
          <div className="flex items-center gap-2">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left - Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Player info + Title row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card">
                {player?.image_url && <img src={player.image_url} alt={player.name} className="w-12 h-12 rounded-full object-cover" />}
                <div>
                  <p className="font-semibold">{player?.name}</p>
                  <p className="text-xs text-muted-foreground">/{report.slug}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Report Title</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>
            </div>

            {/* Exclusive Representation */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Exclusive Representation</p>
                  <p className="text-xs text-muted-foreground">Shows a banner on the live report</p>
                </div>
              </div>
              <Switch
                checked={!!contentConfig.exclusive_representation}
                onCheckedChange={(checked) => updateConfig('exclusive_representation', checked)}
              />
            </div>

            {/* Sections - Draggable */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Visible Sections (drag to reorder)</Label>
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

            {/* Comparison Player Selection */}
            {sections.includes('comparison') && comparisonPlayers.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Comparison Players</Label>
                <p className="text-xs text-muted-foreground mb-3">Select which players to show in the comparison table. If none selected, the first 3 will be used.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {comparisonPlayers.map(cp => (
                    <button
                      key={cp.id}
                      onClick={() => toggleComparisonPlayer(cp.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-md border text-left text-sm transition-colors ${
                        selectedCompIds.includes(cp.id)
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <Checkbox checked={selectedCompIds.includes(cp.id)} className="pointer-events-none" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-xs">{cp.name}</p>
                        {cp.club && <p className="truncate text-[10px] text-muted-foreground">{cp.club}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Contract Information Config */}
            {sections.includes('contract_info') && (
              <div className="space-y-3">
                <Label className="text-sm font-medium block">Contract Information</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Current Club</Label>
                    <Input
                      value={contentConfig.contract_info?.current_club || ''}
                      onChange={e => updateConfig('contract_info', { ...(contentConfig.contract_info || {}), current_club: e.target.value })}
                      placeholder="e.g. Bolton Wanderers"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Contract Expiry</Label>
                    <Input
                      value={contentConfig.contract_info?.contract_expiry || ''}
                      onChange={e => updateConfig('contract_info', { ...(contentConfig.contract_info || {}), contract_expiry: e.target.value })}
                      placeholder="e.g. June 2026"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Wage</Label>
                    <Input
                      value={contentConfig.contract_info?.wage || ''}
                      onChange={e => updateConfig('contract_info', { ...(contentConfig.contract_info || {}), wage: e.target.value })}
                      placeholder="e.g. £2,500 p/w"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Market Value</Label>
                    <Input
                      value={contentConfig.contract_info?.market_value || ''}
                      onChange={e => updateConfig('contract_info', { ...(contentConfig.contract_info || {}), market_value: e.target.value })}
                      placeholder="e.g. £500k"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Physical Profile Config */}
            {sections.includes('physical_profile') && (
              <div className="space-y-3">
                <Label className="text-sm font-medium block">Physical Profile</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Height</Label>
                    <Input
                      value={contentConfig.physical_profile?.height || ''}
                      onChange={e => updateConfig('physical_profile', { ...(contentConfig.physical_profile || {}), height: e.target.value })}
                      placeholder="e.g. 6'2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Weight</Label>
                    <Input
                      value={contentConfig.physical_profile?.weight || ''}
                      onChange={e => updateConfig('physical_profile', { ...(contentConfig.physical_profile || {}), weight: e.target.value })}
                      placeholder="e.g. 82kg"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Preferred Foot</Label>
                    <Input
                      value={contentConfig.physical_profile?.preferred_foot || ''}
                      onChange={e => updateConfig('physical_profile', { ...(contentConfig.physical_profile || {}), preferred_foot: e.target.value })}
                      placeholder="e.g. Right"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fitness Level</Label>
                    <Input
                      value={contentConfig.physical_profile?.fitness_level || ''}
                      onChange={e => updateConfig('physical_profile', { ...(contentConfig.physical_profile || {}), fitness_level: e.target.value })}
                      placeholder="e.g. High"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Agent Notes Config */}
            {sections.includes('agent_notes') && (
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Agent Notes (visible on report)</Label>
                <Textarea
                  value={contentConfig.agent_notes || ''}
                  onChange={e => updateConfig('agent_notes', e.target.value)}
                  placeholder="Internal agent notes for the report..."
                  rows={4}
                />
              </div>
            )}

            {/* Scouting Notes */}
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Scouting Notes (visible on report)</Label>
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
            <Label className="text-sm font-medium mb-2 block">Live Preview</Label>
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
