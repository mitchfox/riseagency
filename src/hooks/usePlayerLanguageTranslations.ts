import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch translations for a SPECIFIC language (the player's portal_language)
 * regardless of the visitor's currently-active site language. Used by the
 * Rise With Us offer page so each prospect always sees their own language,
 * even if another player's offer set a site-wide preference earlier.
 */

type LangCode = "en" | "es" | "pt" | "fr" | "de" | "it" | "pl" | "cs" | "ru" | "tr" | "hr" | "no";

const COLUMNS: Record<LangCode, string> = {
  en: "english", es: "spanish", pt: "portuguese", fr: "french", de: "german",
  it: "italian", pl: "polish", cs: "czech", ru: "russian", tr: "turkish",
  hr: "croatian", no: "norwegian",
};

const cache = new Map<string, Map<string, string>>();

export const usePlayerLanguageTranslations = (lang: string) => {
  const code = (COLUMNS as any)[lang] ? (lang as LangCode) : "en";
  const [map, setMap] = useState<Map<string, string>>(() => cache.get(code) ?? new Map());
  const [loaded, setLoaded] = useState<boolean>(cache.has(code));

  useEffect(() => {
    if (cache.has(code)) {
      setMap(cache.get(code)!);
      setLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const PAGE = 1000;
      let from = 0;
      let all: any[] = [];
      let more = true;
      while (more) {
        const { data, error } = await supabase
          .from("translations")
          .select(`page_name, text_key, english, ${COLUMNS[code]}`)
          .range(from, from + PAGE - 1);
        if (error || !data || data.length === 0) { more = false; break; }
        all = all.concat(data);
        from += PAGE;
        more = data.length === PAGE;
      }
      if (cancelled) return;
      const m = new Map<string, string>();
      const col = COLUMNS[code];
      all.forEach((row: any) => {
        const key = row.text_key.startsWith(`${row.page_name}.`)
          ? row.text_key
          : `${row.page_name}.${row.text_key}`;
        const localized = row[col] as string | null;
        const fallback = (row.english as string | null) || "";
        const candidate = localized || fallback;
        const existing = m.get(key);
        if (!existing) { m.set(key, candidate); return; }
        if (localized && existing === fallback) m.set(key, candidate);
      });
      cache.set(code, m);
      setMap(m);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [code]);

  const t = (key: string, fallback?: string): string =>
    map.get(key) || fallback || key;

  return { t, loaded, language: code, translations: map };
};

export default usePlayerLanguageTranslations;