import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Edit, X } from "lucide-react";

interface Player {
  id: string;
  name: string;
  club: string | null;
  club_logo: string | null;
  position: string;
  age: number;
  nationality: string;
  bio: string | null;
}

export const PlayerList = ({ isAdmin }: { isAdmin: boolean }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    club: "",
    club_logo: "",
    position: "",
    age: 0,
    nationality: "",
  });

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, club, club_logo, position, age, nationality, bio")
        .order("name");

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error("Error fetching players:", error);
      toast.error("Failed to load players");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      club: player.club || "",
      club_logo: player.club_logo || "",
      position: player.position,
      age: player.age,
      nationality: player.nationality,
    });
  };

  const handleSave = async () => {
    if (!editingPlayer) return;

    try {
      const { error } = await supabase
        .from("players")
        .update({
          name: formData.name,
          club: formData.club || null,
          club_logo: formData.club_logo || null,
          position: formData.position,
          age: formData.age,
          nationality: formData.nationality,
        })
        .eq("id", editingPlayer.id);

      if (error) throw error;

      toast.success("Player updated successfully");
      setEditingPlayer(null);
      fetchPlayers();
    } catch (error) {
      console.error("Error updating player:", error);
      toast.error("Failed to update player");
    }
  };

  // Helper function to get club info from either column or bio JSON
  const getClubInfo = (player: Player) => {
    // First try the direct columns
    if (player.club) {
      return { club: player.club, clubLogo: player.club_logo };
    }
    
    // Fall back to bio JSON
    try {
      if (player.bio && player.bio.startsWith('{')) {
        const bioData = JSON.parse(player.bio);
        if (bioData.currentClub) {
          return { 
            club: bioData.currentClub, 
            clubLogo: bioData.tacticalFormations?.[0]?.clubLogo || null 
          };
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
    
    return { club: null, clubLogo: null };
  };

  if (loading) {
    return <div>Loading players...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Club</TableHead>
              <TableHead>Club Logo</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map((player) => {
              const { club, clubLogo } = getClubInfo(player);
              return (
                <TableRow key={player.id}>
                  <TableCell className="font-medium">{player.name}</TableCell>
                  <TableCell>{club || "—"}</TableCell>
                  <TableCell>
                    {clubLogo ? (
                      <img
                        src={clubLogo}
                        alt={club || "Club"}
                        className="h-8 w-8 object-contain"
                      />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{player.position}</TableCell>
                  <TableCell>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(player)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingPlayer} onOpenChange={() => setEditingPlayer(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              Edit Player Details
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditingPlayer(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="club">Club</Label>
              <Input
                id="club"
                value={formData.club}
                onChange={(e) =>
                  setFormData({ ...formData, club: e.target.value })
                }
                placeholder="Enter club name"
              />
            </div>

            <div>
              <Label htmlFor="club_logo">Club Logo URL</Label>
              <Input
                id="club_logo"
                value={formData.club_logo}
                onChange={(e) =>
                  setFormData({ ...formData, club_logo: e.target.value })
                }
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div>
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) =>
                  setFormData({ ...formData, position: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) =>
                  setFormData({ ...formData, age: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div>
              <Label htmlFor="nationality">Nationality</Label>
              <Input
                id="nationality"
                value={formData.nationality}
                onChange={(e) =>
                  setFormData({ ...formData, nationality: e.target.value })
                }
              />
            </div>

            <Button onClick={handleSave} className="w-full">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
