import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface PortfolioRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PortfolioRequestDialog = ({ open, onOpenChange }: PortfolioRequestDialogProps) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: "",
    club: "",
    email: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase.from("form_submissions").insert({
        form_type: "portfolio_request",
        data: formData,
      });

      if (error) throw error;

      toast.success(t('dialogs.portfolio_success', "Portfolio request submitted! We'll be in touch shortly."));
      setFormData({ name: "", club: "", email: "", phone: "" });
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(t('dialogs.portfolio_error', "Failed to submit request. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-3xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bebas uppercase tracking-wider">
            {t('dialogs.request_portfolio', 'Request Full Portfolio')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t('dialogs.portfolio_desc', "Please provide your details and we'll send you our complete player portfolio.")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">{t('dialogs.your_name', 'Your Name')} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('dialogs.name_placeholder', 'John Smith')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="club">{t('dialogs.club_organization', 'Club / Organization')} *</Label>
              <Input
                id="club"
                value={formData.club}
                onChange={(e) => setFormData({ ...formData, club: e.target.value })}
                placeholder={t('dialogs.club_placeholder_fc', 'FC Example')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('dialogs.email', 'Email')} *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t('dialogs.email_placeholder', 'john@example.com')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('dialogs.phone_number', 'Phone Number')}</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+44 123 456 7890"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full font-bebas uppercase tracking-wider text-lg"
          >
            {submitting ? t('dialogs.submitting', 'Submitting...') : t('dialogs.request_portfolio_btn', 'Request Portfolio')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
