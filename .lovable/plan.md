

# Staff Portal and Site-wide Improvements

## 1. Breadcrumb Navigation Bar
**Where:** Staff portal main content area, below the header  
**What:** Add a breadcrumb trail showing `Category > Section` so users always know where they are. Clicking the category name collapses back to category view. This replaces the generic card title with richer context.

## 2. Sidebar Transition Animations
**Where:** Staff sidebar section expansion  
**What:** Animate the section list when a category expands -- stagger each item sliding in from the left with a slight delay between each. Currently sections just pop in; staggered Framer Motion `variants` with `staggerChildren` would add a premium feel.

## 3. Keyboard Shortcuts Bar
**Where:** Staff portal footer or floating tooltip  
**What:** Add keyboard shortcuts beyond just Cmd+K search:
- Arrow keys to navigate between sections
- `Esc` to go back to overview
- Number keys `1-9` to jump to categories  

Display a small shortcut hint strip at the bottom of the sidebar.

## 4. Section Favourites / Pinning
**Where:** Sidebar and overview  
**What:** Let staff pin their most-used sections to the top of the sidebar as quick-access icons. Stored in localStorage per user. A small star icon on hover of each section button toggles the pin.

## 5. Toasts with Undo Actions
**Where:** Sitewide on destructive actions  
**What:** When deleting or hiding items (e.g. hiding a visitor IP, removing a player), show a toast with an "Undo" button that reverses the action within a 5-second window. Uses sonner's built-in action support.

## 6. Overview Widget Transitions
**Where:** StaffOverview dashboard  
**What:** Add entrance animations to widgets when they load -- a subtle scale-up and fade-in. When dragging widgets, add a gentle rotation tilt to the dragged item for tactile feedback.

## 7. Global Loading Skeleton Screens
**Where:** All data-heavy sections (Player Database, Recruitment, Analysis)  
**What:** Replace the basic loading spinners with skeleton shimmer placeholders that match the layout of the content being loaded. This feels faster and more polished than a centred spinner.

## 8. Contextual Quick Actions
**Where:** Player Database rows, Recruitment table rows  
**What:** Add a right-click context menu (or a "..." overflow menu) on table rows with common actions like "View Profile", "Send Message", "Add Note", "Copy Details". Uses Radix's existing ContextMenu component.

## 9. Collapsible Section Memory
**Where:** All accordion-style content within sections  
**What:** Persist which sub-tabs or accordions are expanded within each section to localStorage, so the view state is preserved across visits.

## 10. Public Site: Scroll Progress Indicator
**Where:** All public pages with long content (About, Players, etc.)  
**What:** A thin gold progress bar fixed to the top of the viewport that fills as the user scrolls down. Subtle but adds a layer of polish.

---

## Technical Details

### Breadcrumb (Staff.tsx)
Add a `Breadcrumb` component between the header and content card. Derive the label from the `expandedCategory` and `expandedSection` state. Render as:
```text
[Category Icon] Category Name  >  Section Name
```
The category portion is clickable and collapses the section back to category view.

### Sidebar Stagger Animation (Staff.tsx)
Wrap the expanded sections list in a `motion.div` with `variants`:
```text
container: { transition: { staggerChildren: 0.04 } }
item: { initial: { x: -10, opacity: 0 }, animate: { x: 0, opacity: 1 } }
```

### Section Pinning (Staff.tsx + localStorage)
- Store `pinnedSections: string[]` in localStorage keyed by userId
- Render pinned sections as small icon buttons above the category list in the sidebar
- Toggle pin via a star icon that appears on hover of any section button

### Skeleton Screens
Create a reusable `TableSkeleton` component with animated shimmer rows matching the table layout (avatar circle, text bars of varying width). Use Tailwind's `animate-pulse` on grey rectangles.

### Scroll Progress (public pages)
A fixed `div` at `top: 0` with `width` driven by `window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100`. Gold background, 2px height, z-50.

### Keyboard Shortcuts (Staff.tsx)
Extend the existing `useEffect` keyboard listener to handle additional keys. Show a `?` floating button that opens a shortcuts cheat sheet dialog.

