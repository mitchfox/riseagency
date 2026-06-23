import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, Video, FileBadge2, ExternalLink, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, Maximize2, ArrowLeft, X as XIcon, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMetricCategoriesForPosition } from "@/components/staff/ComparisonPlayerData";
import { useFormGradeConfigs, normalizeStatKey } from "@/hooks/useFormGradeConfigs";
import { supabase } from "@/integrations/supabase/client";
import { calculateAge } from "@/lib/ageUtils";
import { heroCropStyle } from "@/lib/videoCropUtils";
import { shouldCropHeroVideo } from "@/lib/videoCropUtils";
import { getCountryFlagUrl, getLeagueFlagUrl } from "@/lib/countryFlags";
import { rankGames } from "@/lib/matchByMatchOrder";
import {
  DEFAULT_KEY_DETAILS,
  DEFAULT_SECTION_ORDER,
  KEY_DETAIL_LABELS,
  KeyDetailItem,
  ProposalSectionKey,
  normaliseKeyDetails,
  normaliseSectionOrder,
} from "@/lib/proposalConfig";
import blackMarbleBg from "@/assets/black-marble-smudged.png";
import riseLogoWhite from "@/assets/RISEWhite.png";
import jolonFifaLicenseAsset from "@/assets/jolon-fifa-license.png.asset.json";
import whyUsP1 from "@/assets/whyus/player-1.jpg";
import whyUsP2 from "@/assets/whyus/player-2.jpg";
import whyUsP3 from "@/assets/whyus/player-3.jpg";
import whyUsP4 from "@/assets/whyus/player-4.jpg";
import whyUsP5 from "@/assets/whyus/player-5.jpg";
import whyUsP6 from "@/assets/whyus/player-6.jpg";

const WHY_US_IMAGERY = [whyUsP1, whyUsP2, whyUsP3, whyUsP4, whyUsP5, whyUsP6];

const AGENT_FIFA_LICENCES: Record<string, { number: string; imageUrl: string }> = {
  "jolon levene": { number: "202304-1453", imageUrl: jolonFifaLicenseAsset.url },
};

function FifaLicenceBadge({ agentName }: { agentName: string | null | undefined }) {
  const key = (agentName || "").toLowerCase();
  const match = Object.entries(AGENT_FIFA_LICENCES).find(([k]) => key.includes(k))?.[1];
  if (!match) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(match.imageUrl, "_blank", "noopener,noreferrer");
      }}
      title={`FIFA Licence ${match.number}`}
      aria-label={`FIFA Licence ${match.number}`}
      className="ml-2 shrink-0 h-7 w-7 rounded-full bg-white text-[#1a3a8f] border border-white/70 shadow flex items-center justify-center text-[9px] font-extrabold tracking-tight hover:scale-110 transition-transform"
    >
      FIFA
    </button>
  );
}

function WhatsAppIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 32 32" className={className} style={style} fill="currentColor" aria-hidden="true">
      <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035 1.058 2.737 1.058.59 0 1.852-.704 2.235-1.176.244-.304.32-.622.32-.997 0-.246-1.677-.95-1.853-.95zM16.062 25.99c-2.124 0-4.16-.616-5.913-1.776L5.6 25.598l1.42-4.382a10.396 10.396 0 0 1-1.96-6.09c0-5.785 4.762-10.488 10.602-10.488 2.83.014 5.488 1.103 7.493 3.085 1.98 1.967 3.083 4.609 3.083 7.408-.014 5.794-4.78 10.49-10.617 10.49zm9.18-19.575C22.793 4.024 19.504 2.65 16.062 2.65 9.025 2.65 3.302 8.4 3.302 15.405c0 2.236.585 4.413 1.695 6.337L3 28.66l7.06-2.21a12.7 12.7 0 0 0 5.997 1.519h.005c7.034 0 12.989-5.762 12.989-12.767 0-3.444-1.523-6.78-3.81-8.787z"/>
    </svg>
  );
}

interface PlayerEntry {
  player: {
    id: string;
    name: string;
    position: string | null;
    age: number | null;
    date_of_birth: string | null;
    nationality: string | null;
    image_url: string | null;
    club: string | null;
    league: string | null;
    contract_end_date?: string | null;
    current_salary_annual?: number | null;
    preferred_currency?: string | null;
  } | null;
  position_slot: string | null;
  fit_recommendation: string | null;
  situation: string | null;
  sort_order: number;
  stars_url: string | null;
  highlights_url: string | null;
  proof_of_representation_url: string | null;
  player_club_image_url: string | null;
  player_club_country: string | null;
  first_highlight_url: string | null;
  videos?: { id: string; name: string; videoUrl: string; logoUrl: string | null; venue?: string | null }[];
  all_videos?: { id: string; name: string; videoUrl: string; logoUrl: string | null; venue?: string | null }[];
  stars_ordered_videos?: { id: string; name: string; videoUrl: string; logoUrl: string | null; venue?: string | null }[];
  transfermarkt_url?: string | null;
  match_by_match_stat_orders?: Record<string, string[]> | null;
  match_by_match_game_order?: string[] | null;
  top_stats: any | null;
  season_stats: any | null;
  strengths_and_play_style: any | null;
  form_config: { window_size: number; stats: any[] } | null;
  form_analyses: any[] | null;
  match_by_match?: Array<{
    id: string;
    analysis_date: string;
    opponent: string | null;
    opponent_logo?: string | null;
    result: string | null;
    r90_score: number | null;
    minutes_played: number | null;
    striker_stats?: Record<string, any> | null;
    fixture_stats?: Record<string, any> | null;
  }> | null;
  match_by_match_default_category?: string | null;
}

interface Payload {
  link: {
    id: string;
    short_id: string;
    fit_recommendation: string | null;
    created_at: string;
    club_contact_name: string | null;
    club_contact_role: string | null;
    club_contact_phone: string | null;
    club_contact_accent: string | null;
    prepared_for_name: string | null;
    show_form: boolean;
    show_in_numbers: boolean;
    show_season_stats: boolean;
    show_strengths: boolean;
    season_data_mode?: 'popup' | 'link' | null;
    is_mandated?: boolean;
    key_details?: KeyDetailItem[] | null;
    section_order?: ProposalSectionKey[] | null;
    target_type?: 'club' | 'agent';
    agent_name?: string | null;
    agent_logo_url?: string | null;
    language?: string | null;
    translations?: { ui?: Record<string, string>; fits?: Record<string, string> } | null;
    mandated_agent_name?: string | null;
    mandated_agent_role?: string | null;
    mandated_agent_phone?: string | null;
    mandated_agent_logo_url?: string | null;
    mandate_proof_url?: string | null;
    mandate_proof_path?: string | null;
    is_suggested_to_agent?: boolean | null;
    suggested_agent_note?: string | null;
    alternate_profiles_blurb?: string | null;
  };
  club: { id: string; club_name: string; country: string | null; image_url: string | null } | null;
  players: PlayerEntry[];
  alternate_profiles?: Array<{
    short_id: string;
    target_type?: 'club' | 'agent' | null;
    player_name: string | null;
    image_url: string | null;
    position: string | null;
    age: number | null;
    date_of_birth: string | null;
    club: string | null;
  }> | null;
  whatsapp_number: string | null;
  agent_name: string | null;
  agent_image_url: string | null;
  club_contact: {
    contact_name: string | null;
    contact_role: string | null;
    contact_phone: string | null;
    contact_accent: string | null;
    contact_image_url: string | null;
    contact_club_name?: string | null;
    contact_club_logo_url?: string | null;
    transfermarkt_url?: string | null;
  } | null;
}

// Pick black or white text based on background luminance.
function readableTextOn(hex: string): "#000" | "#fff" {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (v.length !== 6) return "#fff";
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#000" : "#fff";
}

function tryAutoplay(video: HTMLVideoElement) {
  // Try unmuted first; if the browser blocks it, fall back to muted autoplay
  // so the video at least starts (viewer can click the speaker icon).
  video.muted = false;
  video.defaultMuted = false;
  const p = video.play();
  if (p && typeof p.catch === "function") {
    p.catch(() => {
      video.muted = true;
      video.play().catch(() => {});
    });
  }
}

const PUBLIC_HOME_URL = "https://risefootballagency.com/";
const HERO_PREFETCH_TIMEOUT_MS = 12000;

// ============== HAPTIC + GLOW HELPERS (Club Outreach polish, scope E) ==============
// Subtle vibration on key outreach interactions. Safe no-op when the
// browser (or iOS Safari) does not expose the Vibration API.
function hapticTap(ms = 8) {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(ms);
    }
  } catch {
    // ignore - vibration is best-effort cosmetic feedback
  }
}

// Normalise a hex string (with or without leading #) to a valid CSS hex,
// returning null when the input is unusable. Mirrors the validation that
// was already in place inline for the contact card accent.
function normaliseAccentHex(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!/^#?[0-9a-fA-F]{3,6}$/.test(trimmed)) return null;
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function goToPublicHomepage() {
  try {
    localStorage.removeItem("pwa_last_route");
    localStorage.removeItem("pwa_last_scope");
  } catch {
    // Continue to the homepage even if storage is unavailable.
  }
  window.location.assign(PUBLIC_HOME_URL);
}

export default function ClubOutreachProposal() {
  const { shortId } = useParams<{ shortId: string }>();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const contactsRef = useRef<HTMLDivElement | null>(null);
  const [contactsVisible, setContactsVisible] = useState(false);
  const [heroBlobUrl, setHeroBlobUrl] = useState<string | null>(null);
  const [inlineDataOpen, setInlineDataOpen] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);
  const [shownAnalysisIds, setShownAnalysisIds] = useState<Set<string>>(new Set());
  const [selectedPlayerIdx, setSelectedPlayerIdx] = useState<number | null>(null);
  const [heroPrefetchFailed, setHeroPrefetchFailed] = useState(false);
  const [heroPreparing, setHeroPreparing] = useState(true);
  const heroBlobUrlRef = useRef<string | null>(null);
  const heroAutoplayedRef = useRef(false);
  // Main hero video carousel paging — matches the Stars-profile pattern used
  // by the inline "Match-By-Match Video" card (logo tiles + arrows when there
  // are more videos than fit on screen).
  const [heroCarouselStart, setHeroCarouselStart] = useState(0);
  const [heroMobileVisibleRows, setHeroMobileVisibleRows] = useState(1);
  useEffect(() => {
    setHeroCarouselStart(0);
    setHeroMobileVisibleRows(1);
  }, [activeIndex]);

  useEffect(() => {
    const node = contactsRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        setContactsVisible(!!e?.isIntersecting);
      },
      { threshold: 0.05 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [data]);

  useEffect(() => {
    if (!shortId) return;
    (async () => {
      try {
        const url = `https://qwethimbtaamlhbajmal.supabase.co/functions/v1/get-club-outreach?short_id=${encodeURIComponent(shortId)}`;
        const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(url, {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
        });
        if (!res.ok) {
          let msg = "Failed to load proposal.";
          try {
            const body = await res.json();
            if (body?.error) msg = body.error;
          } catch {}
          setErr(res.status === 404 ? "This proposal could not be found." : msg);
          return;
        }
        setData(await res.json());
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load proposal.");
      } finally {
        setLoading(false);
      }
    })();
  }, [shortId]);

  useEffect(() => {
    const lang = (data?.link?.language as string | undefined) || "en";
    try { document.documentElement.lang = lang; } catch {}
  }, [data?.link?.language]);

  const slots = useMemo(() => {
    if (!data) return [] as string[];
    const set = new Set<string>();
    // Only surface the position chips when there are 3+ primary players AND
    // at least two of them share the same slot — otherwise the chips are
    // noise and the "Back to all players" button is enough.
    if (data.players.length < 3) return [];
    const counts = new Map<string, number>();
    data.players.forEach((e) => {
      const s = (e.position_slot ?? "").trim();
      if (!s || s.toLowerCase() === "all") return;
      counts.set(s, (counts.get(s) ?? 0) + 1);
      set.add(s);
    });
    const hasDuplicateSlot = Array.from(counts.values()).some((n) => n >= 2);
    return hasDuplicateSlot ? Array.from(set) : [];
  }, [data]);

  const filteredPlayers = useMemo(() => {
    if (!data) return [] as PlayerEntry[];
    if (!activeSlot) return data.players;
    return data.players.filter((e) => (e.position_slot || "All") === activeSlot);
  }, [data, activeSlot]);

  useEffect(() => { setActiveIndex(0); }, [activeSlot]);
  // Reset the active hero video whenever the player changes - clicking a
  // thumbnail in the carousel below sets this to the chosen videoUrl.
  useEffect(() => { setActiveVideoUrl(null); }, [activeIndex]);

  const current = filteredPlayers[activeIndex] ?? filteredPlayers[0];

  // Map the videos shown in the main carousel back to the analysis_id they came
  // from, so the inline "Match by Match" table can skip games whose video
  // has already been shown on the main proposal page.
  useEffect(() => {
    const videoUrls = (current?.videos ?? [])
      .map((v) => v?.videoUrl)
      .filter((u): u is string => !!u)
      .map((u) => u.split("#")[0]);
    const playerId = current?.player?.id;
    if (!playerId || videoUrls.length === 0) {
      setShownAnalysisIds(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: analyses } = await supabase
        .from("player_analysis")
        .select("id")
        .eq("player_id", playerId);
      const aIds = (analyses ?? []).map((a: any) => a.id);
      if (aIds.length === 0) {
        if (!cancelled) setShownAnalysisIds(new Set());
        return;
      }
      const { data: acts } = await supabase
        .from("performance_report_actions")
        .select("video_url, analysis_id")
        .in("analysis_id", aIds)
        .not("video_url", "is", null);
      if (cancelled) return;
      const urlSet = new Set(videoUrls);
      const matched = new Set<string>();
      (acts ?? []).forEach((a: any) => {
        const base = (a.video_url || "").split("#")[0];
        if (urlSet.has(base) && a.analysis_id) matched.add(a.analysis_id);
      });
      setShownAnalysisIds(matched);
    })();
    return () => { cancelled = true; };
  }, [current?.player?.id, current?.videos]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !current?.first_highlight_url) return;
    video.pause();
    video.currentTime = 0;
  }, [current?.first_highlight_url]);

  // Fully prefetch the hero highlight to a blob URL so playback can run
  // entirely from memory without mid-stream re-buffering. We accept a longer
  // up-front wait to guarantee seamless playback.
  useEffect(() => {
    const url = current?.first_highlight_url;
    heroAutoplayedRef.current = false;
    setHeroPreparing(true);
    setHeroPrefetchFailed(false);
    if (heroBlobUrlRef.current) {
      try { URL.revokeObjectURL(heroBlobUrlRef.current); } catch {}
      heroBlobUrlRef.current = null;
    }
    setHeroBlobUrl(null);
    if (!url) return;
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      if (cancelled) return;
      setHeroPrefetchFailed(true);
      setHeroPreparing(false);
      if (videoRef.current && !heroAutoplayedRef.current) {
        heroAutoplayedRef.current = true;
        tryAutoplay(videoRef.current);
      }
      controller.abort();
    }, HERO_PREFETCH_TIMEOUT_MS);
    (async () => {
      try {
        const res = await fetch(url, { signal: controller.signal, cache: "force-cache" });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        const obj = URL.createObjectURL(blob);
        if (cancelled) {
          try { URL.revokeObjectURL(obj); } catch {}
          return;
        }
        window.clearTimeout(timeout);
        heroAutoplayedRef.current = false;
        heroBlobUrlRef.current = obj;
        setHeroBlobUrl(obj);
        setHeroPrefetchFailed(false);
      } catch (e) {
        if (cancelled) return;
        window.clearTimeout(timeout);
        // Fall back to direct streaming with a stricter readiness gate.
        setHeroPrefetchFailed(true);
        setHeroPreparing(false);
        if (videoRef.current && !heroAutoplayedRef.current) {
          heroAutoplayedRef.current = true;
          tryAutoplay(videoRef.current);
        }
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [current?.first_highlight_url]);

  // Revoke the blob URL on unmount.
  useEffect(() => {
    return () => {
      if (heroBlobUrlRef.current) {
        try { URL.revokeObjectURL(heroBlobUrlRef.current); } catch {}
        heroBlobUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!heroPrefetchFailed || !heroPreparing) return;
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    setHeroPreparing(false);
    if (heroAutoplayedRef.current) return;
    heroAutoplayedRef.current = true;
    tryAutoplay(video);
  }, [heroPrefetchFailed, heroPreparing, current?.first_highlight_url]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#cbb96b]" />
      </div>
    );
  }
  if (err || !data || data.players.length === 0 || !current) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center text-white p-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Proposal unavailable</h1>
          <p className="text-white/60">{err ?? "This link is no longer active."}</p>
        </div>
      </div>
    );
  }

  const club = data.club;
  const player = current.player;

  const lang = (data.link.language as string | undefined) || "en";
  const uiT = data.link.translations?.ui ?? {};
  const fitsT = data.link.translations?.fits ?? {};
  const tr = (key: string, en: string) => (lang === "en" ? en : (uiT[key] ?? en));
  const fillTpl = (s: string, vars: Record<string, string | number>) =>
    s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
  const trFit = (playerId: string | undefined, en: string) => {
    if (!playerId || lang === "en") return en;
    return fitsT[playerId] ?? en;
  };

  const revealHeroVideo = (video: HTMLVideoElement) => {
    setHeroPreparing(false);
    if (heroAutoplayedRef.current) return;
    heroAutoplayedRef.current = true;
    tryAutoplay(video);
  };

  const wa = (data.whatsapp_number ?? "").replace(/[^0-9]/g, "");
  const agencyWaUrl = wa ? `https://wa.me/${wa}` : null;

  // Prefer club-level contact directory; fall back to per-link fields
  const clubContactName = data.club_contact?.contact_name ?? data.link.club_contact_name;
  const clubContactPhoneRaw = data.club_contact?.contact_phone ?? data.link.club_contact_phone;
  const clubContactAccent = data.club_contact?.contact_accent ?? data.link.club_contact_accent;
  // Club glow - derived from the (already staff-configurable) accent
  // colour. Falls back to RISE gold when no accent is set.
  const clubGlow = normaliseAccentHex(clubContactAccent) ?? "#cbb96b";
  const clubContactImage = data.club_contact?.contact_image_url ?? null;
  const clubContactRole = data.club_contact?.contact_role ?? data.link.club_contact_role;
  const clubContactClubName = data.club_contact?.contact_club_name ?? null;
  const clubContactClubLogo = data.club_contact?.contact_club_logo_url ?? null;
  const clubPhone = (clubContactPhoneRaw ?? "").replace(/[^0-9]/g, "");
  const clubWaUrl = clubPhone ? `https://wa.me/${clubPhone}` : null;

  const hasMultiple = data.players.length > 1;
  const fitTextEn = (current.fit_recommendation ?? "").trim();
  const fitText = fitTextEn ? trFit(current.player?.id, fitTextEn) : "";
  const situationText = (current.situation ?? "").trim();
  const age = player?.age ?? calculateAge(player?.date_of_birth ?? null);
  const firstName = (player?.name ?? "").trim().split(/\s+/)[0] || "the player";
  const nationalityFlag = player?.nationality ? getCountryFlagUrl(player.nationality) : null;
  const playerClubLogo = current.player_club_image_url;
  const preparedFor =
    (data.link.prepared_for_name ?? "").trim();

  const isMandated = !!data.link.is_mandated;
  const mandatedAgentName = (data.link.mandated_agent_name ?? "").trim();
  const mandatedAgentRole = (data.link.mandated_agent_role ?? "").trim();
  const mandatedAgentLogo = (data.link.mandated_agent_logo_url ?? "").trim();
  const mandatedAgentPhone = (data.link.mandated_agent_phone ?? "").replace(/[^0-9]/g, "");
  const mandatedAgentWaUrl = mandatedAgentPhone ? `https://wa.me/${mandatedAgentPhone}` : null;
  const showMandatedHeader = isMandated && mandatedAgentName.length > 0;

  const isSuggestedToAgent = !!data.link.is_suggested_to_agent && isMandated;
  const suggestedAgentNote = (data.link.suggested_agent_note ?? "").trim();

  if (inlineDataOpen) {
    return (
      <div className="relative min-h-[100dvh] text-white pb-[max(24px,env(safe-area-inset-bottom))]">
        <div
          className="fixed inset-0 -z-10 bg-black"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.85)), url(${blackMarbleBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="sticky top-0 z-20 bg-black/80 backdrop-blur border-b border-white/10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setInlineDataOpen(false);
                try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs uppercase tracking-wider border border-white/15 text-white/80 hover:border-[#cbb96b]/60 hover:text-white transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {tr("inline.back", "Back to proposal")}
            </button>
            <p className="ml-auto text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-[#cbb96b] truncate">
              {tr("card.videoTitle", "Video & Data")}
              {current?.player?.name ? ` · ${current.player.name}` : ""}
            </p>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-5">
          {(() => {
            // Prefer the stars-profile-ordered list (matchHighlights only,
            // in saved order) so the inline carousel mirrors what the player's
            // public Stars profile shows. Fall back to all_videos for older
            // payloads.
            const allV = current?.stars_ordered_videos ?? current?.all_videos ?? current?.videos ?? [];
            const shownSet = new Set(
              (current?.videos ?? [])
                .map((v) => (v?.videoUrl ?? "").split("#")[0])
                .filter(Boolean),
            );
            const remaining = allV.filter(
              (v) => v?.videoUrl && !shownSet.has(v.videoUrl.split("#")[0]),
            );
            if (remaining.length === 0) return null;
            return (
              <RemainingVideosCard
                videos={remaining}
                title={tr("inline.moreVideos", "Match-By-Match Video")}
              />
            );
          })()}
          {!data.link.show_form && current?.form_config && Array.isArray(current?.form_analyses) && current.form_analyses.length > 0 && (
            <FormBannerCard cfg={current.form_config} rows={current.form_analyses} titleTemplate={tr("form.titlePrefix", "Form · Last {n}")} />
          )}
          {!data.link.show_in_numbers && Array.isArray(current?.top_stats) && current.top_stats.length > 0 && (
            <InNumbersCard stats={current.top_stats} title={tr("section.inNumbers", "In Numbers")} />
          )}
          {!data.link.show_season_stats && Array.isArray(current?.season_stats) && current.season_stats.length > 0 && (
            <SeasonStatsCard stats={current.season_stats} title={tr("section.seasonStats", "Season Stats")} />
          )}
          {Array.isArray(current?.match_by_match) && current.match_by_match.length > 0 && (
            <MatchByMatchCard
              analyses={current.match_by_match}
              position={current?.player?.position ?? null}
              excludeAnalysisIds={shownAnalysisIds}
              defaultCategory={current?.match_by_match_default_category ?? null}
              statOrders={current?.match_by_match_stat_orders ?? null}
              gameOrder={current?.match_by_match_game_order ?? null}
            />
          )}
          {current?.stars_url && (
            <div className="pt-2">
              <a
                href={current.stars_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider border border-[#cbb96b]/40 text-[#cbb96b] hover:bg-[#cbb96b]/10 transition"
              >
                {tr("card.openFull", "View Full Stars Profile")} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setInlineDataOpen(false);
                try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider border border-white/15 text-white/80 hover:border-[#cbb96b]/60 hover:text-white transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {tr("inline.back", "Back to proposal")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Multi-player picker — when the proposal presents 2+ primary players,
  // show a card grid (image + fit recommendation + Learn more) before
  // diving into a single player's full proposal. The alternate_profiles
  // suggestion list at the bottom of the page is unrelated.
  if (hasMultiple && selectedPlayerIdx === null) {
    return (
      <div className="relative min-h-[100dvh] text-white pb-[max(24px,env(safe-area-inset-bottom))]">
        <div
          className="fixed inset-0 -z-10 bg-black"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.85)), url(${blackMarbleBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <header className="relative px-6 pt-[max(20px,env(safe-area-inset-top))] pb-6 text-center border-b border-white/5">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-56"
            style={{ background: `radial-gradient(ellipse at top, ${clubGlow}38, transparent 65%)` }}
          />
          {club?.image_url ? (
            <img
              src={club.image_url}
              alt={club.club_name}
              onError={(e) => ((e.currentTarget.style.display = "none"))}
              className="relative mx-auto h-20 sm:h-24 w-auto object-contain"
              style={{ filter: `drop-shadow(0 6px 28px ${clubGlow}66)` }}
            />
          ) : null}
          <div className="mt-5 flex flex-col items-center gap-2.5">
            <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.35em] text-[#cbb96b]">
              {showMandatedHeader
                ? fillTpl(tr("hdr.presentsBy", "{name} presents"), { name: mandatedAgentName })
                : tr("hdr.presents", "Rise Football Agency presents")}
            </p>
            <h1 className="text-[28px] sm:text-4xl font-semibold leading-[1.1] tracking-tight">
              {fillTpl(tr("hdr.players", "{count} players"), { count: data.players.length })}
            </h1>
            {preparedFor && (
              <p className="text-[11px] sm:text-xs text-white/40">{tr("hdr.for", "For")} <span className="text-white/85">{preparedFor}</span></p>
            )}
          </div>
        </header>
        <section className="max-w-5xl mx-auto px-6 mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {data.players.map((entry, i) => {
            const p = entry.player;
            const playerFitEn = (entry.fit_recommendation ?? "").trim();
            const playerFit = playerFitEn ? trFit(p?.id, playerFitEn) : "";
            const playerAge = p?.age ?? calculateAge(p?.date_of_birth ?? null);
            return (
              <div
                key={p?.id ?? i}
                className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.01] overflow-hidden flex flex-col"
              >
                <div className="relative aspect-[4/3] bg-black/60 overflow-hidden">
                  {p?.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-5xl text-white/30">
                      {p?.name?.[0] ?? "?"}
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                    <h2 className="text-xl font-semibold leading-tight">{p?.name ?? "Player"}</h2>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/65 mt-1">
                      {[p?.position, playerAge ? `${playerAge}` : null, p?.club].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
                {playerFit ? (
                  <div className="px-5 pt-4 pb-3 flex-1">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-[#cbb96b]">
                      {tr("fit.title", "Fit & Recommendation")}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-white/80 whitespace-pre-wrap line-clamp-6">
                      {playerFit}
                    </p>
                  </div>
                ) : (
                  <div className="flex-1" />
                )}
                <div className="p-4 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      hapticTap();
                      setActiveSlot(null);
                      setActiveIndex(i);
                      setSelectedPlayerIdx(i);
                      try { window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }); } catch {}
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider border border-[#cbb96b]/50 bg-[#cbb96b]/10 hover:bg-[#cbb96b]/20 text-[#cbb96b] transition"
                  >
                    {tr("picker.learnMore", "Learn more")} <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] text-white pb-[max(24px,env(safe-area-inset-bottom))]">
      {/* Smudged black marble brand background */}
      <div
        className="fixed inset-0 -z-10 bg-black"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.85)), url(${blackMarbleBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {isSuggestedToAgent && (
        <div className="relative border-b border-[#cbb96b]/40 bg-gradient-to-b from-[#cbb96b]/[0.18] to-[#cbb96b]/[0.06] px-6 py-4 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#cbb96b] font-semibold">
            {tr("suggested.label", "Suggested Proposal Preview")}
          </p>
          <p className="mt-1 text-xs sm:text-sm text-white/85 max-w-2xl mx-auto">
            {tr(
              "suggested.intro",
              "This is a preview of a proposal we'd like you to send on this player's behalf.",
            )}
          </p>
          {suggestedAgentNote && (
            <p className="mt-2 text-xs sm:text-sm text-white/70 max-w-2xl mx-auto whitespace-pre-line italic">
              {suggestedAgentNote}
            </p>
          )}
        </div>
      )}
      {/* Header */}
      <header className="relative px-6 pt-[max(20px,env(safe-area-inset-top))] pb-5 text-center border-b border-white/5">
        {/* Ambient club-coloured glow that wraps the crest. Falls back to
            RISE gold when no club accent is configured. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-56"
          style={{
            background: `radial-gradient(ellipse at top, ${clubGlow}38, transparent 65%)`,
          }}
        />
        {club?.image_url ? (
          <img
            src={club.image_url}
            alt={club.club_name}
            onError={(e) => ((e.currentTarget.style.display = "none"))}
            className="relative mx-auto h-20 sm:h-24 w-auto object-contain"
            style={{ filter: `drop-shadow(0 6px 28px ${clubGlow}66)` }}
          />
        ) : (
          <div className="relative mx-auto h-20 sm:h-24 w-20 sm:w-24 rounded-full bg-white/5 flex items-center justify-center text-3xl">
            {club?.club_name?.[0] ?? "?"}
          </div>
        )}
        <div className="mt-5 flex flex-col items-center gap-2.5">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.35em] text-[#cbb96b]">
            {showMandatedHeader
              ? fillTpl(tr("hdr.presentsBy", "{name} presents"), { name: mandatedAgentName })
              : tr("hdr.presents", "Rise Football Agency presents")}
          </p>
          {showMandatedHeader && (
            <p className="-mt-1 text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-white/55">
              {tr("hdr.mandatedBy", "Mandated by Rise Football Agency")}
            </p>
          )}
          <h1 className="text-[28px] sm:text-4xl font-semibold leading-[1.1] tracking-tight">
            {hasMultiple
              ? fillTpl(tr("hdr.players", "{count} players"), { count: data.players.length })
              : (player?.name ?? tr("hdr.player", "Player"))}
          </h1>
          {preparedFor && (
            <p className="text-[11px] sm:text-xs text-white/40">{tr("hdr.for", "For")} <span className="text-white/85">{preparedFor}</span></p>
          )}
        </div>
      </header>

      {/* Position chips */}
      {hasMultiple && slots.length > 1 && (
        <div className="max-w-3xl mx-auto px-6 mt-6 flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => { hapticTap(); setActiveSlot(null); }}
            className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wider border transition ${activeSlot === null ? "bg-[#cbb96b] text-black border-[#cbb96b]" : "border-white/15 text-white/70 hover:border-white/40"}`}
          >
            {tr("chip.all", "All")}
          </button>
          {slots.map((s) => (
            <button
              key={s}
              onClick={() => { hapticTap(); setActiveSlot(s); }}
              className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wider border transition ${activeSlot === s ? "bg-[#cbb96b] text-black border-[#cbb96b]" : "border-white/15 text-white/70 hover:border-white/40"}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {hasMultiple && (
        <div className="max-w-3xl mx-auto px-6 mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => {
              hapticTap();
              setSelectedPlayerIdx(null);
              try { window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }); } catch {}
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.25em] border border-white/15 text-white/70 hover:border-[#cbb96b]/60 hover:text-white transition"
          >
            <ArrowLeft className="h-3 w-3" />
            {tr("picker.backToPlayers", "Back to all players offered")}
          </button>
        </div>
      )}

      {/* Carousel controls */}
      {filteredPlayers.length > 1 && (
        <div className="max-w-3xl mx-auto px-6 mt-4 flex items-center justify-between gap-3">
          <button
            onClick={() => { hapticTap(); setActiveIndex((i) => (i - 1 + filteredPlayers.length) % filteredPlayers.length); }}
            className="h-9 w-9 rounded-full border border-white/15 flex items-center justify-center hover:border-[#cbb96b]/60 transition-shadow"
            style={{ boxShadow: `0 0 0 0 ${clubGlow}` }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 text-center text-xs text-white/60">
            <span className="text-white/40">{activeIndex + 1} / {filteredPlayers.length}</span>
          </div>
          <button
            onClick={() => { hapticTap(); setActiveIndex((i) => (i + 1) % filteredPlayers.length); }}
            className="h-9 w-9 rounded-full border border-white/15 flex items-center justify-center hover:border-[#cbb96b]/60 transition-shadow"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Key details - moved above the hero video */}
      <section className="max-w-3xl mx-auto px-6 mt-4">
        <KeyDetailsCard entry={current} age={age} tr={tr} items={normaliseKeyDetails(data.link.key_details)} />
      </section>

      {/* Hero - first Stars highlight video, falls back to player image */}
      {(current.first_highlight_url || player?.image_url) && (
        <div className="max-w-3xl mx-auto px-6 mt-6">
          {(() => {
            // Order the proposal videos by the player's Stars-profile sequence
            // so the buttons appear in the same order the public Stars page
            // shows them.
            const orderedHero = (() => {
              const stars = current.stars_ordered_videos ?? [];
              const vids = current.videos ?? [];
              if (vids.length <= 1) return vids;
              if (stars.length === 0) return vids;
              const order = new Map<string, number>();
              stars.forEach((s, i) => {
                if (s?.videoUrl) order.set(s.videoUrl.split("#")[0], i);
              });
              return [...vids].sort((a, b) => {
                const ai = order.get((a.videoUrl ?? "").split("#")[0]) ?? Number.POSITIVE_INFINITY;
                const bi = order.get((b.videoUrl ?? "").split("#")[0]) ?? Number.POSITIVE_INFINITY;
                return ai - bi;
              });
            })();
            const PAGE = 12;
            const useCarousel = orderedHero.length > PAGE;
            const start = useCarousel
              ? ((heroCarouselStart % orderedHero.length) + orderedHero.length) % orderedHero.length
              : 0;
            const visible = useCarousel
              ? Array.from({ length: PAGE }, (_, i) => ({
                  video: orderedHero[(start + i) % orderedHero.length],
                  index: (start + i) % orderedHero.length,
                }))
              : orderedHero.map((video, index) => ({ video, index }));
            const activeUrl = (activeVideoUrl ?? current.first_highlight_url) ?? "";
            const mobileVisibleCount = Math.min(orderedHero.length, 8 * heroMobileVisibleRows);
            const mobileRemaining = orderedHero.length - mobileVisibleCount;
            return (
          <>
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-white/10 bg-black">
            {current.first_highlight_url ? (
              <>
                <video
                  ref={videoRef}
                  key={`${activeVideoUrl ?? current.first_highlight_url}-${activeVideoUrl ? "alt" : heroBlobUrl ? "blob" : "stream"}`}
                  src={activeVideoUrl ?? heroBlobUrl ?? current.first_highlight_url}
                  className={`w-full h-full object-contain bg-black transition-opacity duration-300 ${heroPreparing && !activeVideoUrl ? "opacity-0" : "opacity-100"}`}
                  style={heroCropStyle(activeVideoUrl ?? current.first_highlight_url)}
                  controls={!shouldCropHeroVideo(activeVideoUrl ?? current.first_highlight_url)}
                  playsInline
                  preload="auto"
                  onLoadedMetadata={(e) => {
                    e.currentTarget.currentTime = 0;
                    if (heroBlobUrl) {
                      revealHeroVideo(e.currentTarget);
                    }
                  }}
                  onLoadedData={(e) => {
                    if (!heroBlobUrl && heroPrefetchFailed) revealHeroVideo(e.currentTarget);
                  }}
                  onCanPlay={(e) => {
                    if (!heroBlobUrl && heroPrefetchFailed) revealHeroVideo(e.currentTarget);
                  }}
                  onCanPlayThrough={(e) => {
                    // Fallback path: only start once the browser is confident
                    // playback can complete without re-buffering.
                    if (!heroBlobUrl && heroPrefetchFailed) {
                      const v = e.currentTarget;
                      const dur = v.duration;
                      let covered = false;
                      if (isFinite(dur) && v.buffered.length > 0) {
                        const end = v.buffered.end(v.buffered.length - 1);
                        covered = end >= dur - 0.5;
                      }
                      if (covered && heroPreparing) {
                        revealHeroVideo(v);
                      }
                    }
                  }}
                  onError={(e) => {
                    setHeroPreparing(false);
                    heroAutoplayedRef.current = true;
                  }}
                />
                {shouldCropHeroVideo(activeVideoUrl ?? current.first_highlight_url) && !heroPreparing && (
                  <CroppedHeroControls videoRef={videoRef} />
                )}
                {heroPreparing && !activeVideoUrl && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
                  <Loader2 className="h-8 w-8 animate-spin text-[#cbb96b]" />
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                    {tr("video.preparing", "Preparing video")}
                  </p>
                  </div>
                )}
                {orderedHero.length > 1 && (
                  <div className="hidden md:block absolute bottom-[39px] left-1/2 -translate-x-1/2 z-10 w-full px-2 pointer-events-none">
                    <div className="relative flex items-center justify-center gap-2">
                      {useCarousel && (
                        <button
                          type="button"
                          onClick={() => setHeroCarouselStart((s) => s - PAGE)}
                          className="pointer-events-auto flex-shrink-0 w-8 h-8 rounded-full bg-[#cbb96b]/20 hover:bg-[#cbb96b]/30 border border-[#cbb96b]/40 flex items-center justify-center text-white transition-colors"
                          aria-label="Previous logos"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                      )}
                      <div className="flex gap-1 md:gap-2 pointer-events-auto">
                        {visible.map(({ video: v }) => {
                          const isActive = activeUrl === v.videoUrl;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => {
                                setActiveVideoUrl(v.videoUrl);
                                videoRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                              }}
                              title={v.name || ""}
                              className={`relative flex-shrink-0 w-10 h-10 rounded border transition-all overflow-hidden bg-background/90 backdrop-blur-sm ${
                                isActive ? "border-[#cbb96b] scale-110" : "border-[#cbb96b]/20 hover:border-[#cbb96b]/50"
                              }`}
                            >
                              {v.logoUrl ? (
                                <img
                                  src={v.logoUrl}
                                  alt=""
                                  onError={(e) => (e.currentTarget.style.display = "none")}
                                  className="w-full h-full object-contain p-0.5"
                                  loading="eager"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Video className="h-3 w-3 text-white/60" />
                                </div>
                              )}
                              {(v.venue === "H" || v.venue === "A") && (
                                <span className="absolute bottom-0 right-0 leading-none text-[8px] md:text-[9px] font-bebas font-bold text-[#cbb96b] bg-black/70 px-[2px] rounded-tl">
                                  {v.venue}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {useCarousel && (
                        <button
                          type="button"
                          onClick={() => setHeroCarouselStart((s) => s + PAGE)}
                          className="pointer-events-auto flex-shrink-0 w-8 h-8 rounded-full bg-[#cbb96b]/20 hover:bg-[#cbb96b]/30 border border-[#cbb96b]/40 flex items-center justify-center text-white transition-colors"
                          aria-label="Next logos"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <img src={player!.image_url!} alt={player?.name ?? ""} className="w-full h-full object-cover" />
            )}
          </div>
          {/* Mobile: 8-per-row logo grid with "See more" expansion */}
          {orderedHero.length > 1 && (
            <>
              <div className="md:hidden mt-2 grid grid-cols-8 gap-1.5">
                {orderedHero.slice(0, mobileVisibleCount).map((v) => {
                    const isActive = activeUrl === v.videoUrl;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setActiveVideoUrl(v.videoUrl);
                          videoRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                        }}
                        title={v.name || ""}
                        className={`relative aspect-square rounded border transition-all overflow-hidden bg-background/90 ${
                          isActive ? "border-[#cbb96b] scale-110" : "border-[#cbb96b]/30"
                        }`}
                      >
                        {v.logoUrl ? (
                          <img
                            src={v.logoUrl}
                            alt=""
                            onError={(e) => (e.currentTarget.style.display = "none")}
                            className="w-full h-full object-contain p-0.5"
                            loading="eager"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="h-3 w-3 text-white/60" />
                          </div>
                        )}
                        {(v.venue === "H" || v.venue === "A") && (
                          <span className="absolute bottom-0 right-0 leading-none text-[8px] font-bebas font-bold text-[#cbb96b] bg-black/70 px-[2px] rounded-tl">
                            {v.venue}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
              {mobileRemaining > 0 && (
                  <button
                    type="button"
                    onClick={() => setHeroMobileVisibleRows((r) => r + 1)}
                    className="md:hidden mt-2 w-full text-xs font-bebas uppercase tracking-wider text-[#cbb96b] border border-[#cbb96b]/40 rounded py-1.5 hover:bg-[#cbb96b]/10"
                  >
                    See more ({mobileRemaining})
                  </button>
              )}
            </>
          )}
          </>
            );
          })()}
        </div>
      )}

      {/* Sections after the hero video - order is staff-configurable per link */}
      {(() => {
        const order = normaliseSectionOrder(data.link.section_order);
        const renderers: Record<ProposalSectionKey, () => React.ReactNode> = {
          fit: () => fitText ? (
            <section key="fit" className="max-w-3xl mx-auto px-6 mt-6">
              <div className="rounded-2xl border border-[#cbb96b]/30 bg-gradient-to-br from-[#cbb96b]/[0.08] to-white/[0.02] p-5">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#cbb96b]">{tr("fit.title", "Fit & Recommendation")}</p>
                <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-white/85 whitespace-pre-wrap">{fitText}</p>
              </div>
            </section>
          ) : null,
          situation: () => situationText ? (
            <section key="situation" className="max-w-3xl mx-auto px-6 mt-4">
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.01] p-5">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#cbb96b]">{tr("situation.title", "Situation")}</p>
                <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-white/85 whitespace-pre-wrap">{situationText}</p>
              </div>
            </section>
          ) : null,
          cards: () => (
            <section key="cards" className={`max-w-3xl mx-auto px-6 mt-6 grid grid-cols-1 gap-4 ${data.link.target_type === 'agent' ? '' : 'sm:grid-cols-2'}`}>
              <ProposalCard
                href={data.link.season_data_mode === 'popup' ? null : current.stars_url}
                onClick={
                  data.link.season_data_mode === 'popup'
                    ? () => {
                        setInlineDataOpen(true);
                        try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
                      }
                    : undefined
                }
                icon={<Video className="h-6 w-6" />}
                eyebrow="01"
                title={tr("card.videoTitle", "Video & Data")}
                subtitle={tr("card.videoSubtitle", "Full profile, highlights and statistics")}
                openLabel={tr("card.open", "Open")}
                unavailableLabel={tr("card.unavailable", "Unavailable")}
              />
              {data.link.target_type !== 'agent' && (
                (isMandated ? (
                  <ProposalCard
                    href={data.link.mandate_proof_url || null}
                    icon={<FileBadge2 className="h-6 w-6" />}
                    eyebrow="02"
                    title={tr("card.mandateTitle", "Proof of Mandate")}
                    subtitle={fillTpl(
                      tr("card.mandateSubtitle", "Signed mandate granting {agent} the right to represent {firstName}"),
                      { agent: mandatedAgentName || "the external agent", firstName },
                    )}
                    disabledLabel={data.link.mandate_proof_url ? undefined : tr("card.availableOnRequest", "Available on request")}
                    openLabel={tr("card.open", "Open")}
                    unavailableLabel={tr("card.unavailable", "Unavailable")}
                  />
                ) : current.proof_of_representation_url ? (
                  <ProposalCard
                    href={null}
                    onClick={() => setProofOpen(true)}
                    icon={<FileBadge2 className="h-6 w-6" />}
                    eyebrow="02"
                    title={tr("card.proofTitle", "Proof of Representation")}
                    subtitle={tr("card.proofSubtitle", "Signed agreement with Rise Football Agency")}
                    disabledLabel={current.proof_of_representation_url ? undefined : tr("card.availableOnRequest", "Available on request")}
                    openLabel={tr("card.open", "Open")}
                    unavailableLabel={tr("card.unavailable", "Unavailable")}
                  />
                ) : null)
              )}
            </section>
          ),
          form: () => (data.link.show_form && current.form_config && current.form_analyses) ? (
            <section key="form" className="max-w-3xl mx-auto px-6 mt-4">
              <FormBannerCard cfg={current.form_config} rows={current.form_analyses} titleTemplate={tr("form.titlePrefix", "Form · Last {n}")} />
            </section>
          ) : null,
          in_numbers: () => (data.link.show_in_numbers && Array.isArray(current.top_stats) && current.top_stats.length > 0) ? (
            <section key="in_numbers" className="max-w-3xl mx-auto px-6 mt-4">
              <InNumbersCard stats={current.top_stats} title={tr("section.inNumbers", "In Numbers")} />
            </section>
          ) : null,
          season_stats: () => (data.link.show_season_stats && Array.isArray(current.season_stats) && current.season_stats.length > 0) ? (
            <section key="season_stats" className="max-w-3xl mx-auto px-6 mt-4">
              <SeasonStatsCard stats={current.season_stats} title={tr("section.seasonStats", "Season Stats")} />
            </section>
          ) : null,
          strengths: () => (data.link.show_strengths && current.strengths_and_play_style) ? (
            <section key="strengths" className="max-w-3xl mx-auto px-6 mt-4">
              <StrengthsCard data={current.strengths_and_play_style} title={tr("section.strengths", "Strengths & Play Style")} />
            </section>
          ) : null,
        };
        return <>{order.map((k) => renderers[k]?.())}</>;
      })()}

      {/* Alternate Options - wide thin card with a heading, the staffer's
          free-text note, and plain clickable links to alternate player
          profiles the club can switch to. Renders only when blurb or linked
          profiles exist. */}
      {((data.link.alternate_profiles_blurb && data.link.alternate_profiles_blurb.trim()) ||
        (Array.isArray(data.alternate_profiles) && data.alternate_profiles.length > 0)) && (
        <section className="max-w-3xl mx-auto px-6 mt-10">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#cbb96b] mb-2">
              {tr("alt.eyebrow", "Alternate Options")}
            </p>
            {data.link.alternate_profiles_blurb && data.link.alternate_profiles_blurb.trim() && (
              <p className="text-[13px] leading-relaxed text-white/80 whitespace-pre-wrap">
                {data.link.alternate_profiles_blurb}
              </p>
            )}
            {Array.isArray(data.alternate_profiles) && data.alternate_profiles.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px]">
                {data.alternate_profiles.map((alt) => {
                  const href = alt.target_type === 'agent'
                    ? `/agents/${alt.short_id}`
                    : `/club-proposal/${alt.short_id}`;
                  const meta = [alt.position, alt.club].filter(Boolean).join(" · ");
                  return (
                    <li key={alt.short_id}>
                      <a
                        href={href}
                        className="text-[#cbb96b] hover:text-white underline underline-offset-4 decoration-[#cbb96b]/40 hover:decoration-white transition-colors"
                      >
                        {alt.player_name ?? alt.short_id}
                      </a>
                      {meta && <span className="text-white/50"> - {meta}</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* Contact CTAs */}
      <div ref={contactsRef} className="max-w-3xl mx-auto px-6 mt-10 space-y-3">
        {isMandated && (
          <div className="text-center mb-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#cbb96b]/60 bg-[#cbb96b]/[0.12] px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-[#cbb96b]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#cbb96b] shadow-[0_0_8px_rgba(203,185,107,0.8)]" />
              {tr("mandated.badge", "Mandated")}
            </span>
            <p className="mt-2 text-[11px] text-white/55 max-w-md mx-auto">
              {mandatedAgentName
                ? fillTpl(
                    tr("mandated.subtitleExternal", "{agent} is mandated to act on {firstName}'s behalf."),
                    { firstName, agent: mandatedAgentName },
                  )
                : fillTpl(
                    tr("mandated.subtitleNoAgent", "An external agent is mandated to act on {firstName}'s behalf."),
                    { firstName },
                  )}
            </p>
          </div>
        )}
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 text-center mb-1">{tr("contact.discuss", "Discuss further")}</p>
        {isMandated && mandatedAgentWaUrl && (
          <a
            href={mandatedAgentWaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 w-full rounded-2xl px-5 py-4 bg-[#25D366] hover:bg-[#1ebe57] text-white font-semibold shadow-[0_10px_40px_-10px_rgba(37,211,102,0.55)] hover:shadow-[0_14px_50px_-10px_rgba(37,211,102,0.85)] transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              {mandatedAgentLogo ? (
                <img
                  src={mandatedAgentLogo}
                  alt={mandatedAgentName}
                  onError={(e) => ((e.currentTarget.style.display = "none"))}
                  className="h-10 w-10 rounded-full object-cover border-2 border-white/40 bg-white/10"
                />
              ) : (
                <WhatsAppIcon className="h-6 w-6" />
              )}
              <div className="text-left">
                <div className="text-[10px] uppercase tracking-[0.25em] opacity-80">
                  {fillTpl(tr("contact.waMandatedAgent", "WhatsApp {firstName}'s Mandated Agent"), { firstName })}
                </div>
                <div className="text-sm sm:text-base">
                  {mandatedAgentName}{mandatedAgentRole ? ` – ${mandatedAgentRole}` : ""}
                </div>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 opacity-80" />
          </a>
        )}
        {agencyWaUrl && !(isMandated && mandatedAgentWaUrl) && (
          <a
            href={agencyWaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 w-full rounded-2xl px-5 py-4 bg-[#25D366] hover:bg-[#1ebe57] text-white font-semibold shadow-[0_10px_40px_-10px_rgba(37,211,102,0.55)] hover:shadow-[0_14px_50px_-10px_rgba(37,211,102,0.85)] transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              {data.agent_image_url ? (
                <img
                  src={data.agent_image_url}
                  alt={data.agent_name ?? "Agent"}
                  onError={(e) => ((e.currentTarget.style.display = "none"))}
                  className="h-10 w-10 rounded-full object-cover border-2 border-white/40"
                />
              ) : (
                <WhatsAppIcon className="h-6 w-6" />
              )}
              <div className="text-left">
                <div className="text-[10px] uppercase tracking-[0.25em] opacity-80">{fillTpl(
                  isMandated && !mandatedAgentName
                    ? tr("contact.waAgentMandated", "WhatsApp {firstName}'s Mandated Agent")
                    : tr("contact.waAgent", "WhatsApp {firstName}'s Agent"),
                  { firstName }
                )}</div>
                <div className="text-sm sm:text-base">{data.agent_name ?? "Jolon Levene – RISE Football"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FifaLicenceBadge agentName={data.agent_name ?? "Jolon Levene"} />
              <ExternalLink className="h-4 w-4 opacity-80" />
            </div>
          </a>
        )}
        {clubWaUrl && clubContactName && data.link.target_type !== 'agent' && (() => {
          const accent = clubContactAccent;
          const useAccent = !!accent && /^#?[0-9a-fA-F]{3,6}$/.test(accent);
          const bg = useAccent ? (accent!.startsWith("#") ? accent! : `#${accent}`) : null;
          const fg = bg ? readableTextOn(bg) : "#fff";
          const subOpacity = fg === "#000" ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.6)";
          return (
            <a
              href={clubWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={bg ? { backgroundColor: bg, color: fg } : undefined}
              className={
                bg
                  ? "flex items-center justify-between gap-3 w-full rounded-2xl px-5 py-4 font-medium transition-all active:scale-[0.99] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.45)]"
                  : "flex items-center justify-between gap-3 w-full rounded-2xl px-5 py-4 border border-white/20 bg-white/[0.03] text-white font-medium hover:border-white/40 hover:bg-white/[0.06] transition-all active:scale-[0.99]"
              }
            >
              <div className="flex items-center gap-3">
                {clubContactImage ? (
                  <img
                    src={clubContactImage}
                    alt={clubContactName}
                    onError={(e) => ((e.currentTarget.style.display = "none"))}
                    className="h-10 w-10 rounded-full object-cover border-2"
                    style={{ borderColor: bg ? fg + "55" : "rgba(255,255,255,0.4)" }}
                  />
                ) : (
                  <WhatsAppIcon className="h-5 w-5" style={bg ? { color: fg } : undefined} />
                )}
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-[0.25em]" style={{ color: bg ? subOpacity : undefined }}>
                    {tr("contact.waClubContact", "WhatsApp Key Club Contact")}{clubContactRole ? ` – ${clubContactRole}` : ""}
                  </div>
                  <div className="text-sm sm:text-base">
                    {clubContactName}
                    {clubContactClubName ? <span style={{ color: bg ? subOpacity : undefined }} className={bg ? "" : "text-white/50"}> – {clubContactClubName}</span> : null}
                  </div>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 opacity-70" style={bg ? { color: fg } : undefined} />
            </a>
          );
        })()}
      </div>

      <footer className="mt-12 flex items-center justify-center">
        <a
          href={PUBLIC_HOME_URL}
          aria-label={tr("footer.visit", "Visit RISE Football Agency")}
          onClick={(e) => {
            e.preventDefault();
            goToPublicHomepage();
          }}
          className="inline-flex flex-col items-center gap-2 group"
        >
          <img src={riseLogoWhite} alt="RISE Football" className="h-16 md:h-20 w-auto opacity-80 group-hover:opacity-100 transition-opacity" />
          <span className="text-[11px] uppercase tracking-[0.2em] text-white/60 group-hover:text-white/90 transition-colors">
            risefootballagency.com
          </span>
        </a>
      </footer>

      {/* Floating pinned actions - hide once the visitor reaches the contact CTAs */}
      {(() => {
        const tmUrl = (data.club_contact?.transfermarkt_url ?? "").trim();
        const pinnedWaUrl = (isMandated && mandatedAgentWaUrl) ? mandatedAgentWaUrl : agencyWaUrl;
        const pinnedWaTitle = (isMandated && mandatedAgentWaUrl)
          ? `WhatsApp ${mandatedAgentName || "mandated agent"}`
          : `WhatsApp ${data.agent_name ?? "agent"}`;
        if (!tmUrl && !pinnedWaUrl) return null;
        return (
          <div
            className={`fixed inset-x-0 bottom-0 z-40 pointer-events-none transition-opacity duration-300 ${contactsVisible ? "opacity-0" : "opacity-100"}`}
            style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
            aria-hidden={contactsVisible}
          >
            <div className="pointer-events-auto mx-auto flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/70 backdrop-blur-md px-2 py-2 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)]">
              {tmUrl && (
                <a
                  href={tmUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Transfermarkt"
                  className="inline-flex items-center justify-center h-11 w-11 rounded-full text-white"
                  style={{ backgroundColor: "#1A3552" }}
                >
                  {/* Transfermarkt 'TM' mark in their brand blue */}
                  <span className="text-[13px] font-extrabold tracking-tight leading-none">TM</span>
                </a>
              )}
              {pinnedWaUrl && (
                <a
                  href={pinnedWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={pinnedWaTitle}
                  className="inline-flex items-center justify-center h-11 w-11 rounded-full text-white"
                  style={{ backgroundColor: "#25D366" }}
                >
                  <WhatsAppIcon className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
        );
      })()}

    </div>
  );
}

function ProposalCard({
  href, icon, eyebrow, title, subtitle, disabledLabel, internal, openLabel, unavailableLabel, onClick,
}: {
  href: string | null;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  subtitle: string;
  disabledLabel?: string;
  internal?: boolean;
  openLabel?: string;
  unavailableLabel?: string;
  onClick?: () => void;
}) {
  const disabled = (!href && !onClick) || !!disabledLabel;
  const inner = (
    <div className={`relative h-full rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 transition-all duration-300 ${disabled ? "opacity-50" : "hover:border-[#cbb96b]/60 hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_rgba(203,185,107,0.45)]"}`}>
      <div className="flex items-start justify-between">
        <div className="h-12 w-12 rounded-xl bg-[#cbb96b]/10 text-[#cbb96b] flex items-center justify-center">{icon}</div>
      </div>
      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-white/55 leading-snug">{subtitle}</p>
      <div className="mt-4 flex items-center gap-2 text-xs text-[#cbb96b]">
        {disabled ? (disabledLabel ?? unavailableLabel ?? "Unavailable") : <>{openLabel ?? "Open"} <ExternalLink className="h-3.5 w-3.5" /></>}
      </div>
    </div>
  );
  if (disabled) return <div className="block min-h-[180px]">{inner}</div>;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full min-h-[180px] text-left">{inner}</button>
    );
  }
  if (internal) {
    return <Link to={href!} className="block min-h-[180px]">{inner}</Link>;
  }
  return (
    <a href={href!} target="_blank" rel="noopener noreferrer" className="block min-h-[180px]">{inner}</a>
  );
}

function CroppedHeroControls({ videoRef }: { videoRef: React.MutableRefObject<HTMLVideoElement | null> }) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => {
      setCurrent(v.currentTime);
      if (v.duration > 0) setProgress((v.currentTime / v.duration) * 100);
    };
    const onMeta = () => setDuration(v.duration || 0);
    const onVol = () => setMuted(v.muted);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("durationchange", onMeta);
    v.addEventListener("volumechange", onVol);
    setPlaying(!v.paused);
    setMuted(v.muted);
    if (v.duration) setDuration(v.duration);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("durationchange", onMeta);
      v.removeEventListener("volumechange", onVol);
    };
  }, [videoRef]);

  const fmtTime = (s: number) => {
    if (!isFinite(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };
  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
  };
  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const pct = parseFloat(e.target.value);
    v.currentTime = (pct / 100) * v.duration;
  };
  const goFullscreen = () => {
    const v = videoRef.current as any;
    if (!v) return;
    const req = v.requestFullscreen || v.webkitRequestFullscreen || v.webkitEnterFullscreen;
    if (req) req.call(v);
  };

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 px-3 pb-2 pt-6 bg-gradient-to-t from-black/85 via-black/55 to-transparent text-white"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={progress}
        onChange={seek}
        className="w-full h-1 accent-[#cbb96b] cursor-pointer"
        aria-label="Seek"
      />
      <div className="mt-1.5 flex items-center gap-3">
        <button type="button" onClick={togglePlay} className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition" aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>
        <button type="button" onClick={toggleMute} className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition" aria-label={muted ? "Unmute" : "Mute"}>
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <span className="text-[11px] tabular-nums text-white/80">{fmtTime(current)} / {fmtTime(duration)}</span>
        <div className="flex-1" />
        <button type="button" onClick={goFullscreen} className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition" aria-label="Fullscreen">
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function KeyDetailsCard({
  entry,
  age,
  tr,
  items,
}: {
  entry: PlayerEntry;
  age: number | null;
  tr?: (key: string, en: string) => string;
  items?: KeyDetailItem[];
}) {
  const player = entry.player;
  const T = (k: string, en: string) => (tr ? tr(k, en) : en);
  const tiles = (items && items.length ? items : DEFAULT_KEY_DETAILS);

  const nationalityFlag = player?.nationality ? getCountryFlagUrl(player.nationality) : null;
  const leagueFlag =
    getLeagueFlagUrl(player?.league) ??
    (entry.player_club_country ? getCountryFlagUrl(entry.player_club_country) : null) ??
    (player?.nationality ? getCountryFlagUrl(player.nationality) : null);
  const clubLogo = entry.player_club_image_url;

  const fmtMoney = (n: number | null | undefined, ccy: string | null | undefined): string => {
    if (!n || !isFinite(n)) return "-";
    const code = (ccy || "GBP").toUpperCase();
    try {
      return new Intl.NumberFormat("en-GB", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(n);
    } catch {
      return `${code} ${n.toLocaleString("en-GB")}`;
    }
  };
  const fmtDate = (s: string | null | undefined): string => {
    if (!s) return "-";
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  };

  const renderTile = (item: KeyDetailItem, idx: number): React.ReactNode => {
    // Unified tile: always renders an UPPERCASE label row at the bottom so
    // every key detail shares the same vertical rhythm.
    const Tile = ({
      visual,
      secondary,
      label,
    }: {
      visual: React.ReactNode;
      secondary?: string | null;
      label: string;
    }) => (
      <div className="rounded-xl bg-white/[0.03] border border-white/5 px-3 py-4 flex flex-col items-center justify-between text-center h-full min-h-[120px] gap-2">
        <div className="flex-1 w-full flex items-center justify-center px-1">{visual}</div>
        {secondary ? (
          <p className="text-[11px] text-white/85 leading-tight break-words">
            {secondary}
          </p>
        ) : null}
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/55 leading-tight">
          {label}
        </p>
      </div>
    );
    const TextValue = ({ value }: { value: string | React.ReactNode }) => (
      <span className="text-3xl sm:text-4xl font-semibold leading-none text-white break-words">
        {value || "-"}
      </span>
    );

    switch (item.kind) {
      case "club":
        return (
          <Tile
            key={idx}
            label={T("key.club", "Club")}
            secondary={player?.club ?? "-"}
            visual={clubLogo ? (
              <img src={clubLogo} alt={player?.club ?? ""} onError={(e) => ((e.currentTarget.style.display = "none"))} className="h-12 w-12 object-contain" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-lg font-semibold">{(player?.club ?? "?")[0]}</div>
            )}
          />
        );
      case "age":
        return (
          <Tile
            key={idx}
            label={T("key.yearsOld", "Years old")}
            visual={<TextValue value={age != null ? String(age) : "-"} />}
          />
        );
      case "nationality":
        return (
          <Tile
            key={idx}
            label={T("key.nationality", "Nationality")}
            secondary={player?.nationality ?? "-"}
            visual={nationalityFlag ? (
              <img src={nationalityFlag} alt={player?.nationality ?? ""} onError={(e) => ((e.currentTarget.style.display = "none"))} className="h-10 w-14 object-cover rounded-sm shadow-[0_2px_8px_rgba(0,0,0,0.4)]" />
            ) : (
              <div className="h-10 w-14 rounded-sm bg-white/10" />
            )}
          />
        );
      case "league":
        return (
          <Tile
            key={idx}
            label={T("key.league", "League")}
            secondary={player?.league ?? "-"}
            visual={leagueFlag ? (
              <img src={leagueFlag} alt={player?.league ?? ""} onError={(e) => ((e.currentTarget.style.display = "none"))} className="h-10 w-14 object-cover rounded-sm shadow-[0_2px_8px_rgba(0,0,0,0.4)]" />
            ) : (
              <div className="h-10 w-14 rounded-sm bg-white/10" />
            )}
          />
        );
      case "position":
        return <Tile key={idx} label={T("key.position", "Position")} visual={<TextValue value={player?.position ?? "-"} />} />;
      case "contract_expiry":
        return <Tile key={idx} label={T("key.contractExpiry", "Contract expiry")} visual={<TextValue value={fmtDate(player?.contract_end_date)} />} />;
      case "current_salary":
        return <Tile key={idx} label={T("key.currentSalary", "Current salary")} visual={<TextValue value={fmtMoney(player?.current_salary_annual, player?.preferred_currency)} />} />;
      case "salary_expectations":
        return <Tile key={idx} label={T("key.salaryExpectations", "Salary expectations")} visual={<TextValue value={item.value ?? ""} />} />;
      case "transfer_fee":
        return <Tile key={idx} label={T("key.transferFee", "Transfer fee")} visual={<TextValue value={item.value ?? ""} />} />;
      case "contract_expiry_override":
        return <Tile key={idx} label={T("key.contractExpiry", "Contract expiry")} visual={<TextValue value={item.value ?? ""} />} />;
      case "height":
        return <Tile key={idx} label={T("key.height", "Height")} visual={<TextValue value={item.value ?? ""} />} />;
      case "preferred_foot":
        return <Tile key={idx} label={T("key.preferredFoot", "Preferred foot")} visual={<TextValue value={item.value ?? ""} />} />;
      case "status":
        return <Tile key={idx} label={T("key.status", "Status")} visual={<TextValue value={item.value ?? ""} />} />;
      case "custom":
        return <Tile key={idx} label={(item.label ?? "").trim() || T("key.custom", "Detail")} visual={<TextValue value={item.value ?? ""} />} />;
      default:
        return null;
    }
  };

  // Adaptive grid: 2 cols on mobile, scale up so 5+ tiles still look balanced.
  // Use a static map so Tailwind's JIT keeps the classes.
  const count = tiles.length;
  const colMap: Record<number, string> = {
    1: "sm:grid-cols-1",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-4",
  };
  const desktopCols = count <= 4 ? colMap[count] : count % 3 === 0 ? "sm:grid-cols-3" : "sm:grid-cols-4";

  return (
    <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-3 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-2 pt-1 pb-2">
        <h3 className="text-[10px] uppercase tracking-[0.3em] text-[#cbb96b]">{T("key.title", "Key Details")}</h3>
        {entry.transfermarkt_url ? (
          <a
            href={entry.transfermarkt_url}
            target="_blank"
            rel="noopener noreferrer"
            title="View on Transfermarkt"
            className="inline-flex items-center gap-1.5 px-3 py-1 border border-white/10 bg-[#0a3853]/20 hover:bg-[#0a3853]/45 hover:border-[#1f7a8c]/50 text-[10px] uppercase tracking-[0.18em] text-white/55 hover:text-white/85 opacity-70 hover:opacity-100 transition"
            style={{
              clipPath: "polygon(8px 0, 100% 0, 100% 100%, 0 100%, 0 8px)",
              WebkitClipPath: "polygon(8px 0, 100% 0, 100% 100%, 0 100%, 0 8px)",
            }}
          >
            <span
              aria-hidden="true"
              className="inline-flex items-center justify-center h-4 w-4 rounded-sm bg-[#1f7a8c] text-white text-[8px] font-bold leading-none"
            >
              TM
            </span>
            <span>Transfermarkt</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
      <div className={`grid grid-cols-2 ${desktopCols} gap-2 auto-rows-fr`}>
        {tiles.map((it, i) => renderTile(it, i))}
      </div>
    </div>
  );
}

// Optional Stars-derived sections
function SectionShell({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 overflow-hidden">
      <h3 className="text-[10px] uppercase tracking-[0.3em] text-[#cbb96b] mb-3">{title}</h3>
      {children}
    </div>
  );
}

function FormBannerCard({ cfg, rows, titleTemplate }: { cfg: { window_size: number; stats: any[] }; rows: any[]; titleTemplate?: string }) {
  const { getGradeForScore, hasThresholds } = useFormGradeConfigs();
  const isPct = (k: string) => k.endsWith("_pct") || k.endsWith("%");
  const SUM = new Set(["goals", "assists", "xg", "xa"]);
  const STAT_LABELS: Record<string, string> = {
    goals: "Goals",
    assists: "Assists",
    xg: "xG",
    xa: "xA",
    shots: "Shots",
    shots_on_target: "Shots on Target",
    key_passes: "Key Passes",
    chances_created: "Chances Created",
    passes_total_per90: "Passes /90",
    pass_accuracy_pct: "Pass %",
    successful_dribbles_per90: "Dribbles /90",
    dribble_success_pct: "Dribble %",
    tackles_per90: "Tackles /90",
    tackle_success_pct: "Tackle %",
    interceptions_per90: "Interceptions /90",
    duels_won_pct: "Duels Won %",
    aerial_duels_won_pct: "Aerial %",
    minutes_played: "Minutes",
  };
  const humanize = (k: string) =>
    STAT_LABELS[k] ??
    k
      .replace(/_per90/gi, " /90")
      .replace(/_pct$/i, " %")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  const num = (row: any, key: string): number | null => {
    const fs = row.fixture_stats || {};
    const ss = row.striker_stats || {};
    const v = fs[key] ?? ss[key] ?? row[key];
    if (v == null) return null;
    const n = typeof v === "number" ? v : parseFloat(v);
    return isNaN(n) ? null : n;
  };
  const fmt = (v: number | null, k: string) =>
    v == null ? "-" : isPct(k) ? `${Math.round(v)}%` : v % 1 === 0 ? v.toString() : v.toFixed(2);
  const STRONG_GRADES = new Set(["B", "B+", "A-", "A", "A+", "A*"]);
  const isStrong = (key: string, v: number | null) => {
    if (v == null) return false;
    const mk = normalizeStatKey(key);
    if (!hasThresholds(mk)) return false;
    return STRONG_GRADES.has(getGradeForScore(mk, v).grade);
  };
  const items = (cfg.stats || []).map((s: any) => {
    const key = typeof s === "string" ? s : s.key;
    const label = humanize(key);
    if (typeof s !== "string" && s.mode === "manual") {
      const n = parseFloat((s.value ?? "").toString().trim());
      return { key, label, value: isNaN(n) ? null : n };
    }
    const vals = rows.map((r) => num(r, key)).filter((v): v is number => v != null);
    if (vals.length === 0) return { key, label, value: null };
    const sum = vals.reduce((a, b) => a + b, 0);
    return { key, label, value: SUM.has(key) ? sum : sum / vals.length };
  });
  if (items.length === 0) return null;
  // Lay 5 items out as 3+2 centred; otherwise one even row.
  const useSplit = items.length === 5;
  const cols = Math.min(items.length, 4);
  const formTitle = (titleTemplate ?? "Form · Last {n}").replace("{n}", String(cfg.window_size));
  return (
    <SectionShell title={formTitle} eyebrow="04">
      {useSplit ? (
        <div className="space-y-2">
          {[items.slice(0, 3), items.slice(3, 5)].map((row, ri) => (
            <div
              key={ri}
              className="grid gap-2 mx-auto"
              style={{
                gridTemplateColumns: `repeat(${row.length}, minmax(0,1fr))`,
                maxWidth: row.length === 2 ? "66%" : "100%",
              }}
            >
              {row.map((it) => (
                <div
                  key={it.key}
                  className={`rounded-lg p-2 flex flex-col items-center text-center min-w-0 border ${
                    isStrong(it.key, it.value)
                      ? "bg-emerald-400/[0.08] border-emerald-400/30 shadow-[0_0_18px_-2px_rgba(74,222,128,0.45)]"
                      : "bg-white/[0.03] border-white/5"
                  }`}
                >
                  <div className="text-2xl font-semibold text-[#cbb96b] leading-none">{fmt(it.value, it.key)}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-white/60 leading-tight break-words whitespace-normal">
                    {it.label}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}
        >
          {items.map((it) => (
            <div
              key={it.key}
              className={`rounded-lg p-2 flex flex-col items-center text-center min-w-0 border ${
                isStrong(it.key, it.value)
                  ? "bg-emerald-400/[0.08] border-emerald-400/30 shadow-[0_0_18px_-2px_rgba(74,222,128,0.45)]"
                  : "bg-white/[0.03] border-white/5"
              }`}
            >
              <div className="text-2xl font-semibold text-[#cbb96b] leading-none">{fmt(it.value, it.key)}</div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-white/60 leading-tight break-words whitespace-normal">
                {it.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

function InNumbersCard({ stats, title }: { stats: any[]; title?: string }) {
  const count = stats.length;
  const cols = count >= 4 ? "sm:grid-cols-4" : count === 3 ? "sm:grid-cols-3" : count === 2 ? "sm:grid-cols-2" : "sm:grid-cols-1";
  return (
    <SectionShell title={title ?? "In Numbers"} eyebrow="05">
      <div className={`grid grid-cols-2 ${cols} gap-2.5 auto-rows-fr items-stretch`}>
        {stats.map((s, i) => (
          <div
            key={i}
            className="h-full min-h-[140px] rounded-xl bg-white/[0.03] border border-white/5 px-3 py-4 flex flex-col items-center justify-center text-center min-w-0 gap-1.5"
          >
            <div className="text-3xl sm:text-4xl font-semibold text-[#cbb96b] leading-none tabular-nums">
              {s.value}
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/75 leading-tight break-words whitespace-normal">
              {s.label}
            </div>
            {s.description && (
              <p className="text-[11px] text-white/55 leading-snug break-words whitespace-normal">
                {s.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function SeasonStatsCard({ stats, title }: { stats: any[]; title?: string }) {
  const prettify = (s: string) =>
    (s ?? "")
      .replace(/_per90/gi, " /90")
      .replace(/_pct$/i, " %")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <SectionShell title={title ?? "Season Stats"} eyebrow="06">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stats.map((s, i) => (
          <div key={i} className="rounded-lg bg-white/[0.03] border border-white/5 p-3 flex flex-col items-center text-center min-w-0">
            <div className="text-2xl font-semibold text-[#cbb96b] leading-none">{s.value || "0"}</div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-white/60 leading-tight break-words whitespace-normal">{prettify(s.header)}</div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function StrengthsCard({ data, title }: { data: any; title?: string }) {
  const items: string[] = Array.isArray(data)
    ? data.map((x) => (typeof x === "string" ? x : x?.title ?? x?.label ?? "")).filter(Boolean)
    : typeof data === "string"
    ? data.split(/\n+/).filter(Boolean)
    : [];
  if (items.length === 0) return null;
  return (
    <SectionShell title={title ?? "Strengths & Play Style"} eyebrow="07">
      <ul className="space-y-2">
        {items.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-white/85">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#cbb96b] flex-shrink-0" />
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

function MatchByMatchCard({
  analyses,
  position,
  excludeAnalysisIds,
  defaultCategory: defaultCategoryProp,
  statOrders,
  gameOrder,
}: {
  analyses: NonNullable<PlayerEntry["match_by_match"]>;
  position: string | null;
  excludeAnalysisIds?: Set<string>;
  defaultCategory?: string | null;
  statOrders?: Record<string, string[]> | null;
  gameOrder?: string[] | null;
}) {
  const { getGradeForScore, hasThresholds } = useFormGradeConfigs();
  const STRONG_GRADES = new Set(["B", "B+", "A-", "A", "A+", "A*"]);
  // Outreach-specific Match by Match categories — fixed order driven by
  // user-defined stat lists. Overridable per-player via statOrders.
  const STAT_LABELS: Record<string, string> = {
    goals: "Goals", assists: "Assists",
    xg: "xG", xa: "xA",
    npxg_per90: "npxG /90", xa_per90: "xA /90",
    xGChain_per90: "xG Chain /90",
    xt_via_live_passes_per90: "xT (live passes) /90",
    xt_via_prog_carries_per90: "xT (prog carries) /90",
    shots: "Shots",
    shots_on_target_per90: "Shots on Target /90",
    shots_on_target_pct: "On Target %",
    total_shots_per90: "Shots /90",
    shots_inside_box_per90: "Shots in Box /90",
    shots_outside_box_per90: "Shots out of Box /90",
    self_created_shots_per90: "Self-Created Shots /90",
    touches_in_opp_box_per90: "Touches in Box /90",
    key_passes_per90: "Key Passes /90",
    pass_accuracy_pct: "Pass %",
    accurate_passes_per90: "Accurate Passes /90",
    forward_passes_per90: "Forward Passes /90",
    passes_into_final_3rd_per90: "Passes into Final 3rd /90",
    progressive_passes_per90: "Progressive Passes /90",
    passes_in_opp_half_per90: "Passes in Opp Half /90",
    passes_in_own_half_per90: "Passes in Own Half /90",
    long_ball_accuracy_pct: "Long Ball %",
    accurate_long_balls_per90: "Long Balls /90",
    accurate_crosses_per90: "Crosses /90",
    cross_accuracy_pct: "Cross %",
    dribble_success_pct: "Dribble %",
    successful_dribbles_per90: "Dribbles /90",
    dribble_attempts_per90: "Dribbles Att. /90",
    carries_into_final_3rd_per90: "Carries into Final 3rd /90",
    progressive_carries_per90: "Progressive Carries /90",
    fouls_drawn_per90: "Fouls Drawn /90",
    tackles_won_per90: "Tackles /90",
    tackles_won_pct: "Tackles Won %",
    interceptions_per90: "Interceptions /90",
    clearances_per90: "Clearances /90",
    duels_won_pct: "Duels Won %",
    duels_won_per90: "Duels Won /90",
    aerials_won_pct: "Aerial Duels Won %",
    aerials_won_per90: "Aerials Won /90",
  };
  const DEFAULT_CAT_ORDER: Record<string, string[]> = {
    Possession: [
      "successful_dribbles_per90","dribble_attempts_per90","dribble_success_pct",
      "progressive_carries_per90","xt_via_prog_carries_per90","carries_into_final_3rd_per90",
      "touches_in_opp_box_per90","fouls_drawn_per90",
    ],
    Passing: [
      "assists","xa","key_passes_per90","xt_via_live_passes_per90",
      "progressive_passes_per90","passes_into_final_3rd_per90","forward_passes_per90",
      "passes_in_opp_half_per90","accurate_passes_per90",
      "accurate_long_balls_per90","accurate_crosses_per90","pass_accuracy_pct",
      "long_ball_accuracy_pct","cross_accuracy_pct",
    ],
    Shooting: [
      "goals","npxg_per90","shots_on_target_per90","shots_on_target_pct",
      "self_created_shots_per90","total_shots_per90","shots_outside_box_per90","shots_inside_box_per90",
    ],
    Defending: [
      "tackles_won_pct","aerials_won_pct","duels_won_pct","tackles_won_per90",
      "aerials_won_per90","duels_won_per90","clearances_per90","interceptions_per90",
    ],
  };
  const humanize = (k: string) =>
    STAT_LABELS[k] ??
    k.replace(/_per90/gi, " /90").replace(/_pct$/i, " %").replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  const categories = useMemo(() => {
    const cats = ["Possession", "Passing", "Shooting", "Defending"] as const;
    return cats.map((cat) => {
      const override = statOrders?.[cat];
      const keys = Array.isArray(override) && override.length > 0 ? override : DEFAULT_CAT_ORDER[cat];
      return { category: cat, metrics: keys.map((k) => ({ key: k, label: humanize(k) })) };
    });
  }, [statOrders]);
  const preferred = (defaultCategoryProp ?? "").trim();
  const defaultCat =
    (preferred && categories.find((c) => c.category === preferred)?.category) ||
    categories.find((c) => c.category === "Passing")?.category ||
    categories[0]?.category ||
    "";

  const sorted = useMemo(() => {
    const base = [...analyses].filter((a) => !excludeAnalysisIds || !excludeAnalysisIds.has(a.id));
    return rankGames(base, gameOrder ?? null);
  }, [analyses, excludeAnalysisIds, gameOrder]);

  const fmtVal = (raw: any, key: string): string => {
    if (raw === null || raw === undefined || raw === "") return "-";
    const n = Number(raw);
    if (!Number.isFinite(n)) return String(raw);
    if (/_pct$|_percentage$/i.test(key)) return `${n.toFixed(0)}%`;
    if (Number.isInteger(n)) return n.toString();
    return n.toFixed(2);
  };

  const getVal = (a: any, key: string): any => {
    if (a?.fixture_stats && a.fixture_stats[key] != null) return a.fixture_stats[key];
    if (a?.striker_stats && a.striker_stats[key] != null) return a.striker_stats[key];
    return null;
  };

  const gradeFor = (raw: any, key: string, mins: number | null): string | null => {
    if (raw === null || raw === undefined || raw === "") return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    // Try the key directly, then strip the `_per90` suffix so per-90 keys
    // map back to their base metric configs (e.g. `npxg_per90` → `npxg`).
    const candidates = [key, key.replace(/_per90$/i, "")];
    let mk: string | null = null;
    for (const c of candidates) {
      const norm = normalizeStatKey(c);
      if (hasThresholds(norm)) { mk = norm; break; }
    }
    if (!mk) return null;
    // Form thresholds are per-90; scale single-match counts to per-90 unless already a %.
    const isPct = /_pct$|_percentage$/i.test(key);
    const scaled = isPct || !mins || mins <= 0 ? n : (n / mins) * 90;
    const g = getGradeForScore(mk, scaled).grade;
    return STRONG_GRADES.has(g) ? g : null;
  };

  // Ovular pill styling that deepens with the grade. Top tier (A*) uses Rise Gold.
  const pillClass = (grade: string | null): string => {
    if (!grade) return "";
    switch (grade) {
      case "B":
      case "B-":
        return "bg-emerald-500/15 text-emerald-200 shadow-[0_0_10px_-2px_rgba(16,185,129,0.45)]";
      case "B+":
        return "bg-emerald-500/25 text-emerald-100 shadow-[0_0_12px_-2px_rgba(16,185,129,0.6)]";
      case "A-":
        return "bg-emerald-500/40 text-white shadow-[0_0_14px_-2px_rgba(16,185,129,0.75)]";
      case "A":
        return "bg-emerald-600/60 text-white shadow-[0_0_18px_-2px_rgba(5,150,105,0.85)]";
      case "A+":
        return "bg-emerald-700/75 text-white shadow-[0_0_20px_-2px_rgba(4,120,87,0.95)]";
      case "A*":
        return "bg-[#C6A332]/85 text-black shadow-[0_0_22px_-2px_rgba(198,163,50,0.95)]";
      default:
        return "";
    }
  };

  const fmtDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
    } catch {
      return iso;
    }
  };

  return (
    <SectionShell title="Match-By-Match Data" eyebrow="06">
      <Tabs defaultValue={defaultCat}>
        <TabsList className="bg-white/[0.04] border border-white/10 flex flex-wrap h-auto">
          {categories.map((c) => (
            <TabsTrigger
              key={c.category}
              value={c.category}
              className="text-[11px] data-[state=active]:bg-[#cbb96b]/20 data-[state=active]:text-[#cbb96b]"
            >
              {c.category}
            </TabsTrigger>
          ))}
        </TabsList>
        {categories.map((c) => (
          <TabsContent key={c.category} value={c.category} className="mt-3">
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-[11px] min-w-[640px]">
                <thead>
                  <tr className="bg-white/[0.04] text-white/60">
                    <th className="text-left px-2.5 py-2 font-medium sticky left-0 bg-white/[0.04] z-10">Match</th>
                    {c.metrics.map((m) => (
                      <th key={m.key} className="text-center px-2.5 py-2 font-medium whitespace-nowrap">
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((a) => (
                    <tr key={a.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                      <td className="px-2.5 py-1.5 sticky left-0 bg-black/80 backdrop-blur z-10">
                        <div className="flex items-center gap-2">
                          {a.opponent_logo ? (
                            <img
                              src={a.opponent_logo}
                              alt={a.opponent ?? ""}
                              onError={(e) => ((e.currentTarget.style.display = "none"))}
                              className="h-5 w-5 object-contain flex-shrink-0"
                            />
                          ) : null}
                          <div>
                            <div className="text-white/90 whitespace-nowrap">
                              {a.opponent || "-"}
                            </div>
                            {a.result ? (
                              <div className="text-white/40 text-[10px] whitespace-nowrap">
                                {a.result}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      {c.metrics.map((m) => {
                        const g = gradeFor(getVal(a, m.key), m.key, a.minutes_played ?? null);
                        const pill = pillClass(g);
                        return (
                          <td
                            key={m.key}
                            className="px-2.5 py-1.5 text-center tabular-nums whitespace-nowrap"
                          >
                            {pill ? (
                              <span className={`inline-block rounded-full px-2.5 py-0.5 ${pill}`}>
                                {fmtVal(getVal(a, m.key), m.key)}
                              </span>
                            ) : (
                              <span className="text-white/80">
                                {fmtVal(getVal(a, m.key), m.key)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </SectionShell>
  );
}

function RemainingVideosCard({
  videos,
  title,
}: {
  videos: { id: string; name: string; videoUrl: string; logoUrl: string | null; venue?: string | null }[];
  title: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [carouselStart, setCarouselStart] = useState(0);
  const [mobileVisibleRows, setMobileVisibleRows] = useState(1);
  const active = videos[Math.min(activeIdx, videos.length - 1)] ?? videos[0];
  if (!active) return null;
  const PAGE = 12;
  const useCarousel = videos.length > PAGE;
  const start = useCarousel ? ((carouselStart % videos.length) + videos.length) % videos.length : 0;
  const visible = useCarousel
    ? Array.from({ length: PAGE }, (_, i) => ({ video: videos[(start + i) % videos.length], index: (start + i) % videos.length }))
    : videos.map((video, index) => ({ video, index }));
  const mobileVisibleCount = Math.min(videos.length, 8 * mobileVisibleRows);
  const mobileRemaining = videos.length - mobileVisibleCount;
  return (
    <SectionShell title={title} eyebrow="05">
      <div>
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden border-4 md:border-[6px] border-[#cbb96b]">
          <video
            key={active.videoUrl}
            src={active.videoUrl}
            controls
            playsInline
            autoPlay
            muted
            preload="metadata"
            className="absolute inset-0 w-full h-full object-contain"
          />
          {videos.length > 1 && (
            <div className="hidden md:block absolute bottom-[39px] left-1/2 -translate-x-1/2 z-10 w-full px-2 pointer-events-none">
              <div className="relative flex items-center justify-center gap-2">
                {useCarousel && (
                  <button
                    type="button"
                    onClick={() => setCarouselStart((s) => s - PAGE)}
                    className="pointer-events-auto flex-shrink-0 w-8 h-8 rounded-full bg-[#cbb96b]/20 hover:bg-[#cbb96b]/30 border border-[#cbb96b]/40 flex items-center justify-center text-white transition-colors"
                    aria-label="Previous logos"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <div className="flex gap-1 md:gap-2 pointer-events-auto">
                {visible.map(({ video: v, index: i }) => {
                  const isActive = i === activeIdx;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setActiveIdx(i)}
                      title={v.name || `Highlight ${i + 1}`}
                      className={`relative flex-shrink-0 w-10 h-10 rounded border transition-all overflow-hidden bg-background/90 backdrop-blur-sm ${
                        isActive
                          ? "border-[#cbb96b] scale-110"
                          : "border-[#cbb96b]/20 hover:border-[#cbb96b]/50"
                      }`}
                    >
                      {v.logoUrl ? (
                        <img
                          src={v.logoUrl}
                          alt=""
                          onError={(e) => (e.currentTarget.style.display = "none")}
                          className="w-full h-full object-contain p-0.5"
                          loading="eager"
                        />
                      ) : null}
                      {(v.venue === "H" || v.venue === "A") && (
                        <span className="absolute bottom-0 right-0 leading-none text-[8px] md:text-[9px] font-bebas font-bold text-[#cbb96b] bg-black/70 px-[2px] rounded-tl">
                          {v.venue}
                        </span>
                      )}
                    </button>
                  );
                })}
                </div>
                {useCarousel && (
                  <button
                    type="button"
                    onClick={() => setCarouselStart((s) => s + PAGE)}
                    className="pointer-events-auto flex-shrink-0 w-8 h-8 rounded-full bg-[#cbb96b]/20 hover:bg-[#cbb96b]/30 border border-[#cbb96b]/40 flex items-center justify-center text-white transition-colors"
                    aria-label="Next logos"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        {videos.length > 1 && (
          <div className="md:hidden mt-2 grid grid-cols-8 gap-1.5">
            {videos.slice(0, mobileVisibleCount).map((v, i) => {
              const isActive = i === activeIdx;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  title={v.name || `Highlight ${i + 1}`}
                  className={`relative aspect-square rounded border transition-all overflow-hidden bg-background/90 ${
                    isActive ? "border-[#cbb96b] scale-110" : "border-[#cbb96b]/30"
                  }`}
                >
                  {v.logoUrl ? (
                    <img
                      src={v.logoUrl}
                      alt=""
                      onError={(e) => (e.currentTarget.style.display = "none")}
                      className="w-full h-full object-contain p-0.5"
                      loading="eager"
                    />
                  ) : null}
                  {(v.venue === "H" || v.venue === "A") && (
                    <span className="absolute bottom-0 right-0 leading-none text-[8px] font-bebas font-bold text-[#cbb96b] bg-black/70 px-[2px] rounded-tl">
                      {v.venue}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        {mobileRemaining > 0 && (
          <button
            type="button"
            onClick={() => setMobileVisibleRows((r) => r + 1)}
            className="md:hidden mt-2 w-full text-xs font-bebas uppercase tracking-wider text-[#cbb96b] border border-[#cbb96b]/40 rounded py-1.5 hover:bg-[#cbb96b]/10"
          >
            See more ({mobileRemaining})
          </button>
        )}
      </div>
    </SectionShell>
  );
}