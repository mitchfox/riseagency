import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Video, Film, FileBadge2, Sparkles, MessageCircle, ExternalLink } from "lucide-react";

interface Payload {
  link: { id: string; short_id: string; fit_recommendation: string | null; created_at: string };
  player: { id: string; name: string; position: string | null; age: number | null; nationality: string | null; image_url: string | null; club: string | null; league: string | null } | null;
  club: { id: string; club_name: string; country: string | null; image_url: string | null } | null;
  defaults: { stars_url_override: string | null; highlights_url: string | null; proof_of_representation_url: string | null };
  whatsapp_number: string | null;
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

export default function ClubOutreachProposal() {
  const { shortId } = useParams<{ shortId: string }>();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!shortId) return;
    (async () => {
      try {
        const url = `https://qwethimbtaamlhbajmal.supabase.co/functions/v1/get-club-outreach?short_id=${encodeURIComponent(shortId)}`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        if (!res.ok) {
          setErr(res.status === 404 ? "This proposal could not be found." : "Failed to load proposal.");
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

  const starsUrl = useMemo(() => {
    if (!data) return null;
    if (data.defaults.stars_url_override) return data.defaults.stars_url_override;
    if (!data.player?.name) return null;
    return `https://risefootballagency.com/stars/${slugify(data.player.name)}`;
  }, [data]);

  const highlightsUrl = data?.defaults.highlights_url ?? null;
  const proofUrl = data?.defaults.proof_of_representation_url ?? null;
  const fitText = (data?.link.fit_recommendation ?? "").trim();

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#C6A332]" />
      </div>
    );
  }
  if (err || !data) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center text-white p-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Proposal unavailable</h1>
          <p className="text-white/60">{err ?? "This link is no longer active."}</p>
        </div>
      </div>
    );
  }

  const player = data.player;
  const club = data.club;
  const wa = (data.whatsapp_number ?? "").replace(/[^0-9]/g, "");
  const waText = encodeURIComponent(
    `Hi, I just viewed the Rise Football Agency proposal for ${player?.name ?? ""}${club?.club_name ? ` (${club.club_name})` : ""}. I'd like to discuss further.`
  );
  const waUrl = wa ? `https://wa.me/${wa}?text=${waText}` : null;

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-[max(24px,env(safe-area-inset-bottom))]">
      {/* Header */}
      <header className="px-6 pt-[max(24px,env(safe-area-inset-top))] pb-6 text-center border-b border-white/5">
        {club?.image_url ? (
          <img
            src={club.image_url}
            alt={club.club_name}
            className="mx-auto h-24 sm:h-28 w-auto object-contain drop-shadow-[0_4px_24px_rgba(198,163,50,0.25)]"
          />
        ) : (
          <div className="mx-auto h-24 sm:h-28 w-24 sm:w-28 rounded-full bg-white/5 flex items-center justify-center text-3xl">
            {club?.club_name?.[0] ?? "?"}
          </div>
        )}
        <p className="mt-5 text-[11px] uppercase tracking-[0.35em] text-[#C6A332]">Rise Football Agency presents</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold">{player?.name ?? "Player"}</h1>
        <p className="mt-2 text-sm text-white/60">
          {[player?.position, player?.age ? `${player.age} yrs` : null, player?.nationality, player?.club].filter(Boolean).join(" • ")}
        </p>
        {club?.club_name && (
          <p className="mt-3 text-xs text-white/40">Prepared for <span className="text-white/80">{club.club_name}</span>{club.country ? `, ${club.country}` : ""}</p>
        )}
      </header>

      {/* Hero image */}
      {player?.image_url && (
        <div className="max-w-3xl mx-auto px-6 mt-6">
          <div className="aspect-[16/9] overflow-hidden rounded-2xl border border-white/10">
            <img src={player.image_url} alt={player.name} className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* Cards */}
      <section className="max-w-3xl mx-auto px-6 mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ProposalCard
          href={starsUrl}
          icon={<Video className="h-6 w-6" />}
          eyebrow="01"
          title="Video & Data"
          subtitle="Full profile, highlights and statistics"
        />
        <ProposalCard
          href={highlightsUrl}
          icon={<Film className="h-6 w-6" />}
          eyebrow="02"
          title="Full Season Highlights"
          subtitle="Every meaningful moment from the season"
          disabledLabel={highlightsUrl ? undefined : "Coming soon"}
        />
        <ProposalCard
          href={proofUrl}
          icon={<FileBadge2 className="h-6 w-6" />}
          eyebrow="03"
          title="Proof of Representation"
          subtitle="Signed agreement with Rise Football Agency"
          disabledLabel={proofUrl ? undefined : "Available on request"}
        />
        <FitCard fitText={fitText} />
      </section>

      {/* WhatsApp CTA */}
      {waUrl && (
        <div className="max-w-3xl mx-auto px-6 mt-10">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-center gap-3 w-full rounded-2xl px-6 py-5 bg-[#25D366] text-black font-semibold text-base sm:text-lg shadow-[0_10px_40px_-10px_rgba(37,211,102,0.6)] hover:shadow-[0_14px_50px_-10px_rgba(37,211,102,0.85)] transition-all active:scale-[0.99]"
          >
            <MessageCircle className="h-6 w-6" />
            Discuss {player?.name?.split(" ")[0] ?? "this player"} on WhatsApp
          </a>
          <p className="text-center text-xs text-white/40 mt-3">Tap to open a conversation directly with our agency team.</p>
        </div>
      )}

      <footer className="mt-12 text-center text-[11px] uppercase tracking-[0.3em] text-white/30">
        Rise Football Agency
      </footer>
    </div>
  );
}

function ProposalCard({
  href,
  icon,
  eyebrow,
  title,
  subtitle,
  disabledLabel,
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
        <div className="h-12 w-12 rounded-xl bg-[#C6A332]/10 text-[#C6A332] flex items-center justify-center">
          {icon}
        </div>
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
    <a href={href!} target="_blank" rel="noopener noreferrer" className="block min-h-[180px]">
      {inner}
    </a>
  );
}

function FitCard({ fitText }: { fitText: string }) {
  const [open, setOpen] = useState(false);
  const hasText = fitText.length > 0;
  return (
    <button
      type="button"
      onClick={() => hasText && setOpen((v) => !v)}
      className={`text-left sm:col-span-2 relative rounded-2xl border border-white/10 bg-gradient-to-br from-[#C6A332]/[0.08] to-white/[0.02] p-5 transition-all duration-300 ${hasText ? "hover:border-[#C6A332]/60 hover:shadow-[0_20px_60px_-20px_rgba(198,163,50,0.45)]" : "opacity-60"}`}
    >
      <div className="flex items-start justify-between">
        <div className="h-12 w-12 rounded-xl bg-[#C6A332]/10 text-[#C6A332] flex items-center justify-center">
          <Sparkles className="h-6 w-6" />
        </div>
        <span className="text-[10px] tracking-[0.3em] text-white/30">04</span>
      </div>
      <h3 className="mt-5 text-lg font-semibold">Fit & Recommendation</h3>
      <p className="mt-1 text-sm text-white/55 leading-snug">{hasText ? (open ? "Tap to collapse" : "Why this player fits your club") : "No personalised note added"}</p>
      {open && hasText && (
        <div className="mt-4 text-sm leading-relaxed text-white/85 whitespace-pre-wrap">{fitText}</div>
      )}
    </button>
  );
}