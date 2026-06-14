# Full public site translation sweep

The `translations` table already holds 2,039 keys, every one fully filled in all 12 languages. The gap is hardcoded English in page/component JSX that never calls `t()`. This plan finds those strings, registers them, wires `t()` calls into the components, and auto-translates the new rows.

## Scope (pages & components)

In scope:

- **Core marketing**: `Landing`, `HowWeRise`, `Stars`, `PlayersPage`, `PlayersList`, `YouthPlayers`, `Scouts`, `LearnMorePage`, `RealisePotential`, `PlayerJourney`
- **Secondary**: `Jobs`, `JobRole`, `Packages`, `PressReleases`, `Media`, `OpenAccess`, `PlayersFAQPage`, `PlayersFAQ`
- **Funnel & dialogs**: `RequestRepresentation`, `Login`, `ScoutLogin`, `PortfolioRequestDialog`, `DeclareInterestDialog`, `DeclareInterestPlayerDialog`, `ContactDialog`, `CapabilityAccordion`, `Header`, `RadialMenu`, `LanguageSelector`, `LanguageMapSelector`, `DragNavigator`
- **Public reports**: `PerformanceReport`, `PerformancePage`, `PlayerDetail`

Explicitly out of scope: staff portal, player portal, admin tools, console-only strings, code identifiers.

## How the audit runs (script, no UI changes)

A one-off Node script under `scripts/translation-audit.ts`:

1. Parses each in-scope file with the TypeScript compiler API.
2. Collects every `JSXText` node (after trim) and every string literal/template literal passed to translatable JSX attributes only: `placeholder`, `title`, `alt`, `aria-label`, `aria-description`, `label`, `description`, the children of `<title>`/`<meta description>`, and the strings inside `toast({ title, description })`.
3. Skips anything already inside a `t(...)` call, anything matching pure numbers/symbols/single-letters, anything matching a className/route/asset path pattern, anything already wired through `useTranslation` HOCs, and anything inside `// i18n-skip` blocks.
4. Generates a deterministic `text_key`: `<page>.<slug-of-first-40-chars>`. Collisions get a `-2`, `-3` suffix.
5. Emits two artefacts to `/mnt/documents/`:
   - `translation-audit.csv` — page, file, line, text_key, english
   - `translation-audit.patch.json` — exact edits to apply per file

I will review the audit output before any code changes ship.

## Wiring components

For each row in the audit:

- Insert into `translations` (`page_name`, `text_key`, `english`) using `INSERT ... ON CONFLICT DO NOTHING`.
- Replace the source location with `{t('<page>.<text_key>', '<english fallback>')}` for JSX text, or `t(...)` calls for attribute strings.
- Pages that don't already import `useLanguage` get the import added once.

Hardcoded strings inside conditional / interpolated JSX (e.g. `Hello, {name}`) are rewritten with the existing `t` interpolation convention used elsewhere in the codebase (`t('key').replace('{name}', name)`).

## Auto-translation

After the inserts land:

1. Call the existing `ai-translate-batch` edge function in chunks of 50 rows.
2. For each row it produces translations for the 11 non-English columns using `google/gemini-3-flash-preview` (the AI gateway default — fast, low cost).
3. The prompt enforces: UK English source, no em dashes, no Oxford comma overuse, preserve `{placeholders}`, keep football terms in the standard form per the localization memory.
4. Failed rows retry once; anything still failing logs to `/mnt/documents/translation-failures.csv` for manual fill.

## Verification

- Re-run the audit script — it must return zero remaining hardcoded strings in the in-scope files.
- Spot-check three pages in `?lang=es`, `?lang=de`, `?lang=cs` in the preview to confirm strings render and no English leaks remain.
- SQL check: `SELECT COUNT(*) FROM translations WHERE spanish IS NULL OR portuguese IS NULL OR ...` must still return 0.

## Estimated impact

- Roughly 30 files touched, expect 400–900 new translation keys based on rough grep of bare text in those files.
- AI translation cost: ~1 gateway call per row × 11 languages. Batched 50 at a time keeps it under a few cents.
- One build message for the audit script + inserts, one for the wiring sweep, one for the AI fill. Total ~3 build messages.

## Risks & mitigations

- **False positives** (rewriting strings that should stay literal): the audit limits itself to JSX text and a fixed allowlist of attributes, and skips anything matching `/^[\d\s\W]+$/` or path-like patterns.
- **JSX interpolation breakage**: any node containing child expressions is flagged for manual review instead of auto-rewritten.
- **Layout shifts** in other languages (German is longer): no layout changes in this pass; if anything overflows, fix in a follow-up.
- **Duplicate keys** across pages: page_name prefix in the key prevents collisions.

## Out of scope (call out separately if you want them)

- Translating dynamic DB content (job descriptions, blog posts, player bios) at read time.
- Translating image-rendered text (graphics, hero overlays baked into assets).
- Localising route slugs that aren't already mapped in `localizedRoutes`.
