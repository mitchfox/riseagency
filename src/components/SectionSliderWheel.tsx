import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SectionSliderWheelProps {
  sections: { key: string; label: string }[];
  activeKey: string;
  onChange: (key: string) => void;
}

/**
 * 3D cylinder-style horizontal slider showing the current section in
 * Rise Gold at full opacity, neighbours at 60% and rotated to feel like
 * they continue off-screen. Bullet point separators in Rise Gold.
 */
export const SectionSliderWheel = ({ sections, activeKey, onChange }: SectionSliderWheelProps) => {
  const idx = Math.max(0, sections.findIndex((s) => s.key === activeKey));
  const total = sections.length;
  if (total === 0) return null;

  // Scroll-driven wheel rotation: as the user scrolls down the page,
  // every section label rotates a touch around the cylinder so it
  // physically reads as a wheel turning, even without a swipe.
  const [scrollSpin, setScrollSpin] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      // Map scrollY 0 → 1500 to a -22° → +22° wheel offset, looping.
      const y = window.scrollY;
      const spin = ((y % 600) / 600) * 44 - 22;
      setScrollSpin(spin);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const wrap = (i: number) => (i + total) % total;
  const move = (delta: number) => onChange(sections[wrap(idx + delta)].key);
  const shortestOffset = (target: number) => {
    let offset = target - idx;
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;
    return offset;
  };

  const visible = sections
    .map((section, index) => ({ section, offset: shortestOffset(index) }))
    .filter(({ offset }) => Math.abs(offset) <= 2);

  return (
    <div className="relative w-full select-none">
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          aria-label="Previous section"
          onClick={() => move(-1)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/40 text-primary hover:bg-primary/10 transition"
          disabled={total < 2}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div
          className="relative flex h-14 flex-1 touch-pan-y items-center justify-center overflow-hidden [perspective:520px]"
          onTouchStart={(e) => {
            (e.currentTarget as any)._sx = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            const sx = (e.currentTarget as any)._sx;
            if (sx == null) return;
            const dx = e.changedTouches[0].clientX - sx;
            if (Math.abs(dx) > 30) move(dx < 0 ? 1 : -1);
          }}
          onPointerDown={(e) => {
            (e.currentTarget as any)._px = e.clientX;
            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerUp={(e) => {
            const px = (e.currentTarget as any)._px;
            if (px == null) return;
            const dx = e.clientX - px;
            if (Math.abs(dx) > 24) move(dx < 0 ? 1 : -1);
            (e.currentTarget as any)._px = null;
          }}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map(({ offset, section }) => {
              const isCenter = offset === 0;
              const opacity = isCenter ? 1 : Math.abs(offset) === 1 ? 0.62 : 0.26;
              const translateX = offset * 118;
              const rotateY = offset * -42 + scrollSpin;
              const scale = isCenter ? 1 : Math.abs(offset) === 1 ? 0.82 : 0.66;
              return (
                <motion.button
                  type="button"
                  key={section.key}
                  initial={{ opacity: 0, scale: 0.72 }}
                  animate={{ opacity, x: translateX, rotateY, scale, z: isCenter ? 42 : -50 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => onChange(section.key)}
                  className="absolute inline-flex min-w-[150px] items-center justify-center gap-2 whitespace-nowrap px-3 text-center font-bebas text-xs uppercase tracking-[0.18em] text-primary sm:min-w-[190px] sm:text-sm"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {!isCenter && offset < 0 && <span className="text-primary/70">•</span>}
                  <span>{section.label}</span>
                  {!isCenter && offset > 0 && <span className="text-primary/70">•</span>}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        <button
          type="button"
          aria-label="Next section"
          onClick={() => move(1)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/40 text-primary hover:bg-primary/10 transition"
          disabled={total < 2}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
