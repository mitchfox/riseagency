## Problem
The Staff PWA is restoring the last visited route on launch. When Anthony opens a club proposal inside the installed PWA, `/club-proposal/...` gets saved as the last PWA route, so the app keeps returning to that proposal instead of `/staff` or the public homepage. The footer homepage link then appears to reload because it is fighting the same PWA route persistence and service-worker navigation handling.

## Plan
1. **Stop proposal pages being saved as Staff PWA state**
   - Update the PWA route persistence guard so public routes such as `/club-proposal/...` and `/clubs/...` are never stored as the Staff PWA’s last route.
   - If a saved last route is already a proposal route, clear it and send the Staff PWA back to `/staff` on launch.

2. **Make proposal launch from Staff leave the Staff PWA**
   - Update the Staff Club Outreach “open link” action to use the existing external-link helper instead of relying on a same-origin `window.open`, which iOS can keep inside the installed PWA.
   - Keep copying links unchanged.

3. **Make the proposal footer logo navigate cleanly to the public homepage**
   - Replace the current popup-style homepage handling with a deterministic same-window navigation to `/` on `https://risefootballagency.com`.
   - Clear any stale PWA last-route value before navigating so it cannot bounce back to the proposal.

4. **Tighten service-worker navigation for Staff scope**
   - Adjust the existing service worker’s navigation fallback so `/staff` uses the staff shell, while public routes such as `/` and `/club-proposal/...` use the main site shell.
   - Do not add new offline/PWA behaviour, just fix the current stuck-route behaviour.