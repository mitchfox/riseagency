import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { players } from "@/data/players";

interface DeclareInterestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const interestSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  role: z.string().trim().min(1, "Role is required").max(100),
  clubCompany: z.string().trim().min(1, "Club/Company is required").max(100),
  request: z.string().trim().max(1000),
});

export const DeclareInterestDialog = ({ open, onOpenChange }: DeclareInterestDialogProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<"select" | "form">("select");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    clubCompany: "",
    request: "",
  });

  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayer(playerId);
    setStep("form");
  };

  const handleBack = () => {
    setStep("select");
    setSelectedPlayer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      interestSchema.parse(formData);
      
      const player = players.find(p => p.id === selectedPlayer);
      
      const { error } = await supabase.functions.invoke("send-form-email", {
        body: { 
          formType: "declare-interest", 
          data: { 
            ...formData, 
            playerName: player?.name,
            name: formData.name,
            role: formData.role,
            clubOrCompany: formData.clubCompany,
            request: formData.request
          } 
        },
      });

      if (error) throw error;
      
      toast({
        title: "Interest Declared",
        description: `We'll be in touch regarding ${player?.name}!`,
      });
      
      onOpenChange(false);
      setStep("select");
      setSelectedPlayer(null);
      setFormData({ name: "", role: "", clubCompany: "", request: "" });
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
          description: "Failed to submit. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleWhatsApp = () => {
    const player = players.find(p => p.id === selectedPlayer);
    const message = encodeURIComponent(
      `Hi, I'm ${formData.name || "[Your Name]"} from ${formData.clubCompany || "[Your Club/Company]"}. I'm interested in ${player?.name}. Role: ${formData.role || "[Your Role]"}. ${formData.request || ""}`
    );
    window.open(`https://wa.me/447340184399?text=${message}`, "_blank");
  };

  const handleDialogChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setStep("select");
      setSelectedPlayer(null);
      setFormData({ name: "", role: "", clubCompany: "", request: "" });
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        {step === "select" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-3xl font-bebas uppercase tracking-wider">
                Select Player
              </DialogTitle>
              <DialogDescription>
                Choose the player you are interested in
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4">
              {players.map((player) => (
                <button
                  key={player.id}
                  onClick={() => handlePlayerSelect(player.id)}
                  className="group flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-border group-hover:border-primary transition-colors">
                    <img 
                      src={player.image} 
                      alt={player.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-center">
                    <p className="font-bebas text-sm uppercase tracking-wide group-hover:text-primary transition-colors">
                      {player.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {player.position}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DialogTitle className="text-3xl font-bebas uppercase tracking-wider">
                  Declare Interest
                </DialogTitle>
              </div>
              <DialogDescription>
                Fill out the form or contact us on WhatsApp
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="interest-name">Your Name *</Label>
                <Input
                  id="interest-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                  placeholder="John Smith"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="interest-role">Your Role *</Label>
                  <Input
                    id="interest-role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                    placeholder="e.g., Scout, Director"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interest-club">Club/Company *</Label>
                  <Input
                    id="interest-club"
                    value={formData.clubCompany}
                    onChange={(e) => setFormData({ ...formData, clubCompany: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                    placeholder="e.g., Manchester United"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interest-request">Your Request</Label>
                <Textarea
                  id="interest-request"
                  value={formData.request}
                  onChange={(e) => setFormData({ ...formData, request: e.target.value })}
                  placeholder="Tell us more about your interest..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button 
                  type="submit" 
                  hoverEffect
                  className="flex-1 btn-shine font-bebas uppercase tracking-wider"
                >
                  Submit Interest
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
