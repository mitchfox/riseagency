Same approach as the Italy/Luxembourg/Malta/Moldova/Poland batches: upsert rows into `market_table_entries` keyed on `(club_id, market_table_key='summer-26')` for every club listed across Portugal (~36), Romania (~16), Russia (~17), Scotland (~22), and Serbia (~30).

## Mapping rules (identical to prior batches)

- `technical_director_name` → primary sporting/technical/football-ops contact with title appended (e.g. `Mário Branco — Sporting Director`).
- `chief_scout_name` → head of scouting / recruitment lead with title.
- Secondary names (e.g. Rio Ave's Bruno Alves alongside Tognozzi, IMT's Knežević alongside Govedarica, Borac 1926's Stevanović alongside Stanisavljević, UTA Arad's two head scouts Sârb + O'Sullivan Barker, Zenit's Keosidi alongside Shipulin, Crvena zvezda's Marko Marin as Technical Director, Partizan's pending sporting-director vacancy) → second name into `notes`.
- All caveats (departure dates, "fallback only", title conflicts, supersedes, academy-only exclusions, verify-after notes, excluded names and why) → into `notes` verbatim, UK English.
- "Not found" → leave that column blank; if the DB row already has a stale prefill flagged as departed/superseded (e.g. FC Porto's Zubizarreta, Casa Pia's Grencho, CD Santa Clara's Ornelas, Gil Vicente's Lenho, SL Benfica's Luisão, Vitória Guimarães' Rogério Matias, CFR Cluj's Bogdan Mara, FC U Cluj's Mara, Fakel Voronezh's Kotov + Samedov, Sochi's Veryaskin + Orlov, Krylya Sovetov's Pimenov, Dynamo Moscow's Akavov, Dunfermline's Meggle, St Mirren's Foyle, Arbroath's Sellars, Radnički 1923's Perović, Vojvodina's Jovanović, Smederevo's Simović, TSC's Grussmann, Rangers' Scoulding, Dundee's Kirkwood) → null that column and write the exclusion reason in `notes`.
- Contact phone numbers you supplied (FC Krasnodar: +7 861 298 07 20) → appended into `notes` since there's no contact-phone column.

## Special handling

- **Crvena zvezda** — Mrkela in primary, Marko Marin as Technical Director noted; Leposavić as Chief Scout with appointment date in notes.
- **IMT Novi Beograd / Borac 1926** — dual leadership recorded, chief_scout left blank with note explaining Knežević/Stevanović are TD/DoF not scouts.
- **Stenhousemuir** — Martin Christie fills both columns (Director of Football leading recruitment) with note documenting the dual remit.
- **Rangers FC / Rangers** — both rows in your Scotland list resolve to the same canonical Rangers club; will write once and note the duplicate.
- **Queen's Park / Queens Park** — same canonical club, both empty in source; write blank with the "no current target" note.
- **FC Porto B / SL Benfica B / Sporting CP B** — write parent-club structure with explicit "parent structure; no B-team-specific role found" caveat in notes.
- **Sepsi OSK** — Berecz from LinkedIn with explicit "LinkedIn-current; official Sepsi leadership page does not show this role" caveat.
- **Rapid 1923** — Bilașco in primary with conflict note re: 2025 Pederzoli listing; Măstăcăneanu marked "press only, no official confirmation".
- **Universitatea Craiova** — Hugo Pina written with "newer Dec 2025 evidence; official leadership page still lists Silviu Bogdan" caveat.
- **UTA Arad** — Drăgan in primary with "title conflict; 2025 press described Grădinariu as sporting director" caveat; both Sârb and O'Sullivan Barker captured.
- **Akron Tolyatti** — Burtovoy in primary with note that he was previously chief scout, no separate current head scout.
- **Dinamo Makhachkala** — Gazizov in primary as fallback (general director overseeing sporting block); caveat noted.
- **FCV Farul Constanța / FCSB / FC Rostov / Krasnodar / U Cluj / Spartak Moscow** — scout-level fallbacks marked explicitly as "Fallback only; no head/chief role found".
- **FK Csíkszereda** — Bokor as recruitment/football-ops fallback with "not a formal chief scout title" caveat.
- **SC Farense** — Hugo Freire flagged as "Operations Director fallback, not a sporting director".
- **Sporting CP** — both Bernardo Palmeiro (Head of Football) and Flávio Costa (Technical & Scouting Director) — Flávio Costa fills chief_scout column with dual-role note.

## Technical execution

Five `INSERT ... ON CONFLICT (club_id, market_table_key) DO UPDATE` statements (one per country), `summer-26` table key. Before writing, query `club_map_positions` filtered to each country to confirm club IDs and resolve any duplicates (canonical ID kept, alternates skipped with a single note in the report). Any club not present in `club_map_positions` will be reported back so you can decide whether to add it (no auto-creation of clubs).

No schema changes. No code changes. No effect on other countries.

## Out of scope

- Not creating new clubs in `club_map_positions`.
- Not adding any contact-phone schema column (phone goes in `notes`).
- Not auto-promoting "incoming" or "verify after date" roles past their date — just noted.
