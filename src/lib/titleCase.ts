/**
 * Converts a string to Title Case (each word capitalised).
 * Handles hyphens, e.g. "build-up" → "Build-Up"
 */
export const toTitleCase = (str: string): string => {
  if (!str) return str;
  return str
    .split(/(\s+|-)/)
    .map(part => {
      if (part === '-' || /^\s+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('');
};
