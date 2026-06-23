## Problem

Right now Jolon's and Kuda's headshots float as free-standing images over a diagonally-split black/white background. The diagonal divider is just a gold line laid on top, so the images obviously break across the seam — heads, shoulders and fade gradients spill into the wrong half. It reads as "two pictures with a stripe over them" instead of a single composed split.

## Approach — diagonal photo frames

Treat each half of the card as a **frame** (like a Canva image placeholder shaped to a polygon). Each headshot is rendered inside its own frame, and the frame's `clip-path` does the cropping along the exact same diagonal that splits the background. Whatever pixels of the headshot cross the seam are physically cut off by the frame, so the diagonal stays razor-sharp and the image visibly belongs to its side.

### Desktop layout

```text
┌─────────────────────────┬─────────────────────────┐
│                       ╲ │ ╲                       │
│   BLACK HALF (Jolon)   ╲│  ╲   WHITE HALF (Kuda)  │
│   ── frame clipped ──   ╲   ╲  ── frame clipped ──│
│   to polygon            │╲   ╲                    │
│   (0,0)→(58,0)→         │ ╲   ╲                   │
│   (42,100)→(0,100)      │  ╲   ╲                  │
│                         │   ╲   ╲                 │
└─────────────────────────┴─────────────────────────┘
                          ↑ same diagonal seam, gold line sits on it
```

Both the background half AND the corresponding headshot share the **same `clipPath` polygon**, so the image is naturally framed by the diagonal shape rather than overlapping it.

### What changes in `src/pages/RequestRepresentation.tsx` (Directors block, ~lines 1530–1685)

1. Introduce two frame containers (`<div>` per director) positioned absolutely over the card, each given:
   - The same diagonal `clipPath` polygon as its background half (left frame uses `polygon(0% 0%, 58% 0%, 42% 100%, 0% 100%)`; right frame uses `polygon(58% 0%, 100% 0%, 100% 100%, 42% 100%)`).
   - `overflow: hidden`.
2. Render each headshot **inside** its frame, anchored bottom, sized so the head sits high. Because the frame is clipped to the diagonal, the half of the photo that used to spill into the other side is now physically cut off along the seam — no more "image floating on top" look.
3. Keep the existing bottom-half crop (head & shoulders only) via the current `transform: translateY(50%)` + soft top-fade mask so the crown still melts into the marble instead of ending in a hard line.
4. Mobile: same idea but with horizontal seam polygons (top frame for Jolon, bottom frame for Kuda).
5. Keep the gold diagonal `<line>` exactly on the seam — now it reads as the literal edge of two photo frames meeting, not a stripe drawn on top.
6. Keep the marble-textured copy plates (Jolon top-left, Kuda top-right) untouched — they sit above the frames at `z-[3]` as today.
7. No changes to the text, translations, role labels or any other section.

### Why this fixes it

The headshot's outer boundary becomes the diagonal itself, so by construction the image cannot cross the seam. The two sides look like two photos mounted into a single diagonal frame — the Canva-style composition you described — instead of two cut-outs floating over a divider.

### Files touched

- `src/pages/RequestRepresentation.tsx` — Directors block only.

No new assets, no translation changes, no other sections affected.
