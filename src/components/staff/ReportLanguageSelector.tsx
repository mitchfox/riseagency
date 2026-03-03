import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Languages, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "pl", label: "Polski", flag: "🇵🇱" },
  { code: "cs", label: "Čeština", flag: "🇨🇿" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
];

interface ReportLanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  /** Return an object of { fieldKey: fieldValue } for all translatable text fields */
  getTranslatableFields: () => Record<string, string>;
  /** Called with the translated fields to apply them */
  onTranslated: (translations: Record<string, string>) => void;
}

export const ReportLanguageSelector = ({
  selectedLanguage,
  onLanguageChange,
  getTranslatableFields,
  onTranslated,
}: ReportLanguageSelectorProps) => {
  const [translating, setTranslating] = useState(false);

  const handleTranslateAll = async () => {
    if (selectedLanguage === "en") {
      toast.info("Content is already in English");
      return;
    }

    const fields = getTranslatableFields();
    const nonEmptyFields = Object.fromEntries(
      Object.entries(fields).filter(([_, v]) => v && v.trim())
    );

    if (Object.keys(nonEmptyFields).length === 0) {
      toast.info("No content to translate");
      return;
    }

    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke("translate-report-content", {
        body: { fields: nonEmptyFields, targetLanguage: selectedLanguage },
      });

      if (error) throw error;

      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("Rate limit reached. Please wait and try again.");
        } else if (data.error.includes("credits")) {
          toast.error("AI credits exhausted. Please add credits.");
        } else {
          throw new Error(data.error);
        }
        return;
      }

      if (data?.translations) {
        onTranslated(data.translations);
        const lang = LANGUAGES.find(l => l.code === selectedLanguage);
        toast.success(`Content translated to ${lang?.label || selectedLanguage}`);
      }
    } catch (err: any) {
      console.error("Translation error:", err);
      toast.error("Translation failed: " + (err.message || "Unknown error"));
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedLanguage} onValueChange={onLanguageChange}>
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              <span className="flex items-center gap-2">
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedLanguage !== "en" && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleTranslateAll}
          disabled={translating}
          className="gap-1.5 whitespace-nowrap"
        >
          {translating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Languages className="h-4 w-4" />
          )}
          {translating ? "Translating..." : "Translate All"}
        </Button>
      )}
    </div>
  );
};
