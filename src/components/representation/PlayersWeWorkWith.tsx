import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RepPlayer {
  id: string;
  name: string;
  image_url: string | null;
  position: string | null;
  club: string | null;
}

interface Props {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** When true the component renders only the rolling marquee — no
   *  heading/intro/subtitle. Used when the carousel sits inside a
   *  parent card that already provides the framing copy. */
  bare?: boolean;
}

/**
 * Rolling marquee of represented and mandated players for the
 * public representation / rise-with-us pages. Pulls live data from
 * the players table and excludes scouted / Fuel For Football per the
 * global exclusion rules.
 */
export const PlayersWeWorkWith = ({
  eyebrow = "Our Players",
  title = "Who we've worked with",
  subtitle = "A small group of players we genuinely believe can reach the very top, and back all the way.",
  bare = false,
}: Props) => {
  const [players, setPlayers] = useState<RepPlayer[]>([]);
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const node = sectionRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const { data } = await supabase
        .from("players")
        .select("id, name, image_url, position, club, representation_status, player_list_order")
        .in("representation_status", [
          "represented",
          "fuel_for_football",
          "other",
        ])
        .not("image_url", "is", null)
        .order("player_list_order", { ascending: true, nullsFirst: false })
        .limit(120);
      if (data) setPlayers(data as RepPlayer[]);
    })();
  }, [visible]);

  const loop = players.length > 0 ? [...players, ...players] : [];

  return (
    <section ref={sectionRef} className={`relative overflow-hidden ${bare ? "py-2" : "py-10 md:py-14"}`}>
      {!bare && (
      <div className="mx-auto max-w-4xl px-4 text-center mb-6 md:mb-8">
        <p className="font-bebas text-[11px] uppercase tracking-[0.32em] text-primary md:text-[12px]">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-bebas text-3xl uppercase leading-[1.05] tracking-[0.06em] text-foreground md:text-4xl lg:text-5xl">
          {title}
        </h2>
        <p className="mt-3 text-[13.5px] leading-relaxed text-foreground/80 md:text-[15px]">
          {subtitle}
        </p>
      </div>
      )}

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-black to-transparent md:w-20" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-black to-transparent md:w-20" />

        <div
          className="flex w-max animate-marquee gap-4 md:gap-6 items-stretch"
          style={{ animationDuration: "100s" }}
        >
          {loop.map((p, i) => (
            <figure
              key={`${p.id}-${i}`}
              className="flex w-[140px] shrink-0 flex-col items-center md:w-[170px]"
            >
              <div className="relative h-[140px] w-[140px] overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-[0_0_24px_hsl(var(--gold)/0.15)] md:h-[170px] md:w-[170px]">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover object-top"
                  />
                ) : null}
              </div>
              <figcaption className="mt-2 w-full text-center">
                <p className="truncate font-bebas text-sm uppercase tracking-[0.08em] text-foreground md:text-base">
                  {p.name}
                </p>
                <p className="truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground md:text-[11px]">
                  {[p.position, p.club].filter(Boolean).join(" · ")}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlayersWeWorkWith;