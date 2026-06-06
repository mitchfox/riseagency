import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, ArrowLeft, ExternalLink } from "lucide-react";

export default function ClubOutreachProof() {
  const { shortId, playerId } = useParams<{ shortId: string; playerId: string }>();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!shortId || !playerId) return;
    let revoke: string | null = null;
    (async () => {
      try {
        const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const url = `https://qwethimbtaamlhbajmal.supabase.co/functions/v1/get-club-outreach?short_id=${encodeURIComponent(shortId)}`;
        const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
        if (!res.ok) throw new Error("Could not load proposal");
        const json = await res.json();
        const entry = (json.players ?? []).find((e: any) => e.player?.id === playerId);
        const signed = entry?.proof_of_representation_url;
        if (!signed) throw new Error("Proof of representation not available");
        const pdfRes = await fetch(signed);
        if (!pdfRes.ok) throw new Error("Failed to fetch document");
        const blob = await pdfRes.blob();
        revoke = URL.createObjectURL(blob);
        setBlobUrl(revoke);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load");
      }
    })();
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [shortId, playerId]);

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <Link to={`/club-proposal/${shortId}`} className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to proposal
        </Link>
        <span className="ml-auto text-[11px] uppercase tracking-[0.3em] text-[#cbb96b]">Proof of Representation</span>
      </div>
      <div className="flex-1 relative">
        {err ? (
          <div className="absolute inset-0 flex items-center justify-center text-center p-6">
            <div>
              <p className="text-white/70">{err}</p>
            </div>
          </div>
        ) : !blobUrl ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-[#cbb96b]" />
          </div>
        ) : (
          <>
            <iframe src={blobUrl} title="Proof of Representation" className="absolute inset-0 w-full h-full bg-white" />
            <a
              href={blobUrl}
              download="proof-of-representation.pdf"
              className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-[#cbb96b] text-black px-4 py-2 text-sm font-semibold shadow-lg"
            >
              <ExternalLink className="h-4 w-4" /> Download PDF
            </a>
          </>
        )}
      </div>
    </div>
  );
}