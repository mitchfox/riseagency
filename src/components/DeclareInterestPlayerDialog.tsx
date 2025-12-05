import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, ArrowLeft, Search, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

interface DeclareInterestPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  starsOnly?: boolean;
}

interface Player {
  id: string;
  name: string;
  position: string;
  image_url: string | null;
}

const interestSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  role: z.string().trim().min(1, "Role is required").max(100),
  clubCompany: z.string().trim().min(1, "Club/Company is required").max(100),
  request: z.string().trim().max(1000),
});

export const DeclareInterestPlayerDialog = ({ open, onOpenChange, starsOnly = false }: DeclareInterestPlayerDialogProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<"select" | "form">("select");
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    clubCompany: "",
    request: "",
  });

  useEffect(() => {
    if (open) {
      fetchPlayers();
    }
  }, [open]);

  const fetchPlayers = async () => {
    setLoading(true);
    let query = supabase
      .from('players')
      .select('id, name, position, image_url')
      .order('name');
    
    if (starsOnly) {
      query = query.eq('visible_on_stars_page', true);
    }
    
    const { data, error } = await query;
    
    if (!error && data) {
      setPlayers(data);
    }
    setLoading(false);
  };

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    player.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePlayerToggle = (player: Player) => {
    setSelectedPlayers(prev => {
      const isSelected = prev.some(p => p.id === player.id);
      if (isSelected) {
        return prev.filter(p => p.id !== player.id);
      } else {
        return [...prev, player];
      }
    });
  };

  const handleNext = () => {
    if (selectedPlayers.length > 0) {
      setStep("form");
    }
  };

  const handleBack = () => {
    setStep("select");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      interestSchema.parse(formData);
      
      const playerNames = selectedPlayers.map(p => p.name).join(", ");
      
      const { error } = await supabase.functions.invoke("send-form-email", {
        body: { 
          formType: "declare-interest", 
          data: { 
            ...formData, 
            playerName: playerNames,
            playerNames: selectedPlayers.map(p => p.name),
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
        description: `We'll be in touch regarding ${selectedPlayers.length === 1 ? selectedPlayers[0].name : `${selectedPlayers.length} players`}!`,
      });
      
      onOpenChange(false);
      setStep("select");
      setSelectedPlayers([]);
      setSearchQuery("");
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
    const playerNames = selectedPlayers.map(p => p.name).join(", ");
    const message = encodeURIComponent(
      `Hi, I'm ${formData.name || "[Your Name]"} from ${formData.clubCompany || "[Your Club/Company]"}. I'm interested in: ${playerNames}. Role: ${formData.role || "[Your Role]"}. ${formData.request || ""}`
    );
    window.open(`https://wa.me/447340184399?text=${message}`, "_blank");
  };

  const handleDialogChange = (newOpen: boolean) => {
    if (!newOpen) {
      setStep("select");
      setSelectedPlayers([]);
      setSearchQuery("");
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
                Select Player(s)
              </DialogTitle>
              <DialogDescription>
                Choose the player(s) you are interested in
                {selectedPlayers.length > 0 && (
                  <span className="ml-2 text-primary font-semibold">
                    ({selectedPlayers.length} selected)
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading players...</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-4 max-h-[400px] overflow-y-auto">
                {filteredPlayers.map((player) => {
                  const isSelected = selectedPlayers.some(p => p.id === player.id);
                  return (
                    <button
                      key={player.id}
                      onClick={() => handlePlayerToggle(player)}
                      className={`group relative flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                        isSelected 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-primary hover:bg-primary/5"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-black" />
                        </div>
                      )}
                      <div className={`w-16 h-16 rounded-full overflow-hidden border-2 transition-colors bg-muted ${
                        isSelected ? "border-primary" : "border-border group-hover:border-primary"
                      }`}>
                        {player.image_url ? (
                          <img 
                            src={player.image_url} 
                            alt={player.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <p className={`font-bebas text-sm uppercase tracking-wide transition-colors ${
                          isSelected ? "text-primary" : "group-hover:text-primary"
                        }`}>
                          {player.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {player.position}
                        </p>
                      </div>
                    </button>
                  );
                })}
                {filteredPlayers.length === 0 && (
                  <div className="col-span-full py-8 text-center text-muted-foreground">
                    No players found
                  </div>
                )}
              </div>
            )}

            {/* Next Button */}
            <Button
              onClick={handleNext}
              disabled={selectedPlayers.length === 0}
              hoverEffect
              className="w-full font-bebas uppercase tracking-wider"
            >
              Next ({selectedPlayers.length} selected)
            </Button>
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
                Interested in{" "}
                <span className="text-primary font-semibold">
                  {selectedPlayers.length === 1 
                    ? selectedPlayers[0].name 
                    : `${selectedPlayers.length} players`}
                </span>
                {selectedPlayers.length > 1 && (
                  <span className="block text-xs mt-1 text-muted-foreground">
                    {selectedPlayers.map(p => p.name).join(", ")}
                  </span>
                )}
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
