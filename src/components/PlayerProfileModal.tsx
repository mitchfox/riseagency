import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

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
        <VisuallyHidden>
          <DialogTitle>{playerData.name} Profile</DialogTitle>
        </VisuallyHidden>
        <Button
          variant="ghost"
          onClick={() => onOpenChange(false)}
          className="absolute top-6 right-6 z-50 bg-[hsl(var(--gold))] text-background hover:bg-[hsl(var(--gold))]/90 hover:text-background shadow-lg rounded-sm px-3 py-2 flex items-center gap-2 font-bebas tracking-wider"
        >
          <X className="h-5 w-5" />
          <span>CLOSE</span>
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
