import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_WEIGHTS, type RecruitmentTargetLite, type ScoringWeights } from "@/lib/fitScore";

export interface ScoringSettingsRow {
  weights: ScoringWeights;
  age_sweet_spot_band: number;
  ai_nudge_enabled: boolean;
  fit_score_threshold: number;
}

const DEFAULT_SETTINGS: ScoringSettingsRow = {
  weights: DEFAULT_WEIGHTS,
  age_sweet_spot_band: 2,
  ai_nudge_enabled: true,
  fit_score_threshold: 60,
};

let cachedSettings: ScoringSettingsRow | null = null;
let cachedTargets: RecruitmentTargetLite[] | null = null;
let inflightSettings: Promise<ScoringSettingsRow> | null = null;
let inflightTargets: Promise<RecruitmentTargetLite[]> | null = null;

const fetchSettings = async (): Promise<ScoringSettingsRow> => {
  if (cachedSettings) return cachedSettings;
  if (inflightSettings) return inflightSettings;
  inflightSettings = (async () => {
    const { data } = await (supabase as any)
      .from("recruitment_scoring_settings")
      .select("weights, age_sweet_spot_band, ai_nudge_enabled, fit_score_threshold")
      .eq("id", "singleton")
      .maybeSingle();
    const merged: ScoringSettingsRow = {
      ...DEFAULT_SETTINGS,
      ...(data || {}),
      weights: { ...DEFAULT_WEIGHTS, ...((data?.weights) || {}) },
    };
    cachedSettings = merged;
    return merged;
  })();
  return inflightSettings;
};

const fetchTargets = async (): Promise<RecruitmentTargetLite[]> => {
  if (cachedTargets) return cachedTargets;
  if (inflightTargets) return inflightTargets;
  inflightTargets = (async () => {
    const { data } = await supabase
      .from("recruitment_targets")
      .select("id,name,scope,positions,min_age,max_age,nationalities,countries_of_club,min_club_rating,max_club_rating,priority,active")
      .eq("active", true);
    cachedTargets = ((data as any) || []) as RecruitmentTargetLite[];
    return cachedTargets;
  })();
  return inflightTargets;
};

export const invalidateScoringCaches = () => {
  cachedSettings = null;
  cachedTargets = null;
  inflightSettings = null;
  inflightTargets = null;
};

export const useScoringSettings = () => {
  const [settings, setSettings] = useState<ScoringSettingsRow>(cachedSettings || DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(!cachedSettings);
  useEffect(() => {
    let mounted = true;
    fetchSettings().then(s => {
      if (mounted) { setSettings(s); setLoading(false); }
    });
    return () => { mounted = false; };
  }, []);
  return { settings, loading };
};

export const useRecruitmentTargets = () => {
  const [targets, setTargets] = useState<RecruitmentTargetLite[]>(cachedTargets || []);
  const [loading, setLoading] = useState(!cachedTargets);
  useEffect(() => {
    let mounted = true;
    fetchTargets().then(t => {
      if (mounted) { setTargets(t); setLoading(false); }
    });
    return () => { mounted = false; };
  }, []);
  return { targets, loading };
};