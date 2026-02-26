

## Problem Diagnosis

The "Comparisons" section at the bottom of the Hub page uses completely different data from the "Comparisons" tab on the Analysis page. This is why the numbers are wildly wrong.

**Hub (QuickStatsComparison)**: Reads from `striker_stats` column (a JSONB field containing calculated/imported data), averages the last 5 matches, and compares against benchmark players.

**Analysis > Comparisons (AnalysisComparisons)**: Reads from `fixture_stats` column (a separate JSONB field containing manually entered match data), and compares against the same benchmark players.

These are two entirely different data sources stored on the same `player_analysis` rows. So when the Hub says "xG /90 = 0.36" it could be pulling from `striker_stats.xG_adj_per90`, while the Analysis tab shows a completely different number from `fixture_stats.npxg_per90`. For most recent analyses, `striker_stats` fields are mostly null, making the averages unreliable.

### Plan

**Unify the data source** so the Hub's QuickStatsComparison uses the same logic as the Analysis Comparisons tab:

1. **Refactor QuickStatsComparison** to accept `analyses` as a prop (already available from Hub) instead of fetching its own data separately
2. **Switch data source** from `striker_stats` to `fixture_stats` (matching how AnalysisComparisons works), with a fallback to `striker_stats` for fields only available there
3. **Use the same metric keys** as `ALL_METRICS` from `ComparisonPlayerData.tsx` so the stat names and keys match perfectly between Hub and Analysis Comparisons
4. **Remove the separate DB fetch** inside QuickStatsComparison since the data is already loaded

### Files to change

- `src/components/dashboard/QuickStatsComparison.tsx` - refactor to accept `analyses` prop, switch from `striker_stats` to `fixture_stats`/`striker_stats` unified lookup (matching `AnalysisDataTab.getStatValue` pattern), update `COMPARABLE_STATS` keys to use `ALL_METRICS`
- `src/components/dashboard/Hub.tsx` - pass `analyses` prop through to `QuickStatsComparison`

### Technical detail

The fix aligns the data lookup with `AnalysisDataTab.getStatValue`:
```typescript
const getStatValue = (analysis, key) => {
  if (analysis.fixture_stats?.[key] != null) return Number(analysis.fixture_stats[key]);
  if (analysis.striker_stats?.[key] != null) return Number(analysis.striker_stats[key]);
  return null;
};
```

The `COMPARABLE_STATS` array will be rebuilt to reference keys from `ALL_METRICS` (the same metric definitions used by Comparisons and Data tabs). The benchmark comparison will continue using `comparison_players.metrics` (which is the only fetch still needed).

