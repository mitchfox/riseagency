import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Upload, Users, Wand2, Loader2 } from "lucide-react";

const POSITIONS = [
  'GK', 'CB', 'LB', 'RB', 'LWB', 'RWB',
  'CDM', 'CM', 'CAM', 'LM', 'RM',
  'LW', 'RW', 'CF', 'ST'
];

export const METRIC_CATEGORIES = [
  {
    category: 'Shooting',
    metrics: [
      { key: 'goals_per90', label: 'Goals' },
      { key: 'npxg_per90', label: 'npxG' },
      { key: 'shots_on_target_per90', label: 'Shots On Target' },
      { key: 'on_target_pct', label: 'On Target %' },
      { key: 'created_own_shot_per90', label: 'Created Own Shot' },
      { key: 'total_shots_per90', label: 'Total Shots' },
      { key: 'shots_outside_box_per90', label: 'Shots Outside Box' },
      { key: 'shots_inside_box_per90', label: 'Shots Inside Box' },
    ]
  },
  {
    category: 'Passing',
    metrics: [
      { key: 'assists_per90', label: 'Assists' },
      { key: 'xa_per90', label: 'xA' },
      { key: 'key_passes_per90', label: 'Key Passes' },
      { key: 'xt_via_live_passes_per90', label: 'xT via Live Passes' },
      { key: 'progressive_passes_per90', label: 'Progressive Passes' },
      { key: 'passes_into_final_3rd_per90', label: 'Passes Into Final 3rd' },
      { key: 'forward_passes_per90', label: 'Forward Passes' },
      { key: 'passes_in_opp_half_per90', label: 'Passes in Opp. Half' },
      { key: 'passes_in_own_half_per90', label: 'Passes in Own Half' },
      { key: 'accurate_passes_per90', label: 'Accurate Passes' },
      { key: 'accurate_long_balls_per90', label: 'Accurate Long Balls' },
      { key: 'accurate_crosses_per90', label: 'Accurate Crosses' },
      { key: 'pass_accuracy_pct', label: 'Pass Accuracy %' },
      { key: 'long_ball_accuracy_pct', label: 'Long Ball Accuracy %' },
      { key: 'cross_accuracy_pct', label: 'Cross Accuracy %' },
    ]
  },
  {
    category: 'Possession',
    metrics: [
      { key: 'successful_dribbles_per90', label: 'Successful Dribbles' },
      { key: 'dribble_attempts_per90', label: 'Dribble Attempts' },
      { key: 'dribble_success_pct', label: 'Dribble Success %' },
      { key: 'progressive_carries_per90', label: 'Progressive Carries' },
      { key: 'xt_via_prog_carries_per90', label: 'xT via Prog. Carries' },
      { key: 'carries_into_final_3rd_per90', label: 'Carries Into Final ⅓' },
      { key: 'touches_in_opp_box_per90', label: 'Touches In Opp. Box' },
      { key: 'fouls_drawn_per90', label: 'Fouls Drawn' },
    ]
  },
  {
    category: 'Defending',
    metrics: [
      { key: 'tackles_won_pct', label: 'Tackles Won %' },
      { key: 'aerials_won_pct', label: 'Aerials Won %' },
      { key: 'duels_won_pct', label: 'Duels Won %' },
      { key: 'tackles_won_per90', label: 'Tackles Won' },
      { key: 'aerials_won_per90', label: 'Aerials Won' },
      { key: 'duels_won_per90', label: 'Duels Won' },
      { key: 'clearances_per90', label: 'Clearances' },
      { key: 'interceptions_per90', label: 'Interceptions' },
    ]
  },
];

export const ALL_METRICS = METRIC_CATEGORIES.flatMap(c => c.metrics);

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
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiImages, setAiImages] = useState<File[]>([]);
  const [aiName, setAiName] = useState('');
  const [aiPosition, setAiPosition] = useState('');
  const [aiSeason, setAiSeason] = useState('2024/25');
  const [aiClub, setAiClub] = useState('');

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
      await supabase.storage.from('player-images').upload(path, file, { upsert: true });
    }
    const { data: urlData } = supabase.storage.from('player-images').getPublicUrl(path);
    const imageUrl = urlData.publicUrl + '?t=' + Date.now();
    await supabase.from('comparison_players').update({ image_url: imageUrl }).eq('id', playerId);
    toast.success('Image uploaded');
    fetchPlayers();
  };

  const handleAiExtract = async () => {
    if (!aiName || !aiPosition || aiImages.length === 0) {
      toast.error('Please provide name, position and at least one image');
      return;
    }
    setAiLoading(true);
    try {
      // Convert images to base64
      const imageContents: string[] = [];
      for (const file of aiImages) {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        const mimeType = file.type || 'image/png';
        imageContents.push(`data:${mimeType};base64,${base64}`);
      }

      const { data, error } = await invokeEdgeFunction('extract-player-stats', {
        body: { images: imageContents }
      });

      if (error) throw error;
      if (!data?.metrics) throw new Error('No metrics extracted');

      // Insert player with extracted metrics
      const payload = {
        name: aiName,
        position: aiPosition,
        club: aiClub || null,
        season: aiSeason,
        metrics: data.metrics,
        r90_average: null,
      };

      const { error: insertError } = await supabase.from('comparison_players').insert(payload);
      if (insertError) throw insertError;

      toast.success(`${aiName} added with ${Object.keys(data.metrics).length} metrics extracted`);
      setAiDialogOpen(false);
      setAiImages([]);
      setAiName('');
      setAiPosition('');
      setAiClub('');
      setAiSeason('2024/25');
      fetchPlayers();
    } catch (err: any) {
      console.error('AI extraction error:', err);
      toast.error(err.message || 'Failed to extract stats from image');
    } finally {
      setAiLoading(false);
    }
  };

  const seasons = [...new Set(players.map(p => p.season))].sort().reverse();
  const filtered = players.filter(p => {
    if (filterPosition !== 'all' && p.position !== filterPosition) return false;
    if (filterSeason !== 'all' && p.season !== filterSeason) return false;
    return true;
  });

  const filledMetricCount = (metrics: Record<string, number>) => Object.keys(metrics).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Comparison Player Data</h3>
          <span className="text-sm text-muted-foreground">({filtered.length} players)</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAiDialogOpen(true)}>
            <Wand2 className="w-4 h-4 mr-2" /> Add via AI
          </Button>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Player
          </Button>
        </div>
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
                <TableHead>Metrics</TableHead>
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
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{filledMetricCount(player.metrics)} stats</span>
                  </TableCell>
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

            {/* Metrics by category */}
            {METRIC_CATEGORIES.map(cat => (
              <div key={cat.category}>
                <Label className="text-base font-semibold">{cat.category}</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                  {cat.metrics.map(({ key, label }) => (
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
            ))}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSave}>{editing ? 'Update' : 'Add'} Player</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Extract Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" /> Add Player via AI
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Upload stat images (like percentile rank screenshots) and provide the player details. AI will extract all metrics automatically.
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Player Name *</Label>
                <Input value={aiName} onChange={e => setAiName(e.target.value)} placeholder="e.g. Erling Haaland" />
              </div>
              <div>
                <Label>Position *</Label>
                <Select value={aiPosition} onValueChange={setAiPosition}>
                  <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Club</Label>
                <Input value={aiClub} onChange={e => setAiClub(e.target.value)} placeholder="e.g. Manchester City" />
              </div>
              <div>
                <Label>Season</Label>
                <Input value={aiSeason} onChange={e => setAiSeason(e.target.value)} placeholder="2024/25" />
              </div>
            </div>
            <div>
              <Label>Stat Images *</Label>
              <div className="mt-1">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={e => setAiImages(Array.from(e.target.files || []))}
                  className="text-sm"
                />
              </div>
              {aiImages.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{aiImages.length} image(s) selected</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAiDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAiExtract} disabled={aiLoading}>
                {aiLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Extracting...</> : 'Extract & Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
