import { useEffect, useState } from "react";

/**
 * useState that persists its value to localStorage under the given key.
 * Lets sections (Technical, SPS, Nutrition, etc.) remember the last selection
 * across navigations so returning to a section restores the previous context.
 */
export function usePersistedState<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota errors */
    }
  }, [key, value]);

  return [value, setValue];
}