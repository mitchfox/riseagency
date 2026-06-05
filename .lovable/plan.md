# Representation Offers + AI Fit Score + Template Matching

## Goals
1. Turn an outreach prospect into a representation-offer link in **one click** — and also create the link from the Representation Offers page itself.
2. Make Representation Offers easy to navigate: collapsible status groups + search.
3. Add an **AI Fit Score (0–100)** that ranks every player/outreach row against our recruitment targets, with admin-controlled weights.
4. Tag message templates to recruitment targets so the right script (with a one-click copy) appears next to the right player.

---

## 1. One-click offer creation

### From a Player Outreach card
Add an **"Create offer link"** button on every pipeline / table row.

What happens behind the scenes:
- If the outreach row already has a matching `players` record (lookup by case-insensitive name), reuse it.
- Otherwise insert a minimal `players` row from the outreach fields: `name`, `position`, `age` / `date_of_birth`, `nationality`, `club`. Status defaults to `prospect`.
- Set `has_representation_offer = true`.
- Generate the slug, copy `/risewithus/<slug>` to clipboard, toast confirms with "View" + "Open WhatsApp" options.
- Log an `outreach_interactions` row (`kind: message_out`, channel chosen by the user in a tiny dropdown, summary `Offer link sent`) so the response tracker auto-updates `last_contact_at` and `messaged = true`.

### From the Representation Offers page
Add a **"+ Create offer"** primary button at the top that opens a compact dialog:
- Search existing players (live) → flip `has_representation_offer = true` and copy link.
- Or "Add new prospect" → tiny inline form (name, position, age, nationality, club) → creates the `players` row + flips the flag + copies link.

### From the Prospect Board
Already supports opening the link — add a "Copy" sibling for parity.

## 2. Smarter Representation Offers UI

Replace the flat grid with **collapsible status groups** (default-open: "Needs follow-up"; collapsed: "Signed", "Declined"):

- Needs follow-up (offer sent ≥ 7 days ago, no response logged)
- Offer sent — awaiting reply
- Viewed (we can fire a visit hit from the public page into `representation_visitors`)
- In conversation
- Signed
- Declined / paused

Each group header shows a count and a chevron. Sticky search bar above filters across all groups; matching a search auto-expands its group. Add quick filters: position, nationality, target (chip row).

Card additions: last-contact relative time, AI fit-score badge, the assigned target name, and the matched message template (with a copy icon — see §4).

## 3. AI Fit Score (0–100)

### Where it shows
- A Rise-gold circular badge on each card in: Player Outreach (pipeline + table), Representation Offers, Prospect Board, Player Database list.
- Hover/tap → tooltip lists the top 3 reasons that drove the score ("+25 position match: CB", "+18 age sweet spot", "−10 club rating below target", etc.).

### How it's calculated
Hybrid: deterministic component for explainability + an AI nudge for the soft signals.

**Deterministic core (0–80)** — pure formula, runs client-side instantly:
- Position match vs active targets (0–20)
- Age fit (0–15, peaks at target midpoint)
- Nationality fit (0–10)
- Club country fit (0–5)
- Club rating fit (R1 highest, 0–15)
- Outreach signal (0–15): response received, parent approval, recent interaction recency

**AI nudge (0–20)** — runs on-demand or in batch via a Supabase Edge Function calling Lovable AI (`google/gemini-3-flash-preview`):
- Inputs: player bio/notes, scouting notes, recent stats summary, message thread summary.
- Output: `{ ai_bonus: 0–20, reasons: [short bullet, …] }` via the AI SDK `Output.object` API.
- Cached on the player row; re-runs only when underlying data changes or admin clicks "Recompute".

### Settings (admin-only sub-page)
New section: **Recruitment → Scoring Settings**

- Sliders for each component weight (must sum to 100; auto-normalised).
- Target match thresholds: how strict position/age/nationality must be before they count.
- Toggle to enable/disable the AI nudge globally.
- "Recompute all" button (queues a batch job).

Stored in a new table `recruitment_scoring_settings` (single row, admin-editable). Score breakdowns stored per player so we can show "why" without recomputing.

### Recruitment Targets
The existing `recruitment_targets` table already holds the criteria — that's the source of truth. We'll also add a **default_template_id** column to each target (§4) and surface a quick way to set/edit targets from the Scoring Settings page so weights and targets sit side-by-side.

## 4. Template tagging + one-click copy

### Schema additions
- `whatsapp_quick_messages`: add `target_id` (nullable FK to `recruitment_targets`), `position_tags text[]`, `scope text` ('youth'|'pro'|'both').
- `email_templates`: same additions.
- `recruitment_targets`: add `default_whatsapp_template_id`, `default_email_template_id`.

### Matching logic
When rendering an outreach / offer card:
1. Find the best matching target for the player (highest fit score above a threshold).
2. Use that target's default template; if none, fall back to the template whose `target_id` matches; then `position_tags` overlap; then `scope` match.
3. Render the template preview with merge fields filled in (`{name}`, `{position}`, `{club}`, `{age}`, `{offer_link}`).
4. **Copy** button next to the preview puts the resolved text on the clipboard. Optional **WhatsApp** button opens `https://wa.me/?text=…` pre-filled when a phone/parent contact is available.

### Templates UI
Extend the existing Quick Messages / Email Templates editors with:
- Target dropdown (multi-select of recruitment targets)
- Position chips
- Scope toggle (Youth / Pro / Both)
- "Used by N targets as default" badge

---

## Technical sketch

```text
recruitment_targets ───┐
                       ├─ default_whatsapp_template_id ─ whatsapp_quick_messages
                       └─ default_email_template_id    ─ email_templates
recruitment_scoring_settings (single row, admin) ─┐
players / player_outreach_* rows ─────────────────┴─ fit_score (0-100) + breakdown JSON
```

Migrations (one batch):
1. ALTER `whatsapp_quick_messages` and `email_templates`: add `target_id`, `position_tags`, `scope`.
2. ALTER `recruitment_targets`: add `default_whatsapp_template_id`, `default_email_template_id`.
3. CREATE `recruitment_scoring_settings` (single row enforced via unique constraint on a fixed key).
4. ALTER `players`, `player_outreach_youth`, `player_outreach_pro`: add `fit_score int`, `fit_score_breakdown jsonb`, `fit_score_updated_at timestamptz`.
5. Edge function `compute-fit-score` (Lovable AI, `google/gemini-3-flash-preview`) — called per-player or batched.

Frontend:
- `src/lib/fitScore.ts` — pure deterministic scorer (shared by every list view).
- `useFitScore` hook — reads cached score, falls back to deterministic core if not yet computed.
- `FitScoreBadge` component (Rise-gold ring, click → breakdown popover).
- `src/components/staff/recruitment/CreateOfferButton.tsx` — promote-to-offer flow (reused by outreach + offers page).
- `src/components/staff/recruitment/TemplatePickerInline.tsx` — auto-matches template, shows preview + copy.
- Refactor `RepresentationOffers.tsx`: add collapsible groups, search, filters, fit badge, template picker, "+ Create offer" dialog.
- New `src/components/staff/recruitment/ScoringSettings.tsx` mounted under Recruitment.

## Rollout
1. Migrations + edge function scaffolding.
2. Deterministic fit score + badge live across all surfaces.
3. Create-offer flow from outreach + offers page.
4. Representation Offers collapsible groups + search + filters.
5. Template tagging + inline copy.
6. AI nudge component of the score (optional toggle on by default).
7. Scoring Settings admin page.

## Out of scope
- Auto-sending the message via WhatsApp / IG APIs (we copy, you paste).
- Tracking opens of the offer link beyond what `representation_visitors` already records.
