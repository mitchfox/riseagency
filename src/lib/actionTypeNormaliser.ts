// Action type normaliser - merges spelling variants, punctuation differences,
// and common synonyms into canonical buckets for cleaner Video Reports lists.

const SYNONYMS: Array<{ canonical: string; patterns: RegExp[] }> = [
  { canonical: "Tackle", patterns: [/tackle/, /not held/, /ball won/, /won the ball/] },
  { canonical: "Interception", patterns: [/intercept/, /pick.?off/] },
  { canonical: "Clearance", patterns: [/clearance/, /clear(ed|ing)?/] },
  { canonical: "Block", patterns: [/block/] },
  { canonical: "Recovery", patterns: [/recover/, /regain/, /loose ball/] },
  { canonical: "Aerial Duel", patterns: [/aerial/, /header(?! goal)/, /head duel/] },
  { canonical: "Goal", patterns: [/^goal$/, /goal scored/, /finish(ed)?/] },
  { canonical: "Assist", patterns: [/assist/] },
  { canonical: "Key Pass", patterns: [/key pass/, /chance created/, /pre[- ]?assist/] },
  { canonical: "Shot", patterns: [/shot(?! on target)/, /attempt/] },
  { canonical: "Shot on Target", patterns: [/shot on target/, /on target/, /forced save/] },
  { canonical: "Dribble", patterns: [/dribble/, /take[- ]?on/, /beat (the )?man/] },
  { canonical: "Carry", patterns: [/carry/, /progressive run/, /drive forward/] },
  { canonical: "Pass", patterns: [/^pass$/, /through ball/, /switch( of play)?/, /progressive pass/, /line break/] },
  { canonical: "Cross", patterns: [/cross/, /delivery/] },
  { canonical: "Press", patterns: [/press/, /forced error/, /closed down/] },
  { canonical: "Save", patterns: [/save/, /parry/, /punch/] },
  { canonical: "Catch", patterns: [/catch/, /claim/] },
  { canonical: "Distribution", patterns: [/distribution/, /goal[- ]?kick/, /throw out/, /kick out/] },
  { canonical: "Set Piece", patterns: [/set[- ]?piece/, /corner/, /free[- ]?kick/, /penalty/, /throw[- ]?in/] },
  { canonical: "Foul", patterns: [/foul/, /yellow card/, /red card/, /booking/] },
];

const stripPunctuation = (s: string) =>
  s
    .toLowerCase()
    .replace(/[._/\\|*+]/g, " ")
    .replace(/\s+-\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length || !b.length) return Math.max(a.length, b.length);
  const dp: number[] = Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = tmp;
    }
  }
  return dp[b.length];
}

const canonicalCache = new Map<string, string>();
const seenCanonicals: string[] = [];

export function canonicalActionType(raw: string): string {
  if (!raw) return "";
  const key = raw.trim();
  const cached = canonicalCache.get(key);
  if (cached) return cached;

  const cleaned = stripPunctuation(key);

  // 1. Synonym/regex pass
  for (const group of SYNONYMS) {
    if (group.patterns.some((re) => re.test(cleaned))) {
      canonicalCache.set(key, group.canonical);
      if (!seenCanonicals.includes(group.canonical)) seenCanonicals.push(group.canonical);
      return group.canonical;
    }
  }

  // 2. Fuzzy match against already-seen canonicals (typos)
  for (const existing of seenCanonicals) {
    const exCleaned = stripPunctuation(existing);
    const maxLen = Math.max(cleaned.length, exCleaned.length);
    if (maxLen >= 4 && levenshtein(cleaned, exCleaned) <= Math.min(2, Math.floor(maxLen / 4))) {
      canonicalCache.set(key, existing);
      return existing;
    }
  }

  // 3. Title case as a new canonical
  const titled = cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
  canonicalCache.set(key, titled);
  seenCanonicals.push(titled);
  return titled;
}

export function groupKey(raw: string): string {
  return canonicalActionType(raw);
}

export function splitActionTypes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function canonicalSplit(raw: string | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of splitActionTypes(raw)) {
    const c = canonicalActionType(part);
    if (!seen.has(c)) {
      seen.add(c);
      out.push(c);
    }
  }
  return out;
}