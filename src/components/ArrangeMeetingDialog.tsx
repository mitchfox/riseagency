import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ArrangeMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ArrangeMeetingDialog = ({ open, onOpenChange }: ArrangeMeetingDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
    preferredDate: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("form_submissions").insert({
        form_type: "arrange_meeting",
        data: formData,
      });

      if (error) throw error;

      toast.success("Meeting request submitted! We'll be in touch soon.");
      setFormData({ name: "", email: "", organization: "", preferredDate: "", message: "" });
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-primary/20">
        <DialogHeader>
          <DialogTitle className="font-bebas text-2xl tracking-wider flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            ARRANGE A MEETING
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="font-bebas tracking-wider">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="bg-background/50 border-white/20 focus:border-primary"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email" className="font-bebas tracking-wider">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="bg-background/50 border-white/20 focus:border-primary"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="organization" className="font-bebas tracking-wider">Organization / Club</Label>
            <Input
              id="organization"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              className="bg-background/50 border-white/20 focus:border-primary"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="preferredDate" className="font-bebas tracking-wider">Preferred Date</Label>
            <Input
              id="preferredDate"
              type="date"
              value={formData.preferredDate}
              onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
              className="bg-background/50 border-white/20 focus:border-primary"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message" className="font-bebas tracking-wider">Message</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Tell us what you'd like to discuss..."
              className="bg-background/50 border-white/20 focus:border-primary min-h-[100px]"
            />
          </div>
          
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bebas tracking-wider"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? "SUBMITTING..." : "REQUEST MEETING"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
