import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Edit } from "lucide-react";

interface Player {
  id: string;
  name: string;
  position: string;
  age: number;
  nationality: string;
  bio: string | null;
  image_url: string | null;
}

interface PlayerStats {
  id: string;
  player_id: string;
  goals: number;
  assists: number;
  matches: number;
  minutes: number;
  clean_sheets: number | null;
  saves: number | null;
}

const PlayerManagement = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<Record<string, PlayerStats>>({});
  const [loading, setLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editingStats, setEditingStats] = useState<PlayerStats | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    position: "",
    age: "",
    nationality: "",
    bio: "",
    image_url: "",
  });

  const [statsData, setStatsData] = useState({
    goals: "",
    assists: "",
    matches: "",
    minutes: "",
    clean_sheets: "",
    saves: "",
  });

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("*")
        .order("name");

      if (playersError) throw playersError;

      const { data: statsData, error: statsError } = await supabase
        .from("player_stats")
        .select("*");

      if (statsError) throw statsError;

      setPlayers(playersData || []);
      
      const statsMap: Record<string, PlayerStats> = {};
      statsData?.forEach(stat => {
        statsMap[stat.player_id] = stat;
      });
      setStats(statsMap);
    } catch (error: any) {
      toast.error("Failed to fetch players: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingPlayer) {
        const { error } = await supabase
          .from("players")
          .update({
            name: formData.name,
            position: formData.position,
            age: parseInt(formData.age),
            nationality: formData.nationality,
            bio: formData.bio,
            image_url: formData.image_url,
          })
          .eq("id", editingPlayer.id);

        if (error) throw error;
        toast.success("Player updated successfully");
      } else {
        const { data: newPlayer, error } = await supabase
          .from("players")
          .insert({
            name: formData.name,
            position: formData.position,
            age: parseInt(formData.age),
            nationality: formData.nationality,
            bio: formData.bio,
            image_url: formData.image_url,
          })
          .select()
          .single();

        if (error) throw error;

        // Create default stats for new player
        if (newPlayer) {
          await supabase.from("player_stats").insert({
            player_id: newPlayer.id,
            goals: 0,
            assists: 0,
            matches: 0,
            minutes: 0,
          });
        }

        toast.success("Player created successfully");
      }

      setFormData({ name: "", position: "", age: "", nationality: "", bio: "", image_url: "" });
      setEditingPlayer(null);
      setIsDialogOpen(false);
      fetchPlayers();
    } catch (error: any) {
      toast.error("Failed to save player: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatsSubmit = async (playerId: string) => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from("player_stats")
        .upsert({
          player_id: playerId,
          goals: parseInt(statsData.goals) || 0,
          assists: parseInt(statsData.assists) || 0,
          matches: parseInt(statsData.matches) || 0,
          minutes: parseInt(statsData.minutes) || 0,
          clean_sheets: statsData.clean_sheets ? parseInt(statsData.clean_sheets) : null,
          saves: statsData.saves ? parseInt(statsData.saves) : null,
        });

      if (error) throw error;
      toast.success("Stats updated successfully");
      setEditingStats(null);
      fetchPlayers();
    } catch (error: any) {
      toast.error("Failed to update stats: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this player?")) return;

    try {
      const { error } = await supabase.from("players").delete().eq("id", id);
      if (error) throw error;
      toast.success("Player deleted successfully");
      fetchPlayers();
    } catch (error: any) {
      toast.error("Failed to delete player: " + error.message);
    }
  };

  const startEdit = (player: Player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      position: player.position,
      age: player.age.toString(),
      nationality: player.nationality,
      bio: player.bio || "",
      image_url: player.image_url || "",
    });
    setIsDialogOpen(true);
  };

  const startEditStats = (playerId: string) => {
    const playerStats = stats[playerId];
    if (playerStats) {
      setEditingStats(playerStats);
      setStatsData({
        goals: playerStats.goals.toString(),
        assists: playerStats.assists.toString(),
        matches: playerStats.matches.toString(),
        minutes: playerStats.minutes.toString(),
        clean_sheets: playerStats.clean_sheets?.toString() || "",
        saves: playerStats.saves?.toString() || "",
      });
    }
  };

  if (loading && players.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Player Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingPlayer(null);
              setFormData({ name: "", position: "", age: "", nationality: "", bio: "", image_url: "" });
            }}>
              Add New Player
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPlayer ? "Edit Player" : "Add New Player"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position *</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age *</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationality *</Label>
                  <Input
                    id="nationality"
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : editingPlayer ? "Update Player" : "Create Player"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {players.map((player) => (
          <Card key={player.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{player.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {player.position} | Age {player.age} | {player.nationality}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => startEdit(player)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(player.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {editingStats?.player_id === player.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor={`goals-${player.id}`}>Goals</Label>
                        <Input
                          id={`goals-${player.id}`}
                          type="number"
                          value={statsData.goals}
                          onChange={(e) => setStatsData({ ...statsData, goals: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`assists-${player.id}`}>Assists</Label>
                        <Input
                          id={`assists-${player.id}`}
                          type="number"
                          value={statsData.assists}
                          onChange={(e) => setStatsData({ ...statsData, assists: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`matches-${player.id}`}>Matches</Label>
                        <Input
                          id={`matches-${player.id}`}
                          type="number"
                          value={statsData.matches}
                          onChange={(e) => setStatsData({ ...statsData, matches: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`minutes-${player.id}`}>Minutes</Label>
                        <Input
                          id={`minutes-${player.id}`}
                          type="number"
                          value={statsData.minutes}
                          onChange={(e) => setStatsData({ ...statsData, minutes: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`clean_sheets-${player.id}`}>Clean Sheets</Label>
                        <Input
                          id={`clean_sheets-${player.id}`}
                          type="number"
                          value={statsData.clean_sheets}
                          onChange={(e) => setStatsData({ ...statsData, clean_sheets: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`saves-${player.id}`}>Saves</Label>
                        <Input
                          id={`saves-${player.id}`}
                          type="number"
                          value={statsData.saves}
                          onChange={(e) => setStatsData({ ...statsData, saves: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleStatsSubmit(player.id)} disabled={loading}>
                        Save Stats
                      </Button>
                      <Button variant="outline" onClick={() => setEditingStats(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm space-y-1">
                      <p><strong>Stats:</strong></p>
                      {stats[player.id] ? (
                        <>
                          <p>Goals: {stats[player.id].goals} | Assists: {stats[player.id].assists}</p>
                          <p>Matches: {stats[player.id].matches} | Minutes: {stats[player.id].minutes}</p>
                          {stats[player.id].clean_sheets !== null && (
                            <p>Clean Sheets: {stats[player.id].clean_sheets}</p>
                          )}
                          {stats[player.id].saves !== null && <p>Saves: {stats[player.id].saves}</p>}
                        </>
                      ) : (
                        <p>No stats available</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => startEditStats(player.id)}
                    >
                      Edit Stats
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PlayerManagement;