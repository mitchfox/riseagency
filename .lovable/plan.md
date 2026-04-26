I checked the current page at tablet and desktop sizes. The main problems are clear: the Scouting card is auto-opening straight into the chosen position so the network intro and map are skipped, the desktop/tablet detail view is being covered by the fixed slider/CTA area, the Back to all pill is left aligned, and the intro still has routes/steps using horizontal x movement that can make text appear from the side.

Plan:

1. Centre the Back to all control
   - Change the fixed slider panel so the Back to all pill sits centred above the section wheel.
   - Keep it in the slider area, not back at the top of sections.

2. Fix Scouting order so the map and network explanation always come first
   - Remove the current auto-open behaviour that jumps directly into the position breakdown when Scouting is opened.
   - Scouting will open to:
     1. Eyes Across All Of Europe / Scouting Network intro
     2. The exact same `ScoutingNetworkMap` component used on the Players page
     3. The same three Players page explanation cards: Deep European Network, Future-Focused Scouting, Complete Player Knowledge
     4. Then the position-specific breakdown buttons
   - If the user picked CF/GK/etc earlier, highlight or prioritise that matching position in the breakdown area, but do not skip the map.

3. Make the position-specific scouting details visible and usable
   - Keep each position detail screen, but make it easier to reach after the scouting map.
   - Add a clear selected/recommended position cue, for example “Recommended for your position: Centre Forward / Striker”.
   - Keep the Physical, Mental, Technical and Tactical attribute cards from `POSITION_SKILLS`.

4. Fix desktop and tablet fit without damaging mobile
   - For tablet and desktop, reduce the oversized title plate height and title text in position detail screens.
   - Convert the position detail layout into a better desktop/tablet grid that fits above the fixed slider/CTA area.
   - Increase bottom padding on detail pages so content is not hidden behind the slider and CTA buttons.
   - Adjust the fixed footer panel width and layout on desktop so it does not sit awkwardly over the content.
   - Preserve the current mobile-first layout and only apply these changes from tablet/desktop breakpoints upwards.

5. Stop intro text coming from the side
   - Remove horizontal `x` entrance animations from the Representation route intro and page-step text areas.
   - Force intro video text to render from a fixed centred slot using only opacity, scale or vertical y movement.
   - Remove letter-spacing animation from the “Representation” home rectangle heading so it does not visually expand from the side.
   - Keep the cinematic sequence centred at all times.

6. Verify the actual views
   - Check `/request-representation` in mobile, tablet and desktop sizes.
   - Specifically verify:
     - Intro text appears only centred
     - tablet and desktop no longer look cramped or covered
     - Scouting opens with network/map first
     - position breakdown appears after the map
     - Back to all is centred above the slider