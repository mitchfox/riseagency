# Plan: Update Italian clubs in Market Tables

I will upsert rows into `market_table_entries` (keyed on `club_id` + `market_table_key='summer-26'`) for the 47 Italian clubs you listed, using exactly the names/titles you supplied. The DB only has two name columns (`technical_director_name`, `chief_scout_name`) plus a `notes` field, so I will encode richer info there.

## Mapping rules

- `technical_director_name` → first/primary sporting or technical director name with their title appended in plain text (e.g. `Piero Ausilio — Sporting Director`).
- `chief_scout_name` → head of scouting / recruitment lead, same title format.
- Secondary names (e.g. Südtirol's Hannes Fink, Modena's Daniele Placido, Sampdoria's Lorenzo Ariaudo, Avellino's Giovanni D'Agostino) → appended to `notes`.
- Uncertainty / "verify after date" / "reported but unofficial" caveats from your source column → into `notes` verbatim (UK English, no em-dash overuse).
- Where you flagged "No safe current fill" / "Not found" → leave that column blank (do NOT overwrite with stale prefill).
- AC Milan: clear out the stale `Antonio D'Ottavio AC Milan SD` prefill (set technical_director_name to NULL), keep Lomonte as chief scout, add note about the May 2026 Tare/Moncada departures and Almstadt being reported only.
- Sassuolo: replace outdated Giovanni Rossi with Francesco Palmieri / Davide Cangini.
- LR Vicenza: replace outdated Luca Matteassi with Giorgio Zamuner.
- Perugia: clear stale Jacopo Giugliarelli (now Dolomiti Bellunesi); set Riccardo Gaucci as note-only consultant since no safe DS.
- Flag rows (Gubbio, Carpi, Cosenza, Foggia, Catania, Mantova, Cremonese) with the conflicting-source / verify-after-date caveat in `notes`.

## Clubs covered (47)

Serie B: AC Milan (cleanup), Inter Milan, Sassuolo, Ascoli, Benevento, Padova, Carrarese, Cesena, Empoli (blank), Südtirol, Hellas Verona, LR Vicenza, Mantova, Modena, Palermo, Pisa, Arezzo, Juve Stabia, Sampdoria, Avellino, Catanzaro, Cremonese, Virtus Entella.

Serie C / others: AC Bra (blank w/ note), AC Carpi, AC Perugia, AC Renate, AC Trento, Alcione Milano, Arzignano, AS Cittadella, AS Giana Erminio, AS Gubbio, ASD Team Altamura, Atalanta U23, Audace Cerignola, Aurora Pro Patria, AZ Picerno (blank), Calcio Foggia, Calcio Lecco, Campobasso, Casarano, Casertana, Catania (blank + reported note), Cavese, Cosenza, CPR Ospitaletto, Dolomiti Bellunesi, FC Crotone (blank), FC Lumezzane.

## Technical execution

Single `INSERT … ON CONFLICT (club_id, market_table_key) DO UPDATE` using `summer-26` as the table key (matches the existing AC Milan row). All 47 clubs already exist in `club_map_positions` — confirmed.

No schema changes. No code changes. No effect on other countries' rows.

## Out of scope

- Not adding new clubs (none missing).
- Not touching youth-scouting names you excluded.
- Not auto-creating future rows for clubs flagged "verify after date" — those just get a note.
