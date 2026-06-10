import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Building2, ChevronDown, ChevronUp, Clock, Loader2, MessageSquare, Send } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  type ClubContactRow,
  type CommunicationEntry,
  fetchCommunicationsFor,
  addCommunication,
} from "@/lib/transferHubData";

const statusConfig: Record<string, { label: string; color: string }> = {
  contacted: { label: "Contacted", color: "bg-muted text-muted-foreground" },
  responded: { label: "Responded", color: "bg-blue-500/20 text-blue-400" },
  meeting: { label: "Meeting", color: "bg-yellow-500/20 text-yellow-400" },
  interested: { label: "Interested", color: "bg-green-500/20 text-green-400" },
  rejected: { label: "Rejected", color: "bg-red-500/20 text-red-400" },
};

interface Props {
  rows: ClubContactRow[];
  /** When true, hides the per-row "Add update" form (used in read-only player views). */
  readOnly?: boolean;
  /** Shown when the player name should appear (e.g. staff "all players" mode). */
  showPlayerName?: boolean;
  onChanged?: () => void;
  emptyMessage?: string;
}

export const PlayerClubContactList = ({
  rows,
  readOnly = false,
  showPlayerName = false,
  onChanged,
  emptyMessage = "No clubs contacted yet.",
}: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comms, setComms] = useState<CommunicationEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [newSummary, setNewSummary] = useState("");
  const [newNextStep, setNewNextStep] = useState("");
  const [saving, setSaving] = useState(false);

  const handleToggle = async (row: ClubContactRow) => {
    const key = `${row.source}:${row.outreach_id}:${row.player_id}`;
    if (expandedId === key) {
      setExpandedId(null);
      return;
    }
    setExpandedId(key);
    setNewSummary("");
    setNewNextStep("");
    setLoading(true);
    try {
      const list = await fetchCommunicationsFor(row.outreach_id, row.source);
      setComms(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (row: ClubContactRow) => {
    if (!newSummary.trim()) {
      toast.error("Add a short update first");
      return;
    }
    setSaving(true);
    try {
      await addCommunication(
        { outreach_id: row.outreach_id, source: row.source },
        { summary: newSummary.trim(), next_step: newNextStep.trim() || null },
      );
      toast.success("Update added");
      setNewSummary("");
      setNewNextStep("");
      const list = await fetchCommunicationsFor(row.outreach_id, row.source);
      setComms(list);
      onChanged?.();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to add update");
    } finally {
      setSaving(false);
    }
  };

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const key = `${row.source}:${row.outreach_id}:${row.player_id}`;
        const isOpen = expandedId === key;
        const cfg = statusConfig[row.status] || { label: row.status, color: "bg-muted" };
        return (
          <Collapsible key={key} open={isOpen} onOpenChange={() => handleToggle(row)}>
            <Card className="overflow-hidden">
              <CollapsibleTrigger asChild>
                <button type="button" className="w-full text-left">
                  <CardContent className="p-3 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                    <Building2 className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium truncate">{row.club_name}</span>
                        {showPlayerName && (
                          <Badge variant="outline" className="text-xs">{row.player_name}</Badge>
                        )}
                        <Badge className={cfg.color + " text-xs"}>{cfg.label}</Badge>
                        {row.communications_count > 0 && (
                          <span className="text-xs text-muted-foreground">{row.communications_count} update{row.communications_count === 1 ? "" : "s"}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                        {row.contact_name && (
                          <span>
                            {row.contact_name}
                            {row.contact_role ? ` · ${row.contact_role}` : ""}
                          </span>
                        )}
                        {row.last_contacted_at && (
                          <span>Last: {format(new Date(row.last_contacted_at), "d MMM yyyy")}</span>
                        )}
                      </div>
                      {row.last_summary && (
                        <p className="text-sm text-muted-foreground truncate">{row.last_summary}</p>
                      )}
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </CardContent>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t bg-muted/10 p-4 space-y-4">
                  {!readOnly && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Add update
                      </div>
                      <Textarea
                        value={newSummary}
                        onChange={(e) => setNewSummary(e.target.value)}
                        placeholder="What was sent or said?"
                        rows={2}
                      />
                      <Input
                        value={newNextStep}
                        onChange={(e) => setNewNextStep(e.target.value)}
                        placeholder="Next step (optional)"
                      />
                      <div className="flex justify-end">
                        <Button size="sm" onClick={() => handleAdd(row)} disabled={saving}>
                          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                          Add update
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> History
                    </div>
                    {loading ? (
                      <div className="text-sm text-muted-foreground py-2">Loading…</div>
                    ) : comms.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No updates logged yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-[260px] overflow-y-auto">
                        {comms.map((c) => (
                          <div key={c.id} className="rounded-md border border-border/50 bg-background/40 p-3 text-sm space-y-1">
                            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                              <span>
                                {format(new Date(c.contacted_at), "d MMM yyyy, HH:mm")}
                                {c.contact_name ? ` · ${c.contact_name}` : ""}
                                {c.contact_role ? ` (${c.contact_role})` : ""}
                              </span>
                              {c.channel && <Badge variant="outline" className="text-[10px]">{c.channel}</Badge>}
                            </div>
                            {c.summary && <p className="whitespace-pre-wrap">{c.summary}</p>}
                            {c.next_step && (
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">Next step:</span> {c.next_step}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
};