import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, X, ArrowUp, ArrowDown, Image as ImageIcon, Video as VideoIcon, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const OFFER_SECTIONS = [
  { id: "performance", label: "Performance Analysis" },
  { id: "development", label: "Development Tracking" },
  { id: "physical", label: "Physical Programming" },
  { id: "video", label: "Video Analysis" },
  { id: "network", label: "Network & Exposure" },
  { id: "career", label: "Career Management" },
  { id: "education", label: "Education & Mentoring" },
  { id: "portal", label: "Your Personal Portal" },
];

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

interface Props {
  playerId: string;
  playerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PlayerOfferCustomiser = ({ playerId, playerName, open, onOpenChange }: Props) => {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [images, setImages] = useState<Record<string, string>>({});
  const [language, setLanguage] = useState<string>("en");
  const [under18, setUnder18] = useState(false);
  const [secondaryParagraph, setSecondaryParagraph] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any).from("player_offer_settings").select("*").eq("player_id", playerId).maybeSingle();
      setHidden(new Set((data?.hidden_sections || []) as string[]));
      setImages((data?.section_images || {}) as Record<string, string>);
      const { data: pData } = await (supabase as any)
        .from("players").select("portal_language").eq("id", playerId).maybeSingle();
      setLanguage(pData?.portal_language || "en");
      const { data: portalData } = await (supabase as any)
        .from("player_portal_settings")
        .select("rise_with_us_under18, representation_subtitle_secondary")
        .eq("player_id", playerId)
        .maybeSingle();
      setUnder18(!!portalData?.rise_with_us_under18);
      setSecondaryParagraph(portalData?.representation_subtitle_secondary || "");
      setLoading(false);
    })();
  }, [open, playerId]);

  const toggle = (id: string) => {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id); else next.add(id);
    setHidden(next);
  };

  const uploadImage = async (sectionId: string, file: File) => {
    setUploadingId(sectionId);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `offer-sections/${playerId}/${sectionId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("marketing-gallery")
      .upload(path, file, { cacheControl: "3600", upsert: true });
    if (error) {
      toast.error("Upload failed");
      setUploadingId(null);
      return;
    }
    const { data } = supabase.storage.from("marketing-gallery").getPublicUrl(path);
    setImages((prev) => ({ ...prev, [sectionId]: data.publicUrl }));
    setUploadingId(null);
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      player_id: playerId,
      hidden_sections: [...hidden],
      section_images: images,
    };
    const { error } = await (supabase as any)
      .from("player_offer_settings")
      .upsert(payload, { onConflict: "player_id" });
    if (error) { toast.error("Failed to save"); setSaving(false); return; }
    const { error: lErr } = await (supabase as any)
      .from("players").update({ portal_language: language }).eq("id", playerId);
    if (lErr) { toast.error("Failed to save language"); setSaving(false); return; }
    const { error: portalErr } = await (supabase as any)
      .from("player_portal_settings")
      .upsert({
        player_id: playerId,
        rise_with_us_under18: under18,
        representation_subtitle_secondary: secondaryParagraph.trim() || null,
      }, { onConflict: "player_id" });
    if (portalErr) { toast.error("Failed to save offer settings"); setSaving(false); return; }
    toast.success("Offer page updated");
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-5xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Customise offer for {playerName}</DialogTitle></DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : (
        <>
          <div className="rounded-lg border p-3 space-y-2">
            <Label className="font-medium">Offer page language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PORTAL_LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    <span className="flex items-center gap-2"><span>{l.flag}</span><span>{l.label}</span></span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Sets the language for both the offer page and the embedded portal preview.</p>
          </div>
          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="font-medium">Under-18 offer</Label>
                <p className="text-xs text-muted-foreground">Uses the under-18 version of fees, agreement and expectation cards, including no-commission language.</p>
              </div>
              <Switch checked={under18} onCheckedChange={setUnder18} />
            </div>
            <div className="space-y-2">
              <Label className="font-medium">Optional second intro paragraph</Label>
              <Textarea
                value={secondaryParagraph}
                onChange={(e) => setSecondaryParagraph(e.target.value)}
                placeholder="Add an extra paragraph under the main Rise With Us introduction..."
                rows={4}
              />
            </div>
          </div>
          <div className="rounded-lg border p-3 space-y-3">
            <div>
              <Label className="font-medium">Intro cinematic images</Label>
              <p className="text-xs text-muted-foreground">These appear in the opening cinematic collage on the offer page (not on the later cards). Upload up to 6 personal or aspirational images.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(images).map(([key, url]) => (
                <div key={key} className="relative">
                  <img src={url} alt="Intro" className="h-32 w-full object-cover rounded border" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => { const n = { ...prev }; delete n[key]; return n; })}
                    className="absolute top-2 right-2 p-1 rounded-full bg-background/80 border hover:bg-background"
                    aria-label="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {Object.keys(images).length < 6 && (
                <label className="flex items-center justify-center gap-2 h-32 w-full rounded border border-dashed cursor-pointer hover:bg-muted/40 transition">
                  {uploadingId === "intro" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span className="text-sm text-muted-foreground">Add image</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadImage(`intro-${Date.now()}`, f);
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <Label className="font-medium">Sections to show on the offer page</Label>
            <p className="text-xs text-muted-foreground">Toggle which areas of representation this player sees in their personalised offer.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto pr-1">
              {OFFER_SECTIONS.map((s) => {
                const visible = !hidden.has(s.id);
                return (
                  <div key={s.id} className="flex items-center justify-between rounded border p-2">
                    <Label className="font-medium text-sm">{s.label}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{visible ? "Visible" : "Hidden"}</span>
                      <Switch checked={visible} onCheckedChange={() => toggle(s.id)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerOfferCustomiser;