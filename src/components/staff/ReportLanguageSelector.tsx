import { useState, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Languages, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const LANGUAGES = [
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
  /** Current translated content stored in DB */
  translatedContent?: TranslatedContent | null;
  /** Called when translated content changes */
  onTranslatedContentChange?: (content: TranslatedContent | null) => void;
  /** Current editing tab: 'en' or language code */
  activeTab?: string;
  /** Called when tab changes */
  onActiveTabChange?: (tab: string) => void;
}

export interface TranslatedContent {
  language: string;
  fields: Record<string, string>;
  /** Snapshot of English fields at time of translation, for diff detection */
  englishSnapshot?: Record<string, string>;
}

export const ReportLanguageSelector = ({
  selectedLanguage,
  onLanguageChange,
  getTranslatableFields,
  onTranslated,
  translatedContent,
  onTranslatedContentChange,
  activeTab = "en",
  onActiveTabChange,
}: ReportLanguageSelectorProps) => {
  const [translating, setTranslating] = useState(false);
  const [updatingTranslation, setUpdatingTranslation] = useState(false);

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
        // Store translated content with English snapshot for future diff
        const translatedData: TranslatedContent = {
          language: selectedLanguage,
          fields: data.translations,
          englishSnapshot: { ...nonEmptyFields },
        };
        onTranslatedContentChange?.(translatedData);
        onActiveTabChange?.(selectedLanguage);

        const lang = LANGUAGES.find(l => l.code === selectedLanguage);
        toast.success(`Content translated to ${lang?.label || selectedLanguage}. Switch tabs to review.`);
      }
    } catch (err: any) {
      console.error("Translation error:", err);
      toast.error("Translation failed: " + (err.message || "Unknown error"));
    } finally {
      setTranslating(false);
    }
  };

  const handleUpdateTranslation = async () => {
    if (!translatedContent?.englishSnapshot) {
      // No snapshot, re-translate everything
      await handleTranslateAll();
      return;
    }

    const currentFields = getTranslatableFields();
    const snapshot = translatedContent.englishSnapshot;

    // Find fields that changed since last translation
    const changedFields: Record<string, string> = {};
    for (const [key, value] of Object.entries(currentFields)) {
      if (!value?.trim()) continue;
      if (snapshot[key] !== value) {
        changedFields[key] = value;
      }
    }

    if (Object.keys(changedFields).length === 0) {
      toast.info("No English content has changed since last translation");
      return;
    }

    setUpdatingTranslation(true);
    try {
      const { data, error } = await supabase.functions.invoke("translate-report-content", {
        body: { fields: changedFields, targetLanguage: translatedContent.language },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.translations) {
        const updatedContent: TranslatedContent = {
          ...translatedContent,
          fields: { ...translatedContent.fields, ...data.translations },
          englishSnapshot: { ...currentFields },
        };
        onTranslatedContentChange?.(updatedContent);
        const count = Object.keys(changedFields).length;
        toast.success(`Updated ${count} changed field${count !== 1 ? 's' : ''}`);
      }
    } catch (err: any) {
      console.error("Translation update error:", err);
      toast.error("Update failed: " + (err.message || "Unknown error"));
    } finally {
      setUpdatingTranslation(false);
    }
  };

  const hasTranslation = translatedContent && translatedContent.language === selectedLanguage;

  return (
    <div className="flex items-center gap-2 flex-wrap">
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

      {selectedLanguage !== "en" && !hasTranslation && (
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

      {hasTranslation && (
        <>
          {/* Tab switcher */}
          <div className="flex rounded-md border overflow-hidden">
            <button
              onClick={() => onActiveTabChange?.("en")}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === "en"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-accent text-muted-foreground"
              }`}
            >
              🇬🇧 English
            </button>
            <button
              onClick={() => onActiveTabChange?.(selectedLanguage)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === selectedLanguage
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-accent text-muted-foreground"
              }`}
            >
              {LANGUAGES.find(l => l.code === selectedLanguage)?.flag}{" "}
              {LANGUAGES.find(l => l.code === selectedLanguage)?.label}
            </button>
          </div>

          {/* Update translation button - only on English tab */}
          {activeTab === "en" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUpdateTranslation}
              disabled={updatingTranslation}
              className="gap-1.5 whitespace-nowrap"
            >
              {updatingTranslation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {updatingTranslation ? "Updating..." : "Update Translation"}
            </Button>
          )}

          {/* Re-translate button on translated tab */}
          {activeTab === selectedLanguage && (
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
              {translating ? "Translating..." : "Re-translate All"}
            </Button>
          )}
        </>
      )}
    </div>
  );
};
