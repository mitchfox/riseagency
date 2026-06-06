import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, Copy, ExternalLink, Link2, Loader2,
  MessageSquare, Phone, Users as UsersIcon, StickyNote, Reply, Send,
} from "lucide-react";
import { PlayerNotesBoard } from "@/components/staff/PlayerNotesBoard";
import type { OutreachType } from "./OutreachInteractionDrawer";

interface RowLike {
  id: string;
  player_name: string;
  position: string | null;
  current_club: string | null;
  age: number | null;
  nationality?: string | null;
  date_of_birth?: string | null;
}

interface Interaction {
  id: string;
  kind: string;
  channel: string | null;
  summary: string | null;
  occurred_at: string;
}

const KIND_LABEL: Record<string, string> = {
  message_out: "Message sent",
  reply_in: "Reply received",
  call: "Call",
  meeting: "Meeting",
  note: "Note",
};
const KIND_ICON: Record<string, any> = {
  message_out: Send, reply_in: Reply, call: Phone, meeting: UsersIcon, note: StickyNote,
};
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
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const slugify = (name: string) =>
  (name || "").toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

const ageFromDob = (dob?: string | null): number | null => {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
};

const buildPlayerKey = (name: string | null | undefined, dob: string | null | undefined) =>
  name && dob ? `${name.trim().toLowerCase()}::${dob}` : (name ? name.trim().toLowerCase() : '');

interface Props {
  row: RowLike;
  type: OutreachType;
  onBack: () => void;
}

export const InlinePlayerActionsPanel = ({ row, type, onBack }: Props) => {
  // ---- Offer link form state ----
  const initialAge = ageFromDob(row.date_of_birth) ?? row.age ?? null;
  const [name, setName] = useState(row.player_name || "");
  const [position, setPosition] = useState(row.position || "");
  const [nationality, setNationality] = useState(row.nationality || "");
  const [club, setClub] = useState(row.current_club || "");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState(row.date_of_birth || "");
  const [under18, setUnder18] = useState<boolean>(initialAge !== null ? initialAge < 18 : true);
  const [imageUrl, setImageUrl] = useState("");
  const [bio, setBio] = useState("");
  const [offerUrl, setOfferUrl] = useState<string | null>(null);
  const [hasOffer, setHasOffer] = useState(false);
  const [savingOffer, setSavingOffer] = useState(false);
  const [loadingPlayer, setLoadingPlayer] = useState(true);

  // Load existing player record (if any) for the offer link details
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPlayer(true);
      const { data } = await (supabase as any)
        .from("players")
        .select("id,name,position,nationality,club,email,date_of_birth,image_url,bio,has_representation_offer")
        .ilike("name", row.player_name.trim())
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setPosition(data.position || row.position || "");
        setNationality(data.nationality || row.nationality || "");
        setClub(data.club || row.current_club || "");
        setEmail(data.email || "");
        setDob(data.date_of_birth || row.date_of_birth || "");
        setImageUrl(data.image_url || "");
        setBio(data.bio || "");
        setHasOffer(!!data.has_representation_offer);
        if (data.has_representation_offer) {
          setOfferUrl(`${window.location.origin}/risewithus/${slugify(data.name || row.player_name)}`);
        }
      }
      setLoadingPlayer(false);
    })();
    return () => { cancelled = true; };
  }, [row.id, row.player_name]);

  const submitOffer = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSavingOffer(true);
    try {
      const computedAge = ageFromDob(dob);
      const effectiveAge = computedAge ?? (under18 ? 17 : 19);
      const slug = slugify(name);

      const { data: existing } = await (supabase as any)
        .from("players")
        .select("id")
        .ilike("name", name.trim())
        .limit(1)
        .maybeSingle();

      const payload: Record<string, unknown> = {
        has_representation_offer: true,
        position: position || "Other",
        nationality: nationality || "Unknown",
        club: club || null,
        email: email || null,
        date_of_birth: dob || null,
        age: effectiveAge,
        image_url: imageUrl || null,
        bio: bio || null,
      };

      if (existing?.id) {
        await (supabase as any).from("players").update(payload).eq("id", existing.id);
      } else {
        await (supabase as any).from("players").insert({
          name: name.trim(),
          representation_status: "prospect",
          ...payload,
        });
      }

      const url = `${window.location.origin}/risewithus/${slug}`;
      setOfferUrl(url);
      setHasOffer(true);
      try { await navigator.clipboard.writeText(url); toast.success("Offer link saved & copied"); }
      catch { toast.success("Offer link saved"); }
    } catch (e: any) {
      toast.error("Could not save offer", { description: e?.message });
    } finally {
      setSavingOffer(false);
    }
  };

  // ---- Contact history state ----
  const [items, setItems] = useState<Interaction[]>([]);
  const [loadingHist, setLoadingHist] = useState(true);
  const [kind, setKind] = useState("message_out");
  const [channel, setChannel] = useState("instagram");
  const [summary, setSummary] = useState("");
  const [followup, setFollowup] = useState("");
  const [followupTouched, setFollowupTouched] = useState(false);
  const [savingHist, setSavingHist] = useState(false);

  useEffect(() => {
    if (followupTouched) return;
    const d = autoFollowupDays(kind);
    setFollowup(d === null ? "" : isoDateInDays(d));
  }, [kind, followupTouched]);

  const loadHist = async () => {
    setLoadingHist(true);
    const { data } = await supabase
      .from("outreach_interactions")
      .select("id,kind,channel,summary,occurred_at")
      .eq("outreach_type", type)
      .eq("outreach_id", row.id)
      .order("occurred_at", { ascending: false })
      .limit(100);
    setItems((data as any) || []);
    setLoadingHist(false);
  };
  useEffect(() => { loadHist(); /* eslint-disable-next-line */ }, [row.id, type]);

  const addInteraction = async () => {
    if (!summary.trim() && kind !== "call" && kind !== "meeting") {
      toast.error("Add a short summary"); return;
    }
    setSavingHist(true);
    const occurred_at = new Date().toISOString();
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const { data: inserted, error } = await supabase
        .from("outreach_interactions")
        .insert({
          outreach_id: row.id, outreach_type: type, kind, channel,
          summary: summary.trim() || null,
          created_by: userRes.user?.id ?? null,
        })
        .select("id,kind,channel,summary,occurred_at")
        .single();
      if (error) throw error;
      if (inserted) setItems(prev => [inserted as any, ...prev]);

      const table = type === "youth" ? "player_outreach_youth" : "player_outreach_pro";
      const patch: any = { last_contact_at: occurred_at };
      if (kind === "message_out") patch.messaged = true;
      if (kind === "reply_in") {
        patch.response_received = true;
        patch.response_status = "replied";
        patch.first_response_at = occurred_at;
      }
      if (followup) patch.next_followup_at = followup;
      (supabase.from(table) as any).update(patch).eq("id", row.id);

      setSummary("");
      setFollowupTouched(false);
      toast.success("Interaction logged");
    } catch (e: any) {
      toast.error("Failed to log interaction", { description: e?.message });
    } finally {
      setSavingHist(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to pipeline
          </Button>
          <div className="text-lg font-semibold truncate">{row.player_name}</div>
          {hasOffer && <Badge variant="outline" className="border-primary/60 text-primary">Offer live</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Offer link panel */}
        <div className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" /> Representation offer link
            </div>
          </div>
          {loadingPlayer ? (
            <div className="text-sm text-muted-foreground py-4">Loading player record…</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Position</Label>
                  <Input value={position} onChange={e => setPosition(e.target.value)} placeholder="e.g. CF" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nationality</Label>
                  <Input value={nationality} onChange={e => setNationality(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Current club</Label>
                  <Input value={club} onChange={e => setClub(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Date of birth</Label>
                  <Input type="date" value={dob} onChange={e => setDob(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Age bracket</Label>
                  <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background">
                    <span className={`text-xs ${under18 ? "text-foreground" : "text-muted-foreground"}`}>Under 18</span>
                    <Switch checked={!under18} onCheckedChange={(v) => setUnder18(!v)} />
                    <span className={`text-xs ${!under18 ? "text-foreground" : "text-muted-foreground"}`}>18 and over</span>
                  </div>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Player image URL</Label>
                  <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://…" />
                  {imageUrl && (
                    <div className="mt-2 rounded-md overflow-hidden border border-border w-24 h-24 bg-muted">
                      <img src={imageUrl} alt={name} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Short bio</Label>
                  <Textarea rows={3} value={bio} onChange={e => setBio(e.target.value)} />
                </div>
              </div>

              {offerUrl && (
                <div className="p-3 rounded-md border border-border bg-muted/40 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Offer link</div>
                    <div className="text-xs truncate">{offerUrl}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(offerUrl); toast.success("Copied"); }}>
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.open(offerUrl, "_blank", "noopener,noreferrer")}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={submitOffer} disabled={savingOffer}>
                  {savingOffer ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Link2 className="h-4 w-4 mr-1.5" />}
                  {hasOffer ? "Save changes" : "Create offer link"}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Contact history panel */}
        <div className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
          <div className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" /> Contact history
          </div>
          <div className="space-y-2 border border-border/60 rounded-md p-3 bg-background/40">
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
                <Label className="text-xs">Next follow-up</Label>
                <Input type="date" value={followup}
                  onChange={e => { setFollowup(e.target.value); setFollowupTouched(true); }} />
              </div>
              <Button onClick={addInteraction} disabled={savingHist}>
                {savingHist ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log"}
              </Button>
            </div>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {loadingHist && <div className="text-sm text-muted-foreground">Loading…</div>}
            {!loadingHist && items.length === 0 && (
              <div className="text-sm text-muted-foreground italic">No interactions logged yet.</div>
            )}
            {items.map(it => {
              const Icon = KIND_ICON[it.kind] || MessageSquare;
              return (
                <div key={it.id} className="flex gap-3 border border-border rounded-md p-2.5">
                  <Icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
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
        </div>
      </div>

      {/* Player details & notes */}
      <div className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
        <div className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-primary" /> Player details & notes
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Position</div><div className="font-medium">{position || "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">Club</div><div className="font-medium">{club || "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">Nationality</div><div className="font-medium">{nationality || "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">Age</div><div className="font-medium">{ageFromDob(dob) ?? row.age ?? "—"}</div></div>
        </div>
        <div className="pt-2 border-t border-border/40">
          <PlayerNotesBoard
            playerKey={buildPlayerKey(row.player_name, row.date_of_birth)}
            playerName={row.player_name}
            source={type === "youth" ? "outreach_youth" : "outreach_pro"}
            sourceId={row.id}
          />
        </div>
      </div>
    </div>
  );
};