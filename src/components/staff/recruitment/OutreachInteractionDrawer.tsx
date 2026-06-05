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

export const OutreachInteractionDrawer = ({ open, onOpenChange, outreachId, outreachType, playerName, onChanged }: Props) => {
  const [items, setItems] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState("reply_in");
  const [channel, setChannel] = useState("instagram");
  const [summary, setSummary] = useState("");
  const [followup, setFollowup] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !outreachId) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("outreach_interactions")
        .select("id,kind,channel,summary,occurred_at")
        .eq("outreach_type", outreachType)
        .eq("outreach_id", outreachId)
        .order("occurred_at", { ascending: false });
      setItems((data as any) || []);
      setLoading(false);
    };
    load();
  }, [open, outreachId, outreachType]);

  const handleAdd = async () => {
    if (!outreachId) return;
    if (!summary.trim() && kind !== "call" && kind !== "meeting") {
      toast.error("Add a short summary");
      return;
    }
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("outreach_interactions").insert({
      outreach_id: outreachId,
      outreach_type: outreachType,
      kind,
      channel,
      summary: summary.trim() || null,
      created_by: userRes.user?.id ?? null,
    });
    if (error) {
      toast.error("Failed to log interaction");
      setSaving(false);
      return;
    }

    // Update parent row timestamps + status
    const now = new Date().toISOString();
    const table = outreachType === "youth" ? "player_outreach_youth" : "player_outreach_pro";
    const patch: any = { last_contact_at: now };
    if (kind === "message_out") patch.messaged = true;
    if (kind === "reply_in") {
      patch.response_received = true;
      patch.response_status = "replied";
      patch.first_response_at = now; // safe-ish; backfilled rows already have a value
    }
    if (followup) patch.next_followup_at = followup;
    await (supabase.from(table) as any).update(patch).eq("id", outreachId);

    setSummary("");
    setFollowup("");
    toast.success("Interaction logged");
    onChanged?.();
    // reload
    const { data } = await supabase
      .from("outreach_interactions")
      .select("id,kind,channel,summary,occurred_at")
      .eq("outreach_type", outreachType)
      .eq("outreach_id", outreachId)
      .order("occurred_at", { ascending: false });
    setItems((data as any) || []);
    setSaving(false);
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
              <Label className="text-xs">Next follow-up (optional)</Label>
              <Input type="date" value={followup} onChange={e => setFollowup(e.target.value)} />
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