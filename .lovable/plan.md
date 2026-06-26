## Plan

1. **Tighten “empty shell” detection**
   - Treat SPS sessions and programmes as empty if they only contain titles or blank exercise arrays.
   - Treat an item as rich only when it has meaningful nested data such as exercise descriptions, reps, sets, load, recovery, video, notes, drills or variations.

2. **Hydrate existing shells safely**
   - Update existing empty SPS shells with the harvested full data instead of skipping them.
   - Preserve all existing rich/manual Coaching DB records.
   - Only fill missing fields on partial records, not overwrite fields that already contain real data.

3. **Improve programme/session payloads**
   - For SPS programmes, save importable sessions with their full exercise rows.
   - For Technical programmes, keep the separate Technical structure with sessions, drills, diagrams and variations.
   - Keep SPS, Technical and Nutrition categories separate.

4. **Make the import result clearer**
   - Change the toast wording so it reports inserted and hydrated records rather than saying “no new to add” when shell records were checked.
   - If there really is nothing to insert or hydrate, show that all matching records already have usable data.

5. **Verify against current data**
   - Re-run the shell checks after implementation.
   - Confirm the known issue is covered: current database has SPS weak shells, especially programmes and sessions, while Technical shells appear clean.

## Technical notes

- Main file: `src/components/staff/programming/BulkImportSpsToCoachingDB.tsx`.
- No schema change needed.
- No deletes.
- No bulk overwrite of existing rich Coaching DB content.
- Current data check found: `1` SPS exercise shell, `13` weak SPS sessions and `33` weak SPS programmes, so the next import should hydrate these instead of reporting nothing to add.