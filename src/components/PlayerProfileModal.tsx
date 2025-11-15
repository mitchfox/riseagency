import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlayerProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerData: {
    name: string;
    position: string;
    age: number;
    nationality: string;
    image_url: string;
    bio: string;
    highlights: any[];
    club?: string;
    club_logo?: string;
  } | null;
}

const createPlayerSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
};

const PlayerProfileModal = ({ open, onOpenChange, playerData }: PlayerProfileModalProps) => {
  if (!playerData) return null;

  const playerSlug = createPlayerSlug(playerData.name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 h-screen max-h-screen w-screen max-w-full border-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="absolute top-2 right-2 z-50 bg-background/80 backdrop-blur-sm text-foreground hover:text-foreground/80"
        >
          <X className="h-6 w-6" />
        </Button>
        
        <iframe
          src={`/stars/${playerSlug}`}
          className="w-full h-full border-0"
          title={`${playerData.name} Profile`}
        />
      </DialogContent>
    </Dialog>
  );
};

export default PlayerProfileModal;
