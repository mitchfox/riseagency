import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PlayerFixturesProps {
  playerId: string;
  playerName: string;
  onCreateAnalysis?: (fixtureId: string) => void;
}

interface Fixture {
  id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  match_date: string;
  competition: string | null;
  venue: string | null;
}

interface PlayerFixture {
  id: string;
  fixture_id: string;
  minutes_played: number | null;
  fixtures: Fixture;
}

export const PlayerFixtures = ({ playerId, playerName, onCreateAnalysis }: PlayerFixturesProps) => {
  const [playerFixtures, setPlayerFixtures] = useState<PlayerFixture[]>([]);
  const [allFixtures, setAllFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFixtureId, setSelectedFixtureId] = useState("");
  const [minutesPlayed, setMinutesPlayed] = useState<number | null>(null);
  const [editingPlayerFixture, setEditingPlayerFixture] = useState<PlayerFixture | null>(null);

  useEffect(() => {
    fetchPlayerFixtures();
    fetchAllFixtures();
  }, [playerId]);

  const fetchPlayerFixtures = async () => {
    try {
      const { data, error } = await supabase
        .from("player_fixtures")
        .select(`
          *,
          fixtures(*)
        `)
        .eq("player_id", playerId)
        .order("fixtures(match_date)", { ascending: false });

      if (error) throw error;
      setPlayerFixtures((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching player fixtures:", error);
      toast.error("Failed to fetch fixtures");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllFixtures = async () => {
    try {
      const { data, error } = await supabase
        .from("fixtures")
        .select("*")
        .order("match_date", { ascending: false });

      if (error) throw error;
      setAllFixtures(data || []);
    } catch (error: any) {
      console.error("Error fetching fixtures:", error);
    }
  };

  const handleOpenDialog = (playerFixture?: PlayerFixture) => {
    if (playerFixture) {
      setEditingPlayerFixture(playerFixture);
      setSelectedFixtureId(playerFixture.fixture_id);
      setMinutesPlayed(playerFixture.minutes_played);
    } else {
      setEditingPlayerFixture(null);
      setSelectedFixtureId("");
      setMinutesPlayed(null);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPlayerFixture(null);
    setSelectedFixtureId("");
    setMinutesPlayed(null);
  };

  const handleSave = async () => {
    try {
      if (editingPlayerFixture) {
        const { error } = await supabase
          .from("player_fixtures")
          .update({
            fixture_id: selectedFixtureId,
            minutes_played: minutesPlayed,
          })
          .eq("id", editingPlayerFixture.id);

        if (error) throw error;
        toast.success("Fixture updated successfully");
      } else {
        const { error } = await supabase.from("player_fixtures").insert([
          {
            player_id: playerId,
            fixture_id: selectedFixtureId,
            minutes_played: minutesPlayed,
          },
        ]);

        if (error) throw error;
        toast.success("Fixture added successfully");
      }

      handleCloseDialog();
      fetchPlayerFixtures();
    } catch (error: any) {
      toast.error("Failed to save fixture");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this fixture?")) return;

    try {
      const { error } = await supabase
        .from("player_fixtures")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Fixture removed successfully");
      fetchPlayerFixtures();
    } catch (error: any) {
      toast.error("Failed to remove fixture");
      console.error(error);
    }
  };

  if (loading) {
    return <div>Loading fixtures...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Fixtures for {playerName}</h3>
        <Button size="sm" onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Fixture
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPlayerFixture ? "Edit" : "Add"} Fixture
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Fixture</Label>
              <Select value={selectedFixtureId} onValueChange={setSelectedFixtureId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fixture" />
                </SelectTrigger>
                <SelectContent>
                  {allFixtures.map((fixture) => (
                    <SelectItem key={fixture.id} value={fixture.id}>
                      {fixture.home_team} vs {fixture.away_team} -{" "}
                      {new Date(fixture.match_date).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Minutes Played</Label>
              <Input
                type="number"
                value={minutesPlayed || ""}
                onChange={(e) =>
                  setMinutesPlayed(e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="90"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {playerFixtures.length === 0 ? (
          <p className="text-sm text-muted-foreground">No fixtures added yet.</p>
        ) : (
          playerFixtures.map((pf) => (
            <Card key={pf.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {pf.fixtures.home_team}{" "}
                        {pf.fixtures.home_score !== null &&
                          pf.fixtures.away_score !== null && (
                            <span className="text-primary">
                              {pf.fixtures.home_score} - {pf.fixtures.away_score}
                            </span>
                          )}{" "}
                        {pf.fixtures.away_team}
                      </span>
                      {pf.fixtures.competition && (
                        <span className="text-xs text-muted-foreground">
                          • {pf.fixtures.competition}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                      <span>
                        {new Date(pf.fixtures.match_date).toLocaleDateString()}
                      </span>
                      {pf.minutes_played && <span>• {pf.minutes_played} mins</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {onCreateAnalysis && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onCreateAnalysis(pf.fixture_id)}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Analysis
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenDialog(pf)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(pf.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};