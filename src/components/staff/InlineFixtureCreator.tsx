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
  const [opponent, setOpponent] = useState("");

  const handleCreate = async () => {
    if (!opponent.trim()) {
      toast.error("Opponent name is required");
      return;
    }
    if (!playerId) {
      toast.error("Select a player first");
      return;
    }
    setSaving(true);
    try {
      // Create fixture with opponent as away team, player's club context will be inferred
      const { data, error } = await supabase
        .from("fixtures")
        .insert({
          home_team: "TBC",
          away_team: opponent.trim(),
          match_date: new Date().toISOString().split("T")[0],
        })
        .select("id")
        .single();

      if (error) throw error;

      // Link fixture to the player
      if (data?.id) {
        await supabase.from("player_fixtures").insert({
          player_id: playerId,
          fixture_id: data.id,
        });
      }

      toast.success("Fixture created");
      setShowForm(false);
      setOpponent("");
      onFixtureCreated(data.id);
    } catch (error: any) {
      toast.error("Failed to create fixture: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!showForm) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setShowForm(true)} 
        disabled={!playerId}
        className="h-9 w-9 p-0 shrink-0"
        title={playerId ? "Create new fixture" : "Select a player first"}
      >
        <Plus className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Quick Add Fixture</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="h-6 w-6 p-0">
          <X className="w-3 h-3" />
        </Button>
      </div>
      <div>
        <Label className="text-xs">Opponent *</Label>
        <Input 
          value={opponent} 
          onChange={e => setOpponent(e.target.value)} 
          placeholder="e.g. Vlasim" 
          className="h-8 text-sm"
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />
      </div>
      <Button onClick={handleCreate} disabled={saving} size="sm" className="w-full">
        {saving ? "Creating..." : "Create Fixture"}
      </Button>
    </div>
  );
};
