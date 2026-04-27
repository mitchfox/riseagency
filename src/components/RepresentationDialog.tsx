import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";

interface RepresentationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ageGroup?: "under18" | "over18" | null;
  /** Optional pre-fill values gathered before the form opens. */
  initialPosition?: string;
  initialDob?: string;
}

const baseSchema = {
  name: z.string().trim().min(1, "Name is required").max(100),
  phone: z.string().trim().min(1, "Phone number is required").max(50),
  email: z.string().trim().email("Invalid email address").max(255).optional().or(z.literal("")),
  currentClub: z.string().trim().min(1, "Current club is required").max(100),
  dob: z.string().trim().min(1, "Date of birth is required"),
  position: z.string().trim().max(100).optional().or(z.literal("")),
  message: z.string().trim().max(1000),
};

const buildSchema = (isUnder18: boolean) =>
  z.object({
    ...baseSchema,
    parentName: isUnder18
      ? z.string().trim().min(1, "Parent or guardian name is required").max(100)
      : z.string().trim().max(100).optional().or(z.literal("")),
    parentPhone: isUnder18
      ? z.string().trim().min(1, "Parent or guardian phone is required").max(50)
      : z.string().trim().max(50).optional().or(z.literal("")),
  });

export const RepresentationDialog = ({
  open, onOpenChange, ageGroup,
  initialPosition = "", initialDob = "",
}: RepresentationDialogProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  // Refs for the input fields so Enter can advance to the next one.
  // Date of Birth and Position are skipped intentionally (they're
  // pre-filled from the home rectangle and require manual interaction).
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const clubRef = useRef<HTMLInputElement>(null);
  const parentNameRef = useRef<HTMLInputElement>(null);
  const parentPhoneRef = useRef<HTMLInputElement>(null);
  const firstVideoRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    currentClub: "",
    dob: initialDob,
    position: initialPosition,
    message: "",
    videoLinks: [""],
    parentName: "",
    parentPhone: "",
  });

  // Refresh the prefill whenever the dialog re-opens so the fields
  // reflect the most recent position / DOB the user chose on the
  // home rectangle. The user can still edit either field freely.
  useEffect(() => {
    if (!open) return;
    setFormData((prev) => ({
      ...prev,
      dob: initialDob || prev.dob,
      position: initialPosition || prev.position,
    }));
  }, [open, initialDob, initialPosition]);

  /** Enter on a field advances focus to the next ref in the chain. */
  const advance = (next: React.RefObject<HTMLInputElement>) =>
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      next.current?.focus();
    };

  // Derive under-18 status either from the upfront age choice OR the entered DOB.
  const isUnder18FromDob = (() => {
    if (!formData.dob) return false;
    const dob = new Date(formData.dob);
    if (isNaN(dob.getTime())) return false;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age < 18;
  })();
  const isUnder18 = ageGroup === "under18" || isUnder18FromDob;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      buildSchema(isUnder18).parse(formData);

      const { error } = await supabase.functions.invoke("send-form-email", {
        body: { formType: "representation", data: { ...formData, ageGroup: ageGroup ?? "unspecified" } },
      });

      if (error) throw error;

      toast({
        title: t('representation.success_title', 'Request Submitted'),
        description: t('representation.success_desc', "We'll be in touch soon!"),
      });

      onOpenChange(false);
      setFormData({
        name: "",
        phone: "",
        email: "",
        currentClub: "",
        dob: "",
        position: "",
        message: "",
        videoLinks: [""],
        parentName: "",
        parentPhone: "",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: t('common.validation_error', 'Validation Error'),
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error("Error submitting form:", error);
        toast({
          title: t('common.error', 'Error'),
          description: t('representation.error_desc', 'Failed to submit request. Please try again.'),
          variant: "destructive",
        });
      }
    }
  };

  const handleWhatsApp = () => {
    // Build a WhatsApp message that includes whatever the user has
    // already typed so the conversation starts with full context.
    const lines: string[] = [
      t("representation.whatsapp_intro", "Hi RISE — I'd like to enquire about representation."),
      "",
    ];
    if (formData.name) lines.push(`Name: ${formData.name}`);
    if (formData.phone) lines.push(`Phone: ${formData.phone}`);
    if (formData.email) lines.push(`Email: ${formData.email}`);
    if (formData.currentClub) lines.push(`Current club: ${formData.currentClub}`);
    if (formData.dob) lines.push(`Date of birth: ${formData.dob}`);
    if (formData.position) lines.push(`Position: ${formData.position}`);
    if (isUnder18) {
      if (formData.parentName) lines.push(`Parent/guardian: ${formData.parentName}`);
      if (formData.parentPhone) lines.push(`Parent/guardian phone: ${formData.parentPhone}`);
    }
    const videos = formData.videoLinks.filter((v) => v.trim());
    if (videos.length) {
      lines.push("Match videos:");
      videos.forEach((v) => lines.push(`- ${v}`));
    }
    if (formData.message) {
      lines.push("");
      lines.push(`Notes: ${formData.message}`);
    }
    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/447508342901?text=${text}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[900px] max-h-[90vh] overflow-y-auto z-[150]">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bebas uppercase tracking-wider">
            {t('representation.title', 'Request Representation')}
          </DialogTitle>
          <DialogDescription>
            {t('representation.description', 'Fill out the form below or contact us directly on WhatsApp')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="name">{t('representation.full_name', 'Full Name')} *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="phone">{t('representation.phone', 'Phone Number')} *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                placeholder="+44 7340 184399"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('representation.email', 'Email')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="currentClub">{t('representation.current_club', 'Current Club')} *</Label>
              <Input
                id="currentClub"
                value={formData.currentClub}
                onChange={(e) => setFormData({ ...formData, currentClub: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                placeholder="e.g., Manchester United U21"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob">{t('representation.dob', 'Date of Birth')} *</Label>
              <Input
                id="dob"
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">{t('representation.position', 'Position')}</Label>
            <Input
              id="position"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
              placeholder="e.g., Striker, Midfielder"
            />
          </div>

          {isUnder18 && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="parentName">{t('representation.parent_name', "Parent or Guardian Name")}</Label>
                  <Input
                    id="parentName"
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                    placeholder="Jane Doe"
                    required={isUnder18}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parentPhone">{t('representation.parent_phone', "Parent or Guardian Phone")}</Label>
                  <Input
                    id="parentPhone"
                    type="tel"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                    placeholder="+44 7340 184399"
                    required={isUnder18}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('representation.video_links', 'Match Video Links')} <span className="text-muted-foreground text-xs">({t('representation.video_links_hint', 'Full match videos preferred, highlights also accepted')})</span></Label>
            {formData.videoLinks.map((link, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  value={link}
                  onChange={(e) => {
                    const updated = [...formData.videoLinks];
                    updated[idx] = e.target.value;
                    setFormData({ ...formData, videoLinks: updated });
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                  placeholder="https://youtube.com/watch?v=..."
                />
                {formData.videoLinks.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => {
                      const updated = formData.videoLinks.filter((_, i) => i !== idx);
                      setFormData({ ...formData, videoLinks: updated });
                    }}
                  >
                    ✕
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFormData({ ...formData, videoLinks: [...formData.videoLinks, ""] })}
              className="text-xs"
            >
              + {t('representation.add_another_link', 'Add another link')}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">{t('representation.additional_info', 'Additional Information')}</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder={t('representation.message_placeholder', 'Tell us about your experience and goals...')}
              className="min-h-[40px] sm:min-h-[80px]"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="submit"
              hoverEffect
              className="flex-1 btn-shine font-bebas uppercase tracking-wider"
            >
              {t('representation.submit', 'Submit Request')}
            </Button>
            <Button
              type="button"
              variant="outline"
              hoverEffect
              onClick={handleWhatsApp}
              className="flex-1 font-bebas uppercase tracking-wider gap-2"
            >
              <MessageCircle className="h-5 w-5" />
              {t('representation.whatsapp', 'WhatsApp Us')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
