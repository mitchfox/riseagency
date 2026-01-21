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
export const METRIC_KEY_MAP: Record<string, string> = {
  'r90': 'r90',
  'xg': 'xg',
  'xa': 'xa',
  'regains': 'regains',
  'interceptions': 'interceptions',
  'xgchain': 'xg_chain',
  'xgbuildup': 'xg_buildup',
  'progressivepasses': 'progressive_passes',
  'ppturnoversratio': 'pp_turnovers_ratio',
  'shots': 'shots',
  'shotsontarget': 'shots_on_target',
  'triplethreatxc': 'triple_threat_xC',
  'movementtofeetxc': 'movement_to_feet_xC',
  'movementinbehindxc': 'movement_in_behind_xC',
  'movementdownsidexc': 'movement_downside_xC',
  'crossingmovementxc': 'crossing_movement_xC',
  'dribbles': 'dribbles',
  'dribblesattempted': 'dribbles_attempted',
  'successfuldribbles': 'dribbles_completed',
  'turnovers': 'turnovers',
  'touchesinbox': 'touches_in_box',
  'aerialduelswinpct': 'aerial_duel_win_pct',
  'duelswon': 'duels_won',
  'longpassescompleted': 'long_passes_completed',
};
