import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";

const languages = [
  { code: "en" as const, name: "ENG", flag: "🇬🇧" },
  { code: "es" as const, name: "ESP", flag: "🇪🇸" },
  { code: "pt" as const, name: "POR", flag: "🇵🇹" },
  { code: "fr" as const, name: "FRA", flag: "🇫🇷" },
  { code: "de" as const, name: "DEU", flag: "🇩🇪" },
  { code: "it" as const, name: "ITA", flag: "🇮🇹" },
  { code: "pl" as const, name: "POL", flag: "🇵🇱" },
  { code: "cs" as const, name: "ČES", flag: "🇨🇿" },
  { code: "ru" as const, name: "РУС", flag: "🇷🇺" },
];

export const LanguageSelector = () => {
  const { language, switchLanguage } = useLanguage();
  const selectedLanguage = languages.find(l => l.code === language) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 text-xs md:text-sm font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-all duration-300 focus:outline-none">
        <span className="text-base">{selectedLanguage.flag}</span>
        <span>{selectedLanguage.name}</span>
        <ChevronDown className="w-3 h-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="bg-background border border-border min-w-[100px] z-[200]"
        align="center"
      >
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => switchLanguage(lang.code)}
            className={`flex items-center gap-2 cursor-pointer text-sm font-bebas uppercase tracking-wider ${
              language === lang.code ? "text-primary" : "text-foreground"
            }`}
          >
            <span className="text-base">{lang.flag}</span>
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
