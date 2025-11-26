import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Save, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface MapContact {
  id: string;
  name: string;
  club_name: string | null;
  country: string | null;
  x_position: number | null;
  y_position: number | null;
  image_url: string | null;
}

export const MapCoordinatesManager = () => {
  const [contacts, setContacts] = useState<MapContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<MapContact | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    club_name: "",
    country: "",
    x_position: "",
    y_position: "",
    image_url: ""
  });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("club_network_contacts")
        .select("id, name, club_name, country, x_position, y_position, image_url")
        .order("country", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error("Error fetching contacts:", error);
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const contactData = {
        name: formData.name,
        club_name: formData.club_name || null,
        country: formData.country || null,
        x_position: formData.x_position ? parseFloat(formData.x_position) : null,
        y_position: formData.y_position ? parseFloat(formData.y_position) : null,
        image_url: formData.image_url || null,
      };

      if (editingContact) {
        const { error } = await supabase
          .from("club_network_contacts")
          .update(contactData)
          .eq("id", editingContact.id);

        if (error) throw error;
        toast.success("Contact coordinates updated");
      } else {
        const { error } = await supabase
          .from("club_network_contacts")
          .insert([contactData]);

        if (error) throw error;
        toast.success("Contact added to map");
      }

      setDialogOpen(false);
      resetForm();
      fetchContacts();
    } catch (error: any) {
      console.error("Error saving contact:", error);
      toast.error("Failed to save contact");
    }
  };

  const handleEdit = (contact: MapContact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      club_name: contact.club_name || "",
      country: contact.country || "",
      x_position: contact.x_position?.toString() || "",
      y_position: contact.y_position?.toString() || "",
      image_url: contact.image_url || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this contact from the map?")) return;

    try {
      const { error } = await supabase
        .from("club_network_contacts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Contact removed from map");
      fetchContacts();
    } catch (error: any) {
      console.error("Error deleting contact:", error);
      toast.error("Failed to remove contact");
    }
  };

  const resetForm = () => {
    setEditingContact(null);
    setFormData({
      name: "",
      club_name: "",
      country: "",
      x_position: "",
      y_position: "",
      image_url: ""
    });
  };

  const groupedByCountry = contacts.reduce((acc, contact) => {
    const country = contact.country || "Unknown";
    if (!acc[country]) acc[country] = [];
    acc[country].push(contact);
    return acc;
  }, {} as Record<string, MapContact[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Europe Map Coordinates</h3>
          <p className="text-sm text-muted-foreground">
            Manage club and flag positions on the interactive map
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add to Map
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingContact ? "Edit Map Position" : "Add to Map"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contact name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="club_name">Club Name</Label>
                  <Input
                    id="club_name"
                    value={formData.club_name}
                    onChange={(e) => setFormData({ ...formData, club_name: e.target.value })}
                    placeholder="e.g. Real Madrid"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="e.g. Spain"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="x_position">
                    X Position
                    <span className="text-xs text-muted-foreground ml-2">(0-1000)</span>
                  </Label>
                  <Input
                    id="x_position"
                    type="number"
                    step="0.1"
                    value={formData.x_position}
                    onChange={(e) => setFormData({ ...formData, x_position: e.target.value })}
                    placeholder="Horizontal position"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="y_position">
                    Y Position
                    <span className="text-xs text-muted-foreground ml-2">(0-700)</span>
                  </Label>
                  <Input
                    id="y_position"
                    type="number"
                    step="0.1"
                    value={formData.y_position}
                    onChange={(e) => setFormData({ ...formData, y_position: e.target.value })}
                    placeholder="Vertical position"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="Club logo or flag URL"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading contacts...</div>
      ) : (
        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="space-y-6 pr-4">
            {Object.entries(groupedByCountry)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([country, countryContacts]) => (
                <Card key={country}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {country}
                      <span className="text-sm text-muted-foreground font-normal">
                        ({countryContacts.length})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {countryContacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{contact.name}</div>
                            {contact.club_name && (
                              <div className="text-sm text-muted-foreground truncate">
                                {contact.club_name}
                              </div>
                            )}
                            <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                              <span>X: {contact.x_position ?? "—"}</span>
                              <span>Y: {contact.y_position ?? "—"}</span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(contact)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => handleDelete(contact.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

            {Object.keys(groupedByCountry).length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No contacts on the map yet. Click "Add to Map" to begin.
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
