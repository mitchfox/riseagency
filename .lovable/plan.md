## Outreach strategies — Tyrese & Mikie

Insert one `club_outreach_strategies` row per (player × country × division). Each row uses the existing schema (`name`, `player_ids`, `filters {country, league_level, club_ids?}`, `defaults`). Strategy names follow `"<Player first name> — <Country> <Division>"`. For Belgium I'll add the divisional rows plus a separate `"Tyrese — Belgium (Targets)"` row with `club_ids` populated for RAAL, Zulte Waregem, Anderlecht, Lommel and Cercle Brugge (matched against `club_map_positions`; any not found are recorded in `defaults.notes`). UEFA competitions are stored as `country = "Champions League"`, `"Europa League"` and `"Conference League"` for both players. `defaults.notes` carries qualifiers like "low 2nd", "high 3rd", "?", and "Danish guy re Abi" on Mikie's Danish 1st row.

### Mikie (Michael Vit Mulligan) — rows to insert

```text
Malta 1st, Greece 2nd, Slovenia 1st, Czech 2nd, Sweden 2nd, Denmark 2nd,
Denmark 1st  (note: "Danish guy re Abi"),
Ireland 1st, Ireland 2nd, Scotland 2nd, Poland 2nd, Slovakia 2nd, Austria 2nd,
Portugal 2nd (note: "low 2nd"),
Spain 3rd   (note: "high 3rd"),
Italy 3rd, France 3rd, Luxembourg 1st (note: "Mondorf"),
Romania 1st, Hungary 2nd (note: "?"), Serbia 1st, Serbia 2nd, Croatia 2nd,
Moldova 1st, Switzerland 2nd, Georgia 1st, Bulgaria 1st (note: "?"), USA 2nd,
Champions League, Europa League, Conference League
```

### Tyrese (Tyrese Omotoye) — rows to insert

```text
Czech 1st, Poland 1st, Denmark 1st, Sweden 1st, Scotland 1st,
Belgium 1st, Belgium 2nd, Belgium (Targets: RAAL, Zulte Waregem, Anderlecht, Lommel, Cercle Brugge),
Slovakia 1st (note: "?"), Austria 1st, Portugal 1st, Portugal 2nd, Spain 2nd,
Italy 2nd, France 2nd, Germany 2nd, Turkey 1st, Turkey 2nd, Greece 1st,
Russia 1st, Ukraine 1st (note: "top"), Serbia 1st (note: "top"), Croatia 1st,
Romania 1st (note: "top"), Hungary 1st,
Champions League, Europa League, Conference League
```

### Steps

1. Look up both player UUIDs (Tyrese `b94fd8f6-…`, Mikie `00dd8ae4-…`) and reuse them.
2. Build all rows in one `supabase--insert` call using `INSERT … VALUES …` with `gen_random_uuid()`, `player_ids = ARRAY[...]::uuid[]`, and `filters` / `defaults` as JSON literals. Skip on duplicate name (`ON CONFLICT` not available — guard with a `NOT EXISTS` subquery on `(name, player_ids)`).
3. For the Belgium Targets row, resolve club ids from `club_map_positions` by name (case-insensitive `LIKE`) and embed any unresolved names in `defaults.notes`.
4. No code or schema changes — purely data inserts.

### Jolon's schedule

The schedule image was not attached this turn, so I'll wait for it and parse + insert into `staff_personal_schedule_items` for Jolon's user id in the next message.

### Out of scope this turn

UI tweaks, schema changes, anything related to the earlier translation/relationships work.
