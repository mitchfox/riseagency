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
  Upload, X, User as UserIcon,
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
  response_status?: string | null;
  messaged?: boolean | null;
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

const PORTAL_LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "pl", label: "Polski", flag: "🇵🇱" },
  { code: "cs", label: "Čeština", flag: "🇨🇿" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "hr", label: "Hrvatski", flag: "🇭🇷" },
  { code: "no", label: "Norsk", flag: "🇳🇴" },
];

const PERSONAL_MSG_LIMIT = 320;
const OFFER_IMAGE_MAX = 6;

interface Props {
  row: RowLike;
  type: OutreachType;
  onBack: () => void;
}

const STAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "not_contacted",   label: "Not contacted" },
  { value: "awaiting_reply",  label: "Awaiting reply" },
  { value: "replied",         label: "Replied — follow up" },
  { value: "interested",      label: "In conversation" },
  { value: "signed",          label: "Signed" },
  { value: "lost",            label: "Lost / cold" },
];

const stagePatchFor = (stageId: string): any => {
  switch (stageId) {
    case "not_contacted":  return { response_status: "none",       messaged: false };
    case "awaiting_reply": return { response_status: "none",       messaged: true };
    case "replied":        return { response_status: "replied",    messaged: true, response_received: true };
    case "interested":     return { response_status: "interested", messaged: true, response_received: true };
    case "signed":         return { response_status: "signed",     messaged: true, response_received: true };
    case "lost":           return { response_status: "lost",       messaged: true };
    default: return {};
  }
};

const stageFromRow = (rs: string | null | undefined, messaged: boolean | null | undefined): string => {
  if (rs === "signed") return "signed";
  if (rs === "not_interested" || rs === "lost") return "lost";
  if (rs === "interested") return "interested";
  if (rs === "replied") return "replied";
  if (messaged) return "awaiting_reply";
  return "not_contacted";
};

export const InlinePlayerActionsPanel = ({ row, type, onBack }: Props) => {
  // ---- Player details (the real source of truth) ----
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [name, setName] = useState(row.player_name || "");
  const [position, setPosition] = useState(row.position || "");
  const [nationality, setNationality] = useState(row.nationality || "");
  const [club, setClub] = useState(row.current_club || "");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState(row.date_of_birth || "");
  const [imageUrl, setImageUrl] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [loadingPlayer, setLoadingPlayer] = useState(true);

  // ---- Offer link state (only things that actually personalise the link) ----
  const [language, setLanguage] = useState<string>("en");
  const [under18Override, setUnder18Override] = useState<boolean | null>(null); // null => derive from DOB
  const [personalMessage, setPersonalMessage] = useState("");
  const [offerImages, setOfferImages] = useState<Record<string, string>>({});
  const [uploadingImg, setUploadingImg] = useState(false);
  const [savingOffer, setSavingOffer] = useState(false);

  // Pipeline stage / category — editable from inside the panel
  const [stage, setStage] = useState<string>(stageFromRow(row.response_status, row.messaged));
  const [savingStage, setSavingStage] = useState(false);
  const changeStage = async (next: string) => {
    const patch = stagePatchFor(next);
    if (Object.keys(patch).length === 0) return;
    setSavingStage(true);
    setStage(next);
    const table = type === "youth" ? "player_outreach_youth" : "player_outreach_pro";
    const { error } = await (supabase.from(table) as any).update(patch).eq("id", row.id);
    setSavingStage(false);
    if (error) { toast.error("Could not move stage", { description: error.message }); return; }
    toast.success(`Moved to ${STAGE_OPTIONS.find(s => s.value === next)?.label || next}`);
  };

  const computedAge = ageFromDob(dob);
  const derivedUnder18 = computedAge !== null ? computedAge < 18 : true;
  const under18 = under18Override ?? derivedUnder18;

  const offerSlug = slugify(name || row.player_name);
  const offerUrl = offerSlug ? `https://risefootballagency.com/risewithus/${offerSlug}` : "";

  // Load existing player record + offer settings.
  // Starred players already have a representation offer — we just edit the details on it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPlayer(true);
      // 1) Player record
      const { data: playerData } = await (supabase as any)
        .from("players")
        .select("id,name,position,nationality,club,email,date_of_birth,image_url,has_representation_offer,portal_language")
        .ilike("name", row.player_name.trim())
        .limit(1)
        .maybeSingle();

      let resolvedId: string | null = playerData?.id ?? null;

      // 2) If no player record exists yet, create one so the offer link is real immediately.
      if (!resolvedId) {
        const ageGuess = ageFromDob(row.date_of_birth) ?? row.age ?? null;
        const { data: created } = await (supabase as any).from("players").insert({
          name: row.player_name.trim(),
          representation_status: "prospect",
          has_representation_offer: true,
          position: row.position || "Other",
          nationality: row.nationality || "Unknown",
          club: row.current_club || null,
          date_of_birth: row.date_of_birth || null,
          age: ageGuess ?? 0,
        }).select("id").maybeSingle();
        resolvedId = created?.id ?? null;
      } else if (!playerData.has_representation_offer) {
        // Make sure the link is live for any starred player.
        await (supabase as any).from("players")
          .update({ has_representation_offer: true })
          .eq("id", resolvedId);
      }

      if (cancelled) return;
      setPlayerId(resolvedId);
      if (playerData) {
        setName(playerData.name || row.player_name);
        setPosition(playerData.position || row.position || "");
        setNationality(playerData.nationality || row.nationality || "");
        setClub(playerData.club || row.current_club || "");
        setEmail(playerData.email || "");
        setDob(playerData.date_of_birth || row.date_of_birth || "");
        setImageUrl(playerData.image_url || "");
        setLanguage(playerData.portal_language || "en");
      }

      // 3) Offer settings (images) + portal settings (under18 + personalised message)
      if (resolvedId) {
        const [offerRes, portalRes] = await Promise.all([
          (supabase as any).from("player_offer_settings")
            .select("section_images").eq("player_id", resolvedId).maybeSingle(),
          (supabase as any).from("player_portal_settings")
            .select("rise_with_us_under18, representation_subtitle_secondary")
            .eq("player_id", resolvedId).maybeSingle(),
        ]);
        if (!cancelled) {
          setOfferImages((offerRes.data?.section_images || {}) as Record<string, string>);
          if (portalRes.data) {
            setUnder18Override(
              typeof portalRes.data.rise_with_us_under18 === "boolean" ? portalRes.data.rise_with_us_under18 : null
            );
            setPersonalMessage(portalRes.data.representation_subtitle_secondary || "");
          }
        }
      }
      if (!cancelled) setLoadingPlayer(false);
    })();
    return () => { cancelled = true; };
  }, [row.id, row.player_name]);

  const saveDetails = async () => {
    if (!playerId) { toast.error("Player record not ready"); return; }
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSavingDetails(true);
    try {
      const ageVal = ageFromDob(dob) ?? row.age ?? 0;
      await (supabase as any).from("players").update({
        name: name.trim(),
        position: position || "Other",
        nationality: nationality || "Unknown",
        club: club || null,
        email: email || null,
        date_of_birth: dob || null,
        age: ageVal,
        image_url: imageUrl || null,
      }).eq("id", playerId);
      toast.success("Player details saved");
    } catch (e: any) {
      toast.error("Could not save details", { description: e?.message });
    } finally {
      setSavingDetails(false);
    }
  };

  const uploadOfferImage = async (file: File) => {
    if (!playerId) { toast.error("Player record not ready"); return; }
    if (Object.keys(offerImages).length >= OFFER_IMAGE_MAX) {
      toast.error(`Maximum ${OFFER_IMAGE_MAX} images`); return;
    }
    setUploadingImg(true);
    const ext = file.name.split(".").pop() || "jpg";
    const key = `intro-${Date.now()}`;
    const path = `offer-sections/${playerId}/${key}.${ext}`;
    const { error } = await supabase.storage
      .from("marketing-gallery")
      .upload(path, file, { cacheControl: "3600", upsert: true });
    if (error) { toast.error("Upload failed"); setUploadingImg(false); return; }
    const { data } = supabase.storage.from("marketing-gallery").getPublicUrl(path);
    setOfferImages(prev => ({ ...prev, [key]: data.publicUrl }));
    setUploadingImg(false);
  };

  const removeOfferImage = (key: string) => {
    setOfferImages(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const saveOfferDetails = async () => {
    if (!playerId) { toast.error("Player record not ready"); return; }
    setSavingOffer(true);
    try {
      await Promise.all([
        (supabase as any).from("players")
          .update({ portal_language: language, has_representation_offer: true })
          .eq("id", playerId),
        (supabase as any).from("player_offer_settings").upsert({
          player_id: playerId,
          section_images: offerImages,
        }, { onConflict: "player_id" }),
        (supabase as any).from("player_portal_settings").upsert({
          player_id: playerId,
          rise_with_us_under18: under18,
          representation_subtitle_secondary: personalMessage.trim() || null,
        }, { onConflict: "player_id" }),
      ]);
      toast.success("Offer details saved");
    } catch (e: any) {
      toast.error("Could not save offer details", { description: e?.message });
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
          <Badge variant="outline" className="border-primary/60 text-primary">Offer live</Badge>
        </div>
        {offerUrl && (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(offerUrl); toast.success("Copied"); }}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy link
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(offerUrl, "_blank", "noopener,noreferrer")}>
              <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
            </Button>
          </div>
        )}
      </div>

      {/* ============ Player details & notes (source of truth) ============ */}
      <div className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
        <div className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-primary" /> Player details & notes
        </div>
        {loadingPlayer ? (
          <div className="text-sm text-muted-foreground py-4">Loading player record…</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Position</Label>
                <Input value={position} onChange={e => setPosition(e.target.value)} placeholder="e.g. CF" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Current club</Label>
                <Input value={club} onChange={e => setClub(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nationality</Label>
                <Input value={nationality} onChange={e => setNationality(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date of birth</Label>
                <Input type="date" value={dob} onChange={e => setDob(e.target.value)} />
                {computedAge !== null && (
                  <p className="text-[10px] text-muted-foreground">Age {computedAge} · {derivedUnder18 ? "Under 18" : "18 and over"}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={saveDetails} disabled={savingDetails}>
                {savingDetails ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Save details
              </Button>
            </div>
            <div className="pt-2 border-t border-border/40">
              <PlayerNotesBoard
                playerKey={buildPlayerKey(row.player_name, row.date_of_birth)}
                playerName={row.player_name}
                source={type === "youth" ? "outreach_youth" : "outreach_pro"}
                sourceId={row.id}
              />
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ============ Representation offer link ============ */}
        <div className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
          <div className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" /> Representation offer link
          </div>
          {loadingPlayer ? (
            <div className="text-sm text-muted-foreground py-4">Loading…</div>
          ) : (
            <>
              {offerUrl && (
                <div className="p-2.5 rounded-md border border-border bg-muted/40 flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Live link</div>
                    <div className="text-xs truncate">{offerUrl}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(offerUrl); toast.success("Copied"); }}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.open(offerUrl, "_blank", "noopener,noreferrer")}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Language shown to player</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PORTAL_LANGUAGES.map(l => (
                      <SelectItem key={l.code} value={l.code}>
                        <span className="flex items-center gap-2"><span>{l.flag}</span><span>{l.label}</span></span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Offer version</Label>
                <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background">
                  <span className={`text-xs ${under18 ? "text-foreground" : "text-muted-foreground"}`}>Under 18</span>
                  <Switch
                    checked={!under18}
                    onCheckedChange={(v) => setUnder18Override(!v)}
                  />
                  <span className={`text-xs ${!under18 ? "text-foreground" : "text-muted-foreground"}`}>18 and over</span>
                  {under18Override === null && (
                    <span className="text-[10px] text-muted-foreground ml-auto">auto from DOB</span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Personalised message</Label>
                  <span className={`text-[10px] ${personalMessage.length > PERSONAL_MSG_LIMIT ? "text-destructive" : "text-muted-foreground"}`}>
                    {personalMessage.length}/{PERSONAL_MSG_LIMIT}
                  </span>
                </div>
                <Textarea
                  rows={4}
                  value={personalMessage}
                  onChange={e => setPersonalMessage(e.target.value.slice(0, PERSONAL_MSG_LIMIT))}
                  placeholder="What we specifically like about this player — shown on their offer page."
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Player images <span className="text-muted-foreground">({Object.keys(offerImages).length}/{OFFER_IMAGE_MAX})</span></Label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(offerImages).map(([key, url]) => (
                    <div key={key} className="relative h-24 rounded-md overflow-hidden border border-border bg-muted">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeOfferImage(key)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-background/80 border hover:bg-background"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {Object.keys(offerImages).length < OFFER_IMAGE_MAX && (
                    <label className="flex items-center justify-center h-24 rounded-md border border-dashed border-border cursor-pointer hover:bg-muted/30 transition">
                      {uploadingImg ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <Upload className="h-4 w-4" />
                          <span className="text-[10px]">Upload</span>
                        </div>
                      )}
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadOfferImage(f); e.currentTarget.value = ""; }} />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveOfferDetails} disabled={savingOffer}>
                  {savingOffer ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Link2 className="h-4 w-4 mr-1.5" />}
                  Save offer details
                </Button>
              </div>
            </>
          )}
        </div>

        {/* ============ Contact history ============ */}
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
    </div>
  );
};