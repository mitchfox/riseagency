import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link2, Loader2, Copy, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const slugify = (name: string) =>
  (name || "").toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

const ageFromDob = (dob?: string | null): number | null => {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
};

export interface OutreachSourceData {
  name: string;
  position?: string | null;
  nationality?: string | null;
  club?: string | null;
  date_of_birth?: string | null;
  age?: number | null;
  email?: string | null;
  image_url?: string | null;
  bio?: string | null;
}

interface Props {
  source: OutreachSourceData;
  size?: "sm" | "default";
  variant?: "outline" | "default" | "ghost" | "secondary";
  label?: string;
  onCreated?: (slug: string, playerId: string) => void;
  className?: string;
}

export const CreateOfferButton = ({ source, size = "sm", variant = "outline", label = "Create offer link", onCreated, className }: Props) => {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  // Editable draft
  const initialDobAge = ageFromDob(source.date_of_birth) ?? source.age ?? null;
  const [name, setName] = useState(source.name || "");
  const [position, setPosition] = useState(source.position || "");
  const [nationality, setNationality] = useState(source.nationality || "");
  const [club, setClub] = useState(source.club || "");
  const [email, setEmail] = useState(source.email || "");
  const [dob, setDob] = useState(source.date_of_birth || "");
  const [under18, setUnder18] = useState<boolean>(initialDobAge !== null ? initialDobAge < 18 : true);
  const [imageUrl, setImageUrl] = useState(source.image_url || "");
  const [bio, setBio] = useState(source.bio || "");

  useEffect(() => {
    if (!open) return;
    // Reset form to latest source values when opened
    const a = ageFromDob(source.date_of_birth) ?? source.age ?? null;
    setName(source.name || "");
    setPosition(source.position || "");
    setNationality(source.nationality || "");
    setClub(source.club || "");
    setEmail(source.email || "");
    setDob(source.date_of_birth || "");
    setUnder18(a !== null ? a < 18 : true);
    setImageUrl(source.image_url || "");
    setBio(source.bio || "");
    setCreatedUrl(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const openForm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!source.name?.trim()) {
      toast.error("No player name to build an offer link");
      return;
    }
    setOpen(true);
  };

  const submit = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setBusy(true);
    try {
      const computedAge = ageFromDob(dob);
      // If no DOB, fall back to the under/over 18 toggle so downstream code that
      // still expects an age has a sensible value (under 18 → 17, otherwise 19).
      const effectiveAge = computedAge ?? (under18 ? 17 : 19);

      // 1. Look up player by case-insensitive name match
      const { data: existing } = await (supabase as any)
        .from("players")
        .select("id, name, has_representation_offer")
        .ilike("name", name.trim())
        .limit(1)
        .maybeSingle();

      let playerId: string;
      const slug = slugify(name);

      if (existing?.id) {
        playerId = existing.id;
        const updates: Record<string, unknown> = {
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
        await (supabase as any).from("players").update(updates).eq("id", playerId);
      } else {
        // 2. Create new prospect player row
        const insertPayload: any = {
          name: name.trim(),
          position: position || "Other",
          nationality: nationality || "Unknown",
          age: effectiveAge,
          club: club || null,
          date_of_birth: dob || null,
          email: email || null,
          image_url: imageUrl || null,
          bio: bio || null,
          representation_status: "prospect",
          has_representation_offer: true,
        };
        const { data: created, error: insErr } = await (supabase as any)
          .from("players")
          .insert(insertPayload)
          .select("id")
          .single();
        if (insErr || !created) {
          toast.error("Could not create player record", { description: insErr?.message });
          setBusy(false);
          return;
        }
        playerId = created.id;
      }

      const url = `${window.location.origin}/risewithus/${slug}`;
      setCreatedUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Offer link copied");
      } catch {
        toast.success("Offer link ready");
      }
      onCreated?.(slug, playerId);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button type="button" size={size} variant={variant} className={className} onClick={openForm} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Link2 className="h-4 w-4 mr-1.5" />}
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create representation offer</DialogTitle>
            <DialogDescription>
              Review the details that will appear on the player's offer page. Everything here is editable, and the page itself can be refined later from the player record.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ro-name" className="text-xs">Name</Label>
              <Input id="ro-name" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ro-pos" className="text-xs">Position</Label>
              <Input id="ro-pos" value={position} onChange={e => setPosition(e.target.value)} placeholder="e.g. CF, CM, GK" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ro-nat" className="text-xs">Nationality</Label>
              <Input id="ro-nat" value={nationality} onChange={e => setNationality(e.target.value)} placeholder="e.g. England" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ro-club" className="text-xs">Current club</Label>
              <Input id="ro-club" value={club} onChange={e => setClub(e.target.value)} placeholder="e.g. Paris Saint-Germain" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ro-dob" className="text-xs">Date of birth (optional)</Label>
              <Input id="ro-dob" type="date" value={dob} onChange={e => setDob(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Age bracket</Label>
              <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background">
                <span className={`text-xs ${under18 ? "text-foreground" : "text-muted-foreground"}`}>Under 18</span>
                <Switch checked={!under18} onCheckedChange={(v) => setUnder18(!v)} />
                <span className={`text-xs ${!under18 ? "text-foreground" : "text-muted-foreground"}`}>18 and over</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Used when date of birth isn't known yet — toggles what the offer page shows.</p>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="ro-email" className="text-xs">Email (optional)</Label>
              <Input id="ro-email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="ro-image" className="text-xs">Player image URL</Label>
              <Input id="ro-image" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://…" />
              {imageUrl ? (
                <div className="mt-2 rounded-md overflow-hidden border border-border w-32 h-32 bg-muted">
                  <img src={imageUrl} alt={name} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                </div>
              ) : null}
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="ro-bio" className="text-xs">Short bio (optional)</Label>
              <Textarea id="ro-bio" rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="One or two lines that frame the player on the offer page." />
            </div>
          </div>

          {createdUrl ? (
            <div className="mt-3 p-3 rounded-md border border-border bg-muted/40 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Offer link</div>
                <div className="text-xs truncate">{createdUrl}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(createdUrl); toast.success("Copied"); }}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.open(createdUrl, "_blank", "noopener,noreferrer")}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
                </Button>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Link2 className="h-4 w-4 mr-1.5" />}
              {createdUrl ? "Save changes" : "Create offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};