# Plan: make Player Management show represented players first, reliably

## Actual issue
Player Management is still starting at **Mandate**, even though the database has 5 players with `representation_status = represented` and `category = Signed`:

- Jaroslav Svoboda
- Michael Vit Mulligan
- Phil Conteh
- Sandra Soares Martins
- Tyrese Omotoye

So this is no longer a data absence issue. It is a rendering/grouping issue inside Player Management.

## Fix
1. **Stop relying on custom category fetch timing for core groups**
   - Hard-code the canonical staff-management groups in this order:
     1. Signed → `representation_status = represented`
     2. Mandate → `representation_status = mandated`
     3. Fuel For Football → `representation_status = fuel_for_football`
     4. Previously Mandated → `representation_status = previously_mandated`
     5. Prospect → `representation_status = prospect`
     6. Other → `representation_status = other` or blank
     7. Scouted → `representation_status = scouted`
   - Custom categories can still appear after these, but cannot override or remove Signed.

2. **Group only from `representation_status` in Player Management**
   - Do not use `agent_status`.
   - Do not use `category` for the core staff player groups.
   - This matches your rule: Player Management/Data are internal player-workflow sections, not scouting sections.

3. **Force the Signed group to render whenever represented rows exist**
   - If `players.filter(p => representation_status === 'represented')` returns rows, render **Signed (5)** before Mandate.
   - Do not filter empty groups except after this canonical grouping has been built.

4. **Use the same canonical grouping for the left avatar rail and mobile dropdown**
   - The left vertical avatar rail and the main card groups will be based on one shared `visibleCategoryGroups` result, so they cannot disagree.

5. **Add temporary diagnostic output only if still needed**
   - If the UI still starts at Mandate after the deterministic grouping, add a hidden/dev-only console log showing the first five groups and counts from the client response.
   - Remove it once confirmed.

## Validation
- Confirm the first visible heading in `/staff?section=players` is **Signed (5)**.
- Confirm the first five player cards under it are the represented players listed above.
- Confirm Match Data/Data dropdowns still use `representation_status` ordering and are not affected by `agent_status`.

## Out of scope
- No Player Database changes.
- No `agent_status` changes.
- No database migration unless we discover the browser is genuinely receiving different row data from the database query.