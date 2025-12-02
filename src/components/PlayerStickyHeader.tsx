import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlayerStickyHeaderProps {
  playerName: string;
  whatsapp?: string;
  isVisible: boolean;
}

export const PlayerStickyHeader = ({ 
  playerName, 
  whatsapp, 
  isVisible 
}: PlayerStickyHeaderProps) => {
  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-[150] transition-all duration-500 ease-out ${
        isVisible 
          ? 'translate-y-0 opacity-100' 
          : '-translate-y-full opacity-0'
      }`}
    >
      <div className="bg-secondary/98 backdrop-blur-lg border-b-2 border-[hsl(var(--gold))] shadow-xl">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-3 gap-4">
            {/* Player Name */}
            <div className="relative flex-1 min-w-0">
              <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--gold))]/20 via-[hsl(var(--gold))]/10 to-transparent blur-xl" />
              <h1 className="relative text-xl md:text-2xl font-bebas uppercase font-bold text-foreground leading-none tracking-wide truncate">
                {playerName}
              </h1>
            </div>
            
            {/* Enquire Button */}
            <Button 
              asChild
              size="sm"
              className="btn-shine text-xs md:text-sm font-bebas uppercase tracking-wider flex-shrink-0"
            >
              <a 
                href={whatsapp ? `https://wa.me/${whatsapp.replace(/\+/g, '')}` : "https://wa.me/447508342901"}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="mr-2 h-3 w-3" />
                <span className="hidden sm:inline">Enquire About This Player</span>
                <span className="sm:hidden">Enquire</span>
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
