import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

interface RequestScoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const requestScoutSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  phone: z.string().trim().min(1, "Phone number is required").max(50),
  team: z.string().trim().min(1, "Team name is required").max(100),
  matchDate: z.string().trim().min(1, "Match date is required"),
  location: z.string().trim().min(1, "Location is required").max(200),
  message: z.string().trim().max(1000),
});

export const RequestScoutDialog = ({ open, onOpenChange }: RequestScoutDialogProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    team: "",
    matchDate: "",
    location: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      requestScoutSchema.parse(formData);
      
      const { error } = await supabase.functions.invoke("send-form-email", {
        body: { formType: "request-scout", data: formData },
      });

      if (error) throw error;
      
      toast({
        title: "Request Submitted",
        description: "We'll be in touch to confirm scout attendance!",
      });
      
      onOpenChange(false);
      setFormData({ name: "", email: "", phone: "", team: "", matchDate: "", location: "", message: "" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error("Error submitting form:", error);
        toast({
          title: "Error",
          description: "Failed to submit request. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `Hi, I'm ${formData.name || "[Your Name]"} and I'd like to request a scout at my game. Team: ${formData.team || "[Your Team]"}, Match Date: ${formData.matchDate || "[Date]"}, Location: ${formData.location || "[Location]"}. ${formData.message || ""}`
    );
    window.open(`https://wa.me/447340184399?text=${message}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bebas uppercase tracking-wider">
            Request Scout Attendance
          </DialogTitle>
          <DialogDescription>
            Fill out the form below or contact us directly on WhatsApp
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+44 7340 184399"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="team">Team Name *</Label>
            <Input
              id="team"
              value={formData.team}
              onChange={(e) => setFormData({ ...formData, team: e.target.value })}
              placeholder="Your team name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="matchDate">Match Date *</Label>
            <Input
              id="matchDate"
              type="date"
              value={formData.matchDate}
              onChange={(e) => setFormData({ ...formData, matchDate: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Match Location *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Stadium or venue name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Additional Information</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Any additional details about the match..."
              className="min-h-[100px]"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button 
              type="submit" 
              className="flex-1 btn-shine font-bebas uppercase tracking-wider"
            >
              Submit Request
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleWhatsApp}
              className="flex-1 font-bebas uppercase tracking-wider gap-2"
            >
              <MessageCircle className="h-5 w-5" />
              WhatsApp Us
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
