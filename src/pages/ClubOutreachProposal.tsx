import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Video, Film, FileBadge2, MessageCircle, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { calculateAge } from "@/lib/ageUtils";
import { getCountryFlagUrl, getLeagueFlagUrl } from "@/lib/countryFlags";
import blackMarbleBg from "@/assets/black-marble-smudged.png";

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
  };
  club: { id: string; club_name: string; country: string | null; image_url: string | null } | null;
  players: PlayerEntry[];
  whatsapp_number: string | null;
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

export default function ClubOutreachProposal() {
  const { shortId } = useParams<{ shortId: string }>();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

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

  const slots = useMemo(() => {
    if (!data) return [] as string[];
    const set = new Set<string>();
    data.players.forEach((e) => set.add(e.position_slot || "All"));
    return Array.from(set);
  }, [data]);

  const filteredPlayers = useMemo(() => {
    if (!data) return [] as PlayerEntry[];
    if (!activeSlot) return data.players;
    return data.players.filter((e) => (e.position_slot || "All") === activeSlot);
  }, [data, activeSlot]);

  useEffect(() => { setActiveIndex(0); }, [activeSlot]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#C6A332]" />
      </div>
    );
  }
  if (err || !data || data.players.length === 0) {
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
  const current = filteredPlayers[activeIndex] ?? filteredPlayers[0];
  const player = current.player;

  const wa = (data.whatsapp_number ?? "").replace(/[^0-9]/g, "");
  const playerNames = data.players.map((e) => e.player?.name).filter(Boolean).join(", ");
  const waText = encodeURIComponent(
    `Hi, I just viewed the Rise Football Agency proposal${playerNames ? ` for ${playerNames}` : ""}${club?.club_name ? ` (${club.club_name})` : ""}. I'd like to discuss further.`
  );
  const agencyWaUrl = wa ? `https://wa.me/${wa}?text=${waText}` : null;

  const clubPhone = (data.link.club_contact_phone ?? "").replace(/[^0-9]/g, "");
  const clubWaUrl = clubPhone ? `https://wa.me/${clubPhone}` : null;

  const hasMultiple = data.players.length > 1;
  const fitText = (current.fit_recommendation ?? "").trim();
  const age = player?.age ?? calculateAge(player?.date_of_birth ?? null);

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
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,_rgba(198,163,50,0.18),_transparent_60%)]" />
        {club?.image_url ? (
          <img src={club.image_url} alt={club.club_name} className="relative mx-auto h-24 sm:h-28 w-auto object-contain drop-shadow-[0_4px_24px_rgba(198,163,50,0.4)]" />
        ) : (
          <div className="relative mx-auto h-24 sm:h-28 w-24 sm:w-28 rounded-full bg-white/5 flex items-center justify-center text-3xl">
            {club?.club_name?.[0] ?? "?"}
          </div>
        )}
        <p className="mt-5 text-[11px] uppercase tracking-[0.35em] text-[#C6A332]">Rise Football Agency presents</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold">
          {hasMultiple ? `${data.players.length} players` : (player?.name ?? "Player")}
        </h1>
        {club?.club_name && (
          <p className="mt-3 text-xs text-white/40">Prepared for <span className="text-white/80">{club.club_name}</span>{club.country ? `, ${club.country}` : ""}</p>
        )}
      </header>

      {/* Position chips */}
      {hasMultiple && slots.length > 1 && (
        <div className="max-w-3xl mx-auto px-6 mt-6 flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => setActiveSlot(null)}
            className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wider border transition ${activeSlot === null ? "bg-[#C6A332] text-black border-[#C6A332]" : "border-white/15 text-white/70 hover:border-white/40"}`}
          >
            All
          </button>
          {slots.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSlot(s)}
              className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wider border transition ${activeSlot === s ? "bg-[#C6A332] text-black border-[#C6A332]" : "border-white/15 text-white/70 hover:border-white/40"}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Carousel controls */}
      {filteredPlayers.length > 1 && (
        <div className="max-w-3xl mx-auto px-6 mt-4 flex items-center justify-between gap-3">
          <button onClick={() => setActiveIndex((i) => (i - 1 + filteredPlayers.length) % filteredPlayers.length)} className="h-9 w-9 rounded-full border border-white/15 flex items-center justify-center hover:border-[#C6A332]/60">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 text-center text-xs text-white/60">
            <span className="text-white/90 font-medium">{player?.name}</span>
            <span className="ml-2 text-white/40">{activeIndex + 1} / {filteredPlayers.length}</span>
          </div>
          <button onClick={() => setActiveIndex((i) => (i + 1) % filteredPlayers.length)} className="h-9 w-9 rounded-full border border-white/15 flex items-center justify-center hover:border-[#C6A332]/60">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Single-player name strip (when only one) */}
      {!hasMultiple && player && (
        <div className="max-w-3xl mx-auto px-6 mt-4 text-center">
          <p className="text-sm text-white/60">
            {[player.position, age ? `${age} yrs` : null, player.nationality, player.club].filter(Boolean).join(" • ")}
          </p>
        </div>
      )}

      {/* Hero image */}
      {player?.image_url && (
        <div className="max-w-3xl mx-auto px-6 mt-6">
          <div className="aspect-[16/9] overflow-hidden rounded-2xl border border-white/10">
            <img src={player.image_url} alt={player.name} className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* Fit & Recommendation — full width above cards */}
      {fitText && (
        <section className="max-w-3xl mx-auto px-6 mt-6">
          <div className="rounded-2xl border border-[#C6A332]/30 bg-gradient-to-br from-[#C6A332]/[0.08] to-white/[0.02] p-5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#C6A332]">Fit & Recommendation</p>
            <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-white/85 whitespace-pre-wrap">{fitText}</p>
          </div>
        </section>
      )}

      {/* Cards */}
      <section className="max-w-3xl mx-auto px-6 mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ProposalCard
          href={current.stars_url}
          icon={<Video className="h-6 w-6" />}
          eyebrow="01"
          title="Video & Data"
          subtitle="Full profile, highlights and statistics"
        />
        <ProposalCard
          href={current.highlights_url}
          icon={<Film className="h-6 w-6" />}
          eyebrow="02"
          title="Full Season Highlights"
          subtitle="Every meaningful moment from the season"
          disabledLabel={current.highlights_url ? undefined : "Coming soon"}
        />
        <ProposalCard
          href={current.proof_of_representation_url}
          icon={<FileBadge2 className="h-6 w-6" />}
          eyebrow="03"
          title="Proof of Representation"
          subtitle="Signed agreement with Rise Football Agency"
          disabledLabel={current.proof_of_representation_url ? undefined : "Available on request"}
        />
        <KeyDetailsCard player={player} age={age} club={club} />
      </section>

      {/* Contact CTAs */}
      <div className="max-w-3xl mx-auto px-6 mt-10 space-y-3">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 text-center mb-1">Discuss further</p>
        {agencyWaUrl && (
          <a
            href={agencyWaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 w-full rounded-2xl px-5 py-4 bg-[#25D366] hover:bg-[#1ebe57] text-white font-semibold shadow-[0_10px_40px_-10px_rgba(37,211,102,0.55)] hover:shadow-[0_14px_50px_-10px_rgba(37,211,102,0.85)] transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <WhatsAppIcon className="h-6 w-6" />
              <div className="text-left">
                <div className="text-[10px] uppercase tracking-[0.25em] opacity-80">WhatsApp the Agent</div>
                <div className="text-sm sm:text-base">Jolon Levene – RISE Football</div>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 opacity-80" />
          </a>
        )}
        {clubWaUrl && data.link.club_contact_name && (() => {
          const accent = data.link.club_contact_accent;
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
                <WhatsAppIcon className="h-5 w-5" style={bg ? { color: fg } : undefined} />
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-[0.25em]" style={{ color: bg ? subOpacity : undefined }}>Your club contact</div>
                  <div className="text-sm sm:text-base">
                    {data.link.club_contact_name}
                    {data.link.club_contact_role ? <span style={{ color: bg ? subOpacity : undefined }} className={bg ? "" : "text-white/50"}> – {data.link.club_contact_role}</span> : null}
                  </div>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 opacity-70" style={bg ? { color: fg } : undefined} />
            </a>
          );
        })()}
      </div>

      <footer className="mt-12 text-center text-[11px] uppercase tracking-[0.3em] text-white/30">
        Rise Football Agency
      </footer>
    </div>
  );
}

function ProposalCard({
  href, icon, eyebrow, title, subtitle, disabledLabel,
}: {
  href: string | null;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  subtitle: string;
  disabledLabel?: string;
}) {
  const disabled = !href || !!disabledLabel;
  const inner = (
    <div className={`relative h-full rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 transition-all duration-300 ${disabled ? "opacity-50" : "hover:border-[#C6A332]/60 hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_rgba(198,163,50,0.45)]"}`}>
      <div className="flex items-start justify-between">
        <div className="h-12 w-12 rounded-xl bg-[#C6A332]/10 text-[#C6A332] flex items-center justify-center">{icon}</div>
        <span className="text-[10px] tracking-[0.3em] text-white/30">{eyebrow}</span>
      </div>
      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-white/55 leading-snug">{subtitle}</p>
      <div className="mt-4 flex items-center gap-2 text-xs text-[#C6A332]">
        {disabled ? (disabledLabel ?? "Unavailable") : <>Open <ExternalLink className="h-3.5 w-3.5" /></>}
      </div>
    </div>
  );
  if (disabled) return <div className="block min-h-[180px]">{inner}</div>;
  return (
    <a href={href!} target="_blank" rel="noopener noreferrer" className="block min-h-[180px]">{inner}</a>
  );
}

function KeyDetailsCard({
  player,
  age,
  club,
}: {
  player: PlayerEntry["player"];
  age: number | null;
  club: Payload["club"];
}) {
  const nationalityFlag = player?.nationality ? getCountryFlagUrl(player.nationality) : null;
  const leagueCountry = club?.country ?? player?.nationality ?? null;
  const leagueFlag = leagueCountry ? getCountryFlagUrl(leagueCountry) : null;

  return (
    <div className="relative h-full rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-3 min-h-[260px] sm:min-h-[280px] overflow-hidden">
      <span className="absolute top-3 right-4 text-[10px] tracking-[0.3em] text-white/30">04</span>
      <h3 className="px-2 pt-1 pb-2 text-[10px] uppercase tracking-[0.3em] text-[#C6A332]">Key Details</h3>
      <div className="grid grid-cols-2 gap-2 h-[calc(100%-2.25rem)]">
        {/* Club */}
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 flex flex-col items-center justify-center text-center">
          {club?.image_url ? (
            <img src={club.image_url} alt={club.club_name} className="h-12 w-12 object-contain" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-lg font-semibold">
              {(player?.club ?? club?.club_name ?? "?")[0]}
            </div>
          )}
          <p className="mt-2 text-[11px] text-white/80 leading-tight line-clamp-2">
            {player?.club ?? club?.club_name ?? "—"}
          </p>
        </div>

        {/* Age */}
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 flex flex-col items-center justify-center text-center">
          <span className="text-5xl font-semibold leading-none text-white">
            {age != null ? age : "—"}
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-[0.25em] text-white/50">Years old</span>
        </div>

        {/* Nationality */}
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 flex flex-col items-center justify-center text-center">
          {nationalityFlag ? (
            <img src={nationalityFlag} alt={player?.nationality ?? ""} className="h-10 w-14 object-cover rounded-sm shadow-[0_2px_8px_rgba(0,0,0,0.4)]" />
          ) : (
            <div className="h-10 w-14 rounded-sm bg-white/10" />
          )}
          <p className="mt-2 text-[11px] text-white/80 leading-tight line-clamp-2">
            {player?.nationality ?? "—"}
          </p>
        </div>

        {/* League */}
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 flex flex-col items-center justify-center text-center">
          {leagueFlag ? (
            <img src={leagueFlag} alt={leagueCountry ?? ""} className="h-10 w-14 object-cover rounded-sm shadow-[0_2px_8px_rgba(0,0,0,0.4)]" />
          ) : (
            <div className="h-10 w-14 rounded-sm bg-white/10" />
          )}
          <p className="mt-2 text-[11px] text-white/80 leading-tight line-clamp-2">
            {player?.league ?? "—"}
          </p>
        </div>
      </div>
    </div>
  );
}