import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";

const languages = [
  { code: "en" as const, name: "ENG", flagCode: "gb" },
  { code: "es" as const, name: "ESP", flagCode: "es" },
  { code: "pt" as const, name: "POR", flagCode: "pt" },
  { code: "fr" as const, name: "FRA", flagCode: "fr" },
  { code: "de" as const, name: "DEU", flagCode: "de" },
  { code: "it" as const, name: "ITA", flagCode: "it" },
  { code: "pl" as const, name: "POL", flagCode: "pl" },
  { code: "cs" as const, name: "ČES", flagCode: "cz" },
  { code: "ru" as const, name: "РУС", flagCode: "ru" },
  { code: "tr" as const, name: "TÜR", flagCode: "tr" },
];

const getFlagUrl = (flagCode: string) => `https://flagcdn.com/w40/${flagCode}.png`;

const languageUrlSubdomains: Record<string, string> = {
  en: "en",
  es: "es", 
  pt: "pt",
  fr: "fr",
  de: "de",
  it: "it",
  pl: "pl",
  cs: "cs",
  ru: "ru",
  tr: "tr",
};

export const LanguageSelector = () => {
  const { language } = useLanguage();
  const [selectedLang, setSelectedLang] = useState<typeof languages[0] | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const currentLanguage = languages.find(l => l.code === language) || languages[0];

  const handleFlagClick = (lang: typeof languages[0]) => {
    setSelectedLang(lang);
  };

  const handleEnterLanguage = () => {
    if (!selectedLang) return;
    
    const subdomain = languageUrlSubdomains[selectedLang.code];
    const currentHost = window.location.hostname;
    const currentPath = window.location.pathname;
    
    // Check if we're on localhost or preview
    if (currentHost === 'localhost' || currentHost.includes('preview')) {
      localStorage.setItem('preferredLanguage', selectedLang.code);
      window.location.reload();
      return;
    }
    
    // Production: navigate to subdomain
    const baseDomain = currentHost.replace(/^[a-z]{2}\./, '');
    const newUrl = `https://${subdomain}.${baseDomain}${currentPath}`;
    window.location.href = newUrl;
  };

  return (
    <div className="relative">
      <DropdownMenu open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setSelectedLang(null);
      }}>
        <DropdownMenuTrigger className="flex items-center gap-1 text-[10px] md:text-xs font-bebas uppercase tracking-wider text-foreground hover:text-primary transition-all duration-300 focus:outline-none">
          <img src={getFlagUrl(currentLanguage.flagCode)} alt={currentLanguage.name} className="w-4 h-auto rounded-sm" />
          <span>{currentLanguage.name}</span>
          <ChevronDown className="w-2.5 h-2.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="bg-background border border-border min-w-[100px] z-[200]"
          align="center"
        >
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={(e) => {
                e.preventDefault();
                handleFlagClick(lang);
              }}
              className={`flex items-center gap-2 cursor-pointer text-sm font-bebas uppercase tracking-wider ${
                selectedLang?.code === lang.code ? "bg-primary/20 text-primary" : 
                language === lang.code ? "text-primary" : "text-foreground"
              }`}
            >
              <img src={getFlagUrl(lang.flagCode)} alt={lang.name} className="w-5 h-auto rounded-sm" />
              <span>{lang.name}</span>
            </DropdownMenuItem>
          ))}
          
          {selectedLang && (
            <div className="border-t border-border mt-1 pt-1">
              <button
                onClick={handleEnterLanguage}
                className="w-full px-2 py-1.5 text-xs font-bebas uppercase tracking-wider text-primary hover:bg-primary/20 transition-colors rounded"
              >
                Enter in {selectedLang.name}
              </button>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
