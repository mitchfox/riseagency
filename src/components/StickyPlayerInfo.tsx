import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCountryFlagUrl } from "@/lib/countryFlags";

interface StickyPlayerInfoProps {
  name: string;
  position: string;
  dateOfBirth: string;
  age: number;
  nationality: string;
  club: string;
  clubLogo?: string;
  whatsapp?: string;
  isSticky: boolean;
}

export const StickyPlayerInfo = ({
  name,
  position,
  dateOfBirth,
  age,
  nationality,
  club,
  clubLogo,
  whatsapp,
  isSticky,
}: StickyPlayerInfoProps) => {
  return (
    <div 
      className={`transition-all duration-300 ${
        isSticky 
          ? 'fixed top-0 left-0 right-0 z-[100] shadow-xl' 
          : 'relative'
      }`}
    >
      <div className="border-2 border-[hsl(var(--gold))] bg-secondary/95 backdrop-blur-md">
        <div className="container mx-auto px-4">
          <div className="relative py-3">
            <div className="flex flex-wrap items-center gap-3 md:gap-4 lg:gap-6">
              {/* Player Name */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--gold))]/20 via-[hsl(var(--gold))]/10 to-transparent blur-xl" />
                <h1 className="relative text-xl md:text-2xl font-bebas uppercase font-bold text-foreground leading-none tracking-wide whitespace-nowrap">
                  {name}
                </h1>
              </div>
              
              <p className="text-base md:text-lg text-muted-foreground uppercase tracking-wide font-bebas leading-none whitespace-nowrap">
                {position}
              </p>
              
              <p className="text-base md:text-lg text-muted-foreground uppercase tracking-wide font-bebas leading-none flex items-center gap-2 whitespace-nowrap">
                {dateOfBirth} <span className="text-muted-foreground/70">({age})</span>
              </p>
              
              <p className="text-base md:text-lg text-muted-foreground uppercase tracking-wide font-bebas leading-none flex items-center gap-2 whitespace-nowrap">
                <img 
                  src={getCountryFlagUrl(nationality)} 
                  alt={nationality}
                  className="w-5 h-3 object-cover rounded"
                />
                {nationality}
              </p>
              
              <p className="text-base md:text-lg text-muted-foreground uppercase tracking-wide font-bebas leading-none flex items-center gap-2 whitespace-nowrap">
                {clubLogo && (
                  <img 
                    src={clubLogo} 
                    alt={club}
                    className="w-5 h-5 md:w-6 md:h-6 object-contain"
                  />
                )}
                {club}
              </p>
              
              {/* Spacer to push button to the right on larger screens */}
              <div className="hidden lg:block flex-grow" />
              
              {/* Enquire Button */}
              <Button 
                asChild
                size="sm"
                className="btn-shine text-xs md:text-sm font-bebas uppercase tracking-wider"
              >
                <a 
                  href={whatsapp ? `https://wa.me/${whatsapp.replace(/\+/g, '')}` : "https://wa.me/447508342901"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="mr-2 h-3 w-3" />
                  Enquire About This Player
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
