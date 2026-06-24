import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export interface AddedTeam {
  id: string;
  club_name: string;
  country: string | null;
  league: string | null;
  league_level: string | null;
  image_url: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCountry?: string | null;
  defaultLeague?: string | null;
  onCreated?: (team: AddedTeam) => void | Promise<void>;
}

export function AddTeamDialog({ open, onOpenChange, defaultCountry, defaultLeague, onCreated }: Props) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState(defaultCountry ?? "");
  const [league, setLeague] = useState(defaultLeague ?? "");
  const [leagueLevel, setLeagueLevel] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setCountry(defaultCountry ?? "");
    setLeague(defaultLeague ?? "");
    setLeagueLevel("");
    setLogoUrl("");
  };

  const save = async () => {
    const clean = name.trim();
    if (!clean) {
      toast.error("Team name required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        club_name: clean,
        country: country.trim() || null,
        league: league.trim() || null,
        league_level: leagueLevel.trim() || null,
        image_url: logoUrl.trim() || null,
      };
      const { data, error } = await supabase
        .from("club_map_positions")
        .insert(payload)
        .select("id, club_name, country, league, league_level, image_url")
        .single();
      if (error) throw error;
      toast.success(`Added ${data.club_name}`);
      if (onCreated) await onCreated(data as AddedTeam);
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to add team");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a team</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Label className="text-xs">Team name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AC Sparta Praha" autoFocus />
          </div>
          <div>
            <Label className="text-xs">Country</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Czechia" />
          </div>
          <div>
            <Label className="text-xs">League</Label>
            <Input value={league} onChange={(e) => setLeague(e.target.value)} placeholder="e.g. Chance Liga" />
          </div>
          <div>
            <Label className="text-xs">League level</Label>
            <Input value={leagueLevel} onChange={(e) => setLeagueLevel(e.target.value)} placeholder="e.g. 1st / 2nd" />
          </div>
          <div>
            <Label className="text-xs">Logo URL (optional)</Label>
            <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !name.trim()}>{saving ? "Adding…" : "Add team"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddTeamDialog;