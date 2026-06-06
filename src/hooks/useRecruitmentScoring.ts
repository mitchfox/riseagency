import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_BONUS_WEIGHTS,
  DEFAULT_WEIGHTS,
  type BonusWeights,
  type RecruitmentTargetLite,
  type ScoringWeights,
} from "@/lib/fitScore";

export interface ScoringSettingsRow {
  weights: ScoringWeights;
  bonus_weights: BonusWeights;
  age_sweet_spot_band: number;
  ai_nudge_enabled: boolean;
  fit_score_threshold: number;
  position_adjacency_factor: number;
  league_strength_weight: number;
  position_weights: Record<string, number>;
}

const DEFAULT_SETTINGS: ScoringSettingsRow = {
  weights: DEFAULT_WEIGHTS,
  bonus_weights: DEFAULT_BONUS_WEIGHTS,
  age_sweet_spot_band: 2,
  ai_nudge_enabled: true,
  fit_score_threshold: 60,
  position_adjacency_factor: 0.5,
  league_strength_weight: 10,
  position_weights: {},
};

let cachedSettings: ScoringSettingsRow | null = null;
let cachedTargets: RecruitmentTargetLite[] | null = null;
let inflightSettings: Promise<ScoringSettingsRow> | null = null;
let inflightTargets: Promise<RecruitmentTargetLite[]> | null = null;

const SS_KEY_SETTINGS = "rise.scoring.settings.v1";
const SS_KEY_TARGETS = "rise.scoring.targets.v1";

const readSession = <T,>(key: string): T | null => {
  try {
    if (typeof sessionStorage === "undefined") return null;
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
};
const writeSession = (key: string, value: unknown) => {
  try { sessionStorage?.setItem(key, JSON.stringify(value)); } catch {}
};

// Warm caches from sessionStorage on module load for instant first paint.
if (!cachedSettings) cachedSettings = readSession<ScoringSettingsRow>(SS_KEY_SETTINGS);
if (!cachedTargets) cachedTargets = readSession<RecruitmentTargetLite[]>(SS_KEY_TARGETS);

const fetchSettings = async (): Promise<ScoringSettingsRow> => {
  if (inflightSettings) return inflightSettings;
  inflightSettings = (async () => {
    const { data } = await (supabase as any)
      .from("recruitment_scoring_settings")
      .select("weights, bonus_weights, age_sweet_spot_band, ai_nudge_enabled, fit_score_threshold, position_adjacency_factor, league_strength_weight, position_weights")
      .eq("id", "singleton")
      .maybeSingle();
    const merged: ScoringSettingsRow = {
      ...DEFAULT_SETTINGS,
      ...(data || {}),
      weights: { ...DEFAULT_WEIGHTS, ...((data?.weights) || {}) },
      bonus_weights: { ...DEFAULT_BONUS_WEIGHTS, ...((data?.bonus_weights) || {}) },
      position_adjacency_factor: Number(data?.position_adjacency_factor ?? 0.5),
      league_strength_weight: Number(data?.league_strength_weight ?? 10),
      position_weights: (data?.position_weights as Record<string, number>) || {},
    };
    cachedSettings = merged;
    writeSession(SS_KEY_SETTINGS, merged);
    return merged;
  })();
  return inflightSettings;
};

const fetchTargets = async (): Promise<RecruitmentTargetLite[]> => {
  if (inflightTargets) return inflightTargets;
  inflightTargets = (async () => {
    const { data } = await supabase
      .from("recruitment_targets")
      .select("id,name,scope,positions,min_age,max_age,nationalities,countries_of_club,min_club_rating,max_club_rating,priority,active,weights_override,ai_nudge_enabled")
      .eq("active", true);
    cachedTargets = ((data as any) || []) as RecruitmentTargetLite[];
    writeSession(SS_KEY_TARGETS, cachedTargets);
    return cachedTargets;
  })();
  return inflightTargets;
};

export const invalidateScoringCaches = () => {
  cachedSettings = null;
  cachedTargets = null;
  inflightSettings = null;
  inflightTargets = null;
  try {
    sessionStorage?.removeItem(SS_KEY_SETTINGS);
    sessionStorage?.removeItem(SS_KEY_TARGETS);
  } catch {}
};

export const useScoringSettings = () => {
  const [settings, setSettings] = useState<ScoringSettingsRow>(cachedSettings || DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let mounted = true;
    fetchSettings().then(s => {
      if (mounted) { setSettings(s); }
    });
    return () => { mounted = false; };
  }, []);
  return { settings, loading };
};

export const useRecruitmentTargets = () => {
  const [targets, setTargets] = useState<RecruitmentTargetLite[]>(cachedTargets || []);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let mounted = true;
    fetchTargets().then(t => {
      if (mounted) { setTargets(t); }
    });
    return () => { mounted = false; };
  }, []);
  return { targets, loading };
};