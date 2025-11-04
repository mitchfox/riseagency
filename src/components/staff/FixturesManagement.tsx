import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

interface Fixture {
  id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  match_date: string;
  competition: string | null;
  venue: string | null;
  created_at: string;
}

export const FixturesManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFixture, setEditingFixture] = useState<Fixture | null>(null);
  const [formData, setFormData] = useState({
    home_team: "",
    away_team: "",
    home_score: null as number | null,
    away_score: null as number | null,
    match_date: new Date(),
    competition: "",
    venue: "",
  });

  useEffect(() => {
    fetchFixtures();
  }, []);

  const fetchFixtures = async () => {
    try {
      const { data, error } = await supabase
        .from("fixtures")
        .select("*")
        .order("match_date", { ascending: false });

      if (error) throw error;
      setFixtures(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch fixtures");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (fixture?: Fixture) => {
    if (fixture) {
      setEditingFixture(fixture);
      setFormData({
        home_team: fixture.home_team,
        away_team: fixture.away_team,
        home_score: fixture.home_score,
        away_score: fixture.away_score,
        match_date: new Date(fixture.match_date),
        competition: fixture.competition || "",
        venue: fixture.venue || "",
      });
    } else {
      setEditingFixture(null);
      setFormData({
        home_team: "",
        away_team: "",
        home_score: null,
        away_score: null,
        match_date: new Date(),
        competition: "",
        venue: "",
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingFixture(null);
    setFormData({
      home_team: "",
      away_team: "",
      home_score: null,
      away_score: null,
      match_date: new Date(),
      competition: "",
      venue: "",
    });
  };

  const handleSave = async () => {
    try {
      const dataToSave = {
        home_team: formData.home_team,
        away_team: formData.away_team,
        home_score: formData.home_score,
        away_score: formData.away_score,
        match_date: format(formData.match_date, "yyyy-MM-dd"),
        competition: formData.competition || null,
        venue: formData.venue || null,
      };

      if (editingFixture) {
        const { error } = await supabase
          .from("fixtures")
          .update(dataToSave)
          .eq("id", editingFixture.id);

        if (error) throw error;
        toast.success("Fixture updated successfully");
      } else {
        const { error } = await supabase.from("fixtures").insert([dataToSave]);

        if (error) throw error;
        toast.success("Fixture created successfully");
      }

      handleCloseDialog();
      fetchFixtures();
    } catch (error: any) {
      toast.error("Failed to save fixture");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this fixture?")) return;

    try {
      const { error } = await supabase.from("fixtures").delete().eq("id", id);

      if (error) throw error;
      toast.success("Fixture deleted successfully");
      fetchFixtures();
    } catch (error: any) {
      toast.error("Failed to delete fixture");
      console.error(error);
    }
  };

  if (loading) {
    return <div>Loading fixtures...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Fixtures</h2>
        {isAdmin && (
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            New Fixture
          </Button>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingFixture ? "Edit" : "New"} Fixture
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Home Team</Label>
                <Input
                  value={formData.home_team}
                  onChange={(e) =>
                    setFormData({ ...formData, home_team: e.target.value })
                  }
                  placeholder="Home Team"
                />
              </div>
              <div>
                <Label>Away Team</Label>
                <Input
                  value={formData.away_team}
                  onChange={(e) =>
                    setFormData({ ...formData, away_team: e.target.value })
                  }
                  placeholder="Away Team"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Home Score</Label>
                <Input
                  type="number"
                  value={formData.home_score || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      home_score: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="Score"
                />
              </div>
              <div>
                <Label>Away Score</Label>
                <Input
                  type="number"
                  value={formData.away_score || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      away_score: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="Score"
                />
              </div>
            </div>

            <div>
              <Label>Match Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.match_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.match_date ? (
                      format(formData.match_date, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.match_date}
                    onSelect={(date) =>
                      date && setFormData({ ...formData, match_date: date })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Competition</Label>
              <Input
                value={formData.competition}
                onChange={(e) =>
                  setFormData({ ...formData, competition: e.target.value })
                }
                placeholder="e.g., Premier League, Champions League"
              />
            </div>

            <div>
              <Label>Venue</Label>
              <Input
                value={formData.venue}
                onChange={(e) =>
                  setFormData({ ...formData, venue: e.target.value })
                }
                placeholder="Stadium name"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Fixture</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {fixtures.map((fixture) => (
          <Card key={fixture.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <span className="text-lg">
                    {fixture.home_team}{" "}
                    {fixture.home_score !== null && fixture.away_score !== null && (
                      <span className="text-primary">
                        {fixture.home_score} - {fixture.away_score}
                      </span>
                    )}{" "}
                    {fixture.away_team}
                  </span>
                  {fixture.competition && (
                    <span className="text-sm text-muted-foreground">
                      • {fixture.competition}
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(fixture)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(fixture.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>{new Date(fixture.match_date).toLocaleDateString()}</span>
                {fixture.venue && <span>• {fixture.venue}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};