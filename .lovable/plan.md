## 1. Mobile vertical room for "Our Background" headshots

Both `RiseWithUs` (Our Background card on hub) and `RequestRepresentation.tsx` use the same split director card. On mobile only, increase the card's overall vertical height so the cutout heads have more breathing room without changing the desktop layout:

- Bump the mobile card min-height (currently effectively driven by `h-[58%]` halves on a tight aspect ratio) so the diagonal halves can grow by ~80–120px.
- Increase the mobile top/bottom half heights from `h-[58%]` to a taller share, and lift the headshot `h-[88%]` images so the head sits clearly inside its half rather than crowding the diagonal seam.
- Apply the exact same change in both files so the mobile Our Background section matches across Rise With Us and Representation.

## 2. "& family" line for under-18 invitations (RiseWithUs only)

In `src/pages/RiseWithUs.tsx` the phase 0 intro renders:

```
An invitation to
NAME
```

When `settings.rise_with_us_under18` is true, render an additional line directly under the name, styled identically to the "An invitation to" eyebrow (same `font-bebas text-base sm:text-lg uppercase tracking-[0.3em] text-primary`):

```
& family
```

Add a new translation key `and_family` to the `offerDict` block (lines ~82–130) covering all 12 supported languages (en, es, pt, fr, de, it, pl, cs, ru, tr, hr, no), e.g. en "& family", es "y familia", pt "e família", fr "et famille", de "& Familie", it "e famiglia", pl "i rodzina", cs "a rodina", ru "и семья", tr "ve aile", hr "i obitelj", no "og familie". Render via `offerT(lang, "and_family", "& family")`.

## 3. Focal point actually applies to the intro images

The focal point set in `PlayerOfferCustomiser` is saved as `objectPosition: "x% y%"` per intro media item, but in `RiseWithUs.tsx` the `extraIntro` array prepends `player.image_url` and `finalFallbackImage` (lines 1957–1966) without any `objectPosition`. Those priority items get cycled first, so when staff set a focal point on an intro image, what shows on screen is still the un-cropped player/fallback image with the default `50% 35%`.

Fix:

- When building `priorityIntroImages`, attach the matching `objectPosition` from `settings.intro_media` if a row with the same `url` exists, so the player headshot honours the focal point chosen for it.
- For player/fallback images not present in `intro_media`, fall back to `50% 50%` (true centre) instead of the current `50% 35%` so portrait shots aren't always cropped low.
- Make sure the `objectPosition` is the source of truth: pass it through the `motion.img`/`motion.video` style and stop letting the `mobileStyle` default override it (line 1634 already passes it, but confirm the merged style in `renderMedia` uses the per-image value rather than `mobileStyle`'s fallback).

This way the focal point selected in the staff customiser visibly recenters the image on the live Rise With Us page.

## 4. Shared scouting translations on Representation page

`RequestRepresentation.tsx` is missing the localised "scouting" copy that Rise With Us uses (e.g. `stood_out_line`, `differentiate_line`, `rwu_private_footer`, scouting hub strings). Wire the representation page to read the same translation keys from `offerDict`/`playerOfferT` so the equivalent paragraphs render in the player's `portal_language` instead of hard-coded English. Specifically:

- Reuse `offerT(lang, "stood_out_line", ...)` and `offerT(lang, "differentiate_line", ...)` wherever the representation page repeats those scouting paragraphs.
- Ensure section labels that exist in both pages (Our Background subtitle, Meet our Directors, Vision, Network coverage, calendar day/month names) read from the shared dictionary so the representation page matches the Rise With Us localisation.

## 5. Out of scope

No changes to staff portal, database schema, or non-presentation logic. Only the two public pages and the shared translation dictionary entry for `and_family`.
