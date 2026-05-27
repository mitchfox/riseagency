import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { OPERATING_PROFILE_SECTIONS, Section } from "./operatingProfileQuestions";
import { normalizePortalLanguage } from "@/lib/portalTranslations";

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

const CACHE_VERSION = "v3";
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

function applyMap(map: Record<string, string>): { sections: Section[]; labelFor: (s: string) => string } {
  const tr = (s: string) => map[s] || s;
  const sections = OPERATING_PROFILE_SECTIONS.map((s) => ({
    ...s,
    title: tr(s.title),
    questions: s.questions.map((q) => ({
      ...q,
      label: tr(q.label),
      // Keep options as original English (used as storage keys)
      options: q.options ? [...q.options] : undefined,
    })),
  }));
  return { sections, labelFor: tr };
}

async function translateBatch(texts: string[]): Promise<Array<Record<string, string>>> {
  const { data, error } = await supabase.functions.invoke("ai-translate-batch", { body: { texts } });
  if (error) throw error;
  return (data?.translations as Array<Record<string, string>>) || [];
}

export function useTranslatedOperatingProfile(portalLanguageOverride?: string | null) {
  const { language } = useLanguage();
  const effectiveLanguage = (normalizePortalLanguage(portalLanguageOverride) || language) as LangCode;
  const [sections, setSections] = useState<Section[]>(OPERATING_PROFILE_SECTIONS);
  const [labelFor, setLabelFor] = useState<(s: string) => string>(() => (s: string) => s);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const lang = effectiveLanguage as LangCode;
    if (lang === "en") {
      setSections(OPERATING_PROFILE_SECTIONS);
      setLabelFor(() => (s: string) => s);
      return;
    }
    const col = colMap[lang as Exclude<LangCode, "en">];
    if (!col) {
      setSections(OPERATING_PROFILE_SECTIONS);
      setLabelFor(() => (s: string) => s);
      return;
    }

    const all = collectStrings();

    // Load cached map (may be partial)
    let cachedMap: Record<string, string> = {};
    try {
      const raw = localStorage.getItem(cacheKey(lang));
      if (raw) cachedMap = JSON.parse(raw) as Record<string, string>;
    } catch {}

    // Apply whatever we have immediately so UI isn't stuck in English
    if (Object.keys(cachedMap).length > 0) {
      const applied = applyMap(cachedMap);
      setSections(applied.sections);
      setLabelFor(() => applied.labelFor);
    }

    // Identify strings missing from the cache
    const missing = all.filter((s) => !cachedMap[s]);
    if (missing.length === 0) return;

    const chunks: string[][] = [];
    for (let i = 0; i < missing.length; i += 18) chunks.push(missing.slice(i, i + 18));

    setLoading(true);
    (async () => {
      try {
        const map: Record<string, string> = { ...cachedMap };
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
        const applied = applyMap(map);
        setSections(applied.sections);
        setLabelFor(() => applied.labelFor);
      } catch (e) {
        console.error("Operating profile translation failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [effectiveLanguage]);

  return { sections, loading, labelFor };
}