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

interface RepresentationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const representationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  phone: z.string().trim().min(1, "Phone number is required").max(50),
  email: z.string().trim().email("Invalid email address").max(255).optional().or(z.literal("")),
  currentClub: z.string().trim().min(1, "Current club is required").max(100),
  position: z.string().trim().max(100).optional().or(z.literal("")),
  message: z.string().trim().max(1000),
});

export const RepresentationDialog = ({ open, onOpenChange }: RepresentationDialogProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    currentClub: "",
    position: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      representationSchema.parse(formData);
      
      const { error } = await supabase.functions.invoke("send-form-email", {
        body: { formType: "representation", data: formData },
      });

      if (error) throw error;
      
      toast({
        title: "Request Submitted",
        description: "We'll be in touch soon!",
      });
      
      onOpenChange(false);
      setFormData({ name: "", phone: "", email: "", currentClub: "", position: "", message: "" });
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
      `Hi, I'm ${formData.name || "[Your Name]"} and I'd like to request representation. Current Club: ${formData.currentClub || "[Your Club]"}, Position: ${formData.position || "[Your Position]"}. ${formData.message || ""}`
    );
    window.open(`https://wa.me/447340184399?text=${message}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[700px] z-[150]">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bebas uppercase tracking-wider">
            Request Representation
          </DialogTitle>
          <DialogDescription>
            Fill out the form below or contact us directly on WhatsApp
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
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
              <Label htmlFor="phone">Phone Number *</Label>
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
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="currentClub">Current Club *</Label>
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
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                placeholder="e.g., Striker, Midfielder"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Additional Information</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Tell us about your experience and goals..."
              className="min-h-[40px] sm:min-h-[80px]"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button 
              type="submit" 
              hoverEffect
              className="flex-1 btn-shine font-bebas uppercase tracking-wider"
            >
              Submit Request
            </Button>
            <Button
              type="button"
              variant="outline"
              hoverEffect
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
