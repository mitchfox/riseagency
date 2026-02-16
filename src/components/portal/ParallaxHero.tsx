import { useEffect, useRef, useState } from "react";

interface ParallaxHeroProps {
  imageUrl: string | null;
  playerName: string;
  clubName?: string;
  position?: string;
}

export const ParallaxHero = ({ imageUrl, playerName, clubName, position }: ParallaxHeroProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const scrollProgress = -rect.top / (window.innerHeight + rect.height);
        setOffset(scrollProgress * 40); // max 40px shift
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!imageUrl) return null;

  return (
    <div
      ref={containerRef}
      className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] h-[200px] md:h-[280px] overflow-hidden"
    >
      {/* Background image with parallax */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-100"
        style={{
          backgroundImage: `url(${imageUrl})`,
          transform: `translateY(${offset}px) scale(1.1)`,
        }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      {/* Text content layered on top */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 container mx-auto">
        <h1 className="text-3xl md:text-5xl font-bebas uppercase tracking-wider text-white drop-shadow-lg">
          {playerName}
        </h1>
        <div className="flex items-center gap-2 mt-1">
          {position && (
            <span className="text-xs md:text-sm font-semibold text-primary bg-black/60 px-2 py-0.5 rounded">
              {position}
            </span>
          )}
          {clubName && (
            <span className="text-xs md:text-sm text-white/80">{clubName}</span>
          )}
        </div>
      </div>
    </div>
  );
};
