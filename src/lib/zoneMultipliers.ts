// Zone multiplier configuration for performance actions
// 18 zones from defensive (1) to offensive (18)

export const OFFENSIVE_ZONE_MULTIPLIERS: Record<number, number> = {
  1: 0.2,
  2: 0.3,
  3: 0.2,
  4: 0.4,
  5: 0.6,
  6: 0.4,
  7: 0.6,
  8: 0.9,
  9: 0.6,
  10: 0.8,
  11: 1.1,
  12: 0.8,
  13: 1.0,
  14: 1.4,
  15: 1.0,
  16: 1.3,
  17: 1.7,
  18: 1.3,
};

export function getZoneMultiplier(
  zone: number,
  isSuccessful: boolean,
  isDefensiveAction: boolean
): number {
  // For defensive actions, reverse the zones
  const effectiveZone = isDefensiveAction ? (19 - zone) : zone;
  
  const baseMultiplier = OFFENSIVE_ZONE_MULTIPLIERS[effectiveZone] || 1.0;
  
  // For unsuccessful actions, use negative inverse multiplier to penalize
  return isSuccessful ? baseMultiplier : -(1 / baseMultiplier);
}

export function calculateAdjustedScore(
  baseScore: number,
  zone: number | null,
  isSuccessful: boolean,
  isDefensiveAction: boolean
): number | null {
  if (!zone || baseScore === null) return baseScore;
  
  const multiplier = getZoneMultiplier(zone, isSuccessful, isDefensiveAction);
  return Number((baseScore * multiplier).toFixed(5));
}

export function isDefensiveR90Category(category: string | null): boolean {
  if (!category) return false;
  const defensiveKeywords = ['defensive', 'defending', 'defense', 'defence'];
  return defensiveKeywords.some(keyword => 
    category.toLowerCase().includes(keyword)
  );
}
