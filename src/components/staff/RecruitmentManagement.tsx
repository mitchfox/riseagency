import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Users, MessageSquare, Plus, Trash2, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Prospect {
  id: string;
  name: string;
  age: number | null;
  position: string | null;
  nationality: string | null;
  current_club: string | null;
  age_group: 'A' | 'B' | 'C' | 'D';
  stage: 'scouted' | 'connected' | 'rapport_building' | 'rising' | 'rise';
  profile_image_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  last_contact_date: string | null;
  priority: 'low' | 'medium' | 'high' | null;
}

export const RecruitmentManagement = () => {
  const [activeTab, setActiveTab] = useState("prospects");
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    position: "",
    nationality: "",
    current_club: "",
    age_group: "A" as 'A' | 'B' | 'C' | 'D',
    stage: "scouted" as 'scouted' | 'connected' | 'rapport_building' | 'rising' | 'rise',
    contact_email: "",
    contact_phone: "",
    notes: "",
    priority: "medium" as 'low' | 'medium' | 'high',
  });

  const ageGroups = [
    { value: 'A', label: 'A - FIRST TEAM' },
    { value: 'B', label: 'B - U21' },
    { value: 'C', label: 'C - U18' },
    { value: 'D', label: 'D - U16' },
  ];

  const stages = [
    { value: 'scouted', label: 'SCOUTED' },
    { value: 'connected', label: 'CONNECTED' },
    { value: 'rapport_building', label: 'RAPPORT BUILDING' },
    { value: 'rising', label: 'RISING' },
    { value: 'rise', label: 'RISE' },
  ];

  useEffect(() => {
    fetchProspects();
  }, []);

  const fetchProspects = async () => {
    try {
      const { data, error } = await supabase
        .from("prospects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProspects((data || []) as Prospect[]);
    } catch (error: any) {
      console.error("Error fetching prospects:", error);
      toast.error("Failed to load prospects");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const prospectData = {
        name: formData.name,
        age: formData.age ? parseInt(formData.age) : null,
        position: formData.position || null,
        nationality: formData.nationality || null,
        current_club: formData.current_club || null,
        age_group: formData.age_group,
        stage: formData.stage,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        notes: formData.notes || null,
        priority: formData.priority,
      };

      if (editingProspect) {
        const { error } = await supabase
          .from("prospects")
          .update(prospectData)
          .eq("id", editingProspect.id);

        if (error) throw error;
        toast.success("Prospect updated successfully");
      } else {
        const { error } = await supabase
          .from("prospects")
          .insert([prospectData]);

        if (error) throw error;
        toast.success("Prospect added successfully");
      }

      setDialogOpen(false);
      resetForm();
      fetchProspects();
    } catch (error: any) {
      console.error("Error saving prospect:", error);
      toast.error("Failed to save prospect");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this prospect?")) return;

    try {
      const { error } = await supabase
        .from("prospects")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Prospect deleted successfully");
      fetchProspects();
    } catch (error: any) {
      console.error("Error deleting prospect:", error);
      toast.error("Failed to delete prospect");
    }
  };

  const handleEdit = (prospect: Prospect) => {
    setEditingProspect(prospect);
    setFormData({
      name: prospect.name,
      age: prospect.age?.toString() || "",
      position: prospect.position || "",
      nationality: prospect.nationality || "",
      current_club: prospect.current_club || "",
      age_group: prospect.age_group,
      stage: prospect.stage,
      contact_email: prospect.contact_email || "",
      contact_phone: prospect.contact_phone || "",
      notes: prospect.notes || "",
      priority: prospect.priority || "medium",
    });
    setDialogOpen(true);
  };

  const handleMoveStage = async (prospectId: string, newStage: typeof stages[number]['value']) => {
    try {
      const { error } = await supabase
        .from("prospects")
        .update({ stage: newStage })
        .eq("id", prospectId);

      if (error) throw error;
      fetchProspects();
    } catch (error: any) {
      console.error("Error moving prospect:", error);
      toast.error("Failed to move prospect");
    }
  };

  const resetForm = () => {
    setEditingProspect(null);
    setFormData({
      name: "",
      age: "",
      position: "",
      nationality: "",
      current_club: "",
      age_group: "A",
      stage: "scouted",
      contact_email: "",
      contact_phone: "",
      notes: "",
      priority: "medium",
    });
  };

  const getProspectsForCell = (ageGroup: string, stage: string) => {
    return prospects.filter(p => p.age_group === ageGroup && p.stage === stage);
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'hsl(0, 70%, 50%)';
      case 'medium': return 'hsl(43, 49%, 61%)';
      case 'low': return 'hsl(140, 50%, 50%)';
      default: return 'hsl(0, 0%, 50%)';
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="prospects">
            <Users className="w-4 h-4 mr-2" />
            Prospect Board
          </TabsTrigger>
          <TabsTrigger value="templates">
            <MessageSquare className="w-4 h-4 mr-2" />
            Message Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prospects" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {prospects.length} prospect{prospects.length !== 1 ? 's' : ''} tracked
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Prospect
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingProspect ? "Edit Prospect" : "Add New Prospect"}
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
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nationality">Nationality</Label>
                      <Input
                        id="nationality"
                        value={formData.nationality}
                        onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="current_club">Current Club</Label>
                    <Input
                      id="current_club"
                      value={formData.current_club}
                      onChange={(e) => setFormData({ ...formData, current_club: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="age_group">Age Group *</Label>
                      <Select
                        value={formData.age_group}
                        onValueChange={(value: any) => setFormData({ ...formData, age_group: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ageGroups.map(group => (
                            <SelectItem key={group.value} value={group.value}>
                              {group.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stage">Stage *</Label>
                      <Select
                        value={formData.stage}
                        onValueChange={(value: any) => setFormData({ ...formData, stage: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map(stage => (
                            <SelectItem key={stage.value} value={stage.value}>
                              {stage.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">Email</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        value={formData.contact_email}
                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_phone">Phone</Label>
                      <Input
                        id="contact_phone"
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingProspect ? "Update" : "Add"} Prospect
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Prospect Board Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[1200px]">
              {/* Header Row */}
              <div className="grid grid-cols-6 gap-2 mb-2">
                <div className="p-3 text-center font-bebas uppercase text-sm rounded-lg" style={{ backgroundColor: 'hsl(0, 0%, 20%)', color: 'hsl(0, 0%, 100%)' }}>
                  Age Group
                </div>
                {stages.map(stage => (
                  <div 
                    key={stage.value}
                    className="p-3 text-center font-bebas uppercase text-sm rounded-lg"
                    style={{ backgroundColor: 'hsl(43, 49%, 61%)', color: 'hsl(0, 0%, 0%)' }}
                  >
                    {stage.label}
                  </div>
                ))}
              </div>

              {/* Grid Rows */}
              {ageGroups.map(ageGroup => (
                <div key={ageGroup.value} className="grid grid-cols-6 gap-2 mb-2">
                  {/* Age Group Label */}
                  <div 
                    className="p-3 rounded-lg flex flex-col items-center justify-center border"
                    style={{ 
                      backgroundColor: 'hsl(0, 0%, 15%)',
                      borderColor: 'rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div className="text-2xl font-bebas" style={{ color: 'hsl(43, 49%, 61%)' }}>
                      {ageGroup.value}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {ageGroup.label.split(' - ')[1]}
                    </div>
                  </div>

                  {/* Stage Cells */}
                  {stages.map(stage => {
                    const cellProspects = getProspectsForCell(ageGroup.value, stage.value);
                    return (
                      <div 
                        key={stage.value}
                        className="p-2 rounded-lg min-h-[120px] border"
                        style={{ 
                          backgroundColor: 'hsl(0, 0%, 10%)',
                          borderColor: 'rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        {cellProspects.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {cellProspects.map(prospect => (
                              <div
                                key={prospect.id}
                                className="group relative p-2 rounded border cursor-pointer hover:scale-105 transition-transform"
                                style={{ 
                                  backgroundColor: 'hsl(0, 0%, 20%)',
                                  borderColor: getPriorityColor(prospect.priority),
                                  borderWidth: '2px'
                                }}
                                onClick={() => handleEdit(prospect)}
                              >
                                <div className="text-xs font-bold truncate" style={{ color: 'hsl(43, 49%, 61%)' }}>
                                  {prospect.name}
                                </div>
                                {prospect.position && (
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    {prospect.position}
                                  </div>
                                )}
                                {prospect.current_club && (
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    {prospect.current_club}
                                  </div>
                                )}
                                
                                {/* Quick Actions on Hover */}
                                <div className="absolute top-0 right-0 hidden group-hover:flex gap-1 p-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 w-5 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(prospect.id);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-xs text-muted-foreground opacity-30">
                            Empty
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2" style={{ borderColor: 'hsl(0, 70%, 50%)' }} />
              <span>High Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2" style={{ borderColor: 'hsl(43, 49%, 61%)' }} />
              <span>Medium Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2" style={{ borderColor: 'hsl(140, 50%, 50%)' }} />
              <span>Low Priority</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No message templates created yet</p>
                <p className="text-sm mb-4">Create reusable templates for prospect outreach</p>
                <Button>Create Template</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
