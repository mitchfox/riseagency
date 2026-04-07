import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, EyeOff, ExternalLink, Save, X, Loader2 } from "lucide-react";

interface TransferReportEditorProps {
  reportId: string;
  onClose: () => void;
}

const AVAILABLE_SECTIONS = [
  { id: 'biography', label: 'Biography & Profile' },
  { id: 'stats', label: 'Season Statistics' },
  { id: 'form_chart', label: 'Form Chart' },
  { id: 'graphics', label: 'Graphics & Images' },
  { id: 'clips', label: 'Match Clips' },
  { id: 'highlights', label: 'Highlights Reel' },
  { id: 'comparison', label: 'Player Comparisons' },
  { id: 'scouting_notes', label: 'Scouting Notes' },
];

export const TransferReportEditor = ({ reportId, onClose }: TransferReportEditorProps) => {
  const [report, setReport] = useState<any>(null);
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<string[]>([]);
  const [customNotes, setCustomNotes] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('transfer_reports').select('*').eq('id', reportId).single();
      if (data) {
        setReport(data);
        setSections(data.included_sections || []);
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

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!report) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6">
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

        {/* Player info */}
        <div className="flex items-center gap-4 mb-6 p-4 rounded-lg border border-border bg-card">
          {player?.image_url && <img src={player.image_url} alt={player.name} className="w-12 h-12 rounded-full object-cover" />}
          <div>
            <p className="font-semibold">{player?.name}</p>
            <p className="text-xs text-muted-foreground">/{report.slug}</p>
          </div>
        </div>

        {/* Title */}
        <div className="mb-6">
          <label className="text-sm font-medium mb-1.5 block">Report Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        {/* Sections */}
        <div className="mb-6">
          <label className="text-sm font-medium mb-3 block">Visible Sections</label>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_SECTIONS.map(section => (
              <label key={section.id} className="flex items-center gap-2 cursor-pointer p-3 rounded-md border border-border hover:bg-muted/50 transition-colors">
                <Checkbox
                  checked={sections.includes(section.id)}
                  onCheckedChange={() => toggleSection(section.id)}
                />
                <span className="text-sm">{section.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="text-sm font-medium mb-1.5 block">Scouting Notes (visible on report)</label>
          <Textarea
            value={customNotes}
            onChange={e => setCustomNotes(e.target.value)}
            placeholder="Additional notes visible to the reader..."
            rows={5}
          />
        </div>

        {/* Preview iframe */}
        <div className="mb-6">
          <label className="text-sm font-medium mb-2 block">Live Preview</label>
          <div className="rounded-lg border-2 border-border overflow-hidden" style={{ height: '600px' }}>
            <iframe
              src={`/transfer-report/${report.slug}`}
              className="w-full h-full border-0"
              title="Report Preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
