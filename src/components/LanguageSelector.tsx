import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const languages = [
  { code: "en", name: "ENG", flag: "🇬🇧" },
  { code: "es", name: "ESP", flag: "🇪🇸" },
  { code: "pt", name: "POR", flag: "🇵🇹" },
  { code: "cs", name: "ČES", flag: "🇨🇿" },
  { code: "ru", name: "РУС", flag: "🇷🇺" },
];

export const LanguageSelector = () => {
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]);

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
            onClick={() => setSelectedLanguage(lang)}
            className={`flex items-center gap-2 cursor-pointer text-sm font-bebas uppercase tracking-wider ${
              selectedLanguage.code === lang.code ? "text-primary" : "text-foreground"
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
