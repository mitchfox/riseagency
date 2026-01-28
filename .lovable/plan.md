
# Performance Report Statistics Recording Enhancement

## Overview
This plan addresses three key requests for the Performance Report system:
1. Replace the "Smart Link to R90" button with a "Record Stat" feature for tracking statistics per action
2. Remove the 100MB video upload limit
3. Fix the video upload bug affecting multiple clips

---

## 1. Record Stat Button (Replacing Smart Link to R90)

### Current Behaviour
- The green LineChart button opens R90RatingsViewer to link actions to existing R90 scores
- Advanced Stats at the top (xG, xA, Regains, Interceptions) are entered manually

### New Behaviour
- Replace the green LineChart button with a "Record Stat" button (clipboard/tally icon)
- Clicking opens a popover/dropdown to select:
  - **Stat Type**: Dribble, Pass, Shot, Tackle, Aerial Duel, Cross, etc. (customisable list)
  - **Outcome**: Successful / Unsuccessful
- Selected stats are stored per action and auto-calculated at the top as `successful / attempted` (e.g., "Dribbles: 2/5")

### Implementation

**New Component**: `ActionStatRecorder.tsx`
- Popover with stat type selector (dropdown with common types + custom input)
- Success/Unsuccessful toggle
- Stores stat data in the action object

**Data Structure Changes**:
```typescript
interface PerformanceAction {
  // ... existing fields
  recorded_stat?: {
    stat_type: string;
    is_successful: boolean;
  };
}
```

**Auto-Calculation Logic**:
- Compute totals by grouping actions by `recorded_stat.stat_type`
- Display format: `{stat_type}: {successful} / {total}`

**Files to Modify**:
| File | Changes |
|------|---------|
| `src/components/staff/PerformanceActionsDialog.tsx` | Replace LineChart button with RecordStat, add aggregation display |
| `src/components/staff/CreatePerformanceReportDialog.tsx` | Same changes for the report creation dialog |
| New: `src/components/staff/ActionStatRecorder.tsx` | New component for stat recording popover |

**Database Consideration**:
- The `performance_report_actions` table already stores action data
- Adding `recorded_stat` to the existing action or as a JSONB field would allow storing the stat type and outcome

---

## 2. Remove 100MB Video Upload Limit

### Current Behaviour
- `ActionVideoUpload.tsx` lines 160-163 reject files over 100MB
- This limitation is client-side validation only

### Changes
- Remove the file size validation check entirely
- Keep the video type validation (must be video/*)

**File**: `src/components/staff/ActionVideoUpload.tsx`
- Remove lines 160-164 (the size check)

---

## 3. Fix Multiple Video Upload Bug

### Current Issue
After uploading one video clip, the upload button on other actions changes to something that does not work.

### Root Cause Analysis
The `ActionVideoUpload` component uses a shared `fileInputRef` pattern. When multiple instances exist:
- Each instance has its own ref and state
- However, the parent's `updateAction` callback may cause all action rows to re-render
- The `uploading` state or `currentVideoUrl` prop may incorrectly affect other instances

### Solution
1. **Isolate state per instance**: Ensure each `ActionVideoUpload` renders independently
2. **Use unique keys**: The map key should be the action's unique ID (not just index)
3. **Optimise callback**: Ensure `onVideoUploaded` only updates the specific action

**Files to Modify**:
| File | Changes |
|------|---------|
| `src/components/staff/CreatePerformanceReportDialog.tsx` | Use action.id as key, verify updateAction only targets specific action |
| `src/components/staff/ActionVideoUpload.tsx` | Add a unique key prop to file input ref pattern if needed |

---

## Summary of File Changes

| File | Action |
|------|--------|
| `src/components/staff/ActionVideoUpload.tsx` | Remove 100MB limit |
| `src/components/staff/ActionStatRecorder.tsx` | **NEW** - Stat recording popover component |
| `src/components/staff/PerformanceActionsDialog.tsx` | Replace R90 button with stat recorder, add aggregated stats display |
| `src/components/staff/CreatePerformanceReportDialog.tsx` | Same stat recorder changes, fix video upload key issue |

---

## Technical Details

### ActionStatRecorder Component Structure
```text
+---------------------------+
| Record Stat               |
+---------------------------+
| Stat Type: [Dropdown v]   |
|  - Dribble                |
|  - Pass                   |
|  - Shot                   |
|  - Tackle                 |
|  - Aerial Duel            |
|  - Cross                  |
|  - Custom...              |
+---------------------------+
| Outcome:                  |
|  [x] Successful           |
|  [ ] Unsuccessful         |
+---------------------------+
| [Save]                    |
+---------------------------+
```

### Aggregated Stats Display
At the top of the dialog, below "Advanced Stats":
```text
Action Stats Summary
--------------------
Dribbles: 2 / 5
Passes: 8 / 10
Shots: 1 / 2
Aerial Duels: 3 / 4
```

### Database Migration (Optional Enhancement)
If desired, add a dedicated column for recorded stats:
```sql
ALTER TABLE performance_report_actions 
ADD COLUMN recorded_stat JSONB;
```

Alternatively, store within the existing `notes` or create a new JSONB column in `player_analysis.striker_stats`.
