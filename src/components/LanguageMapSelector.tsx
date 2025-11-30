import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

type LanguageCode = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'pl' | 'cs' | 'ru' | 'tr';

interface LanguageRegion {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  // Position on map (percentage)
  x: number;
  y: number;
}

const languageRegions: LanguageRegion[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧", x: 47, y: 28 },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸", x: 44, y: 38 },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹", x: 40, y: 40 },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷", x: 48, y: 34 },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪", x: 52, y: 32 },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹", x: 53, y: 38 },
  { code: "pl", name: "Polish", nativeName: "Polski", flag: "🇵🇱", x: 56, y: 30 },
  { code: "cs", name: "Czech", nativeName: "Čeština", flag: "🇨🇿", x: 54, y: 33 },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺", x: 70, y: 25 },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷", x: 62, y: 40 },
];

export const LanguageMapSelector = () => {
  const { language, switchLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const [hoveredLang, setHoveredLang] = useState<LanguageCode | null>(null);
  
  const selectedLanguage = languageRegions.find(l => l.code === language) || languageRegions[0];

  const handleSelectLanguage = (code: LanguageCode) => {
    switchLanguage(code);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="flex items-center gap-1.5 text-xs md:text-sm font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-all duration-300 focus:outline-none">
        <span className="text-base">{selectedLanguage.flag}</span>
        <span>{selectedLanguage.code.toUpperCase()}</span>
        <Globe className="w-3 h-3 ml-0.5" />
      </DialogTrigger>
      
      <DialogContent className="bg-black/95 border border-primary/30 max-w-3xl p-0 overflow-hidden">
        <div className="relative w-full aspect-[16/10]">
          {/* Europe-focused map background */}
          <svg 
            viewBox="0 0 100 70" 
            className="w-full h-full"
            style={{ background: 'radial-gradient(ellipse at center, #1a1a1a 0%, #0a0a0a 100%)' }}
          >
            {/* Grid lines for map effect */}
            <defs>
              <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
                <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(200,170,90,0.1)" strokeWidth="0.1"/>
              </pattern>
            </defs>
            <rect width="100" height="70" fill="url(#grid)" />
            
            {/* Simplified Europe continent outline */}
            <path 
              d="M35 45 L38 42 L40 38 L42 35 L45 32 L48 28 L50 25 L52 23 L55 22 L58 21 L62 20 L68 18 L75 16 L82 15 L88 18 L85 22 L80 25 L75 28 L70 32 L65 35 L60 38 L55 40 L50 42 L45 44 L40 45 L35 45"
              fill="rgba(200,170,90,0.1)"
              stroke="rgba(200,170,90,0.3)"
              strokeWidth="0.3"
            />
            
            {/* Connection lines between points */}
            {languageRegions.map((region, i) => (
              languageRegions.slice(i + 1).map((other, j) => {
                const distance = Math.sqrt(
                  Math.pow(region.x - other.x, 2) + Math.pow(region.y - other.y, 2)
                );
                if (distance < 15) {
                  return (
                    <line
                      key={`${region.code}-${other.code}`}
                      x1={region.x}
                      y1={region.y}
                      x2={other.x}
                      y2={other.y}
                      stroke="rgba(200,170,90,0.15)"
                      strokeWidth="0.2"
                    />
                  );
                }
                return null;
              })
            ))}
          </svg>
          
          {/* Language markers */}
          {languageRegions.map((region) => {
            const isSelected = language === region.code;
            const isHovered = hoveredLang === region.code;
            
            return (
              <button
                key={region.code}
                onClick={() => handleSelectLanguage(region.code)}
                onMouseEnter={() => setHoveredLang(region.code)}
                onMouseLeave={() => setHoveredLang(null)}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                style={{ 
                  left: `${region.x}%`, 
                  top: `${region.y}%`,
                  zIndex: isHovered || isSelected ? 20 : 10
                }}
              >
                {/* Pulse animation for selected */}
                {isSelected && (
                  <span className="absolute inset-0 -m-2 rounded-full bg-primary/30 animate-ping" />
                )}
                
                {/* Marker dot */}
                <span 
                  className={`
                    relative flex items-center justify-center
                    w-8 h-8 md:w-10 md:h-10 rounded-full
                    transition-all duration-300 cursor-pointer
                    ${isSelected 
                      ? 'bg-primary text-black scale-110' 
                      : isHovered 
                        ? 'bg-primary/80 text-black scale-105' 
                        : 'bg-black/60 border border-primary/50 text-white hover:bg-primary/20'
                    }
                  `}
                >
                  <span className="text-lg md:text-xl">{region.flag}</span>
                </span>
                
                {/* Label */}
                <span 
                  className={`
                    absolute left-1/2 -translate-x-1/2 top-full mt-1
                    whitespace-nowrap text-[10px] md:text-xs font-bebas uppercase tracking-wider
                    transition-all duration-300
                    ${isSelected || isHovered ? 'opacity-100 text-primary' : 'opacity-0 group-hover:opacity-100 text-white/70'}
                  `}
                >
                  {region.nativeName}
                </span>
              </button>
            );
          })}
          
          {/* Title */}
          <div className="absolute top-4 left-0 right-0 text-center">
            <h3 className="text-xl md:text-2xl font-bebas uppercase tracking-[0.3em] text-primary">
              Select Language
            </h3>
            <p className="text-xs text-white/50 font-bebas tracking-wider mt-1">
              Click a region to switch
            </p>
          </div>
          
          {/* Current selection indicator */}
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <span className="text-sm font-bebas uppercase tracking-wider text-white/60">
              Current: <span className="text-primary">{selectedLanguage.flag} {selectedLanguage.nativeName}</span>
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
