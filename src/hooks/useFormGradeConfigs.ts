import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

interface GradeThreshold {
  grade: string;
  min: number | null;
  max: number | null;
}

interface FormGradeConfig {
  id: string;
  metric_key: string;
  metric_name: string;
  description: string | null;
  thresholds: GradeThreshold[];
}

// Grade color mapping following the standard color system
const GRADE_COLORS: Record<string, string> = {
  'U': 'hsl(0, 84%, 30%)',
  'D': 'hsl(0, 84%, 45%)',
  'C-': 'hsl(0, 84%, 60%)',
  'C': 'hsl(25, 75%, 45%)',
  'C+': 'hsl(40, 85%, 50%)',
  'B-': 'hsl(60, 70%, 50%)',
  'B': 'hsl(142, 76%, 36%)',
  'B+': 'hsl(142, 70%, 40%)',
  'A-': 'hsl(142, 65%, 45%)',
  'A': 'hsl(142, 70%, 50%)',
  'A+': 'hsl(142, 76%, 55%)',
  'A*': 'hsl(43, 96%, 56%)',
};

export function useFormGradeConfigs() {
  const [configs, setConfigs] = useState<FormGradeConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfigs = async () => {
      const { data, error } = await supabase
        .from('form_grade_configs')
        .select('*')
        .order('metric_name');

      if (!error && data) {
        const parsedConfigs: FormGradeConfig[] = data.map(item => ({
          ...item,
          thresholds: (item.thresholds as unknown as GradeThreshold[]) || []
        }));
        setConfigs(parsedConfigs);
      }
      setLoading(false);
    };

    fetchConfigs();
  }, []);

  // Create a lookup map by metric_key for quick access
  const configMap = useMemo(() => {
    const map: Record<string, FormGradeConfig> = {};
    configs.forEach(config => {
      map[config.metric_key] = config;
    });
    return map;
  }, [configs]);

  /**
   * Get grade boundaries for a specific metric key, formatted for chart reference lines
   * Returns an array of { value, grade, color } objects
   */
  const getGradeBoundaries = (metricKey: string): { value: number; grade: string; color: string }[] => {
    const config = configMap[metricKey];
    if (!config || !config.thresholds || config.thresholds.length === 0) {
      return [];
    }

    // Convert thresholds to grade boundaries
    // The boundary line should be at the min value of each threshold (where the grade starts)
    const boundaries: { value: number; grade: string; color: string }[] = [];
    
    config.thresholds.forEach(threshold => {
      // Use min as the boundary line position (where this grade starts)
      if (threshold.min !== null) {
        boundaries.push({
          value: threshold.min,
          grade: threshold.grade,
          color: GRADE_COLORS[threshold.grade] || 'hsl(var(--muted-foreground))'
        });
      }
    });

    // Sort by value ascending
    return boundaries.sort((a, b) => a.value - b.value);
  };

  /**
   * Get the grade and color for a specific score and metric
   */
  const getGradeForScore = (metricKey: string, score: number | null | undefined): { grade: string; color: string } => {
    if (score === null || score === undefined) {
      return { grade: '-', color: 'hsl(var(--muted-foreground))' };
    }

    const config = configMap[metricKey];
    if (!config || !config.thresholds || config.thresholds.length === 0) {
      return { grade: '-', color: 'hsl(var(--muted-foreground))' };
    }

    // Find the matching threshold
    for (const threshold of config.thresholds) {
      const minMatch = threshold.min === null || score >= threshold.min;
      const maxMatch = threshold.max === null || score < threshold.max;
      
      if (minMatch && maxMatch) {
        return {
          grade: threshold.grade,
          color: GRADE_COLORS[threshold.grade] || 'hsl(var(--muted-foreground))'
        };
      }
    }

    // No match found
    return { grade: '-', color: 'hsl(var(--muted-foreground))' };
  };

  /**
   * Check if a metric has thresholds configured
   */
  const hasThresholds = (metricKey: string): boolean => {
    const config = configMap[metricKey];
    return !!(config && config.thresholds && config.thresholds.length > 0);
  };

  return {
    configs,
    loading,
    configMap,
    getGradeBoundaries,
    getGradeForScore,
    hasThresholds,
  };
}

// Mapping from Dashboard selectedFormMetric values to database metric_keys
// Also handles case-insensitive lookups for saved striker_stats keys
export const METRIC_KEY_MAP: Record<string, string> = {
  // Core scores
  'r90': 'r90',
  'xg': 'xg',
  'xa': 'xa',
  'xgchain': 'xg_chain',
  'xgbuildup': 'xg_buildup',
  'xgot': 'xgot',
  'xgpershot': 'xg_per_shot',
  'npxg': 'npxg',
  'xc': 'xc',
  
  // Adjusted stats (zone-weighted)
  'xg_adj': 'xg',
  'xa_adj': 'xa',
  'xgadj': 'xg',
  'xaadj': 'xa',
  'regains_adj': 'regains',
  'regainsadj': 'regains',
  'turnovers_adj': 'turnovers',
  'turnoversadj': 'turnovers',
  'progressive_passes_adj': 'progressive_passes',
  'progressivepassesadj': 'progressive_passes',
  
  // Passing
  'progressivepasses': 'progressive_passes',
  'progressivepassesreceived': 'progressive_passes_received',
  'keypasses': 'key_passes',
  'longpasses': 'long_passes',
  'longpassescompleted': 'long_passes_completed',
  'throughballs': 'through_balls',
  'passcompletion': 'pass_completion',
  
  // Attacking
  'shots': 'shots',
  'shotsontarget': 'shots_on_target',
  'dribbles': 'dribbles',
  'dribblescompleted': 'dribbles_completed',
  'dribblesattempted': 'dribbles_attempted',
  'dribbleattempts': 'dribbles_attempted',
  'successfuldribbles': 'dribbles_completed',
  'crosses': 'crosses',
  'crossescompleted': 'crosses_completed',
  'accuratecrosses': 'accurate_crosses',
  'accuratelongballs': 'accurate_long_balls',
  'accuratepasses': 'accurate_passes',
  'forwardpasses': 'forward_passes',
  'passesinopphalf': 'passes_in_opp_half',
  'passesintofinalthird': 'passes_into_final_third',
  'passesintofinal3rd': 'passes_into_final_third',
  'carriesintofinalthird': 'carries_into_final_third',
  'carriesintofinal3rd': 'carries_into_final_third',
  'touchesinoppbox': 'touches_in_opp_box',
  'foulsdrawn': 'fouls_drawn',
  'xtviaprogcarries': 'xt_via_prog_carries',
  'xtvialivepasses': 'xt_via_live_passes',
  'totalshots': 'total_shots',
  'shotsinsidebox': 'shots_inside_box',
  'shotsoutsidebox': 'shots_outside_box',
  'selfcreatedshots': 'self_created_shots',
  'shotsontargetpct': 'shots_on_target_pct',
  'shotsontargetpercentage': 'shots_on_target_pct',
  'passaccuracy': 'pass_accuracy_pct',
  'passaccuracypct': 'pass_accuracy_pct',
  'longballaccuracy': 'long_ball_accuracy_pct',
  'longballaccuracypct': 'long_ball_accuracy_pct',
  'crossaccuracy': 'cross_accuracy_pct',
  'crossaccuracypct': 'cross_accuracy_pct',
  'dribblesuccess': 'dribble_success_pct',
  'dribblesuccesspct': 'dribble_success_pct',
  'tackleswonpct': 'tackles_won_pct',
  'duelswonpct': 'duels_won_pct',
  'aerialswon': 'aerial_duels_won',
  'aerialswonpct': 'aerial_duel_win_pct',
  'touchesinbox': 'touches_in_box',
  'boxentries': 'box_entries',
  'finalthirdentries': 'final_third_entries',
  'carries_into_box': 'carries_into_box',
  'carries_into_final_third': 'carries_into_final_third',
  'progressivecarries': 'progressive_carries',
  'shotcreatingactions': 'shot_creating_actions',
  
  'goalcreatingactions': 'goal_creating_actions',
  
  // Defensive
  'regains': 'regains',
  'interceptions': 'interceptions',
  'tackles': 'tackles',
  'tackleswon': 'tackles_won',
  'clearances': 'clearances',
  'blocks': 'blocks',
  'recoveries': 'recoveries',
  'pressingactions': 'pressing_actions',
  
  // Duels
  'duels': 'duels',
  'duelswon': 'duels_won',
  'aerialduels': 'aerial_duels',
  'aerialduelswinpct': 'aerial_duel_win_pct',
  'aerialduelswon': 'aerial_duels_won',
  
  // Per-90 aliases used by the club outreach proposal (Match-by-Match)
  'accuratelongballsper90': 'long_balls',
  'accuratecrossesper90': 'crosses_completed',
  'crossesper90': 'crosses_completed',
  'longballsper90': 'long_balls',
  'keypassesper90': 'key_passes',
  'keypasses': 'key_passes',
  'duelswonper90': 'duels_won',
  'aerialswonper90': 'aerial_duels_won',
  'aerialduelswonper90': 'aerial_duels_won',
  'clearancesper90': 'clearances',
  'tackleswonper90': 'tackles_won',
  'interceptionsper90': 'interceptions',

  // Turnovers
  'turnovers': 'turnovers',
  'dispossessed': 'dispossessed',
  'miscontrols': 'miscontrols',
  
  // Ratios
  'ppturnoversratio': 'pp_turnovers_ratio',
  'recoveryturnoverratio': 'recovery_turnover_ratio',
  
  // Fouls
  'foulswon': 'fouls_won',
  'foulscommitted': 'fouls_committed',
  
  // Movement xC values
  'triplethreatxc': 'triple_threat_xC',
  'movementtofeetxc': 'movement_to_feet_xC',
  'movementinbehindxc': 'movement_in_behind_xC',
  'movementdownsidexc': 'movement_downside_xC',
  'crossingmovementxc': 'crossing_movement_xC',
  
  // General
  'touches': 'touches',
  'goals': 'goals',
  'assists': 'assists',
  
  // Ratings
  'per': 'per',
  'sr': 'sr',
};

// Helper to normalize a stat key for lookups
export const normalizeStatKey = (key: string): string => {
  // First check exact match
  if (METRIC_KEY_MAP[key]) return METRIC_KEY_MAP[key];
  
  // Try lowercase
  const keyLower = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (METRIC_KEY_MAP[keyLower]) return METRIC_KEY_MAP[keyLower];
  
  // Try with underscores preserved but lowercase
  const keyWithUnderscores = key.toLowerCase();
  if (METRIC_KEY_MAP[keyWithUnderscores]) return METRIC_KEY_MAP[keyWithUnderscores];
  
  // Return original key if no mapping found
  return key;
};
