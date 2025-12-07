import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Globe, X } from "lucide-react";
import europeMap from "@/assets/europe-outline.gif";

type LanguageCode = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'pl' | 'cs' | 'ru' | 'tr';

interface LanguageRegion {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flagCode: string;
  // Position on map (percentage)
  x: number;
  y: number;
}

const getFlagUrl = (flagCode: string) => `https://flagcdn.com/w40/${flagCode}.png`;

// Positions are percentages - will adjust based on feedback
const languageRegions: LanguageRegion[] = [
  { code: "en", name: "English", nativeName: "English", flagCode: "gb", x: 30, y: 60 },
  { code: "es", name: "Spanish", nativeName: "Español", flagCode: "es", x: 29, y: 87 },
  { code: "pt", name: "Portuguese", nativeName: "Português", flagCode: "pt", x: 25, y: 90 },
  { code: "fr", name: "French", nativeName: "Français", flagCode: "fr", x: 34, y: 73 },
  { code: "de", name: "German", nativeName: "Deutsch", flagCode: "de", x: 43, y: 63 },
  { code: "it", name: "Italian", nativeName: "Italiano", flagCode: "it", x: 43, y: 80 },
  { code: "pl", name: "Polish", nativeName: "Polski", flagCode: "pl", x: 50, y: 62 },
  { code: "cs", name: "Czech", nativeName: "Čeština", flagCode: "cz", x: 47, y: 70 },
  { code: "ru", name: "Russian", nativeName: "Русский", flagCode: "ru", x: 67, y: 50 },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flagCode: "tr", x: 65, y: 90 },
];

interface LanguageMapSelectorProps {
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export const LanguageMapSelector = ({ onOpenChange, className }: LanguageMapSelectorProps) => {
  const { language, switchLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };
  const [hoveredLang, setHoveredLang] = useState<LanguageCode | null>(null);
  
  const selectedLanguage = languageRegions.find(l => l.code === language) || languageRegions[0];

  const handleSelectLanguage = (code: LanguageCode) => {
    switchLanguage(code);
    handleOpenChange(false);
  };

  return (
    <>
      {/* Trigger Button */}
      <button 
        type="button"
        onClick={() => handleOpenChange(true)}
        className="flex items-center gap-1.5 text-xs md:text-sm font-bebas uppercase tracking-wider text-foreground hover:text-primary transition-all duration-300 focus:outline-none cursor-pointer"
      >
        <img src={getFlagUrl(selectedLanguage.flagCode)} alt={selectedLanguage.name} className="w-5 h-auto rounded-sm" />
        <span>{selectedLanguage.code.toUpperCase()}</span>
        <Globe className="w-3 h-3 ml-0.5" />
      </button>

      {/* Modal Overlay */}
      {open && (
        <div 
          className="fixed inset-0 z-[9999] flex items-end justify-center pb-20 md:pb-24"
          onClick={() => handleOpenChange(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80" />
          
          {/* Content */}
          <div 
            className="relative bg-black/95 border border-primary/30 max-w-4xl w-full mx-4 overflow-hidden rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="absolute right-4 top-4 z-10 text-white/70 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative w-full aspect-[16/10]">
              {/* Europe Map Image */}
              <img 
                src={europeMap} 
                alt="Europe Map"
                className="absolute inset-0 w-full h-full object-contain opacity-60"
              />
              
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
              
              {/* Language markers */}
              {languageRegions.map((region) => {
                const isSelected = language === region.code;
                const isHovered = hoveredLang === region.code;
                
                return (
                  <button
                    key={region.code}
                    type="button"
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
                        w-10 h-10 md:w-12 md:h-12 rounded-full
                        transition-all duration-300 cursor-pointer
                        ${isSelected 
                          ? 'bg-primary text-black scale-110 shadow-lg shadow-primary/50' 
                          : isHovered 
                            ? 'bg-primary/80 text-black scale-105' 
                            : 'bg-black/80 border-2 border-primary/50 text-white hover:bg-primary/20'
                        }
                      `}
                    >
                      <img src={getFlagUrl(region.flagCode)} alt={region.name} className="w-6 h-auto md:w-7 rounded-sm" />
                    </span>
                    
                    {/* Label */}
                    <span 
                      className={`
                        absolute left-1/2 -translate-x-1/2 top-full mt-1
                        whitespace-nowrap text-xs md:text-sm font-bebas uppercase tracking-wider
                        px-2 py-0.5 rounded bg-black/80
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
                  Click a country to switch
                </p>
              </div>
              
              {/* Current selection indicator */}
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <span className="text-sm font-bebas uppercase tracking-wider text-white/60">
                  Current: <span className="text-primary inline-flex items-center gap-1"><img src={getFlagUrl(selectedLanguage.flagCode)} alt="" className="w-4 h-auto rounded-sm" /> {selectedLanguage.nativeName}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
