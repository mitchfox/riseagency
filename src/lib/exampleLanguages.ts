// Languages available for tagging an example analysis. The flag emoji is rendered
// as an overlay in the public viewer so the visitor can immediately see which
// language version of an example they are looking at.
export type ExampleLanguageOption = {
  code: string;
  label: string;
  flag: string;
};

export const EXAMPLE_LANGUAGE_OPTIONS: ExampleLanguageOption[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "pt", label: "Portuguese", flag: "🇵🇹" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "de", label: "German", flag: "🇩🇪" },
  { code: "it", label: "Italian", flag: "🇮🇹" },
  { code: "pl", label: "Polish", flag: "🇵🇱" },
  { code: "cs", label: "Czech", flag: "🇨🇿" },
  { code: "ru", label: "Russian", flag: "🇷🇺" },
  { code: "tr", label: "Turkish", flag: "🇹🇷" },
  { code: "hr", label: "Croatian", flag: "🇭🇷" },
  { code: "no", label: "Norwegian", flag: "🇳🇴" },
];

export const getExampleLanguage = (code?: string | null): ExampleLanguageOption | null => {
  if (!code) return null;
  return EXAMPLE_LANGUAGE_OPTIONS.find((l) => l.code === code) || null;
};