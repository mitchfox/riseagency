import { useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Globe, X } from "lucide-react";
import europeMap from "@/assets/europe-outline.gif";

type LanguageCode = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'pl' | 'cs' | 'ru' | 'tr' | 'hr' | 'no';

interface LanguageRegion {
  code: LanguageCode;
  name: string;
  nativeName: string;
  enterText: string; // "Enter" translated to this language
  flagCode: string;
  // Position on map (percentage)
  x: number;
  y: number;
}

const getFlagUrl = (flagCode: string) => `https://flagcdn.com/w40/${flagCode}.png`;

// Positions are percentages - will adjust based on feedback
const languageRegions: LanguageRegion[] = [
  { code: "en", name: "English", nativeName: "English", enterText: "Enter", flagCode: "gb", x: 30, y: 60 },
  { code: "es", name: "Spanish", nativeName: "Español", enterText: "Entrar", flagCode: "es", x: 29, y: 85 },
  { code: "pt", name: "Portuguese", nativeName: "Português", enterText: "Entrar", flagCode: "pt", x: 25, y: 90 },
  { code: "fr", name: "French", nativeName: "Français", enterText: "Entrer", flagCode: "fr", x: 34, y: 73 },
  { code: "de", name: "German", nativeName: "Deutsch", enterText: "Eintreten", flagCode: "de", x: 42, y: 62 },
  { code: "it", name: "Italian", nativeName: "Italiano", enterText: "Entrare", flagCode: "it", x: 44, y: 84 },
  { code: "pl", name: "Polish", nativeName: "Polski", enterText: "Wejdź", flagCode: "pl", x: 51, y: 62 },
  { code: "cs", name: "Czech", nativeName: "Čeština", enterText: "Vstoupit", flagCode: "cz", x: 46, y: 67 },
  { code: "ru", name: "Russian", nativeName: "Русский", enterText: "Войти", flagCode: "ru", x: 67, y: 50 },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", enterText: "Giriş", flagCode: "tr", x: 65, y: 90 },
  { code: "hr", name: "Croatian", nativeName: "Hrvatski", enterText: "Uđi", flagCode: "hr", x: 46, y: 76 },
  { code: "no", name: "Norwegian", nativeName: "Norsk", enterText: "Gå inn", flagCode: "no", x: 42, y: 40 },
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
  const [pendingLanguage, setPendingLanguage] = useState<LanguageCode | null>(null);
  
  const selectedLanguage = languageRegions.find(l => l.code === language) || languageRegions[0];
  const pendingLangData = pendingLanguage ? languageRegions.find(l => l.code === pendingLanguage) : null;

  // Find flags that overlap with a given flag (within ~12% distance)
  const getOverlappingFlags = (code: LanguageCode) => {
    const current = languageRegions.find(r => r.code === code);
    if (!current) return [];
    
    return languageRegions.filter(r => {
      if (r.code === code) return false;
      const distance = Math.sqrt(
        Math.pow(r.x - current.x, 2) + Math.pow(r.y - current.y, 2)
      );
      return distance < 12; // Within 12% distance = overlapping
    });
  };

  const handleFlagClick = (code: LanguageCode) => {
    // If clicking the same flag that's already pending, cycle to next overlapping flag
    if (pendingLanguage === code) {
      const overlapping = getOverlappingFlags(code);
      if (overlapping.length > 0) {
        // Cycle to next overlapping flag
        setPendingLanguage(overlapping[0].code);
        return;
      }
    }
    setPendingLanguage(code);
  };

  const handleConfirm = () => {
    if (pendingLanguage) {
      switchLanguage(pendingLanguage);
      handleOpenChange(false);
    }
  };

  return (
    <>
      {/* Trigger Button - Flag only, no globe icon */}
      <button 
        type="button"
        onClick={() => handleOpenChange(true)}
        className="flex flex-row items-center gap-2 text-xs md:text-sm font-bebas uppercase tracking-wider text-foreground hover:text-primary transition-all duration-300 focus:outline-none cursor-pointer"
      >
        <img src={getFlagUrl(selectedLanguage.flagCode)} alt={selectedLanguage.name} className="w-[24px] h-auto rounded-sm" />
      </button>

      {/* Modal Overlay - rendered via portal to escape overflow:hidden */}
      {open && createPortal(
        <div 
          className="fixed inset-0 z-[99] flex items-center justify-center pt-8 pb-8"
          onClick={() => handleOpenChange(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80" />
          
          {/* Content */}
          <div 
            className="relative bg-black/95 border border-primary/30 max-w-4xl w-full mx-4 overflow-hidden rounded-lg z-[9999] flex flex-col"
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

            {/* Map Section - smaller on mobile */}
            <div className="relative w-full aspect-[16/10] md:aspect-[16/10] flex-shrink-0">
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
                const isPending = pendingLanguage === region.code;
                const isHovered = hoveredLang === region.code;
                
                return (
                  <button
                    key={region.code}
                    type="button"
                    onClick={() => handleFlagClick(region.code)}
                    onMouseEnter={() => setHoveredLang(region.code)}
                    onMouseLeave={() => setHoveredLang(null)}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                    style={{ 
                      left: `${region.x}%`, 
                      top: `${region.y}%`,
                      zIndex: isHovered || isPending ? 20 : 10
                    }}
                  >
                    {/* Pulse animation for pending selection */}
                    {isPending && (
                      <span className="absolute inset-0 -m-2 rounded-full bg-primary/30 animate-ping" />
                    )}
                    
                    {/* Marker dot */}
                    <span 
                      className={`
                        relative flex items-center justify-center
                        w-8 h-8 md:w-12 md:h-12 rounded-full
                        transition-all duration-300 cursor-pointer
                        ${isPending 
                          ? 'bg-primary text-black scale-110 shadow-lg shadow-primary/50' 
                          : isHovered 
                            ? 'bg-primary/80 text-black scale-105' 
                            : 'bg-black/80 border-2 border-primary/50 text-white hover:bg-primary/20'
                        }
                      `}
                    >
                      <img src={getFlagUrl(region.flagCode)} alt={region.name} className="w-5 h-auto md:w-7 rounded-sm" />
                    </span>
                  </button>
                );
              })}
              
              {/* Title */}
              <div className="absolute top-4 left-0 right-0 text-center">
                <h3 className="text-lg md:text-2xl font-bebas uppercase tracking-[0.3em] text-primary">
                  Select Language
                </h3>
                <p className="text-xs text-white/50 font-bebas tracking-wider mt-1 hidden md:block">
                  Click a country to switch
                </p>
              </div>
              
              {/* Confirmation button - only on desktop inside map */}
              <div className="absolute bottom-4 left-0 right-0 text-center hidden md:block">
                {pendingLangData ? (
                  <div className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={handleConfirm}
                      className="px-6 py-2 bg-primary text-black font-bebas uppercase tracking-wider text-lg rounded hover:bg-primary/90 transition-colors"
                    >
                      {pendingLangData.enterText}
                    </button>
                    <span className="text-xs text-white/50 font-bebas tracking-wider">
                      {pendingLangData.nativeName}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm font-bebas uppercase tracking-wider text-white/40">
                    Select a language
                  </span>
                )}
              </div>
            </div>

            {/* Mobile-only language list */}
            <div className="md:hidden flex-1 overflow-y-auto border-t border-primary/20">
              <div className="grid grid-cols-2 gap-1 p-3">
                {languageRegions.map((region) => {
                  const isPending = pendingLanguage === region.code;
                  return (
                    <button
                      key={region.code}
                      type="button"
                      onClick={() => setPendingLanguage(region.code)}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded transition-all
                        ${isPending 
                          ? 'bg-primary text-black' 
                          : 'bg-white/5 text-white/80 hover:bg-white/10'
                        }
                      `}
                    >
                      <img 
                        src={getFlagUrl(region.flagCode)} 
                        alt={region.name} 
                        className="w-5 h-auto rounded-sm" 
                      />
                      <span className="font-bebas text-sm tracking-wider">
                        {region.nativeName}
                      </span>
                    </button>
                  );
                })}
              </div>
              
              {/* Mobile confirmation button */}
              <div className="p-3 pt-0">
                {pendingLangData ? (
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="w-full px-6 py-3 bg-primary text-black font-bebas uppercase tracking-wider text-lg rounded hover:bg-primary/90 transition-colors"
                  >
                    {pendingLangData.enterText} - {pendingLangData.nativeName}
                  </button>
                ) : (
                  <div className="w-full px-6 py-3 bg-white/10 text-white/40 font-bebas uppercase tracking-wider text-lg rounded text-center">
                    Select a language
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
