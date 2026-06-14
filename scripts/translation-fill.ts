/**
 * Translation fill: AI-translates audit findings, emits SQL inserts and
 * source-file patches.
 *
 * Reads: /mnt/documents/translation-audit.json
 * Writes:
 *   /mnt/documents/translation-inserts.sql  -- bulk INSERT for translations
 *   /mnt/documents/translation-rewrites.json -- per-file edits to apply
 *   /mnt/documents/translation-failures.json -- rows the AI couldn't translate
 *
 * Env required: SUPABASE_URL, SUPABASE_ANON_KEY (read from .env)
 */
import * as fs from "node:fs";
import * as path from "node:path";

type Finding = {
  page: string;
  file: string;
  line: number;
  column: number;
  kind: "jsx_text" | "attr" | "toast";
  attr?: string;
  english: string;
  text_key: string;
};

const AUDIT = JSON.parse(
  fs.readFileSync("/mnt/documents/translation-audit.json", "utf8"),
) as Finding[];

// Load Supabase config from .env
function loadEnv() {
  const env: Record<string, string> = {};
  try {
    const raw = fs.readFileSync(".env", "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
  } catch {}
  return env;
}
const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const ANON_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "";
if (!SUPABASE_URL || !ANON_KEY) {
  console.error("Missing SUPABASE_URL / ANON_KEY in .env");
  process.exit(1);
}

const LANGS = [
  "spanish",
  "portuguese",
  "french",
  "german",
  "italian",
  "polish",
  "czech",
  "russian",
  "turkish",
  "croatian",
  "norwegian",
] as const;
type Lang = (typeof LANGS)[number];

// Unique english strings (so we don't translate "Grid View" twice).
const uniqueEnglish = Array.from(new Set(AUDIT.map((f) => f.english)));
console.log(`Unique strings to translate: ${uniqueEnglish.length}`);

async function translateBatch(texts: string[]): Promise<Array<Record<Lang, string>>> {
  const url = `${SUPABASE_URL}/functions/v1/ai-translate-batch`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ texts }),
  });
  if (!res.ok) {
    throw new Error(`translate batch failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.translations as Array<Record<Lang, string>>;
}

function sqlEscape(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

async function main() {
  const map = new Map<string, Record<Lang, string>>();
  const failures: string[] = [];
  const BATCH = 15;
  for (let i = 0; i < uniqueEnglish.length; i += BATCH) {
    const slice = uniqueEnglish.slice(i, i + BATCH);
    process.stdout.write(`  translating ${i + 1}-${i + slice.length}/${uniqueEnglish.length}...`);
    try {
      const result = await translateBatch(slice);
      slice.forEach((src, idx) => {
        if (result[idx]) map.set(src, result[idx]);
        else failures.push(src);
      });
      console.log(" ok");
    } catch (e) {
      console.log(" FAILED:", (e as Error).message);
      slice.forEach((s) => failures.push(s));
    }
    // gentle pacing
    await new Promise((r) => setTimeout(r, 400));
  }

  // Build SQL inserts
  const sqlLines: string[] = [];
  for (const f of AUDIT) {
    const tr = map.get(f.english);
    if (!tr) continue;
    const vals = [
      sqlEscape(f.page),
      sqlEscape(f.text_key),
      sqlEscape(f.english),
      sqlEscape(tr.spanish || f.english),
      sqlEscape(tr.portuguese || f.english),
      sqlEscape(tr.french || f.english),
      sqlEscape(tr.german || f.english),
      sqlEscape(tr.italian || f.english),
      sqlEscape(tr.polish || f.english),
      sqlEscape(tr.czech || f.english),
      sqlEscape(tr.russian || f.english),
      sqlEscape(tr.turkish || f.english),
      sqlEscape(tr.croatian || f.english),
      sqlEscape(tr.norwegian || f.english),
    ].join(",");
    sqlLines.push(`(${vals})`);
  }
  const sql =
    "INSERT INTO public.translations (page_name, text_key, english, spanish, portuguese, french, german, italian, polish, czech, russian, turkish, croatian, norwegian) VALUES\n" +
    sqlLines.join(",\n") +
    "\nON CONFLICT (page_name, text_key) DO NOTHING;";
  fs.writeFileSync("/mnt/documents/translation-inserts.sql", sql);

  // Group rewrites by file
  const rewrites: Record<string, Finding[]> = {};
  for (const f of AUDIT) {
    if (!map.has(f.english)) continue;
    (rewrites[f.file] ||= []).push(f);
  }
  fs.writeFileSync(
    "/mnt/documents/translation-rewrites.json",
    JSON.stringify(rewrites, null, 2),
  );
  fs.writeFileSync("/mnt/documents/translation-failures.json", JSON.stringify(failures, null, 2));

  console.log(`\nTranslated: ${map.size} unique. Failures: ${failures.length}.`);
  console.log(`SQL: /mnt/documents/translation-inserts.sql (${sqlLines.length} rows)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});