## Goal

Keep the two status systems separate:

- `representation_status`: internal RISE relationship status. Used by Players, Player Management, Coaching Data, Match Data, Athlete Centre, public represented-player sections and anything focused on players RISE works with. Values include `represented`, `fuel_for_football`, `mandated`, `previously_mandated`, `prospect`, `scouted`, `other`.
- `agent_status`: external Transfermarkt/scouting agent signal. Used by Player Database, scouting/outreach and fit-score logic. Values include `represented`, `top_agency`, `unrepresented`, `family`, `unknown`.

## What I will change

### 1. Restore the internal status rule in data/player areas
Audit and correct only views that should be internal-player focused so they use `representation_status` and never `agent_status`:

- Player Management
- Coaching Data / Match Data / Comparisons
- Athlete Centre
- player sorting/grouping utilities
- public represented-player sections

This should make players with `representation_status = represented` show in Players, Data, Match Data etc again.

### 2. Keep Player Database and scouting on agent status
Leave Player Database/scouting filters based on `agent_status` for Transfermarkt representation analysis. Do not move those screens back to internal `representation_status` for agent representation.

### 3. Stop Transfermarkt refresh from touching internal representation status
Keep the Transfermarkt refresh limited to `agent_name`, `agent_status`, Transfermarkt links, image and factual scouting enrichment. It must not write `representation_status` at all.

### 4. Fix the incorrect case/value issue caused by earlier changes
Normalise the accidental title-case internal statuses that break grouping, without guessing player relationships:

- `Other` should be normalised to `other` where it is being used as an internal status.
- Do not convert players into `represented`, `mandated` or `fuel_for_football` unless they already have that internal value or you explicitly name them.

### 5. Add a narrow database guard
Add a guard so future automated processes cannot write scouting/agent labels into `representation_status` again. It will allow only the internal values and block values such as `Top Agency`, `Family`, `Unrepresented` and title-case `Represented`.

## What I will not do

- I will not change Player Database to use internal `representation_status` for agent representation.
- I will not use `agent_status` in Players, Match Data, Coaching Data or Player Management.
- I will not bulk-guess which `other` players should actually be `represented`, `mandated` or `fuel_for_football`.
- I will not touch unrelated UI or outreach analytics.

## Technical notes

- `src/components/staff/PlayerDatabase.tsx` already has `agent_status`-based resolution for agent representation, so that area should remain on the scouting model.
- `src/components/staff/CoachingDataSection.tsx` fetches and passes `representation_status`, so the likely issue is bad data values and any accidental status normalisation/filtering elsewhere, not a need to use `agent_status`.
- The database currently has many `Other` values and fewer canonical lowercase statuses. The fix will normalise `Other` to `other` so grouping utilities recognise it consistently.
