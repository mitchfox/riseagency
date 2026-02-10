

## Fixing Analysis Editor and Viewer Issues

### Issue 1: Text disappearing from points after saving (CRITICAL BUG)

**Root cause found:** In `AnalysisPointsSection.tsx`, the drag-and-drop `pointId` is generated using the point's title content:

```
const contentHash = `${p.title || ''}-${(p.video_urls?.[0] || p.video_url || '')}-${index}`;
return `point-${contentHash}`;
```

Every time you type a character in the title, the key changes, which causes React to **unmount and remount** the entire point card. This destroys focus, can lose in-progress text, and makes it nearly impossible to type. The paragraphs likely never got saved because the constant remounting disrupted input.

**Fix:** Replace the content-based ID with a stable identifier. Generate a random ID once when a point is added and store it on the point object (e.g. `_id`). Use that as the sortable key instead.

### Issue 2: Title input closing on each keystroke

**Same root cause as Issue 1.** The key/remount problem. Fixed by the same stable ID solution above.

### Issue 3: Sections auto-closing when scrolled off screen

**Root cause:** `ExpandableSection` in `AnalysisViewer.tsx` has a scroll listener (lines 253-264) that closes sections when they scroll out of view.

**Fix:** Remove the entire auto-close-on-scroll `useEffect` block from `ExpandableSection`. Sections will stay open until manually closed.

### Issue 4: Mobile text going tiny or not showing

**Root cause:** `TextReveal` uses `whileInView` with `initial={{ opacity: 0, y: 15 }}`. When a section is closed, the content sits inside an `overflow: hidden` container with `height: 0`. The IntersectionObserver never fires because the elements are invisible, so text stays at `opacity: 0` permanently - even after the section opens.

**Fix:** Replace `whileInView` animation with a simpler approach. Use `animate` directly so text always renders visibly. Alternatively, wrap with `viewport={{ once: true, amount: 0 }}` and remove the initial hidden state so content is always visible once the section opens.

---

### Technical Changes

**File: `src/components/staff/analysis/AnalysisPointsSection.tsx`**
- In `addPoint` (called from parent), add a stable `_id` field using `crypto.randomUUID()` to each new point
- Change `pointIds` generation to use `point._id || index` instead of content hash
- Handle existing points without `_id` by falling back to index-based IDs

**File: `src/components/staff/AnalysisManagement.tsx`**
- Update `addPoint` to include `_id: crypto.randomUUID()` on new points
- When loading existing points in `handleOpenDialog`, assign `_id` to any points that don't have one

**File: `src/pages/AnalysisViewer.tsx`**
- Remove the auto-close-on-scroll `useEffect` from `ExpandableSection` (lines 249-265)
- Replace `TextReveal` component: change from `whileInView` to a simple fade-in that triggers immediately, not dependent on intersection observer

