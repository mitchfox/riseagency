import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Upload, Users } from "lucide-react";

const POSITIONS = [
  'GK', 'CB', 'LB', 'RB', 'LWB', 'RWB',
  'CDM', 'CM', 'CAM', 'LM', 'RM',
  'LW', 'RW', 'CF', 'ST'
];

const METRIC_KEYS = [
  { key: 'r90', label: 'R90' },
  { key: 'xG_adj_per90', label: 'xG (p90)' },
  { key: 'xA_adj_per90', label: 'xA (p90)' },
  { key: 'regains_adj_per90', label: 'Regains (p90)' },
  { key: 'interceptions_per90', label: 'Interceptions (p90)' },
  { key: 'xGChain_per90', label: 'xG Chain (p90)' },
  { key: 'xGBuildup_per90', label: 'xG Buildup (p90)' },
  { key: 'progressive_passes_adj_per90', label: 'Prog. Passes (p90)' },
  { key: 'dribbles_per90', label: 'Dribbles (p90)' },
  { key: 'turnovers_adj_per90', label: 'Turnovers (p90)' },
  { key: 'ShotsOnTarget_per90', label: 'Shots on Target (p90)' },
  { key: 'touches_in_box_per90', label: 'Touches in Box (p90)' },
  { key: 'aerial_duel_win_pct', label: 'Aerial Duel Win %' },
  { key: 'duels_won', label: 'Duels Won' },
];

interface ComparisonPlayer {
  id: string;
  name: string;
  position: string;
  club: string | null;
  season: string;
  image_url: string | null;
  metrics: Record<string, number>;
  r90_average: number | null;
  created_at: string;
}

export const ComparisonPlayerData = () => {
  const [players, setPlayers] = useState<ComparisonPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ComparisonPlayer | null>(null);
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [filterSeason, setFilterSeason] = useState<string>('all');

  const [formData, setFormData] = useState({
    name: '',
    position: '',
    club: '',
    season: '2024/25',
    r90_average: '',
    metrics: {} as Record<string, string>,
  });

  useEffect(() => { fetchPlayers(); }, []);

  const fetchPlayers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('comparison_players')
      .select('*')
      .order('name');
    if (error) { toast.error('Failed to load players'); console.error(error); }
    else setPlayers((data || []).map(p => ({ ...p, metrics: (p.metrics || {}) as Record<string, number> })));
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({ name: '', position: '', club: '', season: '2024/25', r90_average: '', metrics: {} });
    setEditing(null);
  };

  const openEdit = (player: ComparisonPlayer) => {
    setEditing(player);
    setFormData({
      name: player.name,
      position: player.position,
      club: player.club || '',
      season: player.season,
      r90_average: player.r90_average?.toString() || '',
      metrics: Object.fromEntries(
        Object.entries(player.metrics).map(([k, v]) => [k, v?.toString() || ''])
      ),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.position) {
      toast.error('Name and position are required');
      return;
    }
    const metricsObj: Record<string, number> = {};
    Object.entries(formData.metrics).forEach(([k, v]) => {
      if (v !== '') metricsObj[k] = parseFloat(v);
    });

    const payload = {
      name: formData.name,
      position: formData.position,
      club: formData.club || null,
      season: formData.season,
      r90_average: formData.r90_average ? parseFloat(formData.r90_average) : null,
      metrics: metricsObj,
    };

    if (editing) {
      const { error } = await supabase.from('comparison_players').update(payload).eq('id', editing.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Player updated');
    } else {
      const { error } = await supabase.from('comparison_players').insert(payload);
      if (error) { toast.error('Failed to create'); return; }
      toast.success('Player added');
    }
    setDialogOpen(false);
    resetForm();
    fetchPlayers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this comparison player?')) return;
    const { error } = await supabase.from('comparison_players').delete().eq('id', id);
    if (error) toast.error('Failed to delete');
    else { toast.success('Deleted'); fetchPlayers(); }
  };

  const handleImageUpload = async (playerId: string, file: File) => {
    const ext = file.name.split('.').pop();
    const path = `comparison-players/${playerId}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('player-images').upload(path, file, { upsert: true });
    if (uploadError) {
      // Try creating bucket
      await supabase.storage.from('player-images').upload(path, file, { upsert: true });
    }
    const { data: urlData } = supabase.storage.from('player-images').getPublicUrl(path);
    const imageUrl = urlData.publicUrl + '?t=' + Date.now();
    await supabase.from('comparison_players').update({ image_url: imageUrl }).eq('id', playerId);
    toast.success('Image uploaded');
    fetchPlayers();
  };

  const seasons = [...new Set(players.map(p => p.season))].sort().reverse();
  const filtered = players.filter(p => {
    if (filterPosition !== 'all' && p.position !== filterPosition) return false;
    if (filterSeason !== 'all' && p.season !== filterSeason) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Comparison Player Data</h3>
          <span className="text-sm text-muted-foreground">({filtered.length} players)</span>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Player
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filterPosition} onValueChange={setFilterPosition}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Position" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSeason} onValueChange={setFilterSeason}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Season" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Seasons</SelectItem>
            {seasons.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No comparison players stored yet.</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Club</TableHead>
                <TableHead>Season</TableHead>
                <TableHead>R90 Avg</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(player => (
                <TableRow key={player.id}>
                  <TableCell>
                    <div className="relative group">
                      <Avatar className="h-8 w-8">
                        {player.image_url ? (
                          <AvatarImage src={player.image_url} alt={player.name} />
                        ) : null}
                        <AvatarFallback className="text-xs">{player.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <label className="absolute inset-0 cursor-pointer opacity-0 group-hover:opacity-100 bg-black/50 rounded-full flex items-center justify-center transition-opacity">
                        <Upload className="w-3 h-3 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(player.id, file);
                          }}
                        />
                      </label>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{player.name}</TableCell>
                  <TableCell><span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded">{player.position}</span></TableCell>
                  <TableCell>{player.club || '-'}</TableCell>
                  <TableCell>{player.season}</TableCell>
                  <TableCell>{player.r90_average?.toFixed(2) || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(player)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(player.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Add'} Comparison Player</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <Label>Position *</Label>
                <Select value={formData.position} onValueChange={v => setFormData(p => ({ ...p, position: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Club</Label>
                <Input value={formData.club} onChange={e => setFormData(p => ({ ...p, club: e.target.value }))} />
              </div>
              <div>
                <Label>Season</Label>
                <Input value={formData.season} onChange={e => setFormData(p => ({ ...p, season: e.target.value }))} placeholder="e.g. 2024/25" />
              </div>
              <div>
                <Label>Season Average R90</Label>
                <Input type="number" step="0.01" value={formData.r90_average} onChange={e => setFormData(p => ({ ...p, r90_average: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label className="text-base font-semibold">Season Average Metrics</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                {METRIC_KEYS.map(({ key, label }) => (
                  <div key={key}>
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.metrics[key] || ''}
                      onChange={e => setFormData(p => ({
                        ...p,
                        metrics: { ...p.metrics, [key]: e.target.value }
                      }))}
                      placeholder="0.00"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSave}>{editing ? 'Update' : 'Add'} Player</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
