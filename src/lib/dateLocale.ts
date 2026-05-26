// Map portal language codes to BCP-47 locale tags used by Intl/Date APIs.
// Falls back to en-GB so existing behaviour stays the same when no language is set.
const MAP: Record<string, string> = {
  en: "en-GB",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  it: "it-IT",
  pt: "pt-PT",
  cs: "cs-CZ",
  pl: "pl-PL",
  ru: "ru-RU",
  tr: "tr-TR",
  no: "nb-NO",
  hr: "hr-HR",
};

export function dateLocale(lang?: string | null): string {
  if (!lang) return "en-GB";
  return MAP[lang] || "en-GB";
}

export function formatDate(date: Date | string, lang: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(dateLocale(lang), opts);
}