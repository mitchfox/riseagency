## Bulk upsert: Ukraine, Conference/Champions/Europa League, Germany, Croatia + country cleanups

Same approach as previous batches: upsert into `market_table_entries` keyed on `(club_id, market_table_key='summer-26')`. Plus housekeeping on country labels in `club_map_positions`.

## Mapping rules (unchanged from earlier batches)

- `technical_director_name` → primary sporting/technical/football-ops contact, title appended (e.g. `Volodymyr Bezsonov — Sporting Director`).
- `chief_scout_name` → head of scouting / recruitment lead with title.
- Contact phones/emails (Dynamo Kyiv +38 044 278 06 28 / scout@fcdynamo.com, Alashkert info@fcalashkert.com, Ballkani nderim.nexhipi@fcballkani.com, Brann per-ove.ludvigsen@brann.no, Bravo dejan.mocnik@nk-bravo.si / +386 41 352 327, Flora Tallinn taavi@fcflora.ee, GAIS magnus.skoldmark@gais.se, Getafe stecnico@getafecf.com, Hegelmann sportsdirector@fchegelmann.com / +370 699 53166, LASK scouting@lask.at, Mjällby arvid.franzen@maif.se, Heidenheim baamann@fc-heidenheim.de, Slaven Belupo robert.kerovec@nk-slaven-belupo.hr / +385 48 220 033 / +385 91 220 0343) → appended into `notes`.
- Dual / secondary names (Metalist 1925: Rogachevskyi as Technical Director alongside Shamardin; Bohemians: Boubín as technický ředitel alongside Držmíšek; Bayern: Kresse as Chief Scout alongside Schmadtke; Crvena zvezda: Marin as Technical Director alongside Mrkela; Dinamo Zagreb CL row: Dabac + Vlak; FC Atert Bissen: Thalamot + Holbach; Como: Bruccoleri + Torrance; Hajduk: Žaja + Boada; CSKA Sofia: Velichkov + Aleksandrov; LASK: Burić + Grubeck; Sheriff: Pascenco + Kuchuk; HNK Rijeka: Raić-Sudar + Čulina) → second name into `notes`.
- Caveats (Bezsonov not on official page; Karpaty Rusol is GM fallback; Kryvbas Pavlov possibly broader ops; LNZ Chaban via Transfermarkt only; Metalist Polunin deceased Nov 2025; Rukh Fedyk excluded; Celtic Tisdale + LeFevre departed; AEK Larnaca Roca resigned Mar 2026; Ajax de Lang left Dec 2025; Brighton Jewell to Chelsea; CFR Cluj Mara excluded; Gent Vidarsson left Sep 2025; Hearts Lancefield left Jun 2026; Levski Kostadinov future-effective 1 Jul 2026; Győri Van Praet appointed 24 Jun 2026; Osijek Zandvliet announced 29 May 2026 / effective 1 Jul 2026; Inter D'Ottavio excluded as Milan; Milan Tare departed; Fenerbahçe Özek parted Apr 2026; AZ Huiberts contract ending 30 Jun 2026; Bournemouth Francis departed; Crystal Palace Wrigglesworth unconfirmed; Trabzonspor Mert excluded; Twente Bruggink left May 2025; Vojvodina sports director vacant; U Cluj Mara excluded; Borussia M'gladbach old/superseded roles; HSV Costa current; Elversberg Blacha left; Lokomotiva Zagreb FM-style data caveat; Gorica Šelendić includes academy; Hajduk Žaja + Boada both noted; Cibalia Bojko resigned Jun 2026; Jarun Nujić resigned Jun 2026; PAOK Savvidis old chief-scout role excluded; Karlovac no sporting director role; Aluminij Arlič via LinkedIn) → into `notes` verbatim, UK English.
- "Not found" → leave that column blank; if DB row has stale prefill flagged as departed/superseded → null and write exclusion reason in `notes`.

## Special handling

- **Galatasaray** — Utkucan fills both columns (already in DB from Turkey batch; this re-asserts).
- **Beşiktaş** — Graf fills both columns (already in DB; re-asserts).
- **Bayer Leverkusen** — Rolfes primary; Falkenberg noted in both technical (secondary) and scouting (covers scouting/squad planning).
- **Feyenoord** — Rigaux primary (effective 1 Jun 2026); Goes as scouting fallback.
- **Dynamo Kyiv** — appears in both Ukraine and Europa League rows; single upsert per `(club_id, summer-26)` — second occurrence is idempotent.
- **Getafe** — already handled in Spain batch with same Muñoz + technical-secretariat inbox; re-asserts.
- **GNK Dinamo Zagreb** — Champions League row (Dabac + Vlak) and Croatia row (Dabac primary, Šokota fallback scout, Jozak exclusion) merged into one upsert with combined notes.
- **Hajduk** — CL and Croatia rows merged (Graf + Žaja/Boada).
- **Karlsruher SC / Dynamo Dresden / Greuther Fürth / Darmstadt / Bochum / Osnabrück / Wolfsburg / Sandhausen / Mainz / Augsburg / M'gladbach / HSV / Elversberg** — citation noise in source ignored; clean names + titles extracted.
- **Country cleanups in `club_map_positions`**:
  - Merge any `country` variants `USA`, `U.S.A.`, `United States of America` → `United States` (canonical).
  - Reassign Urawa Red Diamonds row from `Urawa` to `Japan`.
  - Merge `Czechia` → `Czech Republic`.
  - Merge `UAE` → `United Arab Emirates`.

## Technical execution

1. Query `club_map_positions` filtered to each country (Ukraine, Cyprus, Armenia, Kazakhstan, Italy, Andorra, Latvia, Austria, Kosovo, Belarus, Israel, Czech Republic, Portugal, Norway, Slovenia, England, Wales, Romania, N. Ireland, Denmark, Bulgaria, Slovakia, Hungary, Montenegro, Luxembourg, Albania, Georgia, Gibraltar, Estonia, Germany, Sweden, Belgium, Spain, Poland, France, Finland, Faroe Islands, Switzerland, Croatia, Bosnia, Serbia, Turkey, Greece, Malta, San Marino, Iceland, Northern Macedonia, Moldova, Ireland, Azerbaijan, Lithuania, Scotland, Netherlands) to confirm club IDs and resolve duplicates.
2. Build one `INSERT … ON CONFLICT (club_id, market_table_key) DO UPDATE` per country (or one combined) via `supabase--insert`.
3. Run 4 `UPDATE`s on `club_map_positions` for the country-label merges.
4. Report any clubs from the lists that have no matching `club_map_positions` row (no auto-creation).

No schema changes. No code changes. No effect on other market_table_keys.

## Out of scope

- Not creating new clubs in `club_map_positions`.
- Not adding contact-phone/email schema columns (contacts stay in `notes`).
- Not auto-promoting future-effective roles past their start date — just noted.
