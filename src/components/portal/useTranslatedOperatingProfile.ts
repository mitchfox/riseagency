import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { OPERATING_PROFILE_SECTIONS, Section } from "./operatingProfileQuestions";

type LangCode = "en" | "es" | "pt" | "fr" | "de" | "it" | "pl" | "cs" | "ru" | "tr" | "hr" | "no";

const colMap: Record<Exclude<LangCode, "en">, string> = {
  es: "spanish",
  pt: "portuguese",
  fr: "french",
  de: "german",
  it: "italian",
  pl: "polish",
  cs: "czech",
  ru: "russian",
  tr: "turkish",
  hr: "croatian",
  no: "norwegian",
};

const CACHE_VERSION = "v1";
const cacheKey = (lang: LangCode) => `op_profile_translations_${CACHE_VERSION}_${lang}`;

function collectStrings(): string[] {
  const out: string[] = [];
  for (const s of OPERATING_PROFILE_SECTIONS) {
    out.push(s.title);
    for (const q of s.questions) {
      out.push(q.label);
      if (q.options) for (const o of q.options) out.push(o);
    }
  }
  return Array.from(new Set(out));
}

function applyMap(map: Record<string, string>): Section[] {
  const tr = (s: string) => map[s] || s;
  return OPERATING_PROFILE_SECTIONS.map((s) => ({
    ...s,
    title: tr(s.title),
    questions: s.questions.map((q) => ({
      ...q,
      label: tr(q.label),
      options: q.options ? q.options.map(tr) : undefined,
    })),
  }));
}

async function translateBatch(texts: string[]): Promise<Array<Record<string, string>>> {
  const { data, error } = await supabase.functions.invoke("ai-translate-batch", { body: { texts } });
  if (error) throw error;
  return (data?.translations as Array<Record<string, string>>) || [];
}

export function useTranslatedOperatingProfile() {
  const { language } = useLanguage();
  const [sections, setSections] = useState<Section[]>(OPERATING_PROFILE_SECTIONS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const lang = language as LangCode;
    if (lang === "en") {
      setSections(OPERATING_PROFILE_SECTIONS);
      return;
    }
    const col = colMap[lang as Exclude<LangCode, "en">];
    if (!col) {
      setSections(OPERATING_PROFILE_SECTIONS);
      return;
    }

    // Try cache
    try {
      const raw = localStorage.getItem(cacheKey(lang));
      if (raw) {
        const map = JSON.parse(raw) as Record<string, string>;
        setSections(applyMap(map));
        return;
      }
    } catch {}

    const all = collectStrings();
    const chunks: string[][] = [];
    for (let i = 0; i < all.length; i += 18) chunks.push(all.slice(i, i + 18));

    setLoading(true);
    (async () => {
      try {
        const map: Record<string, string> = {};
        for (const chunk of chunks) {
          const result = await translateBatch(chunk);
          chunk.forEach((src, i) => {
            const translated = result[i]?.[col];
            if (translated) map[src] = translated;
          });
        }
        try {
          localStorage.setItem(cacheKey(lang), JSON.stringify(map));
        } catch {}
        setSections(applyMap(map));
      } catch (e) {
        console.error("Operating profile translation failed", e);
        setSections(OPERATING_PROFILE_SECTIONS);
      } finally {
        setLoading(false);
      }
    })();
  }, [language]);

  return { sections, loading };
}