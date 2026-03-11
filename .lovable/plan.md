

## Two-Part Plan

This covers the immediate text truncation fix and the large AI features package.

---

### Part 1: Fix Truncated Notes (Quick Fix)

**Problem**: Notes on performance report actions are cut off with `...` via `truncate` and `line-clamp` classes, making them unreadable on mobile.

**Files to change:**

1. **`src/components/PerformanceReportDialog.tsx`**
   - Line 1036: Remove `line-clamp-2` from action description div, allow full text
   - Line 1038: Remove `truncate` from notes div, allow full wrap
   - These are in the mobile card layout (the `md:hidden` block)

2. **`src/components/ClippedActionsPlayer.tsx`**
   - Line 137: Remove `line-clamp-2` from description
   - Line 139: Remove `line-clamp-2` from notes

3. **`src/components/portal/AnalysisVideoReports.tsx`**
   - Line 414: Remove `line-clamp-2` from clip description

All replacements simply remove the truncation classes so text wraps naturally across as many lines as needed.

---

### Part 2: AI Features Package

This is a large feature set. Here is the implementation plan broken into phases.

#### 2A. Collapsible AI Shell Suggestions

**New components:**
- `src/components/staff/AiShellSuggestions.tsx` - collapsible tab component with player selector
- Sections: Athlete Centre, Analysis, Data, Player Management

**New database table:** `ai_shell_suggestions`
- `id`, `section` (enum), `player_id`, `shell_type`, `preview_text`, `shell_content` (JSONB), `created_at`

**New database table:** `ai_shell_decisions`
- `id`, `suggestion_id`, `player_id`, `staff_user_id`, `decision` (accepted/rejected), `created_at`

**New edge function:** `generate-shell-suggestions`
- Takes section + player context, queries recent data, calls Gemini to produce structural shells
- Returns preview lines for each shell

**Behaviour:**
- Collapsed tab at top of each section
- Opening requires player selection first
- Accept inserts as editable draft; Reject hides for session
- Decision history feeds future prioritisation

#### 2B. Player-Specific Action Dropdown Intelligence

**New database table:** `player_action_frequencies`
- `player_id`, `action_type`, `frequency_count`, `last_used_at`, `position_weight`

**Changes to existing components:**
- Performance report action type dropdown and video analysis action type dropdown
- Query last 5 reports for selected player, calculate frequency + recency weights
- Sort dropdown accordingly, persist per player

This builds on the existing frequency sorting (memory reference: action-type-frequency-sorting) but makes it player-specific rather than global.

#### 2C. Video Tracking Integration (Roboflow)

**New edge function:** `process-video-frames`
- Accepts frame images (base64) at configurable sampling rate
- Sends to Roboflow API for player/ball detection
- Applies pitch homography mapping to 18/162 zone grids
- Returns structured JSON per the specified format

**Requirements:**
- Roboflow API key (will need to be added as a secret)
- A trained Roboflow model endpoint for player/ball detection
- Configurable frame sampling rate (default 5 fps)

**Frontend integration:**
- New "AI Track" button in Video Analysis
- Frame extraction from video element at configured rate
- Batch upload to edge function
- Results displayed as overlay markers on video

#### 2D. Rule-Based Action Suggestion Engine

**New module:** `src/lib/actionSuggestionEngine.ts`
- Pure TypeScript, consumes Roboflow JSON output
- Possession approximation: ball overlapping player across consecutive frames
- Shot heuristic: ball near player then rapid displacement toward goal zone
- Duel heuristic: two player boxes close with possession change

**Database:**
- Suggested actions inserted into `performance_report_actions` with a new `status` field (values: `confirmed`, `suggested`)
- Requires migration to add `status` column

**UI:**
- Suggested actions shown with distinct styling and Confirm/Dismiss buttons
- Confirmed actions become regular report entries

#### 2E. Match Flow Automation

**Changes to fixture creation flow:**
- On fixture confirmation: auto-create linked draft performance report
- Auto-create pre-match analysis shell
- When report set to Live: prompt highlight compilation suggestion, check for duplicate clip exports

**Batch mode:**
- New "Batch Generate" button in Match Flow
- Select multiple players, shared fixture data populates draft shells for each

---

### Implementation Order

1. **Part 1** (notes fix) - immediate
2. **2B** (action dropdown intelligence) - builds on existing patterns
3. **2A** (shell suggestions) - new UI + edge function
4. **2E** (match flow automation) - workflow changes
5. **2C** (Roboflow) - requires API key setup
6. **2D** (suggestion engine) - depends on 2C output

### Prerequisites

- **Roboflow API key** will need to be provided and stored as a secret before 2C can function
- A trained Roboflow model for player/ball detection must exist

