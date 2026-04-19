
The toolbar is currently rendered inside the modal's inner padded area which causes it to overlap the video and feel cramped, while the dialog itself has empty space below.

Looking at the current `AnnotationEditor.tsx` layout: the dialog likely uses a flex column with the video taking the available space and the toolbar squeezed below transport controls inside the same constrained box. The empty space sits outside that inner container.

## Plan

**1. Restructure AnnotationEditor.tsx layout**
- Make the dialog content a true full-height flex column: header (top) → video stage (flex-1, min-h-0) → transport bar (auto) → toolbar panel (auto, expanded).
- Remove any max-height clamps on the toolbar; let it fill the natural empty zone below the video.
- Ensure the video stage uses `min-h-0` and `object-contain` so it never gets covered by the toolbar.

**2. Expand AnnotationToolbar.tsx to use the space**
- Switch the tool grid from a tight `flex-wrap` of small 14×14 buttons to a roomier responsive grid (e.g. `grid-cols-10` on wide, fewer on narrow) with larger 16-18 size buttons so labels and hotkeys breathe.
- Keep the colour palette + sliders on the right but give them their own column with comfortable padding.
- Keep usage-based ordering and hotkey badges as they are.

**3. Verify nothing else is hidden**
- Confirm the transport bar (scrubber, play, save) sits between video and toolbar with a thin divider so the user always sees it.
- Confirm the toolbar no longer overlays the video at any viewport.

That's it — no new tools, no behaviour changes, purely reclaiming the empty area below the player.
