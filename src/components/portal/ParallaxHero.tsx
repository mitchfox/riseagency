import { useEffect, useRef, useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { createAnalysisSlug } from "@/lib/urlHelpers";
import { t } from "@/lib/portalTranslations";

interface ParallaxHeroProps {
  imageUrl: string | null;
  imageUrls?: string[];
  imageFocalPoints?: string[];
  playerName: string;
  clubName?: string;
  position?: string;
  portalLanguage?: string | null;
  nextFixture?: { home_team: string; away_team: string; match_date: string; match_time?: string | null; venue?: string } | null;
  preMatchAnalysis?: { id: string; home_team: string; away_team: string } | null;
}

export const ParallaxHero = ({ imageUrl, imageUrls, imageFocalPoints, playerName, clubName, position, portalLanguage, nextFixture, preMatchAnalysis }: ParallaxHeroProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Build images list
  const images = useMemo(() => {
    const list: string[] = [];
    if (imageUrls && imageUrls.length > 0) {
      list.push(...imageUrls);
    } else if (imageUrl) {
      list.push(imageUrl);
    }
    return list;
  }, [imageUrl, imageUrls]);

  // Cycle images every 6s
  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % images.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [images.length]);

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const scrollProgress = -rect.top / (window.innerHeight + rect.height);
        setOffset(scrollProgress * 40);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Countdown logic
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    if (!nextFixture) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [nextFixture]);

  const countdown = useMemo(() => {
    if (!nextFixture) return null;

    const [year, month, day] = nextFixture.match_date.split("-").map(Number);
    const timeValue = nextFixture.match_time && nextFixture.match_time.trim() ? nextFixture.match_time : "23:59";
    const [kickoffHours, kickoffMins] = timeValue.split(":").map(Number);
    const target = new Date(year, (month || 1) - 1, day || 1, kickoffHours || 0, kickoffMins || 0, 0, 0);

    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, passed: true };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { days, hours, minutes, seconds, passed: false };
  }, [nextFixture, now]);

  if (images.length === 0) return null;

  const positionKeyMap: Record<string, string> = {
    GK: "goalkeeper",
    Goalkeeper: "goalkeeper",
    FB: "full_back",
    "Full-Back": "full_back",
    CB: "centre_back",
    "Centre-Back": "centre_back",
    CM: "midfielder",
    CDM: "midfielder",
    AM: "midfielder",
    CAM: "midfielder",
    W: "winger",
    LW: "winger",
    RW: "winger",
    ST: "striker",
    CF: "striker",
    Striker: "striker",
  };

  const mappedPositionKey = position ? positionKeyMap[position] : null;
  const translatedPosition = mappedPositionKey ? t(portalLanguage, mappedPositionKey) : position;

  const units = countdown ? [
    { label: t(portalLanguage, "days").toUpperCase(), value: countdown.days },
    { label: t(portalLanguage, "hours").toUpperCase(), value: countdown.hours },
    { label: t(portalLanguage, "mins").toUpperCase(), value: countdown.minutes },
    { label: t(portalLanguage, "secs").toUpperCase(), value: countdown.seconds },
  ] : [];

  return (
    <div
      ref={containerRef}
      className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] h-[200px] md:h-[280px] overflow-hidden"
    >
      {/* Crossfade images with parallax */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentImageIndex}
          className="absolute inset-0 bg-cover"
          style={{
            backgroundImage: `url(${images[currentImageIndex]})`,
            backgroundPosition: (imageFocalPoints?.[currentImageIndex] || 'center').replace('-', ' '),
            transform: `translateY(${offset}px)`,
          }}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1.12 }}
          exit={{ opacity: 0 }}
          transition={{ 
            opacity: { duration: 1.2, ease: "easeInOut" },
            scale: { duration: 6, ease: "linear" }
          }}
        />
      </AnimatePresence>

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

        {/* Countdown overlay */}
        {countdown && !countdown.passed && nextFixture && (
          <div className="mt-2">
            <p className="text-[10px] text-white/60 mb-1">
              {nextFixture.home_team} vs {nextFixture.away_team}
              {nextFixture.match_time && <span className="ml-1">· {nextFixture.match_time}</span>}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex gap-2">
                {units.map(unit => (
                  <div key={unit.label} className="flex flex-col items-center">
                    <div className="bg-black/70 border border-primary/30 rounded px-2 py-1 min-w-[36px]">
                      <span className="text-lg md:text-xl font-bold text-primary tabular-nums">
                        {String(unit.value).padStart(2, "0")}
                      </span>
                    </div>
                    <span className="text-[8px] text-white/50 mt-0.5 font-medium">{unit.label}</span>
                  </div>
                ))}
              </div>
              {preMatchAnalysis && (
                <PreMatchButton analysis={preMatchAnalysis} />
              )}
            </div>
          </div>
        )}
        {countdown?.passed && nextFixture && (
          <div className="flex items-center gap-2 mt-2">
            <p className="text-primary font-bold text-sm">Match day!</p>
            {preMatchAnalysis && (
              <PreMatchButton analysis={preMatchAnalysis} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const PreMatchButton = ({ analysis }: { analysis: { id: string; home_team: string; away_team: string } }) => {
  const navigate = useNavigate();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-3 bg-black/70 text-white border border-primary/40 hover:bg-primary hover:text-black rounded font-bold text-[10px] flex items-center gap-1"
      onClick={() => {
        const slug = createAnalysisSlug(analysis.home_team, analysis.away_team, analysis.id);
        navigate(slug);
      }}
    >
      <Eye className="h-3 w-3" />
      Pre-Match
    </Button>
  );
};
