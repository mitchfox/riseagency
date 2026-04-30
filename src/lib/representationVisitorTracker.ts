import { supabase } from "@/integrations/supabase/client";

/**
 * Tracks visitors on the representation page so staff can see who is
 * exploring the flow even before they submit the form. Linked to the
 * same visitor_id used by site_visits so the staff panel can join
 * IP/city/country onto the same person.
 */

const STORAGE_KEY = "rep_visitor_tracker_v1";
// Reuse the SAME visitor id as the global page tracker so we can join
// onto site_visits (where the IP-derived city/country lives).
const SHARED_VISITOR_KEY = "visitor_id";

interface TrackerState {
  rowId: string | null;
  position: string | null;
  dob: string | null;
  ageGroup: string | null;
  countryCode: string | null;
}

/** site_visits / page-tracking format: visitor_<timestamp>_<random>.
 *  If the stored value is anything else (e.g. a stray UUID from another
 *  app/tab/iframe) we discard it and write a fresh one so both writers
 *  always agree on the same id, allowing the staff panel join to work. */
const VISITOR_ID_RE = /^visitor_\d+_[a-z0-9]+$/i;
const makeVisitorId = () =>
  `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const getVisitorId = (): string => {
  try {
    const existing = localStorage.getItem(SHARED_VISITOR_KEY);
    if (existing && VISITOR_ID_RE.test(existing)) return existing;
    const fresh = makeVisitorId();
    localStorage.setItem(SHARED_VISITOR_KEY, fresh);
    return fresh;
  } catch {
    return makeVisitorId();
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
