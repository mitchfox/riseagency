import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Globe, X } from "lucide-react";
import europeMap from "@/assets/europe-outline.gif";

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

// Positions are percentages - desktop positions based on map
const languageRegions: LanguageRegion[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧", x: 30, y: 60 },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸", x: 29, y: 87 },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹", x: 25, y: 90 },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷", x: 34, y: 73 },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪", x: 43, y: 63 },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹", x: 43, y: 80 },
  { code: "pl", name: "Polish", nativeName: "Polski", flag: "🇵🇱", x: 50, y: 62 },
  { code: "cs", name: "Czech", nativeName: "Čeština", flag: "🇨🇿", x: 47, y: 70 },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺", x: 67, y: 50 },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷", x: 65, y: 90 },
];

// Mobile positions adjusted for 140% map scale (centered in container)
// Formula: containerX = (mapX + 20) / 1.4 to account for the scaled map
const getMobileX = (mapX: number) => (mapX + 20) / 1.4;

interface LanguageMapSelectorProps {
  onOpenChange?: (open: boolean) => void;
}

export const LanguageMapSelector = ({ onOpenChange }: LanguageMapSelectorProps) => {
  const { language, switchLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
    // Check mobile state when opening
    if (newOpen) {
      setIsMobile(window.innerWidth < 768);
    }
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
        <span className="text-base">{selectedLanguage.flag}</span>
        <span>{selectedLanguage.code.toUpperCase()}</span>
        <Globe className="w-3 h-3 ml-0.5" />
      </button>

      {/* Modal Overlay */}
      {open && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          onClick={() => handleOpenChange(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80" />
          
          {/* Content */}
          <div 
            className="relative bg-black/95 border border-primary/30 w-full max-w-4xl mx-2 md:mx-4 overflow-visible rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="absolute right-2 top-2 md:right-4 md:top-4 z-20 text-white/70 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative w-full aspect-[4/5] md:aspect-[16/10] overflow-visible">
              {/* Europe Map Image - larger on mobile, can overflow */}
              <div className="absolute inset-0 flex items-center justify-center overflow-visible">
                <img 
                  src={europeMap} 
                  alt="Europe Map"
                  className="w-[140%] md:w-full h-auto object-contain opacity-60"
                  style={{ maxWidth: 'none' }}
                />
              </div>
              
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />
              
              {/* Language markers */}
              {languageRegions.map((region) => {
                const isSelected = language === region.code;
                const isHovered = hoveredLang === region.code;
                // Use adjusted X position on mobile for 140% scaled map
                const displayX = isMobile ? getMobileX(region.x) : region.x;
                
                return (
                  <button
                    key={region.code}
                    type="button"
                    onClick={() => handleSelectLanguage(region.code)}
                    onMouseEnter={() => setHoveredLang(region.code)}
                    onMouseLeave={() => setHoveredLang(null)}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                    style={{ 
                      left: `${displayX}%`, 
                      top: `${region.y}%`,
                      zIndex: isHovered || isSelected ? 20 : 10
                    }}
                  >
                    {/* Pulse animation for selected */}
                    {isSelected && (
                      <span className="absolute inset-0 -m-1 md:-m-2 rounded-full bg-primary/30 animate-ping" />
                    )}
                    
                    {/* Marker dot */}
                    <span 
                      className={`
                        relative flex items-center justify-center
                        w-8 h-8 md:w-12 md:h-12 rounded-full
                        transition-all duration-300 cursor-pointer
                        ${isSelected 
                          ? 'bg-primary text-black scale-110 shadow-lg shadow-primary/50' 
                          : isHovered 
                            ? 'bg-primary/80 text-black scale-105' 
                            : 'bg-black/80 border-2 border-primary/50 text-white hover:bg-primary/20'
                        }
                      `}
                    >
                      <span className="text-base md:text-2xl">{region.flag}</span>
                    </span>
                    
                    {/* Label - hidden on mobile to prevent overlap */}
                    <span 
                      className={`
                        absolute left-1/2 -translate-x-1/2 top-full mt-0.5 md:mt-1
                        whitespace-nowrap text-[10px] md:text-sm font-bebas uppercase tracking-wider
                        px-1 md:px-2 py-0.5 rounded bg-black/90
                        transition-all duration-300 hidden md:block
                        ${isSelected || isHovered ? 'md:opacity-100 text-primary' : 'opacity-0 group-hover:opacity-100 text-white/70'}
                      `}
                    >
                      {region.nativeName}
                    </span>
                  </button>
                );
              })}
              
              {/* Title */}
              <div className="absolute top-2 md:top-4 left-0 right-0 text-center z-10">
                <h3 className="text-lg md:text-2xl font-bebas uppercase tracking-[0.2em] md:tracking-[0.3em] text-primary">
                  Select Language
                </h3>
                <p className="text-[10px] md:text-xs text-white/50 font-bebas tracking-wider mt-0.5 md:mt-1">
                  Tap a flag to switch
                </p>
              </div>
              
              {/* Current selection indicator */}
              <div className="absolute bottom-2 md:bottom-4 left-0 right-0 text-center z-10">
                <span className="text-xs md:text-sm font-bebas uppercase tracking-wider text-white/60 bg-black/80 px-3 py-1 rounded">
                  Current: <span className="text-primary">{selectedLanguage.flag} {selectedLanguage.nativeName}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
