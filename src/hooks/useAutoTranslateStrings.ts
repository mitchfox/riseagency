import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizePortalLanguage } from "@/lib/portalTranslations";

const COL: Record<string, string> = {
  es: "spanish", pt: "portuguese", fr: "french", de: "german", it: "italian",
  pl: "polish", cs: "czech", ru: "russian", tr: "turkish", hr: "croatian", no: "norwegian",
};

const CACHE_VERSION = "v1";
const cacheKey = (lang: string) => `auto_translate_${CACHE_VERSION}_${lang}`;

function loadCache(lang: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(cacheKey(lang));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(lang: string, map: Record<string, string>) {
  try {
    localStorage.setItem(cacheKey(lang), JSON.stringify(map));
  } catch {}
}

/**
 * Translate an arbitrary list of strings to the player's portal language.
 * Caches results in localStorage so repeat strings are free.
 * Returns a `translate(s)` function that returns the cached translation or the original.
 */
export function useAutoTranslateStrings(strings: (string | null | undefined)[], portalLanguage?: string | null) {
  const normalized = normalizePortalLanguage(portalLanguage) || "en";
  const [map, setMap] = useState<Record<string, string>>(() =>
    normalized === "en" ? {} : loadCache(normalized)
  );
  const inflight = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (normalized === "en") return;
    const col = COL[normalized];
    if (!col) return;
    const unique = Array.from(new Set(strings.filter((s): s is string => !!s && s.trim().length > 0)));
    const missing = unique.filter((s) => !map[s] && !inflight.current.has(s));
    if (missing.length === 0) return;
    missing.forEach((s) => inflight.current.add(s));

    (async () => {
      try {
        const next: Record<string, string> = { ...map };
        for (let i = 0; i < missing.length; i += 18) {
          const chunk = missing.slice(i, i + 18);
          const { data, error } = await supabase.functions.invoke("ai-translate-batch", { body: { texts: chunk } });
          if (error) throw error;
          const translations = (data?.translations as Array<Record<string, string>>) || [];
          chunk.forEach((src, idx) => {
            const v = translations[idx]?.[col];
            if (v) next[src] = v;
          });
        }
        saveCache(normalized, next);
        setMap(next);
      } catch (e) {
        console.warn("Auto-translate failed", e);
      } finally {
        missing.forEach((s) => inflight.current.delete(s));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalized, strings.join("\u0001")]);

  const translate = (s?: string | null) => {
    if (!s) return s || "";
    if (normalized === "en") return s;
    return map[s] || s;
  };

  return { translate };
}