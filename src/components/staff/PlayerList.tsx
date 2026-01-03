import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Edit, X, Save } from "lucide-react";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import { useIsMobile } from "@/hooks/use-mobile";

interface Player {
  id: string;
  name: string;
  club: string | null;
  club_logo: string | null;
  league: string | null;
  position: string;
  age: number;
  nationality: string;
  bio: string | null;
  email: string | null;
  image_url: string | null;
  hover_image_url: string | null;
  category: string | null;
  representation_status: string | null;
  visible_on_stars_page: boolean;
  star_order: number | null;
  player_list_order: number | null;
}

type EditableField = 'position' | 'age' | 'club' | 'league' | 'email' | 'representation_status' | 'bio' | 'star_order' | 'player_list_order';

interface FieldEdit {
  [playerId: string]: string | number;
}

export const PlayerList = ({ isAdmin }: { isAdmin: boolean }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const isMobile = useIsMobile();
  const [selectedField, setSelectedField] = useState<EditableField>('position');
  const [fieldEdits, setFieldEdits] = useState<FieldEdit>({});
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    club: "",
    club_logo: "",
    position: "",
    age: 0,
    nationality: "",
    bio: "",
    email: "",
    image_url: "",
    hover_image_url: "",
    representation_status: "",
    visible_on_stars_page: false,
    star_order: null as number | null,
    player_list_order: null as number | null,
  });
  const [uploadingImage, setUploadingImage] = useState<'main' | 'hover' | null>(null);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, club, club_logo, league, position, age, nationality, bio, email, image_url, hover_image_url, category, representation_status, visible_on_stars_page, star_order, player_list_order")
        .neq("category", "Scouted")
        .neq("category", "Fuel For Football")
        .not("representation_status", "in", '("scouted","other")')
        .order("player_list_order", { ascending: true, nullsFirst: false })
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

  const handleFieldEdit = (playerId: string, value: string | number) => {
    setFieldEdits(prev => ({
      ...prev,
      [playerId]: value
    }));
  };

  const handleBulkSave = async () => {
    if (Object.keys(fieldEdits).length === 0) {
      toast.info("No changes to save");
      return;
    }

    setIsSaving(true);
    try {
      const updates = Object.entries(fieldEdits).map(([playerId, value]) => {
        return supabase
          .from("players")
          .update({ [selectedField]: value })
          .eq("id", playerId);
      });

      await Promise.all(updates);
      
      toast.success(`Updated ${Object.keys(fieldEdits).length} player(s)`);
      setFieldEdits({});
      fetchPlayers();
    } catch (error) {
      console.error("Error bulk updating players:", error);
      toast.error("Failed to update players");
    } finally {
      setIsSaving(false);
    }
  };

  const getFieldValue = (player: Player): string | number => {
    const editedValue = fieldEdits[player.id];
    if (editedValue !== undefined) return editedValue;
    
    // For bio, extract plain text if stored as JSON
    if (selectedField === 'bio' && player.bio) {
      try {
        const parsed = JSON.parse(player.bio);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed.bio || parsed.overview || parsed.description || "";
        }
      } catch {
        return player.bio;
      }
    }
    
    const value = player[selectedField as keyof Player];
    if (typeof value === 'boolean') return '';
    return value ?? "";
  };

  // Filter players for star_order - only show star players
  const displayPlayers = selectedField === 'star_order' 
    ? players.filter(p => p.visible_on_stars_page === true)
    : players;

  const getFieldLabel = (field: EditableField): string => {
    const labels: Record<EditableField, string> = {
      position: 'Position',
      age: 'Age',
      club: 'Club',
      league: 'League',
      email: 'Email',
      representation_status: 'Rep Status',
      bio: 'Biography',
      star_order: 'Star Order (Stars Only)',
      player_list_order: 'List Order'
    };
    return labels[field];
  };

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    // Extract plain text bio if stored as JSON
    let bioText = player.bio || "";
    try {
      const parsed = JSON.parse(player.bio || "");
      if (typeof parsed === 'object' && parsed !== null) {
        bioText = parsed.bio || parsed.overview || parsed.description || "";
      }
    } catch {
      // Keep as-is
    }
    setFormData({
      name: player.name,
      club: player.club || "",
      club_logo: player.club_logo || "",
      position: player.position,
      age: player.age,
      nationality: player.nationality,
      bio: bioText,
      email: player.email || "",
      image_url: player.image_url || "",
      hover_image_url: player.hover_image_url || "",
      representation_status: player.representation_status || "",
      visible_on_stars_page: player.visible_on_stars_page || false,
      star_order: player.star_order,
      player_list_order: player.player_list_order,
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
          bio: formData.bio || null,
          email: formData.email || null,
          image_url: formData.image_url || null,
          hover_image_url: formData.hover_image_url || null,
          representation_status: formData.representation_status || null,
          visible_on_stars_page: formData.visible_on_stars_page,
          star_order: formData.star_order,
          player_list_order: formData.player_list_order,
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
      {/* Field Selector and Save Button */}
      {isAdmin && !isMobile && (
        <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3 flex-1">
            <Label htmlFor="field-select" className="text-sm font-medium whitespace-nowrap">
              Edit Field:
            </Label>
            <Select value={selectedField} onValueChange={(value) => {
              setSelectedField(value as EditableField);
              setFieldEdits({});
            }}>
              <SelectTrigger id="field-select" className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="position">Position</SelectItem>
                <SelectItem value="age">Age</SelectItem>
                <SelectItem value="club">Club</SelectItem>
                <SelectItem value="league">League</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="representation_status">Rep Status</SelectItem>
                <SelectItem value="bio">Biography</SelectItem>
                <SelectItem value="star_order">Star Order (Stars Only)</SelectItem>
                <SelectItem value="player_list_order">List Order</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {Object.keys(fieldEdits).length > 0 && (
            <Button 
              onClick={handleBulkSave} 
              disabled={isSaving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save {Object.keys(fieldEdits).length} Change{Object.keys(fieldEdits).length !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      )}
      
      {isMobile ? (
        // Mobile Card View
        <div className="space-y-3">
          {displayPlayers.map((player) => {
            const { club, clubLogo } = getClubInfo(player);
            return (
              <div 
                key={player.id} 
                className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 rounded-full bg-muted overflow-hidden flex-shrink-0">
                    <img
                      src={player.image_url || `/players/${player.name.toLowerCase().replace(/\s+/g, '-')}.png`}
                      alt={player.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/players/player1.jpg';
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold text-base leading-tight">{player.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <img
                            src={getCountryFlagUrl(player.nationality)}
                            alt={player.nationality}
                            className="w-4 h-3 object-cover rounded-sm"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <span className="text-xs text-muted-foreground">{player.nationality}</span>
                        </div>
                      </div>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(player)}
                          className="h-8 w-8 p-0 flex-shrink-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Club</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {clubLogo && (
                            <img
                              src={clubLogo}
                              alt={club || "Club"}
                              className="h-4 w-4 object-contain"
                            />
                          )}
                          <span className="text-sm truncate">{club || "-"}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Position</span>
                        <div className="text-sm font-semibold uppercase tracking-wide mt-0.5">
                          {player.position}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Desktop Table View
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Player</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{getFieldLabel(selectedField)}</TableHead>
                {isAdmin && <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold w-20">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayPlayers.map((player, index) => {
              return (
                <TableRow 
                  key={player.id} 
                  className={`border-0 hover:bg-transparent ${index % 2 === 0 ? 'bg-muted/30' : 'bg-background'}`}
                >
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted overflow-hidden flex-shrink-0">
                        <img
                          src={player.image_url || `/players/${player.name.toLowerCase().replace(/\s+/g, '-')}.png`}
                          alt={player.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/players/player1.jpg';
                          }}
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground leading-tight">{player.name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <img
                            src={getCountryFlagUrl(player.nationality)}
                            alt={player.nationality}
                            className="w-4 h-3 object-cover rounded-sm"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <span className="text-[10px] text-muted-foreground">{player.nationality}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    {isAdmin ? (
                      <div className="space-y-1">
                        {selectedField === 'bio' ? (
                          <textarea
                            value={String(getFieldValue(player))}
                            onChange={(e) => handleFieldEdit(player.id, e.target.value)}
                            className="w-full h-20 max-w-[400px] p-2 text-sm border rounded resize-none"
                            placeholder="Enter biography"
                          />
                        ) : (
                          <Input
                            type={['age', 'star_order', 'player_list_order'].includes(selectedField) ? 'number' : 'text'}
                            value={getFieldValue(player)}
                            onChange={(e) => handleFieldEdit(player.id, ['age', 'star_order', 'player_list_order'].includes(selectedField) ? parseInt(e.target.value) || 0 : e.target.value)}
                            className="h-9 max-w-[300px]"
                            placeholder={`Enter ${getFieldLabel(selectedField).toLowerCase()}`}
                          />
                        )}
                        {selectedField === 'league' && player.club && (
                          <div className="text-xs italic text-muted-foreground">
                            {player.club}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-foreground">{getFieldValue(player) || "-"}</span>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="py-2.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(player)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!editingPlayer} onOpenChange={() => setEditingPlayer(null)}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="player@example.com"
              />
              </div>
              <div>
                <Label htmlFor="image_url">Player Image URL</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) =>
                  setFormData({ ...formData, image_url: e.target.value })
                }
                placeholder="https://example.com/player.png"
              />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hover_image_url">Hover Image URL</Label>
              <Input
                id="hover_image_url"
                value={formData.hover_image_url}
                onChange={(e) =>
                  setFormData({ ...formData, hover_image_url: e.target.value })
                }
                placeholder="https://example.com/hover.png"
              />
              </div>
              <div>
                <Label htmlFor="representation_status">Representation Status</Label>
              <Input
                id="representation_status"
                value={formData.representation_status}
                onChange={(e) =>
                  setFormData({ ...formData, representation_status: e.target.value })
                }
                placeholder="e.g., represented, mandated"
              />
              </div>
            </div>

            <div>
              <Label htmlFor="bio">Biography</Label>
              <textarea
                id="bio"
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                placeholder="Enter player biography..."
                className="w-full min-h-[100px] p-2 text-sm border rounded resize-y"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="visible_on_stars_page"
                checked={formData.visible_on_stars_page}
                onChange={(e) =>
                  setFormData({ ...formData, visible_on_stars_page: e.target.checked })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="visible_on_stars_page">Visible on Stars Page</Label>
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
