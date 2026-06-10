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
import { LoadingSpinner } from "@/components/LoadingSpinner";
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
  // Track which outreach IDs come from the new club_outreach_links table
  // (vs the legacy club_outreach table) so we can hit the right table when expanding.
  const [newOutreachIds, setNewOutreachIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (playerId) {
      fetchData();
    }
  }, [playerId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Legacy RISE outreach (kept for historical records)
      const { data: legacyData, error: legacyError } = await supabase
        .from("club_outreach")
        .select("*")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false });
      if (legacyError) throw legacyError;

      // 2. New-style outreach via link_players → club_outreach_links → club_map_positions
      const { data: linkPlayers } = await supabase
        .from("club_outreach_link_players" as any)
        .select("link_id")
        .eq("player_id", playerId);
      const linkIds = Array.from(new Set((linkPlayers || []).map((l: any) => l.link_id).filter(Boolean)));

      let newRows: ClubOutreach[] = [];
      const newIds = new Set<string>();
      if (linkIds.length > 0) {
        const { data: links } = await supabase
          .from("club_outreach_links" as any)
          .select("id, club_id, status, club_contact_name, club_contact_role, created_at, updated_at, archived_at")
          .in("id", linkIds)
          .is("archived_at", null)
          .order("created_at", { ascending: false });

        const clubIds = Array.from(new Set((links || []).map((l: any) => l.club_id).filter(Boolean)));
        const clubMap: Record<string, string> = {};
        if (clubIds.length > 0) {
          const { data: clubs } = await supabase
            .from("club_map_positions")
            .select("id, club_name")
            .in("id", clubIds);
          (clubs || []).forEach((c: any) => { clubMap[c.id] = c.club_name; });
        }

        // Latest communication per link for "latest update" text
        const latestByLink: Record<string, { text: string; date: string }> = {};
        if (linkIds.length > 0) {
          const { data: comms } = await supabase
            .from("club_outreach_communications" as any)
            .select("outreach_id, summary, next_step, contacted_at, created_at")
            .in("outreach_id", linkIds)
            .order("contacted_at", { ascending: false });
          (comms || []).forEach((c: any) => {
            if (!latestByLink[c.outreach_id]) {
              latestByLink[c.outreach_id] = {
                text: c.summary || c.next_step || "",
                date: c.contacted_at || c.created_at,
              };
            }
          });
        }

        newRows = (links || []).map((l: any) => {
          newIds.add(l.id);
          const latest = latestByLink[l.id];
          return {
            id: l.id,
            club_name: clubMap[l.club_id] || "Club",
            contact_name: l.club_contact_name,
            contact_role: l.club_contact_role,
            status: l.status || "contacted",
            latest_update: latest?.text || null,
            latest_update_date: latest?.date || null,
            created_at: l.created_at,
          };
        });
      }

      // Merge, de-duplicate by club_name (case-insensitive), newest first.
      const merged: ClubOutreach[] = [...newRows, ...(legacyData || [])];
      const seen = new Set<string>();
      const deduped = merged.filter(r => {
        const key = (r.club_name || "").toLowerCase().trim();
        if (!key) return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRiseOutreach(deduped);
      setNewOutreachIds(newIds);

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
      if (newOutreachIds.has(outreachId)) {
        // New-style: pull communications for this link
        const { data, error } = await supabase
          .from("club_outreach_communications" as any)
          .select("id, summary, next_step, contacted_at, created_at")
          .eq("outreach_id", outreachId)
          .order("contacted_at", { ascending: false });
        if (error) throw error;
        const mapped: OutreachUpdate[] = (data || []).map((c: any) => ({
          id: c.id,
          update_text: [c.summary, c.next_step ? `Next step: ${c.next_step}` : null].filter(Boolean).join("\n\n"),
          created_at: c.contacted_at || c.created_at,
        }));
        setOutreachUpdates(mapped);
      } else {
        const { data, error } = await supabase
          .from("club_outreach_updates")
          .select("*")
          .eq("outreach_id", outreachId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setOutreachUpdates(data || []);
      }
    } catch (error) {
      console.error("Error fetching updates:", error);
    } finally {
      setUpdatesLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="md" className="py-8" />;
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
                        <LoadingSpinner size="sm" className="py-4" />
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
