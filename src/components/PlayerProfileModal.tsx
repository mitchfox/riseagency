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
      <DialogContent className="w-screen h-screen max-w-none p-0 gap-0 border-0 rounded-none">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-50 bg-[hsl(var(--gold))] text-background hover:bg-[hsl(var(--gold))]/90 hover:text-background shadow-lg rounded-sm"
        >
          <X className="h-6 w-6" />
        </Button>
        
        <iframe
          src={`/stars/${playerSlug}?modal=true`}
          className="w-full h-full border-0"
          title={`${playerData.name} Profile`}
        />
      </DialogContent>
    </Dialog>
  );
};

export default PlayerProfileModal;
