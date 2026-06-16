import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, Video, FileBadge2, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { calculateAge } from "@/lib/ageUtils";
import { getCountryFlagUrl, getLeagueFlagUrl } from "@/lib/countryFlags";
import blackMarbleBg from "@/assets/black-marble-smudged.png";
import riseLogoWhite from "@/assets/RISEWhite.png";
import jolonFifaLicenseAsset from "@/assets/jolon-fifa-license.png.asset.json";

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
  } | null;
  position_slot: string | null;
  fit_recommendation: string | null;
  sort_order: number;
  stars_url: string | null;
  highlights_url: string | null;
  proof_of_representation_url: string | null;
  player_club_image_url: string | null;
  player_club_country: string | null;
  first_highlight_url: string | null;
  top_stats: any | null;
  season_stats: any | null;
  strengths_and_play_style: any | null;
  form_config: { window_size: number; stats: any[] } | null;
  form_analyses: any[] | null;
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
    target_type?: 'club' | 'agent';
    agent_name?: string | null;
    agent_logo_url?: string | null;
    language?: string | null;
    translations?: { ui?: Record<string, string>; fits?: Record<string, string> } | null;
  };
  club: { id: string; club_name: string; country: string | null; image_url: string | null } | null;
  players: PlayerEntry[];
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const contactsRef = useRef<HTMLDivElement | null>(null);
  const [contactsVisible, setContactsVisible] = useState(false);
  const [heroBlobUrl, setHeroBlobUrl] = useState<string | null>(null);
  const [heroPrefetchFailed, setHeroPrefetchFailed] = useState(false);
  const [heroReady, setHeroReady] = useState(false);

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
    data.players.forEach((e) => {
      const s = (e.position_slot ?? "").trim();
      if (s && s.toLowerCase() !== "all") set.add(s);
    });
    return Array.from(set);
  }, [data]);

  const filteredPlayers = useMemo(() => {
    if (!data) return [] as PlayerEntry[];
    if (!activeSlot) return data.players;
    return data.players.filter((e) => (e.position_slot || "All") === activeSlot);
  }, [data, activeSlot]);

  useEffect(() => { setActiveIndex(0); }, [activeSlot]);

  const current = filteredPlayers[activeIndex] ?? filteredPlayers[0];

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !current?.first_highlight_url) return;
    video.currentTime = 0;
    tryAutoplay(video);
  }, [current?.first_highlight_url]);

  // Fully prefetch the hero highlight to a blob URL so playback can run
  // entirely from memory without mid-stream re-buffering. We accept a longer
  // up-front wait to guarantee seamless playback.
  useEffect(() => {
    const url = current?.first_highlight_url;
    setHeroReady(false);
    setHeroPrefetchFailed(false);
    setHeroBlobUrl((prev) => {
      if (prev) {
        try { URL.revokeObjectURL(prev); } catch {}
      }
      return null;
    });
    if (!url) return;
    let cancelled = false;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(url, { signal: controller.signal, cache: "force-cache" });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        const obj = URL.createObjectURL(blob);
        setHeroBlobUrl(obj);
      } catch (e) {
        if (cancelled) return;
        // Fall back to direct streaming with a stricter readiness gate.
        setHeroPrefetchFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [current?.first_highlight_url]);

  // Revoke the blob URL on unmount.
  useEffect(() => {
    return () => {
      if (heroBlobUrl) {
        try { URL.revokeObjectURL(heroBlobUrl); } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const wa = (data.whatsapp_number ?? "").replace(/[^0-9]/g, "");
  const agencyWaUrl = wa ? `https://wa.me/${wa}` : null;

  // Prefer club-level contact directory; fall back to per-link fields
  const clubContactName = data.club_contact?.contact_name ?? data.link.club_contact_name;
  const clubContactPhoneRaw = data.club_contact?.contact_phone ?? data.link.club_contact_phone;
  const clubContactAccent = data.club_contact?.contact_accent ?? data.link.club_contact_accent;
  const clubContactImage = data.club_contact?.contact_image_url ?? null;
  const clubContactRole = data.club_contact?.contact_role ?? data.link.club_contact_role;
  const clubContactClubName = data.club_contact?.contact_club_name ?? null;
  const clubContactClubLogo = data.club_contact?.contact_club_logo_url ?? null;
  const clubPhone = (clubContactPhoneRaw ?? "").replace(/[^0-9]/g, "");
  const clubWaUrl = clubPhone ? `https://wa.me/${clubPhone}` : null;

  const hasMultiple = data.players.length > 1;
  const fitTextEn = (current.fit_recommendation ?? "").trim();
  const fitText = fitTextEn ? trFit(current.player?.id, fitTextEn) : "";
  const age = player?.age ?? calculateAge(player?.date_of_birth ?? null);
  const firstName = (player?.name ?? "").trim().split(/\s+/)[0] || "the player";
  const nationalityFlag = player?.nationality ? getCountryFlagUrl(player.nationality) : null;
  const playerClubLogo = current.player_club_image_url;
  const preparedFor =
    (data.link.prepared_for_name ?? "").trim() || (club?.club_name ? `${club.club_name}${club.country ? `, ${club.country}` : ""}` : "");

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
      {/* Header */}
      <header className="relative px-6 pt-[max(24px,env(safe-area-inset-top))] pb-6 text-center border-b border-white/5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,_rgba(203,185,107,0.18),_transparent_60%)]" />
        {club?.image_url ? (
          <img
            src={club.image_url}
            alt={club.club_name}
            onError={(e) => ((e.currentTarget.style.display = "none"))}
            className="relative mx-auto h-24 sm:h-28 w-auto object-contain drop-shadow-[0_4px_24px_rgba(203,185,107,0.4)]"
          />
        ) : (
          <div className="relative mx-auto h-24 sm:h-28 w-24 sm:w-28 rounded-full bg-white/5 flex items-center justify-center text-3xl">
            {club?.club_name?.[0] ?? "?"}
          </div>
        )}
        <div className="mt-6 flex flex-col items-center gap-4">
          <p className="text-[11px] uppercase tracking-[0.35em] text-[#cbb96b]">{tr("hdr.presents", "Rise Football Agency presents")}</p>
          <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">
            {hasMultiple
              ? fillTpl(tr("hdr.players", "{count} players"), { count: data.players.length })
              : (player?.name ?? tr("hdr.player", "Player"))}
          </h1>
          {preparedFor && (
            <p className="text-xs text-white/40">{tr("hdr.for", "For")} <span className="text-white/85">{preparedFor}</span></p>
          )}
        </div>
      </header>

      {/* Position chips */}
      {hasMultiple && slots.length > 1 && (
        <div className="max-w-3xl mx-auto px-6 mt-6 flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => setActiveSlot(null)}
            className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wider border transition ${activeSlot === null ? "bg-[#cbb96b] text-black border-[#cbb96b]" : "border-white/15 text-white/70 hover:border-white/40"}`}
          >
            {tr("chip.all", "All")}
          </button>
          {slots.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSlot(s)}
              className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wider border transition ${activeSlot === s ? "bg-[#cbb96b] text-black border-[#cbb96b]" : "border-white/15 text-white/70 hover:border-white/40"}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Carousel controls */}
      {filteredPlayers.length > 1 && (
        <div className="max-w-3xl mx-auto px-6 mt-4 flex items-center justify-between gap-3">
          <button onClick={() => setActiveIndex((i) => (i - 1 + filteredPlayers.length) % filteredPlayers.length)} className="h-9 w-9 rounded-full border border-white/15 flex items-center justify-center hover:border-[#cbb96b]/60">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 text-center text-xs text-white/60">
            <span className="text-white/40">{activeIndex + 1} / {filteredPlayers.length}</span>
          </div>
          <button onClick={() => setActiveIndex((i) => (i + 1) % filteredPlayers.length)} className="h-9 w-9 rounded-full border border-white/15 flex items-center justify-center hover:border-[#cbb96b]/60">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Key details — moved above the hero video */}
      <section className="max-w-3xl mx-auto px-6 mt-4">
        <KeyDetailsCard entry={current} age={age} tr={tr} />
      </section>

      {/* Hero — first Stars highlight video, falls back to player image */}
      {(current.first_highlight_url || player?.image_url) && (
        <div className="max-w-3xl mx-auto px-6 mt-6">
          <div className="aspect-[16/9] overflow-hidden rounded-2xl border border-white/10 bg-black">
            {current.first_highlight_url ? (
              heroBlobUrl || heroPrefetchFailed ? (
                <video
                  ref={videoRef}
                  key={heroBlobUrl ?? current.first_highlight_url}
                  src={heroBlobUrl ?? current.first_highlight_url}
                  className="w-full h-full object-contain bg-black"
                  controls
                  playsInline
                  preload="auto"
                  onLoadedMetadata={(e) => {
                    e.currentTarget.currentTime = 0;
                    if (heroBlobUrl) {
                      setHeroReady(true);
                      tryAutoplay(e.currentTarget);
                    }
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
                      if (covered && !heroReady) {
                        setHeroReady(true);
                        tryAutoplay(v);
                      }
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-black">
                  <Loader2 className="h-8 w-8 animate-spin text-[#cbb96b]" />
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                    {tr("video.preparing", "Preparing video")}
                  </p>
                </div>
              )
            ) : (
              <img src={player!.image_url!} alt={player?.name ?? ""} className="w-full h-full object-cover" />
            )}
          </div>
        </div>
      )}

      {/* Fit & Recommendation — full width above cards */}
      {fitText && (
        <section className="max-w-3xl mx-auto px-6 mt-6">
          <div className="rounded-2xl border border-[#cbb96b]/30 bg-gradient-to-br from-[#cbb96b]/[0.08] to-white/[0.02] p-5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#cbb96b]">{tr("fit.title", "Fit & Recommendation")}</p>
            <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-white/85 whitespace-pre-wrap">{fitText}</p>
          </div>
        </section>
      )}

      {/* Cards */}
      <section className={`max-w-3xl mx-auto px-6 mt-6 grid grid-cols-1 gap-4 ${data.link.target_type === 'agent' ? '' : 'sm:grid-cols-2'}`}>
        <ProposalCard
          href={current.stars_url}
          icon={<Video className="h-6 w-6" />}
          eyebrow="01"
          title={tr("card.videoTitle", "Video & Data")}
          subtitle={tr("card.videoSubtitle", "Full profile, highlights and statistics")}
          openLabel={tr("card.open", "Open")}
          unavailableLabel={tr("card.unavailable", "Unavailable")}
        />
        {data.link.target_type !== 'agent' && (
          <ProposalCard
            href={
              current.proof_of_representation_url && data.link.short_id && player?.id
                ? `/club-proposal/${data.link.short_id}/proof/${player.id}`
                : null
            }
            icon={<FileBadge2 className="h-6 w-6" />}
            eyebrow="02"
            title={tr("card.proofTitle", "Proof of Representation")}
            subtitle={tr("card.proofSubtitle", "Signed agreement with Rise Football Agency")}
            disabledLabel={current.proof_of_representation_url ? undefined : tr("card.availableOnRequest", "Available on request")}
            openLabel={tr("card.open", "Open")}
            unavailableLabel={tr("card.unavailable", "Unavailable")}
            internal
          />
        )}
      </section>

      {/* Optional Stars-derived sections (per-link toggles) */}
      {data.link.show_form && current.form_config && current.form_analyses && (
        <section className="max-w-3xl mx-auto px-6 mt-4">
          <FormBannerCard cfg={current.form_config} rows={current.form_analyses} titleTemplate={tr("form.titlePrefix", "Form · Last {n}")} />
        </section>
      )}
      {data.link.show_in_numbers && Array.isArray(current.top_stats) && current.top_stats.length > 0 && (
        <section className="max-w-3xl mx-auto px-6 mt-4">
          <InNumbersCard stats={current.top_stats} title={tr("section.inNumbers", "In Numbers")} />
        </section>
      )}
      {data.link.show_season_stats && Array.isArray(current.season_stats) && current.season_stats.length > 0 && (
        <section className="max-w-3xl mx-auto px-6 mt-4">
          <SeasonStatsCard stats={current.season_stats} title={tr("section.seasonStats", "Season Stats")} />
        </section>
      )}
      {data.link.show_strengths && current.strengths_and_play_style && (
        <section className="max-w-3xl mx-auto px-6 mt-4">
          <StrengthsCard data={current.strengths_and_play_style} title={tr("section.strengths", "Strengths & Play Style")} />
        </section>
      )}

      {/* Contact CTAs */}
      <div ref={contactsRef} className="max-w-3xl mx-auto px-6 mt-10 space-y-3">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 text-center mb-1">{tr("contact.discuss", "Discuss further")}</p>
        {agencyWaUrl && (
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
                <div className="text-[10px] uppercase tracking-[0.25em] opacity-80">{fillTpl(tr("contact.waAgent", "WhatsApp {firstName}'s Agent"), { firstName })}</div>
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

      {/* Floating pinned actions — hide once the visitor reaches the contact CTAs */}
      {(() => {
        const tmUrl = (data.club_contact?.transfermarkt_url ?? "").trim();
        if (!tmUrl && !agencyWaUrl) return null;
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
              {agencyWaUrl && (
                <a
                  href={agencyWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`WhatsApp ${data.agent_name ?? "agent"}`}
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
  href, icon, eyebrow, title, subtitle, disabledLabel, internal, openLabel, unavailableLabel,
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
}) {
  const disabled = !href || !!disabledLabel;
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
  if (internal) {
    return <Link to={href!} className="block min-h-[180px]">{inner}</Link>;
  }
  return (
    <a href={href!} target="_blank" rel="noopener noreferrer" className="block min-h-[180px]">{inner}</a>
  );
}

function KeyDetailsCard({
  entry,
  age,
  tr,
}: {
  entry: PlayerEntry;
  age: number | null;
  tr?: (key: string, en: string) => string;
}) {
  const player = entry.player;
  const nationalityFlag = player?.nationality ? getCountryFlagUrl(player.nationality) : null;
  // League flag: derive country from the league name itself (e.g. "Czech Liga" → cz).
  // Fall back to the player's own club country, then their nationality.
  const leagueFlag =
    getLeagueFlagUrl(player?.league) ??
    (entry.player_club_country ? getCountryFlagUrl(entry.player_club_country) : null) ??
    (player?.nationality ? getCountryFlagUrl(player.nationality) : null);
  const clubLogo = entry.player_club_image_url;

  return (
    <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-3 overflow-hidden">
      <h3 className="px-2 pt-1 pb-2 text-[10px] uppercase tracking-[0.3em] text-[#cbb96b]">{tr ? tr("key.title", "Key Details") : "Key Details"}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Club */}
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 flex flex-col items-center text-center">
          <div className="h-12 flex items-center justify-center">
            {clubLogo ? (
              <img
                src={clubLogo}
                alt={player?.club ?? ""}
                onError={(e) => ((e.currentTarget.style.display = "none"))}
                className="h-12 w-12 object-contain"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-lg font-semibold">
                {(player?.club ?? "?")[0]}
              </div>
            )}
          </div>
          <p className="mt-2 text-[11px] text-white/80 leading-tight">{player?.club ?? "—"}</p>
        </div>

        {/* Age */}
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 flex flex-col items-center text-center">
          <div className="h-12 flex items-center justify-center">
            <span className="text-4xl font-semibold leading-none text-white">{age != null ? age : "—"}</span>
          </div>
          <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-white/60">{tr ? tr("key.yearsOld", "Years old") : "Years old"}</p>
        </div>

        {/* Nationality */}
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 flex flex-col items-center text-center">
          <div className="h-12 flex items-center justify-center">
            {nationalityFlag ? (
              <img
                src={nationalityFlag}
                alt={player?.nationality ?? ""}
                onError={(e) => ((e.currentTarget.style.display = "none"))}
                className="h-10 w-14 object-cover rounded-sm shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
              />
            ) : (
              <div className="h-10 w-14 rounded-sm bg-white/10" />
            )}
          </div>
          <p className="mt-2 text-[11px] text-white/80 leading-tight">{player?.nationality ?? "—"}</p>
        </div>

        {/* League */}
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 flex flex-col items-center text-center">
          <div className="h-12 flex items-center justify-center">
            {leagueFlag ? (
              <img
                src={leagueFlag}
                alt={player?.league ?? ""}
                onError={(e) => ((e.currentTarget.style.display = "none"))}
                className="h-10 w-14 object-cover rounded-sm shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
              />
            ) : (
              <div className="h-10 w-14 rounded-sm bg-white/10" />
            )}
          </div>
          <p className="mt-2 text-[11px] text-white/80 leading-tight">{player?.league ?? "—"}</p>
        </div>
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
    v == null ? "—" : isPct(k) ? `${Math.round(v)}%` : v % 1 === 0 ? v.toString() : v.toFixed(2);
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
                <div key={it.key} className="rounded-lg bg-white/[0.03] border border-white/5 p-2 flex flex-col items-center text-center min-w-0">
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
            <div key={it.key} className="rounded-lg bg-white/[0.03] border border-white/5 p-2 flex flex-col items-center text-center min-w-0">
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
  return (
    <SectionShell title={title ?? "In Numbers"} eyebrow="05">
      <div className="space-y-4">
        {stats.map((s, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="text-3xl font-semibold text-[#cbb96b] leading-none min-w-[3rem]">{s.value}</div>
            <div className="flex-1">
              <div className="text-[11px] uppercase tracking-wider text-white/70">{s.label}</div>
              {s.description && <p className="mt-1 text-xs text-white/60 leading-relaxed">{s.description}</p>}
            </div>
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