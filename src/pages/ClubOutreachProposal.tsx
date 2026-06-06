import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Video, Film, FileBadge2, MessageCircle, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { calculateAge } from "@/lib/ageUtils";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import blackMarbleBg from "@/assets/black-marble-smudged.png";

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
  };
  club: { id: string; club_name: string; country: string | null; image_url: string | null } | null;
  players: PlayerEntry[];
  whatsapp_number: string | null;
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
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(43,96%,56%)]" />
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
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,_rgba(251,189,35,0.18),_transparent_60%)]" />
        {club?.image_url ? (
          <img src={club.image_url} alt={club.club_name} className="relative mx-auto h-24 sm:h-28 w-auto object-contain drop-shadow-[0_4px_24px_rgba(251,189,35,0.4)]" />
        ) : (
          <div className="relative mx-auto h-24 sm:h-28 w-24 sm:w-28 rounded-full bg-white/5 flex items-center justify-center text-3xl">
            {club?.club_name?.[0] ?? "?"}
          </div>
        )}
        <p className="mt-5 text-[11px] uppercase tracking-[0.35em] text-[hsl(43,96%,56%)]">Rise Football Agency presents</p>
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
            className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wider border transition ${activeSlot === null ? "bg-[hsl(43,96%,56%)] text-black border-[hsl(43,96%,56%)]" : "border-white/15 text-white/70 hover:border-white/40"}`}
          >
            All
          </button>
          {slots.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSlot(s)}
              className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wider border transition ${activeSlot === s ? "bg-[hsl(43,96%,56%)] text-black border-[hsl(43,96%,56%)]" : "border-white/15 text-white/70 hover:border-white/40"}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Carousel controls */}
      {filteredPlayers.length > 1 && (
        <div className="max-w-3xl mx-auto px-6 mt-4 flex items-center justify-between gap-3">
          <button onClick={() => setActiveIndex((i) => (i - 1 + filteredPlayers.length) % filteredPlayers.length)} className="h-9 w-9 rounded-full border border-white/15 flex items-center justify-center hover:border-[hsl(43,96%,56%)]/60">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 text-center text-xs text-white/60">
            <span className="text-white/90 font-medium">{player?.name}</span>
            <span className="ml-2 text-white/40">{activeIndex + 1} / {filteredPlayers.length}</span>
          </div>
          <button onClick={() => setActiveIndex((i) => (i + 1) % filteredPlayers.length)} className="h-9 w-9 rounded-full border border-white/15 flex items-center justify-center hover:border-[hsl(43,96%,56%)]/60">
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
          <div className="rounded-2xl border border-[hsl(43,96%,56%)]/30 bg-gradient-to-br from-[hsl(43,96%,56%)]/[0.08] to-white/[0.02] p-5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[hsl(43,96%,56%)]">Fit & Recommendation</p>
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
        <KeyDetailsCard player={player} age={age} />
      </section>

      {/* Contact CTAs */}
      <div className="max-w-3xl mx-auto px-6 mt-10 space-y-3">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 text-center mb-1">Discuss further</p>
        {agencyWaUrl && (
          <a
            href={agencyWaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 w-full rounded-2xl px-5 py-4 bg-[hsl(43,96%,56%)] text-black font-semibold shadow-[0_10px_40px_-10px_rgba(251,189,35,0.6)] hover:shadow-[0_14px_50px_-10px_rgba(251,189,35,0.85)] transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5" />
              <div className="text-left">
                <div className="text-[10px] uppercase tracking-[0.25em] opacity-70">Agent contact</div>
                <div className="text-sm sm:text-base">Rise Football Agency</div>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 opacity-70" />
          </a>
        )}
        {clubWaUrl && data.link.club_contact_name && (
          <a
            href={clubWaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 w-full rounded-2xl px-5 py-4 border border-white/20 bg-white/[0.03] text-white font-medium hover:border-white/40 hover:bg-white/[0.06] transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-white/70" />
              <div className="text-left">
                <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">Your club contact</div>
                <div className="text-sm sm:text-base">
                  {data.link.club_contact_name}
                  {data.link.club_contact_role ? <span className="text-white/50"> — {data.link.club_contact_role}</span> : null}
                </div>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-white/40" />
          </a>
        )}
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
    <div className={`relative h-full rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 transition-all duration-300 ${disabled ? "opacity-50" : "hover:border-[hsl(43,96%,56%)]/60 hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_rgba(251,189,35,0.45)]"}`}>
      <div className="flex items-start justify-between">
        <div className="h-12 w-12 rounded-xl bg-[hsl(43,96%,56%)]/10 text-[hsl(43,96%,56%)] flex items-center justify-center">{icon}</div>
        <span className="text-[10px] tracking-[0.3em] text-white/30">{eyebrow}</span>
      </div>
      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-white/55 leading-snug">{subtitle}</p>
      <div className="mt-4 flex items-center gap-2 text-xs text-[hsl(43,96%,56%)]">
        {disabled ? (disabledLabel ?? "Unavailable") : <>Open <ExternalLink className="h-3.5 w-3.5" /></>}
      </div>
    </div>
  );
  if (disabled) return <div className="block min-h-[180px]">{inner}</div>;
  return (
    <a href={href!} target="_blank" rel="noopener noreferrer" className="block min-h-[180px]">{inner}</a>
  );
}

function KeyDetailsCard({ player, age }: { player: PlayerEntry["player"]; age: number | null }) {
  const rows: { label: string; value: string | null }[] = [
    { label: "Nationality", value: player?.nationality ?? null },
    { label: "Age", value: age != null ? `${age}` : null },
    { label: "Position", value: player?.position ?? null },
    { label: "Club", value: player?.club ?? null },
    { label: "League", value: player?.league ?? null },
  ].filter((r) => !!r.value) as { label: string; value: string }[];

  return (
    <div className="relative h-full rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 min-h-[180px]">
      <div className="flex items-start justify-between">
        <div className="h-12 w-12 rounded-xl bg-[hsl(43,96%,56%)]/10 text-[hsl(43,96%,56%)] flex items-center justify-center">
          <IdCard className="h-6 w-6" />
        </div>
        <span className="text-[10px] tracking-[0.3em] text-white/30">04</span>
      </div>
      <h3 className="mt-5 text-lg font-semibold">Key Details</h3>
      <dl className="mt-3 divide-y divide-white/5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between py-1.5 text-sm">
            <dt className="text-white/45 text-xs uppercase tracking-wider">{r.label}</dt>
            <dd className="text-white/90 text-right">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}