/**
 * Translation audit: find hardcoded English in public-facing pages/components.
 *
 * Run with: bun run scripts/translation-audit.ts
 *
 * Emits:
 *   /mnt/documents/translation-audit.csv
 *   /mnt/documents/translation-audit.json
 */
import * as ts from "typescript";
import * as fs from "node:fs";
import * as path from "node:path";

// In-scope public-facing files (relative to repo root)
const TARGETS: Array<{ file: string; page: string }> = [
  // Core marketing
  { file: "src/pages/Landing.tsx", page: "landing" },
  { file: "src/pages/HowWeRise.tsx", page: "how_we_rise" },
  { file: "src/pages/Stars.tsx", page: "stars" },
  { file: "src/pages/PlayersPage.tsx", page: "players_page" },
  { file: "src/pages/PlayersList.tsx", page: "players_list" },
  { file: "src/pages/YouthPlayers.tsx", page: "youth_players" },
  { file: "src/pages/Scouts.tsx", page: "scouts" },
  { file: "src/pages/LearnMorePage.tsx", page: "learn_more" },
  { file: "src/pages/RealisePotential.tsx", page: "realise_potential" },
  { file: "src/pages/PlayerJourney.tsx", page: "player_journey" },
  // Secondary
  { file: "src/pages/Jobs.tsx", page: "jobs" },
  { file: "src/pages/JobRole.tsx", page: "job_role" },
  { file: "src/pages/Packages.tsx", page: "packages" },
  { file: "src/pages/PressReleases.tsx", page: "press_releases" },
  { file: "src/pages/Media.tsx", page: "media" },
  { file: "src/pages/OpenAccess.tsx", page: "open_access" },
  { file: "src/pages/PlayersFAQPage.tsx", page: "players_faq_page" },
  { file: "src/components/PlayersFAQ.tsx", page: "players_faq" },
  // Funnel & dialogs
  { file: "src/pages/RequestRepresentation.tsx", page: "request_representation" },
  { file: "src/pages/Login.tsx", page: "login" },
  { file: "src/pages/ScoutLogin.tsx", page: "scout_login" },
  { file: "src/components/PortfolioRequestDialog.tsx", page: "portfolio_request" },
  { file: "src/components/DeclareInterestDialog.tsx", page: "declare_interest" },
  { file: "src/components/DeclareInterestPlayerDialog.tsx", page: "declare_interest_player" },
  { file: "src/components/ContactDialog.tsx", page: "contact_dialog" },
  { file: "src/components/CapabilityAccordion.tsx", page: "capability_accordion" },
  { file: "src/components/Header.tsx", page: "header" },
  { file: "src/components/RadialMenu.tsx", page: "radial_menu" },
  { file: "src/components/LanguageSelector.tsx", page: "language_selector" },
  { file: "src/components/LanguageMapSelector.tsx", page: "language_map_selector" },
  { file: "src/components/DragNavigator.tsx", page: "drag_navigator" },
  // Public reports
  { file: "src/pages/PerformanceReport.tsx", page: "performance_report" },
  { file: "src/pages/PerformancePage.tsx", page: "performance_page" },
  { file: "src/pages/PlayerDetail.tsx", page: "player_detail" },
];

// JSX attributes that are user-visible and worth translating
const TRANSLATABLE_ATTRS = new Set([
  "placeholder",
  "title",
  "alt",
  "aria-label",
  "aria-description",
  "label",
  "description",
]);

// Strings that look like code / paths / classNames / event names → skip
const SKIP_PATTERNS: RegExp[] = [
  /^\s*$/,
  /^[\d\s\W]+$/,
  /^[a-z][a-zA-Z0-9_-]*$/, // single lowercase identifier-ish token (className/event)
  /^[A-Z_]+$/, // SHOUTY_CONSTANT
  /^https?:\/\//,
  /^\//, // any path
  /^#/, // anchor / hex
  /\.(png|jpg|jpeg|webp|svg|gif|mp4|mp3|wav|pdf|tsx?|jsx?|css|json)$/i,
  /^@[\w/-]+$/,
  /^[a-z]+-[a-z-]+$/, // tailwind-ish utility
];

function isLikelyContent(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.length < 2) return false;
  // Must contain at least one letter and at least one space OR length > 4
  if (!/[A-Za-z]/.test(trimmed)) return false;
  for (const re of SKIP_PATTERNS) {
    if (re.test(trimmed)) return false;
  }
  return true;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "text";
}

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

function isInsideTCall(node: ts.Node): boolean {
  let cur: ts.Node | undefined = node.parent;
  while (cur) {
    if (ts.isCallExpression(cur)) {
      const expr = cur.expression;
      if (ts.isIdentifier(expr) && expr.text === "t") return true;
      if (
        ts.isPropertyAccessExpression(expr) &&
        ts.isIdentifier(expr.name) &&
        expr.name.text === "t"
      )
        return true;
    }
    cur = cur.parent;
  }
  return false;
}

function auditFile(filePath: string, page: string): Finding[] {
  const source = fs.readFileSync(filePath, "utf8");
  const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings: Finding[] = [];
  const usedKeys = new Set<string>();

  function pushFinding(english: string, node: ts.Node, kind: Finding["kind"], attr?: string) {
    const clean = english.replace(/\s+/g, " ").trim();
    if (!isLikelyContent(clean)) return;
    if (isInsideTCall(node)) return;
    let key = slugify(clean);
    let i = 2;
    while (usedKeys.has(key)) key = `${slugify(clean)}_${i++}`;
    usedKeys.add(key);
    const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    findings.push({
      page,
      file: filePath,
      line: line + 1,
      column: character + 1,
      kind,
      attr,
      english: clean,
      text_key: key,
    });
  }

  function visit(node: ts.Node) {
    // JSX text nodes
    if (ts.isJsxText(node)) {
      const text = node.text;
      if (text.trim()) pushFinding(text, node, "jsx_text");
    }
    // JSX attributes: placeholder="..." etc.
    if (ts.isJsxAttribute(node) && node.name) {
      const name = node.name.getText(sf);
      if (TRANSLATABLE_ATTRS.has(name) && node.initializer) {
        const init = node.initializer;
        if (ts.isStringLiteral(init)) {
          pushFinding(init.text, init, "attr", name);
        } else if (
          ts.isJsxExpression(init) &&
          init.expression &&
          ts.isStringLiteral(init.expression)
        ) {
          pushFinding(init.expression.text, init.expression, "attr", name);
        } else if (
          ts.isJsxExpression(init) &&
          init.expression &&
          ts.isNoSubstitutionTemplateLiteral(init.expression)
        ) {
          pushFinding(init.expression.text, init.expression, "attr", name);
        }
      }
    }
    // toast({ title: "...", description: "..." })
    if (ts.isCallExpression(node)) {
      const exprText = node.expression.getText(sf);
      if (/(^|\.)toast$/.test(exprText) && node.arguments.length > 0) {
        const arg = node.arguments[0];
        if (ts.isObjectLiteralExpression(arg)) {
          for (const prop of arg.properties) {
            if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
              const k = prop.name.text;
              if ((k === "title" || k === "description") && ts.isStringLiteral(prop.initializer)) {
                pushFinding(prop.initializer.text, prop.initializer, "toast", k);
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);
  return findings;
}

function main() {
  const all: Finding[] = [];
  const missing: string[] = [];
  for (const t of TARGETS) {
    const full = path.resolve(t.file);
    if (!fs.existsSync(full)) {
      missing.push(t.file);
      continue;
    }
    const f = auditFile(full, t.page);
    all.push(...f);
  }

  const outDir = "/mnt/documents";
  fs.mkdirSync(outDir, { recursive: true });

  // CSV
  const csvLines = ["page,file,line,column,kind,attr,text_key,english"];
  for (const f of all) {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    csvLines.push(
      [
        f.page,
        f.file,
        String(f.line),
        String(f.column),
        f.kind,
        f.attr || "",
        f.text_key,
        f.english,
      ]
        .map(esc)
        .join(","),
    );
  }
  fs.writeFileSync(path.join(outDir, "translation-audit.csv"), csvLines.join("\n"));
  fs.writeFileSync(path.join(outDir, "translation-audit.json"), JSON.stringify(all, null, 2));

  // Summary by page
  const byPage: Record<string, number> = {};
  for (const f of all) byPage[f.page] = (byPage[f.page] || 0) + 1;
  const summary = Object.entries(byPage)
    .sort((a, b) => b[1] - a[1])
    .map(([p, n]) => `  ${p}: ${n}`)
    .join("\n");
  console.log(`Audited ${TARGETS.length - missing.length} files. Found ${all.length} candidate strings.`);
  console.log("Per page:\n" + summary);
  if (missing.length) console.log("Missing files (skipped):\n  " + missing.join("\n  "));
  console.log("\nWrote:\n  /mnt/documents/translation-audit.csv\n  /mnt/documents/translation-audit.json");
}

main();