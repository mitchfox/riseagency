import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { MessageSquare, Phone, Users as UsersIcon, Mail, StickyNote, Reply, Send } from "lucide-react";

export type OutreachType = "youth" | "pro";

interface Interaction {
  id: string;
  kind: string;
  channel: string | null;
  summary: string | null;
  occurred_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outreachId: string | null;
  outreachType: OutreachType;
  playerName?: string;
  onChanged?: () => void;
}

const KIND_LABEL: Record<string, string> = {
  message_out: "Message sent",
  reply_in: "Reply received",
  call: "Call",
  meeting: "Meeting",
  note: "Note",
};

const KIND_ICON: Record<string, any> = {
  message_out: Send,
  reply_in: Reply,
  call: Phone,
  meeting: UsersIcon,
  note: StickyNote,
};

// Smart defaults: +3d after message_out, +2d after reply_in, +7d after call/meeting, none on note.
const autoFollowupDays = (kind: string): number | null => {
  switch (kind) {
    case "message_out": return 3;
    case "reply_in":    return 2;
    case "call":
    case "meeting":     return 7;
    default:            return null;
  }
};
const isoDateInDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const OutreachInteractionDrawer = ({ open, onOpenChange, outreachId, outreachType, playerName, onChanged }: Props) => {
  const [items, setItems] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState("reply_in");
  const [channel, setChannel] = useState("instagram");
  const [summary, setSummary] = useState("");
  const [followup, setFollowup] = useState<string>("");
  const [followupTouched, setFollowupTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  // Auto-prefill follow-up date when interaction type changes (unless user has typed one)
  useEffect(() => {
    if (followupTouched) return;
    const d = autoFollowupDays(kind);
    setFollowup(d === null ? "" : isoDateInDays(d));
  }, [kind, followupTouched]);

  useEffect(() => {
    if (!open || !outreachId) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("outreach_interactions")
        .select("id,kind,channel,summary,occurred_at")
        .eq("outreach_type", outreachType)
        .eq("outreach_id", outreachId)
        .order("occurred_at", { ascending: false })
        .limit(50);
      setItems((data as any) || []);
      setLoading(false);
    };
    load();
  }, [open, outreachId, outreachType]);

  // Reset follow-up touched state when the drawer reopens for a different row
  useEffect(() => { if (open) setFollowupTouched(false); }, [open, outreachId]);

  const handleAdd = async () => {
    if (!outreachId) return;
    if (!summary.trim() && kind !== "call" && kind !== "meeting") {
      toast.error("Add a short summary");
      return;
    }
    setSaving(true);

    // Optimistic prepend
    const occurred_at = new Date().toISOString();
    const tempId = `tmp-${Date.now()}`;
    const optimistic: Interaction = {
      id: tempId, kind, channel, summary: summary.trim() || null, occurred_at,
    };
    setItems(prev => [optimistic, ...prev]);
    const savedSummary = summary;
    setSummary("");

    try {
      const { data: userRes } = await supabase.auth.getUser();
      const { data: inserted, error } = await supabase
        .from("outreach_interactions")
        .insert({
          outreach_id: outreachId,
          outreach_type: outreachType,
          kind,
          channel,
          summary: savedSummary.trim() || null,
          created_by: userRes.user?.id ?? null,
        })
        .select("id,kind,channel,summary,occurred_at")
        .single();
      if (error) throw error;

      // Swap optimistic for real row
      if (inserted) {
        setItems(prev => prev.map(it => it.id === tempId ? (inserted as any) : it));
      }

      // Parent row patch — fire and forget, don't block
      const table = outreachType === "youth" ? "player_outreach_youth" : "player_outreach_pro";
      const patch: any = { last_contact_at: occurred_at };
      if (kind === "message_out") patch.messaged = true;
      if (kind === "reply_in") {
        patch.response_received = true;
        patch.response_status = "replied";
        patch.first_response_at = occurred_at;
      }
      if (followup) patch.next_followup_at = followup;
      (supabase.from(table) as any).update(patch).eq("id", outreachId).then(() => onChanged?.());

      toast.success("Interaction logged");
      // Reset follow-up to next smart default for next entry
      setFollowupTouched(false);
    } catch (e: any) {
      setItems(prev => prev.filter(it => it.id !== tempId));
      setSummary(savedSummary);
      toast.error("Failed to log interaction", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{playerName || "Outreach"} — Contact history</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3 border border-border rounded-lg p-3 bg-card/40">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="message_out">Message sent</SelectItem>
                  <SelectItem value="reply_in">Reply received</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="in_person">In person</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Summary</Label>
            <Textarea value={summary} onChange={e => setSummary(e.target.value)} rows={2} placeholder="What was said?" />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-xs">
                Next follow-up
                {!followupTouched && followup && (
                  <span className="ml-2 text-[10px] text-muted-foreground">auto · clear to skip</span>
                )}
              </Label>
              <Input
                type="date"
                value={followup}
                onChange={e => { setFollowup(e.target.value); setFollowupTouched(true); }}
              />
            </div>
            <Button onClick={handleAdd} disabled={saving}>Log</Button>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">History</div>
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!loading && items.length === 0 && (
            <div className="text-sm text-muted-foreground italic">No interactions logged yet.</div>
          )}
          {items.map(it => {
            const Icon = KIND_ICON[it.kind] || MessageSquare;
            return (
              <div key={it.id} className="flex gap-3 border border-border rounded-md p-2.5">
                <Icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{KIND_LABEL[it.kind] || it.kind}</span>
                    {it.channel && <Badge variant="outline" className="text-[10px] px-1 py-0">{it.channel}</Badge>}
                    <span>· {formatDistanceToNow(new Date(it.occurred_at), { addSuffix: true })}</span>
                  </div>
                  {it.summary && <div className="text-sm mt-1 whitespace-pre-wrap">{it.summary}</div>}
                  <div className="text-[10px] text-muted-foreground mt-1">{format(new Date(it.occurred_at), "dd MMM yyyy HH:mm")}</div>
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};