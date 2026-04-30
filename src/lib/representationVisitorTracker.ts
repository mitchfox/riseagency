import { supabase } from "@/integrations/supabase/client";

/**
 * Tracks visitors on the representation page as soon as they enter
 * their position or date of birth — even if they never submit the
 * full form. One row per browser session, upserted as more details
 * become available. Routed through an edge function so anonymous
 * visitors can write to the table via the service role.
 */

const STORAGE_KEY = "rep_visitor_tracker_v1";
const SESSION_VISITOR_KEY = "rep_visitor_id_v1";

interface TrackerState {
  rowId: string | null;
  position: string | null;
  dob: string | null;
  ageGroup: string | null;
  countryCode: string | null;
}

const getVisitorId = (): string => {
  try {
    const existing = localStorage.getItem(SESSION_VISITOR_KEY);
    if (existing) return existing;
    const fresh =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `v_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_VISITOR_KEY, fresh);
    return fresh;
  } catch {
    return `v_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
};

const loadState = (): TrackerState => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as TrackerState;
  } catch {}
  return { rowId: null, position: null, dob: null, ageGroup: null, countryCode: null };
};

const saveState = (s: TrackerState) => {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
};

/** Best-effort country detection via Cloudflare's edge trace. */
const detectCountry = async (): Promise<string | null> => {
  try {
    const res = await fetch("https://www.cloudflare.com/cdn-cgi/trace", { cache: "no-store" });
    const text = await res.text();
    const m = /(?:^|\n)loc=([A-Z]{2})/.exec(text);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
};

let inflight: Promise<void> | null = null;

export async function trackRepresentationVisitor(partial: {
  position?: string | null;
  dob?: string | null;
  ageGroup?: string | null;
  language?: string | null;
}): Promise<void> {
  const run = async () => {
    try {
      const state = loadState();
      const next: TrackerState = {
        ...state,
        position: partial.position ?? state.position,
        dob: partial.dob ?? state.dob,
        ageGroup: partial.ageGroup ?? state.ageGroup,
      };

      if (!next.countryCode) {
        next.countryCode = await detectCountry();
      }

      const visitorId = getVisitorId();
      const body = {
        rowId: state.rowId,
        visitorId,
        position: next.position,
        dob: next.dob,
        ageGroup: next.ageGroup,
        countryCode: next.countryCode,
        language: partial.language ?? null,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        referrer: typeof document !== "undefined" ? document.referrer || null : null,
      };

      const { data, error } = await supabase.functions.invoke("track-rep-visitor", { body });
      if (error) throw error;
      if (data?.id) next.rowId = data.id;

      saveState(next);
    } catch (err) {
      console.warn("[rep-visitor] tracking failed", err);
    }
  };

  inflight = (inflight ?? Promise.resolve()).then(run);
  return inflight;
}
