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

// Positions are percentages - will adjust based on feedback
const languageRegions: LanguageRegion[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧", x: 42, y: 28 },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸", x: 38, y: 52 },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹", x: 32, y: 55 },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷", x: 45, y: 42 },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪", x: 52, y: 35 },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹", x: 53, y: 50 },
  { code: "pl", name: "Polish", nativeName: "Polski", flag: "🇵🇱", x: 58, y: 32 },
  { code: "cs", name: "Czech", nativeName: "Čeština", flag: "🇨🇿", x: 55, y: 38 },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺", x: 78, y: 25 },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷", x: 72, y: 55 },
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
      
      <DialogContent className="bg-black/95 border border-primary/30 max-w-4xl p-0 overflow-hidden">
        <div className="relative w-full aspect-[16/9]">
          {/* Europe SVG Map */}
          <svg 
            viewBox="0 0 800 600" 
            className="w-full h-full"
            style={{ background: 'radial-gradient(ellipse at center, #1a1a1a 0%, #0a0a0a 100%)' }}
          >
            {/* Europe map paths - simplified outline */}
            <g fill="rgba(200,170,90,0.15)" stroke="rgba(200,170,90,0.4)" strokeWidth="1">
              {/* Iceland */}
              <path d="M280,80 L310,75 L330,85 L320,100 L290,105 L275,95 Z" />
              
              {/* UK & Ireland */}
              <path d="M310,180 L340,160 L360,170 L355,200 L340,220 L320,230 L305,210 L310,190 Z" />
              <path d="M290,200 L310,190 L305,220 L285,230 L275,215 Z" />
              
              {/* Norway, Sweden, Finland */}
              <path d="M420,50 L450,40 L480,50 L510,80 L520,120 L510,160 L490,180 L470,170 L460,140 L440,110 L420,80 Z" />
              <path d="M520,60 L560,50 L600,70 L620,100 L610,150 L580,180 L550,160 L530,120 Z" />
              
              {/* Spain & Portugal */}
              <path d="M280,350 L350,340 L380,360 L390,400 L370,440 L320,450 L280,430 L260,390 L270,360 Z" />
              <path d="M250,370 L275,360 L270,410 L250,420 L240,400 Z" />
              
              {/* France */}
              <path d="M350,250 L400,240 L430,270 L420,320 L380,350 L340,340 L320,300 L330,260 Z" />
              
              {/* Germany */}
              <path d="M430,220 L480,210 L510,240 L500,290 L460,300 L430,280 L420,250 Z" />
              
              {/* Poland */}
              <path d="M490,200 L550,190 L580,220 L570,260 L530,270 L500,250 L490,220 Z" />
              
              {/* Italy */}
              <path d="M440,320 L470,310 L490,340 L480,400 L450,430 L430,410 L440,360 Z" />
              <path d="M450,440 L480,430 L500,450 L480,470 L455,460 Z" />
              
              {/* Czech Republic */}
              <path d="M460,260 L500,250 L510,280 L490,300 L460,295 L455,275 Z" />
              
              {/* Balkans */}
              <path d="M500,320 L550,310 L580,350 L560,400 L520,410 L490,380 L495,340 Z" />
              
              {/* Greece */}
              <path d="M530,420 L560,410 L580,440 L570,480 L540,490 L520,460 L525,430 Z" />
              
              {/* Turkey (European part + Anatolia) */}
              <path d="M580,380 L650,370 L720,390 L750,420 L730,460 L680,470 L620,450 L590,420 Z" />
              
              {/* Russia (western portion) */}
              <path d="M580,100 L700,80 L780,120 L790,200 L750,280 L680,300 L620,260 L590,200 L580,150 Z" />
              
              {/* Baltic states */}
              <path d="M530,160 L570,150 L590,180 L580,210 L550,220 L530,200 Z" />
              
              {/* Ukraine, Belarus */}
              <path d="M580,220 L680,210 L720,260 L700,320 L640,340 L590,310 L570,270 Z" />
            </g>
            
            {/* Grid overlay */}
            <defs>
              <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(200,170,90,0.08)" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="800" height="600" fill="url(#mapGrid)" />
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
                  <span className="text-xl md:text-2xl">{region.flag}</span>
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
              Current: <span className="text-primary">{selectedLanguage.flag} {selectedLanguage.nativeName}</span>
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
