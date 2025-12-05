import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Building, User, Briefcase, Clock, MessageSquare, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface ClubOutreach {
  id: string;
  player_id: string;
  club_name: string;
  contact_name: string | null;
  contact_role: string | null;
  status: string;
  latest_update: string | null;
  latest_update_date: string | null;
  created_at: string;
  player?: { id: string; name: string };
}

interface OutreachUpdate {
  id: string;
  outreach_id: string;
  update_text: string;
  created_at: string;
}

interface Player {
  id: string;
  name: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  contacted: { label: "Contacted", color: "bg-muted text-muted-foreground" },
  responded: { label: "Responded", color: "bg-blue-500/20 text-blue-400" },
  meeting: { label: "Meeting", color: "bg-yellow-500/20 text-yellow-400" },
  interested: { label: "Interested", color: "bg-green-500/20 text-green-400" },
  rejected: { label: "Rejected", color: "bg-red-500/20 text-red-400" },
};

export const ClubOutreachManagement = () => {
  const [outreachRecords, setOutreachRecords] = useState<ClubOutreach[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("all");
  
  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newClubName, setNewClubName] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newContactRole, setNewContactRole] = useState("");
  const [newPlayerId, setNewPlayerId] = useState("");
  const [newStatus, setNewStatus] = useState("contacted");
  const [newInitialUpdate, setNewInitialUpdate] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOutreach, setSelectedOutreach] = useState<ClubOutreach | null>(null);
  const [outreachUpdates, setOutreachUpdates] = useState<OutreachUpdate[]>([]);
  const [newUpdateText, setNewUpdateText] = useState("");
  const [updatesLoading, setUpdatesLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedPlayerId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch players
      const { data: playersData } = await supabase
        .from("players")
        .select("id, name")
        .order("name");
      setPlayers(playersData || []);

      // Fetch outreach records
      let query = supabase
        .from("club_outreach")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (selectedPlayerId !== "all") {
        query = query.eq("player_id", selectedPlayerId);
      }

      const { data: outreachData, error } = await query;
      if (error) throw error;

      // Join player names
      const enrichedData = (outreachData || []).map(record => ({
        ...record,
        player: playersData?.find(p => p.id === record.player_id)
      }));

      setOutreachRecords(enrichedData);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddOutreach = async () => {
    if (!newClubName.trim() || !newPlayerId) {
      toast.error("Please fill in required fields");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("club_outreach")
        .insert({
          player_id: newPlayerId,
          club_name: newClubName.trim(),
          contact_name: newContactName.trim() || null,
          contact_role: newContactRole.trim() || null,
          status: newStatus,
          latest_update: newInitialUpdate.trim() || null,
          latest_update_date: newInitialUpdate.trim() ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;

      // If there's an initial update, also add it to updates table
      if (newInitialUpdate.trim() && data) {
        await supabase.from("club_outreach_updates").insert({
          outreach_id: data.id,
          update_text: newInitialUpdate.trim(),
        });
      }

      toast.success("Club outreach added");
      setAddDialogOpen(false);
      resetAddForm();
      fetchData();
    } catch (error: any) {
      console.error("Error adding outreach:", error);
      toast.error("Failed to add outreach");
    } finally {
      setSaving(false);
    }
  };

  const resetAddForm = () => {
    setNewClubName("");
    setNewContactName("");
    setNewContactRole("");
    setNewPlayerId("");
    setNewStatus("contacted");
    setNewInitialUpdate("");
  };

  const handleOpenDetail = async (outreach: ClubOutreach) => {
    setSelectedOutreach(outreach);
    setDetailDialogOpen(true);
    setUpdatesLoading(true);

    try {
      const { data, error } = await supabase
        .from("club_outreach_updates")
        .select("*")
        .eq("outreach_id", outreach.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOutreachUpdates(data || []);
    } catch (error) {
      console.error("Error fetching updates:", error);
      toast.error("Failed to load updates");
    } finally {
      setUpdatesLoading(false);
    }
  };

  const handleAddUpdate = async () => {
    if (!newUpdateText.trim() || !selectedOutreach) return;

    setSaving(true);
    try {
      // Add update to updates table
      const { error: updateError } = await supabase
        .from("club_outreach_updates")
        .insert({
          outreach_id: selectedOutreach.id,
          update_text: newUpdateText.trim(),
        });

      if (updateError) throw updateError;

      // Update the main record with latest update
      const { error: outreachError } = await supabase
        .from("club_outreach")
        .update({
          latest_update: newUpdateText.trim(),
          latest_update_date: new Date().toISOString(),
        })
        .eq("id", selectedOutreach.id);

      if (outreachError) throw outreachError;

      toast.success("Update added");
      setNewUpdateText("");
      
      // Refresh updates list
      const { data } = await supabase
        .from("club_outreach_updates")
        .select("*")
        .eq("outreach_id", selectedOutreach.id)
        .order("created_at", { ascending: false });
      setOutreachUpdates(data || []);
      
      fetchData();
    } catch (error) {
      console.error("Error adding update:", error);
      toast.error("Failed to add update");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedOutreach) return;

    try {
      const { error } = await supabase
        .from("club_outreach")
        .update({ status: newStatus })
        .eq("id", selectedOutreach.id);

      if (error) throw error;
      
      setSelectedOutreach({ ...selectedOutreach, status: newStatus });
      toast.success("Status updated");
      fetchData();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Club Outreach
            </CardTitle>
            <div className="flex items-center gap-3">
              <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by player" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Players</SelectItem>
                  {players.map(player => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Outreach
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : outreachRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No outreach records yet. Click "Add Outreach" to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Club</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Latest Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outreachRecords.map(record => (
                  <TableRow
                    key={record.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleOpenDetail(record)}
                  >
                    <TableCell className="font-medium">{record.player?.name || "Unknown"}</TableCell>
                    <TableCell>{record.club_name}</TableCell>
                    <TableCell>{record.contact_name || "-"}</TableCell>
                    <TableCell>{record.contact_role || "-"}</TableCell>
                    <TableCell>
                      <Badge className={statusConfig[record.status]?.color || "bg-muted"}>
                        {statusConfig[record.status]?.label || record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {record.latest_update || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Club Outreach</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Player *</Label>
              <Select value={newPlayerId} onValueChange={setNewPlayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent>
                  {players.map(player => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Club Name *</Label>
              <Input
                value={newClubName}
                onChange={e => setNewClubName(e.target.value)}
                placeholder="e.g., Manchester City"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input
                  value={newContactName}
                  onChange={e => setNewContactName(e.target.value)}
                  placeholder="e.g., John Smith"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Role</Label>
                <Input
                  value={newContactRole}
                  onChange={e => setNewContactRole(e.target.value)}
                  placeholder="e.g., Head Scout"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Initial Update/Notes</Label>
              <Textarea
                value={newInitialUpdate}
                onChange={e => setNewInitialUpdate(e.target.value)}
                placeholder="e.g., Sent initial email introducing player"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddOutreach} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Outreach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              {selectedOutreach?.club_name}
            </DialogTitle>
          </DialogHeader>
          {selectedOutreach && (
            <div className="space-y-6">
              {/* Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Player:</span>
                  <span className="font-medium">{selectedOutreach.player?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Contact:</span>
                  <span className="font-medium">
                    {selectedOutreach.contact_name || "N/A"}
                    {selectedOutreach.contact_role && ` (${selectedOutreach.contact_role})`}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={selectedOutreach.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add Update */}
              <div className="space-y-2">
                <Label>Add Update</Label>
                <div className="flex gap-2">
                  <Textarea
                    value={newUpdateText}
                    onChange={e => setNewUpdateText(e.target.value)}
                    placeholder="Enter new update..."
                    rows={2}
                    className="flex-1"
                  />
                  <Button onClick={handleAddUpdate} disabled={saving || !newUpdateText.trim()}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Updates Timeline */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Update History
                </Label>
                {updatesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : outreachUpdates.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    No updates yet
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {outreachUpdates.map(update => (
                      <div
                        key={update.id}
                        className="p-3 rounded-lg bg-muted/50 border border-border"
                      >
                        <p className="text-sm">{update.update_text}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(update.created_at), "PPp")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
