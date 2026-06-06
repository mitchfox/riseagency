import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeClubName, findClubCountry, findClubRating } from "@/lib/clubNameUtils";

export interface ClubRatingRow {
  club_name: string;
  first_team_rating: string;
  academy_rating: string;
  country?: string | null;
}

export interface ClubMaps {
  clubCountryMap: Record<string, string>;
  clubRatings: ClubRatingRow[];
  /** Enrich a player-like object with club_country + club_first_team_rating so fit-score
   *  computation is identical across every view. */
  enrichForFit: <T extends { current_club?: string | null; club?: string | null; club_country?: string | null; club_first_team_rating?: string | null }>(
    p: T,
    scope?: "youth" | "pro",
  ) => T & { club_country: string | null; club_first_team_rating: string | null };
}

let cached: { clubCountryMap: Record<string, string>; clubRatings: ClubRatingRow[] } | null = null;
let inflight: Promise<{ clubCountryMap: Record<string, string>; clubRatings: ClubRatingRow[] }> | null = null;

const SS_KEY = "rise.clubMaps.v1";
try {
  if (typeof sessionStorage !== "undefined") {
    const raw = sessionStorage.getItem(SS_KEY);
    if (raw) cached = JSON.parse(raw);
  }
} catch {}

const load = async () => {
  if (inflight) return inflight;
  inflight = (async () => {
    const [countryRes, ratingsRes] = await Promise.all([
      supabase.from("club_map_positions").select("club_name, country"),
      supabase.from("club_ratings").select("club_name, first_team_rating, academy_rating, country"),
    ]);
    const countryMap: Record<string, string> = {};
    countryRes.data?.forEach((c: any) => {
      if (c.club_name && c.country) countryMap[c.club_name.toLowerCase()] = c.country;
    });
    ratingsRes.data?.forEach((r: any) => {
      if (r.club_name && r.country && r.country !== "Unknown") {
        const lower = r.club_name.toLowerCase();
        if (!countryMap[lower]) countryMap[lower] = r.country;
        const norm = normalizeClubName(r.club_name);
        if (norm && !countryMap[norm]) countryMap[norm] = r.country;
      }
    });
    const out = { clubCountryMap: countryMap, clubRatings: (ratingsRes.data || []) as ClubRatingRow[] };
    cached = out;
    try { sessionStorage?.setItem(SS_KEY, JSON.stringify(out)); } catch {}
    return out;
  })();
  return inflight;
};

export const useClubMaps = (): ClubMaps => {
  const [state, setState] = useState(cached || { clubCountryMap: {}, clubRatings: [] });
  useEffect(() => {
    let mounted = true;
    load().then(s => { if (mounted) setState(s); });
    return () => { mounted = false; };
  }, []);

  const enrichForFit: ClubMaps["enrichForFit"] = (p, scope) => {
    const clubName = (p as any).current_club || (p as any).club || null;
    return {
      ...p,
      club_country: p.club_country ?? findClubCountry(clubName, state.clubCountryMap),
      club_first_team_rating:
        p.club_first_team_rating ?? (findClubRating(clubName, state.clubRatings as any, scope === "youth") as any),
    };
  };

  return { ...state, enrichForFit };
};