Same approach as the Italy/Portugal/Romania/Russia/Scotland/Serbia batches: upsert rows into `market_table_entries` keyed on `(club_id, market_table_key='summer-26')` for every club listed across Slovakia (~29), Slovenia (~11), Spain (~52), Sweden (~36), Switzerland (~10), Turkey (~38), and USA (~25).

## Mapping rules (unchanged)

- `technical_director_name` → primary sporting/technical/football-ops contact, title appended (e.g. `Martin Škrtel — Sporting Director`).
- `chief_scout_name` → head of scouting / recruitment lead with title.
- Contact phones/emails (e.g. Žáčik +421 911 565 327 / andrej.zacik@astrencin.sk, Bielák lukas.bielak@gmail.com, Wennberg peter.wennberg@aikfotboll.se, Sanches +41 78 246 32 34, Castillo ncastillo@rowdiessoccer.com, role inbox recruitment@nycfc.com, scout@hif.se, scouting@fcaarau.ch) → appended into `notes` since no contact-phone/email column.
- Secondary names (Slovan Bratislava's Švehlík alongside Vittek; NK Celje's Podkoritnik + Gobec alongside Golubin; NK Maribor's Başgül alongside Zahović; NK Olimpija's Vrhunc alongside Aygün; AIK's Miika Takkula alongside Sadi; Racing Ferrol's Rivas + Fontenla; Atlético Sanluqueño's Martín Bejarano; Hércules' Sánchez alongside Peña; Real Avilés' Cruz alongside Linares; Pendikspor's Demir/Eskiköy dual) → second name into `notes`.
- Caveats (parent-club fallback for B-teams MŠK Žilina B / Slovan Bratislava B / RC Celta Fortuna / Real Sociedad B / Atlético Madrileño / Betis Deportivo / Bilbao Athletic / CA Osasuna Promesas, youth-only exclusions for KFC Komárno / Zemplín Michalovce / FC Petržalka / Železiarne Podbrezová / Dynamo Malženice / ÖIS / Varbergs scouting@ / Amed SK U17, future-effective entries Yverdon's Falbo 01.09.2026 + Pendikspor's 01.07.2026, "incoming/replacing" caveats for Real Oviedo's David Fernández vs Roberto Suárez, NK Bravo's Močnik departing, NK Domžale's Rosanda taking over from Oražem, departed-staff exclusions Sivasspor/Adana Demirspor/Hatayspor/Trabzonspor/Gençlerbirliği/Hammarby's Berglund/Trelleborgs/IK Oddevold/Stade Nyonnais, conflict notes for FC Winterthur Rey LinkedIn vs official, Neuchâtel Xamax Fontbonne currentness, MFK Skalica Opiela currentness, Burgos via Transfermarkt only, Çorum/Sarıyer/Van Spor via social snippets, Beşiktaş Graf dual sporting+scouting role, Galatasaray Utkucan dual title, Birmingham Legion Ruiz dual role, Loudoun Marcina title-change explanation, San Antonio FC Lizardo exclusion as facilities) → into `notes` verbatim, UK English.
- "Not found" → leave that column blank; if the DB row already has a stale prefill flagged as departed/superseded → null that column and write the exclusion reason in `notes`.

## Special handling

- **Slovan Bratislava** — Vittek fills both columns (Sporting Director + Head of International Relations & Scouting); Švehlík noted as Director of Football.
- **AIK** — Sadi in chief scout column; Miika Takkula (Head of Recruitment) noted as alternative.
- **NK Olimpija Ljubljana** — Aygün primary, Vrhunc as Technical Director noted with email, Bracović as Chief Scout.
- **Étoile Carouge** — Sanches fills both columns (Directeur sportif + Responsable Recrutement).
- **Beşiktaş** — Graf fills both columns (Football Technical & Scouting Director).
- **Galatasaray** — Utkucan fills both columns (Football & Scouting Director / Chief Scout & Head of Performance Analysis).
- **Birmingham Legion** — Ruiz fills both columns with note about role expansion from Director of Scouting → Technical Director.
- **Loudoun United** — Marcina fills only sporting column; note clarifies Director of Scouting title was replaced.
- **NYCFC** — Dunivant in technical column; `recruitment@nycfc.com` inbox noted, academy Head of Scouting excluded.
- **Hartford / Rhode Island** — Head Coach & GM dual roles in technical column with caveat.
- **B-teams** (MŠK Žilina B, Slovan Bratislava B) — parent-club structure with explicit "parent-club; no B-specific role found" caveat.
- **Yverdon, Pendikspor** — future-effective appointments captured with start-date caveat in notes; primary column left blank or marked accordingly.
- **NK Bravo / NK Domžale / Real Oviedo / Sivasspor / Trelleborgs / IK Oddevold / Stade Nyonnais** — incumbent leaving / vacancy / pending replacement clearly stated in notes.
- **Spain B-teams** — Atlético Madrileño / Betis Deportivo / Bilbao Athletic / Real Sociedad B / RC Celta Fortuna handled with parent-club caveat; Real Sociedad B / CA Osasuna Promesas left blank where parent role does not clearly cover B-team.
- **Getafe** — left blank, with Ángel Martín González + Rubén Reyes exclusion reasons in notes.
- **Trabzonspor / Alanyaspor / Çaykur Rizespor / Kasımpaşa / Esenler Eroksporu / Serik Spor / Ümraniyespor** — both columns blank, scouting-department-only or coaching-only sources noted.

## Technical execution

Seven `INSERT ... ON CONFLICT (club_id, market_table_key) DO UPDATE` statements (one per country), `summer-26` table key. Before writing, query `club_map_positions` filtered to each country to confirm club IDs and resolve duplicates (canonical ID kept, alternates skipped with a single note in the report). Any club not present in `club_map_positions` will be reported back so you can decide whether to add it (no auto-creation of clubs).

No schema changes. No code changes. No effect on other countries.

## Out of scope

- Not creating new clubs in `club_map_positions`.
- Not adding any contact-phone/email schema column (contacts go in `notes`).
- Not auto-promoting "incoming" / future-start-date / "verify after" roles past their effective date — just noted.
