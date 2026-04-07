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
import { Plus, ExternalLink, Edit, Trash2, Copy, Eye, FileText, Loader2 } from "lucide-react";

interface TransferReport {
  id: string;
  player_id: string;
  title: string;
  slug: string;
  included_sections: string[];
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

export const TransferReports = () => {
  const [reports, setReports] = useState<TransferReport[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TransferReport | null>(null);

  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [title, setTitle] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>(['biography', 'stats']);
  const [customNotes, setCustomNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchReports(); fetchPlayers(); }, []);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transfer_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { toast.error('Failed to load reports'); console.error(error); }
    else {
      // Fetch player names for each report
      const playerIds = [...new Set((data || []).map(r => r.player_id))];
      const { data: playerData } = await supabase
        .from('players')
        .select('id, name, image_url')
        .in('id', playerIds);
      const playerMap = new Map((playerData || []).map(p => [p.id, p]));
      setReports((data || []).map(r => ({
        ...r,
        included_sections: r.included_sections || [],
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
        content_config: {},
        custom_notes: customNotes || null,
        status: editing?.status || 'draft',
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
    setSelectedSections(['biography', 'stats']);
    setCustomNotes('');
  };

  const openEdit = (report: TransferReport) => {
    setEditing(report);
    setSelectedPlayer(report.player_id);
    setTitle(report.title);
    setSelectedSections(report.included_sections);
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
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold truncate">{report.title}</h4>
                  <Badge variant={report.status === 'published' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                    {report.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {report.player?.name || 'Unknown Player'} · {report.included_sections.length} sections
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(report.created_at).toLocaleDateString('en-GB')}
                </p>
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
                <Button variant="ghost" size="icon" onClick={() => openEdit(report)}>
                  <Edit className="w-4 h-4" />
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. John Smith - Summer 2025" />
              </div>
            </div>

            <div>
              <Label className="mb-3 block">Sections to Include</Label>
              <div className="grid grid-cols-2 gap-3">
                {AVAILABLE_SECTIONS.map(section => (
                  <label key={section.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-md border border-border hover:bg-muted/50 transition-colors">
                    <Checkbox
                      checked={selectedSections.includes(section.id)}
                      onCheckedChange={() => toggleSection(section.id)}
                    />
                    <span className="text-sm">{section.label}</span>
                  </label>
                ))}
              </div>
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
    </div>
  );
};
