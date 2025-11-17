import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Eye, EyeOff, Users } from "lucide-react";
import { format } from "date-fns";

interface Update {
  id: string;
  title: string;
  content: string;
  date: string;
  visible: boolean;
  visible_to_player_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

interface Player {
  id: string;
  name: string;
}

export function UpdatesManagement({ isAdmin }: { isAdmin: boolean }) {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<Update | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    date: new Date().toISOString().split('T')[0],
    visible: true,
    visible_to_player_ids: [] as string[]
  });

  useEffect(() => {
    fetchUpdates();
    fetchPlayers();
  }, []);

  const fetchUpdates = async () => {
    try {
      const { data, error } = await supabase
        .from("updates")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;
      setUpdates(data || []);
    } catch (error: any) {
      console.error("Error fetching updates:", error);
      toast.error("Failed to load updates");
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from("players")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setPlayers(data || []);
    } catch (error: any) {
      console.error("Error fetching players:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Convert empty array to null for cleaner database storage
      const dataToSave = {
        ...formData,
        visible_to_player_ids: formData.visible_to_player_ids.length > 0 
          ? formData.visible_to_player_ids 
          : null
      };

      if (editingUpdate) {
        const { error } = await supabase
          .from("updates")
          .update(dataToSave)
          .eq("id", editingUpdate.id);

        if (error) throw error;
        toast.success("Update edited successfully");
      } else {
        const { error } = await supabase
          .from("updates")
          .insert([dataToSave]);

        if (error) throw error;
        toast.success("Update created successfully");
      }

      fetchUpdates();
      resetForm();
      setDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving update:", error);
      toast.error("Failed to save update");
    }
  };

  const handleEdit = (update: Update) => {
    setEditingUpdate(update);
    setFormData({
      title: update.title,
      content: update.content,
      date: update.date,
      visible: update.visible,
      visible_to_player_ids: update.visible_to_player_ids || []
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this update?")) return;

    try {
      const { error } = await supabase
        .from("updates")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Update deleted successfully");
      fetchUpdates();
    } catch (error: any) {
      console.error("Error deleting update:", error);
      toast.error("Failed to delete update");
    }
  };

  const toggleVisibility = async (id: string, currentVisible: boolean) => {
    try {
      const { error } = await supabase
        .from("updates")
        .update({ visible: !currentVisible })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Update ${!currentVisible ? 'shown' : 'hidden'}`);
      fetchUpdates();
    } catch (error: any) {
      console.error("Error toggling visibility:", error);
      toast.error("Failed to update visibility");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      date: new Date().toISOString().split('T')[0],
      visible: true,
      visible_to_player_ids: []
    });
    setEditingUpdate(null);
  };

  const togglePlayerSelection = (playerId: string) => {
    setFormData(prev => ({
      ...prev,
      visible_to_player_ids: prev.visible_to_player_ids.includes(playerId)
        ? prev.visible_to_player_ids.filter(id => id !== playerId)
        : [...prev.visible_to_player_ids, playerId]
    }));
  };

  const selectAllPlayers = () => {
    setFormData(prev => ({
      ...prev,
      visible_to_player_ids: players.map(p => p.id)
    }));
  };

  const deselectAllPlayers = () => {
    setFormData(prev => ({
      ...prev,
      visible_to_player_ids: []
    }));
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {!isAdmin && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-4 py-3 rounded-lg">
          <p className="font-medium">View Only Access - Contact admin for changes</p>
        </div>
      )}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-lg md:text-xl font-bebas uppercase tracking-wider">Updates Management</h3>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="md:h-10">
                <Plus className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">New Update</span>
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingUpdate ? "Edit Update" : "Create New Update"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="visible"
                  checked={formData.visible}
                  onCheckedChange={(checked) => setFormData({ ...formData, visible: checked })}
                />
                <Label htmlFor="visible">Visible to players</Label>
              </div>

              {formData.visible && (
                <div className="space-y-2">
                  <Label>Visible to Specific Players (optional)</Label>
                  <p className="text-sm text-muted-foreground">
                    Leave empty to show to all players, or select specific players
                  </p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <Users className="w-4 h-4 mr-2" />
                        {formData.visible_to_player_ids.length === 0
                          ? "All Players"
                          : formData.visible_to_player_ids.length === players.length
                          ? "All Players Selected"
                          : `${formData.visible_to_player_ids.length} Player${formData.visible_to_player_ids.length !== 1 ? 's' : ''} Selected`}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={selectAllPlayers}
                            className="flex-1"
                          >
                            Select All
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={deselectAllPlayers}
                            className="flex-1"
                          >
                            Clear
                          </Button>
                        </div>
                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {players.map((player) => (
                            <div key={player.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={player.id}
                                checked={formData.visible_to_player_ids.includes(player.id)}
                                onCheckedChange={() => togglePlayerSelection(player.id)}
                              />
                              <Label
                                htmlFor={player.id}
                                className="text-sm font-normal cursor-pointer flex-1"
                              >
                                {player.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingUpdate ? "Save Changes" : "Create Update"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="space-y-3">
        {updates.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No updates yet. Create your first update to get started.
            </CardContent>
          </Card>
        ) : (
          updates.map((update) => (
            <Card key={update.id} className={!update.visible ? "opacity-60" : ""}>
              <CardContent className="py-3 md:py-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h4 className="font-semibold text-base md:text-lg">{update.title}</h4>
                      {!update.visible && (
                        <span className="text-xs bg-muted px-2 py-1 rounded">Hidden</span>
                      )}
                      {update.visible && update.visible_to_player_ids && update.visible_to_player_ids.length > 0 && (
                        <span className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
                          {update.visible_to_player_ids.length} Player{update.visible_to_player_ids.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-2">
                      {update.content}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(update.date), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  
                  {isAdmin && (
                    <div className="flex gap-1 md:gap-2 self-end md:self-start">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 md:h-9 md:w-9"
                        onClick={() => toggleVisibility(update.id, update.visible)}
                      >
                        {update.visible ? (
                          <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 md:h-9 md:w-9"
                        onClick={() => handleEdit(update)}
                      >
                        <Edit className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 md:h-9 md:w-9"
                        onClick={() => handleDelete(update.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
