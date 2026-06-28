# Plan: Fill Market Tables for Luxembourg, Malta, Moldova, Poland

Same approach as the Italian batch: upsert rows into `market_table_entries` keyed on `(club_id, market_table_key='summer-26')` for every club you listed across Luxembourg (16), Malta (12), Moldova (8), and Poland (34).

## Mapping rules (identical to Italy)

- `technical_director_name` → primary sporting / technical / football-ops contact with title appended (e.g. `Łukasz Milik — Sporting Director`).
- `chief_scout_name` → head of scouting / recruitment lead with title.
- Secondary names (e.g. Bissen's two sporting directors Thalamot + Holbach, Jeunesse Esch's Biergen + Breu, Mondorf's Babacic + Nabli, Zimbru's Istrati + Pisarenco, Odra's Sztylka + Koprukowiak) → primary in column, second into `notes`.
- All caveats (verify after date, "fallback only", departure dates, contract end dates, "incoming until 1 Jul", role-currentness conflicts, excluded names and why) → into `notes` verbatim from your source column, in UK English.
- "Not found" / "No safe current fill" → leave that column blank (do NOT overwrite with stale prefill). Where the existing row in DB has a stale name in that slot and you flagged it as superseded/departed (e.g. Widzew's Mindaugas Nikolicius, Wisła Kraków's Kiko Ramírez, Cracovia's Jarosław Gambal, Zagłębie Lubin's Janusz Dziedzic, Warta Poznań's Dawid Frąckowiak, Valletta's Juan Cruz Gill, Spartanii's Veniamin Sosnovschi-as-sporting, Swift Hesperange's Daniel Striani), I will null that column and put the exclusion reason in `notes`.
- Email contacts you supplied (Korona Kielce, Miedź Legnica, Odra Opole) → appended into `notes`, since there's no contact-email column on `market_table_entries`.

## Special handling

- **US Hostert** — Henri Bossi flagged as "incoming until 1 Jul 2026" in notes; still placed in `technical_director_name` since today is 28 Jun 2026 and it's about to be live.
- **Swift Hesperange / FC Victoria Rosport / US Rumelange / Naxxar Lions / Tarxien Rainbows / FC Bălți / Politehnica UTM / Chrobry Głogów / Górnik Łęczna / Stal Mielec / Znicz Pruszków / Warta Poznań** — both columns blank with the "no current safe fill" note explaining why and which historical names were excluded.
- **Pogoń Szczecin** — Okan Özkan goes into both columns since he genuinely holds both roles; note documents the dual remit.
- **Korona Kielce** — supersede older Paweł Tomczyk with Paweł Golański; note documents the supersede.
- **Widzew Łódź / Wisła Kraków / Cracovia / Zagłębie Lubin** — null out the named outdated person flagged in your source and write the exclusion note.

## Technical execution

Single `INSERT … ON CONFLICT (club_id, market_table_key) DO UPDATE` per country (4 statements total), `summer-26` table key. Before writing, I'll query `club_map_positions` filtered to Luxembourg, Malta, Moldova, Poland to confirm every club ID exists; any club not present in `club_map_positions` will be reported back so you can decide whether to add it (no auto-creation of clubs).

No schema changes. No code changes. No effect on other countries.

## Out of scope

- Not creating new clubs in `club_map_positions`.
- Not adding any contact-email schema column (emails live in `notes`).
- Not auto-promoting "incoming" or "verify after date" roles past their date — just noted.
