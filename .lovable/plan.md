

## Magnifier and Image Layer Fixes

### Problem 1: Magnifier - No Resize and No Zoom Content

**Root cause (resize):** The magnifier uses `radius` for its size, but it's not included in the resize handle logic. The resize code at line 995 only handles `circle`, `spotlight`, `player-marker`, and `semi-circle` -- magnifier is missing from that list.

**Root cause (no zoom content):** The magnifier uses a `foreignObject` with a nested `<video>` element to show zoomed content. The issue is that the inner video element is created via a ref callback that sets `currentTime`, but the video never actually loads/plays. The `<video>` element needs to have its data loaded before it can display a frame. Without waiting for the video to be ready, it shows nothing.

### Problem 2: Image Layer Not Staying on Top

**Root cause:** While `sortedElements` sorts image-layer to render last in the array, the SVG rendering order is correct. However, the issue is likely that the `foreignObject` video inside the image-layer isn't syncing properly with the main video, making it appear invisible or broken. Additionally, the sort only uses a simple 0/1 comparison which doesn't account for multiple image layers or their `layerZIndex` property.

---

### Changes (all in `AnnotationCanvas.tsx`)

**1. Magnifier resize support**
- Add `'magnifier'` to the radius-based resize condition at line 172 and the handle generation at line 995, so it gets the same corner/edge resize handles as circle and spotlight.

**2. Magnifier video rendering fix**
- Replace the current approach of creating a new `<video>` element (which never loads) with a **canvas-based snapshot**. When the magnifier renders, grab the current frame from the main video using `canvas.drawImage(video, ...)`, then use the canvas data as an `<image>` inside the SVG clip. This is reliable and doesn't depend on a second video loading.
- Alternatively, use `video.poster` or ensure the nested video fires `loadeddata` before displaying. The canvas approach is more robust.

**3. Image layer z-index fix**
- Separate the rendering: render all non-image-layer elements first, then render image-layer elements in a second pass, ensuring they are truly always on top in the SVG DOM order.
- Use the `layerZIndex` property to sort multiple image layers relative to each other.
- Ensure the inner video of image-layer elements properly syncs by also using a canvas snapshot approach or adding `preload="auto"` and waiting for load.

### Technical Details

```
Resize condition (line ~172):
  Add 'magnifier' to: el.type === 'circle' || el.type === 'spotlight' || ... || el.type === 'magnifier'

Handle generation (line ~995):
  Add 'magnifier' to the same condition

Magnifier rendering (lines ~740-810):
  Replace foreignObject+video with canvas-based frame capture:
  - On render, draw video.currentTime frame to an offscreen canvas
  - Crop and zoom the region around the magnifier centre
  - Use the canvas as a data URL for an SVG <image> element inside the clip path

Image layer rendering (lines ~855-910):
  - Split sortedElements into two arrays: regular + image-layers
  - Render regular elements first, then image-layers
  - Apply same canvas snapshot fix for reliable frame display
```

