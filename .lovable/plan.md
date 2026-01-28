
# Plan: Fix Unified Stats Editor with Predefined Stat List and Proper Type Handling

## Problem Summary

The current `UnifiedStatsEditor` component requires users to manually type stat names, which causes:

1. **No consistent stat naming** - Users could type "Dribbles", "dribble", "Dribbling" etc., breaking form chart matching
2. **Form charts won't work** - The `form_grade_configs` table expects specific `metric_key` values (e.g., `dribbles`, `turnovers`, `xg`) that must match exactly
3. **Missing dropdown** - No predefined list of stats to select from
4. **Stat type issues** - Turnovers showing as "0/1 (0% success)" when they should just be a count
5. **Missing ability to change stat type** - Cannot fix incorrectly categorized stats

## Solution Overview

Refactor the `UnifiedStatsEditor` to use the same predefined stat list (`STAT_TYPE_CONFIGS`) that already exists in `ActionStatRecorder.tsx`, ensuring consistent naming and proper type handling.

---

## Technical Implementation

### 1. Export STAT_TYPE_CONFIGS from ActionStatRecorder.tsx

Move the stat configuration to be exported so it can be shared:

```typescript
// In ActionStatRecorder.tsx
export interface StatTypeConfig {
  name: string;
  key: string;  // Add normalized key for database matching (e.g., "dribbles", "xg")
  mode: StatInputMode;
  description?: string;
}

export const STAT_TYPE_CONFIGS: StatTypeConfig[] = [
  // Success/Fail stats
  { name: 'Dribbles', key: 'dribbles', mode: 'success_fail' },
  { name: 'Passes', key: 'passes', mode: 'success_fail' },
  { name: 'Shots', key: 'shots', mode: 'success_fail' },
  { name: 'Tackles', key: 'tackles', mode: 'success_fail' },
  { name: 'Aerial Duels', key: 'aerial_duels', mode: 'success_fail' },
  { name: 'Crosses', key: 'crosses', mode: 'success_fail' },
  { name: 'Through Balls', key: 'through_balls', mode: 'success_fail' },
  { name: 'Long Passes', key: 'long_passes', mode: 'success_fail' },
  { name: 'Progressive Passes', key: 'progressive_passes', mode: 'success_fail' },
  { name: 'Key Passes', key: 'key_passes', mode: 'success_fail' },
  { name: 'Duels', key: 'duels', mode: 'success_fail' },
  // ... more stats
  
  // Count stats
  { name: 'Turnovers', key: 'turnovers', mode: 'count' },
  { name: 'Goals', key: 'goals', mode: 'count' },
  { name: 'Assists', key: 'assists', mode: 'count' },
  { name: 'Interceptions', key: 'interceptions', mode: 'count' },
  { name: 'Clearances', key: 'clearances', mode: 'count' },
  { name: 'Blocks', key: 'blocks', mode: 'count' },
  { name: 'Recoveries', key: 'recoveries', mode: 'count' },
  { name: 'Regains', key: 'regains', mode: 'count' },
  { name: 'Touches in Box', key: 'touches_in_box', mode: 'count' },
  { name: 'Fouls Won', key: 'fouls_won', mode: 'count' },
  { name: 'Fouls Committed', key: 'fouls_committed', mode: 'count' },
  { name: 'Progressive Carries', key: 'progressive_carries', mode: 'count' },
  { name: 'Carries into Box', key: 'carries_into_box', mode: 'count' },
  { name: 'Final Third Entries', key: 'final_third_entries', mode: 'count' },
  // ... more stats
  
  // Score stats
  { name: 'xG', key: 'xg', mode: 'score' },
  { name: 'xA', key: 'xa', mode: 'score' },
  { name: 'xGChain', key: 'xg_chain', mode: 'score' },
  { name: 'xC', key: 'xc', mode: 'score' },
  { name: 'npxG', key: 'npxg', mode: 'score' },
  // ... more stats
];
```

The keys will match `form_grade_configs.metric_key` values exactly.

### 2. Update UnifiedStatsEditor.tsx

Replace the text input for stat name with a dropdown selector:

**Key Changes:**

A. **Add stat dropdown in "Add Stat" dialog:**
```typescript
// Replace Input for stat name with Select dropdown
<Select value={selectedStatKey} onValueChange={handleStatKeyChange}>
  <SelectTrigger>
    <SelectValue placeholder="Select a stat" />
  </SelectTrigger>
  <SelectContent className="max-h-[300px]">
    <SelectItem value="header-success" disabled>-- Success/Fail Stats --</SelectItem>
    {STAT_TYPE_CONFIGS.filter(c => c.mode === 'success_fail').map((config) => (
      <SelectItem key={config.key} value={config.key}>{config.name}</SelectItem>
    ))}
    <SelectItem value="header-count" disabled>-- Count Stats --</SelectItem>
    {STAT_TYPE_CONFIGS.filter(c => c.mode === 'count').map((config) => (
      <SelectItem key={config.key} value={config.key}>{config.name}</SelectItem>
    ))}
    <SelectItem value="header-score" disabled>-- Score Stats --</SelectItem>
    {STAT_TYPE_CONFIGS.filter(c => c.mode === 'score').map((config) => (
      <SelectItem key={config.key} value={config.key}>{config.name}</SelectItem>
    ))}
    <SelectItem value="custom">Custom...</SelectItem>
  </SelectContent>
</Select>
```

B. **Auto-set stat type when selecting from dropdown:**
```typescript
const handleStatKeyChange = (key: string) => {
  setSelectedStatKey(key);
  const config = STAT_TYPE_CONFIGS.find(c => c.key === key);
  if (config) {
    setNewStatType(config.mode);
    setNewStatName(config.name);
  }
};
```

C. **Allow type override for existing stats:**
```typescript
// In edit mode, allow changing the stat type
<Select 
  value={newStatType} 
  onValueChange={(v) => setNewStatType(v as StatInputMode)}
>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="success_fail">Success/Fail (e.g. 2/5)</SelectItem>
    <SelectItem value="count">Count Only (e.g. 3)</SelectItem>
    <SelectItem value="score">Score Value (e.g. 0.45)</SelectItem>
  </SelectContent>
</Select>
```

D. **Filter already-added stats from dropdown:**
```typescript
const availableStatsToAdd = STAT_TYPE_CONFIGS.filter(
  config => !stats.some(s => s.key === config.key)
);
```

### 3. Update ActionStatRecorder to Use Same Config Keys

Ensure the stat recorder uses the same normalized keys so action-recorded stats merge correctly with manual stats.

### 4. Database Key Matching

The `key` field in `STAT_TYPE_CONFIGS` will match the `metric_key` in `form_grade_configs`:

| Stat Name | Config Key | form_grade_configs.metric_key |
|-----------|------------|-------------------------------|
| Dribbles | dribbles | dribbles |
| Turnovers | turnovers | turnovers |
| xG | xg | xg |
| Aerial Duels | aerial_duels | aerial_duels |

---

## Files to Modify

1. **src/components/staff/ActionStatRecorder.tsx**
   - Add `key` field to `StatTypeConfig` interface
   - Export `STAT_TYPE_CONFIGS` and `StatTypeConfig`
   - Update all stat entries with database-compatible keys
   - Align stat names with form_grade_configs entries

2. **src/components/staff/UnifiedStatsEditor.tsx**
   - Import `STAT_TYPE_CONFIGS` and `StatTypeConfig` from ActionStatRecorder
   - Replace text input with dropdown selector for stat selection
   - Auto-populate stat type based on selection
   - Allow type override for incorrectly categorized stats
   - Filter out already-added stats from dropdown
   - Use config `key` for database storage, `name` for display

3. **src/components/staff/CreatePerformanceReportDialog.tsx**
   - Update `mergeStatsForEditor` call to use new key-based matching
   - Ensure action-recorded stats use same keys

---

## Expected Outcome

After implementation:

1. Users select stats from a categorized dropdown (same list shown in action recorder)
2. Stat names and keys are consistent and match form chart configurations
3. Turnovers correctly show as count (e.g., "3") not success/fail
4. Users can override stat types if auto-detection was wrong
5. Form charts on player portal will match stats correctly using consistent `metric_key` values
6. Stats already added are hidden from the dropdown to prevent duplicates
