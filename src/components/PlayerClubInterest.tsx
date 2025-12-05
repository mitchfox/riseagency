import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Building, User, Clock, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ClubOutreach {
  id: string;
  club_name: string;
  contact_name: string | null;
  contact_role: string | null;
  status: string;
  latest_update: string | null;
  latest_update_date: string | null;
  created_at: string;
}

interface PlayerSubmission {
  id: string;
  club_name: string;
  contact_name: string | null;
  contact_role: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

interface OutreachUpdate {
  id: string;
  update_text: string;
  created_at: string;
}

interface PlayerClubInterestProps {
  playerId: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  contacted: { label: "Contacted", color: "bg-muted text-muted-foreground" },
  responded: { label: "Responded", color: "bg-blue-500/20 text-blue-400" },
  meeting: { label: "Meeting", color: "bg-yellow-500/20 text-yellow-400" },
  interested: { label: "Interested", color: "bg-green-500/20 text-green-400" },
  rejected: { label: "Rejected", color: "bg-red-500/20 text-red-400" },
};

export const PlayerClubInterest = ({ playerId }: PlayerClubInterestProps) => {
  const [riseOutreach, setRiseOutreach] = useState<ClubOutreach[]>([]);
  const [playerSubmissions, setPlayerSubmissions] = useState<PlayerSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newClubName, setNewClubName] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newContactRole, setNewContactRole] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Expand state for viewing updates
  const [expandedOutreachId, setExpandedOutreachId] = useState<string | null>(null);
  const [outreachUpdates, setOutreachUpdates] = useState<OutreachUpdate[]>([]);
  const [updatesLoading, setUpdatesLoading] = useState(false);

  useEffect(() => {
    if (playerId) {
      fetchData();
    }
  }, [playerId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch RISE outreach for this player
      const { data: outreachData, error: outreachError } = await supabase
        .from("club_outreach")
        .select("*")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false });

      if (outreachError) throw outreachError;
      setRiseOutreach(outreachData || []);

      // Fetch player's own submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from("player_club_submissions")
        .select("*")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false });

      if (submissionsError) throw submissionsError;
      setPlayerSubmissions(submissionsData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load club interest data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmission = async () => {
    if (!newClubName.trim()) {
      toast.error("Please enter a club name");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("player_club_submissions")
        .insert({
          player_id: playerId,
          club_name: newClubName.trim(),
          contact_name: newContactName.trim() || null,
          contact_role: newContactRole.trim() || null,
          notes: newNotes.trim() || null,
          status: "contacted",
        });

      if (error) throw error;

      toast.success("Club contact added");
      setAddDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error("Error adding submission:", error);
      toast.error("Failed to add club contact");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setNewClubName("");
    setNewContactName("");
    setNewContactRole("");
    setNewNotes("");
  };

  const handleExpandOutreach = async (outreachId: string) => {
    if (expandedOutreachId === outreachId) {
      setExpandedOutreachId(null);
      return;
    }

    setExpandedOutreachId(outreachId);
    setUpdatesLoading(true);

    try {
      const { data, error } = await supabase
        .from("club_outreach_updates")
        .select("*")
        .eq("outreach_id", outreachId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOutreachUpdates(data || []);
    } catch (error) {
      console.error("Error fetching updates:", error);
    } finally {
      setUpdatesLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* RISE Contacted Clubs */}
      <div className="space-y-3">
        <h3 className="font-bebas text-lg uppercase tracking-wide flex items-center gap-2">
          <Building className="h-5 w-5" />
          Contacted by RISE
        </h3>
        {riseOutreach.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              No clubs have been contacted on your behalf yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {riseOutreach.map(outreach => (
              <Collapsible
                key={outreach.id}
                open={expandedOutreachId === outreach.id}
                onOpenChange={() => handleExpandOutreach(outreach.id)}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardContent className="py-4 cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">{outreach.club_name}</span>
                            <Badge className={statusConfig[outreach.status]?.color || "bg-muted"}>
                              {statusConfig[outreach.status]?.label || outreach.status}
                            </Badge>
                          </div>
                          {outreach.contact_name && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Contact: {outreach.contact_name}
                              {outreach.contact_role && ` (${outreach.contact_role})`}
                            </p>
                          )}
                          {outreach.latest_update && (
                            <p className="text-sm mt-2 text-foreground/80">
                              Latest: {outreach.latest_update}
                            </p>
                          )}
                        </div>
                        {expandedOutreachId === outreach.id ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-6 pb-4 border-t border-border pt-4">
                      <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                        <Clock className="h-4 w-4" />
                        Update History
                      </h4>
                      {updatesLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : outreachUpdates.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No detailed updates available.</p>
                      ) : (
                        <div className="space-y-2">
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
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </div>

      {/* Player's Own Outreach */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bebas text-lg uppercase tracking-wide flex items-center gap-2">
            <User className="h-5 w-5" />
            Your Outreach
          </h3>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Club
          </Button>
        </div>
        {playerSubmissions.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              You haven't added any clubs yet. Click "Add Club" to track your own outreach.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {playerSubmissions.map(submission => (
              <Card key={submission.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{submission.club_name}</span>
                        <Badge className={statusConfig[submission.status]?.color || "bg-muted"}>
                          {statusConfig[submission.status]?.label || submission.status}
                        </Badge>
                      </div>
                      {submission.contact_name && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Contact: {submission.contact_name}
                          {submission.contact_role && ` (${submission.contact_role})`}
                        </p>
                      )}
                      {submission.notes && (
                        <p className="text-sm mt-2 text-foreground/80">{submission.notes}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(submission.created_at), "PP")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Club Contact</DialogTitle>
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
              <Label>Notes</Label>
              <Textarea
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                placeholder="Any additional details..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSubmission} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Club
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
