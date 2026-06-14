/**
 * Rewrite source files: replace hardcoded English with t(...) calls.
 * Re-parses each file, matches AST nodes against audit findings by line/column,
 * and applies edits in reverse order so positions stay valid.
 */
import * as ts from "typescript";
import * as fs from "node:fs";

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

const ALL = JSON.parse(
  fs.readFileSync("/mnt/documents/translation-audit.json", "utf8"),
) as Finding[];

const byFile: Record<string, Finding[]> = {};
for (const f of ALL) (byFile[f.file] ||= []).push(f);

function ensureUseLanguageImport(src: string): string {
  // Already imports useLanguage?
  if (/from\s+["']@\/contexts\/LanguageContext["']/.test(src)) return src;
  // Insert import after the last existing import line.
  const lines = src.split("\n");
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s.+from\s+["'].+["'];?\s*$/.test(lines[i])) lastImport = i;
  }
  const importLine = `import { useLanguage } from "@/contexts/LanguageContext";`;
  if (lastImport === -1) {
    return importLine + "\n" + src;
  }
  lines.splice(lastImport + 1, 0, importLine);
  return lines.join("\n");
}

function ensureTDestructured(src: string, fnName?: string): string {
  // Heuristic: if no `const { t } = useLanguage()` or similar in file, insert
  // inside the first React component (function declaration returning JSX).
  if (/\buseLanguage\s*\(\s*\)/.test(src) && /\bconst\s*\{\s*t\b/.test(src)) return src;
  // Find first `function X(...) {` or `const X = (...) => {` returning JSX.
  // We'll inject after the first `{` after an arrow/function signature in a
  // capitalised name (component).
  const re = /(?:export\s+default\s+function|export\s+function|function|const)\s+([A-Z][A-Za-z0-9_]*)\s*[^{=]*[={][^{]*\{/m;
  const m = re.exec(src);
  if (!m) return src;
  const insertAt = m.index + m[0].length;
  return (
    src.slice(0, insertAt) +
    `\n  const { t } = useLanguage();` +
    src.slice(insertAt)
  );
}

function jsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function rewriteFile(filePath: string, findings: Finding[]) {
  let src = fs.readFileSync(filePath, "utf8");
  const sf = ts.createSourceFile(filePath, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  type Edit = { start: number; end: number; text: string };
  const edits: Edit[] = [];

  // Index findings by (line, kind, attr, english) to match nodes
  const findingMap = new Map<string, Finding>();
  const findingKey = (line: number, kind: string, attr: string | undefined, english: string) =>
    `${line}|${kind}|${attr || ""}|${english.replace(/\s+/g, " ").trim()}`;
  for (const f of findings) findingMap.set(findingKey(f.line, f.kind, f.attr, f.english), f);

  function tCall(f: Finding): string {
    return `t('${f.page}.${f.text_key}', '${jsEscape(f.english)}')`;
  }

  function findingForNode(node: ts.Node, kind: Finding["kind"], attr: string | undefined, english: string): Finding | undefined {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    return findingMap.get(findingKey(line + 1, kind, attr, english));
  }

  function visit(node: ts.Node) {
    if (ts.isJsxText(node)) {
      const raw = node.text;
      const trimmed = raw.replace(/\s+/g, " ").trim();
      if (trimmed) {
        const f = findingForNode(node, "jsx_text", undefined, trimmed);
        if (f) {
          // Preserve surrounding whitespace; replace only the inner text.
          const leading = raw.match(/^\s*/)![0];
          const trailing = raw.match(/\s*$/)![0];
          edits.push({
            start: node.getStart(sf),
            end: node.getEnd(),
            text: `${leading}{${tCall(f)}}${trailing}`,
          });
        }
      }
    }
    if (ts.isJsxAttribute(node) && node.name && node.initializer) {
      const name = node.name.getText(sf);
      let lit: ts.Node | undefined;
      let value: string | undefined;
      if (ts.isStringLiteral(node.initializer)) {
        lit = node.initializer;
        value = node.initializer.text;
      } else if (
        ts.isJsxExpression(node.initializer) &&
        node.initializer.expression &&
        (ts.isStringLiteral(node.initializer.expression) ||
          ts.isNoSubstitutionTemplateLiteral(node.initializer.expression))
      ) {
        lit = node.initializer.expression;
        value = (node.initializer.expression as ts.StringLiteral).text;
      }
      if (lit && value !== undefined) {
        const f = findingForNode(lit, "attr", name, value);
        if (f) {
          edits.push({
            start: node.initializer.getStart(sf),
            end: node.initializer.getEnd(),
            text: `{${tCall(f)}}`,
          });
        }
      }
    }
    if (ts.isCallExpression(node)) {
      const exprText = node.expression.getText(sf);
      if (/(^|\.)toast$/.test(exprText) && node.arguments.length > 0) {
        const arg = node.arguments[0];
        if (ts.isObjectLiteralExpression(arg)) {
          for (const prop of arg.properties) {
            if (
              ts.isPropertyAssignment(prop) &&
              ts.isIdentifier(prop.name) &&
              ts.isStringLiteral(prop.initializer)
            ) {
              const k = prop.name.text;
              if (k === "title" || k === "description") {
                const f = findingForNode(prop.initializer, "toast", k, prop.initializer.text);
                if (f) {
                  edits.push({
                    start: prop.initializer.getStart(sf),
                    end: prop.initializer.getEnd(),
                    text: tCall(f),
                  });
                }
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  if (edits.length === 0) return { file: filePath, applied: 0 };

  // Apply edits in reverse order
  edits.sort((a, b) => b.start - a.start);
  for (const e of edits) {
    src = src.slice(0, e.start) + e.text + src.slice(e.end);
  }

  // Ensure imports + t destructured
  src = ensureUseLanguageImport(src);
  src = ensureTDestructured(src);

  fs.writeFileSync(filePath, src);
  return { file: filePath, applied: edits.length };
}

for (const [file, findings] of Object.entries(byFile)) {
  const r = rewriteFile(file, findings);
  console.log(`  ${r.applied.toString().padStart(3)}  ${file.replace("/dev-server/", "")}`);
}