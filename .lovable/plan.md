I’ll tighten the representation page performance and fix the directors headshot framing in one focused pass.

Plan:

1. Stop the obvious lag sources on the representation page
- Remove or replace `backdrop-blur` on animated/fixed representation page plates with solid/translucent dark surfaces and text-shadow where needed.
- Reduce the always-running smoke/blur workload on the age screen, especially the large blurred moving layers.
- Avoid keeping heavy animated effects running once the visitor has moved into the hub/detail screens.
- Keep the visual style dark, gold and cinematic, but make it cheaper to render.

2. Make the worked-with carousel less heavy
- Reduce the amount of eager image loading in `PlayersWeWorkWith` so the representation page is not trying to load and animate too many player images at once.
- Keep live real player data only, but make the marquee render and preload more gently.
- Keep the carousel appearance and behaviour, just reduce the browser strain.

3. Fix the directors headshots properly
- Keep the Canva-style diagonal frame containers so each director image is clipped inside its own black/white section.
- Reintroduce the missing bottom-half crop: the headshots will be shifted down inside their clipped frames so the lower half is cut off by the bottom of the section.
- Anchor each image to the bottom of its own section/frame, not floating over the whole card.
- Keep the desktop diagonal split and mobile stacked diagonal split.
- Preserve the copy blocks and marble backing behind text only.

4. Verify visually
- Check the representation page after changes to confirm scrolling/interactions feel smoother.
- Check the directors section so both headshots are visibly cropped from the bottom, sit inside their own diagonal frame and no longer look like loose overlays.