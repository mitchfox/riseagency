import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Save, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ScoutingNetworkMap from "@/components/ScoutingNetworkMap";

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
  const [editedContacts, setEditedContacts] = useState<Record<string, { x_position: string; y_position: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [mapKey, setMapKey] = useState(0); // Key to force map refresh
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

      const { error } = await supabase
        .from("club_network_contacts")
        .insert([contactData]);

      if (error) throw error;
      toast.success("Contact added to map");

      setDialogOpen(false);
      resetForm();
      fetchContacts();
      setMapKey(prev => prev + 1); // Refresh map
    } catch (error: any) {
      console.error("Error saving contact:", error);
      toast.error("Failed to save contact");
    }
  };

  const handleCoordinateChange = (contactId: string, field: 'x_position' | 'y_position', value: string) => {
    setEditedContacts(prev => {
      const contact = contacts.find(c => c.id === contactId);
      const existing = prev[contactId];
      
      return {
        ...prev,
        [contactId]: {
          x_position: field === 'x_position' ? value : (existing?.x_position ?? contact?.x_position?.toString() ?? ''),
          y_position: field === 'y_position' ? value : (existing?.y_position ?? contact?.y_position?.toString() ?? ''),
        }
      };
    });
  };

  const getCurrentValue = (contact: MapContact, field: 'x_position' | 'y_position') => {
    if (editedContacts[contact.id]?.[field] !== undefined) {
      return editedContacts[contact.id][field];
    }
    return contact[field]?.toString() ?? '';
  };

  const handleSaveAll = async () => {
    if (Object.keys(editedContacts).length === 0) {
      toast.info("No changes to save");
      return;
    }

    setSaving(true);
    try {
      const updates = Object.entries(editedContacts).map(([id, coords]) => ({
        id,
        x_position: coords.x_position ? parseFloat(coords.x_position) : null,
        y_position: coords.y_position ? parseFloat(coords.y_position) : null,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("club_network_contacts")
          .update({
            x_position: update.x_position,
            y_position: update.y_position,
          })
          .eq("id", update.id);

        if (error) throw error;
      }

      toast.success(`Updated ${updates.length} contact${updates.length > 1 ? 's' : ''}`);
      setEditedContacts({});
      fetchContacts();
      setMapKey(prev => prev + 1); // Refresh map after saving
    } catch (error: any) {
      console.error("Error saving changes:", error);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
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
      setMapKey(prev => prev + 1); // Refresh map
    } catch (error: any) {
      console.error("Error deleting contact:", error);
      toast.error("Failed to remove contact");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      club_name: "",
      country: "",
      x_position: "",
      y_position: "",
      image_url: ""
    });
  };

  const refreshMap = () => {
    setMapKey(prev => prev + 1);
    toast.success("Map refreshed");
  };

  const hasChanges = Object.keys(editedContacts).length > 0;

  const uniqueCountries = Array.from(new Set(contacts.map(c => c.country).filter(Boolean))).sort();
  
  const filteredContacts = selectedCountry === "all" 
    ? contacts 
    : contacts.filter(c => c.country === selectedCountry);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Map Preview Section */}
      <div className="relative border border-border rounded-lg overflow-hidden bg-card" style={{ height: "300px" }}>
        <div className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-md border border-border">
          <span className="text-xs font-medium text-muted-foreground">
            Map Preview {selectedCountry !== "all" && `• ${selectedCountry}`}
          </span>
        </div>
        <div className="absolute top-2 right-2 z-10">
          <Button variant="outline" size="sm" onClick={refreshMap} className="h-8 gap-2 bg-background/80 backdrop-blur-sm">
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>
        <div className="h-full w-full">
          <ScoutingNetworkMap key={mapKey} initialCountry={selectedCountry !== "all" ? selectedCountry : undefined} />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Europe Map Coordinates</h3>
          <p className="text-sm text-muted-foreground">
            Adjust coordinates directly in the table and save all changes at once
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {uniqueCountries.map((country) => (
                <SelectItem key={country} value={country!}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasChanges && (
            <Button onClick={handleSaveAll} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : `Save ${Object.keys(editedContacts).length} Change${Object.keys(editedContacts).length > 1 ? 's' : ''}`}
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add New
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add to Map</DialogTitle>
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
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">Loading contacts...</div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No contacts on the map yet. Click "Add New" to begin.
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No contacts found for this country.
        </div>
      ) : (
        <Card className="flex-1">
          <ScrollArea className="h-[calc(100vh-580px)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Club</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="w-[120px]">X Position</TableHead>
                  <TableHead className="w-[120px]">Y Position</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell className="text-muted-foreground">{contact.club_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{contact.country || "—"}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.1"
                        value={getCurrentValue(contact, 'x_position')}
                        onChange={(e) => handleCoordinateChange(contact.id, 'x_position', e.target.value)}
                        className="h-8 w-full"
                        placeholder="0-1000"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.1"
                        value={getCurrentValue(contact, 'y_position')}
                        onChange={(e) => handleCoordinateChange(contact.id, 'y_position', e.target.value)}
                        className="h-8 w-full"
                        placeholder="0-700"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive h-8 w-8 p-0"
                        onClick={() => handleDelete(contact.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
};
