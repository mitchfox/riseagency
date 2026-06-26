## Goal
When a quick template on Club Outreach is copied, automatically swap any hard-coded Rise link inside the template text with the specific outreach link of the card it is being copied from.

## Why
Templates today only substitute `{link}`/`{url}` placeholders. The user has typed real `risefootballagency.com/...` URLs into the template body, so every copied message goes out with the same generic link instead of the club's unique `/club-proposal/<short_id>` URL.

## Change
Single edit in `src/components/staff/ClubOutreachManager.tsx` to the `fillTemplate` call sites used by `OutreachCard` (the copy action at line ~701 and the tooltip preview at line ~776).

After the existing `{placeholder}` substitution, run a second pass that finds any absolute URL pointing at the Rise domains and replaces it with the card's `url`:

- Regex target: `https?://(www\.)?risefootballagency\.com/\S*` (also catch the lovable preview/published hosts: `riseagency.lovable.app`, `*.lovable.app`, and the localised subdomains like `es.|de.|cz.` etc. — match `https?://[^\s]*risefootballagency\.com\S*` plus `https?://[^\s]*lovable\.app\S*`).
- Replace every match in the template body with the card's own `url`.
- Skip replacement if the template already used `{link}` (because that's already been filled with the same `url`).
- Apply identically to the hover preview so the tooltip shows what will actually be copied.

Extract this into a tiny local helper (e.g. `applyOutreachLink(text, url)`) so both call sites stay in sync.

## Out of scope
- Quick-template editor UI (no copy changes, no new placeholders required — users can keep pasting full URLs).
- Agent outreach templates outside `OutreachCard`.
- Server-side template storage.

## Verification
- Edit a template to contain `Check it out: https://risefootballagency.com/club-proposal/old-link`.
- Click the template chip on two different outreach cards and confirm the clipboard contains each card's own `/club-proposal/<short_id>` URL.
- Hover the chip and confirm the tooltip preview matches what gets copied.