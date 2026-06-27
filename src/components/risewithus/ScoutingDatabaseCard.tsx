import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database, Radar, Star } from "lucide-react";

interface Row {
  id: string;
  name: string;
  position: string | null;
  club: string | null;
  nationality: string | null;
  image_url: string | null;
  fit: number | null;
}

interface Props {
  playerId: string;
  playerName: string;
  position: string | null;
  club: string | null;
  nationality: string | null;
  imageUrl: string | null;
  fitScore: number | null;
  lang: string;
  t: (k: string, fallback: string) => string;
}

const labelDict: Record<string, Record<string, string>> = {
  en: { title: "Tracked in our scouting database", sub: "You're on our radar. Here's your live record alongside other players we monitor.", you: "You", prospect: "Tracked prospect", id: "Prospect ID", fit: "Fit", status: "Status", name: "Player", pos: "Pos", club: "Club", nat: "Nation" },
  es: { title: "En nuestra base de datos de scouting", sub: "Estás en nuestro radar: este es tu registro junto a otros jugadores que seguimos.", you: "Tú", prospect: "Prospecto", id: "ID Prospecto", fit: "Fit", status: "Estado", name: "Jugador", pos: "Pos", club: "Club", nat: "Nación" },
  pt: { title: "Na nossa base de dados de scouting", sub: "Está no nosso radar. Eis o seu registo ao lado de outros jogadores que seguimos.", you: "Tu", prospect: "Prospeto", id: "ID Prospeto", fit: "Fit", status: "Estado", name: "Jogador", pos: "Pos", club: "Clube", nat: "Nação" },
  fr: { title: "Suivi dans notre base de scouting", sub: "Tu es sur notre radar. Voici ton dossier aux côtés des autres joueurs suivis.", you: "Toi", prospect: "Prospect suivi", id: "ID Prospect", fit: "Fit", status: "Statut", name: "Joueur", pos: "Pos", club: "Club", nat: "Nation" },
  de: { title: "In unserer Scouting-Datenbank erfasst", sub: "Du bist auf unserem Radar. Hier dein Datensatz neben anderen beobachteten Spielern.", you: "Du", prospect: "Verfolgter Prospect", id: "Prospect-ID", fit: "Fit", status: "Status", name: "Spieler", pos: "Pos", club: "Verein", nat: "Nation" },
  it: { title: "Nel nostro database di scouting", sub: "Sei sul nostro radar. Ecco la tua scheda accanto agli altri giocatori monitorati.", you: "Tu", prospect: "Prospect seguito", id: "ID Prospect", fit: "Fit", status: "Stato", name: "Giocatore", pos: "Ruo", club: "Club", nat: "Naz" },
  pl: { title: "Śledzony w naszej bazie skautingowej", sub: "Jesteś na naszym radarze. Oto twój wpis obok innych obserwowanych zawodników.", you: "Ty", prospect: "Obserwowany", id: "ID", fit: "Fit", status: "Status", name: "Zawodnik", pos: "Poz", club: "Klub", nat: "Kraj" },
  cs: { title: "Sledováni v naší skautingové databázi", sub: "Jsi na našem radaru. Zde je tvůj záznam vedle ostatních sledovaných hráčů.", you: "Ty", prospect: "Sledovaný", id: "ID", fit: "Fit", status: "Status", name: "Hráč", pos: "Poz", club: "Klub", nat: "Národ" },
  ru: { title: "В нашей скаутинговой базе", sub: "Ты на нашем радаре. Твоя запись рядом с другими отслеживаемыми игроками.", you: "Ты", prospect: "Отслеживаемый", id: "ID", fit: "Fit", status: "Статус", name: "Игрок", pos: "Поз", club: "Клуб", nat: "Нация" },
  tr: { title: "Scouting veritabanımızda takipte", sub: "Radarımızdasın. İşte kaydın, takip ettiğimiz diğer oyuncuların yanında.", you: "Sen", prospect: "Takipteki oyuncu", id: "Kimlik", fit: "Fit", status: "Durum", name: "Oyuncu", pos: "Mev", club: "Kulüp", nat: "Ülke" },
  hr: { title: "Praćeni u našoj skautskoj bazi", sub: "Na našem si radaru. Evo tvog zapisa uz druge igrače koje pratimo.", you: "Ti", prospect: "Praćeni", id: "ID", fit: "Fit", status: "Status", name: "Igrač", pos: "Poz", club: "Klub", nat: "Nacija" },
  no: { title: "Sporet i scouting-databasen vår", sub: "Du er på radaren vår. Her er din oppføring sammen med andre vi følger.", you: "Du", prospect: "Sporet", id: "ID", fit: "Fit", status: "Status", name: "Spiller", pos: "Pos", club: "Klubb", nat: "Nasjon" },
};

const labels = (lang: string) => labelDict[lang] || labelDict.en;

export const ScoutingDatabaseCard = ({
  playerId, playerName, position, club, nationality, imageUrl, fitScore, lang,
}: Props) => {
  const [around, setAround] = useState<Row[]>([]);
  const [resolved, setResolved] = useState<{
    name: string;
    position: string | null;
    club: string | null;
    nationality: string | null;
    image_url: string | null;
    fit: number | null;
  } | null>(null);
  const L = labels(lang);

  // Resolve the prospect's *actual* details from our files. The props that
  // come down from the outreach link can be stale or partial; we prefer the
  // live players row, then fall back to the outreach tables (pro/youth) by
  // player name so missing position/club/nationality is filled in instead of
  // rendering whatever was typed onto the link.
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: me } = await supabase
        .from("players")
        .select("name, position, club, nationality, image_url, fit_score")
        .eq("id", playerId)
        .maybeSingle();
      let merged = {
        name: (me?.name as string) || playerName,
        position: (me?.position as string) ?? position,
        club: (me?.club as string) ?? club,
        nationality: (me?.nationality as string) ?? nationality,
        image_url: (me?.image_url as string) ?? imageUrl,
        fit:
          typeof (me as any)?.fit_score === "number"
            ? Math.round((me as any).fit_score)
            : typeof fitScore === "number"
              ? Math.round(fitScore)
              : null,
      };
      // If the player has no profile image on file, fall back to the
      // first image stashed in player_offer_settings.intro_media so we
      // never render an empty avatar for the highlighted "You" row.
      if (!merged.image_url) {
        const { data: offer } = await supabase
          .from("player_offer_settings")
          .select("intro_media")
          .eq("player_id", playerId)
          .maybeSingle();
        const media = ((offer as any)?.intro_media ?? []) as Array<{
          url?: string; kind?: string; show?: boolean;
        }>;
        const firstImage = Array.isArray(media)
          ? media.find((m) => (m?.kind ?? "image") === "image" && m?.show !== false && m?.url)
          : null;
        if (firstImage?.url) merged.image_url = firstImage.url;
      }
      const needsFill = !merged.position || !merged.club || !merged.nationality;
      if (needsFill && merged.name) {
        const [{ data: pro }, { data: yth }] = await Promise.all([
          supabase
            .from("player_outreach_pro")
            .select("position, current_club, nationality, fit_score")
            .ilike("player_name", merged.name)
            .maybeSingle(),
          supabase
            .from("player_outreach_youth")
            .select("position, current_club, nationality, fit_score")
            .ilike("player_name", merged.name)
            .maybeSingle(),
        ]);
        const src: any = pro || yth;
        if (src) {
          merged = {
            ...merged,
            position: merged.position || src.position || null,
            club: merged.club || src.current_club || null,
            nationality: merged.nationality || src.nationality || null,
            fit:
              merged.fit != null
                ? merged.fit
                : typeof src.fit_score === "number"
                  ? Math.round(src.fit_score)
                  : null,
          };
        }
      }
      if (alive) setResolved(merged);
    })();
    return () => {
      alive = false;
    };
  }, [playerId, playerName, position, club, nationality, imageUrl, fitScore]);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Pull a handful of other tracked players for the blurred surround.
      // Public players policy already allows anon reads.
      const { data } = await supabase
        .from("players")
        .select("id, name, position, club, nationality, image_url, fit_score, category, representation_status")
        .neq("id", playerId)
        .not("name", "is", null)
        // Don't pad the table with players we don't actually scout. Drop
        // FFF / Scouted-only rows so every blurred neighbour is a real
        // RISE-tracked prospect.
        .not("category", "in", '("Scouted","Fuel For Football","FFF")')
        .limit(40);
      if (!alive || !data) return;
      const filtered = (data as any[]).filter(
        (p) => (p.representation_status || "").toLowerCase() !== "scouted",
      );
      const shuffled = [...filtered].sort(() => Math.random() - 0.5).slice(0, 6).map((p: any) => ({
        id: p.id,
        name: p.name,
        position: p.position,
        club: p.club,
        nationality: p.nationality,
        image_url: p.image_url,
        fit: typeof p.fit_score === "number" ? Math.round(p.fit_score) : null,
      }));
      setAround(shuffled);
    })();
    return () => { alive = false; };
  }, [playerId]);

  const youRow: Row = {
    id: playerId,
    name: resolved?.name ?? playerName,
    position: resolved?.position ?? position,
    club: resolved?.club ?? club,
    nationality: resolved?.nationality ?? nationality,
    image_url: resolved?.image_url ?? imageUrl,
    fit: resolved?.fit ?? (typeof fitScore === "number" ? Math.round(fitScore) : null),
  };

  const before = around.slice(0, 3);
  const after = around.slice(3, 6);

  const renderRow = (r: Row, opts: { highlight?: boolean; blurred?: boolean }) => (
    <div
      key={r.id + (opts.highlight ? "-you" : "")}
      className={[
        "grid grid-cols-[42px_minmax(0,1.6fr)_60px_minmax(0,1.2fr)_70px_60px] items-center gap-2 px-2.5 py-2 text-[11px] md:text-[12.5px] md:px-3 md:py-2.5",
        opts.highlight
          ? "rounded-lg border border-primary/70 bg-primary/10 shadow-[0_0_24px_-4px_hsl(var(--gold)/0.55)]"
          : "border-b border-white/5 last:border-b-0",
        opts.blurred ? "blur-[5px] select-none pointer-events-none opacity-70" : "",
      ].join(" ")}
    >
      <div className="h-8 w-8 overflow-hidden rounded-full border border-white/15 bg-black/40 md:h-9 md:w-9">
        {r.image_url ? (
          <img src={r.image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-white/10 to-white/0" />
        )}
      </div>
      <div className="min-w-0">
        <div className={`truncate font-medium ${opts.highlight ? "text-primary" : "text-foreground/90"}`}>
          {opts.highlight ? <span className="font-bebas tracking-[0.08em] uppercase">{r.name} <span className="ml-1 text-[10px] text-primary/80">| {L.you}</span></span> : r.name}
        </div>
      </div>
      <div className="text-center text-foreground/80">{r.position || ""}</div>
      <div className="truncate text-foreground/75">{r.club || ""}</div>
      <div className="truncate text-foreground/70">{r.nationality || ""}</div>
      <div className="text-right">
        <span className={`inline-flex items-center justify-end gap-1 rounded px-1.5 py-0.5 font-mono text-[10.5px] md:text-[11.5px] ${opts.highlight ? "bg-primary/20 text-primary" : "bg-white/5 text-foreground/75"}`}>
          {opts.highlight && <Star className="h-2.5 w-2.5" />}
          {(() => {
            // Numeric fit score is only revealed for the highlighted "you"
            // row when it lands in the 60-100 window. Outside that band we
            // still show the row (the card is always present) but leave the
            // number off so a soft score never undermines the pitch. The
            // surrounding blurred rows always show their seeded numbers.
            if (!opts.highlight) return r.fit != null ? r.fit : "";
            if (r.fit != null && r.fit >= 60 && r.fit <= 100) return r.fit;
            return "";
          })()}
        </span>
      </div>
    </div>
  );

  return (
    <section className="my-8 md:my-10">
      <div className="mb-3 flex items-center gap-3">
        <div className="h-[1px] flex-1 bg-primary/40" />
        <span className="font-bebas text-xl uppercase tracking-[0.32em] text-primary md:text-2xl">
          {L.title}
        </span>
        <div className="h-[1px] flex-1 bg-primary/40" />
      </div>
      <p className="mx-auto mb-4 max-w-2xl text-center text-[12.5px] leading-relaxed text-foreground/70 md:text-sm">
        {L.sub}
      </p>
      <div className="overflow-hidden rounded-2xl border border-primary/30 bg-black/65 shadow-[0_0_40px_-18px_hsl(var(--gold)/0.6)] backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/40 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground md:text-[11px]">
          <span className="inline-flex items-center gap-1.5">
            <Database className="h-3 w-3 text-primary" />
            RISE Scouting Database
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Radar className="h-3 w-3 text-primary animate-pulse" />
            Live
          </span>
        </div>
        <div className="grid grid-cols-[42px_minmax(0,1.6fr)_60px_minmax(0,1.2fr)_70px_60px] gap-2 border-b border-white/10 bg-black/30 px-2.5 py-1.5 text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground md:text-[10.5px] md:px-3">
          <span />
          <span>{L.name}</span>
          <span className="text-center">{L.pos}</span>
          <span>{L.club}</span>
          <span>{L.nat}</span>
          <span className="text-right">{L.fit}</span>
        </div>
        <div className="relative">
          {before.map((r) => renderRow(r, { blurred: true }))}
          {renderRow(youRow, { highlight: true })}
          {after.map((r) => renderRow(r, { blurred: true }))}
        </div>
      </div>
    </section>
  );
};

export default ScoutingDatabaseCard;