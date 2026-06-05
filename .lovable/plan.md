# Recruitment & Player Outreach — Major Upgrade Plan

## Goals
1. Filter outreach by **strategic targets** (who we actually want to sign).
2. Never let a **responder** go cold — surface and chase replies relentlessly.
3. Move outreach from a flat list into a **pipeline** with stages, owners and next-action dates.

## Quick-fix housekeeping (shipped now)
- "Coming soon" copy removed from Financial Reports and Staff PWA install panels.
- Note: 700+ `console.log` and 300+ hardcoded colour-class sweeps remain queued — these are mechanical and best run in a dedicated cleanup pass so they don't bury the recruitment changes in a giant diff.

---

## 1. Target Lists ("who we want")

New table `recruitment_targets` capturing the agency's strategic intake plan:

- `name`, `scope` (`youth` | `pro` | `both`)
- `positions text[]` (e.g. CB, CF) — uses our standard abbreviations
- `min_age` / `max_age`
- `nationalities text[]`, `countries_of_club text[]`
- `min_club_rating` (R1–R5), `max_club_rating`
- `priority` (1–5), `active` boolean, `notes`
- `owner_user_id` (who's driving this target)

UI: a "Targets" tab inside Player Outreach. Each target is a saved filter you can:
- One-click apply to either outreach table.
- See a live count of "matches not yet contacted" vs "matches contacted" vs "matches responded".

Filtering logic: a player row matches a target if **all** non-null criteria match. Players inherit target tags so a single outreach row can belong to multiple targets.

## 2. Response-driven follow-up

Today `response_received` is just a boolean — invisible the moment you scroll past it. Replace with a structured **response tracker**:

Add to `player_outreach_youth` / `player_outreach_pro`:
- `response_status` enum: `none`, `replied`, `interested`, `not_interested`, `signed`, `lost`
- `first_response_at timestamptz`
- `last_contact_at timestamptz`
- `next_followup_at date` (defaults to last_contact_at + 7 days when a reply lands)
- `assigned_to uuid` (staff member chasing)

New table `outreach_interactions` (one row per touch — message sent, reply received, call, meeting):
- `outreach_id`, `outreach_type` ('youth'|'pro'), `kind` ('message_out'|'reply_in'|'call'|'meeting'|'note'), `channel` ('instagram'|'whatsapp'|'email'|'phone'|'in_person'), `summary`, `occurred_at`, `created_by`.

This gives us a true contact history per player and unblocks the follow-up board below.

## 3. Pipeline view (replaces the flat table as the default)

Kanban-style board with columns:
1. **Targets — not contacted** (matches a target, zero interactions)
2. **Contacted — awaiting reply**
3. **Replied — needs follow-up** ⬅ the most important column
4. **In conversation**
5. **Decision pending** (parent approval for youth / club permission for pro)
6. **Won / Signed**
7. **Lost / Cold**

Cards show: photo, name, age, position, club + rating badge, last contact (relative time), next follow-up due, owner avatar. Drag between columns updates `response_status` + writes an interaction row.

Existing table view stays as an alternate density toggle for power users.

## 4. "Needs follow-up today" dashboard widget

On the staff home / My Tasks:
- Count and list of outreach rows where `response_status = 'replied'` AND (`next_followup_at <= today` OR `last_contact_at < now() - 3 days`).
- Same widget for "Targets with zero outreach this week" so cold target lists get worked.
- Both link straight into the pipeline pre-filtered.

## 5. Reminders & nudges

- Daily 08:00 staff notification (existing `staff_notification_events` pipeline): "X players replied and are awaiting your follow-up", "Y target slots not contacted this week".
- Per-row "Snooze" → sets `next_followup_at` (today+1/3/7/custom).
- Overdue rows get a subtle Rise Gold border in the pipeline.

## 6. Smaller polish bundled in

- Saved column-presets per user on the outreach table.
- Bulk actions: assign owner, set next-followup, tag with target.
- CSV export filtered to current view.
- IG handle click already opens Instagram — add WhatsApp deep-link from `parent_contact` / phone.
- Surface `recruitment_age_rules` inline: if a youth player's country has `min_contact_age` and they're below it, show a clear "not yet contactable — eligible {date}" badge instead of just colour.

---

## Technical sketch

```text
recruitment_targets ──┐
                      ├── (matched at query time) ── player_outreach_youth / _pro
outreach_interactions ┘            │
                                   └── pipeline view (groups by response_status)
                                   └── follow-up widget (filters by next_followup_at)
```

Migrations (single batch, fully GRANT-ed + RLS for staff/admin):
1. `recruitment_targets` table
2. ALTER outreach tables to add `response_status`, `first_response_at`, `last_contact_at`, `next_followup_at`, `assigned_to`
3. `outreach_interactions` table
4. Backfill: any row with `response_received = true` → `response_status = 'replied'`, `first_response_at = updated_at`

Frontend:
- Replace `PlayerOutreach.tsx` tab layout with `Pipeline | Table | Targets` sub-tabs.
- New components: `OutreachPipelineBoard`, `OutreachTargetsManager`, `OutreachFollowupWidget`, `OutreachInteractionDrawer`.
- Reuse existing `PlayerOutreachPanel` table as the Table sub-tab (minimal changes).

## Rollout
1. Migrations + backfill.
2. Pipeline board + interaction drawer (read/write to new fields).
3. Targets manager + filter binding.
4. Follow-up widget + daily notification.
5. Bulk actions, CSV export, age-rule badge polish.

## Out of scope (call out, don't build)
- Auto-scraping replies from IG/WhatsApp — needs platform integrations we haven't set up.
- AI suggested follow-up message drafts — separate spike once the pipeline is live so we have real reply text to learn from.
