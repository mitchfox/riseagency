import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Edit, X, Save, ChevronUp, ChevronDown, Upload, ArrowUpDown } from "lucide-react";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import { useIsMobile } from "@/hooks/use-mobile";

// Position order for smart sorting
const POSITION_ORDER: Record<string, number> = {
  'GK': 1, 'Goalkeeper': 1,
  'LB': 2, 'Left-Back': 2,
  'LCB': 3,
  'CB': 4, 'Centre-Back': 4,
  'RCB': 5,
  'RB': 6, 'Right-Back': 6,
  'CDM': 7, 'DM': 7,
  'LCM': 8,
  'CM': 9, 'Central Midfielder': 9,
  'RCM': 10,
  'LM': 11,
  'LW': 12, 'Left Winger': 12,
  'AM': 13, 'CAM': 13, 'Attacking Midfielder': 13,
  'RM': 14,
  'RW': 15, 'Right Winger': 15,
  'CF': 16, 'Centre-Forward': 16,
  'ST': 17, 'Striker': 17,
};

type SortField = 'player_list_order' | 'position' | 'age' | 'club' | 'league' | 'name' | 'nationality';
type SortDirection = 'asc' | 'desc';

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
  representation_status: string | null;
  visible_on_stars_page: boolean;
  star_order: number | null;
  player_list_order: number | null;
}

type EditableField = 'position' | 'age' | 'club' | 'club_logo' | 'league' | 'email' | 'representation_status' | 'bio' | 'star_order' | 'player_list_order' | 'image_url' | 'hover_image_url';

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
  const [isMoving, setIsMoving] = useState(false);
  const [sortField, setSortField] = useState<SortField>('player_list_order');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  const mainImageRef = useRef<HTMLInputElement>(null);
  const hoverImageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      // Only show players with valid representation statuses
      const { data, error } = await supabase
        .from("players")
        .select("id, name, club, club_logo, league, position, age, nationality, bio, email, image_url, hover_image_url, representation_status, visible_on_stars_page, star_order, player_list_order")
        .in("representation_status", ["mandated", "represented", "previously_mandated"])
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
  const filteredPlayers = selectedField === 'star_order' 
    ? players.filter(p => p.visible_on_stars_page === true)
    : players;

  // Smart sorting function
  const getPositionSortValue = (position: string): number => {
    const normalized = position?.toUpperCase().replace(/[^A-Z]/g, '') || '';
    for (const [key, value] of Object.entries(POSITION_ORDER)) {
      if (normalized.includes(key.toUpperCase().replace(/[^A-Z]/g, ''))) return value;
    }
    return 99;
  };

  const displayPlayers = [...filteredPlayers].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'player_list_order':
        comparison = (a.player_list_order ?? 999) - (b.player_list_order ?? 999);
        break;
      case 'position':
        comparison = getPositionSortValue(a.position) - getPositionSortValue(b.position);
        break;
      case 'age':
        comparison = a.age - b.age; // youngest first
        break;
      case 'club':
        comparison = (a.club || 'zzz').localeCompare(b.club || 'zzz');
        break;
      case 'league':
        comparison = (a.league || 'zzz').localeCompare(b.league || 'zzz');
        break;
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'nationality':
        comparison = a.nationality.localeCompare(b.nationality);
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Image upload handler
  const handleImageUpload = async (file: File, type: 'main' | 'hover') => {
    setUploadingImage(type);
    const fileExt = file.name.split('.').pop();
    const fileName = `player-images/${Date.now()}_${type}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('analysis-files')
      .upload(fileName, file);

    if (uploadError) {
      toast.error('Failed to upload image');
      setUploadingImage(null);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('analysis-files')
      .getPublicUrl(fileName);

    setUploadingImage(null);
    return publicUrl;
  };

  const getFieldLabel = (field: EditableField): string => {
    const labels: Record<EditableField, string> = {
      position: 'Position',
      age: 'Age',
      club: 'Club',
      club_logo: 'Club Logo',
      league: 'League',
      email: 'Email',
      representation_status: 'Representation Status',
      bio: 'Biography',
      star_order: 'Star Order (Stars Only)',
      player_list_order: 'List Order',
      image_url: 'Main Image',
      hover_image_url: 'Hover Image'
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

  // Move player up in list order
  const movePlayerUp = async (player: Player, index: number) => {
    if (index === 0 || isMoving) return;
    
    setIsMoving(true);
    const prevPlayer = displayPlayers[index - 1];
    const currentOrder = player.player_list_order || index + 1;
    const prevOrder = prevPlayer.player_list_order || index;
    
    try {
      await Promise.all([
        supabase.from("players").update({ player_list_order: prevOrder }).eq("id", player.id),
        supabase.from("players").update({ player_list_order: currentOrder }).eq("id", prevPlayer.id)
      ]);
      await fetchPlayers();
      toast.success(`Moved ${player.name} up`);
    } catch (error) {
      console.error("Error moving player:", error);
      toast.error("Failed to move player");
    } finally {
      setIsMoving(false);
    }
  };

  // Move player down in list order
  const movePlayerDown = async (player: Player, index: number) => {
    if (index === displayPlayers.length - 1 || isMoving) return;
    
    setIsMoving(true);
    const nextPlayer = displayPlayers[index + 1];
    const currentOrder = player.player_list_order || index + 1;
    const nextOrder = nextPlayer.player_list_order || index + 2;
    
    try {
      await Promise.all([
        supabase.from("players").update({ player_list_order: nextOrder }).eq("id", player.id),
        supabase.from("players").update({ player_list_order: currentOrder }).eq("id", nextPlayer.id)
      ]);
      await fetchPlayers();
      toast.success(`Moved ${player.name} down`);
    } catch (error) {
      console.error("Error moving player:", error);
      toast.error("Failed to move player");
    } finally {
      setIsMoving(false);
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
                <SelectItem value="club_logo">Club Logo</SelectItem>
                <SelectItem value="league">League</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="representation_status">Representation Status</SelectItem>
                <SelectItem value="bio">Biography</SelectItem>
                <SelectItem value="star_order">Star Order (Stars Only)</SelectItem>
                <SelectItem value="player_list_order">List Order</SelectItem>
                <SelectItem value="image_url">Main Image</SelectItem>
                <SelectItem value="hover_image_url">Hover Image</SelectItem>
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
                <TableHead 
                  className="text-xs uppercase tracking-wider text-muted-foreground font-semibold w-12 cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('player_list_order')}
                >
                  <div className="flex items-center gap-1">
                    #
                    {sortField === 'player_list_order' && <ArrowUpDown className="h-3 w-3" />}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-xs uppercase tracking-wider text-muted-foreground font-semibold cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Player
                    {sortField === 'name' && <ArrowUpDown className="h-3 w-3" />}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-xs uppercase tracking-wider text-muted-foreground font-semibold cursor-pointer hover:text-foreground"
                  onClick={() => {
                    const fieldToSort = selectedField === 'bio' ? 'name' : 
                      selectedField === 'club' ? 'club' : 
                      selectedField === 'league' ? 'league' : 
                      selectedField === 'position' ? 'position' : 
                      selectedField === 'age' ? 'age' : 'name';
                    handleSort(fieldToSort as SortField);
                  }}
                >
                  <div className="flex items-center gap-1">
                    {getFieldLabel(selectedField)}
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                {isAdmin && <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold w-32">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayPlayers.map((player, index) => {
              return (
                <TableRow 
                  key={player.id} 
                  className={`border-0 hover:bg-transparent ${index % 2 === 0 ? 'bg-muted/30' : 'bg-background'}`}
                >
                  <TableCell className="py-2.5 text-center text-sm text-muted-foreground font-medium">
                    {index + 1}
                  </TableCell>
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
                        ) : ['image_url', 'hover_image_url', 'club_logo'].includes(selectedField) ? (
                          <div className="flex items-center gap-2">
                            {String(getFieldValue(player)) && (
                              <div className="relative w-12 h-12 rounded border overflow-hidden shrink-0 bg-transparent">
                                <img src={String(getFieldValue(player))} alt="" className="w-full h-full object-contain" />
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-0 right-0 h-4 w-4"
                                  onClick={() => handleFieldEdit(player.id, '')}
                                >
                                  <X className="h-2 w-2" />
                                </Button>
                              </div>
                            )}
                            <div>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                id={`upload-${selectedField}-${player.id}`}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const url = await handleImageUpload(file, selectedField === 'hover_image_url' ? 'hover' : 'main');
                                    if (url) handleFieldEdit(player.id, url);
                                  }
                                }}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => document.getElementById(`upload-${selectedField}-${player.id}`)?.click()}
                              >
                                <Upload className="h-3 w-3 mr-1" />
                                Upload
                              </Button>
                            </div>
                          </div>
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
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => movePlayerUp(player, index)}
                          disabled={index === 0 || isMoving}
                          className="h-8 w-8 p-0"
                          title="Move up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => movePlayerDown(player, index)}
                          disabled={index === displayPlayers.length - 1 || isMoving}
                          className="h-8 w-8 p-0"
                          title="Move down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(player)}
                          className="h-8 w-8 p-0"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
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
              <div className="space-y-2">
                <Label>Club Logo</Label>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="club-logo-upload"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = await handleImageUpload(file, 'main');
                      if (url) setFormData({ ...formData, club_logo: url });
                    }
                  }}
                />
                <div className="flex flex-col gap-2">
                  {formData.club_logo && (
                    <div className="relative w-16 h-16 rounded border overflow-hidden bg-white">
                      <img src={formData.club_logo} alt="Club Logo" className="w-full h-full object-contain" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-0 right-0 h-4 w-4"
                        onClick={() => setFormData({ ...formData, club_logo: "" })}
                      >
                        <X className="h-2 w-2" />
                      </Button>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => document.getElementById('club-logo-upload')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Club Logo
                  </Button>
                </div>
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
                <Label htmlFor="representation_status">Representation Status</Label>
                <Select 
                  value={formData.representation_status} 
                  onValueChange={(v) => setFormData({ ...formData, representation_status: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="represented">Represented</SelectItem>
                    <SelectItem value="mandated">Mandated</SelectItem>
                    <SelectItem value="previously_mandated">Previously Mandated</SelectItem>
                    <SelectItem value="scouted">Scouted</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Image Upload Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Main Image</Label>
                <input
                  ref={mainImageRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = await handleImageUpload(file, 'main');
                      if (url) setFormData({ ...formData, image_url: url });
                    }
                  }}
                />
                <div className="flex flex-col gap-2">
                  {formData.image_url && (
                    <div className="relative w-20 h-20 rounded border overflow-hidden">
                      <img src={formData.image_url} alt="Main" className="w-full h-full object-cover" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-5 w-5"
                        onClick={() => setFormData({ ...formData, image_url: "" })}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => mainImageRef.current?.click()}
                    disabled={uploadingImage === 'main'}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingImage === 'main' ? 'Uploading...' : 'Upload Main Image'}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Hover Image</Label>
                <input
                  ref={hoverImageRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = await handleImageUpload(file, 'hover');
                      if (url) setFormData({ ...formData, hover_image_url: url });
                    }
                  }}
                />
                <div className="flex flex-col gap-2">
                  {formData.hover_image_url && (
                    <div className="relative w-20 h-20 rounded border overflow-hidden">
                      <img src={formData.hover_image_url} alt="Hover" className="w-full h-full object-cover" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-5 w-5"
                        onClick={() => setFormData({ ...formData, hover_image_url: "" })}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => hoverImageRef.current?.click()}
                    disabled={uploadingImage === 'hover'}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingImage === 'hover' ? 'Uploading...' : 'Upload Hover Image'}
                  </Button>
                </div>
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
