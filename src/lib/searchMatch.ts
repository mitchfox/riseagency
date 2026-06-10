/**
 * Shared text matching utilities for staff search filters.
 *
 * Goals:
 *  - Diacritic-insensitive (Vaculík matches "vaculik")
 *  - Multi-token, order-independent ("omotoye tyrese" matches "Tyrese Omotoye")
 *  - Substring match per token across any number of fields
 *  - Cheap enough to run synchronously on every keystroke
 */

const diacritics = /[\u0300-\u036f]/g;

/** Lowercased, diacritic-stripped, whitespace-collapsed form of a string. */
export const normalise = (input: string | null | undefined): string => {
  if (!input) return "";
  return input
    .toString()
    .normalize("NFD")
    .replace(diacritics, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
};

/** Split a query into normalised tokens, drop empties. */
export const tokenise = (query: string | null | undefined): string[] => {
  const n = normalise(query);
  if (!n) return [];
  return n.split(" ").filter(Boolean);
};

/**
 * True when EVERY token in the query is a substring of the concatenated,
 * normalised field blob. Empty/whitespace query returns true.
 */
export const matchesQuery = (
  query: string | null | undefined,
  fields: Array<string | number | null | undefined>,
): boolean => {
  const tokens = tokenise(query);
  if (tokens.length === 0) return true;
  const blob = fields
    .map((f) => normalise(f == null ? "" : String(f)))
    .filter(Boolean)
    .join(" ");
  if (!blob) return false;
  for (const t of tokens) {
    if (!blob.includes(t)) return false;
  }
  return true;
};

/**
 * Tiny ranking score for suggestion ordering.
 *   3 = exact match
 *   2 = prefix match
 *   1 = word-start match
 *   0 = substring match
 *  -1 = no match
 */
export const scoreMatch = (query: string, label: string): number => {
  const q = normalise(query);
  const l = normalise(label);
  if (!q || !l) return -1;
  if (l === q) return 3;
  if (l.startsWith(q)) return 2;
  if (l.includes(" " + q)) return 1;
  if (l.includes(q)) return 0;
  return -1;
};