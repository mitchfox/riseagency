## What changes

### 1. Per-player defaults — what we save

Extend `club_outreach_player_defaults` so each player can carry defaults for everything that's currently set per outreach. New columns:

- `default_show_form` (bool)
- `default_show_in_numbers` (bool)
- `default_show_season_stats` (bool)
- `default_show_strengths` (bool)
- `default_section_order` (jsonb — array of section keys)

These join the existing per-player default columns: `default_selected_video_ids`, `default_season_id`, `default_season_data_mode`, `default_key_details`, `default_fit_recommendation`, `default_position`, `default_alternate_profile_link_ids`, `default_alternate_profiles_blurb`, `highlights_url`, `stars_url_override`, `proof_of_representation_path`.

### 2. Per-player defaults — settings UI

In the Club Outreach Settings dialog, the per-player block gains:

- "Show on proposal" toggles (Form / In Numbers / Season Stats / Strengths)
- "Default season to show" + "Season data display" (already partly there — keep)
- "Videos to include by default" — same picker as the outreach dialog, sourced from the player's Stars highlights
- "Default key details tiles" — same `KeyDetailsBuilder` used on the outreach
- "Default section order" — same `SectionOrderBuilder` used on the outreach

One "Save player defaults" button covers everything.

### 3. New outreach dialog — prefill + collapse

When a player is added to a new outreach (and it's the primary player), prefill from their defaults:

- show_form / show_in_numbers / show_season_stats / show_strengths
- selected_video_ids
- season_id / season_data_mode
- key_details (only if outreach doesn't already have custom ones)
- section_order

Existing outreaches don't get overwritten — defaults only fill in when the field is empty / at its initial state.

Then group the editor into collapsed sections (shadcn `Accordion`, all closed by default) so the dialog is short and you only open what you want to override. Groups:

1. Basics — club / agent target, players, language, prepared for, mandate
2. Show on proposal — the four toggles
3. Videos to include
4. Season data — mode + season selector
5. Key details tiles
6. Section order
7. Alternate Options (blurb + linked profiles)

Header strip stays visible; everything below collapses.

### 4. Out of scope

- No changes to the public proposal page rendering — same fields, just better defaults flowing in.
- Multi-player outreaches: defaults still pull from the primary (first) player only, same as today.

## Technical notes

- Migration: `ALTER TABLE public.club_outreach_player_defaults ADD COLUMN ...` for the five new columns. Table already has grants and policies — no new grants needed.
- `OutreachDialog` already loads the player defaults row in two places (lines ~750 and ~858 of `ClubOutreachManager.tsx`). Extend those two `select(...)` calls and apply the new defaults into local state when the primary player is set and the corresponding outreach field is still at its initial empty value.
- `saveDefaults` in `SettingsDialog` (~line 2147) gets the new columns added to its upsert.
- `KeyDetailsBuilder` and `SectionOrderBuilder` are already exported in the same file — reuse directly in the settings panel.
- Wrap the existing editor blocks in `Accordion` / `AccordionItem` / `AccordionTrigger` / `AccordionContent` from `@/components/ui/accordion`. Default `value=[]` so all sections start collapsed.
