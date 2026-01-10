import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import { useLanguage } from "@/contexts/LanguageContext";

interface PlayerReportDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const PlayerReportDialog = ({ children, open, onOpenChange }: PlayerReportDialogProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.target as HTMLFormElement);
    const data: Record<string, any> = { formType: "player-report-request" };
    formData.forEach((value, key) => {
      data[key] = value;
    });

    try {
      const { error } = await supabase.functions.invoke("send-form-email", {
        body: { formType: "player-report-request", data },
      });

      if (error) throw error;

      toast({
        title: t("report.success_title", "Request Submitted!"),
        description: t("report.success_desc", "We'll review your request and get back to you if we have a report on your game."),
      });
      onOpenChange?.(false);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: t("report.error_title", "Error"),
        description: t("report.error_desc", "Failed to submit request. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-center pt-4 mb-4">
          <img src={logo} alt="RISE Football Agency" className="h-16" />
        </div>
        <DialogHeader>
          <DialogTitle className="text-3xl font-bebas uppercase tracking-wider text-center">
            {t("report.title", "Request Your Report")}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t("report.description", "If we've scouted you, we may have detailed observations on your game. Fill out the form below to request access.")}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="playerName">{t("report.player_name", "Full Name")} *</Label>
            <Input 
              id="playerName" 
              name="playerName" 
              placeholder={t("report.player_name_placeholder", "Your full name")} 
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">{t("report.email", "Email")} *</Label>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              placeholder={t("report.email_placeholder", "your@email.com")} 
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="whatsapp">{t("report.whatsapp", "WhatsApp Number")} *</Label>
            <Input 
              id="whatsapp" 
              name="whatsapp" 
              type="tel" 
              placeholder="+44 7XXX XXXXXX" 
              required 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">{t("report.position", "Position")} *</Label>
              <Input 
                id="position" 
                name="position" 
                placeholder={t("report.position_placeholder", "e.g., Centre-Back")} 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="age">{t("report.age", "Age")} *</Label>
              <Input 
                id="age" 
                name="age" 
                type="number" 
                placeholder="22" 
                required 
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="currentClub">{t("report.current_club", "Current Club/Academy")}</Label>
            <Input 
              id="currentClub" 
              name="currentClub" 
              placeholder={t("report.current_club_placeholder", "Your current team")} 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="nationality">{t("report.nationality", "Nationality")}</Label>
            <Input 
              id="nationality" 
              name="nationality" 
              placeholder={t("report.nationality_placeholder", "e.g., English, Spanish")} 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">{t("report.additional_info", "Additional Information")}</Label>
            <Textarea
              id="message"
              name="message"
              placeholder={t("report.additional_info_placeholder", "Any additional context about yourself, recent matches, or why you believe we may have scouted you...")}
              className="min-h-[80px]"
            />
          </div>
          
          <Button 
            type="submit" 
            size="lg" 
            hoverEffect 
            className="w-full btn-shine font-bebas uppercase tracking-wider"
            disabled={isSubmitting}
          >
            {isSubmitting ? t("report.submitting", "Submitting...") : t("report.submit", "Request My Report")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
