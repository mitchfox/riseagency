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
import { Checkbox } from "@/components/ui/checkbox";
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

// Group outreach records by club
interface ClubGroup {
  clubName: string;
  contactName: string | null;
  contactRole: string | null;
  records: ClubOutreach[];
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
  const [clubGroups, setClubGroups] = useState<ClubGroup[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClubFilter, setSelectedClubFilter] = useState<string>("all");
  
  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newClubName, setNewClubName] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newContactRole, setNewContactRole] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [newStatus, setNewStatus] = useState("contacted");
  const [newInitialUpdate, setNewInitialUpdate] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedClubGroup, setSelectedClubGroup] = useState<ClubGroup | null>(null);
  const [selectedOutreach, setSelectedOutreach] = useState<ClubOutreach | null>(null);
  const [outreachUpdates, setOutreachUpdates] = useState<OutreachUpdate[]>([]);
  const [newUpdateText, setNewUpdateText] = useState("");
  const [updatesLoading, setUpdatesLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

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
      const { data: outreachData, error } = await supabase
        .from("club_outreach")
        .select("*")
        .order("club_name", { ascending: true });

      if (error) throw error;

      // Join player names
      const enrichedData = (outreachData || []).map(record => ({
        ...record,
        player: playersData?.find(p => p.id === record.player_id)
      }));

      setOutreachRecords(enrichedData);

      // Group by club
      const grouped = enrichedData.reduce((acc, record) => {
        const existing = acc.find(g => g.clubName === record.club_name);
        if (existing) {
          existing.records.push(record);
        } else {
          acc.push({
            clubName: record.club_name,
            contactName: record.contact_name,
            contactRole: record.contact_role,
            records: [record]
          });
        }
        return acc;
      }, [] as ClubGroup[]);

      setClubGroups(grouped);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayerIds(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleAddOutreach = async () => {
    if (!newClubName.trim() || selectedPlayerIds.length === 0) {
      toast.error("Please fill in club name and select at least one player");
      return;
    }

    setSaving(true);
    try {
      // Create a record for each selected player
      for (const playerId of selectedPlayerIds) {
        const { data, error } = await supabase
          .from("club_outreach")
          .insert({
            player_id: playerId,
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
      }

      toast.success(`Club outreach added for ${selectedPlayerIds.length} player(s)`);
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
    setSelectedPlayerIds([]);
    setNewStatus("contacted");
    setNewInitialUpdate("");
  };

  const handleOpenClubDetail = async (clubGroup: ClubGroup) => {
    setSelectedClubGroup(clubGroup);
    setSelectedOutreach(clubGroup.records[0]); // Select first record for updates
    setDetailDialogOpen(true);
    setUpdatesLoading(true);

    try {
      // Fetch all updates for all records in this club group
      const outreachIds = clubGroup.records.map(r => r.id);
      const { data, error } = await supabase
        .from("club_outreach_updates")
        .select("*")
        .in("outreach_id", outreachIds)
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
    if (!newUpdateText.trim() || !selectedClubGroup) return;

    setSaving(true);
    try {
      // Add update to all records in the club group
      for (const record of selectedClubGroup.records) {
        await supabase
          .from("club_outreach_updates")
          .insert({
            outreach_id: record.id,
            update_text: newUpdateText.trim(),
          });

        await supabase
          .from("club_outreach")
          .update({
            latest_update: newUpdateText.trim(),
            latest_update_date: new Date().toISOString(),
          })
          .eq("id", record.id);
      }

      toast.success("Update added");
      setNewUpdateText("");
      
      // Refresh updates list
      const outreachIds = selectedClubGroup.records.map(r => r.id);
      const { data } = await supabase
        .from("club_outreach_updates")
        .select("*")
        .in("outreach_id", outreachIds)
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
    if (!selectedClubGroup) return;

    try {
      // Update all records in the club group
      for (const record of selectedClubGroup.records) {
        await supabase
          .from("club_outreach")
          .update({ status: newStatus })
          .eq("id", record.id);
      }
      
      toast.success("Status updated");
      fetchData();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const filteredGroups = selectedClubFilter === "all" 
    ? clubGroups 
    : clubGroups.filter(g => g.clubName.toLowerCase().includes(selectedClubFilter.toLowerCase()));

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
              <Input
                placeholder="Filter by club..."
                value={selectedClubFilter === "all" ? "" : selectedClubFilter}
                onChange={e => setSelectedClubFilter(e.target.value || "all")}
                className="w-[200px]"
              />
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
          ) : clubGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No outreach records yet. Click "Add Outreach" to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Club</TableHead>
                  <TableHead>Players</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Latest Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map(group => (
                  <TableRow
                    key={group.clubName}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleOpenClubDetail(group)}
                  >
                    <TableCell className="font-medium">{group.clubName}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {group.records.map(r => (
                          <Badge key={r.id} variant="outline" className="text-xs">
                            {r.player?.name || "Unknown"}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {group.contactName ? (
                        <span>
                          {group.contactName}
                          {group.contactRole && <span className="text-muted-foreground"> ({group.contactRole})</span>}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig[group.records[0]?.status]?.color || "bg-muted"}>
                        {statusConfig[group.records[0]?.status]?.label || group.records[0]?.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {group.records[0]?.latest_update || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog - Club First with Player Checkboxes */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Club Outreach</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
              <Label>Players to Suggest *</Label>
              <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-2">
                {players.map(player => (
                  <div key={player.id} className="flex items-center gap-2">
                    <Checkbox
                      id={player.id}
                      checked={selectedPlayerIds.includes(player.id)}
                      onCheckedChange={() => handlePlayerToggle(player.id)}
                    />
                    <label 
                      htmlFor={player.id} 
                      className="text-sm cursor-pointer flex-1"
                    >
                      {player.name}
                    </label>
                  </div>
                ))}
              </div>
              {selectedPlayerIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedPlayerIds.length} player(s) selected
                </p>
              )}
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

      {/* Detail Dialog - Shows Club with all associated players */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              {selectedClubGroup?.clubName}
            </DialogTitle>
          </DialogHeader>
          {selectedClubGroup && (
            <div className="space-y-6">
              {/* Players */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Players Suggested
                </Label>
                <div className="flex flex-wrap gap-2">
                  {selectedClubGroup.records.map(r => (
                    <Badge key={r.id} variant="secondary">
                      {r.player?.name || "Unknown"}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Contact Info */}
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Contact:</span>
                <span className="font-medium">
                  {selectedClubGroup.contactName || "N/A"}
                  {selectedClubGroup.contactRole && ` (${selectedClubGroup.contactRole})`}
                </span>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={selectedClubGroup.records[0]?.status} 
                  onValueChange={handleStatusChange}
                >
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
                  <p className="text-sm text-muted-foreground">No updates yet.</p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {outreachUpdates.map(update => (
                      <div
                        key={update.id}
                        className="p-3 rounded-lg bg-muted/30 border border-border/50"
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
