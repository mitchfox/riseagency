

## Plan: Fix Grid Picker, Video Loading, Video Width, and Staff Navigation

### Issue 1: Grid Picker Shows Nothing on New Tab

**Root cause**: The `SectionGridPicker` renders correctly at line 1523, but when `expandedSection` is `__grid_picker__`, the content renders *inside* the `<main>` wrapper which also contains the `hidden`-class sections (lines 1556-1559). These `hidden` sections (VideoAnalysis, AnnotationProjects, PlayerManagement, AnalysisManagement) are always mounted and may be interfering with layout. However, the more likely issue is that the grid picker content is rendering but the `categories` array passed to it may contain sections with no valid non-group-label entries, or the component is rendering but scrolled out of view.

**Actual root cause found**: Looking more carefully, the grid picker IS inside the conditional branch at line 1523. But the `hidden` divs at lines 1556-1559 are *also* rendered inside the same `expandedSection ? (...)` branch at line 1531. When `expandedSection === '__grid_picker__'`, the code takes the first branch (line 1523) and renders `SectionGridPicker` -- so those hidden divs are NOT rendered. This means the grid picker should work. The issue is likely that preview images were requested but never added. The current grid only shows icons and text descriptions.

**Fix**: Add actual preview images/screenshots to each grid item. Since we don't have real screenshots, we'll generate visual preview cards using coloured gradients and icons as placeholder previews, making the grid visually rich. Each card will show a larger, more prominent visual representation of the section.

### Issue 2: Videos Not Loading (Waiting Minutes)

**Root cause**: The `LazyVideo` component uses `loadImmediately={pageLoaded}` where `pageLoaded` becomes `true` after 1.5s. BUT the videos are inside collapsed `ExpandableSection` components. When collapsed, the content is rendered with `height: 0` and `overflow: hidden`. The `IntersectionObserver` in `LazyVideo` cannot detect these as "in view" because they have zero height. When `loadImmediately` is `true`, it sets `isInView` to `true` in the initial state -- but `useState(loadImmediately)` only runs once on mount. If the component mounts before `pageLoaded` is `true`, it will stay `false` forever because the `useState` initial value doesn't update on re-renders.

This is the critical bug: `useState(loadImmediately)` captures the initial value only. When `pageLoaded` changes from `false` to `true` after 1.5s, already-mounted `LazyVideo` components won't update their `isInView` state.

**Fix**: Add a `useEffect` in `LazyVideo` that watches `loadImmediately` and sets `isInView(true)` when it becomes `true`. This ensures videos start loading 1.5s after page load regardless of visibility.

### Issue 3: Videos Not Filling Grey Background Width

**Root cause**: The video element has `style={{ width: '100%', height: 'auto' }}` but `.webm` clips extracted via `MediaRecorder` may not have proper dimension metadata. When a video element can't determine intrinsic dimensions, `height: auto` may not work correctly, causing the browser to use a default size. The video also has `display: block` which is correct.

The real issue is the `#t=0.001` fragment appended to the source URL. Some browsers treat this as a different resource and may have issues with dimension reporting. Additionally, some `.webm` files from `MediaRecorder` lack width/height metadata entirely.

**Fix**: 
- Remove the `#t=0.001` fragment (it was for showing a thumbnail frame but causes issues)
- Add `object-fit: contain` as fallback
- Set `width: 100%` directly on the video via both className and style to ensure it fills the `ContentCard` container
- Use `aspect-ratio` CSS as fallback when video dimensions aren't available

### Issue 4: Staff View/Edit Analysis Not Loading

**Root cause**: Likely a Lovable preview issue as the user suspects, but worth ensuring the navigation logic is robust. The `handleOpenDialog` in `AnalysisManagement` should use `setActiveView` immediately.

**Fix**: No code change needed if it's a preview issue, but we'll add a safety `setTimeout` fallback and ensure the state transitions are immediate.

---

### Technical Changes

**File: `src/components/LazyVideo.tsx`**
- Add `useEffect` watching `loadImmediately` prop to reactively set `isInView = true` when it changes
- Remove `#t=0.001` from source URL to fix dimension reporting issues

**File: `src/pages/AnalysisViewer.tsx`**
- Ensure video containers use `w-full` class on parent divs
- Remove `items-center` from any flex container wrapping videos (already done but verify)
- Videos already have `width: '100%'` style -- the `LazyVideo` fix above will make them actually load and render

**File: `src/components/staff/SectionGridPicker.tsx`**
- Add visual preview cards with coloured gradient backgrounds, larger icons, and descriptive text
- Make each card more visually prominent with a preview area showing a styled representation of the section
- Increase card size and add a visual preview zone above the label

**File: `src/pages/Staff.tsx`**  
- No changes needed for the grid picker logic (it works, the issue is visual content)

### Summary of Root Causes
1. Grid picker renders but has no preview images -- only small icons and hover text
2. `useState(loadImmediately)` only captures initial value; needs a `useEffect` to react to prop changes  
3. Video width issue is a consequence of videos not loading (issue 2) plus the `#t=0.001` fragment
4. Staff navigation is likely a preview environment issue

