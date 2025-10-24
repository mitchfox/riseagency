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

interface ExpandedPlayerData {
  // Additional fields that may be stored as JSON in bio or separate columns
  bio?: string;
  dateOfBirth?: string;
  number?: number;
  currentClub?: string;
  whatsapp?: string;
  externalLinks?: { label: string; url: string }[];
  strengthsAndPlayStyle?: string[];
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
    nationality: "",
    bio: "",
    image_url: "",
    dateOfBirth: "",
    number: "",
    currentClub: "",
    whatsapp: "",
  });

  // Calculate age from date of birth
  const calculateAge = (dob: string): number => {
    if (!dob) return 0;
    const parts = dob.split('/');
    if (parts.length !== 3) return 0;
    
    const birthDate = new Date(
      parseInt(parts[2]), // year
      parseInt(parts[1]) - 1, // month (0-indexed)
      parseInt(parts[0]) // day
    );
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const [externalLinks, setExternalLinks] = useState<{ label: string; url: string }[]>([]);
  const [strengthsAndPlayStyle, setStrengthsAndPlayStyle] = useState<string[]>([]);

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
      // Calculate age from date of birth
      const age = calculateAge(formData.dateOfBirth);
      
      if (age === 0 && formData.dateOfBirth) {
        toast.error("Invalid date of birth format. Use DD/MM/YYYY");
        setLoading(false);
        return;
      }

      // Combine bio text with additional structured data
      const bioData: ExpandedPlayerData & { bio?: string } = {
        bio: formData.bio,
        dateOfBirth: formData.dateOfBirth || undefined,
        number: formData.number ? parseInt(formData.number) : undefined,
        currentClub: formData.currentClub || undefined,
        whatsapp: formData.whatsapp || undefined,
        externalLinks: externalLinks.length > 0 ? externalLinks : undefined,
        strengthsAndPlayStyle: strengthsAndPlayStyle.length > 0 ? strengthsAndPlayStyle : undefined,
      };

      const bioString = JSON.stringify(bioData);

      if (editingPlayer) {
        const { error } = await supabase
          .from("players")
          .update({
            name: formData.name,
            position: formData.position,
            age: age,
            nationality: formData.nationality,
            bio: bioString,
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
            age: age,
            nationality: formData.nationality,
            bio: bioString,
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

      setFormData({ 
        name: "", 
        position: "", 
        nationality: "", 
        bio: "", 
        image_url: "",
        dateOfBirth: "",
        number: "",
        currentClub: "",
        whatsapp: "",
      });
      setExternalLinks([]);
      setStrengthsAndPlayStyle([]);
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
    
    // Parse bio for additional fields if it contains JSON
    let additionalData: ExpandedPlayerData = {};
    try {
      if (player.bio && player.bio.startsWith('{')) {
        const parsed = JSON.parse(player.bio);
        additionalData = parsed;
      }
    } catch (e) {
      // Bio is regular text, not JSON
    }
    
    setFormData({
      name: player.name,
      position: player.position,
      nationality: player.nationality,
      bio: typeof additionalData === 'object' && additionalData.bio ? additionalData.bio : (player.bio || ""),
      image_url: player.image_url || "",
      dateOfBirth: additionalData.dateOfBirth || "",
      number: additionalData.number?.toString() || "",
      currentClub: additionalData.currentClub || "",
      whatsapp: additionalData.whatsapp || "",
    });
    
    setExternalLinks(additionalData.externalLinks || []);
    setStrengthsAndPlayStyle(additionalData.strengthsAndPlayStyle || []);
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
              setFormData({ 
                name: "", 
                position: "", 
                nationality: "", 
                bio: "", 
                image_url: "",
                dateOfBirth: "",
                number: "",
                currentClub: "",
                whatsapp: "",
              });
              setExternalLinks([]);
              setStrengthsAndPlayStyle([]);
            }}>
              Add New Player
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPlayer ? "Edit Player" : "Add New Player"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
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
                  <Label htmlFor="dateOfBirth">Date of Birth (DD/MM/YYYY) *</Label>
                  <Input
                    id="dateOfBirth"
                    placeholder="DD/MM/YYYY"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    required
                  />
                  {formData.dateOfBirth && (
                    <p className="text-sm text-muted-foreground">
                      Age: {calculateAge(formData.dateOfBirth)} years old
                    </p>
                  )}
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
                <div className="space-y-2">
                  <Label htmlFor="number">Jersey Number</Label>
                  <Input
                    id="number"
                    type="number"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentClub">Current Club</Label>
                  <Input
                    id="currentClub"
                    value={formData.currentClub}
                    onChange={(e) => setFormData({ ...formData, currentClub: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp Number</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="+447508342901"
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
              
              {/* External Links */}
              <div className="space-y-2">
                <Label>External Links</Label>
                {externalLinks.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Label"
                      value={link.label}
                      onChange={(e) => {
                        const newLinks = [...externalLinks];
                        newLinks[index].label = e.target.value;
                        setExternalLinks(newLinks);
                      }}
                    />
                    <Input
                      placeholder="URL"
                      value={link.url}
                      onChange={(e) => {
                        const newLinks = [...externalLinks];
                        newLinks[index].url = e.target.value;
                        setExternalLinks(newLinks);
                      }}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setExternalLinks(externalLinks.filter((_, i) => i !== index))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setExternalLinks([...externalLinks, { label: "", url: "" }])}
                >
                  Add Link
                </Button>
              </div>

              {/* Strengths and Play Style */}
              <div className="space-y-2">
                <Label>Strengths & Play Style</Label>
                {strengthsAndPlayStyle.map((strength, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Strength or play style characteristic"
                      value={strength}
                      onChange={(e) => {
                        const newStrengths = [...strengthsAndPlayStyle];
                        newStrengths[index] = e.target.value;
                        setStrengthsAndPlayStyle(newStrengths);
                      }}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setStrengthsAndPlayStyle(strengthsAndPlayStyle.filter((_, i) => i !== index))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStrengthsAndPlayStyle([...strengthsAndPlayStyle, ""])}
                >
                  Add Strength
                </Button>
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
              <div className="flex justify-between items-center">
                <CardTitle>{player.name}</CardTitle>
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
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PlayerManagement;