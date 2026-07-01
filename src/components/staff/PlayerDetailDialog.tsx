import React, { memo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { BlurTextarea } from '@/components/staff/BlurTextarea';
import { Edit, Loader2, UserPlus } from 'lucide-react';
import { PlayerNotesBoard } from './PlayerNotesBoard';
import { calculateAge } from '@/lib/ageUtils';

const buildPlayerKey = (name: string | null | undefined, dob: string | null | undefined) =>
  name && dob ? `${name.trim().toLowerCase()}::${dob}` : '';

export interface DialogPlayer {
  id: string;
  player_name: string;
  position: string | null;
  age: number | null;
  current_club: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  report_count: number;
  source: 'database' | 'scouting' | 'youth_outreach' | 'pro_outreach';
  notes?: string | null;
  ig_handle?: string | null;
  profile_image_url?: string | null;
  parents_name?: string | null;
  parent_contact?: string | null;
  parent_approval?: boolean;
}

interface Props {
  player: DialogPlayer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (updated: DialogPlayer) => void;
  eligibilityBadge?: React.ReactNode;
}

const PlayerDetailDialogInner: React.FC<Props> = ({ player, open, onOpenChange, onUpdated, eligibilityBadge }) => {
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [notesReady, setNotesReady] = useState(false);
  const [creatingOutreach, setCreatingOutreach] = useState(false);

  // Hydrate the form only when a new player is opened, not on every parent render.
  useEffect(() => {
    if (!open || !player) return;
    setEditMode(false);
    setNotesReady(false);
    setEditForm({
      player_name: player.player_name,
      position: player.position || '',
      nationality: player.nationality || '',
      current_club: player.current_club || '',
      date_of_birth: player.date_of_birth || '',
      ig_handle: player.ig_handle || '',
      notes: player.notes || '',
      parents_name: player.parents_name || '',
      parent_contact: player.parent_contact || '',
      national_team: false,
      star_of_team: false,
      previous_serious_injury: '',
      agent_status: '',
      agent_name: '',
      parent_approval: !!player.parent_approval,
    });
    // Defer the notes board and fit-score fetch until after the dialog paints.
    const idle = (cb: () => void) => {
      const w: any = window;
      if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(cb, { timeout: 200 });
      else window.setTimeout(cb, 80);
    };
    idle(() => setNotesReady(true));
    if (player.source === 'database') {
      idle(async () => {
        const { data } = await (supabase as any)
          .from('players')
          .select('national_team,star_of_team,previous_serious_injury,agent_status,agent_name')
          .eq('id', player.id)
          .maybeSingle();
        if (data) {
          setEditForm((f: any) => ({
            ...f,
            national_team: !!data.national_team,
            star_of_team: !!data.star_of_team,
            previous_serious_injury: data.previous_serious_injury || '',
            agent_status: data.agent_status || '',
            agent_name: data.agent_name || '',
          }));
        }
      });
    } else if (player.source === 'youth_outreach' || player.source === 'pro_outreach') {
      const tableName = player.source === 'youth_outreach' ? 'player_outreach_youth' : 'player_outreach_pro';
      const cols = player.source === 'youth_outreach'
        ? 'national_team,star_of_team,previous_serious_injury,agent_status,agent_name,parent_approval'
        : 'national_team,star_of_team,previous_serious_injury,agent_status,agent_name';
      idle(async () => {
        const { data } = await (supabase as any).from(tableName).select(cols).eq('id', player.id).maybeSingle();
        if (data) {
          setEditForm((f: any) => ({
            ...f,
            national_team: !!data.national_team,
            star_of_team: !!data.star_of_team,
            previous_serious_injury: data.previous_serious_injury || '',
            agent_status: data.agent_status || '',
            agent_name: data.agent_name || '',
            parent_approval: !!data.parent_approval,
          }));
        }
      });
    }
  }, [open, player?.id]);

  if (!player) return null;

  const createPlayerOutreach = async () => {
    if (!player.player_name?.trim()) return;
    setCreatingOutreach(true);
    try {
      const cleanName = player.player_name.trim();
      let query = (supabase as any)
        .from('players')
        .select('id, name, position, club, nationality, date_of_birth, representation_status, has_representation_offer, offer_status, instagram_handle')
        .ilike('name', cleanName);
      if (player.date_of_birth) query = query.eq('date_of_birth', player.date_of_birth);
      let { data: existingRows, error } = await query.limit(1);
      if (error) throw error;
      if ((!existingRows || existingRows.length === 0) && player.date_of_birth) {
        const fallback = await (supabase as any)
          .from('players')
          .select('id, name, position, club, nationality, date_of_birth, representation_status, has_representation_offer, offer_status, instagram_handle')
          .ilike('name', cleanName)
          .limit(1);
        if (fallback.error) throw fallback.error;
        existingRows = fallback.data || [];
      }
      const existing = existingRows?.[0] || null;
      const cleanIg = (player.ig_handle || '').replace(/^@/, '').trim() || null;
      if (existing) {
        const updatePayload: any = {
          has_representation_offer: true,
          offer_status: existing.offer_status || 'draft',
          representation_status: existing.representation_status || 'prospect',
          position: existing.position || player.position || 'Other',
          club: existing.club || player.current_club || null,
          nationality: existing.nationality || player.nationality || 'Unknown',
          date_of_birth: existing.date_of_birth || player.date_of_birth || null,
          instagram_handle: existing.instagram_handle || cleanIg,
        };
        const { error: updateError } = await (supabase as any).from('players').update(updatePayload).eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await (supabase as any).from('players').insert({
          name: cleanName,
          position: player.position || 'Other',
          age: player.age || null,
          nationality: player.nationality || 'Unknown',
          club: player.current_club || null,
          date_of_birth: player.date_of_birth || null,
          instagram_handle: cleanIg,
          representation_status: 'prospect',
          has_representation_offer: true,
          offer_status: 'draft',
        });
        if (insertError) throw insertError;
      }
      toast.success('Player outreach draft created');
      onOpenChange(false);
      navigate(`/staff?section=representationoffers&player=${encodeURIComponent(cleanName)}`);
    } catch (error: any) {
      toast.error(error?.message || 'Could not create player outreach');
    } finally {
      setCreatingOutreach(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      if (player.source === 'database') {
        const payload = {
          name: editForm.player_name,
          position: editForm.position || null,
          nationality: editForm.nationality || null,
          club: editForm.current_club || null,
          date_of_birth: editForm.date_of_birth || null,
          bio: editForm.notes || null,
          instagram_handle: editForm.ig_handle || null,
          national_team: !!editForm.national_team,
          star_of_team: !!editForm.star_of_team,
          previous_serious_injury: editForm.previous_serious_injury || null,
          agent_status: editForm.agent_status || null,
          agent_name: editForm.agent_name || null,
        };
        const { error } = await supabase.from('players').update(payload).eq('id', player.id);
        if (error) throw error;
        const updatedPlayer: DialogPlayer = {
          ...player,
          player_name: editForm.player_name,
          position: editForm.position || null,
          nationality: editForm.nationality || null,
          current_club: editForm.current_club || null,
          date_of_birth: editForm.date_of_birth || null,
          age: calculateAge(editForm.date_of_birth) ?? player.age,
          ig_handle: editForm.ig_handle || null,
          notes: editForm.notes || null,
        };
        onUpdated(updatedPlayer);
        toast.success('Player updated');
        setEditMode(false);
        return;
      }
      const tableName = player.source === 'scouting' ? 'scouting_reports'
        : player.source === 'youth_outreach' ? 'player_outreach_youth' : 'player_outreach_pro';
      const isOutreach = player.source === 'youth_outreach' || player.source === 'pro_outreach';
      const payload: any = {
        player_name: editForm.player_name,
        position: editForm.position || null,
        nationality: editForm.nationality || null,
        current_club: editForm.current_club || null,
        date_of_birth: editForm.date_of_birth || null,
        notes: editForm.notes || null,
        ...(player.source === 'youth_outreach' ? {
          parents_name: editForm.parents_name || null,
          parent_contact: editForm.parent_contact || null,
          parent_approval: !!editForm.parent_approval,
        } : {}),
        ...(isOutreach ? {
          national_team: !!editForm.national_team,
          star_of_team: !!editForm.star_of_team,
          previous_serious_injury: editForm.previous_serious_injury || null,
          agent_status: editForm.agent_status || null,
          agent_name: editForm.agent_name || null,
          ig_handle: editForm.ig_handle || null,
        } : {}),
      };
      const { error } = await supabase.from(tableName as any).update(payload).eq('id', player.id);
      if (error) throw error;
      const updatedPlayer: DialogPlayer = {
        ...player,
        player_name: editForm.player_name,
        position: editForm.position || null,
        nationality: editForm.nationality || null,
        current_club: editForm.current_club || null,
        date_of_birth: editForm.date_of_birth || null,
        age: calculateAge(editForm.date_of_birth) ?? player.age,
        ig_handle: isOutreach ? (editForm.ig_handle || null) : player.ig_handle,
        notes: editForm.notes || null,
        parents_name: player.source === 'youth_outreach' ? (editForm.parents_name || null) : player.parents_name,
        parent_contact: player.source === 'youth_outreach' ? (editForm.parent_contact || null) : player.parent_contact,
        parent_approval: player.source === 'youth_outreach' ? !!editForm.parent_approval : player.parent_approval,
      };
      onUpdated(updatedPlayer);
      toast.success('Player updated');
      setEditMode(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{editMode ? 'Edit Player' : 'Player Details'}</span>
            {!editMode && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={createPlayerOutreach} disabled={creatingOutreach} className="gap-1">
                  {creatingOutreach ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                  Create player outreach
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditMode(true)} className="gap-1">
                  <Edit className="h-3 w-3" /> Edit
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>
        {!editMode && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14">
                <AvatarImage src={player.profile_image_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-primary font-semibold">
                  {player.player_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-lg">{player.player_name}</h3>
                <div className="flex items-center gap-2">
                  {eligibilityBadge}
                  <Badge variant="secondary" className="text-[10px]">{player.source === 'database' ? 'Database' : player.source === 'scouting' ? 'Scouting' : player.source === 'youth_outreach' ? 'Youth' : 'Pro'}</Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground text-xs">Position</span><p className="font-medium">{player.position || '-'}</p></div>
              <div><span className="text-muted-foreground text-xs">Age</span><p className="font-medium">{player.age || '-'}</p></div>
              <div><span className="text-muted-foreground text-xs">Date of Birth</span><p className="font-medium">{player.date_of_birth ? new Date(player.date_of_birth).toLocaleDateString('en-GB') : '-'}</p></div>
              <div><span className="text-muted-foreground text-xs">Nationality</span><p className="font-medium">{player.nationality || '-'}</p></div>
              <div className="col-span-2"><span className="text-muted-foreground text-xs">Club</span><p className="font-medium">{player.current_club || '-'}</p></div>
              {player.ig_handle && (
                <div className="col-span-2"><span className="text-muted-foreground text-xs">Instagram</span><p className="font-medium">@{player.ig_handle.replace(/^@/, '')}</p></div>
              )}
              {player.parents_name && (
                <div><span className="text-muted-foreground text-xs">Parent Name</span><p className="font-medium">{player.parents_name}</p></div>
              )}
              {player.parent_contact && (
                <div><span className="text-muted-foreground text-xs">Parent IG</span><p className="font-medium">@{player.parent_contact.replace(/^@/, '')}</p></div>
              )}
              <div><span className="text-muted-foreground text-xs">Reports</span><p className="font-medium">{player.report_count}</p></div>
              {player.notes && <div className="col-span-2"><span className="text-muted-foreground text-xs">Notes</span><p className="text-muted-foreground text-sm">{player.notes}</p></div>}
            </div>
            {notesReady && <div className="pt-2 border-t border-border/40">
              <PlayerNotesBoard
                playerKey={buildPlayerKey(player.player_name, player.date_of_birth)}
                playerName={player.player_name}
                source={player.source}
                sourceId={player.id}
              />
            </div>}
          </div>
        )}
        {editMode && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={editForm.player_name || ''} onChange={e => setEditForm((f: any) => ({ ...f, player_name: e.target.value }))} /></div>
              <div className="space-y-1"><Label className="text-xs">Position</Label><Input value={editForm.position || ''} onChange={e => setEditForm((f: any) => ({ ...f, position: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Nationality</Label><Input value={editForm.nationality || ''} onChange={e => setEditForm((f: any) => ({ ...f, nationality: e.target.value }))} /></div>
              <div className="space-y-1"><Label className="text-xs">Club</Label><Input value={editForm.current_club || ''} onChange={e => setEditForm((f: any) => ({ ...f, current_club: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Date of Birth</Label><Input type="date" value={editForm.date_of_birth} onChange={e => setEditForm({ ...editForm, date_of_birth: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Instagram</Label><Input value={editForm.ig_handle || ''} onChange={e => setEditForm((f: any) => ({ ...f, ig_handle: e.target.value }))} /></div>
            </div>
            {player.source === 'youth_outreach' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Parent Name</Label><Input value={editForm.parents_name || ''} onChange={e => setEditForm((f: any) => ({ ...f, parents_name: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Parent IG</Label><Input value={editForm.parent_contact || ''} onChange={e => setEditForm((f: any) => ({ ...f, parent_contact: e.target.value }))} /></div>
              </div>
            )}
            {(player.source === 'database' || player.source === 'youth_outreach' || player.source === 'pro_outreach') && (
              <div className="space-y-3 rounded-md border border-border/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fit-score signals</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center justify-between gap-2 text-sm">
                    <span>National team</span>
                    <Switch checked={!!editForm.national_team} onCheckedChange={(v) => setEditForm((f: any) => ({ ...f, national_team: v }))} />
                  </label>
                  <label className="flex items-center justify-between gap-2 text-sm">
                    <span>Star of team</span>
                    <Switch checked={!!editForm.star_of_team} onCheckedChange={(v) => setEditForm((f: any) => ({ ...f, star_of_team: v }))} />
                  </label>
                  {player.source === 'youth_outreach' && (
                    <label className="flex items-center justify-between gap-2 text-sm col-span-2">
                      <span>Parent approval</span>
                      <Switch checked={!!editForm.parent_approval} onCheckedChange={(v) => setEditForm((f: any) => ({ ...f, parent_approval: v }))} />
                    </label>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Agent status</Label>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                      value={editForm.agent_status || ''}
                      onChange={(e) => setEditForm((f: any) => ({ ...f, agent_status: e.target.value }))}
                    >
                      <option value="">Unknown</option>
                      <option value="unrepresented">Unrepresented</option>
                      <option value="family">Family</option>
                      <option value="represented">Represented</option>
                      <option value="top_agency">Top agency</option>
                    </select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Agent name</Label><Input value={editForm.agent_name || ''} onChange={e => setEditForm((f: any) => ({ ...f, agent_name: e.target.value }))} /></div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Previous serious injury</Label>
                  <Input value={editForm.previous_serious_injury || ''} onChange={e => setEditForm((f: any) => ({ ...f, previous_serious_injury: e.target.value }))} placeholder="e.g. ACL 2023" />
                </div>
              </div>
            )}
            <div className="space-y-1"><Label className="text-xs">Notes</Label><BlurTextarea value={editForm.notes} onCommit={(v: string) => setEditForm((f: any) => ({ ...f, notes: v }))} rows={2} /></div>
            <div className="flex gap-2">
              <Button onClick={handleSaveEdit} className="flex-1">Save</Button>
              <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const PlayerDetailDialog = memo(PlayerDetailDialogInner);