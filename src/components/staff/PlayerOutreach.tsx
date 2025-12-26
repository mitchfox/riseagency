import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Users, Save, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

// Helper to format Instagram handle and create DM link
const formatIgHandle = (handle: string | null) => {
  if (!handle) return null;
  // Remove @ if present
  const cleanHandle = handle.replace(/^@/, '').trim();
  if (!cleanHandle) return null;
  return cleanHandle;
};

const InstagramDMLink = ({ handle }: { handle: string | null }) => {
  const cleanHandle = formatIgHandle(handle);
  if (!cleanHandle) return <span className="text-muted-foreground">-</span>;
  
  return (
    <a
      href={`https://instagram.com/${cleanHandle}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary hover:underline"
    >
      <MessageCircle className="h-3.5 w-3.5" />
      @{cleanHandle}
    </a>
  );
};

interface YouthOutreach {
  id: string;
  player_name: string;
  ig_handle: string | null;
  messaged: boolean;
  response_received: boolean;
  parents_name: string | null;
  parent_contact: string | null;
  parent_approval: boolean;
  initial_message: string | null;
  notes: string | null;
}

interface ProOutreach {
  id: string;
  player_name: string;
  ig_handle: string | null;
  messaged: boolean;
  response_received: boolean;
  initial_message: string | null;
  notes: string | null;
}

export const PlayerOutreach = ({ isAdmin }: { isAdmin: boolean }) => {
  const [activeTab, setActiveTab] = useState("youth");
  const [youthData, setYouthData] = useState<YouthOutreach[]>([]);
  const [proData, setProData] = useState<ProOutreach[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<YouthOutreach | ProOutreach | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [youthFormData, setYouthFormData] = useState({
    player_name: "",
    ig_handle: "",
    messaged: false,
    response_received: false,
    parents_name: "",
    parent_contact: "",
    parent_approval: false,
    initial_message: "",
    notes: ""
  });
  const [proFormData, setProFormData] = useState({
    player_name: "",
    ig_handle: "",
    messaged: false,
    response_received: false,
    initial_message: "",
    notes: ""
  });

  // Staff can also edit (not just admins)
  const canEdit = true;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [youthResult, proResult] = await Promise.all([
        supabase.from("player_outreach_youth").select("*").order("created_at", { ascending: false }),
        supabase.from("player_outreach_pro").select("*").order("created_at", { ascending: false })
      ]);

      if (youthResult.error) throw youthResult.error;
      if (proResult.error) throw proResult.error;

      setYouthData(youthResult.data || []);
      setProData(proResult.data || []);
    } catch (error: any) {
      console.error("Error fetching outreach data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleYouthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem && 'parents_name' in editingItem) {
        const { error } = await supabase
          .from("player_outreach_youth")
          .update(youthFormData)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Youth outreach updated");
      } else {
        // Insert into player_outreach_youth
        const { error: outreachError } = await supabase
          .from("player_outreach_youth")
          .insert([youthFormData]);
        if (outreachError) throw outreachError;
        
        // Also add to scouting_reports
        const { error: scoutingError } = await supabase
          .from("scouting_reports")
          .insert([{
            player_name: youthFormData.player_name,
            summary: `Youth outreach contact${youthFormData.notes ? ': ' + youthFormData.notes : ''}`,
            status: 'pending'
          }]);
        if (scoutingError) throw scoutingError;
        
        toast.success("Youth outreach added to database");
      }
      setDialogOpen(false);
      resetForms();
      fetchData();
    } catch (error: any) {
      console.error("Error saving youth outreach:", error);
      toast.error("Failed to save");
    }
  };

  const handleProSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem && !('parents_name' in editingItem)) {
        const { error } = await supabase
          .from("player_outreach_pro")
          .update(proFormData)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Pro outreach updated");
      } else {
        // Insert into player_outreach_pro
        const { error: outreachError } = await supabase
          .from("player_outreach_pro")
          .insert([proFormData]);
        if (outreachError) throw outreachError;
        
        // Also add to scouting_reports
        const { error: scoutingError } = await supabase
          .from("scouting_reports")
          .insert([{
            player_name: proFormData.player_name,
            summary: `Pro outreach contact${proFormData.notes ? ': ' + proFormData.notes : ''}`,
            status: 'pending'
          }]);
        if (scoutingError) throw scoutingError;
        
        toast.success("Pro outreach added to database");
      }
      setDialogOpen(false);
      resetForms();
      fetchData();
    } catch (error: any) {
      console.error("Error saving pro outreach:", error);
      toast.error("Failed to save");
    }
  };

  const handleSaveAll = async () => {
    try {
      // Save all youth changes
      for (const item of youthData) {
        const { error } = await supabase
          .from("player_outreach_youth")
          .update({
            messaged: item.messaged,
            response_received: item.response_received,
            parent_approval: item.parent_approval
          })
          .eq("id", item.id);
        if (error) throw error;
      }

      // Save all pro changes
      for (const item of proData) {
        const { error } = await supabase
          .from("player_outreach_pro")
          .update({
            messaged: item.messaged,
            response_received: item.response_received
          })
          .eq("id", item.id);
        if (error) throw error;
      }

      toast.success("All changes saved successfully");
      setHasUnsavedChanges(false);
      fetchData();
    } catch (error: any) {
      console.error("Error saving changes:", error);
      toast.error("Failed to save changes");
    }
  };

  const toggleYouthField = async (id: string, field: keyof Pick<YouthOutreach, 'messaged' | 'response_received' | 'parent_approval'>) => {
    const item = youthData.find(i => i.id === id);
    if (!item) return;
    
    const newValue = !item[field];
    
    // Update local state immediately
    setYouthData(prev => prev.map(i => 
      i.id === id ? { ...i, [field]: newValue } : i
    ));
    
    // Auto-save to database
    try {
      const { error } = await supabase
        .from("player_outreach_youth")
        .update({ [field]: newValue })
        .eq("id", id);
      if (error) throw error;
    } catch (error: any) {
      console.error("Error saving:", error);
      toast.error("Failed to save");
      // Revert on error
      setYouthData(prev => prev.map(i => 
        i.id === id ? { ...i, [field]: !newValue } : i
      ));
    }
  };

  const toggleProField = async (id: string, field: keyof Pick<ProOutreach, 'messaged' | 'response_received'>) => {
    const item = proData.find(i => i.id === id);
    if (!item) return;
    
    const newValue = !item[field];
    
    // Update local state immediately
    setProData(prev => prev.map(i => 
      i.id === id ? { ...i, [field]: newValue } : i
    ));
    
    // Auto-save to database
    try {
      const { error } = await supabase
        .from("player_outreach_pro")
        .update({ [field]: newValue })
        .eq("id", id);
      if (error) throw error;
    } catch (error: any) {
      console.error("Error saving:", error);
      toast.error("Failed to save");
      // Revert on error
      setProData(prev => prev.map(i => 
        i.id === id ? { ...i, [field]: !newValue } : i
      ));
    }
  };

  const handleEdit = (item: YouthOutreach | ProOutreach, type: 'youth' | 'pro') => {
    setEditingItem(item);
    if (type === 'youth' && 'parents_name' in item) {
      setYouthFormData({
        player_name: item.player_name,
        ig_handle: item.ig_handle || "",
        messaged: item.messaged,
        response_received: item.response_received,
        parents_name: item.parents_name || "",
        parent_contact: item.parent_contact || "",
        parent_approval: item.parent_approval,
        initial_message: item.initial_message || "",
        notes: item.notes || ""
      });
    } else {
      setProFormData({
        player_name: item.player_name,
        ig_handle: item.ig_handle || "",
        messaged: item.messaged,
        response_received: item.response_received,
        initial_message: item.initial_message || "",
        notes: item.notes || ""
      });
    }
    setDialogOpen(true);
  };

  const resetForms = () => {
    setEditingItem(null);
    setYouthFormData({
      player_name: "",
      ig_handle: "",
      messaged: false,
      response_received: false,
      parents_name: "",
      parent_contact: "",
      parent_approval: false,
      initial_message: "",
      notes: ""
    });
    setProFormData({
      player_name: "",
      ig_handle: "",
      messaged: false,
      response_received: false,
      initial_message: "",
      notes: ""
    });
  };

  const getYouthStatusGroups = (data: YouthOutreach[]) => {
    return {
      notMessaged: data.filter(d => !d.messaged),
      noResponse: data.filter(d => d.messaged && !d.response_received),
      responded: data.filter(d => d.response_received)
    };
  };

  const getProStatusGroups = (data: ProOutreach[]) => {
    return {
      notMessaged: data.filter(d => !d.messaged),
      noResponse: data.filter(d => d.messaged && !d.response_received),
      responded: data.filter(d => d.response_received)
    };
  };

  const youthGroups = getYouthStatusGroups(youthData);
  const proGroups = getProStatusGroups(proData);

  const renderYouthTable = (data: YouthOutreach[], title: string) => (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">{title} ({data.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player Name</TableHead>
                <TableHead>IG Handle</TableHead>
                <TableHead>Parents Name</TableHead>
                <TableHead>Parent Contact</TableHead>
                <TableHead className="text-center">Parent Approval</TableHead>
                <TableHead className="text-center">Messaged</TableHead>
                <TableHead className="text-center">Response</TableHead>
                {canEdit && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 8 : 7} className="text-center text-muted-foreground">
                    No entries
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="bg-muted/30 font-bold">{item.player_name}</TableCell>
                    <TableCell><InstagramDMLink handle={item.ig_handle} /></TableCell>
                    <TableCell>{item.parents_name || "-"}</TableCell>
                    <TableCell><InstagramDMLink handle={item.parent_contact} /></TableCell>
                    <TableCell className="text-center">
                      {canEdit ? (
                        <Checkbox
                          checked={item.parent_approval}
                          onCheckedChange={() => toggleYouthField(item.id, 'parent_approval')}
                        />
                      ) : (
                        item.parent_approval ? "✓" : "-"
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {canEdit ? (
                        <Checkbox
                          checked={item.messaged}
                          onCheckedChange={() => toggleYouthField(item.id, 'messaged')}
                        />
                      ) : (
                        item.messaged ? "✓" : "-"
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {canEdit ? (
                        <Checkbox
                          checked={item.response_received}
                          onCheckedChange={() => toggleYouthField(item.id, 'response_received')}
                        />
                      ) : (
                        item.response_received ? "✓" : "-"
                      )}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(item, 'youth')}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-3">
          {data.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No entries</p>
          ) : (
            data.map((item) => (
              <Card key={item.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="bg-muted/30 px-2 py-1 rounded">
                    <h3 className="font-bold text-base">{item.player_name}</h3>
                    {item.ig_handle && <div className="text-sm"><InstagramDMLink handle={item.ig_handle} /></div>}
                  </div>
                  {canEdit && (
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(item, 'youth')}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="space-y-1.5 text-sm">
                  {item.parents_name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Parent:</span>
                      <span>{item.parents_name}</span>
                    </div>
                  )}
                  {item.parent_contact && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Contact:</span>
                      <InstagramDMLink handle={item.parent_contact} />
                    </div>
                  )}
                </div>
                {canEdit && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Parent Approval</span>
                      <Checkbox
                        checked={item.parent_approval}
                        onCheckedChange={() => toggleYouthField(item.id, 'parent_approval')}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Messaged</span>
                      <Checkbox
                        checked={item.messaged}
                        onCheckedChange={() => toggleYouthField(item.id, 'messaged')}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Response Received</span>
                      <Checkbox
                        checked={item.response_received}
                        onCheckedChange={() => toggleYouthField(item.id, 'response_received')}
                      />
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderProTable = (data: ProOutreach[], title: string) => (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">{title} ({data.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player Name</TableHead>
                <TableHead>IG Handle</TableHead>
                <TableHead className="text-center">Messaged</TableHead>
                <TableHead className="text-center">Response</TableHead>
                {canEdit && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 5 : 4} className="text-center text-muted-foreground">
                    No entries
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="bg-muted/30 font-bold">{item.player_name}</TableCell>
                    <TableCell><InstagramDMLink handle={item.ig_handle} /></TableCell>
                    <TableCell className="text-center">
                      {canEdit ? (
                        <Checkbox
                          checked={item.messaged}
                          onCheckedChange={() => toggleProField(item.id, 'messaged')}
                        />
                      ) : (
                        item.messaged ? "✓" : "-"
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {canEdit ? (
                        <Checkbox
                          checked={item.response_received}
                          onCheckedChange={() => toggleProField(item.id, 'response_received')}
                        />
                      ) : (
                        item.response_received ? "✓" : "-"
                      )}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(item, 'pro')}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-3">
          {data.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No entries</p>
          ) : (
            data.map((item) => (
              <Card key={item.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="bg-muted/30 px-2 py-1 rounded">
                    <h3 className="font-bold text-base">{item.player_name}</h3>
                    {item.ig_handle && <div className="text-sm"><InstagramDMLink handle={item.ig_handle} /></div>}
                  </div>
                  {canEdit && (
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(item, 'pro')}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {canEdit && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Messaged</span>
                      <Checkbox
                        checked={item.messaged}
                        onCheckedChange={() => toggleProField(item.id, 'messaged')}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Response Received</span>
                      <Checkbox
                        checked={item.response_received}
                        onCheckedChange={() => toggleProField(item.id, 'response_received')}
                      />
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5 sm:h-6 sm:w-6" />
          Player Outreach
        </h2>
        {canEdit && (
          <div className="flex gap-2 w-full sm:w-auto">
            {hasUnsavedChanges && (
              <Button size="sm" onClick={handleSaveAll} className="w-full sm:w-auto">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            )}
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForms();
            }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Entry
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Edit Entry" : `Add ${activeTab === 'youth' ? 'Youth' : 'Pro'} Outreach`}
                </DialogTitle>
              </DialogHeader>
              {activeTab === 'youth' ? (
                <form onSubmit={handleYouthSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="player_name">Player Name *</Label>
                      <Input
                        id="player_name"
                        value={youthFormData.player_name}
                        onChange={(e) => setYouthFormData({ ...youthFormData, player_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ig_handle">IG Handle</Label>
                      <Input
                        id="ig_handle"
                        value={youthFormData.ig_handle}
                        onChange={(e) => setYouthFormData({ ...youthFormData, ig_handle: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="parents_name">Parents Name</Label>
                      <Input
                        id="parents_name"
                        value={youthFormData.parents_name}
                        onChange={(e) => setYouthFormData({ ...youthFormData, parents_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parent_contact">Parent Contact</Label>
                      <Input
                        id="parent_contact"
                        value={youthFormData.parent_contact}
                        onChange={(e) => setYouthFormData({ ...youthFormData, parent_contact: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="initial_message">Initial Message</Label>
                    <Textarea
                      id="initial_message"
                      value={youthFormData.initial_message}
                      onChange={(e) => setYouthFormData({ ...youthFormData, initial_message: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={youthFormData.notes}
                      onChange={(e) => setYouthFormData({ ...youthFormData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="messaged"
                        checked={youthFormData.messaged}
                        onCheckedChange={(checked) => setYouthFormData({ ...youthFormData, messaged: checked })}
                      />
                      <Label htmlFor="messaged">Messaged</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="response_received"
                        checked={youthFormData.response_received}
                        onCheckedChange={(checked) => setYouthFormData({ ...youthFormData, response_received: checked })}
                      />
                      <Label htmlFor="response_received">Response Received</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="parent_approval"
                        checked={youthFormData.parent_approval}
                        onCheckedChange={(checked) => setYouthFormData({ ...youthFormData, parent_approval: checked })}
                      />
                      <Label htmlFor="parent_approval">Parent Approval</Label>
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    {editingItem ? "Update" : "Add"} Youth Outreach
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleProSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="player_name">Player Name *</Label>
                      <Input
                        id="player_name"
                        value={proFormData.player_name}
                        onChange={(e) => setProFormData({ ...proFormData, player_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ig_handle">IG Handle</Label>
                      <Input
                        id="ig_handle"
                        value={proFormData.ig_handle}
                        onChange={(e) => setProFormData({ ...proFormData, ig_handle: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="initial_message">Initial Message</Label>
                    <Textarea
                      id="initial_message"
                      value={proFormData.initial_message}
                      onChange={(e) => setProFormData({ ...proFormData, initial_message: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={proFormData.notes}
                      onChange={(e) => setProFormData({ ...proFormData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="messaged"
                        checked={proFormData.messaged}
                        onCheckedChange={(checked) => setProFormData({ ...proFormData, messaged: checked })}
                      />
                      <Label htmlFor="messaged">Messaged</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="response_received"
                        checked={proFormData.response_received}
                        onCheckedChange={(checked) => setProFormData({ ...proFormData, response_received: checked })}
                      />
                      <Label htmlFor="response_received">Response Received</Label>
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    {editingItem ? "Update" : "Add"} Pro Outreach
                  </Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 h-auto sm:h-10">
          <TabsTrigger value="youth" className="text-sm sm:text-base py-2.5">Youth (U18)</TabsTrigger>
          <TabsTrigger value="pro" className="text-sm sm:text-base py-2.5">Pro</TabsTrigger>
        </TabsList>

        <TabsContent value="youth" className="space-y-4 mt-4">
          {renderYouthTable(youthGroups.notMessaged, "Not Messaged Yet")}
          {renderYouthTable(youthGroups.noResponse, "No Response")}
          {renderYouthTable(youthGroups.responded, "Response Received")}
        </TabsContent>

        <TabsContent value="pro" className="space-y-4 mt-4">
          {renderProTable(proGroups.notMessaged, "Not Messaged Yet")}
          {renderProTable(proGroups.noResponse, "No Response")}
          {renderProTable(proGroups.responded, "Response Received")}
        </TabsContent>
      </Tabs>
    </div>
  );
};