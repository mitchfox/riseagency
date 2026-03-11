import { normalizePortalLanguage } from "@/lib/portalTranslations";

export interface ReportTranslatedContent {
  language?: string | null;
  fields?: Record<string, string> | null;
}

const REPORT_LOCALE_MAP: Record<string, string> = {
  en: "en-GB",
  fr: "fr-FR",
  es: "es-ES",
  pt: "pt-PT",
  de: "de-DE",
  it: "it-IT",
  pl: "pl-PL",
  cs: "cs-CZ",
  ru: "ru-RU",
  tr: "tr-TR",
};

export const hasTranslatedReportContent = (translatedContent?: ReportTranslatedContent | null) => {
  const language = normalizePortalLanguage(translatedContent?.language);
  return Boolean(translatedContent?.fields && language && language !== "en");
};

export const getReportLanguage = (
  translatedContent?: ReportTranslatedContent | null,
  fallbackLanguage?: string | null,
) => {
  const translatedLanguage = normalizePortalLanguage(translatedContent?.language);
  if (translatedLanguage && translatedLanguage !== "en") {
    return translatedLanguage;
  }

  return normalizePortalLanguage(fallbackLanguage);
};

export const getReportLocale = (language?: string | null) => {
  const code = normalizePortalLanguage(language);
  return REPORT_LOCALE_MAP[code] || REPORT_LOCALE_MAP.en;
};

export const getTranslatedReportField = (
  translatedContent: ReportTranslatedContent | null | undefined,
  key: string,
  fallback: string,
) => {
  if (!hasTranslatedReportContent(translatedContent)) {
    return fallback;
  }

  return translatedContent?.fields?.[key] || fallback;
};

export const getTranslatedActionField = (
  translatedContent: ReportTranslatedContent | null | undefined,
  index: number,
  field: "type" | "description" | "notes",
  fallback: string,
) => {
  const key = `action_${index}_${field}`;
  return getTranslatedReportField(translatedContent, key, fallback);
};
