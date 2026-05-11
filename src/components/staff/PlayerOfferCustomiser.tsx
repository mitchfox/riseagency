import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X } from "lucide-react";
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

interface Props {
  playerId: string;
  playerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PlayerOfferCustomiser = ({ playerId, playerName, open, onOpenChange }: Props) => {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [images, setImages] = useState<Record<string, string>>({});
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
    toast.success("Offer page updated");
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Customise offer for {playerName}</DialogTitle></DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {OFFER_SECTIONS.map((s) => {
              const visible = !hidden.has(s.id);
              return (
                <div key={s.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">{s.label}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{visible ? "Visible" : "Hidden"}</span>
                      <Switch checked={visible} onCheckedChange={() => toggle(s.id)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Section image (optional)</Label>
                    {images[s.id] ? (
                      <div className="relative">
                        <img src={images[s.id]} alt={s.label} className="h-32 w-full object-cover rounded border" />
                        <button
                          type="button"
                          onClick={() => setImages((prev) => { const n = { ...prev }; delete n[s.id]; return n; })}
                          className="absolute top-2 right-2 p-1 rounded-full bg-background/80 border hover:bg-background"
                          aria-label="Remove image"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 h-24 w-full rounded border border-dashed cursor-pointer hover:bg-muted/40 transition">
                        {uploadingId === s.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            <span className="text-sm text-muted-foreground">Upload image</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadImage(s.id, f);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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