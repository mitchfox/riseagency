import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Users, Plus, Trash2, Edit, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Scout {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  regions: string[] | null;
  status: string;
  commission_rate: number | null;
  successful_signings: number;
  total_submissions: number;
  profile_image_url: string | null;
  notes: string | null;
}

export const ScoutsManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  const [scouts, setScouts] = useState<Scout[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScout, setEditingScout] = useState<Scout | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    country: "",
    regions: [] as string[],
    commission_rate: "",
    status: "pending" as string,
    notes: ""
  });

  useEffect(() => {
    fetchScouts();
  }, []);

  const fetchScouts = async () => {
    try {
      const { data, error } = await supabase
        .from("scouts")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setScouts((data || []) as Scout[]);
    } catch (error: any) {
      console.error("Error fetching scouts:", error);
      toast.error("Failed to load scouts");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email) {
      toast.error("Email is required for portal access");
      return;
    }

    try {
      const scoutData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        country: formData.country || null,
        regions: formData.regions.length > 0 ? formData.regions : null,
        commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : null,
        status: formData.status,
        notes: formData.notes || null,
      };

      if (editingScout) {
        const { error } = await supabase
          .from("scouts")
          .update(scoutData)
          .eq("id", editingScout.id);

        if (error) throw error;
        toast.success("Scout updated successfully");
      } else {
        const { error } = await supabase
          .from("scouts")
          .insert([scoutData]);

        if (error) throw error;
        toast.success("Scout added successfully. They can now log in at /potential with their email.");
      }

      setDialogOpen(false);
      resetForm();
      fetchScouts();
    } catch (error: any) {
      console.error("Error saving scout:", error);
      toast.error("Failed to save scout");
    }
  };

  const handleEdit = (scout: Scout) => {
    setEditingScout(scout);
    setFormData({
      name: scout.name,
      email: scout.email,
      phone: scout.phone || "",
      country: scout.country || "",
      regions: scout.regions || [],
      commission_rate: scout.commission_rate?.toString() || "",
      status: scout.status,
      notes: scout.notes || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this scout? They will lose portal access.")) return;

    try {
      const { error } = await supabase
        .from("scouts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Scout deleted successfully");
      fetchScouts();
    } catch (error: any) {
      console.error("Error deleting scout:", error);
      toast.error("Failed to delete scout");
    }
  };

  const resetForm = () => {
    setEditingScout(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      country: "",
      regions: [],
      commission_rate: "",
      status: "pending",
      notes: ""
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            Scout Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage scouts with portal access to /potential
          </p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add Scout
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingScout ? "Edit Scout" : "Add New Scout"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scout-name">Name *</Label>
                    <Input
                      id="scout-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scout-email">Email (for portal login) *</Label>
                    <Input
                      id="scout-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      placeholder="scout@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scout-phone">Phone</Label>
                    <Input
                      id="scout-phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1234567890"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scout-country">Country</Label>
                    <Input
                      id="scout-country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="e.g. Spain"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scout-regions">Leagues/Clubs (comma-separated)</Label>
                  <Input
                    id="scout-regions"
                    value={formData.regions.join(", ")}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      regions: e.target.value.split(",").map(r => r.trim()).filter(r => r) 
                    })}
                    placeholder="e.g. La Liga, Real Madrid, Barcelona"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter leagues, clubs, or regions this scout is responsible for
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scout-commission">Commission Rate (%)</Label>
                    <Input
                      id="scout-commission"
                      type="number"
                      step="0.5"
                      value={formData.commission_rate}
                      onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                      placeholder="5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scout-status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scout-notes">Notes</Label>
                  <Textarea
                    id="scout-notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional notes about this scout..."
                    rows={3}
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button type="submit" className="w-full sm:w-auto">
                    {editingScout ? "Update Scout" : "Add Scout"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading scouts...
          </CardContent>
        </Card>
      ) : scouts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
            <p className="text-base sm:text-lg mb-2">No scouts added yet</p>
            <p className="text-xs sm:text-sm">Add scouts to give them portal access</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {scouts.map((scout) => (
            <Card key={scout.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg truncate">{scout.name}</CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">{scout.email}</p>
                    {scout.country && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <MapPin className="inline h-3 w-3 mr-1" />
                        {scout.country}
                      </p>
                    )}
                  </div>
                  <Badge variant={scout.status === 'active' ? 'default' : 'secondary'} className="shrink-0">
                    {scout.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {scout.regions && scout.regions.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Scouting Areas:</p>
                    <div className="flex flex-wrap gap-1">
                      {scout.regions.map((region, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {region}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Commission</p>
                    <p className="font-semibold text-sm sm:text-base">{scout.commission_rate || 0}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Reports</p>
                    <p className="font-semibold text-sm sm:text-base">{scout.total_submissions}</p>
                  </div>
                </div>

                {scout.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Notes:</p>
                    <p className="text-xs sm:text-sm line-clamp-2">{scout.notes}</p>
                  </div>
                )}

                {isAdmin && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs sm:text-sm"
                      onClick={() => handleEdit(scout)}
                    >
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs sm:text-sm text-destructive"
                      onClick={() => handleDelete(scout.id)}
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Remove
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};