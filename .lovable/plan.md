

## Annotation Fixes: Persistence and Visibility

### Problem 1: Video and annotations disappear on new session

Annotation projects are currently stored entirely in `localStorage`. There is no database table backing them, so when a new browser session starts or localStorage is cleared, everything is gone. The video URL from cloud storage is fine, but the project metadata (name, klips, elements) vanishes.

### Problem 2: Previous annotations reappearing

When a new annotation triggers a playback freeze, the code currently adds ALL visible elements to the freeze display set, not just the newly triggered ones. This means an earlier annotation that is still technically "visible" at that moment gets shown again during the freeze, even though it has already been displayed.

---

### Fix 1: Database persistence for annotation projects

Create a new `annotation_projects` table in the database and update the save/load logic to use it instead of localStorage.

**Database table:**
- `id` (uuid, primary key)
- `name` (text)
- `video_url` (text)
- `video_name` (text)
- `klips` (jsonb) -- stores the full klips array including all elements
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `user_id` (uuid, references auth.users)

**RLS:** Authenticated users can read/write their own projects.

**Code changes in `AnnotationProjects.tsx`:**
- Replace `localStorage` read with a database query on mount
- Replace `saveProjects` localStorage write with database upsert
- Keep localStorage as a fast local cache but treat the database as the source of truth
- On project open, load from database (not localStorage)

**Code changes in `AnnotationEditor.tsx` (`handleSave`):**
- When saving, persist to the database table as well as calling `onSave`

### Fix 2: Previous annotation visibility during freeze

**In `AnnotationEditor.tsx`, Effect A (around line 228):**

Currently the code does:
```typescript
// Also include any other elements that are newly visible at this exact time
visibleElements.forEach(el => freezeIds.add(el.id));
```

This line adds ALL visible elements to the freeze set, which is the root cause. It should only include the newly triggered elements, not everything that happens to be visible.

**Fix:** Remove the line that adds all `visibleElements` to `freezeIds`. Only the `newVisible` elements (the ones that just appeared and haven't been triggered yet) should be in the freeze set.

---

### Technical summary

| File | Change |
|------|--------|
| Database migration | Create `annotation_projects` table with RLS |
| `AnnotationProjects.tsx` | Load/save projects from database instead of localStorage |
| `AnnotationEditor.tsx` | Fix freeze visibility: only show newly triggered elements, not all visible ones |

