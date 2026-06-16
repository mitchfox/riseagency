## Goal

Give you full control over what appears on a club proposal page (and in what order), and let you mark a proposal as a formal mandate from the player.

## What changes for you

In the staff Club Outreach editor, each link gets three new controls:

1. **Key Details builder** — pick which tiles appear in the four-up grid above the video. Add, remove, reorder, and mix from:
   - Built-in tiles: Club, Age, Nationality, League, Position, Contract Expiry, Current Salary (auto-pulled from the player record)
   - Link-only tiles (typed per proposal): Salary Expectations, Transfer Fee, Contract Expiry override, Height, Preferred Foot, plus a "Custom" tile with your own label + value
   - The grid auto-flows so 3, 5, 6+ tiles all look clean (2-col mobile, 3- or 4-col desktop)
2. **Mandated proposal toggle** — when on, the proposal page shows a "Mandated Representation" badge near the agent contact, and the agent CTA copy switches to "{firstName}'s Mandated Agent". An info line under the badge explains the agent is formally instructed to negotiate on the player's behalf.
3. **Section order** — drag-reorder list for everything below the hero video: Fit & Recommendation, Video & Data / Proof cards, Form, In Numbers, Season Stats, Strengths. Hidden sections (existing show_* toggles) stay hidden; order applies only to visible ones.

Defaults match today's behaviour, so existing links keep rendering exactly as they do now until you edit them.

## Technical details

**Migration** — add three columns to `club_outreach_links`:
- `is_mandated boolean not null default false`
- `key_details jsonb` — ordered array of items, e.g.
  ```json
  [
    {"kind":"club"},
    {"kind":"age"},
    {"kind":"nationality"},
    {"kind":"league"},
    {"kind":"contract_expiry"},
    {"kind":"salary_expectations","value":"€1.2M/yr"},
    {"kind":"custom","label":"Buyout","value":"€8M"}
  ]
  ```
  `null` means "use the four legacy defaults".
- `section_order jsonb` — ordered array of section keys (`fit`, `cards`, `form`, `in_numbers`, `season_stats`, `strengths`); `null` means default order.

**Edge function `get-club-proposal`** (the one feeding `ClubOutreachProposal.tsx`):
- Return `link.is_mandated`, `link.key_details`, `link.section_order`.
- For player-sourced key-detail kinds (`contract_expiry`, `current_salary`, `position`), include `contract_end_date`, `current_salary_annual`, `position`, `preferred_currency` for each player so the page can format locally.

**Staff editor (`src/components/staff/ClubOutreachManager.tsx`)**:
- New "Key Details" panel: list of selected items with up/down + remove buttons, "Add tile" dropdown sourced from the preset kinds, value/label inputs for the typed kinds, and a Reset to Defaults button.
- New "Mandated" switch beside the existing visibility toggles.
- New "Section Order" panel: dnd-kit sortable list (the project already uses dnd-kit, see `src/components/staff/RowDropZone.tsx`).
- Persist new fields in the existing upsert payload (lines ~720 and ~736).

**Proposal page (`src/pages/ClubOutreachProposal.tsx`)**:
- Extend `Payload.link` typing with the three new fields plus the new per-player contract/salary/position fields.
- `KeyDetailsCard` rewritten to render from `link.key_details ?? DEFAULT_KEY_DETAILS`. New tile renderers: contract expiry (formatted `MMM yyyy`), salary (formatted with `preferred_currency`), position pill, height, foot, custom. Grid uses `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` with `auto-rows-fr` so any count looks balanced.
- Replace the hard-coded ordering of post-video sections with a single map keyed by section id, then render in `link.section_order ?? DEFAULT_SECTION_ORDER`, still respecting the existing `show_*` toggles.
- Mandated state: render a small gold "Mandated Representation" pill above the agent WhatsApp CTA and swap the eyebrow text. Translations added via the existing `tr()` helper (`mandated.badge`, `mandated.subtitle`, `contact.waAgentMandated`).

**Out of scope**
- No changes to the agent-target view beyond honouring the same section order.
- No changes to translations beyond adding the three new keys (existing auto-translate pipeline picks them up).

## Verification

- Existing proposal links render unchanged (defaults preserved).
- New link with custom key details + reordered sections matches the editor preview on `/staff` and on the public proposal URL.
- Mandated toggle visibly changes the agent CTA and shows the badge.