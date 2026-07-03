import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Edit, UserPlus, Loader2, Camera, X, Upload, Link2 } from 'lucide-react';
import { PlayerNotesBoard } from './PlayerNotesBoard';
import { PlayerDetailDialog, type DialogPlayer } from './PlayerDetailDialog';
import { calculateAge } from '@/lib/ageUtils';
import { normalisePosition } from '@/lib/positionNormalise';

const buildPlayerKey = (name: string | null | undefined, dob: string | null | undefined) =>
  name && dob ? `${name.trim().toLowerCase()}::${dob}` : '';

interface Props {
  player: DialogPlayer;
  onClose: () => void;
  onUpdated: (updated: DialogPlayer) => void;
  eligibilityBadge?: React.ReactNode;
  fitScore?: number;
}

interface SeasonStats {
  minutes: number;
  matches: number;
  goals: number;
  assists: number;
  clean_sheets?: number | null;
  saves?: number | null;
  updated_at?: string | null;
}

export const PlayerDetailInline: React.FC<Props> = ({ player, onClose, onUpdated, eligibilityBadge, fitScore }) => {
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [creatingOutreach, setCreatingOutreach] = useState(false);
  const [pictureOpen, setPictureOpen] = useState(false);
  const [stats, setStats] = useState<SeasonStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (player.source !== 'database') { setStats(null); return; }
    setStatsLoading(true);
    (async () => {
      const { data } = await supabase
        .from('player_stats')
        .select('minutes, matches, goals, assists, clean_sheets, saves, updated_at')
        .eq('player_id', player.id)
        .maybeSingle();
      setStats(data as SeasonStats | null);
      setStatsLoading(false);
    })();
  }, [player.id, player.source]);

  const createPlayerOutreach = async () => {
    if (!player.player_name?.trim() || creatingOutreach) return;
    setCreatingOutreach(true);
    try {
      const cleanName = player.player_name.trim();
      const { data: existing } = await (supabase as any)
        .from('players')
        .select('id, offer_status, representation_status, position, club, nationality, date_of_birth, instagram_handle')
        .ilike('name', cleanName)
        .limit(1);
      const row = existing?.[0];
      const cleanIg = (player.ig_handle || '').replace(/^@/, '').trim() || null;
      if (row) {
        await (supabase as any).from('players').update({
          has_representation_offer: true,
          offer_status: row.offer_status || 'draft',
          representation_status: row.representation_status || 'prospect',
          position: row.position || player.position || 'Other',
          club: row.club || player.current_club || null,
          nationality: row.nationality || player.nationality || 'Unknown',
          date_of_birth: row.date_of_birth || player.date_of_birth || null,
          instagram_handle: row.instagram_handle || cleanIg,
        }).eq('id', row.id);
      } else {
        await (supabase as any).from('players').insert({
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
      }
      toast.success('Player outreach draft created');
      navigate(`/staff?section=representationoffers&player=${encodeURIComponent(cleanName)}`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not create outreach');
    } finally {
      setCreatingOutreach(false);
    }
  };

  const persistImageUrl = async (url: string) => {
    if (player.source !== 'database') { toast.error('Only database players support picture uploads'); return; }
    const { error } = await supabase.from('players').update({ image_url: url }).eq('id', player.id);
    if (error) { toast.error(error.message); return; }
    onUpdated({ ...player, profile_image_url: url });
    toast.success('Profile picture updated');
    setPictureOpen(false);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `players/${player.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('marketing-gallery').upload(path, file, { upsert: true, contentType: file.type });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from('marketing-gallery').getPublicUrl(path);
    await persistImageUrl(data.publicUrl);
  };

  const fetchFromTransfermarkt = async () => {
    if (!player.transfermarkt_url) { toast.error('No Transfermarkt URL saved for this player'); return; }
    const idMatch = player.transfermarkt_url.match(/\/spieler\/(\d+)/i);
    if (!idMatch) { toast.error('Transfermarkt URL is malformed'); return; }
    const url = `https://img.a.transfermarkt.technology/portrait/big/${idMatch[1]}-1.jpg`;
    await persistImageUrl(url);
  };

  const sourceLabel = player.source === 'database' ? 'Database'
    : player.source === 'scouting' ? 'Scouting'
    : player.source === 'youth_outreach' ? 'Youth' : 'Pro';

  return (
    <div className="rounded-lg border border-[hsl(var(--rise-gold)/0.4)] bg-background/90 p-4 shadow-[0_0_18px_hsl(var(--rise-gold)/0.1)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPictureOpen(true)}
            className="group relative"
            title="Change profile picture"
          >
            <Avatar className="h-16 w-16 ring-2 ring-[hsl(var(--rise-gold)/0.5)] transition group-hover:ring-[hsl(var(--rise-gold))]">
              <AvatarImage src={player.profile_image_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-primary font-bold">
                {player.player_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition">
              <Camera className="h-5 w-5 text-white" />
            </span>
          </button>
          <div>
            <h3 className="font-bold text-lg leading-tight">{player.player_name}</h3>
            <div className="flex items-center gap-2 mt-1">
              {eligibilityBadge}
              <Badge variant="secondary" className="text-[10px]">{sourceLabel}</Badge>
              {typeof fitScore === 'number' && (
                <Badge className="text-[10px] bg-[hsl(var(--rise-gold))] text-black">Fit {fitScore}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={createPlayerOutreach} disabled={creatingOutreach} className="h-8 gap-1 text-xs">
            {creatingOutreach ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
            Player outreach
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="h-8 gap-1 text-xs">
            <Edit className="h-3 w-3" /> Edit
          </Button>
          {player.transfermarkt_url && (
            <a href={player.transfermarkt_url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-md border px-2 text-xs font-semibold bg-[#1a3a5c] text-white hover:bg-[#245080]">TM</a>
          )}
          <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0" title="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="key" className="mt-4">
        <TabsList className="h-9">
          <TabsTrigger value="key" className="text-xs">Key information</TabsTrigger>
          <TabsTrigger value="stats" className="text-xs">Stats</TabsTrigger>
          <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="key" className="pt-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><span className="text-muted-foreground text-[10px] uppercase tracking-wider">Position</span><p className="font-medium">{normalisePosition(player.position) || player.position || '-'}</p></div>
            <div><span className="text-muted-foreground text-[10px] uppercase tracking-wider">Age</span><p className="font-medium">{player.age || calculateAge(player.date_of_birth) || '-'}</p></div>
            <div><span className="text-muted-foreground text-[10px] uppercase tracking-wider">Date of Birth</span><p className="font-medium">{player.date_of_birth ? new Date(player.date_of_birth).toLocaleDateString('en-GB') : '-'}</p></div>
            <div><span className="text-muted-foreground text-[10px] uppercase tracking-wider">Nationality</span><p className="font-medium">{player.nationality || '-'}</p></div>
            <div className="col-span-2"><span className="text-muted-foreground text-[10px] uppercase tracking-wider">Club</span><p className="font-medium">{player.current_club || '-'}</p></div>
            <div><span className="text-muted-foreground text-[10px] uppercase tracking-wider">Reports</span><p className="font-medium">{player.report_count}</p></div>
            {player.ig_handle && (
              <div><span className="text-muted-foreground text-[10px] uppercase tracking-wider">Instagram</span><p className="font-medium">@{player.ig_handle.replace(/^@/, '')}</p></div>
            )}
            {player.parents_name && (
              <div><span className="text-muted-foreground text-[10px] uppercase tracking-wider">Parent</span><p className="font-medium">{player.parents_name}</p></div>
            )}
            {player.parent_contact && (
              <div><span className="text-muted-foreground text-[10px] uppercase tracking-wider">Parent IG</span><p className="font-medium">@{player.parent_contact.replace(/^@/, '')}</p></div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="stats" className="pt-3">
          {statsLoading ? (
            <p className="text-xs text-muted-foreground">Loading stats…</p>
          ) : stats && (stats.minutes || stats.matches || stats.goals || stats.assists) ? (
            <div>
              <div className="grid grid-cols-4 gap-3">
                <StatCard label="Matches" value={stats.matches} />
                <StatCard label="Minutes" value={stats.minutes} />
                <StatCard label="Goals" value={stats.goals} />
                <StatCard label="Assists" value={stats.assists} />
                {stats.clean_sheets != null && <StatCard label="Clean sheets" value={stats.clean_sheets} />}
                {stats.saves != null && <StatCard label="Saves" value={stats.saves} />}
              </div>
              {stats.updated_at && (
                <p className="text-[10px] text-muted-foreground mt-2">Last updated {new Date(stats.updated_at).toLocaleDateString('en-GB')}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No stats stored yet. Use "Refresh all Transfermarkt data" in Player Database Actions to pull the current season.
            </p>
          )}
        </TabsContent>

        <TabsContent value="notes" className="pt-3">
          <PlayerNotesBoard
            playerKey={buildPlayerKey(player.player_name, player.date_of_birth)}
            playerName={player.player_name}
            source={player.source}
            sourceId={player.id}
          />
        </TabsContent>
      </Tabs>

      {/* Edit still opens the existing full dialog to keep parity with the rest of the app. */}
      <PlayerDetailDialog
        player={editOpen ? player : null}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={(u) => { onUpdated(u); }}
        eligibilityBadge={eligibilityBadge}
        initialEdit
      />

      <Dialog open={pictureOpen} onOpenChange={setPictureOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Profile picture</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFileUpload(f); }}
            />
            <Button variant="outline" className="w-full gap-2 justify-start" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" /> Upload from device
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2 justify-start"
              onClick={fetchFromTransfermarkt}
              disabled={!player.transfermarkt_url}
              title={player.transfermarkt_url ? 'Fetch headshot from Transfermarkt' : 'Save a Transfermarkt URL first'}
            >
              <Link2 className="h-4 w-4" /> Fetch from Transfermarkt
            </Button>
            {player.profile_image_url && (
              <Button
                variant="ghost"
                className="w-full gap-2 justify-start text-destructive hover:text-destructive"
                onClick={() => persistImageUrl('')}
              >
                Remove current picture
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPictureOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number | null | undefined }> = ({ label, value }) => (
  <div className="rounded-md border border-border/50 bg-card/50 p-3 text-center">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-xl font-bold">{value ?? '-'}</p>
  </div>
);