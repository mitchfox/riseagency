import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InlineFixtureCreatorProps {
  playerId?: string;
  onFixtureCreated: (fixtureId: string) => void;
}

export const InlineFixtureCreator = ({ playerId, onFixtureCreated }: InlineFixtureCreatorProps) => {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    home_team: "",
    away_team: "",
    match_date: new Date().toISOString().split("T")[0],
    competition: "",
    home_score: "" as string,
    away_score: "" as string,
  });

  const handleCreate = async () => {
    if (!form.home_team || !form.away_team || !form.match_date) {
      toast.error("Home team, away team and date are required");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("fixtures")
        .insert({
          home_team: form.home_team,
          away_team: form.away_team,
          match_date: form.match_date,
          competition: form.competition || null,
          home_score: form.home_score ? parseInt(form.home_score) : null,
          away_score: form.away_score ? parseInt(form.away_score) : null,
        })
        .select("id")
        .single();

      if (error) throw error;

      // If we have a playerId, link the fixture to this player
      if (playerId && data?.id) {
        await supabase.from("player_fixtures").insert({
          player_id: playerId,
          fixture_id: data.id,
        });
      }

      toast.success("Fixture created");
      setShowForm(false);
      setForm({ home_team: "", away_team: "", match_date: new Date().toISOString().split("T")[0], competition: "", home_score: "", away_score: "" });
      onFixtureCreated(data.id);
    } catch (error: any) {
      toast.error("Failed to create fixture: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!showForm) {
    return (
      <Button variant="outline" size="sm" onClick={() => setShowForm(true)} className="gap-1">
        <Plus className="w-3 h-3" />
        New Fixture
      </Button>
    );
  }

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Create New Fixture</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="h-6 w-6 p-0">
          <X className="w-3 h-3" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Home Team *</Label>
          <Input value={form.home_team} onChange={e => setForm({ ...form, home_team: e.target.value })} placeholder="Home" className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Away Team *</Label>
          <Input value={form.away_team} onChange={e => setForm({ ...form, away_team: e.target.value })} placeholder="Away" className="h-8 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">Date *</Label>
          <Input type="date" value={form.match_date} onChange={e => setForm({ ...form, match_date: e.target.value })} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Competition</Label>
          <Input value={form.competition} onChange={e => setForm({ ...form, competition: e.target.value })} placeholder="League" className="h-8 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-1">
          <div>
            <Label className="text-xs">H</Label>
            <Input type="number" value={form.home_score} onChange={e => setForm({ ...form, home_score: e.target.value })} className="h-8 text-sm" placeholder="-" />
          </div>
          <div>
            <Label className="text-xs">A</Label>
            <Input type="number" value={form.away_score} onChange={e => setForm({ ...form, away_score: e.target.value })} className="h-8 text-sm" placeholder="-" />
          </div>
        </div>
      </div>
      <Button onClick={handleCreate} disabled={saving} size="sm" className="w-full">
        {saving ? "Creating..." : "Create Fixture"}
      </Button>
    </div>
  );
};
